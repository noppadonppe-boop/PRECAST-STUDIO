import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '@precast/domain';
import type { AccessSnapshot } from '../data/accessRepository';
import type { watchProjects } from '../data/workflowRepository';
import type { watchPilotEvidence } from '../data/pilotRepository';
const mocks = vi.hoisted(() => ({ projects: vi.fn<typeof watchProjects>(), evidence: vi.fn<typeof watchPilotEvidence>(), stop: vi.fn() }));
vi.mock('../data/workflowRepository', () => ({ watchProjects: mocks.projects }));
vi.mock('../data/pilotRepository', async (original) => ({ ...await original<object>(), watchPilotEvidence: mocks.evidence }));
vi.mock('../firebase/client', () => ({ firestore: {} }));
import { PilotWorkspace } from './PilotWorkspace';

const access: AccessSnapshot = { organizationMembership: { uid: 'pilot-user', orgId: 'new-org', status: 'active', orgRoles: [] }, projectMemberships: ['new-alpha', 'new-beta'].map((projectId) => ({ uid: 'pilot-user', orgId: 'new-org', projectId, roles: ['bimCoordinator'], capabilities: [], status: 'active', effectiveFrom: '2020-01-01T00:00:00Z' })), revision: 'test' };
const projects: ProjectRecord[] = ['new-alpha', 'new-beta'].map((id) => ({ id, orgId: 'new-org', code: id, name: id, status: 'active', currentStage: 'intake', gateStates: { G0: 'notStarted', G4: 'outOfDate' }, assignedUserIds: ['pilot-user'], currentSourceRevisionId: `source-${id}` }));
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

it('selects real project references, clears old evidence and removes subscriptions after revocation', () => {
  mocks.projects.mockImplementation((_org, _ids, callback) => { callback(projects); return mocks.stop; });
  mocks.evidence.mockImplementation((project, callback) => { callback({ G0: { id: project.currentSourceRevisionId ?? '', revision: project.id, status: 'draft', hash: 'not recorded', scanState: 'quarantined', blockers: ['Scan pending'] } }); return mocks.stop; });
  const view = render(<PilotWorkspace access={access} />);
  expect(mocks.projects).toHaveBeenCalledWith('new-org', ['new-alpha', 'new-beta'], expect.any(Function), expect.any(Function));
  expect(screen.getByText('source-new-alpha')).toBeVisible();
  expect(screen.getByText('Scan: quarantined')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Pilot project'), { target: { value: 'new-beta' } });
  expect(screen.getByText('source-new-beta')).toBeVisible();
  expect(screen.queryByText('source-new-alpha')).not.toBeInTheDocument();
  expect(screen.getAllByText('No linked evidence')).toHaveLength(7);
  expect(screen.queryByRole('button', { name: /release/i })).not.toBeInTheDocument();
  view.rerender(<PilotWorkspace access={{ ...access, organizationMembership: { ...access.organizationMembership, status: 'suspended' } }} />);
  expect(screen.getByText(/No effective Pilot/)).toBeVisible();
  expect(screen.queryByText('source-new-beta')).not.toBeInTheDocument();
  expect(mocks.stop).toHaveBeenCalled();
});

it('fails closed on a project read error and rejects future, expired and malformed memberships', () => {
  mocks.projects.mockImplementation((_org, _ids, _value, error) => { error(new Error('denied')); return mocks.stop; });
  const view = render(<PilotWorkspace access={access} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Project read failed');
  const invalid = access.projectMemberships.map((member) => ({ ...member, effectiveFrom: 'invalid' }));
  view.rerender(<PilotWorkspace access={{ ...access, projectMemberships: invalid }} />);
  expect(screen.getByText(/No effective Pilot/)).toBeVisible();
  view.rerender(<PilotWorkspace access={{ ...access, projectMemberships: invalid.map((member) => ({ ...member, effectiveFrom: '2099-01-01T00:00:00Z' })) }} />);
  expect(screen.getByText(/No effective Pilot/)).toBeVisible();
});

it('unmounts evidence when effective membership expires without a new server event', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-05T00:00:00Z'));
  mocks.projects.mockImplementation((_org, _ids, callback) => { callback(projects); return mocks.stop; });
  mocks.evidence.mockImplementation(() => mocks.stop);
  render(<PilotWorkspace access={{ ...access, projectMemberships: access.projectMemberships.map((member) => ({ ...member, expiresAt: '2026-09-05T00:00:01Z' })) }} />);
  expect(screen.getByLabelText('Pilot project')).toBeVisible();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByText(/No effective Pilot/)).toBeVisible();
  expect(screen.queryByLabelText('Pilot project')).not.toBeInTheDocument();
});
