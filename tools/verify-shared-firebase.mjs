import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { initializeApp, deleteApp } = await import(pathToFileURL(require.resolve('firebase/app')));
const { getAuth, signInAnonymously, deleteUser } = await import(pathToFileURL(require.resolve('firebase/auth')));
const { getFirestore, doc, getDocFromServer, runTransaction, setDoc, deleteDoc, terminate } = await import(pathToFileURL(require.resolve('firebase/firestore')));
const config = Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'].map((key) => [key.toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase()), process.env[`VITE_FIREBASE_${key}`]]));
if (config.projectId !== 'precast-studio') throw new Error('This verification only targets precast-studio.');
const apps = [initializeApp(config, 'verify-writer'), initializeApp(config, 'verify-reader')];
const databases = apps.map((app) => getFirestore(app));
const users = [];
const id = `connection-${Date.now()}`;
const path = `PRECAST MODULE/root/settings/${id}`;
let probeCreated = false;
try {
  for (const app of apps) users.push((await signInAnonymously(getAuth(app))).user);
  const root = doc(databases[0], 'PRECAST MODULE/root');
  await runTransaction(databases[0], async (tx) => {
    if (!(await tx.get(root)).exists()) tx.set(root, { name: 'PRECAST MODULE', schemaVersion: 1, categories: ['projects', 'intake', 'criteria', 'panel', 'loads', 'analysis', 'design', 'cost', 'report', 'shop', 'release', 'review', 'team', 'audit', 'libraries', 'settings'], createdAt: new Date().toISOString() });
  });
  const ref = doc(databases[0], path);
  await setDoc(ref, { data: { purpose: 'Firebase connection verification', value: id }, revision: 1, updatedAt: new Date().toISOString(), updatedBy: users[0].uid }); probeCreated = true;
  const read = await getDocFromServer(doc(databases[1], path));
  if (read.data()?.data.value !== id) throw new Error('Second anonymous user could not read the same data.');
  await setDoc(doc(databases[1], path), { data: { purpose: 'Firebase connection verification', value: `${id}-updated` }, revision: 2, updatedAt: new Date().toISOString(), updatedBy: users[1].uid });
  const reread = await getDocFromServer(ref);
  if (reread.data()?.data.value !== `${id}-updated`) throw new Error('First user did not read the second user update.');
  console.log(JSON.stringify({ project: config.projectId, root: (await getDocFromServer(root)).ref.path, anonymousUsers: 2, crossUserReadWrite: 'passed', category: 'settings' }));
} finally {
  if (probeCreated) {
    try { await deleteDoc(doc(databases[0], path)); }
    catch (reason) { console.warn(`Cleanup skipped by deployed no-delete rules: ${reason instanceof Error ? reason.message : String(reason)}`); }
  }
  for (const user of users) await deleteUser(user);
  for (const db of databases) await terminate(db);
  for (const app of apps) await deleteApp(app);
}
