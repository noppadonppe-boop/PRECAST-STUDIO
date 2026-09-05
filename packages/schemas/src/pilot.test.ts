import { describe, expect, it } from 'vitest';
import { assessPilotEvidence, pilotChecks, pilotEvidenceSchema } from './pilot';
const pending = { status: 'NOT_CHECKED', evidenceRefs: [], verifiedBy: null, verifiedAt: null, note: 'Operator evidence is pending.' };
const report = { schemaVersion: '1.0.0', label: 'PILOT / NOT FOR PRODUCTION', environment: 'localRehearsal', firebaseProjectId: null, organizationId: null, projectId: null, participants: [], gates: Array.from({ length: 8 }, (_, i) => ({ gate: `G${i}`, result: pending })), scenarios: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, result: pending })), readiness: pilotChecks.map((check) => ({ check, result: pending })), defects: [], productionDeploymentAuthorized: false };
describe('M9 pilot evidence', () => {
  it('cannot turn local rehearsal into production readiness', () => {
    expect(assessPilotEvidence(report)).toMatchObject({ status: 'BLOCKED', productionDeploymentAuthorized: false });
    expect(pilotEvidenceSchema.safeParse({ ...report, productionDeploymentAuthorized: true }).success).toBe(false);
  });
  it('rejects duplicate coverage and unsubstantiated PASS claims', () => {
    expect(pilotEvidenceSchema.safeParse({ ...report, scenarios: report.scenarios.map(() => report.scenarios[0]) }).success).toBe(false);
    expect(pilotEvidenceSchema.safeParse({ ...report, gates: report.gates.map((item) => ({ ...item, result: { ...pending, status: 'PASS' } })) }).success).toBe(false);
  });
  it('rejects one account filling independent roles', () => {
    expect(pilotEvidenceSchema.safeParse({ ...report, participants: [{ role: 'structuralEngineer', uid: 'same' }, { role: 'engineeringChecker', uid: 'same' }] }).success).toBe(false);
  });
});
