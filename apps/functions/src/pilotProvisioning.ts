import { createHash } from 'node:crypto';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';
import { pilotProvisioningSchema } from '../../../packages/schemas/src/pilotProvisioning';

// Administrative operator entry point, deliberately not a callable Function.
export async function provisionPilot(app: App, input: unknown, target: { projectId: string; emulator: boolean }) {
  const plan = pilotProvisioningSchema.parse(input);
  if (target.emulator ? app.options.projectId !== 'demo-precast-m1' || target.projectId !== 'demo-precast-m1' : app.options.projectId !== target.projectId || plan.firebaseProjectId !== target.projectId) throw new Error('Pilot provisioning target mismatch.');
  const db = getFirestore(app);
  const normalized = { ...plan, participants: [...plan.participants].sort((a, b) => a.role.localeCompare(b.role)) };
  const planHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  const root = `organizations/${plan.orgId}/projects/${plan.projectId}`;
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const receiptRef = db.doc(`pilotProvisioningReceipts/${plan.planId}`);
    const orgRef = db.doc(`organizations/${plan.orgId}`);
    const projectRef = db.doc(root);
    const paths = plan.participants.flatMap(({ uid }) => [`organizations/${plan.orgId}/members/${uid}`, `${root}/members/${uid}`]);
    const [receipt, org, project, ...members] = await Promise.all([tx.get(receiptRef), tx.get(orgRef), tx.get(projectRef), ...paths.map((path) => tx.get(db.doc(path)))]);
    if (receipt.exists) {
      if (receipt.data()?.planHash !== planHash) throw new Error('Provisioning plan ID has different content.');
      return { planHash, replayed: true, projectId: plan.projectId };
    }
    if (Date.parse(plan.expiresAt) <= now.toMillis() || Date.parse(plan.reviewedAt) > now.toMillis()) throw new Error('Plan review or membership dates are not current.');
    if (org.exists || project.exists || members.some((member) => member.exists)) throw new Error('Pilot provisioning creates a new organization only; existing records cannot be overwritten.');
    const metadata = { createdAt: now, updatedAt: now, updatedBy: plan.reviewedBy, pilotPlanHash: planHash };
    tx.create(orgRef, { id: plan.orgId, name: plan.organizationName, ...metadata });
    tx.create(projectRef, { id: plan.projectId, orgId: plan.orgId, code: plan.projectCode, name: plan.projectName, status: 'active', currentStage: 'intake',
      gateStates: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`G${i}`, 'notStarted'])), assignedUserIds: plan.participants.map(({ uid }) => uid),
      pilot: { label: plan.label, dataOwner: plan.dataOwner, cleanupOwner: plan.cleanupOwner, retentionUntil: plan.retentionUntil, productionReleaseAllowed: false }, ...metadata });
    for (const participant of plan.participants) {
      tx.create(db.doc(`organizations/${plan.orgId}/members/${participant.uid}`), { uid: participant.uid, orgId: plan.orgId, status: 'active', orgRoles: [], projectIds: [plan.projectId], ...metadata });
      tx.create(db.doc(`${root}/members/${participant.uid}`), { uid: participant.uid, orgId: plan.orgId, projectId: plan.projectId, status: 'active', roles: [participant.role], capabilities: [], effectiveFrom: Timestamp.fromDate(new Date(plan.effectiveFrom)), expiresAt: Timestamp.fromDate(new Date(plan.expiresAt)), ...metadata });
    }
    tx.create(db.doc(`${root}/auditEvents/${plan.planId}`), { id: plan.planId, action: 'pilotProvision', actorUid: plan.reviewedBy, occurredAt: now, planHash, stateBefore: 'none', stateAfter: 'notStarted', environment: target.emulator ? 'emulator' : 'staging' });
    tx.create(receiptRef, { planHash, orgId: plan.orgId, projectId: plan.projectId, reviewedBy: plan.reviewedBy, reviewedAt: plan.reviewedAt, appliedAt: now });
    return { planHash, replayed: false, projectId: plan.projectId };
  });
}
