import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { clientEnvironment, firebaseAuth } from '../firebase/client';
import { watchUserAccess, type AccessSnapshot } from '../data/accessRepository';
import { PilotWorkspace } from './PilotWorkspace';

export function StagingRehearsal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [actor, setActor] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let unwatch = () => {};
    let generation = 0;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unwatch(); setAccess(null); setError(''); setActor(user?.email ?? null);
      const current = ++generation;
      if (user) unwatch = watchUserAccess(clientEnvironment.orgId, user.uid, (snapshot) => {
        if (current === generation) setAccess(snapshot);
      }, () => { if (current === generation) { generation++; unwatch(); setAccess(null); setError('Membership read failed. Check pilot provisioning and access rules.'); } });
    });
    return () => { generation++; unsubscribe(); unwatch(); };
  }, []);
  async function login() {
    setBusy(true); setError('');
    try { await signInWithEmailAndPassword(firebaseAuth, email, password); }
    catch { setError('Sign-in failed. Check the assigned staging account.'); }
    finally { setPassword(''); setBusy(false); }
  }
  return <main className="standalone-state">
    <h1>Staging technical rehearsal</h1>
    <p>PILOT / NOT FOR PRODUCTION</p>
    <p>Firebase project: <code>{clientEnvironment.config.projectId}</code></p>
    <p>Organization: <code>{clientEnvironment.orgId}</code></p>
    <p>This read-only checkpoint verifies sign-in, effective memberships and current G0–G7 evidence references. Editing workflows, engineering acceptance and Revit QA remain separate M9 checkpoints.</p>
    {actor === null ? <form onSubmit={(event) => { event.preventDefault(); void login(); }}>
      <p><label>Email <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label></p>
      <p><label>Password <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label></p>
      <button disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in to Staging'}</button>
    </form> : <><p>Signed in: {actor}</p><button type="button" onClick={() => void signOut(firebaseAuth).catch(() => setError('Sign-out failed.'))}>Sign out</button>{access ? <PilotWorkspace access={access} /> : <p role="status">Checking membership…</p>}</>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
