import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { expect, it } from 'vitest';
import { pilotProvisioningRoles } from '../../../packages/schemas/src/pilotProvisioning';
import { provisionPilot } from '../../../apps/functions/src/pilotProvisioning';

it('provisions only empty pilot metadata atomically, replays once and refuses overwrites or changed plans', async () => {
  const suffix = randomUUID();
  const app = initializeApp({ projectId: 'demo-precast-m1' }, suffix); const db = getFirestore(app);
  const plan = { schemaVersion: '1.0.0', environment: 'staging', firebaseProjectId: 'pilot-staging-test', planId: `plan-${suffix}`, orgId: `pilot-${suffix}`, projectId: 'pilot-project', organizationName: 'Pilot test org', projectName: 'Pilot test project', projectCode: 'PILOT-01', reviewedBy: 'operator-test', reviewedAt: '2026-01-01T00:00:00.000Z', effectiveFrom: '2026-01-01T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z', retentionUntil: '2099-02-01T00:00:00.000Z', dataOwner: 'owner-test', cleanupOwner: 'owner-test', participants: pilotProvisioningRoles.map((role) => ({ role, uid: `uid-${role}` })), label: 'PILOT / NOT FOR PRODUCTION' };
  const target = { projectId: 'demo-precast-m1', emulator: true };
  try {
    await expect(provisionPilot(app, plan, { projectId: 'another-project', emulator: true })).rejects.toThrow('target mismatch');
    expect(await provisionPilot(app, plan, target)).toMatchObject({ replayed: false });
    expect(await provisionPilot(app, { ...plan, participants: [...plan.participants].reverse() }, target)).toMatchObject({ replayed: true });
    const project = await db.doc(`organizations/${plan.orgId}/projects/${plan.projectId}`).get();
    expect(project.data()?.gateStates).toEqual(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`G${i}`, 'notStarted'])));
    expect(project.data()).not.toHaveProperty('currentModelVersionId');
    expect(project.data()?.pilot).toMatchObject({ productionReleaseAllowed: false });
    expect((await db.collection(`organizations/${plan.orgId}/projects/${plan.projectId}/members`).get()).size).toBe(7);
    await expect(provisionPilot(app, { ...plan, projectCode: 'CHANGED' }, target)).rejects.toThrow('different content');
    await expect(provisionPilot(app, { ...plan, planId: `other-${suffix}` }, target)).rejects.toThrow('cannot be overwritten');
    await expect(provisionPilot(app, { ...plan, planId: `invalid-${suffix}`, participants: plan.participants.map((item) => ({ ...item, uid: 'same-user' })) }, target)).rejects.toThrow();
  } finally {
    await db.recursiveDelete(db.doc(`organizations/${plan.orgId}`));
    await db.doc(`pilotProvisioningReceipts/${plan.planId}`).delete();
    await deleteApp(app);
  }
});
