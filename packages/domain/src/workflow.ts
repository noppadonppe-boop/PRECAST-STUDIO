export const projectStages = [
  'intake',
  'designBasis',
  'panelization',
  'loads',
  'analysis',
  'design',
  'estimate',
  'calculation',
  'drawingExport',
  'productionRelease',
] as const;

export type ProjectStage = (typeof projectStages)[number];

export const gates = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'] as const;
export type Gate = (typeof gates)[number];

export type GateState =
  | 'notStarted'
  | 'inProgress'
  | 'needsAttention'
  | 'readyForReview'
  | 'approved'
  | 'outOfDate'
  | 'superseded';

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'notChecked';

export const gateLabels: Record<Gate, string> = {
  G0: 'BIM accepted',
  G1: 'Design Basis approved',
  G2: 'Analytical model ready',
  G3: 'Analysis verified',
  G4: 'Design approved',
  G5: 'Estimate reviewed',
  G6: 'Drawing ready',
  G7: 'Production released',
};

