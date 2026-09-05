import { describe, expect, it } from 'vitest';
import { revitDrafting01Fixture, validateRevitDraftingProfile } from './exportProfiles';

describe('REVIT-DRAFTING-01 shared contract', () => {
  it('is deterministic, explicitly non-native and complete for placeholder validation', () => {
    expect(validateRevitDraftingProfile(revitDrafting01Fixture)).toEqual([]);
    expect(revitDrafting01Fixture).toMatchObject({ id: 'REVIT-DRAFTING-01', label: 'Revit-ready CAD import', nativeRevit: false, units: 'mm', modelSpaceOnly: true, entities2dOnly: true, origin: { z: 0 }, preflightState: 'notRun' });
    expect(Object.values(revitDrafting01Fixture.semanticLayers)).toHaveLength(10);
  });
});
