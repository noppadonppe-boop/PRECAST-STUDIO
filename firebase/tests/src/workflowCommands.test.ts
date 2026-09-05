import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthorizationError } from '../../../apps/functions/src/authorization';
import type { EstimatePayload, ProductModelPayload } from '../../../packages/domain/src/types';
import { createLoadModelRevision, queueAnalysisRun } from '../../../apps/functions/src/analysisCommands';
import { buildDesignCheckRegister, createDesignCheckRevision } from '../../../apps/functions/src/designCheckCommands';
import { createEstimateRevision } from '../../../apps/functions/src/estimateCommands';
import { buildDocumentationSet, createDocumentationSetRevision } from '../../../apps/functions/src/documentationCommands';
import { buildRevitDraftingDxf, createReleasePackageRevision, releaseProductionPackage } from '../../../apps/functions/src/releaseCommands';
import { approveArtifact, archiveProject, canonicalizeProductModel, computeArtifactSnapshotHash, createDesignBasisRevision, createProductModelRevision, createType2Project, freezeSourceRevision, returnArtifact, submitArtifact, updateProject } from '../../../apps/functions/src/workflowCommands';

let db: Firestore;
let app: ReturnType<typeof initializeApp>;
const orgId = 'org-workflow';
const projectId = 'project-workflow';
const artifactId = 'db-r02';
const upstreamRefs = { sourceRevisionId: 'src-r02' };
const payload = {
  jurisdiction: 'Thailand', designCode: 'ACI 318', designCodeEdition: '2019', loadingCode: 'ASCE 7', loadingCodeEdition: '2022', units: 'kN-m-MPa' as const,
  designLifeYears: 50, riskCategory: 'II', concrete: { fc28Mpa: 40, fcLiftMpa: 20, densityKgM3: 2400, stiffnessMpa: 30000, durabilityClass: 'Moderate', source: 'Specification S-001' },
  reinforcement: { fyMpa: 500, source: 'Specification S-001' }, handling: { liftingDynamicFactor: 1.5, transportDynamicFactor: 1.3, storageSupportRule: 'Two aligned bearing points.', source: 'Handling standard' },
  fireResistanceMinutes: 120, inheritedFrom: 'type-2-residential-v1', overrideReasons: {},
};
const snapshotHash = computeArtifactSnapshotHash({ artifactType: 'designBasis', artifactId, artifactRevision: 'DB-R02', createdBy: 'engineer-1', upstreamRefs, payload });
const sourcePayload = { fileName: 'source.ifc', unit: 'metre' };
const sourceHash = computeArtifactSnapshotHash({ artifactType: 'sourceRevision', artifactId: 'src-r02', artifactRevision: 'SRC-R02', createdBy: 'bim-1', upstreamRefs: {}, payload: sourcePayload });
const productPayload: ProductModelPayload = {
  schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'Project Local',
  panels: [
    { id: 'panel-a', mark: 'W1', type: 'wall', sourceObjectIds: ['ifc-a'], materialId: 'c40', geometry: { widthM: 3, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [{ id: 'op-a', xM: 1, yM: 0, widthM: 1, heightM: 2 }], volumeM3: 1.35, weightKn: 31.8, cogM: { x: 1.5, y: 1.5, z: 0.075 } },
    { id: 'panel-b', mark: 'W2', type: 'wall', sourceObjectIds: ['ifc-b'], materialId: 'c40', geometry: { widthM: 2, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [], volumeM3: 0.9, weightKn: 21.2, cogM: { x: 4, y: 1.5, z: 0.075 } },
  ],
  joints: [{ id: 'joint-ab', panelIds: ['panel-a', 'panel-b'], stiffnessKnM: 20000, loadPathConfirmed: true }],
  anchors: [{ id: 'lift-a', panelId: 'panel-a', kind: 'lifting', positionM: { x: 1, y: 2.7, z: 0.075 }, capacityKn: 25 }],
  supports: [{ id: 'support-a', panelId: 'panel-a', scenario: 'final', positionM: { x: 0, y: 0, z: 0 }, restrainedDofs: ['UX', 'UY', 'UZ'] }],
  loadCases: [{ id: 'dead', scenario: 'final', type: 'dead', magnitude: 53, unit: 'kN' }], loadCombinations: [{ id: 'uls', factors: { dead: 1.4 } }], stages: ['final'],
  validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 },
};
const loadPayload = {
  schemaVersion: '1.0.0' as const, units: 'kN-m-MPa' as const, elementIdealization: 'shell-mid-surface' as const, shellFormulation: 'benchmark-shell' as const,
  meshSizeM: 0.25, refinementZoneIds: [], stiffnessModifiers: { membrane: 1, bending: 1 }, solverTolerance: 0.000001, maxIterations: 500, resultAveraging: 'nodal' as const,
  scenarios: [{ id: 'final' as const, activeSupportIds: ['support-a'], activeJointIds: ['joint-ab'], loadCaseIds: ['dead'], combinationIds: ['uls'] }],
};

async function seedWorkflow() {
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(db.doc(`organizations/${orgId}`), { name: 'Workflow Test Org' });
  batch.set(db.doc(`organizations/${orgId}/members/engineer-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/checker-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/bim-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/pm-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/qs-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/detailer-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/members/production-1`), { status: 'active', orgRoles: [], projectIds: [projectId] });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}`), { id: projectId, code: 'PC-TEST', name: 'Workflow project', status: 'active', currentStage: 'intake', currentSourceRevisionId: 'src-r02', currentDesignBasisVersionId: artifactId, gateStates: { G0: 'inProgress', G1: 'notStarted' } });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/engineer-1`), { status: 'active', roles: ['structuralEngineer', 'engineeringChecker'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/checker-1`), { status: 'active', roles: ['engineeringChecker'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/bim-1`), { status: 'active', roles: ['bimCoordinator'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/pm-1`), { status: 'active', roles: ['projectManager'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/qs-1`), { status: 'active', roles: ['costEstimator'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/detailer-1`), { status: 'active', roles: ['detailer'], capabilities: [], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/members/production-1`), { status: 'active', roles: ['productionManager'], capabilities: ['productionRelease'], effectiveFrom: now });
  batch.set(db.doc(`organizations/${orgId}/priceBooks/pb-2026`), { id: 'pb-2026', revision: 'PB-R01', status: 'approved', currency: 'THB', items: [
    ['pb-concrete', 'CONC-C40', 'm3', 2500, '2026-12-31'], ['pb-formwork', 'FORM-PANEL', 'm2', 500, '2026-12-31'], ['pb-anchor', 'ANCH-LIFT', 'each', 650, '2026-12-31'], ['pb-joint', 'JOINT-SEAL', 'm', 180, '2026-12-31'], ['pb-transport', 'LOG-TRANSPORT', 't', 900, '2026-06-30'],
  ].map(([id, costCode, unit, baseRate, effectiveTo]) => ({ id, costCode, description: costCode, category: costCode === 'LOG-TRANSPORT' ? 'logistics' : 'material', unit, currency: 'THB', baseRate, sourceType: 'internalBenchmark', sourceRef: `PB/${id}`, effectiveFrom: '2026-01-01', effectiveTo, taxIncluded: false, status: 'approved' })) });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`), { id: 'src-r02', revision: 'SRC-R02', status: 'draft', scanState: 'clean', locked: false, createdBy: 'bim-1', isCurrentRevision: true, upstreamRefs: {}, payload: sourcePayload, validation: { unitValid: true, coordinateValid: true, levelsValid: true, objectIdentityValid: true, objectCount: 12, duplicateGlobalIds: 0 }, blockingConditions: [], snapshotHash: sourceHash });
  batch.set(db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`), { id: artifactId, revision: 'DB-R02', status: 'draft', createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs, payload, blockingConditions: [] });
  await batch.commit();
}

