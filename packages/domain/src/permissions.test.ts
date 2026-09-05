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

  it('allows engineer authoring and an independent checker to approve Product Models', () => {
    expect(can('create', 'productModel', { ...checker, roles: ['structuralEngineer'] }).allowed).toBe(true);
    expect(can('approve', 'productModel', checker).allowed).toBe(true);
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

  it('requires explicit commercialApprove capability when a Project Manager approves an estimate', () => {
    expect(can('approve', 'estimate', { ...checker, roles: ['projectManager'], capabilities: [] }).allowed).toBe(false);
    expect(can('approve', 'estimate', { ...checker, roles: ['projectManager'], capabilities: ['commercialApprove'] }).allowed).toBe(true);
  });

  it.each([
    ['projectManager', 'create', 'project', true],
    ['bimCoordinator', 'submit', 'sourceRevision', true],
    ['structuralEngineer', 'submit', 'designBasis', true],
    ['engineeringChecker', 'approve', 'analysis', true],
    ['costEstimator', 'submit', 'estimate', true],
    ['detailer', 'submit', 'drawingSet', true],
    ['productionManager', 'release', 'releasePackage', true],
    ['commercialApprover', 'approve', 'estimate', true],
    ['siteQa', 'comment', 'releasePackage', true],
    ['externalReviewer', 'view', 'calculation', true],
  ] as const)('provides an explicit decision for %s', (role, action, resource, expected) => {
    expect(can(action, resource, { ...checker, roles: [role], capabilities: role === 'productionManager' ? ['productionRelease'] : [] }).allowed).toBe(expected);
  });
});
