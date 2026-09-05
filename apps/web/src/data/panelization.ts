import type { ProductModelPayload } from '@precast/domain';

export function splitPanel(model: ProductModelPayload, panelId: string): ProductModelPayload {
  const panel = model.panels.find((item) => item.id === panelId);
  if (panel === undefined) throw new Error('Select one known panel to split.');
  const splitX = panel.geometry.widthM / 2;
  if (panel.openings.some((opening) => opening.xM < splitX && opening.xM + opening.widthM > splitX)) throw new Error('An opening crosses the split line; move or resize it before splitting.');
  const leftId = `${panel.id}-a`;
  const rightId = `${panel.id}-b`;
  const leftOpenings = panel.openings.filter((opening) => opening.xM + opening.widthM <= splitX);
  const rightOpenings = panel.openings.filter((opening) => opening.xM >= splitX).map((opening) => ({ ...opening, xM: opening.xM - splitX }));
  const half = (id: string, mark: string, openings: typeof panel.openings, cogX: number) => ({ ...panel, id, mark, geometry: { ...panel.geometry, widthM: splitX }, openings, volumeM3: panel.volumeM3 / 2, weightKn: panel.weightKn / 2, cogM: { ...panel.cogM, x: cogX } });
  const assign = <T extends { panelId: string; positionM: { x: number; y: number; z: number } }>(item: T): T => item.panelId !== panel.id ? item : item.positionM.x < splitX ? { ...item, panelId: leftId } : { ...item, panelId: rightId, positionM: { ...item.positionM, x: item.positionM.x - splitX } };
  return {
    ...model,
    panels: model.panels.flatMap((item) => item.id === panel.id ? [half(leftId, `${panel.mark}-A`, leftOpenings, splitX / 2), half(rightId, `${panel.mark}-B`, rightOpenings, splitX / 2)] : [item]),
    joints: [...model.joints.map((joint) => ({ ...joint, panelIds: joint.panelIds.map((id) => id === panel.id ? leftId : id) as [string, string] })), { id: `joint-${leftId}-${rightId}`, panelIds: [leftId, rightId], stiffnessKnM: 0, loadPathConfirmed: false }],
    anchors: model.anchors.map(assign), supports: model.supports.map(assign),
    validation: { ...model.validation, missingLoadPaths: model.validation.missingLoadPaths + 1 },
  };
}

export function mergePanels(model: ProductModelPayload, firstId: string, secondId: string): ProductModelPayload {
  const first = model.panels.find((item) => item.id === firstId);
  const second = model.panels.find((item) => item.id === secondId);
  if (first === undefined || second === undefined || first.id === second.id) throw new Error('Select two distinct known panels to merge.');
  if (first.type !== second.type || first.materialId !== second.materialId || first.geometry.heightM !== second.geometry.heightM || first.geometry.thicknessM !== second.geometry.thicknessM || first.geometry.offsetM !== second.geometry.offsetM) throw new Error('Panels must share type, material, height, thickness and offset before merging.');
  const id = `${first.id}-${second.id}`.slice(0, 64);
  const totalWeight = first.weightKn + second.weightKn;
  const merged = { ...first, id, mark: `${first.mark}+${second.mark}`.slice(0, 40), sourceObjectIds: [...new Set([...first.sourceObjectIds, ...second.sourceObjectIds])].sort(), geometry: { ...first.geometry, widthM: first.geometry.widthM + second.geometry.widthM }, openings: [...first.openings, ...second.openings.map((opening) => ({ ...opening, xM: opening.xM + first.geometry.widthM }))], volumeM3: first.volumeM3 + second.volumeM3, weightKn: totalWeight, cogM: { ...first.cogM, x: totalWeight === 0 ? 0 : (first.cogM.x * first.weightKn + (second.cogM.x + first.geometry.widthM) * second.weightKn) / totalWeight } };
  const selected = new Set([first.id, second.id]);
  const remap = <T extends { panelId: string; positionM: { x: number; y: number; z: number } }>(item: T): T => !selected.has(item.panelId) ? item : { ...item, panelId: id, positionM: item.panelId === second.id ? { ...item.positionM, x: item.positionM.x + first.geometry.widthM } : item.positionM };
  return {
    ...model, panels: [...model.panels.filter((item) => !selected.has(item.id)), merged], anchors: model.anchors.map(remap), supports: model.supports.map(remap),
    joints: model.joints.map((joint) => ({ ...joint, panelIds: joint.panelIds.map((panelId) => selected.has(panelId) ? id : panelId) as [string, string] })).filter((joint) => joint.panelIds[0] !== joint.panelIds[1]),
  };
}

export function confirmModelLoadPaths(model: ProductModelPayload): ProductModelPayload {
  return { ...model, joints: model.joints.map((joint) => ({ ...joint, loadPathConfirmed: true })), validation: { ...model.validation, unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0 } };
}
