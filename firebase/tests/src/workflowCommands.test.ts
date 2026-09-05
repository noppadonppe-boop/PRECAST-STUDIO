import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthorizationError } from '../../../apps/functions/src/authorization';
import { approveArtifact, archiveProject, computeArtifactSnapshotHash, createDesignBasisRevision, createType2Project, freezeSourceRevision, returnArtifact, submitArtifact, updateProject } from '../../../apps/functions/src/workflowCommands';

let db: Firestore;
let app: ReturnType<typeof initializeApp>;
const orgId = 'org-workflow';
const projectId = 'project-workflow';
const artifactId = 'db-r02';
const upstreamRefs = { sourceRevisionId: 'src-r02' };
const payload = {
  jurisdiction: 'Thailand', designCode: 'ACI 318', designCodeEdition: '2019', loadingCode: 'ASCE 7', loadingCodeEdition: '2022', units: 'kN-m-MPa' as const,
  designLifeYears: 50, riskCategory: 'II', concrete: { fc28Mpa: 40, fcLiftMpa: 20, densityKgM3: 2400, stiffnessMpa: 30000, durabilityClass: 'Moderate', source: 'Specification S-001' },
  reinforcement: { fyMpa: 500, source: 'Specification S-001' }, handling: { liftingDynamicFactor: 1.5, transportDynamicFactor: 1.3, storageSupportRule: 'Two aligned bearing points.', source: 'Handling standard' },
  fireResistanceMinutes: 120, inheritedFrom: 'type-2-residential-v1', overrideReasons: {},
};
const snapshotHash = computeArtifactSnapshotHash({ artifactType: 'designBasis', artifactId, artifactRevision: 'DB-R02', createdBy: 'engineer-1', upstreamRefs, payload });
const sourcePayload = { fileName: 'source.ifc', unit: 'metre' };
const sourceHash = computeArtifactSnapshotHash({ artifactType: 'sourceRevision', artifactId: 'src-r02', artifactRevision: 'SRC-R02', createdBy: 'bim-1', upstreamRefs: {}, payload: sourcePayload });

async function seedWorkflow() {
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(db.doc(`organizations/${orgId}`), { name: 'Workflow Test Org' });
  batch.set(db.doc(`organizations/${orgId}/members/engineer-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/checker-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/bim-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/pm-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}`), { id: projectId, code: 'PC-TEST', name: 'Workflow project', status: 'active', currentStage: 'intake', currentSourceRevisionId: 'src-r02', currentDesignBasisVersionId: artifactId, gateStates: { G0: 'inProgress', G1: 'notStarted' } });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/engineer-1`), { status: 'active', roles: ['structuralEngineer', 'engineeringChecker'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/checker-1`), { status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/bim-1`), { status: 'active', roles: ['bimCoordinator'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/pm-1`), { status: 'active', roles: ['projectManager'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`), { id: 'src-r02', revision: 'SRC-R02', status: 'draft', scanState: 'clean', locked: false, createdBy: 'bim-1', isCurrentRevision: true, upstreamRefs: {}, payload: sourcePayload, validation: { unitValid: true, coordinateValid: true, levelsValid: true, objectIdentityValid: true, objectCount: 12, duplicateGlobalIds: 0 }, blockingConditions: [], snapshotHash: sourceHash });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`), { id: artifactId, revision: 'DB-R02', status: 'draft', createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs, payload, blockingConditions: [] });
  await batch.commit();
}

function submitCommand() {
  return {
    orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'designBasis' as const, artifactId,
    expectedDraftHash: snapshotHash, idempotencyKey: randomUUID(), assignedTo: 'checker-1',
  };
}

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-precast-m1' }, `workflow-${randomUUID()}`);
  db = getFirestore(app);
});

beforeEach(async () => {
  await db.recursiveDelete(db.doc(`organizations/${orgId}`));
  await db.recursiveDelete(db.doc('organizations/org-create'));
  await seedWorkflow();
});

afterAll(async () => deleteApp(app));

