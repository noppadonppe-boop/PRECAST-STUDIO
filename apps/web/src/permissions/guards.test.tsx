import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PermissionContext } from '@precast/domain';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { Can, RequireProjectMembership } from './guards';

describe('permission boundaries', () => {
  it('renders a permitted project route for an active member', () => {
    render(<MemoryRouter initialEntries={['/org/org-siam/projects/p-rama9']}><AuthProvider><Routes><Route path="/org/:orgId/projects/:projectId" element={<RequireProjectMembership><div>Project content</div></RequireProjectMembership>} /><Route path="/forbidden" element={<div>Forbidden</div>} /></Routes></AuthProvider></MemoryRouter>);
    expect(screen.getByText('Project content')).toBeInTheDocument();
  });

  it('redirects a non-member project route to forbidden', () => {
    render(<MemoryRouter initialEntries={['/org/org-siam/projects/p-secret']}><AuthProvider><Routes><Route path="/org/:orgId/projects/:projectId" element={<RequireProjectMembership><div>Project content</div></RequireProjectMembership>} /><Route path="/forbidden" element={<div>Forbidden</div>} /></Routes></AuthProvider></MemoryRouter>);
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Project content')).not.toBeInTheDocument();
  });

  it('disables self-approval with a visible reason', () => {
    const context: PermissionContext = {
      userId: 'engineer-1', orgId: 'org-a', projectId: 'project-a', roles: ['engineeringChecker'], capabilities: [],
      membershipStatus: 'active', artifactStatus: 'submitted', artifactCreatedBy: 'engineer-1', isCurrentRevision: true,
    };
    render(<Can action="approve" resource="designBasis" context={context}><button type="button">Approve</button></Can>);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByText('Separation of Duties prevents self-approval.')).toBeVisible();
  });
});
