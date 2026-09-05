import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

const here = dirname(fileURLToPath(import.meta.url));
let environment: RulesTestEnvironment;

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
    await setDoc(doc(db, 'organizations/org-a'), { name: 'Siam Precast Engineering' });
    await setDoc(doc(db, 'organizations/org-a/members/engineer-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-a/members/checker-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-a/members/bim-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-a/members/pm-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-b/members/intruder-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a'), { code: 'PC-26014', status: 'active' });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/engineer-1'), {
      status: 'active', roles: ['structuralEngineer'], capabilities: [], effectiveFrom: now,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/checker-1'), {
      status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: now,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/bim-1'), {
      status: 'active', roles: ['bimCoordinator'], capabilities: [], effectiveFrom: now,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/pm-1'), {
      status: 'active', roles: ['projectManager'], capabilities: [], effectiveFrom: now,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/designBasisVersions/db-r02'), {
      status: 'submitted', createdBy: 'engineer-1', revision: 'DB-R02', snapshotHash: `sha256:${'a'.repeat(64)}`,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/productModelVersions/pm-r01'), {
      status: 'draft', locked: false, createdBy: 'engineer-1', revision: 'PM-R01', isCurrentRevision: true,
      upstreamRefs: { sourceRevisionId: 'src-r02', designBasisVersionId: 'db-r02' }, payload: { mark: 'initial' },
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/loadModelVersions/load-r01'), {
      status: 'draft', locked: false, createdBy: 'engineer-1', revision: 'LOAD-R01', isCurrentRevision: true,
      upstreamRefs: { sourceRevisionId: 'src-r02', designBasisVersionId: 'db-r02', modelVersionId: 'pm-r01' }, payload: { meshSizeM: 0.25 }, draftHash: `sha256:${'b'.repeat(64)}`,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/analysisRuns/an-r01'), { status: 'completed', designStatus: 'NOT_CHECKED', createdBy: 'engineer-1' });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/calculationReports/calc-r01'), { status: 'draft', overallStatus: 'NOT_CHECKED', createdBy: 'engineer-1' });
  });
}

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-precast-m1',
    firestore: { rules: readFileSync(resolve(here, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(here, '../../storage.rules'), 'utf8') },
  });
});

describe('M2 BIM intake and issue controls', () => {
  const metadata = { customMetadata: { scanState: 'quarantined', uploadedBy: 'bim-1', orgId: 'org-a', projectId: 'project-a' } };

  it('allows BIM IFC/PDF uploads only into their own quarantined staging path', async () => {
    const storage = environment.authenticatedContext('bim-1').storage();
    await assertSucceeds(uploadBytes(ref(storage, 'organizations/org-a/projects/project-a/source-staging/bim-1/up-1/model.ifc'), new Uint8Array([1, 2]), { ...metadata, contentType: 'application/x-step' }));
    await assertSucceeds(uploadBytes(ref(storage, 'organizations/org-a/projects/project-a/source-staging/bim-1/up-2/reference.pdf'), new Uint8Array([1, 2]), { ...metadata, contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(storage, 'organizations/org-a/projects/project-a/source-staging/bim-1/up-3/model.exe'), new Uint8Array([1]), { ...metadata, contentType: 'application/octet-stream' }));
    await assertFails(getBytes(ref(storage, 'organizations/org-a/projects/project-a/source-staging/bim-1/up-1/model.ifc')));
  });

  it('denies non-BIM staging uploads and identity/path spoofing', async () => {
    const engineerStorage = environment.authenticatedContext('engineer-1').storage();
    await assertFails(uploadBytes(ref(engineerStorage, 'organizations/org-a/projects/project-a/source-staging/engineer-1/up-1/model.ifc'), new Uint8Array([1]), { contentType: 'application/x-step', customMetadata: { ...metadata.customMetadata, uploadedBy: 'engineer-1' } }));
    const bimStorage = environment.authenticatedContext('bim-1').storage();
    await assertFails(uploadBytes(ref(bimStorage, 'organizations/org-a/projects/project-a/source-staging/other/up-1/model.ifc'), new Uint8Array([1]), { ...metadata, contentType: 'application/x-step' }));
  });

  it('lets BIM create a quarantined source draft but cannot forge clean or accepted state', async () => {
    const db = environment.authenticatedContext('bim-1').firestore();
    const base = { revision: 'SRC-R03', status: 'draft', scanState: 'quarantined', locked: false, createdBy: 'bim-1', isCurrentRevision: true, storagePath: 'staging/path' };
    const source = doc(db, 'organizations/org-a/projects/project-a/sourceRevisions/src-r03');
    await assertSucceeds(setDoc(source, base));
    await assertFails(updateDoc(source, { scanState: 'clean' }));
    await assertFails(updateDoc(source, { status: 'accepted', locked: true }));
  });

  it('keeps issue artifact identity immutable and reserves accepted exceptions for PM', async () => {
    const engineer = environment.authenticatedContext('engineer-1').firestore();
    const issue = doc(engineer, 'organizations/org-a/projects/project-a/issues/issue-1');
    await assertSucceeds(setDoc(issue, { artifactType: 'sourceRevision', artifactId: 'src-r02', artifactRevision: 'SRC-R02', severity: 'critical', title: 'Coordinate origin', comment: 'Confirm survey reference.', status: 'open', createdBy: 'engineer-1' }));
    await assertFails(updateDoc(issue, { artifactId: 'src-other' }));
    await assertFails(updateDoc(issue, { status: 'acceptedException', dispositionReason: 'Accepted for issue', responsibleUid: 'pm-1' }));
    const pm = environment.authenticatedContext('pm-1').firestore();
    await assertSucceeds(updateDoc(doc(pm, issue.path), { status: 'acceptedException', dispositionReason: 'Accepted with documented survey control.', responsibleUid: 'pm-1' }));
  });
});

describe('M3 Product Model controls', () => {
  it('denies direct version creation but permits the author to edit only mutable draft payload', async () => {
    const db = environment.authenticatedContext('engineer-1').firestore();
    await assertFails(setDoc(doc(db, 'organizations/org-a/projects/project-a/productModelVersions/pm-forged'), { status: 'draft', locked: false, createdBy: 'engineer-1' }));
    const model = doc(db, 'organizations/org-a/projects/project-a/productModelVersions/pm-r01');
    await assertSucceeds(updateDoc(model, { payload: { mark: 'revised' } }));
    await assertFails(updateDoc(model, { status: 'approved', locked: true }));
    await assertFails(updateDoc(model, { upstreamRefs: { sourceRevisionId: 'src-other', designBasisVersionId: 'db-r02' } }));
    await assertFails(updateDoc(model, { approvedBy: 'engineer-1' }));
  });

  it('denies another engineer from editing an authored Product Model draft', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const now = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
      await setDoc(doc(db, 'organizations/org-a/members/engineer-2'), { status: 'active', orgRoles: [] });
      await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/engineer-2'), { status: 'active', roles: ['structuralEngineer'], capabilities: [], effectiveFrom: now });
    });
    const db = environment.authenticatedContext('engineer-2').firestore();
    await assertFails(updateDoc(doc(db, 'organizations/org-a/projects/project-a/productModelVersions/pm-r01'), { payload: { mark: 'hijacked' } }));
  });
});

