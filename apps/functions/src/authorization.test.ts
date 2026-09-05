import { describe, expect, it } from 'vitest';
import type { PermissionContext } from '@precast/domain';
import { AuthorizationError, authorizeApproval } from './authorization';

const artifact = {
  id: 'db-02', type: 'designBasis' as const, status: 'submitted', createdBy: 'engineer-1',
  snapshotHash: `sha256:${'a'.repeat(64)}`, isCurrentRevision: true, blockingConditions: [],
};
const context: PermissionContext = {
  userId: 'checker-1', orgId: 'org-a', projectId: 'project-a', roles: ['engineeringChecker'],
  capabilities: [], membershipStatus: 'active',
};

describe('authoritative approval boundary', () => {
  it('accepts a distinct active checker', () => {
    expect(() => authorizeApproval(context, artifact)).not.toThrow();
  });

  it('rejects self-approval server-side', () => {
    expect(() => authorizeApproval({ ...context, userId: 'engineer-1' }, artifact)).toThrow(AuthorizationError);
  });

  it('rejects unresolved blocking conditions', () => {
    expect(() => authorizeApproval(context, { ...artifact, blockingConditions: ['Unresolved NOT CHECKED'] })).toThrow('Blocking conditions');
  });
});

