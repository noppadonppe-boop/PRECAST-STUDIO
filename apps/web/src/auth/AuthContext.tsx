import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeSharedWorkspace } from '../data/sharedRepository';
import type { OrganizationMembership, ProjectMembership } from '@precast/domain';
import { currentUser, organizationMembership, projectMemberships } from '../fixtures/workspace';
import { connectLocalEmulators, dataMode, firebaseAuth, localEmulatorIdentities } from '../firebase/client';
import { watchUserAccess } from '../data/accessRepository';

interface AuthState {
  user: { uid: string; name: string; initials: string; email: string };
  organizationMembership: OrganizationMembership;
  projectMemberships: ProjectMembership[];
  accessRevision: string;
  mode: 'fixture' | 'emulator' | 'shared';
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState | null>(dataMode === 'fixture' ? {
    user: currentUser, organizationMembership, projectMemberships, accessRevision: 'fixture-v1', mode: 'fixture',
  } : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataMode === 'shared') {
      let active = true;
      const timeout = window.setTimeout(() => { if (active) setError('การเชื่อมต่อ Firebase ใช้เวลานาน กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'); }, 20000);
      const stop = onAuthStateChanged(firebaseAuth, (user) => {
        if (!user) { void signInAnonymously(firebaseAuth).catch((reason: Error) => { if (active) setError(reason.message); }); return; }
        void initializeSharedWorkspace().then(() => {
          if (!active) return;
          window.clearTimeout(timeout); setError(null);
          const name = user.displayName || (user.isAnonymous ? 'ผู้ใช้ทั่วไป' : user.email) || 'สมาชิก';
          setState({ user: { uid: user.uid, name, initials: name.slice(0, 2), email: user.email ?? '' }, organizationMembership: { uid: user.uid, orgId: 'precast-studio', orgRoles: [], status: 'active' }, projectMemberships: [], accessRevision: 'shared-v1', mode: 'shared' });
        }).catch((reason: Error) => { if (active) setError(reason.message); });
      }, (reason) => { if (active) setError(reason.message); });
      return () => { active = false; window.clearTimeout(timeout); stop(); };
    }
    if (dataMode !== 'emulator') return;
    connectLocalEmulators();
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;
    const requestedIdentity = new URLSearchParams(window.location.search).get('as');
    const identity = requestedIdentity === 'engineer' ? localEmulatorIdentities.engineer
      : requestedIdentity === 'bim' ? localEmulatorIdentities.bim
        : requestedIdentity === 'pm' ? localEmulatorIdentities.pm
          : requestedIdentity === 'qs' ? localEmulatorIdentities.qs
            : requestedIdentity === 'detailer' ? localEmulatorIdentities.detailer
              : requestedIdentity === 'production' ? localEmulatorIdentities.production
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

  if (error !== null) return <main className="standalone-state" role="alert"><span>!</span><h1>{dataMode === 'shared' ? 'เชื่อมต่อ Firebase ไม่สำเร็จ' : 'Local emulator sign-in failed'}</h1><p>{error}</p><button onClick={() => window.location.reload()}>ลองเชื่อมต่อใหม่</button></main>;
  if (state === null) return <main className="standalone-state"><span>…</span><h1>{dataMode === 'shared' ? 'กำลังเชื่อมต่อ Firebase' : 'Signing in to local emulators'}</h1><p>{dataMode === 'shared' ? 'กำลังเปิดพื้นที่ข้อมูลร่วม Precast Studio' : 'No production credentials are used.'}</p></main>;
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
