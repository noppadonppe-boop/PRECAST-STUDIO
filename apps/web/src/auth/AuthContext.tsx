import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import type { OrganizationMembership, ProjectMembership } from '@precast/domain';
import { currentUser, organizationMembership, projectMemberships } from '../fixtures/workspace';
import { connectLocalEmulators, dataMode, firebaseAuth, localEmulatorIdentities } from '../firebase/client';
import { watchUserAccess } from '../data/accessRepository';

interface AuthState {
  user: { uid: string; name: string; initials: string; email: string };
  organizationMembership: OrganizationMembership;
  projectMemberships: ProjectMembership[];
  accessRevision: string;
  mode: 'fixture' | 'emulator';
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState | null>(dataMode === 'fixture' ? {
    user: currentUser, organizationMembership, projectMemberships, accessRevision: 'fixture-v1', mode: 'fixture',
  } : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataMode !== 'emulator') return;
    connectLocalEmulators();
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;
    const requestedIdentity = new URLSearchParams(window.location.search).get('as');
    const identity = requestedIdentity === 'engineer' ? localEmulatorIdentities.engineer
      : requestedIdentity === 'bim' ? localEmulatorIdentities.bim
        : requestedIdentity === 'pm' ? localEmulatorIdentities.pm
          : localEmulatorIdentities.checker;
    const { email, password, orgId } = identity;
    void signInWithEmailAndPassword(firebaseAuth, email, password).then(({ user }) => {
      if (cancelled) return;
      unsubscribe = watchUserAccess(orgId, user.uid, (access) => {
        const displayName = user.displayName || user.email?.split('@')[0] || user.uid;
        setState({
          user: { uid: user.uid, name: displayName, initials: displayName.slice(0, 2).toUpperCase(), email: user.email ?? email },
          organizationMembership: access.organizationMembership,
          projectMemberships: access.projectMemberships,
          accessRevision: access.revision,
          mode: 'emulator',
        });
      }, (reason) => setError(reason.message));
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Emulator sign-in failed.'));
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  if (error !== null) return <main className="standalone-state"><span>!</span><h1>Local emulator sign-in failed</h1><p>{error}</p><p>Run the emulators and seed command, or set VITE_DATA_MODE=fixture.</p></main>;
  if (state === null) return <main className="standalone-state"><span>…</span><h1>Signing in to local emulators</h1><p>No production credentials are used.</p></main>;
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