describe('transactional workflow commands', () => {
  it('runs BIM submission, independent structural approval, and PM-only G0 freeze', async () => {
    const requestId = `request-${randomUUID()}`;
    await submitArtifact(db, 'bim-1', { orgId, projectId, requestId, artifactType: 'sourceRevision', artifactId: 'src-r02', expectedDraftHash: sourceHash, assignedTo: 'engineer-1', idempotencyKey: randomUUID() });
    await approveArtifact(db, 'engineer-1', { orgId, projectId, requestId, artifactType: 'sourceRevision', artifactId: 'src-r02', snapshotHash: sourceHash, idempotencyKey: randomUUID() });
    await expect(freezeSourceRevision(db, 'engineer-1', { orgId, projectId, sourceRevisionId: 'src-r02', expectedSnapshotHash: sourceHash, idempotencyKey: randomUUID() })).rejects.toThrow('Only the Project Manager');
    const command = { orgId, projectId, sourceRevisionId: 'src-r02', expectedSnapshotHash: sourceHash, idempotencyKey: randomUUID() };
    expect(await freezeSourceRevision(db, 'pm-1', command)).toMatchObject({ state: 'accepted', replayed: false });
    expect(await freezeSourceRevision(db, 'pm-1', command)).toMatchObject({ state: 'accepted', replayed: true });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ currentStage: 'designBasis', gateStates: { G0: 'approved', G1: 'inProgress' } });
  });

  it('blocks G0 freeze while a critical source issue remains open', async () => {
    const sourceRef = db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`);
    await sourceRef.update({ status: 'approved' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/issues/issue-critical`).set({ artifactType: 'sourceRevision', artifactId: 'src-r02', severity: 'critical', status: 'open' });
    await expect(freezeSourceRevision(db, 'pm-1', { orgId, projectId, sourceRevisionId: 'src-r02', expectedSnapshotHash: sourceHash, idempotencyKey: randomUUID() })).rejects.toThrow('Open critical');
  });

  it('creates and supersedes immutable Design Basis revisions only after G0', async () => {
    const command = { orgId, projectId, designBasisId: 'db-r03', revision: 'DB-R03', payload, idempotencyKey: randomUUID() };
    await expect(createDesignBasisRevision(db, 'engineer-1', command)).rejects.toThrow('Gate G0');
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G0': 'approved' });
    expect(await createDesignBasisRevision(db, 'engineer-1', command)).toMatchObject({ state: 'draft' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/db-r03`).update({ status: 'approved', locked: true });
    const next = { ...command, designBasisId: 'db-r04', revision: 'DB-R04', supersedesId: 'db-r03', idempotencyKey: randomUUID() };
    expect(await createDesignBasisRevision(db, 'engineer-1', next)).toMatchObject({ resourceId: 'db-r04' });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/db-r03`).get()).data()).toMatchObject({ status: 'superseded', isCurrentRevision: false, supersededBy: 'db-r04' });
  });

  it('updates and soft-archives project metadata with audit receipts', async () => {
    const update = { orgId, projectId, code: 'PC-TEST-2', name: 'Updated workflow project', status: 'onHold' as const, idempotencyKey: randomUUID() };
    expect(await updateProject(db, 'pm-1', update)).toMatchObject({ state: 'onHold' });
    const archive = { orgId, projectId, reason: 'Project closed by test.', idempotencyKey: randomUUID() };
    expect(await archiveProject(db, 'pm-1', archive)).toMatchObject({ state: 'archived' });
    await expect(updateProject(db, 'pm-1', { ...update, idempotencyKey: randomUUID() })).rejects.toThrow('Archived projects are immutable');
  });

  it('submits once, rejects self-approval, and approves once by a distinct checker', async () => {
    const submit = submitCommand();
    const submitted = await submitArtifact(db, 'engineer-1', submit);
    const replay = await submitArtifact(db, 'engineer-1', submit);
    expect(submitted.replayed).toBe(false);
    expect(replay).toMatchObject({ state: 'submitted', replayed: true, auditEventId: submitted.auditEventId });

    await expect(approveArtifact(db, 'engineer-1', {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis', artifactId,
      snapshotHash, idempotencyKey: randomUUID(),
    })).rejects.toThrow(AuthorizationError);

    const approval = {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis' as const, artifactId,
      snapshotHash, idempotencyKey: randomUUID(), comment: 'Independent technical review complete.',
    };
    const approved = await approveArtifact(db, 'checker-1', approval);
    const approvedReplay = await approveArtifact(db, 'checker-1', approval);
    expect(approved).toMatchObject({ state: 'approved', replayed: false });
    expect(approvedReplay.replayed).toBe(true);
    const artifact = await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`).get();
    expect(artifact.data()).toMatchObject({ status: 'approved', locked: true, approvedBy: 'checker-1' });
    const audits = await db.collection(`organizations/${orgId}/projects/${projectId}/auditEvents`).get();
    expect(audits.size).toBe(2);
  });

  it('rejects approval when an upstream project revision changed after submission', async () => {
    const submit = submitCommand();
    await submitArtifact(db, 'engineer-1', submit);
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ currentSourceRevisionId: 'src-r03' });
    await expect(approveArtifact(db, 'checker-1', {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis', artifactId,
      snapshotHash, idempotencyKey: randomUUID(),
    })).rejects.toThrow('stale or mismatched');
  });

  it('returns a submitted artifact with a mandatory comment and append-only audit', async () => {
    const submit = submitCommand();
    await submitArtifact(db, 'engineer-1', submit);
    const result = await returnArtifact(db, 'checker-1', {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis', artifactId,
      snapshotHash, idempotencyKey: randomUUID(), comment: 'Clarify handling-stage load source.',
    });
    expect(result.state).toBe('draft');
    const request = await db.doc(`organizations/${orgId}/projects/${projectId}/approvalRequests/${submit.requestId}`).get();
    expect(request.data()).toMatchObject({ status: 'returned', decisionComment: 'Clarify handling-stage load source.' });
  });

  it('creates a Type 2 project and project-manager membership idempotently', async () => {
    await db.doc('organizations/org-create').set({ name: 'Create Test Org' });
    await db.doc('organizations/org-create/members/admin-1').set({ status: 'active', orgRoles: ['orgAdmin'], projectIds: [] });
    const command = { orgId: 'org-create', projectId: 'type2-demo', code: 'PC-26021', name: 'Type 2 Demo', templateId: 'type-2-residential-v1' as const, idempotencyKey: randomUUID() };
    const created = await createType2Project(db, 'admin-1', command);
    const replay = await createType2Project(db, 'admin-1', command);
    expect(created.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    const project = await db.doc('organizations/org-create/projects/type2-demo').get();
    const member = await db.doc('organizations/org-create/projects/type2-demo/members/admin-1').get();
    expect(project.data()).toMatchObject({ templateId: 'type-2-residential-v1', currentStage: 'intake' });
    expect(member.data()?.roles).toEqual(['projectManager']);
  });
});
