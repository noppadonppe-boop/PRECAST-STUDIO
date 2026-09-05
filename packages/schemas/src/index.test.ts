import { describe, expect, it } from 'vitest';
import { approvalCommandSchema, designBasisPayloadSchema, loadAnalysisSettingsPayloadSchema, mockAnalysisInputSchema, productModelPayloadSchema, sourceFileSchema } from './index';

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

  it('validates Product Model references and opening bounds', () => {
    const valid = { schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local', panels: [{ id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 3, heightM: 3, thicknessM: .15, offsetM: 0 }, openings: [{ id: 'op-a', xM: 1, yM: 0, widthM: 1, heightM: 2 }], volumeM3: 1.35, weightKn: 31.8, cogM: { x: 1.5, y: 1.5, z: .075 } }], joints: [], anchors: [], supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX'] }], loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 31.8, unit: 'kN' }], loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'], validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 } };
    expect(productModelPayloadSchema.safeParse(valid).success).toBe(true);
    const outside = { ...valid, panels: [{ ...valid.panels[0], openings: [{ id: 'op-a', xM: 2.5, yM: 0, widthM: 1, heightM: 2 }] }] };
    expect(productModelPayloadSchema.safeParse(outside).success).toBe(false);
    expect(productModelPayloadSchema.safeParse({ ...valid, supports: [{ ...valid.supports[0], panelId: 'missing' }] }).success).toBe(false);
  });

  it('bounds analysis controls and requires unique scenario IDs', () => {
    const valid = { schemaVersion: '1.0.0', units: 'kN-m-MPa', elementIdealization: 'shell-mid-surface', shellFormulation: 'benchmark-shell', meshSizeM: 0.25, refinementZoneIds: [], stiffnessModifiers: { membrane: 1, bending: 1 }, solverTolerance: 0.000001, maxIterations: 500, resultAveraging: 'nodal', scenarios: [{ id: 'final', activeSupportIds: ['support-a'], activeJointIds: [], loadCaseIds: ['dead'], combinationIds: ['uls'] }] };
    expect(loadAnalysisSettingsPayloadSchema.safeParse(valid).success).toBe(true);
    expect(loadAnalysisSettingsPayloadSchema.safeParse({ ...valid, meshSizeM: 0.001 }).success).toBe(false);
    expect(loadAnalysisSettingsPayloadSchema.safeParse({ ...valid, scenarios: [...valid.scenarios, valid.scenarios[0]] }).success).toBe(false);
  });
});
