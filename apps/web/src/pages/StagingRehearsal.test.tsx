import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
const signIn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => { callback(null); return () => {}; }, signInWithEmailAndPassword: signIn, signOut: vi.fn() }));
vi.mock('../firebase/client', () => ({ clientEnvironment: { config: { projectId: 'pilot-staging-test' }, orgId: 'pilot-org' }, firebaseAuth: {} }));
vi.mock('../data/accessRepository', () => ({ watchUserAccess: vi.fn() }));
vi.mock('./PilotWorkspace', () => ({ PilotWorkspace: () => <p>Pilot workspace</p> }));
import { StagingRehearsal } from './StagingRehearsal';

it('requires real credentials despite an emulator identity query and clears the password', async () => {
  window.history.replaceState({}, '', '/?as=production');
  render(<StagingRehearsal />);
  expect(screen.getByText('pilot-staging-test')).toBeVisible();
  expect(signIn).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pilot@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-only-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in to Staging' }));
  await waitFor(() => expect(signIn).toHaveBeenCalledWith({}, 'pilot@example.test', 'test-only-password'));
  await waitFor(() => expect(screen.getByLabelText('Password')).toHaveValue(''));
  expect(screen.queryByRole('button', { name: 'Release to Production' })).not.toBeInTheDocument();
});
