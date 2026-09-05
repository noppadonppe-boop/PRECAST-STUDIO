import type { Gate, GateState } from './workflow';

export const projectRoles = [
  'projectManager',
  'bimCoordinator',
  'structuralEngineer',
  'engineeringChecker',
  'costEstimator',
  'detailer',
  'productionManager',
  'commercialApprover',
  'siteQa',
  'externalReviewer',
] as const;

export type ProjectRole = (typeof projectRoles)[number];
export type OrganizationRole = 'orgAdmin';

export const permissionActions = [
  'view',
  'comment',
  'create',
  'editDraft',
  'submit',
  'review',
  'approve',
  'release',
  'admin',
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export type ArtifactType =
  | 'sourceRevision'
  | 'designBasis'
  | 'productModel'
  | 'analysis'
  | 'estimate'
  | 'calculation'
  | 'drawingSet'
  | 'releasePackage';

export type ArtifactStatus = 'draft' | 'submitted' | 'approved' | 'accepted' | 'returned' | 'superseded';

export type ProjectStatus = 'active' | 'onHold' | 'completed' | 'archived';

export interface ProjectRecord {
  id: string;
  orgId: string;
  code: string;
  name: string;
  productFamilyId?: string;
  status: ProjectStatus;
  currentStage: string;
  currentSourceRevisionId?: string;
  currentDesignBasisVersionId?: string;
  currentModelVersionId?: string;
  gateStates: Partial<Record<Gate, GateState>>;
  assignedUserIds: string[];
  dueAt?: string;
  updatedAt?: string;
}

export interface SourceValidationSummary {
  unitValid: boolean;
  coordinateValid: boolean;
  levelsValid: boolean;
  objectIdentityValid: boolean;
  objectCount: number;
  duplicateGlobalIds: number;
}

export interface DesignBasisPayload {
  jurisdiction: string;
  designCode: string;
  designCodeEdition: string;
  loadingCode: string;
  loadingCodeEdition: string;
  units: 'kN-m-MPa';
  designLifeYears: number;
  riskCategory: string;
  concrete: { fc28Mpa: number; fcLiftMpa: number; densityKgM3: number; stiffnessMpa: number; durabilityClass: string; source: string };
  reinforcement: { fyMpa: number; source: string };
  handling: { liftingDynamicFactor: number; transportDynamicFactor: number; storageSupportRule: string; source: string };
  fireResistanceMinutes: number;
  inheritedFrom: string;
  overrideReasons: Record<string, string>;
}

export type ConstructionScenario = 'service' | 'demould' | 'lifting' | 'transport' | 'storage' | 'installation' | 'final';
export type RestrainedDof = 'UX' | 'UY' | 'UZ' | 'RX' | 'RY' | 'RZ';

export interface ProductModelPayload {
  schemaVersion: '1.0.0';
  units: 'kN-m-MPa';
  coordinateSystem: string;
  panels: Array<{
    id: string;
    mark: string;
    type: 'wall' | 'floor' | 'roof' | 'beam' | 'column';
    sourceObjectIds: string[];
    materialId: string;
    geometry: { widthM: number; heightM: number; thicknessM: number; offsetM: number };
    openings: Array<{ id: string; xM: number; yM: number; widthM: number; heightM: number }>;
    volumeM3: number;
    weightKn: number;
    cogM: { x: number; y: number; z: number };
  }>;
  joints: Array<{ id: string; panelIds: [string, string]; stiffnessKnM: number; loadPathConfirmed: boolean }>;
  anchors: Array<{ id: string; panelId: string; kind: 'lifting' | 'embedded'; positionM: { x: number; y: number; z: number }; capacityKn: number }>;
  supports: Array<{ id: string; panelId: string; scenario: ConstructionScenario; positionM: { x: number; y: number; z: number }; restrainedDofs: RestrainedDof[] }>;
  loadCases: Array<{ id: string; scenario: ConstructionScenario; type: 'dead' | 'live' | 'wind' | 'handling' | 'transport'; magnitude: number; unit: 'kN' | 'kN/m' | 'kN/m2' }>;
  loadCombinations: Array<{ id: string; factors: Record<string, number> }>;
  stages: ConstructionScenario[];
  validation: { unsupportedNodes: number; disconnectedElements: number; missingLoadPaths: number; geometryConflicts: number };
}

export interface EngineeringIssue {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  comment: string;
  status: 'open' | 'resolved' | 'acceptedException';
  createdBy: string;
  createdAt: string;
  dispositionReason?: string;
  responsibleUid?: string;
}

export interface ArtifactUpstreamRefs {
  sourceRevisionId?: string;
  designBasisVersionId?: string;
  modelVersionId?: string;
  analysisRunId?: string;
  drawingSetId?: string;
  estimateVersionId?: string;
}

export interface OrganizationMembership {
  uid: string;
  orgId: string;
  orgRoles: OrganizationRole[];
  status: 'invited' | 'active' | 'suspended';
}

export interface ProjectMembership {
  uid: string;
  orgId: string;
  projectId: string;
  roles: ProjectRole[];
  capabilities: string[];
  status: 'active' | 'suspended';
  effectiveFrom: string;
  expiresAt?: string;
}

export interface PermissionContext {
  userId: string;
  orgId: string;
  projectId: string;
  roles: ProjectRole[];
  capabilities: string[];
  membershipStatus: ProjectMembership['status'];
  expiresAt?: string;
  artifactStatus?: string;
  artifactCreatedBy?: string;
  isCurrentRevision?: boolean;
}

export interface ApprovalRequest {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  snapshotHash: string;
  requestedAction: 'review' | 'approve' | 'issue' | 'release';
  requiredRole: ProjectRole;
  assignedTo?: string;
  status: 'open' | 'inReview' | 'approved' | 'returned' | 'cancelled' | 'superseded';
  requestedBy: string;
  requestedAt: string;
  dueAt?: string;
  blockingConditions: string[];
}

export interface ApprovalSnapshot {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  createdBy: string;
  snapshotHash: string;
  upstreamRefs: ArtifactUpstreamRefs;
  payload: Record<string, unknown>;
  capturedAt: string;
  capturedBy: string;
}

export interface CommandReceipt {
  idempotencyKey: string;
  commandName: 'createProject' | 'updateProject' | 'archiveProject' | 'createDesignBasisRevision' | 'createProductModelRevision' | 'submitArtifact' | 'approveArtifact' | 'returnArtifact' | 'freezeSourceRevision';
  actorUid: string;
  resourceId: string;
  resultState: string;
  auditEventId: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  action: PermissionAction | 'return' | 'issue' | 'freeze' | 'archive' | 'supersede';
  stateBefore: string;
  stateAfter: string;
  actorUid: string;
  effectiveRoles: ProjectRole[];
  delegatedCapabilities: string[];
  occurredAt: string;
  requestId: string;
  idempotencyKey: string;
  snapshotHash: string;
  comment?: string;
}
