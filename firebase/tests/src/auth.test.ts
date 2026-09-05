import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { describe, expect, it } from 'vitest';

describe('Firebase Auth emulator', () => {
  it('creates and signs in a local-only user', async () => {
    const id = randomUUID();
    const app = initializeApp({ apiKey: 'demo', projectId: 'demo-precast-m0' }, id);
    const auth = getAuth(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const email = `m1-${id}@precast.local`;
    await createUserWithEmailAndPassword(auth, email, 'local-emulator-only');
    await signOut(auth);
    const credential = await signInWithEmailAndPassword(auth, email, 'local-emulator-only');
    expect(credential.user.email).toBe(email);
    await deleteApp(app);
  });
});

