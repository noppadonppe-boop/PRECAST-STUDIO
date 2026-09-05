import { can, type ArtifactType, type PermissionContext } from '@precast/domain';

export interface AuthoritativeArtifact {
  id: string;
  type: ArtifactType;
  status: string;
  createdBy: string;
  snapshotHash: string;
  isCurrentRevision: boolean;
  blockingConditions: string[];
}

export class AuthorizationError extends Error {
  constructor(message: string, readonly code: 'permission-denied' | 'failed-precondition') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function authorizeApproval(context: PermissionContext, artifact: AuthoritativeArtifact): void {
  const decision = can('approve', artifact.type, {
    ...context,
    artifactCreatedBy: artifact.createdBy,
    artifactStatus: artifact.status,
    isCurrentRevision: artifact.isCurrentRevision,
  });
  if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Approval denied.', 'permission-denied');
  if (artifact.status !== 'submitted') throw new AuthorizationError('Artifact is not submitted for approval.', 'failed-precondition');
  if (artifact.blockingConditions.length > 0) throw new AuthorizationError('Blocking conditions must be resolved before approval.', 'failed-precondition');
}

