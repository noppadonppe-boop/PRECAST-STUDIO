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
const productModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local / Level 1 datum',
  panels: [
    { id: 'panel-a', mark: 'W1-01', type: 'wall', sourceObjectIds: ['ifc-wall-a'], materialId: 'concrete-c40', geometry: { widthM: 3.6, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [{ id: 'opening-a', xM: 1.2, yM: 0, widthM: 1, heightM: 2.1 }], volumeM3: 1.62, weightKn: 38.1, cogM: { x: 1.8, y: 1.5, z: 0.075 } },
    { id: 'panel-b', mark: 'W1-02', type: 'wall', sourceObjectIds: ['ifc-wall-b'], materialId: 'concrete-c40', geometry: { widthM: 2.8, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 1.26, weightKn: 29.7, cogM: { x: 5, y: 1.5, z: 0.075 } },
  ],
  joints: [{ id: 'joint-a-b', panelIds: ['panel-a', 'panel-b'], stiffnessKnM: 25000, loadPathConfirmed: true }],
  anchors: [{ id: 'lift-a1', panelId: 'panel-a', kind: 'lifting', positionM: { x: 0.8, y: 2.7, z: 0.075 }, capacityKn: 25 }, { id: 'lift-b1', panelId: 'panel-b', kind: 'lifting', positionM: { x: 4.2, y: 2.7, z: 0.075 }, capacityKn: 25 }],
  supports: [{ id: 'support-final-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX', 'UY', 'UZ'] }, { id: 'support-lift-a', panelId: 'panel-a', scenario: 'lifting', positionM: { x: 0.8, y: 2.7, z: 0.075 }, restrainedDofs: ['UY'] }],
  loadCases: [{ id: 'lc-dead', scenario: 'final', type: 'dead', magnitude: 67.8, unit: 'kN' }, { id: 'lc-lift', scenario: 'lifting', type: 'handling', magnitude: 57.2, unit: 'kN' }],
  loadCombinations: [{ id: 'comb-final-uls', factors: { 'lc-dead': 1.4 } }, { id: 'comb-lift-uls', factors: { 'lc-lift': 1.5 } }],
  stages: ['lifting', 'final'], validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 },
};
const productUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: 'db-r02' };
const productSnapshotInput = { artifactType: 'productModel', artifactId: 'pm-r01', artifactRevision: 'PM-R01', createdBy: 'engineer-supachai', upstreamRefs: productUpstreams, payload: productModelPayload };
const productHash = hash(productSnapshotInput);
const loadModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', elementIdealization: 'shell-mid-surface', shellFormulation: 'benchmark-shell', meshSizeM: 0.25,
  refinementZoneIds: ['opening-a'], stiffnessModifiers: { membrane: 1, bending: 1 }, solverTolerance: 0.000001, maxIterations: 500, resultAveraging: 'nodal',
  scenarios: [
    { id: 'final', activeSupportIds: ['support-final-a'], activeJointIds: ['joint-a-b'], loadCaseIds: ['lc-dead'], combinationIds: ['comb-final-uls'] },
    { id: 'lifting', activeSupportIds: ['support-lift-a'], activeJointIds: ['joint-a-b'], loadCaseIds: ['lc-lift'], combinationIds: ['comb-lift-uls'] },
  ],
};
const loadUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: 'db-r02', modelVersionId: 'pm-r01' };
const loadHash = hash({ artifactType: 'loadModel', artifactId: 'load-r01', artifactRevision: 'LOAD-R01', createdBy: 'engineer-supachai', upstreamRefs: loadUpstreams, payload: loadModelPayload });
const analysisManifest = { schemaVersion: '1.0.0', orgId: 'org-siam', projectId: 'p-rama9', runId: 'an-r01', sourceRevisionId: 'src-r02', designBasisVersionId: 'db-r02', modelVersionId: 'pm-r01', modelSnapshotHash: productHash, loadModelVersionId: 'load-r01', loadModelSnapshotHash: loadHash, engine: 'precast-benchmark-adapter@1.0.0', benchmarkId: 'two-panel-static-v1' };
const analysisInputHash = hash(analysisManifest);
const analysisResult = { appliedLoadKn: 94.92, reactionSumKn: 94.92, equilibriumImbalancePercent: 0, maxDisplacementMm: 0.84, governingCombinationId: 'comb-final-uls' };
const analysisVerification = { fatalWarnings: 0, unsupportedNodes: 0, disconnectedElements: 0, equilibriumTolerancePercent: 0.5, equilibriumPassed: true, convergencePassed: true, independentBenchmarkMatched: true };
const analysisOutputHash = hash({ inputHash: analysisInputHash, engine: analysisManifest.engine, result: analysisResult, verification: analysisVerification });
const analysisUpstreams = { ...loadUpstreams, loadModelVersionId: 'load-r01' };
const analysisPayload = { manifest: analysisManifest, result: analysisResult, verification: analysisVerification, inputHash: analysisInputHash, outputHash: analysisOutputHash, engine: analysisManifest.engine, benchmarkId: analysisManifest.benchmarkId };
const analysisReviewHash = hash({ artifactType: 'analysis', artifactId: 'an-r01', artifactRevision: 'AN-R01', createdBy: 'engineer-supachai', upstreamRefs: analysisUpstreams, payload: analysisPayload });

