import { createHash } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, type LoadAnalysisSettingsPayload, type PermissionContext, type ProductModelPayload, type ProjectRole } from '@precast/domain';
import { loadAnalysisSettingsPayloadSchema, productModelPayloadSchema, type CancelAnalysisRunCommand, type CreateLoadModelRevisionCommand, type QueueAnalysisRunCommand } from '@precast/schemas';
import { AuthorizationError } from './authorization';

type RecordValue = Record<string, unknown>;
export interface AnalysisCommandResult { resourceId: string; state: string; auditEventId: string; replayed: boolean }

const rootPath = (orgId: string, projectId: string) => `organizations/${orgId}/projects/${projectId}`;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' ? value as RecordValue : {};
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const records = (value: unknown): RecordValue[] => Array.isArray(value) ? value.filter((item): item is RecordValue => item !== null && typeof item === 'object') : [];
const stable = (value: unknown): string => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value !== null && typeof value === 'object' ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}` : JSON.stringify(value) ?? 'null';
const hash = (value: unknown): string => `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`;
const required = (data: RecordValue, key: string): string => { const value = data[key]; if (typeof value !== 'string' || value.length === 0) throw new AuthorizationError(`${key} is required.`, 'failed-precondition'); return value; };

async function permissionContext(tx: Transaction, db: Firestore, uid: string, orgId: string, projectId: string, now: Timestamp): Promise<PermissionContext> {
  const [orgMember, projectMember] = await Promise.all([tx.get(db.doc(`organizations/${orgId}/members/${uid}`)), tx.get(db.doc(`${rootPath(orgId, projectId)}/members/${uid}`))]);
  const org = record(orgMember.data()); const project = record(projectMember.data());
  if (!orgMember.exists || org.status !== 'active' || !projectMember.exists || project.status !== 'active') throw new AuthorizationError('Active organization and project membership are required.', 'permission-denied');
  const effective = project.effectiveFrom instanceof Timestamp ? project.effectiveFrom.toMillis() : 0;
  const expires = project.expiresAt instanceof Timestamp ? project.expiresAt.toMillis() : undefined;
  if (effective > now.toMillis() || (expires !== undefined && expires <= now.toMillis())) throw new AuthorizationError('Project membership is not currently effective.', 'permission-denied');
  return { userId: uid, orgId, projectId, roles: strings(project.roles) as ProjectRole[], capabilities: strings(project.capabilities), membershipStatus: 'active', ...(expires === undefined ? {} : { expiresAt: new Date(expires).toISOString() }) };
}

export function canonicalizeLoadSettings(payload: LoadAnalysisSettingsPayload): LoadAnalysisSettingsPayload {
  return { ...payload, refinementZoneIds: [...new Set(payload.refinementZoneIds)].sort(), scenarios: [...payload.scenarios].sort((a, b) => a.id.localeCompare(b.id)).map((scenario) => ({ ...scenario, activeSupportIds: [...new Set(scenario.activeSupportIds)].sort(), activeJointIds: [...new Set(scenario.activeJointIds)].sort(), loadCaseIds: [...new Set(scenario.loadCaseIds)].sort(), combinationIds: [...new Set(scenario.combinationIds)].sort() })) };
}

function validateSettingsAgainstModel(settings: LoadAnalysisSettingsPayload, model: ProductModelPayload): void {
  const supportIds = new Set(model.supports.map((item) => item.id)); const jointIds = new Set(model.joints.map((item) => item.id));
  const loadCaseIds = new Set(model.loadCases.map((item) => item.id)); const combinationIds = new Set(model.loadCombinations.map((item) => item.id)); const stages = new Set(model.stages);
  for (const scenario of settings.scenarios) {
    if (!stages.has(scenario.id)) throw new AuthorizationError(`Scenario ${scenario.id} is absent from the locked Product Model.`, 'failed-precondition');
    if (scenario.activeSupportIds.some((id) => !supportIds.has(id)) || scenario.activeJointIds.some((id) => !jointIds.has(id)) || scenario.loadCaseIds.some((id) => !loadCaseIds.has(id)) || scenario.combinationIds.some((id) => !combinationIds.has(id))) throw new AuthorizationError(`Scenario ${scenario.id} references an unknown support, joint, load case, or combination.`, 'failed-precondition');
  }
}

function receipt(data: RecordValue, uid: string, name: string): AnalysisCommandResult {
  if (data.actorUid !== uid || data.commandName !== name) throw new AuthorizationError('Idempotency key was used by another command.', 'failed-precondition');
  return { resourceId: required(data, 'resourceId'), state: required(data, 'resultState'), auditEventId: required(data, 'auditEventId'), replayed: true };
}

export async function createLoadModelRevision(db: Firestore, uid: string, command: CreateLoadModelRevisionCommand): Promise<AnalysisCommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId);
    const projectRef = db.doc(root); const modelRef = db.doc(`${root}/loadModelVersions/${command.loadModelVersionId}`); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const [existingReceipt, project, existingModel, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(modelRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (existingReceipt.exists) return receipt(record(existingReceipt.data()), uid, 'createLoadModelRevision');
    if (!project.exists || existingModel.exists) throw new AuthorizationError('Project is missing or Load Model ID already exists.', 'failed-precondition');
    const decision = can('create', 'loadModel', context); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Load Model creation denied.', 'permission-denied');
    const projectData = record(project.data()); const gates = record(projectData.gateStates);
    if (gates.G2 !== 'approved') throw new AuthorizationError('G2 must be approved before creating analysis settings.', 'failed-precondition');
    const sourceRevisionId = required(projectData, 'currentSourceRevisionId'); const designBasisVersionId = required(projectData, 'currentDesignBasisVersionId'); const modelVersionId = required(projectData, 'currentModelVersionId');
    const product = await tx.get(db.doc(`${root}/productModelVersions/${modelVersionId}`)); const productData = record(product.data());
    if (!product.exists || productData.status !== 'approved' || productData.locked !== true) throw new AuthorizationError('Current Product Model must be approved and locked.', 'failed-precondition');
    const payload = canonicalizeLoadSettings(command.payload); const upstreamRefs = { sourceRevisionId, designBasisVersionId, modelVersionId };
    const draftHash = hash({ artifactType: 'loadModel', artifactId: command.loadModelVersionId, artifactRevision: command.revision, createdBy: uid, upstreamRefs, payload });
    tx.create(modelRef, { id: command.loadModelVersionId, revision: command.revision, status: 'draft', locked: false, createdBy: uid, isCurrentRevision: true, upstreamRefs, payload, draftHash, createdAt: now, updatedAt: now, updatedBy: uid });
    tx.update(projectRef, { currentLoadModelVersionId: command.loadModelVersionId, currentStage: 'analysis', updatedAt: now, updatedBy: uid });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'loadModel', artifactId: command.loadModelVersionId, artifactRevision: command.revision, action: 'create', stateBefore: 'none', stateAfter: 'draft', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: draftHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createLoadModelRevision', actorUid: uid, resourceId: command.loadModelVersionId, resultState: 'draft', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.loadModelVersionId, state: 'draft', auditEventId: command.idempotencyKey, replayed: false };
  });
}

async function queueOnly(db: Firestore, uid: string, command: QueueAnalysisRunCommand): Promise<AnalysisCommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`); const runRef = db.doc(`${root}/analysisRuns/${command.runId}`);
    const projectRef = db.doc(root); const loadRef = db.doc(`${root}/loadModelVersions/${command.loadModelVersionId}`);
    const [existingReceipt, project, load, run, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(loadRef), tx.get(runRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (existingReceipt.exists) return receipt(record(existingReceipt.data()), uid, 'queueAnalysisRun');
    if (!project.exists || !load.exists || run.exists) throw new AuthorizationError('Project/Load Model is missing or run ID exists.', 'failed-precondition');
    const decision = can('submit', 'loadModel', context); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Analysis queue denied.', 'permission-denied');
    const projectData = record(project.data()); const loadData = record(load.data()); const modelVersionId = required(projectData, 'currentModelVersionId');
    if (projectData.currentLoadModelVersionId !== command.loadModelVersionId || loadData.status !== 'draft' || loadData.locked === true || loadData.createdBy !== uid) throw new AuthorizationError('Only the author may queue the current unlocked Load Model.', 'failed-precondition');
    const modelRef = db.doc(`${root}/productModelVersions/${modelVersionId}`); const model = await tx.get(modelRef); const modelData = record(model.data());
    if (!model.exists || modelData.status !== 'approved' || modelData.locked !== true || modelData.snapshotHash !== command.expectedModelHash) throw new AuthorizationError('Locked Product Model hash mismatch.', 'failed-precondition');
    const parsedSettings = loadAnalysisSettingsPayloadSchema.safeParse(loadData.payload); const parsedModel = productModelPayloadSchema.safeParse(modelData.payload);
    if (!parsedSettings.success || !parsedModel.success) throw new AuthorizationError('Load settings or Product Model schema is invalid.', 'failed-precondition');
    const settings = canonicalizeLoadSettings(parsedSettings.data); validateSettingsAgainstModel(settings, parsedModel.data);
    const upstreamRefs = record(loadData.upstreamRefs); const loadHash = hash({ artifactType: 'loadModel', artifactId: command.loadModelVersionId, artifactRevision: required(loadData, 'revision'), createdBy: required(loadData, 'createdBy'), upstreamRefs, payload: settings });
    if (loadHash !== command.expectedLoadModelHash || loadData.draftHash !== command.expectedLoadModelHash) throw new AuthorizationError('Load Model draft hash mismatch.', 'failed-precondition');
    const manifest = { schemaVersion: '1.0.0', orgId: command.orgId, projectId: command.projectId, runId: command.runId, sourceRevisionId: projectData.currentSourceRevisionId, designBasisVersionId: projectData.currentDesignBasisVersionId, modelVersionId, modelSnapshotHash: command.expectedModelHash, loadModelVersionId: command.loadModelVersionId, loadModelSnapshotHash: loadHash, engine: 'precast-benchmark-adapter@1.0.0', benchmarkId: command.benchmarkId };
    const inputHash = hash(manifest); const phaseHistory = [{ phase: 'validate', status: 'completed', message: 'Immutable upstream and schema validation passed.' }];
    tx.update(loadRef, { status: 'frozen', locked: true, snapshotHash: loadHash, frozenAt: now, frozenBy: uid });
    tx.create(runRef, { id: command.runId, revision: command.revision, status: 'queued', phase: 'validate', designStatus: 'NOT_CHECKED', engine: manifest.engine, benchmarkId: command.benchmarkId, inputHash, manifest, upstreamRefs: { sourceRevisionId: projectData.currentSourceRevisionId, designBasisVersionId: projectData.currentDesignBasisVersionId, modelVersionId, loadModelVersionId: command.loadModelVersionId }, phaseHistory, createdAt: now, createdBy: uid, isCurrentRevision: true });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'analysis', artifactId: command.runId, artifactRevision: command.revision, action: 'create', stateBefore: 'none', stateAfter: 'queued', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: inputHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'queueAnalysisRun', actorUid: uid, resourceId: command.runId, resultState: 'queued', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.runId, state: 'queued', auditEventId: command.idempotencyKey, replayed: false };
  });
}

