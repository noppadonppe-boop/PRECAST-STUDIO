import { z } from 'zod';

const evidence = z.object({
  status: z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_CHECKED']),
  evidenceRefs: z.array(z.string().min(3)),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  note: z.string().min(3),
}).superRefine((item, ctx) => {
  if (item.status === 'PASS' && (!item.evidenceRefs.length || !item.verifiedBy || !item.verifiedAt)) ctx.addIssue({ code: 'custom', message: 'PASS requires evidence, verifier and timestamp.' });
});
export const pilotRoles = ['bimCoordinator', 'structuralEngineer', 'engineeringChecker', 'costEstimator', 'detailer', 'productionManager', 'projectManager'] as const;
export const pilotChecks = ['stagingDeployment', 'appCheck', 'iam', 'budgetMonitoring', 'backupRestore', 'retention', 'engineeringVerification', 'revitImport', 'uat', 'rollback', 'dataPrivacy'] as const;
export const pilotEvidenceSchema = z.object({
  schemaVersion: z.literal('1.0.0'), label: z.literal('PILOT / NOT FOR PRODUCTION'),
  environment: z.enum(['localRehearsal', 'staging']), firebaseProjectId: z.string().nullable(),
  organizationId: z.string().nullable(), projectId: z.string().nullable(),
  participants: z.array(z.object({ role: z.enum(pilotRoles), uid: z.string().min(1) })),
  gates: z.array(z.object({ gate: z.enum(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']), result: evidence })).length(8),
  scenarios: z.array(z.object({ id: z.number().int().min(1).max(10), result: evidence })).length(10),
  readiness: z.array(z.object({ check: z.enum(pilotChecks), result: evidence })).length(pilotChecks.length),
  defects: z.array(z.object({ id: z.string(), severity: z.enum(['critical', 'high', 'medium', 'low']), status: z.enum(['open', 'closed']), owner: z.string().nullable(), evidenceRefs: z.array(z.string()) })),
  productionDeploymentAuthorized: z.literal(false),
}).superRefine((report, ctx) => {
  if (new Set(report.gates.map((item) => item.gate)).size !== 8 || new Set(report.scenarios.map((item) => item.id)).size !== 10 || new Set(report.readiness.map((item) => item.check)).size !== pilotChecks.length) ctx.addIssue({ code: 'custom', message: 'Every gate, scenario and readiness category must appear exactly once.' });
  if (new Set(report.participants.map((item) => item.uid)).size !== report.participants.length || new Set(report.participants.map((item) => item.role)).size !== report.participants.length) ctx.addIssue({ code: 'custom', message: 'Pilot participants must use distinct accounts and roles.' });
  const design = report.gates.find((item) => item.gate === 'G4');
  if (design?.result.status !== 'PASS' && report.gates.some((item) => ['G6', 'G7'].includes(item.gate) && item.result.status === 'PASS')) ctx.addIssue({ code: 'custom', message: 'G6/G7 cannot PASS while G4 is unverified.' });
});

export function assessPilotEvidence(input: unknown) {
  const report = pilotEvidenceSchema.parse(input);
  const blockers: string[] = [];
  if (report.environment !== 'staging' || !report.firebaseProjectId || !report.organizationId || !report.projectId) blockers.push('Staging pilot identity and deployment are pending.');
  for (const role of pilotRoles) if (!report.participants.some((item) => item.role === role)) blockers.push(`Participant pending: ${role}.`);
  for (const item of report.readiness) if (item.result.status !== 'PASS') blockers.push(`${item.check}: ${item.result.status}.`);
  for (const item of report.scenarios) if (item.result.status !== 'PASS') blockers.push(`Scenario ${item.id}: ${item.result.status}.`);
  for (const item of report.gates) if (item.result.status !== 'PASS') blockers.push(`${item.gate}: ${item.result.status}.`);
  for (const defect of report.defects) if (defect.status === 'open' && ['critical', 'high'].includes(defect.severity)) blockers.push(`Open ${defect.severity} defect: ${defect.id}.`);
  return { status: blockers.length ? 'BLOCKED' as const : 'READY_FOR_OWNER_REVIEW' as const, blockers, productionDeploymentAuthorized: false as const };
}
