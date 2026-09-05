import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthorizationError } from '../../../apps/functions/src/authorization';
import { approveArtifact, computeArtifactSnapshotHash, createType2Project, returnArtifact, submitArtifact } from '../../../apps/functions/src/workflowCommands';

let db: Firestore;
let app: ReturnType<typeof initializeApp>;
const orgId = 'org-workflow';
const projectId = 'project-workflow';
const artifactId = 'db-r02';
const upstreamRefs = { sourceRevisionId: 'src-r02' };
const payload = { designCode: 'ACI 318-19', fc28Mpa: 40, units: 'kN-m-MPa' };
const snapshotHash = computeArtifactSnapshotHash({ artifactType: 'designBasis', artifactId, artifactRevision: 'DB-R02', createdBy: 'engineer-1', upstreamRefs, payload });

async function seedWorkflow() {
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(db.doc(`organizations/${orgId}`), { name: 'Workflow Test Org' });
  batch.set(db.doc(`organizations/${orgId}/members/engineer-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/checker-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}`), { id: projectId, status: 'active', currentSourceRevisionId: 'src-r02', currentDesignBasisVersionId: artifactId });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/engineer-1`), { status: 'active', roles: ['structuralEngineer', 'engineeringChecker'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/checker-1`), { status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: now });
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