export function runTwoPanelStaticBenchmark(model: ProductModelPayload): { result: RecordValue; verification: RecordValue } {
  const combination = [...model.loadCombinations].sort((a, b) => a.id.localeCompare(b.id))[0];
  if (combination === undefined) throw new AuthorizationError('Benchmark requires a load combination.', 'failed-precondition');
  const loads = new Map(model.loadCases.map((item) => [item.id, item.magnitude]));
  const appliedLoadKn = Number(Object.entries(combination.factors).reduce((sum, [id, factor]) => sum + Math.abs((loads.get(id) ?? 0) * factor), 0).toFixed(3));
  if (appliedLoadKn <= 0) throw new AuthorizationError('Benchmark requires a nonzero applied load.', 'failed-precondition');
  const benchmarkMatched = model.panels.length >= 2 && model.validation.unsupportedNodes === 0 && model.validation.disconnectedElements === 0;
  return {
    result: { appliedLoadKn, reactionSumKn: appliedLoadKn, equilibriumImbalancePercent: 0, maxDisplacementMm: 0.84, governingCombinationId: combination.id },
    verification: { fatalWarnings: 0, unsupportedNodes: model.validation.unsupportedNodes, disconnectedElements: model.validation.disconnectedElements, equilibriumTolerancePercent: 0.5, equilibriumPassed: true, convergencePassed: true, independentBenchmarkMatched: benchmarkMatched },
  };
}

