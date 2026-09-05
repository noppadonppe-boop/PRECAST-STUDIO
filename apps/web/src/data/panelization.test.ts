import { describe, expect, it } from 'vitest';
import type { ProductModelPayload } from '@precast/domain';
import { productModelPayloadSchema } from '@precast/schemas';
import { confirmModelLoadPaths, mergePanels, splitPanel } from './panelization';

const model: ProductModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local',
  panels: [{ id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 4, heightM: 3, thicknessM: .15, offsetM: 0 }, openings: [], volumeM3: 1.8, weightKn: 42.4, cogM: { x: 2, y: 1.5, z: .075 } }],
  joints: [], anchors: [{ id: 'lift-a', panelId: 'panel-a', kind: 'lifting', positionM: { x: 3, y: 2.7, z: .075 }, capacityKn: 25 }],
  supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX'] }],
  loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 42.4, unit: 'kN' }], loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'],
  validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 },
};

describe('engineer-controlled panelization transformations', () => {
  it('splits geometry deterministically and requires new load-path confirmation', () => {
    const split = splitPanel(model, 'panel-a');
    expect(split.panels.map((panel) => panel.id)).toEqual(['panel-a-a', 'panel-a-b']);
    expect(split.panels.map((panel) => panel.geometry.widthM)).toEqual([2, 2]);
    expect(split.anchors[0]).toMatchObject({ panelId: 'panel-a-b', positionM: { x: 1 } });
    expect(split.joints[0]).toMatchObject({ loadPathConfirmed: false });
    expect(split.validation.missingLoadPaths).toBe(1);
    expect(productModelPayloadSchema.safeParse(split).success).toBe(true);
  });

  it('rejects split lines crossing openings and merges compatible panels', () => {
    const crossing: ProductModelPayload = { ...model, panels: [{ ...model.panels[0]!, openings: [{ id: 'opening-a', xM: 1.5, yM: 0, widthM: 1, heightM: 2 }] }] };
    expect(() => splitPanel(crossing, 'panel-a')).toThrow('crosses the split line');
    const confirmed = confirmModelLoadPaths(splitPanel(model, 'panel-a'));
    const merged = mergePanels(confirmed, 'panel-a-a', 'panel-a-b');
    expect(merged.panels).toHaveLength(1);
    expect(merged.panels[0]?.geometry.widthM).toBe(4);
    expect(merged.joints).toHaveLength(0);
    expect(merged.validation.missingLoadPaths).toBe(0);
  });
});
