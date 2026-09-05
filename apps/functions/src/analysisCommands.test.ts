import { describe, expect, it } from 'vitest';
import type { LoadAnalysisSettingsPayload, ProductModelPayload } from '@precast/domain';
import { canonicalizeLoadSettings, runTwoPanelStaticBenchmark } from './analysisCommands';

const model: ProductModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local',
  panels: [
    { id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 3, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 1.35, weightKn: 31.8, cogM: { x: 1.5, y: 1.5, z: 0.075 } },
    { id: 'panel-b', mark: 'W2', type: 'wall', sourceObjectIds: ['ifc-b'], materialId: 'c40', geometry: { widthM: 2, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 0.9, weightKn: 21.2, cogM: { x: 4, y: 1.5, z: 0.075 } },
  ], joints: [{ id: 'joint-ab', panelIds: ['panel-a', 'panel-b'], stiffnessKnM: 20000, loadPathConfirmed: true }], anchors: [],
  supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX', 'UY', 'UZ'] }],
  loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 53, unit: 'kN' }], loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'], validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 },
};

describe('controlled benchmark adapter', () => {
  it('is deterministic and balances reactions without claiming a design status', () => {
    const first = runTwoPanelStaticBenchmark(model); const second = runTwoPanelStaticBenchmark(model);
    expect(first).toEqual(second);
    expect(first.result).toMatchObject({ appliedLoadKn: 74.2, reactionSumKn: 74.2, equilibriumImbalancePercent: 0, maxDisplacementMm: 0.84, governingCombinationId: 'uls' });
    expect(first.verification).toMatchObject({ fatalWarnings: 0, equilibriumPassed: true, convergencePassed: true, independentBenchmarkMatched: true });
  });

  it('canonicalizes unordered load settings', () => {
    const settings: LoadAnalysisSettingsPayload = { schemaVersion: '1.0.0', units: 'kN-m-MPa', elementIdealization: 'shell-mid-surface', shellFormulation: 'benchmark-shell', meshSizeM: 0.25, refinementZoneIds: ['z-b', 'z-a', 'z-a'], stiffnessModifiers: { membrane: 1, bending: 1 }, solverTolerance: 0.000001, maxIterations: 500, resultAveraging: 'nodal', scenarios: [{ id: 'final', activeSupportIds: ['support-b', 'support-a'], activeJointIds: ['joint-ab'], loadCaseIds: ['dead'], combinationIds: ['uls'] }] };
    expect(canonicalizeLoadSettings(settings).refinementZoneIds).toEqual(['z-a', 'z-b']);
    expect(canonicalizeLoadSettings(settings).scenarios[0]?.activeSupportIds).toEqual(['support-a', 'support-b']);
  });
});