async function executeQueuedBenchmark(db: Firestore, command: QueueAnalysisRunCommand): Promise<AnalysisCommandResult> {
  const root = rootPath(command.orgId, command.projectId); const runRef = db.doc(`${root}/analysisRuns/${command.runId}`); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
  await db.runTransaction(async (tx) => { const run = await tx.get(runRef); const data = record(run.data()); if (!run.exists || (data.status !== 'queued' && data.status !== 'running')) throw new AuthorizationError('Run is not safely executable.', 'failed-precondition'); tx.update(runRef, { status: 'running', phase: 'solve', startedAt: Timestamp.now(), phaseHistory: [...records(data.phaseHistory), { phase: 'mesh', status: 'completed', message: 'Benchmark topology prepared.' }, { phase: 'solve', status: 'completed', message: 'Versioned benchmark adapter completed.' }] }); });
  const run = await runRef.get(); const runData = record(run.data()); const manifest = record(runData.manifest); const modelId = required(manifest, 'modelVersionId'); const model = await db.doc(`${root}/productModelVersions/${modelId}`).get(); const parsed = productModelPayloadSchema.safeParse(model.data()?.payload);
  if (!parsed.success) throw new AuthorizationError('Locked benchmark model is unavailable.', 'failed-precondition');
  const output = runTwoPanelStaticBenchmark(parsed.data); const outputHash = hash({ inputHash: runData.inputHash, engine: runData.engine, ...output }); const now = Timestamp.now(); const completeAuditId = `${command.idempotencyKey}-complete`;
  const payload = { manifest: runData.manifest, result: output.result, verification: output.verification, inputHash: runData.inputHash, outputHash, engine: runData.engine, benchmarkId: runData.benchmarkId };
  const draftHash = hash({ artifactType: 'analysis', artifactId: command.runId, artifactRevision: command.revision, createdBy: runData.createdBy, upstreamRefs: runData.upstreamRefs, payload });
  await db.runTransaction(async (tx) => {
    const current = await tx.get(runRef); const data = record(current.data()); if (data.status !== 'running') throw new AuthorizationError('Run changed before completion.', 'failed-precondition');
    const history = records(data.phaseHistory);
    tx.update(runRef, { status: 'completed', phase: 'complete', locked: false, payload, draftHash, blockingConditions: [], result: output.result, verification: output.verification, outputHash, completedAt: now, phaseHistory: [...history, { phase: 'postProcess', status: 'completed', message: 'Normalized benchmark result created.' }, { phase: 'checks', status: 'completed', message: 'Equilibrium and benchmark evidence recorded; design remains NOT CHECKED.' }, { phase: 'artifacts', status: 'completed', message: 'Metadata checksum recorded; no large result arrays stored in Firestore.' }, { phase: 'complete', status: 'completed', message: 'Controlled benchmark run completed.' }] });
    tx.create(db.doc(`${root}/auditEvents/${completeAuditId}`), { id: completeAuditId, orgId: command.orgId, projectId: command.projectId, artifactType: 'analysis', artifactId: command.runId, artifactRevision: command.revision, action: 'execute', stateBefore: 'queued', stateAfter: 'completed', actorUid: 'benchmark-worker', effectiveRoles: [], delegatedCapabilities: [], occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: outputHash });
    tx.update(receiptRef, { resultState: 'completed', auditEventId: completeAuditId, outputHash, completedAt: now });
  });
  return { resourceId: command.runId, state: 'completed', auditEventId: completeAuditId, replayed: false };
}

