import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, type ArtifactType, type ArtifactUpstreamRefs, type PermissionContext, type ProjectRole } from '@precast/domain';
import type { ApproveArtifactCommand, CreateProjectCommand, ReturnArtifactCommand, SubmitArtifactCommand } from '@precast/schemas';
import { AuthorizationError, authorizeApproval } from './authorization';

const artifactCollections: Record<ArtifactType, string> = {
  sourceRevision: 'sourceRevisions',
  designBasis: 'designBasisVersions',
  analysis: 'analysisRuns',
  estimate: 'estimateVersions',
  calculation: 'calculationReports',
  drawingSet: 'drawingSets',
  releasePackage: 'releasePackages',
};

const approvalRoles: Record<ArtifactType, ProjectRole> = {
  sourceRevision: 'structuralEngineer',
  designBasis: 'engineeringChecker',
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
    if (!['draft', 'returned'].includes(requiredString(data, 'status'))) throw new AuthorizationError('Only a draft or returned artifact can be submitted.', 'failed-precondition');
    const input = snapshotInput(command.artifactType, command.artifactId, data);
    const snapshotHash = computeArtifactSnapshotHash(input);
    if (snapshotHash !== command.expectedDraftHash) throw new AuthorizationError('Draft changed after the client review; refresh before submitting.', 'failed-precondition');
    assertCurrentUpstreams({ upstreamRefs: input.upstreamRefs }, asRecord(project.data()));

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
      ? { status: nextState, locked: true, approvedBy: actorUid, approvedAt: now }
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
