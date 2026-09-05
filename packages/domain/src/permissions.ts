import type { ArtifactType, PermissionAction, PermissionContext, ProjectRole } from './types';

type Resource = ArtifactType | 'project' | 'team' | 'audit';
type Grant = `${PermissionAction}:${Resource | '*'}`;

const grants: Record<ProjectRole, readonly Grant[]> = {
  projectManager: ['view:*', 'create:project', 'editDraft:project', 'view:team', 'comment:*'],
  bimCoordinator: ['view:*', 'create:sourceRevision', 'editDraft:sourceRevision', 'submit:sourceRevision', 'review:productModel', 'comment:*'],
  structuralEngineer: [
    'view:*', 'comment:*', 'create:designBasis', 'editDraft:designBasis', 'submit:designBasis',
    'create:productModel', 'editDraft:productModel', 'submit:productModel',
    'create:loadModel', 'editDraft:loadModel', 'submit:loadModel',
    'review:sourceRevision', 'approve:sourceRevision', 'create:analysis', 'editDraft:analysis', 'submit:analysis',
    'create:calculation', 'editDraft:calculation', 'submit:calculation', 'review:estimate', 'review:drawingSet',
  ],
  engineeringChecker: ['view:*', 'comment:*', 'review:designBasis', 'approve:designBasis', 'review:productModel', 'approve:productModel', 'review:analysis', 'approve:analysis', 'review:calculation', 'approve:calculation', 'review:drawingSet', 'approve:drawingSet', 'review:releasePackage', 'approve:releasePackage'],
  costEstimator: ['view:*', 'comment:*', 'create:estimate', 'editDraft:estimate', 'submit:estimate'],
  detailer: ['view:*', 'comment:*', 'create:drawingSet', 'editDraft:drawingSet', 'submit:drawingSet'],
  productionManager: ['view:releasePackage', 'release:releasePackage'],
  commercialApprover: ['view:estimate', 'review:estimate', 'approve:estimate'],
  siteQa: ['view:releasePackage', 'comment:releasePackage'],
  externalReviewer: ['view:calculation', 'view:drawingSet', 'comment:calculation', 'comment:drawingSet'],
};

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
}

export function isMembershipActive(context: PermissionContext, at = new Date()): boolean {
  if (context.membershipStatus !== 'active') return false;
  return context.expiresAt === undefined || new Date(context.expiresAt).getTime() > at.getTime();
}

export function can(
  action: PermissionAction,
  resource: Resource,
  context: PermissionContext,
  at = new Date(),
): PermissionDecision {
  if (!isMembershipActive(context, at)) return { allowed: false, reason: 'Project membership is inactive or expired.' };
  if (context.isCurrentRevision === false && ['editDraft', 'submit', 'approve', 'release'].includes(action)) {
    return { allowed: false, reason: 'Only the current revision can transition.' };
  }
  if (action === 'editDraft' && context.artifactStatus !== undefined && context.artifactStatus !== 'draft') {
    return { allowed: false, reason: 'Approved or submitted content is immutable; create a new revision.' };
  }
  if (action === 'approve' && context.artifactCreatedBy === context.userId) {
    return { allowed: false, reason: 'Separation of Duties prevents self-approval.' };
  }
  if (action === 'release' && resource === 'releasePackage' && !context.capabilities.includes('productionRelease') && !context.roles.includes('productionManager')) {
    return { allowed: false, reason: 'Explicit production release capability is required.' };
  }
  const requested: Grant[] = [`${action}:${resource}`, `${action}:*`];
  const roleAllows = context.roles.some((role) => grants[role].some((grant) => requested.includes(grant)));
  const delegated = context.capabilities.includes(`${action}:${resource}`)
    || (action === 'approve' && resource === 'estimate' && context.roles.includes('projectManager') && context.capabilities.includes('commercialApprove'));
  return roleAllows || delegated ? { allowed: true } : { allowed: false, reason: 'Your project roles do not grant this action.' };
}
