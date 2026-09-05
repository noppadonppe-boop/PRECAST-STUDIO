import { describe, expect, it } from 'vitest';
import { can } from './permissions';
import type { PermissionContext } from './types';

const checker: PermissionContext = {
  userId: 'checker-1', orgId: 'org-a', projectId: 'project-a', roles: ['engineeringChecker'], capabilities: [],
  membershipStatus: 'active', artifactStatus: 'submitted', artifactCreatedBy: 'engineer-1', isCurrentRevision: true,
};

describe('Role Matrix v1 permission evaluator', () => {
  it('allows an independent checker to approve a submitted Design Basis', () => {
    expect(can('approve', 'designBasis', checker).allowed).toBe(true);
  });

  it('denies creator self-approval regardless of checker role', () => {
    expect(can('approve', 'designBasis', { ...checker, userId: 'engineer-1' })).toEqual({
      allowed: false,
      reason: 'Separation of Duties prevents self-approval.',
    });
  });

  it('denies expired membership', () => {
    expect(can('view', 'project', { ...checker, expiresAt: '2020-01-01T00:00:00.000Z' }).allowed).toBe(false);
  });
});

