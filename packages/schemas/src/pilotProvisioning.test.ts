import { expect, it } from 'vitest';
import plan from '../../../docs/pilot/provisioning.example.json';
import { pilotProvisioningSchema } from './pilotProvisioning';

it('accepts a seven-role preview without creating approvals or accepting extra privileged fields', () => {
  expect(pilotProvisioningSchema.safeParse(plan).success).toBe(true);
  expect(pilotProvisioningSchema.safeParse({ ...plan, productionReleaseAllowed: true }).success).toBe(false);
  expect(pilotProvisioningSchema.safeParse({ ...plan, firebaseProjectId: 'demo-precast-m1' }).success).toBe(false);
  expect(pilotProvisioningSchema.safeParse({ ...plan, participants: plan.participants.map((item) => ({ ...item, uid: 'same-user' })) }).success).toBe(false);
});

it('rejects role duplication, unsafe document IDs and inverted retention windows', () => {
  expect(pilotProvisioningSchema.safeParse({ ...plan, participants: plan.participants.map((item) => ({ ...item, role: 'bimCoordinator' })) }).success).toBe(false);
  expect(pilotProvisioningSchema.safeParse({ ...plan, orgId: 'organizations/other' }).success).toBe(false);
  expect(pilotProvisioningSchema.safeParse({ ...plan, expiresAt: plan.effectiveFrom }).success).toBe(false);
  expect(pilotProvisioningSchema.safeParse({ ...plan, retentionUntil: plan.effectiveFrom }).success).toBe(false);
});
