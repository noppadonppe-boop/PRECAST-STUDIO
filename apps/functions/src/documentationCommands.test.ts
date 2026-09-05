import { describe, expect, it } from 'vitest';
import { validateRevitDraftingProfile, type ProductModelPayload } from '@precast/domain';
import { buildDesignCheckRegister } from './designCheckCommands';
import { buildDocumentationExportManifest, buildDocumentationSet, documentationBlockingConditions } from './documentationCommands';

const model: ProductModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local', panels: [
    { id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 3, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [{ id: 'opening-a', xM: 1, yM: 0, widthM: 1, heightM: 2 }], volumeM3: 1.35, weightKn: 31.8, cogM: { x: 1.5, y: 1.5, z: 0.075 } },
    { id: 'panel-b', mark: 'W2', type: 'wall', sourceObjectIds: ['ifc-b'], materialId: 'c40', geometry: { widthM: 2, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 0.9, weightKn: 21.2, cogM: { x: 4, y: 1.5, z: 0.075 } },
  ], joints: [{ id: 'joint-ab', panelIds: ['panel-a', 'panel-b'], stiffnessKnM: 20000, loadPathConfirmed: true }],
  anchors: [{ id: 'lift-a', panelId: 'panel-a', kind: 'lifting', positionM: { x: 1, y: 2.7, z: 0.075 }, capacityKn: 25 }, { id: 'lift-b', panelId: 'panel-b', kind: 'lifting', positionM: { x: 4, y: 2.7, z: 0.075 }, capacityKn: 25 }],
  supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX'] }], loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 53, unit: 'kN' }],
  loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'], validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 },
};
const hash = `sha256:${'a'.repeat(64)}`;
const calculation = buildDesignCheckRegister(model, 'an-r01', hash);
const build = (status = 'draft', payload = calculation) => buildDocumentationSet({ model, modelVersionId: 'pm-r01', modelSnapshotHash: hash, calculation: payload, calculationReportId: 'calc-r01', calculationSnapshotHash: hash, calculationStatus: status, drawingSetRevision: 'DS-R01', reportId: 'report-r01', reportRevision: 'CR-R01' });

describe('M7 deterministic Documentation Set', () => {
  it('creates the canonical report outline and one traceable drawing per panel', () => {
    const first = build(); const second = build();
    expect(first).toEqual(second); expect(first.calculationReport.sections).toHaveLength(13); expect(first.calculationReport.sections.map((section) => section.number)).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
    expect(first.drawings).toHaveLength(2); expect(first.drawings.map((drawing) => drawing.panelId)).toEqual(['panel-a', 'panel-b']); expect(first.drawings.every((drawing) => drawing.sourceRefs.modelVersionId === 'pm-r01')).toBe(true); expect(first.drawings[1]?.anchors[0]).toMatchObject({ id: 'lift-b', positionM: { x: 4, y: 2.7, z: 0.075 }, capacityKn: 25 });
    expect(first.exportProfile).toMatchObject({ id: 'REVIT-DRAFTING-01', label: 'Revit-ready CAD import', nativeRevit: false, dxfVersion: 'R2018', units: 'mm', preflightState: 'notRun' }); expect(validateRevitDraftingProfile(first.exportProfile)).toEqual([]);
    expect(first.preflight.overallStatus).toBe('NOT_CHECKED'); expect(documentationBlockingConditions(first)).toEqual(expect.arrayContaining(['lifting: NOT_CHECKED.', 'reinforcement: NOT_CHECKED.', 'engineeringApproval: NOT_CHECKED.']));
  });

  it('blocks document artifacts until G4, reinforcement, lifting and G6 preflight all pass', () => {
    const incomplete = build();
    expect(() => buildDocumentationExportManifest({ id: 'ds-r01', revision: 'DS-R01', status: 'draft', locked: false, blockingConditions: documentationBlockingConditions(incomplete), payload: incomplete })).toThrow('approved G4/G6');
    const passedCalculation = { ...calculation, overallStatus: 'PASS' as const, checks: calculation.checks.map((check) => ({ ...check, status: 'PASS' as const, codeClauseRef: 'Verified method reference', message: 'Verified result.' })) };
    const ready = build('approved', passedCalculation); const passPayload = { ...ready, drawings: ready.drawings.map((drawing) => ({ ...drawing, reinforcementStatus: 'PASS' as const })), preflight: { overallStatus: 'PASS' as const, checks: ready.preflight.checks.map((check) => ({ ...check, status: 'PASS' as const })) } };
    const manifest = buildDocumentationExportManifest({ id: 'ds-r01', revision: 'DS-R01', status: 'approved', locked: true, snapshotHash: hash, blockingConditions: [], payload: passPayload });
    expect(manifest.files.some((file) => file.format === 'docx')).toBe(true); expect(manifest.files.filter((file) => file.format === 'pdfa-2b')).toHaveLength(3); expect(manifest.payloadHash).toMatch(/^sha256:/);
  });
});
