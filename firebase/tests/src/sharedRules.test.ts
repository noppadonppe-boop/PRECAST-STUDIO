import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let environment: RulesTestEnvironment;
beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-precast-shared', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(new URL('../../shared.firestore.rules', import.meta.url), 'utf8') } });
});
afterAll(async () => { await environment?.cleanup(); });
describe('shared workspace rules', () => {
  it('lets anonymous and registered users read and update the same category document', async () => {
    const guest = environment.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    const member = environment.authenticatedContext('member').firestore();
    const path = 'precast-studio/root/cost/project-one';
    const data = { data: { rate: 3450 }, revision: 1, updatedAt: new Date().toISOString(), updatedBy: 'guest' };
    await assertSucceeds(setDoc(doc(guest, path), data));
    await assertSucceeds(getDoc(doc(member, path)));
    await assertSucceeds(setDoc(doc(member, path), { ...data, data: { rate: 4000 }, revision: 2, updatedBy: 'member' }));
    await assertSucceeds(getDoc(doc(guest, path)));
    await assertFails(setDoc(doc(guest, path), { ...data, revision: 2 }));
  });
  it('rejects unauthenticated access, forged actors, unrelated paths and audit rewrites', async () => {
    const guest = environment.authenticatedContext('guest').firestore();
    const publicDb = environment.unauthenticatedContext().firestore();
    const data = { data: { notes: 'draft' }, revision: 1, updatedAt: new Date().toISOString(), updatedBy: 'guest' };
    await assertFails(getDoc(doc(publicDb, 'precast-studio/root/cost/project-one')));
    await assertFails(setDoc(doc(guest, 'users/guest/notes/draft'), data));
    await assertFails(setDoc(doc(guest, 'precast-studio/root/unknown/draft'), data));
    await assertFails(setDoc(doc(guest, 'precast-studio/root/settings/draft'), { ...data, updatedBy: 'another-user' }));
    await assertSucceeds(setDoc(doc(guest, 'precast-studio/root/audit/event'), data));
    await assertFails(setDoc(doc(guest, 'precast-studio/root/audit/event'), { ...data, revision: 2 }));
  });
});