describe('M4/M5 Load Model, analysis and Design Check controls', () => {
  it('permits only the author to edit mutable Load Model fields', async () => {
    const engineer = environment.authenticatedContext('engineer-1').firestore();
    const load = doc(engineer, 'organizations/org-a/projects/project-a/loadModelVersions/load-r01');
    await assertSucceeds(updateDoc(load, { payload: { meshSizeM: 0.2 }, draftHash: `sha256:${'c'.repeat(64)}`, updatedAt: Timestamp.now(), updatedBy: 'engineer-1' }));
    await assertFails(updateDoc(load, { status: 'frozen', locked: true }));
    const checker = environment.authenticatedContext('checker-1').firestore();
    await assertFails(updateDoc(doc(checker, load.path), { payload: { meshSizeM: 0.1 } }));
  });

  it('denies all direct analysis lifecycle and result writes', async () => {
    const engineer = environment.authenticatedContext('engineer-1').firestore();
    await assertFails(setDoc(doc(engineer, 'organizations/org-a/projects/project-a/analysisRuns/forged'), { status: 'completed', designStatus: 'PASS' }));
    await assertFails(updateDoc(doc(engineer, 'organizations/org-a/projects/project-a/analysisRuns/an-r01'), { designStatus: 'PASS' }));
  });

  it('denies direct Design Check creation and result mutation', async () => {
    const engineer = environment.authenticatedContext('engineer-1').firestore();
    await assertFails(setDoc(doc(engineer, 'organizations/org-a/projects/project-a/calculationReports/forged'), { status: 'approved', overallStatus: 'PASS' }));
    await assertFails(updateDoc(doc(engineer, 'organizations/org-a/projects/project-a/calculationReports/calc-r01'), { overallStatus: 'PASS' }));
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seed();
});

afterAll(async () => environment.cleanup());

describe('tenant isolation', () => {
  it('allows an active project member to read their project', async () => {
    const db = environment.authenticatedContext('engineer-1').firestore();
    await assertSucceeds(getDoc(doc(db, 'organizations/org-a/projects/project-a')));
  });

  it('denies cross-organization project reads', async () => {
    const db = environment.authenticatedContext('intruder-1').firestore();
    await assertFails(getDoc(doc(db, 'organizations/org-a/projects/project-a')));
  });

  it('denies cross-organization storage reads', async () => {
    const storage = environment.authenticatedContext('intruder-1').storage();
    await assertFails(getBytes(ref(storage, 'organizations/org-a/projects/project-a/source/src-r02/reference.pdf')));
  });

  it.each([
    'projectManager', 'bimCoordinator', 'structuralEngineer', 'engineeringChecker', 'costEstimator',
    'detailer', 'productionManager', 'commercialApprover', 'siteQa',
  ])('allows active internal role %s to read project metadata', async (role) => {
    const uid = `role-${role}`;
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, `organizations/org-a/members/${uid}`), { status: 'active', orgRoles: [] });
      await setDoc(doc(db, `organizations/org-a/projects/project-a/members/${uid}`), {
        status: 'active', roles: [role], capabilities: [], effectiveFrom: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
      });
    });
    const db = environment.authenticatedContext(uid).firestore();
    await assertSucceeds(getDoc(doc(db, 'organizations/org-a/projects/project-a')));
  });

  it('denies suspended and expired project memberships', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      for (const uid of ['suspended-1', 'expired-1']) await setDoc(doc(db, `organizations/org-a/members/${uid}`), { status: 'active', orgRoles: [] });
      await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/suspended-1'), { status: 'suspended', roles: ['structuralEngineer'], capabilities: [], effectiveFrom: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')) });
      await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/expired-1'), { status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')), expiresAt: Timestamp.fromDate(new Date('2026-02-01T00:00:00.000Z')) });
    });
    await assertFails(getDoc(doc(environment.authenticatedContext('suspended-1').firestore(), 'organizations/org-a/projects/project-a')));
    await assertFails(getDoc(doc(environment.authenticatedContext('expired-1').firestore(), 'organizations/org-a/projects/project-a')));
  });

  it('restricts External Reviewer to explicitly shared issued content', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'organizations/org-a/members/external-1'), { status: 'active', orgRoles: [] });
      await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/external-1'), { status: 'active', roles: ['externalReviewer'], capabilities: [], effectiveFrom: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')) });
      await setDoc(doc(db, 'organizations/org-a/projects/project-a/calculationReports/report-issued'), { status: 'issued', sharedWithUids: ['external-1'] });
      await setDoc(doc(db, 'organizations/org-a/projects/project-a/calculationReports/report-draft'), { status: 'draft', sharedWithUids: ['external-1'] });
    });
    const db = environment.authenticatedContext('external-1').firestore();
    await assertFails(getDoc(doc(db, 'organizations/org-a/projects/project-a')));
    await assertSucceeds(getDoc(doc(db, 'organizations/org-a/projects/project-a/calculationReports/report-issued')));
    await assertFails(getDoc(doc(db, 'organizations/org-a/projects/project-a/calculationReports/report-draft')));
  });
});

