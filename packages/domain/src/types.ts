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
  | 'analysis'
  | 'estimate'
  | 'calculation'
  | 'drawingSet'
  | 'releasePackage';

export type ArtifactStatus = 'draft' | 'submitted' | 'approved' | 'returned' | 'superseded';

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
  commandName: 'createProject' | 'submitArtifact' | 'approveArtifact' | 'returnArtifact';
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
  action: PermissionAction | 'return' | 'issue';
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