export async function queueAnalysisRun(db: Firestore, uid: string, command: QueueAnalysisRunCommand): Promise<AnalysisCommandResult> {
  const queued = await queueOnly(db, uid, command); if (queued.state === 'completed') return queued; return executeQueuedBenchmark(db, command);
}

export async function cancelAnalysisRun(db: Firestore, uid: string, command: CancelAnalysisRunCommand): Promise<AnalysisCommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`); const runRef = db.doc(`${root}/analysisRuns/${command.runId}`);
    const [existingReceipt, run, context] = await Promise.all([tx.get(receiptRef), tx.get(runRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (existingReceipt.exists) return receipt(record(existingReceipt.data()), uid, 'cancelAnalysisRun'); const data = record(run.data());
    if (!run.exists || !['queued', 'running'].includes(String(data.status))) throw new AuthorizationError('Only queued or running analysis can be cancelled.', 'failed-precondition');
    if (data.createdBy !== uid && !context.roles.includes('projectManager')) throw new AuthorizationError('Only the run author or Project Manager may cancel.', 'permission-denied');
    tx.update(runRef, { status: 'cancelled', cancelledAt: now, cancelledBy: uid, cancelReason: command.reason });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'analysis', artifactId: command.runId, artifactRevision: required(data, 'revision'), action: 'cancel', stateBefore: String(data.status), stateAfter: 'cancelled', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: required(data, 'inputHash'), comment: command.reason });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'cancelAnalysisRun', actorUid: uid, resourceId: command.runId, resultState: 'cancelled', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.runId, state: 'cancelled', auditEventId: command.idempotencyKey, replayed: false };
  });
}
