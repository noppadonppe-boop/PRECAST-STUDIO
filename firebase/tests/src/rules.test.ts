import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getBytes, ref } from 'firebase/storage';

const here = dirname(fileURLToPath(import.meta.url));
let environment: RulesTestEnvironment;

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
    await setDoc(doc(db, 'organizations/org-a'), { name: 'Siam Precast Engineering' });
    await setDoc(doc(db, 'organizations/org-a/members/engineer-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-a/members/checker-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-b/members/intruder-1'), { status: 'active', orgRoles: [] });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a'), { code: 'PC-26014', status: 'active' });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/engineer-1'), {
      status: 'active', roles: ['structuralEngineer'], capabilities: [], effectiveFrom: now,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/members/checker-1'), {
      status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: now,
    });
    await setDoc(doc(db, 'organizations/org-a/projects/project-a/designBasisVersions/db-r02'), {
      status: 'submitted', createdBy: 'engineer-1', revision: 'DB-R02', snapshotHash: `sha256:${'a'.repeat(64)}`,
    });
  });
}

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-precast-m1',
    firestore: { rules: readFileSync(resolve(here, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(here, '../../storage.rules'), 'utf8') },
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
