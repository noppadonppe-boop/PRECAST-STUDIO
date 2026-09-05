import { describe, expect, it } from 'vitest';
import type { ProductModelPayload } from '@precast/domain';
import { buildDesignCheckRegister } from './designCheckCommands';

const model: ProductModelPayload = { schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local', panels: [{ id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 3, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 1.35, weightKn: 31.8, cogM: { x: 1.5, y: 1.5, z: 0.075 } }], joints: [], anchors: [], supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX'] }], loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 31.8, unit: 'kN' }], loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'], validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 } };

describe('M5 design check register', () => {
  it('is deterministic, complete, and never invents a passing engineering result', () => {
    const first = buildDesignCheckRegister(model, 'an-r01', `sha256:${'a'.repeat(64)}`); const second = buildDesignCheckRegister(model, 'an-r01', `sha256:${'a'.repeat(64)}`);
    expect(first).toEqual(second); expect(first.checks).toHaveLength(7); expect(new Set(first.checks.map((check) => check.category)).size).toBe(7);
    expect(first.overallStatus).toBe('NOT_CHECKED'); expect(first.checks.every((check) => check.status === 'NOT_CHECKED' && check.disposition === undefined)).toBe(true);
  });
});
