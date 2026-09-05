export const revitSemanticLayerKeys = ['outline', 'hidden', 'rebar', 'rebarText', 'dimension', 'text', 'embed', 'opening', 'center', 'revision'] as const;
export type RevitSemanticLayerKey = (typeof revitSemanticLayerKeys)[number];

export interface RevitDraftingExportProfile {
  id: 'REVIT-DRAFTING-01';
  version: '1.0.0';
  label: 'Revit-ready CAD import';
  target: 'revitDraftingView';
  nativeRevit: false;
  dxfVersion: 'R2018';
  units: 'mm';
  modelSpaceOnly: true;
  entities2dOnly: true;
  origin: { x: 0; y: 0; z: 0 };
  maximumExtentMm: number;
  intendedScale: '1:20';
  includeBorder: false;
  allowedEntities: readonly ['LINE', 'LWPOLYLINE', 'ARC', 'CIRCLE', 'INSERT', 'TEXT', 'MTEXT'];
  semanticLayers: Record<RevitSemanticLayerKey, string>;
  font: { requested: 'Arial'; fallback: 'Arial'; fallbackUsed: false };
  requiresSiblingPdfa: true;
  requiresJsonManifest: true;
  preflightState: 'notRun';
}

export const revitDrafting01Fixture = Object.freeze({
  id: 'REVIT-DRAFTING-01', version: '1.0.0', label: 'Revit-ready CAD import', target: 'revitDraftingView', nativeRevit: false,
  dxfVersion: 'R2018', units: 'mm', modelSpaceOnly: true, entities2dOnly: true, origin: { x: 0, y: 0, z: 0 }, maximumExtentMm: 50000,
  intendedScale: '1:20', includeBorder: false, allowedEntities: ['LINE', 'LWPOLYLINE', 'ARC', 'CIRCLE', 'INSERT', 'TEXT', 'MTEXT'],
  semanticLayers: { outline: 'PC-OUTLINE', hidden: 'PC-HIDDEN', rebar: 'PC-REBAR', rebarText: 'PC-REBAR-TEXT', dimension: 'PC-DIM', text: 'PC-TEXT', embed: 'PC-EMBED', opening: 'PC-OPENING', center: 'PC-CENTER', revision: 'PC-REVISION' },
  font: { requested: 'Arial', fallback: 'Arial', fallbackUsed: false }, requiresSiblingPdfa: true, requiresJsonManifest: true, preflightState: 'notRun',
} as const) satisfies RevitDraftingExportProfile;

export function validateRevitDraftingProfile(profile: RevitDraftingExportProfile): string[] {
  const problems: string[] = [];
  if (profile.nativeRevit !== false) problems.push('CAD import profile must never claim Native Revit output.');
  if (!profile.modelSpaceOnly || !profile.entities2dOnly || profile.origin.z !== 0) problems.push('Revit Drafting DXF must be 2D Model Space content at Z = 0.');
  if (profile.units !== 'mm' || profile.maximumExtentMm <= 0) problems.push('Explicit millimetre units and positive extent limit are required.');
  if (!profile.requiresSiblingPdfa || !profile.requiresJsonManifest) problems.push('Sibling PDF/A and JSON manifest are mandatory.');
  const values = Object.values(profile.semanticLayers);
  if (values.length !== revitSemanticLayerKeys.length || new Set(values).size !== values.length || values.some((layer) => !layer.startsWith('PC-'))) problems.push('Every semantic layer must map once to a stable PC- layer.');
  return problems;
}
