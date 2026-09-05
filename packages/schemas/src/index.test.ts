import { describe, expect, it } from 'vitest';
import { approvalCommandSchema, designBasisPayloadSchema, mockAnalysisInputSchema, sourceFileSchema } from './index';

describe('versioned runtime schemas', () => {
  it('rejects an unversioned mock analysis payload', () => {
    expect(mockAnalysisInputSchema.safeParse({ projectId: 'p1' }).success).toBe(false);
  });

  it('rejects a malformed approval snapshot hash', () => {
    const result = approvalCommandSchema.safeParse({
      orgId: 'o1', projectId: 'p1', requestId: 'r1', artifactType: 'designBasis', artifactId: 'db1',
      snapshotHash: 'not-a-hash', idempotencyKey: '2f6b1204-45b1-49af-97eb-f5f35ca0d22b',
    });
    expect(result.success).toBe(false);
  });

  it('accepts only bounded IFC/PDF intake metadata', () => {
    expect(sourceFileSchema.safeParse({ name: 'model.ifc', contentType: 'application/x-step', size: 1024 }).success).toBe(true);
    expect(sourceFileSchema.safeParse({ name: 'model.exe', contentType: 'application/octet-stream', size: 1024 }).success).toBe(false);
    expect(sourceFileSchema.safeParse({ name: 'large.pdf', contentType: 'application/pdf', size: 101 * 1024 * 1024 }).success).toBe(false);
  });

  it('requires complete, plausible Design Basis engineering values', () => {
    const valid = { jurisdiction: 'Thailand', designCode: 'ACI 318', designCodeEdition: '2019', loadingCode: 'ASCE 7', loadingCodeEdition: '2022', units: 'kN-m-MPa', designLifeYears: 50, riskCategory: 'II', concrete: { fc28Mpa: 40, fcLiftMpa: 20, densityKgM3: 2400, stiffnessMpa: 30000, durabilityClass: 'Moderate', source: 'Spec S-001' }, reinforcement: { fyMpa: 500, source: 'Spec S-001' }, handling: { liftingDynamicFactor: 1.5, transportDynamicFactor: 1.3, storageSupportRule: 'Two bearing points.', source: 'Handling standard' }, fireResistanceMinutes: 120, inheritedFrom: 'type-2-v1', overrideReasons: {} };
    expect(designBasisPayloadSchema.safeParse(valid).success).toBe(true);
    expect(designBasisPayloadSchema.safeParse({ ...valid, concrete: { ...valid.concrete, fc28Mpa: 2 } }).success).toBe(false);
  });
});