function submitCommand() {
  return {
    orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'designBasis' as const, artifactId,
    expectedDraftHash: snapshotHash, idempotencyKey: randomUUID(), assignedTo: 'checker-1',
  };
}

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-precast-m1' }, `workflow-${randomUUID()}`);
  db = getFirestore(app);
});

beforeEach(async () => {
  await db.recursiveDelete(db.doc(`organizations/${orgId}`));
  await db.recursiveDelete(db.doc('organizations/org-create'));
  await seedWorkflow();
});

afterAll(async () => deleteApp(app));

describe('transactional workflow commands', () => {
  it('composes, independently approves, and releases an immutable production package', async () => {
    const readyProduct = canonicalizeProductModel({ ...productPayload, anchors: [...productPayload.anchors, { id: 'lift-b', panelId: 'panel-b', kind: 'lifting', positionM: { x: 4, y: 2.7, z: 0.075 }, capacityKn: 25 }] });
    const productUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: artifactId }; const productHash = computeArtifactSnapshotHash({ artifactType: 'productModel', artifactId: 'pm-r01', artifactRevision: 'PM-R01', createdBy: 'engineer-1', upstreamRefs: productUpstreams, payload: readyProduct as unknown as Record<string, unknown> });
    const analysisHash = `sha256:${'e'.repeat(64)}`; const rawCalculation = buildDesignCheckRegister(readyProduct, 'an-r01', analysisHash); const calculationPayload = { ...rawCalculation, overallStatus: 'PASS' as const, checks: rawCalculation.checks.map((check) => ({ ...check, status: 'PASS' as const, codeClauseRef: 'Verified independent method', message: 'Verified calculation result.' })) };
    const calculationUpstreams = { ...productUpstreams, modelVersionId: 'pm-r01', analysisRunId: 'an-r01' }; const calculationHash = computeArtifactSnapshotHash({ artifactType: 'calculation', artifactId: 'calc-r01', artifactRevision: 'CALC-R01', createdBy: 'engineer-1', upstreamRefs: calculationUpstreams, payload: calculationPayload });
    const rawDocumentation = buildDocumentationSet({ model: readyProduct, modelVersionId: 'pm-r01', modelSnapshotHash: productHash, calculation: calculationPayload, calculationReportId: 'calc-r01', calculationSnapshotHash: calculationHash, calculationStatus: 'approved', drawingSetRevision: 'DS-R01', reportId: 'report-r01', reportRevision: 'CR-R01' });
    const documentationPayload = { ...rawDocumentation, drawings: rawDocumentation.drawings.map((drawing) => ({ ...drawing, reinforcementStatus: 'PASS' as const })), preflight: { overallStatus: 'PASS' as const, checks: rawDocumentation.preflight.checks.map((check) => ({ ...check, status: 'PASS' as const })) } };
    const drawingUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: artifactId, modelVersionId: 'pm-r01', analysisRunId: 'an-r01', calculationReportId: 'calc-r01' }; const drawingHash = computeArtifactSnapshotHash({ artifactType: 'drawingSet', artifactId: 'ds-r01', artifactRevision: 'DS-R01', createdBy: 'detailer-1', upstreamRefs: drawingUpstreams, payload: documentationPayload });
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ currentDesignBasisVersionId: artifactId, currentModelVersionId: 'pm-r01', currentApprovedAnalysisRunId: 'an-r01', currentCalculationReportId: 'calc-r01', currentDrawingSetId: 'ds-r01', 'gateStates.G4': 'approved', 'gateStates.G6': 'approved' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`).set({ id: artifactId, revision: 'DB-R02', status: 'approved', locked: true, createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs, payload, blockingConditions: [], draftHash: snapshotHash, snapshotHash });
    await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`).set({ id: 'pm-r01', revision: 'PM-R01', status: 'approved', locked: true, createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs: productUpstreams, payload: readyProduct, blockingConditions: [], draftHash: productHash, snapshotHash: productHash });
    await db.doc(`organizations/${orgId}/projects/${projectId}/calculationReports/calc-r01`).set({ id: 'calc-r01', revision: 'CALC-R01', status: 'approved', locked: true, createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs: calculationUpstreams, payload: calculationPayload, blockingConditions: [], draftHash: calculationHash, snapshotHash: calculationHash });
    await db.doc(`organizations/${orgId}/projects/${projectId}/drawingSets/ds-r01`).set({ id: 'ds-r01', revision: 'DS-R01', status: 'approved', locked: true, createdBy: 'detailer-1', approvedBy: 'checker-1', isCurrentRevision: true, upstreamRefs: drawingUpstreams, payload: documentationPayload, blockingConditions: [], draftHash: drawingHash, snapshotHash: drawingHash });
    const dxfOutputs = documentationPayload.drawings.map((drawing) => ({ drawing, output: buildRevitDraftingDxf(drawing) })); const fileHash = (character: string) => `sha256:${character.repeat(64)}`;
    const files = [
      { path: '01_Calculation/report.pdf', role: 'calculationPdfa', mediaType: 'application/pdf', sha256: fileHash('1'), sizeBytes: 1000, sourceSnapshotHash: calculationHash, revision: 'CALC-R01' },
      ...dxfOutputs.flatMap(({ drawing, output }, index) => [
        { path: `02_Shop_Drawings_PDF/${drawing.drawingNumber}.pdf`, role: 'shopDrawingPdfa', mediaType: 'application/pdf', sha256: fileHash(String(index + 2)), sizeBytes: 900, sourceSnapshotHash: drawingHash, drawingId: drawing.id, drawingNumber: drawing.drawingNumber, revision: drawing.revision },
        { path: `06_Revit_Drafting/${drawing.drawingNumber}.dxf`, role: 'shopDrawingDxf', mediaType: 'application/dxf', sha256: output.sha256, sizeBytes: output.dxf.length, sourceSnapshotHash: drawingHash, drawingId: drawing.id, drawingNumber: drawing.drawingNumber, revision: drawing.revision },
      ]),
      { path: '04_Schedules/panel-schedule.xlsx', role: 'schedule', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sha256: fileHash('4'), sizeBytes: 800, sourceSnapshotHash: drawingHash, revision: 'DS-R01' },
      { path: '04_Schedules/audit.json', role: 'audit', mediaType: 'application/json', sha256: fileHash('5'), sizeBytes: 700, sourceSnapshotHash: drawingHash, revision: 'DS-R01' },
    ];
    await db.doc(`organizations/${orgId}/projects/${projectId}/exportJobs/export-r01`).set({ schemaVersion: '1.0.0', worker: 'precast-export-worker@1.0.0', status: 'completed', sourceDrawingSetId: 'ds-r01', sourceDrawingSetHash: drawingHash, immutableStorage: true, files, revitVerification: { status: 'PASS', target: 'Autodesk Revit', targetVersion: '2026', workflow: 'DraftingViewCurrentViewOnly', sizeToleranceMm: 0.5, visualComparison: 'PASS', dxfHashes: dxfOutputs.map(({ output }) => output.sha256), verifiedAt: '2026-09-05T12:00:00.000Z', verifiedBy: 'revit-lab-fixture' } });
    const createCommand = { orgId, projectId, releasePackageId: 'rel-r01', revision: 'REL-R01', exportJobId: 'export-r01', expectedDrawingSetHash: drawingHash, idempotencyKey: randomUUID() };
    expect(await createReleasePackageRevision(db, 'production-1', createCommand)).toMatchObject({ state: 'readyForTechnicalApproval', replayed: false }); expect(await createReleasePackageRevision(db, 'production-1', createCommand)).toMatchObject({ replayed: true });
    const created = await db.doc(`organizations/${orgId}/projects/${projectId}/releasePackages/rel-r01`).get(); const createdData = created.data() as { draftHash: string };
    const submission = await submitArtifact(db, 'production-1', { orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'releasePackage', artifactId: 'rel-r01', expectedDraftHash: createdData.draftHash, assignedTo: 'checker-1', idempotencyKey: randomUUID() });
    const submitted = await db.doc(`organizations/${orgId}/projects/${projectId}/releasePackages/rel-r01`).get(); const submittedHash = String(submitted.data()?.snapshotHash);
    await approveArtifact(db, 'checker-1', { orgId, projectId, requestId: submission.resourceId, artifactType: 'releasePackage', artifactId: 'rel-r01', snapshotHash: submittedHash, idempotencyKey: randomUUID() });
    const releaseCommand = { orgId, projectId, releasePackageId: 'rel-r01', expectedSnapshotHash: submittedHash, recipient: 'Factory A', productionQueue: 'QUEUE-01', idempotencyKey: randomUUID() };
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ currentModelVersionId: 'pm-r02' });
    await expect(releaseProductionPackage(db, 'production-1', { ...releaseCommand, idempotencyKey: randomUUID() })).rejects.toThrow('currentModelVersionId changed');
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ currentModelVersionId: 'pm-r01' });
    expect(await releaseProductionPackage(db, 'production-1', releaseCommand)).toMatchObject({ state: 'released', replayed: false }); expect(await releaseProductionPackage(db, 'production-1', releaseCommand)).toMatchObject({ replayed: true });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}/releasePackages/rel-r01`).get()).data()).toMatchObject({ status: 'released', locked: true, approvedBy: 'checker-1', releasedBy: 'production-1', recipient: 'Factory A', productionQueue: 'QUEUE-01' });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ gateStates: { G7: 'approved' }, currentReleasePackageId: 'rel-r01' });
  });

  it('creates a traceable Documentation Set and blocks G6 review while design content is NOT CHECKED', async () => {
    const productUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: artifactId }; const canonicalProduct = canonicalizeProductModel(productPayload);
    const productHash = computeArtifactSnapshotHash({ artifactType: 'productModel', artifactId: 'pm-r01', artifactRevision: 'PM-R01', createdBy: 'engineer-1', upstreamRefs: productUpstreams, payload: canonicalProduct as unknown as Record<string, unknown> });
    const calculationPayload = buildDesignCheckRegister(canonicalProduct, 'an-r01', `sha256:${'b'.repeat(64)}`); const calculationHash = computeArtifactSnapshotHash({ artifactType: 'calculation', artifactId: 'calc-r01', artifactRevision: 'CALC-R01', createdBy: 'engineer-1', upstreamRefs: { ...productUpstreams, modelVersionId: 'pm-r01', analysisRunId: 'an-r01' }, payload: calculationPayload as unknown as Record<string, unknown> });
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G3': 'approved', 'gateStates.G4': 'inProgress', currentModelVersionId: 'pm-r01', currentApprovedAnalysisRunId: 'an-r01', currentCalculationReportId: 'calc-r01' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`).set({ id: 'pm-r01', revision: 'PM-R01', status: 'approved', locked: true, createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs: productUpstreams, payload: canonicalProduct, draftHash: productHash, snapshotHash: productHash });
    await db.doc(`organizations/${orgId}/projects/${projectId}/calculationReports/calc-r01`).set({ id: 'calc-r01', revision: 'CALC-R01', status: 'draft', locked: false, createdBy: 'engineer-1', payload: calculationPayload, draftHash: calculationHash });
    const command = { orgId, projectId, drawingSetId: 'ds-r01', revision: 'DS-R01', reportId: 'report-r01', reportRevision: 'CR-R01', expectedModelHash: productHash, calculationReportId: 'calc-r01', expectedCalculationHash: calculationHash, idempotencyKey: randomUUID() };
    expect(await createDocumentationSetRevision(db, 'detailer-1', command)).toMatchObject({ state: 'incomplete', replayed: false });
    expect(await createDocumentationSetRevision(db, 'detailer-1', command)).toMatchObject({ state: 'incomplete', replayed: true });
    const snapshot = await db.doc(`organizations/${orgId}/projects/${projectId}/drawingSets/ds-r01`).get(); const data = snapshot.data() as { draftHash: string; payload: { calculationReport: { sections: unknown[] }; drawings: unknown[]; preflight: { overallStatus: string } }; blockingConditions: string[] };
    expect(data.payload.calculationReport.sections).toHaveLength(13); expect(data.payload.drawings).toHaveLength(2); expect(data.payload.preflight.overallStatus).toBe('FAIL'); expect(data.blockingConditions).toEqual(expect.arrayContaining(['lifting: FAIL.', 'reinforcement: NOT_CHECKED.']));
    await expect(submitArtifact(db, 'detailer-1', { orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'drawingSet', artifactId: 'ds-r01', expectedDraftHash: data.draftHash, assignedTo: 'checker-1', idempotencyKey: randomUUID() })).rejects.toThrow('G4 calculation must be approved');
  });
  it('creates a model-traced preliminary estimate idempotently and blocks submit on design/rate dependencies', async () => {
    const productUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: artifactId };
    const canonicalProduct = canonicalizeProductModel(productPayload);
    const productHash = computeArtifactSnapshotHash({ artifactType: 'productModel', artifactId: 'pm-r01', artifactRevision: 'PM-R01', createdBy: 'engineer-1', upstreamRefs: productUpstreams, payload: canonicalProduct as unknown as Record<string, unknown> });
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G3': 'approved', 'gateStates.G4': 'inProgress', currentModelVersionId: 'pm-r01', currentApprovedAnalysisRunId: 'an-r01', currentCalculationReportId: 'calc-r01' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`).set({ id: 'pm-r01', revision: 'PM-R01', status: 'approved', locked: true, createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs: productUpstreams, payload: canonicalProduct, draftHash: productHash, snapshotHash: productHash });
    await db.doc(`organizations/${orgId}/projects/${projectId}/calculationReports/calc-r01`).set({ payload: { overallStatus: 'NOT_CHECKED' } });
    const command = { orgId, projectId, estimateId: 'est-r01', revision: 'EST-R01', priceBookId: 'pb-2026', priceBookRevision: 'PB-R01', effectiveDate: '2026-09-05', expectedModelHash: productHash, indirectPercent: 10, contingencyPercent: 5, markupPercent: 12, vatPercent: 7, uncertaintyPercent: 15, idempotencyKey: randomUUID() };
    expect(await createEstimateRevision(db, 'qs-1', command)).toMatchObject({ state: 'incomplete', replayed: false });
    expect(await createEstimateRevision(db, 'qs-1', command)).toMatchObject({ state: 'incomplete', replayed: true });
    const estimate = await db.doc(`organizations/${orgId}/projects/${projectId}/estimateVersions/est-r01`).get();
    const estimateData = estimate.data() as { draftHash: string; payload: EstimatePayload };
    expect(estimate.data()).toMatchObject({ estimateState: 'incomplete', payload: { designDependencyStatus: 'NOT_CHECKED', summary: { directCost: null, grandTotal: null } } });
    expect(estimateData.payload.lines.find((line) => line.costCode === 'LOG-TRANSPORT')).toMatchObject({ rateStatus: 'expiredRate', unitRate: null, amount: null });
    expect(estimateData.payload.lines.every((line) => line.elementIds.length > 0)).toBe(true);
    await expect(submitArtifact(db, 'qs-1', { orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'estimate', artifactId: 'est-r01', expectedDraftHash: estimateData.draftHash, assignedTo: 'commercial-1', idempotencyKey: randomUUID() })).rejects.toThrow('G4 design dependency');
  });
  it('blocks G3 submission when equilibrium or verification evidence fails', async () => {
    const analysisRef = db.doc(`organizations/${orgId}/projects/${projectId}/analysisRuns/an-failed`);
    await analysisRef.set({ id: 'an-failed', revision: 'AN-X', status: 'completed', phase: 'complete', createdBy: 'engineer-1', isCurrentRevision: true, outputHash: `sha256:${'a'.repeat(64)}`, upstreamRefs: {}, payload: {}, draftHash: `sha256:${'b'.repeat(64)}`, blockingConditions: [], verification: { fatalWarnings: 0, unsupportedNodes: 0, disconnectedElements: 0, equilibriumPassed: false, convergencePassed: true, independentBenchmarkMatched: true } });
    await expect(submitArtifact(db, 'engineer-1', { orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'analysis', artifactId: 'an-failed', expectedDraftHash: `sha256:${'b'.repeat(64)}`, assignedTo: 'checker-1', idempotencyKey: randomUUID() })).rejects.toThrow('G3 requires');
  });

  it('approves verified G3 evidence then blocks G4 while Design Checks remain NOT CHECKED', async () => {
    const productUpstreams = { sourceRevisionId: 'src-r02', designBasisVersionId: artifactId };
    const canonicalProduct = canonicalizeProductModel(productPayload);
    const productHash = computeArtifactSnapshotHash({ artifactType: 'productModel', artifactId: 'pm-r01', artifactRevision: 'PM-R01', createdBy: 'engineer-1', upstreamRefs: productUpstreams, payload: canonicalProduct as unknown as Record<string, unknown> });
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G0': 'approved', 'gateStates.G1': 'approved', 'gateStates.G2': 'approved', currentModelVersionId: 'pm-r01' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`).set({ id: 'pm-r01', revision: 'PM-R01', status: 'approved', locked: true, createdBy: 'engineer-1', isCurrentRevision: true, upstreamRefs: productUpstreams, payload: canonicalProduct, draftHash: productHash, snapshotHash: productHash });
    const createCommand = { orgId, projectId, loadModelVersionId: 'load-r01', revision: 'LOAD-R01', payload: loadPayload, idempotencyKey: randomUUID() };
    expect(await createLoadModelRevision(db, 'engineer-1', createCommand)).toMatchObject({ state: 'draft', replayed: false });
    const loadRef = db.doc(`organizations/${orgId}/projects/${projectId}/loadModelVersions/load-r01`); const loadHash = String((await loadRef.get()).data()?.draftHash);
    const queueCommand = { orgId, projectId, runId: 'an-r01', revision: 'AN-R01', loadModelVersionId: 'load-r01', benchmarkId: 'two-panel-static-v1' as const, expectedModelHash: productHash, expectedLoadModelHash: loadHash, idempotencyKey: randomUUID() };
    const completed = await queueAnalysisRun(db, 'engineer-1', queueCommand);
    expect(completed).toMatchObject({ state: 'completed', replayed: false });
    expect(await queueAnalysisRun(db, 'engineer-1', queueCommand)).toMatchObject({ state: 'completed', replayed: true });
    expect((await loadRef.get()).data()).toMatchObject({ status: 'frozen', locked: true, snapshotHash: loadHash });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}/analysisRuns/an-r01`).get()).data()).toMatchObject({ status: 'completed', phase: 'complete', designStatus: 'NOT_CHECKED', engine: 'precast-benchmark-adapter@1.0.0', result: { appliedLoadKn: 74.2, reactionSumKn: 74.2, equilibriumImbalancePercent: 0 }, verification: { fatalWarnings: 0, equilibriumPassed: true, convergencePassed: true, independentBenchmarkMatched: true } });
    const analysisRef = db.doc(`organizations/${orgId}/projects/${projectId}/analysisRuns/an-r01`); const analysisHash = String((await analysisRef.get()).data()?.draftHash); const requestId = `request-${randomUUID()}`;
    await submitArtifact(db, 'engineer-1', { orgId, projectId, requestId, artifactType: 'analysis', artifactId: 'an-r01', expectedDraftHash: analysisHash, assignedTo: 'checker-1', idempotencyKey: randomUUID() });
    await approveArtifact(db, 'checker-1', { orgId, projectId, requestId, artifactType: 'analysis', artifactId: 'an-r01', snapshotHash: analysisHash, idempotencyKey: randomUUID() });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ currentApprovedAnalysisRunId: 'an-r01', currentStage: 'design', gateStates: { G3: 'approved', G4: 'inProgress' } });
    const createChecks = { orgId, projectId, calculationId: 'calc-r01', revision: 'CALC-R01', analysisRunId: 'an-r01', expectedAnalysisHash: analysisHash, idempotencyKey: randomUUID() };
    expect(await createDesignCheckRevision(db, 'engineer-1', createChecks)).toMatchObject({ state: 'draft', replayed: false });
    expect(await createDesignCheckRevision(db, 'engineer-1', createChecks)).toMatchObject({ state: 'draft', replayed: true });
    const calculation = await db.doc(`organizations/${orgId}/projects/${projectId}/calculationReports/calc-r01`).get();
    expect(calculation.data()).toMatchObject({ status: 'draft', overallStatus: 'NOT_CHECKED' });
    expect(calculation.data()?.blockingConditions as unknown[]).toContain('check-panel-strength: NOT_CHECKED');
    await expect(submitArtifact(db, 'engineer-1', { orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'calculation', artifactId: 'calc-r01', expectedDraftHash: String(calculation.data()?.draftHash), assignedTo: 'checker-1', idempotencyKey: randomUUID() })).rejects.toThrow('NOT CHECKED');
  });

  it('canonicalizes entity ordering for deterministic model snapshots', () => {
    const reversed = { ...productPayload, panels: [...productPayload.panels].reverse(), loadCombinations: [...productPayload.loadCombinations].reverse() };
    expect(canonicalizeProductModel(reversed)).toEqual(canonicalizeProductModel(productPayload));
  });

  it('creates, validates, submits and independently locks the G2 Product Model', async () => {
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G0': 'approved', 'gateStates.G1': 'approved' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`).update({ status: 'accepted', locked: true });
    await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`).update({ status: 'approved', locked: true });
    const created = await createProductModelRevision(db, 'engineer-1', { orgId, projectId, modelVersionId: 'pm-r01', revision: 'PM-R01', payload: productPayload, idempotencyKey: randomUUID() });
    expect(created.state).toBe('draft');
    const modelRef = db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`);
    const draftHash = String((await modelRef.get()).data()?.draftHash);
    const requestId = `request-${randomUUID()}`;
    await submitArtifact(db, 'engineer-1', { orgId, projectId, requestId, artifactType: 'productModel', artifactId: 'pm-r01', expectedDraftHash: draftHash, assignedTo: 'checker-1', idempotencyKey: randomUUID() });
    await approveArtifact(db, 'checker-1', { orgId, projectId, requestId, artifactType: 'productModel', artifactId: 'pm-r01', snapshotHash: draftHash, idempotencyKey: randomUUID() });
    expect((await modelRef.get()).data()).toMatchObject({ status: 'approved', locked: true, approvedBy: 'checker-1' });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ currentStage: 'analysis', currentModelVersionId: 'pm-r01', gateStates: { G2: 'approved', G3: 'inProgress' } });
  });

  it('blocks G2 submission when connectivity or load-path quality checks fail', async () => {
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G0': 'approved', 'gateStates.G1': 'approved' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`).update({ status: 'accepted', locked: true });
    await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`).update({ status: 'approved', locked: true });
    const invalidPayload = { ...productPayload, validation: { ...productPayload.validation, missingLoadPaths: 1 } };
    await createProductModelRevision(db, 'engineer-1', { orgId, projectId, modelVersionId: 'pm-invalid', revision: 'PM-X', payload: invalidPayload, idempotencyKey: randomUUID() });
    const model = await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-invalid`).get();
    await expect(submitArtifact(db, 'engineer-1', { orgId, projectId, requestId: `request-${randomUUID()}`, artifactType: 'productModel', artifactId: 'pm-invalid', expectedDraftHash: String(model.data()?.draftHash), assignedTo: 'checker-1', idempotencyKey: randomUUID() })).rejects.toThrow('quality checks');
  });

  it('supersedes rather than overwrites an approved Product Model', async () => {
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G0': 'approved', 'gateStates.G1': 'approved' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`).update({ status: 'accepted', locked: true });
    await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`).update({ status: 'approved', locked: true });
    await createProductModelRevision(db, 'engineer-1', { orgId, projectId, modelVersionId: 'pm-r01', revision: 'PM-R01', payload: productPayload, idempotencyKey: randomUUID() });
    await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`).update({ status: 'approved', locked: true });
    await createProductModelRevision(db, 'engineer-1', { orgId, projectId, modelVersionId: 'pm-r02', revision: 'PM-R02', payload: productPayload, supersedesId: 'pm-r01', idempotencyKey: randomUUID() });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}/productModelVersions/pm-r01`).get()).data()).toMatchObject({ status: 'superseded', isCurrentRevision: false, supersededBy: 'pm-r02' });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ currentModelVersionId: 'pm-r02', downstreamState: 'outOfDate' });
  });

  it('runs BIM submission, independent structural approval, and PM-only G0 freeze', async () => {
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G3': 'approved', 'gateStates.G4': 'approved', 'gateStates.G6': 'approved', 'gateStates.G7': 'approved' });
    const requestId = `request-${randomUUID()}`;
    await submitArtifact(db, 'bim-1', { orgId, projectId, requestId, artifactType: 'sourceRevision', artifactId: 'src-r02', expectedDraftHash: sourceHash, assignedTo: 'engineer-1', idempotencyKey: randomUUID() });
    await approveArtifact(db, 'engineer-1', { orgId, projectId, requestId, artifactType: 'sourceRevision', artifactId: 'src-r02', snapshotHash: sourceHash, idempotencyKey: randomUUID() });
    await expect(freezeSourceRevision(db, 'engineer-1', { orgId, projectId, sourceRevisionId: 'src-r02', expectedSnapshotHash: sourceHash, idempotencyKey: randomUUID() })).rejects.toThrow('Only the Project Manager');
    const command = { orgId, projectId, sourceRevisionId: 'src-r02', expectedSnapshotHash: sourceHash, idempotencyKey: randomUUID() };
    expect(await freezeSourceRevision(db, 'pm-1', command)).toMatchObject({ state: 'accepted', replayed: false });
    expect(await freezeSourceRevision(db, 'pm-1', command)).toMatchObject({ state: 'accepted', replayed: true });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ currentStage: 'designBasis', gateStates: { G0: 'approved', G1: 'inProgress' } });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ gateStates: { G2: 'outOfDate', G3: 'outOfDate', G4: 'outOfDate', G5: 'outOfDate', G6: 'outOfDate', G7: 'outOfDate' } });
  });

  it('blocks G0 freeze while a critical source issue remains open', async () => {
    const sourceRef = db.doc(`organizations/${orgId}/projects/${projectId}/sourceRevisions/src-r02`);
    await sourceRef.update({ status: 'approved' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/issues/issue-critical`).set({ artifactType: 'sourceRevision', artifactId: 'src-r02', severity: 'critical', status: 'open' });
    await expect(freezeSourceRevision(db, 'pm-1', { orgId, projectId, sourceRevisionId: 'src-r02', expectedSnapshotHash: sourceHash, idempotencyKey: randomUUID() })).rejects.toThrow('Open critical');
  });

  it('creates and supersedes immutable Design Basis revisions only after G0', async () => {
    const command = { orgId, projectId, designBasisId: 'db-r03', revision: 'DB-R03', payload, idempotencyKey: randomUUID() };
    await expect(createDesignBasisRevision(db, 'engineer-1', command)).rejects.toThrow('Gate G0');
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ 'gateStates.G0': 'approved' });
    expect(await createDesignBasisRevision(db, 'engineer-1', command)).toMatchObject({ state: 'draft' });
    await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/db-r03`).update({ status: 'approved', locked: true });
    const next = { ...command, designBasisId: 'db-r04', revision: 'DB-R04', supersedesId: 'db-r03', idempotencyKey: randomUUID() };
    expect(await createDesignBasisRevision(db, 'engineer-1', next)).toMatchObject({ resourceId: 'db-r04' });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).data()).toMatchObject({ gateStates: { G2: 'outOfDate', G3: 'outOfDate', G4: 'outOfDate', G5: 'outOfDate', G6: 'outOfDate', G7: 'outOfDate' } });
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/db-r03`).get()).data()).toMatchObject({ status: 'superseded', isCurrentRevision: false, supersededBy: 'db-r04' });
  });

  it('updates and soft-archives project metadata with audit receipts', async () => {
    const update = { orgId, projectId, code: 'PC-TEST-2', name: 'Updated workflow project', status: 'onHold' as const, idempotencyKey: randomUUID() };
    expect(await updateProject(db, 'pm-1', update)).toMatchObject({ state: 'onHold' });
    const archive = { orgId, projectId, reason: 'Project closed by test.', idempotencyKey: randomUUID() };
    expect(await archiveProject(db, 'pm-1', archive)).toMatchObject({ state: 'archived' });
    await expect(updateProject(db, 'pm-1', { ...update, idempotencyKey: randomUUID() })).rejects.toThrow('Archived projects are immutable');
  });

  it('submits once, rejects self-approval, and approves once by a distinct checker', async () => {
    const submit = submitCommand();
    const submitted = await submitArtifact(db, 'engineer-1', submit);
    const replay = await submitArtifact(db, 'engineer-1', submit);
    expect(submitted.replayed).toBe(false);
    expect(replay).toMatchObject({ state: 'submitted', replayed: true, auditEventId: submitted.auditEventId });

    await expect(approveArtifact(db, 'engineer-1', {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis', artifactId,
      snapshotHash, idempotencyKey: randomUUID(),
    })).rejects.toThrow(AuthorizationError);

    const approval = {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis' as const, artifactId,
      snapshotHash, idempotencyKey: randomUUID(), comment: 'Independent technical review complete.',
    };
    const approved = await approveArtifact(db, 'checker-1', approval);
    const approvedReplay = await approveArtifact(db, 'checker-1', approval);
    expect(approved).toMatchObject({ state: 'approved', replayed: false });
    expect(approvedReplay.replayed).toBe(true);
    const artifact = await db.doc(`organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`).get();
    expect(artifact.data()).toMatchObject({ status: 'approved', locked: true, approvedBy: 'checker-1' });
    const audits = await db.collection(`organizations/${orgId}/projects/${projectId}/auditEvents`).get();
    expect(audits.size).toBe(2);
  });

  it('rejects approval when an upstream project revision changed after submission', async () => {
    const submit = submitCommand();
    await submitArtifact(db, 'engineer-1', submit);
    await db.doc(`organizations/${orgId}/projects/${projectId}`).update({ currentSourceRevisionId: 'src-r03' });
    await expect(approveArtifact(db, 'checker-1', {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis', artifactId,
      snapshotHash, idempotencyKey: randomUUID(),
    })).rejects.toThrow('stale or mismatched');
  });

  it('returns a submitted artifact with a mandatory comment and append-only audit', async () => {
    const submit = submitCommand();
    await submitArtifact(db, 'engineer-1', submit);
    const result = await returnArtifact(db, 'checker-1', {
      orgId, projectId, requestId: submit.requestId, artifactType: 'designBasis', artifactId,
      snapshotHash, idempotencyKey: randomUUID(), comment: 'Clarify handling-stage load source.',
    });
    expect(result.state).toBe('draft');
    const request = await db.doc(`organizations/${orgId}/projects/${projectId}/approvalRequests/${submit.requestId}`).get();
    expect(request.data()).toMatchObject({ status: 'returned', decisionComment: 'Clarify handling-stage load source.' });
  });

  it('creates a Type 2 project and project-manager membership idempotently', async () => {
    await db.doc('organizations/org-create').set({ name: 'Create Test Org' });
    await db.doc('organizations/org-create/members/admin-1').set({ status: 'active', orgRoles: ['orgAdmin'], projectIds: [] });
    const command = { orgId: 'org-create', projectId: 'type2-demo', code: 'PC-26021', name: 'Type 2 Demo', templateId: 'type-2-residential-v1' as const, idempotencyKey: randomUUID() };
    const created = await createType2Project(db, 'admin-1', command);
    const replay = await createType2Project(db, 'admin-1', command);
    expect(created.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    const project = await db.doc('organizations/org-create/projects/type2-demo').get();
    const member = await db.doc('organizations/org-create/projects/type2-demo/members/admin-1').get();
    expect(project.data()).toMatchObject({ templateId: 'type-2-residential-v1', currentStage: 'intake' });
    expect(member.data()?.roles).toEqual(['projectManager']);
  });
});
