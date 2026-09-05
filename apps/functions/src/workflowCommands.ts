import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, type ArtifactType, type ArtifactUpstreamRefs, type PermissionContext, type ProductModelPayload, type ProjectRole } from '@precast/domain';
import { designBasisPayloadSchema, designCheckPayloadSchema, estimatePayloadSchema, priceBookSchema, productModelPayloadSchema, type ApproveArtifactCommand, type ArchiveProjectCommand, type CreateDesignBasisRevisionCommand, type CreateProductModelRevisionCommand, type CreateProjectCommand, type FreezeSourceRevisionCommand, type ReturnArtifactCommand, type SubmitArtifactCommand, type UpdateProjectCommand } from '@precast/schemas';
import { AuthorizationError, authorizeApproval } from './authorization';

const artifactCollections: Record<ArtifactType, string> = {
  sourceRevision: 'sourceRevisions',
  designBasis: 'designBasisVersions',
  productModel: 'productModelVersions',
  loadModel: 'loadModelVersions',
  analysis: 'analysisRuns',
  estimate: 'estimateVersions',
  calculation: 'calculationReports',
  drawingSet: 'drawingSets',
  releasePackage: 'releasePackages',
};

const approvalRoles: Record<ArtifactType, ProjectRole> = {
  sourceRevision: 'structuralEngineer',
  designBasis: 'engineeringChecker',
  productModel: 'engineeringChecker',
  loadModel: 'engineeringChecker',
  analysis: 'engineeringChecker',
  estimate: 'commercialApprover',
  calculation: 'engineeringChecker',
  drawingSet: 'engineeringChecker',
  releasePackage: 'engineeringChecker',
};

const upstreamProjectFields: Partial<Record<keyof ArtifactUpstreamRefs, string>> = {
  sourceRevisionId: 'currentSourceRevisionId',
  designBasisVersionId: 'currentDesignBasisVersionId',
  modelVersionId: 'currentModelVersionId',
  loadModelVersionId: 'currentLoadModelVersionId',
  analysisRunId: 'currentApprovedAnalysisRunId',
  calculationReportId: 'currentCalculationReportId',
  drawingSetId: 'currentDrawingSetId',
};

export interface CommandResult {
  resourceId: string;
  state: string;
  auditEventId: string;
  replayed: boolean;
}

