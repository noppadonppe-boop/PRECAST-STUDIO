import { describe, expect, it } from 'vitest';
import { calculatePrestress, emptyPrestressInput, prestressInputIssues, type PrestressInput } from './prestress';

const benchmark: PrestressInput = {
  system: 'pretension', memberReference: 'TEST rectangle 300×600, L=6 m', source: 'Synthetic mechanics benchmark; limits are test inputs only', assumptionsConfirmed: true,
  values: {
    widthMm: '300', depthMm: '600', spanM: '6', eccentricityMm: '100', strandCount: '10', strandAreaMm2: '100', fpuMpa: '1860', jackingStressMpa: '1000',
    elasticLossMpa: '50', frictionLossMpa: '0', anchorageLossMpa: '20', initialRelaxationLossMpa: '10', creepLossMpa: '60', shrinkageLossMpa: '40', relaxationLossMpa: '20',
    transferStrengthMpa: '30', serviceStrengthMpa: '40', transferModulusMpa: '30000', serviceModulusMpa: '35000', transferLoadKnM: '10', serviceLoadKnM: '20',
    transferCompressionLimitMpa: '18', transferTensionLimitMpa: '0', serviceCompressionLimitMpa: '24', serviceTensionLimitMpa: '0',
  },
};
function changed(values: Partial<PrestressInput['values']>): PrestressInput { return { ...benchmark, values: { ...benchmark.values, ...values } }; }
describe('Prestress elastic rectangular member', () => {
  it('matches a hand calculation in N/mm, including transfer and final losses', () => {
    const result = calculatePrestress(benchmark);
    expect(result.areaMm2).toBe(180000);
    expect(result.inertiaMm4).toBe(5.4e9);
    expect(result.sectionModulusMm3).toBe(18e6);
    expect(result.jackingForceKn).toBe(1000);
    expect(result.lossMpa).toEqual({ immediate: 80, longTerm: 120, total: 200 });
    expect(result.lossPercent).toBe(20);
    expect(result.transfer.forceKn).toBe(920);
    expect(result.service.forceKn).toBe(800);
    expect(result.transfer.topMpa).toBeCloseTo(2.5, 10);
    expect(result.transfer.bottomMpa).toBeCloseTo(7.7222222222, 9);
    expect(result.service.topMpa).toBeCloseTo(5, 10);
    expect(result.service.bottomMpa).toBeCloseTo(3.8888888889, 9);
    expect(result.transfer.netElasticDeflectionMm).toBeCloseTo(-1.5138888889, 9);
    expect(result.service.netElasticDeflectionMm).toBeCloseTo(-0.119047619, 9);
    expect(result.status).toBe('PRELIMINARY_NOT_VERIFIED');
    expect(result.canRelease).toBe(false);
  });
  it('satisfies axial and bending equilibrium and reverses tendon camber sign', () => {
    const result = calculatePrestress(changed({ eccentricityMm: '-100' }));
    const s = result.service;
    expect((s.topMpa + s.bottomMpa) / 2 * result.areaMm2).toBeCloseTo(800000, 6);
    expect((s.topMpa - s.bottomMpa) / 2 * result.sectionModulusMm3).toBeCloseTo(170e6, 5);
    expect(s.prestressDeflectionMm).toBeGreaterThan(0);
    expect(s.hasTension).toBe(true);
    expect(s.comparison).toBe('EXCEEDS_USER_LIMITS');
  });
  it('handles concentric force and zero loads without inventing bending', () => {
    const s = calculatePrestress(changed({ eccentricityMm: '0', transferLoadKnM: '0', serviceLoadKnM: '0' })).service;
    expect(s.topMpa).toEqual(s.bottomMpa);
    expect(s.netElasticDeflectionMm).toBe(0);
  });
  it('includes friction once for the explicitly uniform-force post-tension approximation', () => {
    const input = { ...changed({ frictionLossMpa: '100' }), system: 'posttension' as const };
    const r = calculatePrestress(input);
    expect(r.transfer.forceKn).toBe(820);
    expect(r.service.forceKn).toBe(700);
  });
  it('rejects blank drafts, unconfirmed assumptions and incomplete provenance', () => {
    expect(() => calculatePrestress(emptyPrestressInput())).toThrow();
    expect(() => calculatePrestress({ ...benchmark, assumptionsConfirmed: false })).toThrow();
    expect(() => calculatePrestress({ ...benchmark, source: ' ' })).toThrow();
  });
  it.each([
    { widthMm: '' }, { depthMm: '0' }, { spanM: 'Infinity' }, { strandAreaMm2: 'NaN' }, { strandCount: '1.5' },
    { eccentricityMm: '300' }, { jackingStressMpa: '1860' }, { creepLossMpa: '900' }, { frictionLossMpa: '10' },
    { elasticLossMpa: '-1' }, { transferCompressionLimitMpa: '31' },
  ])('rejects invalid geometry/material/loss inputs %o', (values) => {
    expect(prestressInputIssues(changed(values)).length).toBeGreaterThan(0);
    expect(() => calculatePrestress(changed(values))).toThrow();
  });
  it('compares against supplied limits without a code PASS or divide-by-zero for zero tensile allowance', () => {
    const r = calculatePrestress(changed({ serviceCompressionLimitMpa: '4' }));
    expect(r.service.comparison).toBe('EXCEEDS_USER_LIMITS');
    expect(r.transfer.comparison).toBe('WITHIN_USER_LIMITS');
    expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|"PASS"/);
  });
});
