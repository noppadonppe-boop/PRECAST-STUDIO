import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const projectId = 'demo-precast-m1';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
if (!projectId.startsWith('demo-') || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Refusing to seed outside local emulators.');

const requireFromFunctions = createRequire(new URL('../apps/functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
const { getAuth } = requireFromFunctions('firebase-admin/auth');
const { getFirestore, Timestamp } = requireFromFunctions('firebase-admin/firestore');
const app = initializeApp({ projectId }, `seed-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureUser(uid, email, displayName) {
  try { await auth.getUser(uid); } catch { await auth.createUser({ uid, email, password: 'local-emulator-only', displayName, emailVerified: true }); }
}

await ensureUser('checker-narin', 'checker@precast.local', 'นรินทร์ วัฒนกิจ');
await ensureUser('engineer-supachai', 'engineer@precast.local', 'ศุภชัย กิตติวร');
await ensureUser('bim-arin', 'bim@precast.local', 'อรินทร์ ศรีสวัสดิ์');
await ensureUser('pm-malee', 'pm@precast.local', 'มาลี รัตนวงศ์');

const now = Timestamp.now();
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value !== null && typeof value === 'object'
  ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  : JSON.stringify(value) ?? 'null';
const hash = (value) => `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`;

const sourcePayload = { fileName: 'rama9-coordination-r02.ifc', contentType: 'application/x-step', size: 1845200, unit: 'metre', coordinateSystem: 'Project Local', levelCount: 7, objectCount: 1842 };
const sourceSnapshotInput = { artifactType: 'sourceRevision', artifactId: 'src-r02', artifactRevision: 'SRC-R02', createdBy: 'bim-arin', upstreamRefs: {}, payload: sourcePayload };
const sourceHash = hash(sourceSnapshotInput);
const designBasisPayload = {
  jurisdiction: 'Thailand', designCode: 'ACI 318', designCodeEdition: '2019', loadingCode: 'ASCE 7', loadingCodeEdition: '2022', units: 'kN-m-MPa',
  designLifeYears: 50, riskCategory: 'II',
  concrete: { fc28Mpa: 40, fcLiftMpa: 20, densityKgM3: 2400, stiffnessMpa: 30000, durabilityClass: 'Moderate exposure', source: 'Project specification S-001' },
  reinforcement: { fyMpa: 500, source: 'Project specification S-001' },
  handling: { liftingDynamicFactor: 1.5, transportDynamicFactor: 1.3, storageSupportRule: 'Two aligned bearing points at approved lifting design locations.', source: 'Precast handling standard PHS-02' },
  fireResistanceMinutes: 120, inheritedFrom: 'type-2-residential-v1@1.0.0', overrideReasons: {},
};
const upstreamRefs = { sourceRevisionId: 'src-r02' };
const snapshotInput = { artifactType: 'designBasis', artifactId: 'db-r02', artifactRevision: 'DB-R02', createdBy: 'engineer-supachai', upstreamRefs, payload: designBasisPayload };
const draftHash = hash(snapshotInput);
const selfSnapshotInput = { ...snapshotInput, artifactId: 'db-self', artifactRevision: 'DB-SELF' };
const selfSnapshotHash = hash(selfSnapshotInput);

const batch = db.batch();
batch.set(db.doc('organizations/org-siam'), { id: 'org-siam', name: 'Siam Precast Engineering', updatedAt: now });
for (const [uid, orgRoles] of [['checker-narin', ['orgAdmin']], ['engineer-supachai', []], ['bim-arin', []], ['pm-malee', []]]) {
  batch.set(db.doc(`organizations/org-siam/members/${uid}`), { uid, orgId: 'org-siam', status: 'active', orgRoles, projectIds: ['p-rama9'], updatedAt: now, updatedBy: 'seed' });
}
batch.set(db.doc('organizations/org-siam/projects/p-rama9'), {
  id: 'p-rama9', orgId: 'org-siam', code: 'PC-26014', name: 'Rama IX Modular Residence', productFamilyId: 'type-2-residential', status: 'active', currentStage: 'intake',
  currentSourceRevisionId: 'src-r02', currentDesignBasisVersionId: 'db-r02', gateStates: { G0: 'inProgress', G1: 'notStarted', G2: 'notStarted', G3: 'notStarted', G4: 'notStarted', G5: 'notStarted', G6: 'notStarted', G7: 'notStarted' },
  assignedUserIds: ['checker-narin', 'engineer-supachai', 'bim-arin', 'pm-malee'], updatedAt: now, updatedBy: 'seed',
});
for (const [uid, roles] of [['checker-narin', ['engineeringChecker']], ['engineer-supachai', ['structuralEngineer']], ['bim-arin', ['bimCoordinator']], ['pm-malee', ['projectManager']]]) {
  batch.set(db.doc(`organizations/org-siam/projects/p-rama9/members/${uid}`), { uid, orgId: 'org-siam', projectId: 'p-rama9', status: 'active', roles, capabilities: [], effectiveFrom: now, updatedAt: now, updatedBy: 'seed' });
}
batch.set(db.doc('organizations/org-siam/projects/p-rama9/sourceRevisions/src-r02'), {
  id: 'src-r02', revision: 'SRC-R02', status: 'draft', scanState: 'clean', locked: false, createdBy: 'bim-arin', isCurrentRevision: true,
  upstreamRefs: {}, payload: sourcePayload, validation: { unitValid: true, coordinateValid: true, levelsValid: true, objectIdentityValid: true, objectCount: 1842, duplicateGlobalIds: 0 },
  blockingConditions: [], draftHash: sourceHash, snapshotHash: sourceHash, storagePath: 'seed/clean/rama9-coordination-r02.ifc', createdAt: now, updatedAt: now,
});
batch.set(db.doc('organizations/org-siam/projects/p-rama9/designBasisVersions/db-r02'), { id: 'db-r02', revision: 'DB-R02', status: 'draft', locked: false, createdBy: 'engineer-supachai', isCurrentRevision: true, upstreamRefs, payload: designBasisPayload, blockingConditions: [], draftHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/designBasisVersions/db-self'), { id: 'db-self', revision: 'DB-SELF', status: 'submitted', locked: false, createdBy: 'engineer-supachai', isCurrentRevision: true, upstreamRefs, payload: designBasisPayload, blockingConditions: [], snapshotHash: selfSnapshotHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/approvalSnapshots/apr-self'), { ...selfSnapshotInput, id: 'apr-self', orgId: 'org-siam', projectId: 'p-rama9', snapshotHash: selfSnapshotHash, capturedAt: now, capturedBy: 'engineer-supachai' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/approvalRequests/apr-self'), { id: 'apr-self', orgId: 'org-siam', projectId: 'p-rama9', artifactType: 'designBasis', artifactId: 'db-self', artifactRevision: 'DB-SELF', snapshotHash: selfSnapshotHash, requestedAction: 'approve', requiredRole: 'engineeringChecker', assignedTo: 'engineer-supachai', status: 'open', requestedBy: 'engineer-supachai', requestedAt: now, blockingConditions: [] });
await batch.commit();
await deleteApp(app);
console.log(`Seeded ${projectId}. Source ${sourceHash}; Design Basis ${draftHash}`);