interface SnapshotInput {
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  createdBy: string;
  upstreamRefs: ArtifactUpstreamRefs;
  payload: Record<string, unknown>;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' ? value as UnknownRecord : {};
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function computeArtifactSnapshotHash(input: SnapshotInput): string {
  return `sha256:${createHash('sha256').update(stable(input)).digest('hex')}`;
}

function projectRoot(orgId: string, projectId: string) {
  return `organizations/${orgId}/projects/${projectId}`;
}

function artifactPath(orgId: string, projectId: string, artifactType: ArtifactType, artifactId: string) {
  return `${projectRoot(orgId, projectId)}/${artifactCollections[artifactType]}/${artifactId}`;
}

function requiredString(data: UnknownRecord, field: string): string {
  const value = data[field];
  if (typeof value !== 'string' || value.length === 0) throw new AuthorizationError(`Artifact field ${field} is missing.`, 'failed-precondition');
  return value;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function assertSourceReady(data: UnknownRecord): void {
  if (data.scanState !== 'clean') throw new AuthorizationError('Source file remains quarantined until its scan state is clean.', 'failed-precondition');
  const validation = asRecord(data.validation);
  const checks = ['unitValid', 'coordinateValid', 'levelsValid', 'objectIdentityValid'];
  if (checks.some((check) => validation[check] !== true) || validation.duplicateGlobalIds !== 0) {
    throw new AuthorizationError('Source unit, coordinate, level, object identity, or duplicate-ID validation failed.', 'failed-precondition');
  }
  if (asStringArray(data.blockingConditions).length > 0) throw new AuthorizationError('Critical source issues require disposition before transition.', 'failed-precondition');
}

function assertDesignBasisReady(data: UnknownRecord): void {
  if (!designBasisPayloadSchema.safeParse(data.payload).success) {
    throw new AuthorizationError('Design Basis is incomplete or contains invalid engineering values.', 'failed-precondition');
  }
  if (asStringArray(data.blockingConditions).length > 0) throw new AuthorizationError('Design Basis has unresolved blocking conditions.', 'failed-precondition');
}

function assertProductModelReady(data: UnknownRecord): void {
  const result = productModelPayloadSchema.safeParse(data.payload);
  if (!result.success) throw new AuthorizationError('Product Model is incomplete or contains invalid geometry/topology references.', 'failed-precondition');
  if (Object.values(result.data.validation).some((value) => value !== 0)) throw new AuthorizationError('Product Model quality checks contain unresolved failures.', 'failed-precondition');
  if (result.data.joints.some((joint) => !joint.loadPathConfirmed)) throw new AuthorizationError('Every joint load path must be confirmed before G2 review.', 'failed-precondition');
  if (asStringArray(data.blockingConditions).length > 0) throw new AuthorizationError('Product Model has unresolved blocking conditions.', 'failed-precondition');
}

function assertAnalysisReady(data: UnknownRecord): void {
  const verification = asRecord(data.verification);
  if (data.phase !== 'complete' || data.outputHash === undefined || verification.fatalWarnings !== 0 || verification.unsupportedNodes !== 0 || verification.disconnectedElements !== 0 || verification.equilibriumPassed !== true || verification.convergencePassed !== true || verification.independentBenchmarkMatched !== true) {
    throw new AuthorizationError('G3 requires completed solver, model-quality, equilibrium, convergence and independent benchmark evidence.', 'failed-precondition');
  }
  if (asStringArray(data.blockingConditions).length > 0) throw new AuthorizationError('Analysis has unresolved blocking conditions.', 'failed-precondition');
}

function assertCalculationReady(data: UnknownRecord): void {
  const parsed = designCheckPayloadSchema.safeParse(data.payload);
  if (!parsed.success) throw new AuthorizationError('Design check register is incomplete or invalid.', 'failed-precondition');
  if (parsed.data.checks.some((check) => check.status === 'FAIL')) throw new AuthorizationError('Design checks contain FAIL results.', 'failed-precondition');
  if (parsed.data.checks.some((check) => check.status === 'NOT_CHECKED' && check.disposition === undefined)) throw new AuthorizationError('Every NOT CHECKED design item requires an explicit disposition.', 'failed-precondition');
  if (asStringArray(data.blockingConditions).length > 0) throw new AuthorizationError('Calculation has unresolved blocking conditions.', 'failed-precondition');
}

function assertEstimateReady(data: UnknownRecord): void {
  const parsed = estimatePayloadSchema.safeParse(data.payload);
  if (!parsed.success) throw new AuthorizationError('Estimate is incomplete or its server-calculated formulas are invalid.', 'failed-precondition');
  if (parsed.data.designDependencyStatus !== 'PASS') throw new AuthorizationError('G4 design dependency must be PASS before estimate review.', 'failed-precondition');
  if (parsed.data.lines.some((line) => line.rateStatus !== 'current')) throw new AuthorizationError('Missing, expired, or unit-mismatched rates must be resolved before estimate review.', 'failed-precondition');
  if (parsed.data.summary.grandTotal === null) throw new AuthorizationError('Estimate totals and uncertainty range are unavailable.', 'failed-precondition');
  if (asStringArray(data.blockingConditions).length > 0) throw new AuthorizationError('Estimate has unresolved blocking conditions.', 'failed-precondition');
}

async function assertCurrentPriceBook(tx: Transaction, db: Firestore, orgId: string, data: UnknownRecord): Promise<void> {
  const estimate = estimatePayloadSchema.parse(data.payload);
  const snapshot = await tx.get(db.doc(`organizations/${orgId}/priceBooks/${estimate.priceBookId}`));
  const book = priceBookSchema.safeParse(snapshot.data());
  if (!snapshot.exists || !book.success || book.data.status !== 'approved' || book.data.revision !== estimate.priceBookRevision) {
    throw new AuthorizationError('Estimate Price Book revision is no longer current and approved.', 'failed-precondition');
  }
}

const scenarioOrder = ['service', 'demould', 'lifting', 'transport', 'storage', 'installation', 'final'] as const;

export function canonicalizeProductModel(payload: ProductModelPayload): ProductModelPayload {
  const byId = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  return {
    ...payload,
    panels: byId(payload.panels).map((panel) => ({ ...panel, sourceObjectIds: [...panel.sourceObjectIds].sort(), openings: byId(panel.openings) })),
    joints: byId(payload.joints).map((joint) => ({ ...joint, panelIds: [...joint.panelIds].sort() as [string, string] })),
    anchors: byId(payload.anchors), supports: byId(payload.supports), loadCases: byId(payload.loadCases), loadCombinations: byId(payload.loadCombinations),
    stages: [...new Set(payload.stages)].sort((a, b) => scenarioOrder.indexOf(a) - scenarioOrder.indexOf(b)),
  };
}

function toMillis(value: unknown): number | undefined {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const millis = Date.parse(value);
    return Number.isNaN(millis) ? undefined : millis;
  }
  return undefined;
}

async function loadPermissionContext(
  tx: Transaction,
  db: Firestore,
  actorUid: string,
  orgId: string,
  projectId: string,
  now: Timestamp,
): Promise<PermissionContext> {
  const orgMemberRef = db.doc(`organizations/${orgId}/members/${actorUid}`);
  const projectMemberRef = db.doc(`${projectRoot(orgId, projectId)}/members/${actorUid}`);
  const [orgMember, projectMember] = await Promise.all([tx.get(orgMemberRef), tx.get(projectMemberRef)]);
  const orgMemberData = asRecord(orgMember.data());
  if (!orgMember.exists || orgMemberData.status !== 'active') throw new AuthorizationError('Active organization membership is required.', 'permission-denied');
  if (!projectMember.exists) throw new AuthorizationError('Active project membership is required.', 'permission-denied');
  const data = asRecord(projectMember.data());
  const effectiveFrom = toMillis(data.effectiveFrom);
  const expiresAt = toMillis(data.expiresAt);
  if (data.status !== 'active' || effectiveFrom === undefined || effectiveFrom > now.toMillis() || (expiresAt !== undefined && expiresAt <= now.toMillis())) {
    throw new AuthorizationError('Project membership is inactive, not yet effective, or expired.', 'permission-denied');
  }
  return {
    userId: actorUid,
    orgId,
    projectId,
    roles: asStringArray(data.roles) as ProjectRole[],
    capabilities: asStringArray(data.capabilities),
    membershipStatus: 'active',
    ...(expiresAt === undefined ? {} : { expiresAt: new Date(expiresAt).toISOString() }),
  };
}

function snapshotInput(artifactType: ArtifactType, artifactId: string, data: UnknownRecord): SnapshotInput {
  const upstream = data.upstreamRefs;
  return {
    artifactType,
    artifactId,
    artifactRevision: requiredString(data, 'revision'),
    createdBy: requiredString(data, 'createdBy'),
    upstreamRefs: upstream !== null && typeof upstream === 'object' ? upstream : {},
    payload: data.payload !== null && typeof data.payload === 'object' ? data.payload as Record<string, unknown> : {},
  };
}

function assertCurrentUpstreams(snapshot: UnknownRecord, project: UnknownRecord): void {
  const upstreams = snapshot.upstreamRefs;
  if (upstreams === null || typeof upstreams !== 'object') return;
  for (const [upstreamKey, projectField] of Object.entries(upstreamProjectFields)) {
    const snapshotValue = (upstreams as Record<string, unknown>)[upstreamKey];
    if (typeof snapshotValue === 'string' && project[projectField] !== snapshotValue) {
      throw new AuthorizationError(`Upstream ${upstreamKey} is stale or mismatched.`, 'failed-precondition');
    }
  }
}

function replayedReceipt(data: UnknownRecord, actorUid: string, commandName: string): CommandResult {
  if (data.actorUid !== actorUid || data.commandName !== commandName) throw new AuthorizationError('Idempotency key was already used by another command.', 'failed-precondition');
  return {
    resourceId: requiredString(data, 'resourceId'),
    state: requiredString(data, 'resultState'),
    auditEventId: requiredString(data, 'auditEventId'),
    replayed: true,
  };
}

export async function submitArtifact(db: Firestore, actorUid: string, command: SubmitArtifactCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const root = projectRoot(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const artifactRef = db.doc(artifactPath(command.orgId, command.projectId, command.artifactType, command.artifactId));
    const projectRef = db.doc(root);
    const [receipt, artifact, project, context] = await Promise.all([
      tx.get(receiptRef),
      tx.get(artifactRef),
      tx.get(projectRef),
      loadPermissionContext(tx, db, actorUid, command.orgId, command.projectId, now),
    ]);
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, 'submitArtifact');
    if (!artifact.exists || !project.exists) throw new AuthorizationError('Project or artifact does not exist.', 'failed-precondition');
    const data = asRecord(artifact.data());
    const decision = can('submit', command.artifactType, { ...context, artifactStatus: requiredString(data, 'status'), artifactCreatedBy: requiredString(data, 'createdBy'), isCurrentRevision: data.isCurrentRevision !== false });
    if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Submission denied.', 'permission-denied');
    const sourceStatus = requiredString(data, 'status');
    if (!['draft', 'returned'].includes(sourceStatus) && !(command.artifactType === 'analysis' && sourceStatus === 'completed')) throw new AuthorizationError('Only a draft, returned artifact, or completed analysis can be submitted.', 'failed-precondition');
    if (command.artifactType === 'sourceRevision') assertSourceReady(data);
    if (command.artifactType === 'designBasis') assertDesignBasisReady(data);
    if (command.artifactType === 'productModel') assertProductModelReady(data);
    if (command.artifactType === 'analysis') assertAnalysisReady(data);
    if (command.artifactType === 'calculation') assertCalculationReady(data);
    if (command.artifactType === 'estimate') assertEstimateReady(data);
    const input = snapshotInput(command.artifactType, command.artifactId, data);
    const snapshotHash = computeArtifactSnapshotHash(input);
    if (snapshotHash !== command.expectedDraftHash) throw new AuthorizationError('Draft changed after the client review; refresh before submitting.', 'failed-precondition');
    assertCurrentUpstreams({ upstreamRefs: input.upstreamRefs }, asRecord(project.data()));
    if (command.artifactType === 'estimate') await assertCurrentPriceBook(tx, db, command.orgId, data);

    const requestRef = db.doc(`${root}/approvalRequests/${command.requestId}`);
    const snapshotRef = db.doc(`${root}/approvalSnapshots/${command.requestId}`);
    const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    tx.create(snapshotRef, { ...input, id: command.requestId, orgId: command.orgId, projectId: command.projectId, snapshotHash, capturedAt: now, capturedBy: actorUid });
    tx.create(requestRef, {
      id: command.requestId, orgId: command.orgId, projectId: command.projectId, artifactType: command.artifactType,
      artifactId: command.artifactId, artifactRevision: input.artifactRevision, snapshotHash, requestedAction: 'approve',
      requiredRole: approvalRoles[command.artifactType], ...(command.assignedTo === undefined ? {} : { assignedTo: command.assignedTo }),
      status: 'open', requestedBy: actorUid, requestedAt: now, ...(command.dueAt === undefined ? {} : { dueAt: Timestamp.fromDate(new Date(command.dueAt)) }),
      blockingConditions: asStringArray(data.blockingConditions),
    });
    tx.update(artifactRef, { status: 'submitted', snapshotHash, activeApprovalRequestId: command.requestId, submittedBy: actorUid, submittedAt: now });
    tx.create(auditRef, {
      id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: command.artifactType,
      artifactId: command.artifactId, artifactRevision: input.artifactRevision, action: 'submit', stateBefore: requiredString(data, 'status'),
      stateAfter: 'submitted', actorUid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities,
      occurredAt: now, requestId: command.requestId, idempotencyKey: command.idempotencyKey, snapshotHash,
    });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'submitArtifact', actorUid, resourceId: command.requestId, resultState: 'submitted', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.requestId, state: 'submitted', auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function approveArtifact(db: Firestore, actorUid: string, command: ApproveArtifactCommand): Promise<CommandResult> {
  return decideArtifact(db, actorUid, command, 'approve');
}

export async function returnArtifact(db: Firestore, actorUid: string, command: ReturnArtifactCommand): Promise<CommandResult> {
  return decideArtifact(db, actorUid, command, 'return');
}

async function decideArtifact(
  db: Firestore,
  actorUid: string,
  command: ApproveArtifactCommand | ReturnArtifactCommand,
  decisionName: 'approve' | 'return',
): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const root = projectRoot(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const requestRef = db.doc(`${root}/approvalRequests/${command.requestId}`);
    const snapshotRef = db.doc(`${root}/approvalSnapshots/${command.requestId}`);
    const artifactRef = db.doc(artifactPath(command.orgId, command.projectId, command.artifactType, command.artifactId));
    const projectRef = db.doc(root);
    const [receipt, request, snapshot, artifact, project, context] = await Promise.all([
      tx.get(receiptRef), tx.get(requestRef), tx.get(snapshotRef), tx.get(artifactRef), tx.get(projectRef),
      loadPermissionContext(tx, db, actorUid, command.orgId, command.projectId, now),
    ]);
    const commandName = decisionName === 'approve' ? 'approveArtifact' : 'returnArtifact';
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, commandName);
    if (!request.exists || !snapshot.exists || !artifact.exists || !project.exists) throw new AuthorizationError('Approval request, snapshot, project, or artifact is missing.', 'failed-precondition');
    const requestData = asRecord(request.data());
    const snapshotData = asRecord(snapshot.data());
    const artifactData = asRecord(artifact.data());
    if (requestData.status !== 'open' || requestData.artifactType !== command.artifactType || requestData.artifactId !== command.artifactId) throw new AuthorizationError('Approval request is not open or does not match the artifact.', 'failed-precondition');
    if (requestData.snapshotHash !== command.snapshotHash || snapshotData.snapshotHash !== command.snapshotHash || artifactData.snapshotHash !== command.snapshotHash) throw new AuthorizationError('Immutable snapshot hash mismatch.', 'failed-precondition');
    assertCurrentUpstreams(snapshotData, asRecord(project.data()));
    if (command.artifactType === 'estimate') await assertCurrentPriceBook(tx, db, command.orgId, artifactData);

    if (decisionName === 'approve') {
      authorizeApproval(context, {
        id: command.artifactId, type: command.artifactType, status: requiredString(artifactData, 'status'),
        createdBy: requiredString(artifactData, 'createdBy'), snapshotHash: command.snapshotHash,
        isCurrentRevision: artifactData.isCurrentRevision !== false,
        blockingConditions: [...asStringArray(artifactData.blockingConditions), ...asStringArray(requestData.blockingConditions)],
      });
    } else {
      const review = can('review', command.artifactType, { ...context, artifactStatus: requiredString(artifactData, 'status'), artifactCreatedBy: requiredString(artifactData, 'createdBy'), isCurrentRevision: artifactData.isCurrentRevision !== false });
      if (!review.allowed) throw new AuthorizationError(review.reason ?? 'Return decision denied.', 'permission-denied');
      if (command.comment === undefined || command.comment.trim().length === 0) throw new AuthorizationError('Return for correction requires a comment.', 'failed-precondition');
    }

    const nextState = decisionName === 'approve' ? 'approved' : 'draft';
    const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    tx.update(artifactRef, decisionName === 'approve'
      ? command.artifactType === 'sourceRevision'
        ? { status: nextState, locked: false, reviewedBy: actorUid, reviewedAt: now }
        : { status: nextState, locked: true, approvedBy: actorUid, approvedAt: now }
      : { status: nextState, returnedForCorrection: true, returnedBy: actorUid, returnedAt: now });
    tx.update(requestRef, { status: decisionName === 'approve' ? 'approved' : 'returned', decidedBy: actorUid, decidedAt: now, ...(command.comment === undefined ? {} : { decisionComment: command.comment }) });
    tx.create(auditRef, {
      id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: command.artifactType,
      artifactId: command.artifactId, artifactRevision: requiredString(artifactData, 'revision'), action: decisionName,
      stateBefore: requiredString(artifactData, 'status'), stateAfter: nextState, actorUid, effectiveRoles: context.roles,
      delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.requestId,
      idempotencyKey: command.idempotencyKey, snapshotHash: command.snapshotHash,
      ...(command.comment === undefined ? {} : { comment: command.comment }),
    });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName, actorUid, resourceId: command.artifactId, resultState: nextState, auditEventId: command.idempotencyKey, createdAt: now });
    if (decisionName === 'approve' && command.artifactType === 'designBasis') {
      tx.update(projectRef, {
        currentDesignBasisVersionId: command.artifactId,
        currentStage: 'panelization',
        'gateStates.G1': 'approved',
        updatedAt: now,
        updatedBy: actorUid,
      });
    }
    if (decisionName === 'approve' && command.artifactType === 'productModel') {
      tx.update(projectRef, {
        currentModelVersionId: command.artifactId,
        currentStage: 'analysis',
        'gateStates.G2': 'approved',
        'gateStates.G3': 'inProgress',
        updatedAt: now,
        updatedBy: actorUid,
      });
    }
    if (decisionName === 'approve' && command.artifactType === 'analysis') {
      tx.update(projectRef, { currentApprovedAnalysisRunId: command.artifactId, currentStage: 'design', 'gateStates.G3': 'approved', 'gateStates.G4': 'inProgress', updatedAt: now, updatedBy: actorUid });
    }
    if (decisionName === 'approve' && command.artifactType === 'calculation') {
      tx.update(projectRef, { currentCalculationReportId: command.artifactId, 'gateStates.G4': 'approved', updatedAt: now, updatedBy: actorUid });
    }
    if (decisionName === 'approve' && command.artifactType === 'estimate') {
      tx.update(projectRef, { currentEstimateVersionId: command.artifactId, 'gateStates.G5': 'approved', updatedAt: now, updatedBy: actorUid });
    }
    return { resourceId: command.artifactId, state: nextState, auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function createType2Project(db: Firestore, actorUid: string, command: CreateProjectCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const receiptRef = db.doc(`organizations/${command.orgId}/commandReceipts/${command.idempotencyKey}`);
    const orgMemberRef = db.doc(`organizations/${command.orgId}/members/${actorUid}`);
    const projectRef = db.doc(projectRoot(command.orgId, command.projectId));
    const [receipt, orgMember, project] = await Promise.all([tx.get(receiptRef), tx.get(orgMemberRef), tx.get(projectRef)]);
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, 'createProject');
    const memberData = asRecord(orgMember.data());
    if (!orgMember.exists || memberData.status !== 'active') throw new AuthorizationError('Active organization membership is required.', 'permission-denied');
    const orgRoles = asStringArray(memberData.orgRoles);
    const capabilities = asStringArray(memberData.capabilities);
    if (!orgRoles.includes('orgAdmin') && !capabilities.includes('createProject')) throw new AuthorizationError('Project creation requires organization administration or delegated createProject capability.', 'permission-denied');
    if (project.exists) throw new AuthorizationError('Project ID already exists.', 'failed-precondition');

    const memberRef = db.doc(`${projectRoot(command.orgId, command.projectId)}/members/${actorUid}`);
    const auditRef = db.doc(`${projectRoot(command.orgId, command.projectId)}/auditEvents/${command.idempotencyKey}`);
    tx.create(projectRef, {
      id: command.projectId, orgId: command.orgId, code: command.code, name: command.name, productFamilyId: 'type-2-residential',
      templateId: command.templateId, templateVersion: '1.0.0', status: 'active', currentStage: 'intake',
      gateStates: { G0: 'notStarted', G1: 'notStarted', G2: 'notStarted', G3: 'notStarted', G4: 'notStarted', G5: 'notStarted', G6: 'notStarted', G7: 'notStarted' },
      assignedUserIds: [actorUid], createdAt: now, createdBy: actorUid, updatedAt: now, updatedBy: actorUid,
    });
    tx.create(memberRef, { uid: actorUid, orgId: command.orgId, projectId: command.projectId, status: 'active', roles: ['projectManager'], capabilities: [], effectiveFrom: now, invitedBy: actorUid, updatedAt: now, updatedBy: actorUid });
    tx.update(orgMemberRef, { projectIds: FieldValue.arrayUnion(command.projectId), updatedAt: now, updatedBy: actorUid });
    tx.create(auditRef, { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'sourceRevision', artifactId: command.projectId, artifactRevision: 'PROJECT-INITIAL', action: 'create', stateBefore: 'none', stateAfter: 'active', actorUid, effectiveRoles: [], delegatedCapabilities: capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: `template:${command.templateId}@1.0.0` });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createProject', actorUid, resourceId: command.projectId, resultState: 'active', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.projectId, state: 'active', auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function freezeSourceRevision(db: Firestore, actorUid: string, command: FreezeSourceRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const root = projectRoot(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const sourceRef = db.doc(`${root}/sourceRevisions/${command.sourceRevisionId}`);
    const projectRef = db.doc(root);
    const openCriticalIssuesQuery = db.collection(`${root}/issues`)
      .where('artifactType', '==', 'sourceRevision')
      .where('artifactId', '==', command.sourceRevisionId)
      .where('severity', '==', 'critical')
      .where('status', '==', 'open');
    const [receipt, source, project, openCriticalIssues, context] = await Promise.all([
      tx.get(receiptRef), tx.get(sourceRef), tx.get(projectRef),
      tx.get(openCriticalIssuesQuery),
      loadPermissionContext(tx, db, actorUid, command.orgId, command.projectId, now),
    ]);
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, 'freezeSourceRevision');
    if (!source.exists || !project.exists) throw new AuthorizationError('Project or source revision does not exist.', 'failed-precondition');
    if (!context.roles.includes('projectManager')) {
      throw new AuthorizationError('Only the Project Manager can freeze Gate G0.', 'permission-denied');
    }
    const sourceData = asRecord(source.data());
    if (sourceData.status !== 'approved') throw new AuthorizationError('Structural suitability must be independently approved before Gate G0 freeze.', 'failed-precondition');
    if (sourceData.snapshotHash !== command.expectedSnapshotHash) throw new AuthorizationError('Source snapshot hash mismatch.', 'failed-precondition');
    assertSourceReady(sourceData);
    if (!openCriticalIssues.empty) throw new AuthorizationError('Open critical source issues require resolution or an accepted exception before Gate G0 freeze.', 'failed-precondition');

    const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    tx.update(sourceRef, { status: 'accepted', locked: true, frozenBy: actorUid, frozenAt: now });
    tx.update(projectRef, {
      currentSourceRevisionId: command.sourceRevisionId,
      currentStage: 'designBasis',
      'gateStates.G0': 'approved',
      'gateStates.G1': 'inProgress',
      updatedAt: now,
      updatedBy: actorUid,
    });
    tx.create(auditRef, {
      id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'sourceRevision',
      artifactId: command.sourceRevisionId, artifactRevision: requiredString(sourceData, 'revision'), action: 'freeze',
      stateBefore: 'approved', stateAfter: 'accepted', actorUid, effectiveRoles: context.roles,
      delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey, snapshotHash: command.expectedSnapshotHash,
    });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'freezeSourceRevision', actorUid, resourceId: command.sourceRevisionId, resultState: 'accepted', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.sourceRevisionId, state: 'accepted', auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function createDesignBasisRevision(db: Firestore, actorUid: string, command: CreateDesignBasisRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const root = projectRoot(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const projectRef = db.doc(root);
    const designBasisRef = db.doc(`${root}/designBasisVersions/${command.designBasisId}`);
    const previousRef = command.supersedesId === undefined ? undefined : db.doc(`${root}/designBasisVersions/${command.supersedesId}`);
    const [receipt, project, designBasis, previous, context] = await Promise.all([
      tx.get(receiptRef), tx.get(projectRef), tx.get(designBasisRef),
      previousRef === undefined ? Promise.resolve(undefined) : tx.get(previousRef),
      loadPermissionContext(tx, db, actorUid, command.orgId, command.projectId, now),
    ]);
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, 'createDesignBasisRevision');
    if (!project.exists) throw new AuthorizationError('Project does not exist.', 'failed-precondition');
    if (designBasis.exists) throw new AuthorizationError('Design Basis revision ID already exists.', 'failed-precondition');
    const createDecision = can('create', 'designBasis', context);
    if (!createDecision.allowed) throw new AuthorizationError(createDecision.reason ?? 'Design Basis creation denied.', 'permission-denied');
    const projectData = asRecord(project.data());
    const gateStates = asRecord(projectData.gateStates);
    if (gateStates.G0 !== 'approved') throw new AuthorizationError('Gate G0 must be frozen before creating a Design Basis revision.', 'failed-precondition');
    const sourceRevisionId = requiredString(projectData, 'currentSourceRevisionId');
    if (command.supersedesId !== undefined) {
      if (previous === undefined || !previous.exists || projectData.currentDesignBasisVersionId !== command.supersedesId) throw new AuthorizationError('Only the current Design Basis can be superseded.', 'failed-precondition');
      const previousData = asRecord(previous.data());
      if (previousData.locked !== true || previousData.status !== 'approved') throw new AuthorizationError('Only an approved, locked Design Basis can be superseded.', 'failed-precondition');
    }

    const input: SnapshotInput = {
      artifactType: 'designBasis', artifactId: command.designBasisId, artifactRevision: command.revision,
      createdBy: actorUid, upstreamRefs: { sourceRevisionId }, payload: command.payload,
    };
    const draftHash = computeArtifactSnapshotHash(input);
    const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    tx.create(designBasisRef, {
      id: command.designBasisId, revision: command.revision, status: 'draft', locked: false, createdBy: actorUid,
      isCurrentRevision: true, upstreamRefs: { sourceRevisionId }, payload: command.payload, blockingConditions: [],
      draftHash, ...(command.supersedesId === undefined ? {} : { supersedesId: command.supersedesId }), createdAt: now, updatedAt: now, updatedBy: actorUid,
    });
    if (previousRef !== undefined) tx.update(previousRef, { status: 'superseded', isCurrentRevision: false, supersededBy: command.designBasisId, supersededAt: now });
    tx.update(projectRef, {
      currentDesignBasisVersionId: command.designBasisId,
      currentStage: 'designBasis',
      'gateStates.G1': 'inProgress',
      updatedAt: now,
      updatedBy: actorUid,
      ...(command.supersedesId === undefined ? {} : { downstreamState: 'outOfDate' }),
    });
    tx.create(auditRef, {
      id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'designBasis', artifactId: command.designBasisId,
      artifactRevision: command.revision, action: command.supersedesId === undefined ? 'create' : 'supersede', stateBefore: command.supersedesId === undefined ? 'none' : 'approved', stateAfter: 'draft',
      actorUid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey, snapshotHash: draftHash,
    });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createDesignBasisRevision', actorUid, resourceId: command.designBasisId, resultState: 'draft', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.designBasisId, state: 'draft', auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function createProductModelRevision(db: Firestore, actorUid: string, command: CreateProductModelRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const root = projectRoot(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const projectRef = db.doc(root);
    const modelRef = db.doc(`${root}/productModelVersions/${command.modelVersionId}`);
    const previousRef = command.supersedesId === undefined ? undefined : db.doc(`${root}/productModelVersions/${command.supersedesId}`);
    const [receipt, project, model, previous, context] = await Promise.all([
      tx.get(receiptRef), tx.get(projectRef), tx.get(modelRef), previousRef === undefined ? Promise.resolve(undefined) : tx.get(previousRef),
      loadPermissionContext(tx, db, actorUid, command.orgId, command.projectId, now),
    ]);
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, 'createProductModelRevision');
    if (!project.exists) throw new AuthorizationError('Project does not exist.', 'failed-precondition');
    if (model.exists) throw new AuthorizationError('Product Model version ID already exists.', 'failed-precondition');
    const createDecision = can('create', 'productModel', context);
    if (!createDecision.allowed) throw new AuthorizationError(createDecision.reason ?? 'Product Model creation denied.', 'permission-denied');
    const projectData = asRecord(project.data());
    const gateStates = asRecord(projectData.gateStates);
    if (gateStates.G0 !== 'approved' || gateStates.G1 !== 'approved') throw new AuthorizationError('G0 and G1 must be approved before creating a Product Model.', 'failed-precondition');
    const sourceRevisionId = requiredString(projectData, 'currentSourceRevisionId');
    const designBasisVersionId = requiredString(projectData, 'currentDesignBasisVersionId');
    const sourceRef = db.doc(`${root}/sourceRevisions/${sourceRevisionId}`);
    const designBasisRef = db.doc(`${root}/designBasisVersions/${designBasisVersionId}`);
    const [source, designBasis] = await Promise.all([tx.get(sourceRef), tx.get(designBasisRef)]);
    const sourceData = asRecord(source.data());
    const designBasisData = asRecord(designBasis.data());
    if (!source.exists || sourceData.status !== 'accepted' || sourceData.locked !== true) throw new AuthorizationError('The current Source Revision must be accepted and locked.', 'failed-precondition');
    if (!designBasis.exists || designBasisData.status !== 'approved' || designBasisData.locked !== true) throw new AuthorizationError('The current Design Basis must be approved and locked.', 'failed-precondition');
    if (command.supersedesId !== undefined) {
      if (previous === undefined || !previous.exists || projectData.currentModelVersionId !== command.supersedesId) throw new AuthorizationError('Only the current Product Model can be superseded.', 'failed-precondition');
      const previousData = asRecord(previous.data());
      if (previousData.status !== 'approved' || previousData.locked !== true) throw new AuthorizationError('Only an approved, locked Product Model can be superseded.', 'failed-precondition');
    }
    const payload = canonicalizeProductModel(command.payload);
    const input: SnapshotInput = { artifactType: 'productModel', artifactId: command.modelVersionId, artifactRevision: command.revision, createdBy: actorUid, upstreamRefs: { sourceRevisionId, designBasisVersionId }, payload: payload as unknown as Record<string, unknown> };
    const draftHash = computeArtifactSnapshotHash(input);
    const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    tx.create(modelRef, { id: command.modelVersionId, revision: command.revision, status: 'draft', locked: false, createdBy: actorUid, isCurrentRevision: true, upstreamRefs: input.upstreamRefs, payload, blockingConditions: [], draftHash, ...(command.supersedesId === undefined ? {} : { supersedesId: command.supersedesId }), createdAt: now, updatedAt: now, updatedBy: actorUid });
    if (previousRef !== undefined) tx.update(previousRef, { status: 'superseded', isCurrentRevision: false, supersededBy: command.modelVersionId, supersededAt: now });
    tx.update(projectRef, { currentModelVersionId: command.modelVersionId, currentStage: 'panelization', 'gateStates.G2': 'inProgress', updatedAt: now, updatedBy: actorUid, ...(command.supersedesId === undefined ? {} : { downstreamState: 'outOfDate' }) });
    tx.create(auditRef, { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'productModel', artifactId: command.modelVersionId, artifactRevision: command.revision, action: command.supersedesId === undefined ? 'create' : 'supersede', stateBefore: command.supersedesId === undefined ? 'none' : 'approved', stateAfter: 'draft', actorUid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: draftHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createProductModelRevision', actorUid, resourceId: command.modelVersionId, resultState: 'draft', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.modelVersionId, state: 'draft', auditEventId: command.idempotencyKey, replayed: false };
  });
}

