import { z } from 'zod';

const id = z.string().regex(/^[a-zA-Z0-9_-]{3,80}$/);
export const pilotProvisioningRoles = ['bimCoordinator', 'structuralEngineer', 'engineeringChecker', 'costEstimator', 'detailer', 'productionManager', 'projectManager'] as const;
export const pilotProvisioningSchema = z.object({
  schemaVersion: z.literal('1.0.0'), environment: z.literal('staging'),
  firebaseProjectId: z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/).refine((value) => !value.startsWith('demo-')),
  planId: id, orgId: id, projectId: id,
  organizationName: z.string().trim().min(3).max(120), projectName: z.string().trim().min(3).max(120), projectCode: z.string().trim().min(3).max(32),
  reviewedBy: id, reviewedAt: z.string().datetime(),
  effectiveFrom: z.string().datetime(), expiresAt: z.string().datetime(),
  dataOwner: id, cleanupOwner: id, retentionUntil: z.string().datetime(),
  participants: z.array(z.object({ uid: id, role: z.enum(pilotProvisioningRoles) }).strict()).length(7),
  label: z.literal('PILOT / NOT FOR PRODUCTION'),
}).strict().superRefine((plan, ctx) => {
  if (new Set(plan.participants.map((item) => item.uid)).size !== 7 || new Set(plan.participants.map((item) => item.role)).size !== 7) ctx.addIssue({ code: 'custom', message: 'Seven distinct pilot accounts and roles are required.' });
  if (Date.parse(plan.effectiveFrom) >= Date.parse(plan.expiresAt) || Date.parse(plan.retentionUntil) < Date.parse(plan.expiresAt)) ctx.addIssue({ code: 'custom', message: 'Membership expiry must follow its effective date and not exceed retention.' });
});
export type PilotProvisioningPlan = z.infer<typeof pilotProvisioningSchema>;
