import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const projectId = 'demo-precast-m1';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';

if (!projectId.startsWith('demo-') || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing to seed without demo project ID and local emulator hosts.');
}

const requireFromFunctions = createRequire(new URL('../apps/functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
const { getAuth } = requireFromFunctions('firebase-admin/auth');
const { getFirestore, Timestamp } = requireFromFunctions('firebase-admin/firestore');

const app = initializeApp({ projectId }, `seed-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureUser(uid, email, displayName) {
  try {
    await auth.getUser(uid);
  } catch {
    await auth.createUser({ uid, email, password: 'local-emulator-only', displayName, emailVerified: true });
  }
}

await ensureUser('checker-narin', 'checker@precast.local', 'นรินทร์ วัฒนกิจ');
await ensureUser('engineer-supachai', 'engineer@precast.local', 'ศุภชัย กิตติวร');

const now = Timestamp.now();
const upstreamRefs = { sourceRevisionId: 'src-r02' };
const payload = { code: 'ACI 318-19', fc28Mpa: 40, fyMpa: 500, units: 'kN-m-MPa' };
const snapshotInput = { artifactType: 'designBasis', artifactId: 'db-r02', artifactRevision: 'DB-R02', createdBy: 'engineer-supachai', upstreamRefs, payload };
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
    : JSON.stringify(value) ?? 'null';
const draftHash = `sha256:${createHash('sha256').update(stable(snapshotInput)).digest('hex')}`;
const selfSnapshotInput = { ...snapshotInput, artifactId: 'db-self', artifactRevision: 'DB-SELF' };
const selfSnapshotHash = `sha256:${createHash('sha256').update(stable(selfSnapshotInput)).digest('hex')}`;

const batch = db.batch();
batch.set(db.doc('organizations/org-siam'), { id: 'org-siam', name: 'Siam Precast Engineering', updatedAt: now });
batch.set(db.doc('organizations/org-siam/members/checker-narin'), { uid: 'checker-narin', orgId: 'org-siam', status: 'active', orgRoles: ['orgAdmin'], projectIds: ['p-rama9'], updatedAt: now, updatedBy: 'seed' });
batch.set(db.doc('organizations/org-siam/members/engineer-supachai'), { uid: 'engineer-supachai', orgId: 'org-siam', status: 'active', orgRoles: [], projectIds: ['p-rama9'], updatedAt: now, updatedBy: 'seed' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9'), { id: 'p-rama9', orgId: 'org-siam', code: 'PC-26014', name: 'Rama IX Modular Residence', status: 'active', currentStage: 'designBasis', currentSourceRevisionId: 'src-r02', currentDesignBasisVersionId: 'db-r02', updatedAt: now, updatedBy: 'seed' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/members/checker-narin'), { uid: 'checker-narin', orgId: 'org-siam', projectId: 'p-rama9', status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: now, updatedAt: now, updatedBy: 'seed' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/members/engineer-supachai'), { uid: 'engineer-supachai', orgId: 'org-siam', projectId: 'p-rama9', status: 'active', roles: ['structuralEngineer'], capabilities: [], effectiveFrom: now, updatedAt: now, updatedBy: 'seed' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/designBasisVersions/db-r02'), { id: 'db-r02', revision: 'DB-R02', status: 'draft', createdBy: 'engineer-supachai', isCurrentRevision: true, upstreamRefs, payload, blockingConditions: [], draftHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/designBasisVersions/db-self'), { id: 'db-self', revision: 'DB-SELF', status: 'submitted', createdBy: 'engineer-supachai', isCurrentRevision: true, upstreamRefs, payload, blockingConditions: [], snapshotHash: selfSnapshotHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/approvalSnapshots/apr-self'), { ...selfSnapshotInput, id: 'apr-self', orgId: 'org-siam', projectId: 'p-rama9', snapshotHash: selfSnapshotHash, capturedAt: now, capturedBy: 'engineer-supachai' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/approvalRequests/apr-self'), { id: 'apr-self', orgId: 'org-siam', projectId: 'p-rama9', artifactType: 'designBasis', artifactId: 'db-self', artifactRevision: 'DB-SELF', snapshotHash: selfSnapshotHash, requestedAction: 'approve', requiredRole: 'engineeringChecker', assignedTo: 'engineer-supachai', status: 'open', requestedBy: 'engineer-supachai', requestedAt: now, blockingConditions: [] });
await batch.commit();

await deleteApp(app);
console.log(`Seeded ${projectId}. Draft hash: ${draftHash}`);