async function mutateProject(
  db: Firestore,
  actorUid: string,
  command: UpdateProjectCommand | ArchiveProjectCommand,
  commandName: 'updateProject' | 'archiveProject',
): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const root = projectRoot(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const projectRef = db.doc(root);
    const orgMemberRef = db.doc(`organizations/${command.orgId}/members/${actorUid}`);
    const [receipt, project, orgMember, context] = await Promise.all([
      tx.get(receiptRef), tx.get(projectRef), tx.get(orgMemberRef),
      loadPermissionContext(tx, db, actorUid, command.orgId, command.projectId, now),
    ]);
    if (receipt.exists) return replayedReceipt(asRecord(receipt.data()), actorUid, commandName);
    if (!project.exists) throw new AuthorizationError('Project does not exist.', 'failed-precondition');
    const orgRoles = asStringArray(asRecord(orgMember.data()).orgRoles);
    if (!context.roles.includes('projectManager') && !orgRoles.includes('orgAdmin') && !context.capabilities.includes('editProject')) {
      throw new AuthorizationError('Project update requires Project Manager or Organization Admin authority.', 'permission-denied');
    }
    const projectData = asRecord(project.data());
    if (projectData.status === 'archived') throw new AuthorizationError('Archived projects are immutable.', 'failed-precondition');
    const nextState = commandName === 'archiveProject' ? 'archived' : (command as UpdateProjectCommand).status;
    const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    if (commandName === 'archiveProject') {
      tx.update(projectRef, { status: 'archived', archivedAt: now, archivedBy: actorUid, archiveReason: (command as ArchiveProjectCommand).reason, updatedAt: now, updatedBy: actorUid });
    } else {
      const update = command as UpdateProjectCommand;
      tx.update(projectRef, { code: update.code, name: update.name, status: update.status, dueAt: update.dueAt === undefined ? FieldValue.delete() : Timestamp.fromDate(new Date(update.dueAt)), updatedAt: now, updatedBy: actorUid });
    }
    tx.create(auditRef, {
      id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'sourceRevision', artifactId: command.projectId,
      artifactRevision: 'PROJECT', action: commandName === 'archiveProject' ? 'archive' : 'editDraft', stateBefore: String(projectData.status), stateAfter: nextState,
      actorUid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey,
      idempotencyKey: command.idempotencyKey, snapshotHash: `project:${command.projectId}:${command.idempotencyKey}`,
      ...('reason' in command ? { comment: command.reason } : {}),
    });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName, actorUid, resourceId: command.projectId, resultState: nextState, auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.projectId, state: nextState, auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function updateProject(db: Firestore, actorUid: string, command: UpdateProjectCommand): Promise<CommandResult> {
  return mutateProject(db, actorUid, command, 'updateProject');
}

export async function archiveProject(db: Firestore, actorUid: string, command: ArchiveProjectCommand): Promise<CommandResult> {
  return mutateProject(db, actorUid, command, 'archiveProject');
}
