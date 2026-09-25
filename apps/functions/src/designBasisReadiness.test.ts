import { describe, expect, it } from 'vitest';
import { emptyDesignCriteria, withDesignCriteria, type DesignBasisPayload } from '@precast/domain';
import { completeCriteriaFixture } from '../../../tools/testing/designCriteriaFixture';
import { assertDesignBasisCriteriaReady } from './designBasisReadiness';

const legacy: DesignBasisPayload = { jurisdiction: 'Thailand', designCode: 'ACI 318', designCodeEdition: '2019', loadingCode: 'ASCE 7', loadingCodeEdition: '2022', units: 'kN-m-MPa', designLifeYears: 50, riskCategory: 'II', concrete: { fc28Mpa: 40, fcLiftMpa: 20, densityKgM3: 2400, stiffnessMpa: 30000, durabilityClass: 'Moderate', source: 'TEST ONLY' }, reinforcement: { fyMpa: 500, source: 'TEST ONLY' }, handling: { liftingDynamicFactor: 1.5, transportDynamicFactor: 1.3, storageSupportRule: 'TEST ONLY', source: 'TEST ONLY' }, fireResistanceMinutes: 120, inheritedFrom: 'test', overrideReasons: {} };
describe('Design Basis certification guard', () => {
  it('rejects legacy, malformed and incomplete criteria even if old engineering fields are valid', () => {
    expect(() => assertDesignBasisCriteriaReady(legacy)).toThrow('Design Criteria incomplete');
    expect(() => assertDesignBasisCriteriaReady({ ...legacy, criteria: {} })).toThrow('incomplete');
    expect(() => assertDesignBasisCriteriaReady({ ...legacy, criteria: emptyDesignCriteria() })).toThrow('Design Criteria incomplete');
  });
  it('accepts complete declarations but rejects disagreement with solver-facing values', () => {
    const criteria = completeCriteriaFixture(legacy);
    const ready = withDesignCriteria(legacy, criteria);
    expect(() => assertDesignBasisCriteriaReady(ready)).not.toThrow();
    expect(() => assertDesignBasisCriteriaReady({ ...ready, designCodeEdition: '2025' })).toThrow('disagree');
    expect(() => assertDesignBasisCriteriaReady({ ...ready, concrete: { ...ready.concrete, fcLiftMpa: 25 } })).toThrow('disagree');
    expect(() => assertDesignBasisCriteriaReady(withDesignCriteria(legacy, { ...criteria, values: { ...criteria.values, fcLift: '25' } }))).not.toThrow();
  });
});