const batch = db.batch();
batch.set(db.doc('organizations/org-siam'), { id: 'org-siam', name: 'Siam Precast Engineering', updatedAt: now });
for (const [uid, orgRoles] of [['checker-narin', ['orgAdmin']], ['engineer-supachai', []], ['bim-arin', []], ['pm-malee', []]]) {
  batch.set(db.doc(`organizations/org-siam/members/${uid}`), { uid, orgId: 'org-siam', status: 'active', orgRoles, projectIds: ['p-rama9'], updatedAt: now, updatedBy: 'seed' });
}
batch.set(db.doc('organizations/org-siam/projects/p-rama9'), {
  id: 'p-rama9', orgId: 'org-siam', code: 'PC-26014', name: 'Rama IX Modular Residence', productFamilyId: 'type-2-residential', status: 'active', currentStage: 'analysis',
  currentSourceRevisionId: 'src-r02', currentDesignBasisVersionId: 'db-r02', currentModelVersionId: 'pm-r01', currentLoadModelVersionId: 'load-r01', gateStates: { G0: 'approved', G1: 'approved', G2: 'approved', G3: 'inProgress', G4: 'notStarted', G5: 'notStarted', G6: 'notStarted', G7: 'notStarted' },
  assignedUserIds: ['checker-narin', 'engineer-supachai', 'bim-arin', 'pm-malee'], updatedAt: now, updatedBy: 'seed',
});
for (const [uid, roles] of [['checker-narin', ['engineeringChecker']], ['engineer-supachai', ['structuralEngineer']], ['bim-arin', ['bimCoordinator']], ['pm-malee', ['projectManager']]]) {
  batch.set(db.doc(`organizations/org-siam/projects/p-rama9/members/${uid}`), { uid, orgId: 'org-siam', projectId: 'p-rama9', status: 'active', roles, capabilities: [], effectiveFrom: now, updatedAt: now, updatedBy: 'seed' });
}
batch.set(db.doc('organizations/org-siam/projects/p-rama9/sourceRevisions/src-r02'), {
  id: 'src-r02', revision: 'SRC-R02', status: 'accepted', scanState: 'clean', locked: true, createdBy: 'bim-arin', isCurrentRevision: true,
  upstreamRefs: {}, payload: sourcePayload, validation: { unitValid: true, coordinateValid: true, levelsValid: true, objectIdentityValid: true, objectCount: 1842, duplicateGlobalIds: 0 },
  blockingConditions: [], draftHash: sourceHash, snapshotHash: sourceHash, storagePath: 'seed/clean/rama9-coordination-r02.ifc', createdAt: now, updatedAt: now,
});
batch.set(db.doc('organizations/org-siam/projects/p-rama9/designBasisVersions/db-r02'), { id: 'db-r02', revision: 'DB-R02', status: 'approved', locked: true, createdBy: 'engineer-supachai', approvedBy: 'checker-narin', isCurrentRevision: true, upstreamRefs, payload: designBasisPayload, blockingConditions: [], draftHash, snapshotHash: draftHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/productModelVersions/pm-r01'), { id: 'pm-r01', revision: 'PM-R01', status: 'approved', locked: true, createdBy: 'engineer-supachai', approvedBy: 'checker-narin', isCurrentRevision: true, upstreamRefs: productUpstreams, payload: productModelPayload, blockingConditions: [], draftHash: productHash, snapshotHash: productHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/loadModelVersions/load-r01'), { id: 'load-r01', revision: 'LOAD-R01', status: 'frozen', locked: true, createdBy: 'engineer-supachai', isCurrentRevision: true, upstreamRefs: loadUpstreams, payload: loadModelPayload, draftHash: loadHash, snapshotHash: loadHash, createdAt: now, updatedAt: now, updatedBy: 'engineer-supachai' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/analysisRuns/an-r01'), { id: 'an-r01', revision: 'AN-R01', status: 'completed', phase: 'complete', designStatus: 'NOT_CHECKED', locked: false, createdBy: 'engineer-supachai', isCurrentRevision: true, engine: analysisManifest.engine, benchmarkId: analysisManifest.benchmarkId, inputHash: analysisInputHash, outputHash: analysisOutputHash, upstreamRefs: analysisUpstreams, manifest: analysisManifest, payload: analysisPayload, draftHash: analysisReviewHash, blockingConditions: [], result: analysisResult, verification: analysisVerification, phaseHistory: [{ phase: 'validate', status: 'completed', message: 'Immutable upstream and schema validation passed.' }, { phase: 'mesh', status: 'completed', message: 'Benchmark topology prepared.' }, { phase: 'solve', status: 'completed', message: 'Versioned benchmark adapter completed.' }, { phase: 'checks', status: 'completed', message: 'G3 verification evidence recorded.' }, { phase: 'complete', status: 'completed', message: 'Controlled benchmark run completed.' }], createdAt: now, completedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/designBasisVersions/db-self'), { id: 'db-self', revision: 'DB-SELF', status: 'submitted', locked: false, createdBy: 'engineer-supachai', isCurrentRevision: true, upstreamRefs, payload: designBasisPayload, blockingConditions: [], snapshotHash: selfSnapshotHash, createdAt: now, updatedAt: now });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/approvalSnapshots/apr-self'), { ...selfSnapshotInput, id: 'apr-self', orgId: 'org-siam', projectId: 'p-rama9', snapshotHash: selfSnapshotHash, capturedAt: now, capturedBy: 'engineer-supachai' });
batch.set(db.doc('organizations/org-siam/projects/p-rama9/approvalRequests/apr-self'), { id: 'apr-self', orgId: 'org-siam', projectId: 'p-rama9', artifactType: 'designBasis', artifactId: 'db-self', artifactRevision: 'DB-SELF', snapshotHash: selfSnapshotHash, requestedAction: 'approve', requiredRole: 'engineeringChecker', assignedTo: 'engineer-supachai', status: 'open', requestedBy: 'engineer-supachai', requestedAt: now, blockingConditions: [] });
await batch.commit();
await deleteApp(app);
console.log(`Seeded ${projectId}. Source ${sourceHash}; Design Basis ${draftHash}; Product Model ${productHash}; Load Model ${loadHash}; Analysis ${analysisReviewHash}`);
