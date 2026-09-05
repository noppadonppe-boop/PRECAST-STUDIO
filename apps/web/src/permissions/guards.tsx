import { cloneElement, isValidElement, type PropsWithChildren, type ReactElement } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { can, type ArtifactType, type PermissionAction, type PermissionContext } from '@precast/domain';
import { useAuth } from '../auth/AuthContext';

export function RequireOrganizationMembership({ children }: PropsWithChildren) {
  const { orgId } = useParams();
  const { organizationMembership } = useAuth();
  const active = organizationMembership.orgId === orgId && organizationMembership.status === 'active';
  return active ? children : <Navigate to="/forbidden" replace />;
}

export function RequireProjectMembership({ children }: PropsWithChildren) {
  const { orgId, projectId } = useParams();
  const { projectMemberships } = useAuth();
  const membership = projectMemberships.find((item) => item.orgId === orgId && item.projectId === projectId);
  const active = membership?.status === 'active' && (membership.expiresAt === undefined || new Date(membership.expiresAt) > new Date());
  return active ? children : <Navigate to="/forbidden" replace />;
}

export function Can({
  action,
  resource,
  context,
  children,
  hidden = false,
}: PropsWithChildren<{ action: PermissionAction; resource: ArtifactType | 'project' | 'team' | 'audit'; context: PermissionContext; hidden?: boolean }>) {
  const decision = can(action, resource, context);
  if (decision.allowed) return children;
  if (hidden) return null;
  const disabledChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ disabled?: boolean; 'aria-disabled'?: boolean }>, { disabled: true, 'aria-disabled': true })
    : children;
  return <span className="permission-denied" title={decision.reason}>{disabledChild}<small>{decision.reason}</small></span>;
}