describe('authoritative workflow writes', () => {
  it('denies direct Design Basis creation so revisioning remains atomic', async () => {
    const db = environment.authenticatedContext('engineer-1').firestore();
    await assertFails(setDoc(doc(db, 'organizations/org-a/projects/project-a/designBasisVersions/db-forged'), { status: 'draft', locked: false, createdBy: 'engineer-1' }));
  });

  it('denies creator self-approval by direct client update', async () => {
    const db = environment.authenticatedContext('engineer-1').firestore();
    const artifact = doc(db, 'organizations/org-a/projects/project-a/designBasisVersions/db-r02');
    await assertFails(updateDoc(artifact, { status: 'approved', approvedBy: 'engineer-1' }));
  });

  it('denies even a checker direct approval so the server command remains authoritative', async () => {
    const db = environment.authenticatedContext('checker-1').firestore();
    const artifact = doc(db, 'organizations/org-a/projects/project-a/designBasisVersions/db-r02');
    await assertFails(updateDoc(artifact, { status: 'approved', approvedBy: 'checker-1' }));
  });

  it('denies direct writes to snapshots, receipts, and audit events', async () => {
    const db = environment.authenticatedContext('checker-1').firestore();
    await assertFails(setDoc(doc(db, 'organizations/org-a/projects/project-a/approvalSnapshots/snapshot-1'), { snapshotHash: `sha256:${'a'.repeat(64)}` }));
    await assertFails(setDoc(doc(db, 'organizations/org-a/projects/project-a/commandReceipts/receipt-1'), { resultState: 'approved' }));
    await assertFails(setDoc(doc(db, 'organizations/org-a/projects/project-a/auditEvents/event-1'), { action: 'approve' }));
  });

  it('denies direct approval request creation so submit remains authoritative', async () => {
    const engineer = environment.authenticatedContext('engineer-1').firestore();
    await assertFails(setDoc(doc(engineer, 'organizations/org-a/projects/project-a/approvalRequests/forged-request'), {
      requestedBy: 'engineer-1', status: 'open', artifactType: 'designBasis', artifactId: 'db-r1',
    }));
  });
});
