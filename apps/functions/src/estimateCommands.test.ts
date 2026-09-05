import { describe, expect, it } from 'vitest';
import type { PriceBookRecord, ProductModelPayload } from '@precast/domain';
import { buildEngineeringEstimate, buildEstimateExportManifest, estimateBlockingConditions } from './estimateCommands';

const model: ProductModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local',
  panels: [{ id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 3, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 1.35, weightKn: 31.8, cogM: { x: 1.5, y: 1.5, z: 0.075 } }],
  joints: [], anchors: [{ id: 'lift-a', panelId: 'panel-a', kind: 'lifting', positionM: { x: 1, y: 2.8, z: 0.075 }, capacityKn: 25 }],
  supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX'] }],
  loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 31.8, unit: 'kN' }], loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'],
  validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 },
};

const item = (id: string, costCode: string, unit: PriceBookRecord['items'][number]['unit'], baseRate: number, effectiveTo?: string): PriceBookRecord['items'][number] => ({
  id, costCode, description: costCode, category: costCode === 'LOG-TRANSPORT' ? 'logistics' : 'material', unit, currency: 'THB', baseRate,
  sourceType: 'internalBenchmark', sourceRef: `PB/${id}`, effectiveFrom: '2026-01-01', ...(effectiveTo === undefined ? {} : { effectiveTo }), taxIncluded: false, status: 'approved',
});
const completeBook: PriceBookRecord = { id: 'pb-2026', revision: 'PB-R01', status: 'approved', currency: 'THB', items: [
  item('pb-concrete', 'CONC-C40', 'm3', 2500), item('pb-formwork', 'FORM-PANEL', 'm2', 500), item('pb-anchor', 'ANCH-LIFT', 'each', 650), item('pb-joint', 'JOINT-SEAL', 'm', 180), item('pb-transport', 'LOG-TRANSPORT', 't', 900),
] };
const parameters = { effectiveDate: '2026-09-05', indirectPercent: 10, contingencyPercent: 5, markupPercent: 12, vatPercent: 7, uncertaintyPercent: 15, designDependencyStatus: 'PASS' as const };

describe('M6 deterministic engineering estimate', () => {
  it('recalculates every layer from exact traceable model quantities', () => {
    const first = buildEngineeringEstimate(model, completeBook, parameters); const second = buildEngineeringEstimate(model, completeBook, parameters);
    expect(first).toEqual(second); expect(first.lines).toHaveLength(5); expect(first.lines.every((line) => line.elementIds.length > 0 && line.rateStatus === 'current')).toBe(true);
    expect(first.lines[0]?.rawQuantity).toBe(1.35); expect(first.lines[0]?.payableQuantity).toBeCloseTo(1.3905, 10);
    expect(first.summary.directCost).toBe(first.summary.pricedDirectCost); expect(first.summary.grandTotal).not.toBeNull(); expect(first.summary.lowRange).toBeLessThan(first.summary.grandTotal!);
  });

  it('keeps expired and unit-mismatched rates visible and never substitutes zero', () => {
    const book: PriceBookRecord = { ...completeBook, items: completeBook.items.map((entry) => entry.costCode === 'CONC-C40' ? item('pb-concrete', 'CONC-C40', 'm2', 2500) : entry.costCode === 'LOG-TRANSPORT' ? item('pb-transport', 'LOG-TRANSPORT', 't', 900, '2026-06-30') : entry) };
    const estimate = buildEngineeringEstimate(model, book, { ...parameters, designDependencyStatus: 'NOT_CHECKED' });
    expect(estimate.lines.find((line) => line.costCode === 'CONC-C40')).toMatchObject({ rateStatus: 'unitMismatch', unitRate: null, amount: null });
    expect(estimate.lines.find((line) => line.costCode === 'LOG-TRANSPORT')).toMatchObject({ rateStatus: 'expiredRate', unitRate: null, amount: null });
    expect(estimate.summary.directCost).toBeNull(); expect(estimate.summary.grandTotal).toBeNull();
    expect(estimateBlockingConditions(estimate)).toEqual(expect.arrayContaining(['G4 design dependency is NOT_CHECKED.', 'CONC-C40: unitMismatch.', 'LOG-TRANSPORT: expiredRate.']));
  });

  it('plans all four deterministic export formats only for an approved immutable snapshot', () => {
    const payload = buildEngineeringEstimate(model, completeBook, parameters);
    expect(() => buildEstimateExportManifest({ id: 'est-r01', revision: 'EST-R01', status: 'draft', locked: false, blockingConditions: [], payload })).toThrow('approved, locked');
    const manifest = buildEstimateExportManifest({ id: 'est-r01', revision: 'EST-R01', status: 'approved', locked: true, snapshotHash: `sha256:${'a'.repeat(64)}`, blockingConditions: [], payload });
    expect(manifest.files.map((file) => file.format)).toEqual(['xlsx', 'pdf', 'csv', 'json']);
    expect(manifest.payloadHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
