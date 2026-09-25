// Retained sample only. Never approve gates or replace existing projects.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { initializeApp, deleteApp } = await import(pathToFileURL(require.resolve('firebase/app')));
const { getAuth, signInAnonymously } = await import(pathToFileURL(require.resolve('firebase/auth')));
const { getFirestore, doc, collection, getDocsFromServer, getDocFromServer, runTransaction, terminate } = await import(pathToFileURL(require.resolve('firebase/firestore')));
const config = Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'].map((key) => [key.toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase()), process.env[`VITE_FIREBASE_${key}`]]));
if (config.projectId !== 'precast-studio') throw new Error('Only the existing shared draft workspace precast-studio is allowed.');
const bytes = await readFile(new URL('../../samples/test-module/sample.json', import.meta.url));
const sample = JSON.parse(bytes);
const canonical = (value) => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const datasetSha256 = createHash('sha256').update(canonical(sample)).digest('hex');
const app = initializeApp(config, 'retained-test-module');
const db = getFirestore(app);
const base = 'PRECAST MODULE/root';
const id = sample.id;
if (id !== 'p-test-module' || sample.release.canRelease !== false) throw new Error('Invalid test sample identity or release state.');
try {
  const user = (await signInAnonymously(getAuth(app))).user;
  const projects = await getDocsFromServer(collection(db, `${base}/projects`));
  if (projects.docs.some((p) => p.id !== id && p.data().data?.name?.trim().toLowerCase() === 'test module')) throw new Error('A Test Module project already exists with another id; refusing to create a duplicate.');
  const project = { id, code: 'TM-001', name: 'Test Module', family: 'Precast RC module · TEST ONLY', exampleProfileId: 'test-module-v1', gate: 'G0', gateState: 'needsAttention', gateStates: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`G${i}`, 'needsAttention'])), sourceRevision: 'TM-SRC-R1', designBasisRevision: 'TM-DB-R1 · draft', modelRevision: 'TM-IFC-R1', analysisRevision: 'TM-BENCH-R1 · benchmark', engineer: 'บทบาท Engineer ทดสอบ · ไม่มีการลงนาม', checker: 'รอผู้ตรวจอิสระสำหรับงานจริง', due: 'โครงการตัวอย่างคงไว้', updated: new Date().toISOString().slice(0, 10), issues: sample.issues.length, assignees: [] };
  const records = [
    ['projects', id, project], ['intake', `${id}-sample`, sample], ['criteria', `${id}-design-basis`, sample.criteria],
    ['panel', `${id}-register`, sample.model.elements], ['loads', `${id}-register`, { values: sample.criteria.values, panels: sample.panels }],
    ['analysis', `${id}-register`, sample.analysis], ['design', `${id}-register`, { status: 'NOT_CHECKED', trial: sample.criteria.values.prestress, issues: sample.issues }],
    ['cost', `${id}-register`, sample.cost], ['report', `${id}-register`, { url: '/samples/test-module/Test-Module-Report.html', status: 'TEST_ONLY', datasetSha256 }],
    ['shop', `${id}-register`, { unit: 'mm', panels: sample.model.elements.map((e) => e.id), nativeRevitStatus: sample.source.nativeRevitStatus, status: 'GEOMETRY_ONLY' }],
    ['release', `${id}-register`, sample.release], ['review', `${id}-test-sequence`, { stages: sample.stages, issues: sample.issues, datasetSha256 }],
  ];
  const outcome = await runTransaction(db, async (tx) => {
    const refs = records.map(([category, key]) => doc(db, `${base}/${category}/${key}`));
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (snapshots.some((s) => s.exists())) {
      const oldHash = snapshots.at(-1).data()?.data?.datasetSha256;
      if (!snapshots.every((s) => s.exists()) || oldHash !== datasetSha256) throw new Error('Retained sample already exists or has changed; refusing to overwrite user data.');
      return 'already-exists-unchanged';
    }
    const updatedAt = new Date().toISOString();
    for (let i = 0; i < records.length; i++) {
      const [category, key, data] = records[i];
      tx.set(refs[i], { data, revision: 1, updatedBy: user.uid, updatedAt });
      tx.set(doc(collection(db, `${base}/audit`)), { data: { category, documentId: key, action: 'create', purpose: 'User-requested retained Test Module example', datasetSha256 }, revision: 1, updatedBy: user.uid, updatedAt });
    }
    return 'created';
  });
  for (const [category, key, expected] of records) {
    const actual = (await getDocFromServer(doc(db, `${base}/${category}/${key}`))).data();
    // Project's initial creation day may differ on a later verification run.
    if (!actual || (category !== 'projects' && canonical(actual.data) !== canonical(expected))) throw new Error(`Read-back mismatch: ${category}/${key}`);
  }
  const result = { projectId: id, projectName: 'Test Module', outcome, records: records.length, readBack: 'PASS', datasetSha256, retained: true, productionRelease: false, url: 'https://precast-studio.web.app/org/precast-studio/projects/p-test-module/stages/g0?view=intake' };
  await writeFile(new URL('../../samples/test-module/shared-seed-result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await terminate(db); await deleteApp(app); }
