import { describe, expect, it } from 'vitest';
import { classifyPrecast } from './precast';
describe('precast eligibility', () => {
  it('requires positive manufacturing evidence and never infers from category alone', () => {
    expect(classifyPrecast('IfcWall', []).status).toBe('review');
    expect(classifyPrecast('IfcSlab', [{ name: 'Material', value: 'Concrete' }]).status).toBe('review');
    expect(classifyPrecast('IfcWall', [{ name: 'IsPrecast', value: true }]).status).toBe('precast');
    expect(classifyPrecast('IfcBeam', [{ name: 'ConstructionMethod', value: 'Precast concrete' }]).status).toBe('precast');
  });
  it('excludes accessories even when a property is mistakenly marked precast', () => {
    for (const type of ['IfcDoor', 'IfcWindow', 'IfcOpeningElement', 'IfcFurnishingElement', 'IfcReinforcingBar']) expect(classifyPrecast(type, [{ name: 'Precast', value: true }]).status).toBe('excluded');
    expect(classifyPrecast('IfcBuildingElementProxy', []).status).toBe('excluded');
  });
  it('rejects cast-in-place, false and conflicting declarations', () => {
    expect(classifyPrecast('IfcWall', [{ name: 'IsPrecast', value: false }]).status).toBe('excluded');
    expect(classifyPrecast('IfcWall', [{ name: 'IsPrecast', value: true }, { name: 'CastingMethod', value: 'cast-in-situ' }]).status).toBe('excluded');
  });
});
