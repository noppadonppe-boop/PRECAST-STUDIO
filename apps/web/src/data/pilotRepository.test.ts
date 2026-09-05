import { afterEach, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '@precast/domain';
type Snapshot = { data: () => Record<string, unknown> | undefined };
const mocks = vi.hoisted(() => ({ doc: vi.fn((_db: unknown, path: string) => path), snapshot: vi.fn<(path: string, value: (snapshot: Snapshot) => void, error: (error: Error) => void) => () => void>(), stop: vi.fn() }));
vi.mock('firebase/firestore', () => ({ doc: mocks.doc, onSnapshot: mocks.snapshot }));
vi.mock('../firebase/client', () => ({ firestore: {} }));
import { watchPilotEvidence } from './pilotRepository';
const project: ProjectRecord = { id: 'pilot-a', orgId: 'pilot-org', code: 'PILOT-A', name: 'Pilot A', status: 'active', currentStage: 'intake', gateStates: {}, assignedUserIds: [], currentSourceRevisionId: 'uploaded-a', currentDrawingSetId: 'drawing-a' };
afterEach(() => vi.clearAllMocks());

it('follows exact project links, preserves missing evidence and suppresses late callbacks after unmount', () => {
  mocks.snapshot.mockReturnValue(mocks.stop);
  const value = vi.fn(); const error = vi.fn();
  const stop = watchPilotEvidence(project, value, error);
  expect(mocks.doc.mock.calls.map((call) => call[1])).toEqual(['organizations/pilot-org/projects/pilot-a/sourceRevisions/uploaded-a', 'organizations/pilot-org/projects/pilot-a/drawingSets/drawing-a']);
  mocks.snapshot.mock.calls[0]![1]({ data: () => ({ status: 'draft', revision: 'SRC-new', scanState: 'quarantined', blockingConditions: ['Pending', 12] }) });
  expect(value).toHaveBeenLastCalledWith({ G0: { id: 'uploaded-a', status: 'draft', revision: 'SRC-new', hash: 'not recorded', scanState: 'quarantined', blockers: ['Pending'] } });
  mocks.snapshot.mock.calls[1]![1]({ data: () => undefined });
  expect(value.mock.lastCall?.[0]).toHaveProperty('G6', null);
  stop(); value.mockClear();
  mocks.snapshot.mock.calls[0]![1]({ data: () => ({ status: 'approved' }) });
  mocks.snapshot.mock.calls[0]![2](new Error('late'));
  expect(value).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled(); expect(mocks.stop).toHaveBeenCalledTimes(2);
});

it('rejects path injection before opening any evidence subscription', () => {
  const error = vi.fn(); watchPilotEvidence({ ...project, currentSourceRevisionId: '../another/document' }, vi.fn(), error);
  expect(error).toHaveBeenCalled(); expect(mocks.snapshot).not.toHaveBeenCalled();
});
