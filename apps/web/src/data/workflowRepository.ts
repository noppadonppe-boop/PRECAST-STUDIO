import { collection, doc, limit, onSnapshot, orderBy, query, setDoc, Timestamp, where, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable } from 'firebase/storage';
import type { ApprovalRequest, ArtifactType, AuditEvent, DesignBasisPayload, ProjectRecord, SourceValidationSummary } from '@precast/domain';
import { sourceFileSchema } from '@precast/schemas';
import { firebaseAuth, firestore, functions, storage } from '../firebase/client';

function iso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return typeof value === 'string' ? value : new Date(0).toISOString();
}

function approvalRequest(data: DocumentData): ApprovalRequest {
  return {
    id: String(data.id), orgId: String(data.orgId), projectId: String(data.projectId), artifactType: data.artifactType as ArtifactType,
    artifactId: String(data.artifactId), artifactRevision: String(data.artifactRevision), snapshotHash: String(data.snapshotHash),
    requestedAction: data.requestedAction as ApprovalRequest['requestedAction'], requiredRole: data.requiredRole as ApprovalRequest['requiredRole'],
    ...(typeof data.assignedTo === 'string' ? { assignedTo: data.assignedTo } : {}), status: data.status as ApprovalRequest['status'],
    requestedBy: String(data.requestedBy), requestedAt: iso(data.requestedAt), ...(data.dueAt === undefined ? {} : { dueAt: iso(data.dueAt) }),
    blockingConditions: Array.isArray(data.blockingConditions) ? data.blockingConditions.filter((item): item is string => typeof item === 'string') : [],
  };
}

export function watchApprovalInbox(orgId: string, projectIds: string[], uid: string, onValue: (requests: ApprovalRequest[]) => void, onError: (error: Error) => void): Unsubscribe {
  const byProject = new Map<string, ApprovalRequest[]>();
  const unsubscribes = projectIds.map((projectId) => onSnapshot(
    query(collection(firestore, `organizations/${orgId}/projects/${projectId}/approvalRequests`), where('assignedTo', '==', uid), where('status', '==', 'open')),
    (snapshot) => {
      byProject.set(projectId, snapshot.docs.map((item) => approvalRequest(item.data())));
      onValue([...byProject.values()].flat().sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)));
    },
    onError,
  ));
  return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
}

export function watchAuditEvents(orgId: string, projectId: string, onValue: (events: AuditEvent[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(firestore, `organizations/${orgId}/projects/${projectId}/auditEvents`), orderBy('occurredAt', 'desc'), limit(50)), (snapshot) => {
    onValue(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id, orgId, projectId, artifactType: data.artifactType as ArtifactType, artifactId: String(data.artifactId),
        artifactRevision: String(data.artifactRevision), action: data.action as AuditEvent['action'], stateBefore: String(data.stateBefore),
        stateAfter: String(data.stateAfter), actorUid: String(data.actorUid), effectiveRoles: Array.isArray(data.effectiveRoles) ? data.effectiveRoles : [],
        delegatedCapabilities: Array.isArray(data.delegatedCapabilities) ? data.delegatedCapabilities : [], occurredAt: iso(data.occurredAt),
        requestId: String(data.requestId), idempotencyKey: String(data.idempotencyKey), snapshotHash: String(data.snapshotHash),
        ...(typeof data.comment === 'string' ? { comment: data.comment } : {}),
      };
    }));
  }, onError);
}

export function watchProjects(orgId: string, projectIds: string[], onValue: (projects: ProjectRecord[]) => void, onError: (error: Error) => void): Unsubscribe {
  const records = new Map<string, ProjectRecord>();
  const unsubscribes = projectIds.map((projectId) => onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}`), (snapshot) => {
    if (!snapshot.exists()) { records.delete(projectId); onValue([...records.values()]); return; }
    const data = snapshot.data() as Record<string, unknown>;
    const gateStates = data.gateStates !== null && typeof data.gateStates === 'object' ? data.gateStates as ProjectRecord['gateStates'] : {};
    const assignedUserIds = Array.isArray(data.assignedUserIds) ? data.assignedUserIds.filter((item): item is string => typeof item === 'string') : [];
    records.set(projectId, {
      id: projectId, orgId, code: String(data.code), name: String(data.name), status: data.status as ProjectRecord['status'], currentStage: String(data.currentStage),
      gateStates, assignedUserIds,
      ...(typeof data.productFamilyId === 'string' ? { productFamilyId: data.productFamilyId } : {}),
      ...(typeof data.currentSourceRevisionId === 'string' ? { currentSourceRevisionId: data.currentSourceRevisionId } : {}),
      ...(typeof data.currentDesignBasisVersionId === 'string' ? { currentDesignBasisVersionId: data.currentDesignBasisVersionId } : {}),
      ...(data.dueAt === undefined ? {} : { dueAt: iso(data.dueAt) }), ...(data.updatedAt === undefined ? {} : { updatedAt: iso(data.updatedAt) }),
    });
    onValue([...records.values()].sort((a, b) => a.code.localeCompare(b.code)));
  }, onError));
  return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
}

interface CommandResult { resourceId: string; state: string; auditEventId: string; replayed: boolean }

export interface DesignBasisState {
  id: string;
  revision: string;
  status: string;
  createdBy: string;
  draftHash: string;
  payload?: DesignBasisPayload;
  locked?: boolean;
}

export interface SourceRevisionState {
  id: string;
  revision: string;
  status: string;
  createdBy: string;
  snapshotHash: string;
  scanState: string;
  locked: boolean;
  storagePath?: string;
  validation?: SourceValidationSummary;
}

export function watchDesignBasis(orgId: string, projectId: string, artifactId: string, onValue: (artifact: DesignBasisState) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`), (snapshot) => {
    if (!snapshot.exists()) {
      onError(new Error('Design Basis draft was not found.'));
      return;
    }
    const data = snapshot.data();
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), createdBy: String(data.createdBy), draftHash: String(data.draftHash), payload: data.payload as DesignBasisPayload, locked: data.locked === true });
  }, onError);
}

export function watchSourceRevision(orgId: string, projectId: string, artifactId: string, onValue: (artifact: SourceRevisionState) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/sourceRevisions/${artifactId}`), (snapshot) => {
    if (!snapshot.exists()) return onError(new Error('Source revision was not found.'));
    const data = snapshot.data();
    onValue({
      id: snapshot.id, revision: String(data.revision), status: String(data.status), createdBy: String(data.createdBy),
      snapshotHash: String(data.snapshotHash ?? data.draftHash ?? ''), scanState: String(data.scanState), locked: data.locked === true,
      ...(typeof data.storagePath === 'string' ? { storagePath: data.storagePath } : {}),
      ...(data.validation === undefined ? {} : { validation: data.validation as SourceValidationSummary }),
    });
  }, onError);
}

export function validateSourceFile(file: Pick<File, 'name' | 'type' | 'size'>): string[] {
  const result = sourceFileSchema.safeParse({ name: file.name, contentType: file.type, size: file.size });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

export async function uploadSourceFile(input: { orgId: string; projectId: string; file: File; onProgress: (percent: number) => void }): Promise<string> {
  const errors = validateSourceFile(input.file);
  if (errors.length > 0) throw new Error(`Upload rejected: ${errors.join('; ')}`);
  const uid = firebaseAuth.currentUser?.uid;
  if (uid === undefined) throw new Error('Sign in before uploading a source file.');
  const uploadId = crypto.randomUUID();
  const sourceId = `src-${uploadId.slice(0, 8)}`;
  const path = `organizations/${input.orgId}/projects/${input.projectId}/source-staging/${uid}/${uploadId}/${input.file.name}`;
  const task = uploadBytesResumable(ref(storage, path), input.file, {
    contentType: input.file.type,
    customMetadata: { scanState: 'quarantined', uploadedBy: uid, orgId: input.orgId, projectId: input.projectId },
  });
  await new Promise<void>((resolve, reject) => task.on('state_changed', (snapshot) => input.onProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
  await setDoc(doc(firestore, `organizations/${input.orgId}/projects/${input.projectId}/sourceRevisions/${sourceId}`), {
    id: sourceId, revision: `SRC-${new Date().toISOString().slice(0, 10)}-${uploadId.slice(0, 4).toUpperCase()}`,
    status: 'draft', scanState: 'quarantined', locked: false, createdBy: uid, isCurrentRevision: true,
    storagePath: path, fileName: input.file.name, contentType: input.file.type, size: input.file.size,
    validation: { unitValid: false, coordinateValid: false, levelsValid: false, objectIdentityValid: false, objectCount: 0, duplicateGlobalIds: 0 },
    blockingConditions: ['Malware scan and BIM validation pending'], createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  return sourceId;
}

export async function submitSourceRevision(input: { orgId: string; projectId: string; artifact: SourceRevisionState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  const result = await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'sourceRevision', artifactId: input.artifact.id, expectedDraftHash: input.artifact.snapshotHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export async function freezeSourceRevision(input: { orgId: string; projectId: string; artifact: SourceRevisionState }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'freezeSourceRevisionCommand');
  const result = await command({ orgId: input.orgId, projectId: input.projectId, sourceRevisionId: input.artifact.id, expectedSnapshotHash: input.artifact.snapshotHash, idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export async function createDesignBasisRevision(input: { orgId: string; projectId: string; id: string; revision: string; payload: DesignBasisPayload; supersedesId?: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createDesignBasisRevisionCommand');
  const result = await command({ orgId: input.orgId, projectId: input.projectId, designBasisId: input.id, revision: input.revision, payload: input.payload, ...(input.supersedesId === undefined ? {} : { supersedesId: input.supersedesId }), idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export async function submitDesignBasis(input: { orgId: string; projectId: string; artifact: DesignBasisState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  const result = await command({
    orgId: input.orgId,
    projectId: input.projectId,
    requestId: `apr-${crypto.randomUUID()}`,
    artifactType: 'designBasis',
    artifactId: input.artifact.id,
    expectedDraftHash: input.artifact.draftHash,
    assignedTo: input.assignedTo,
    idempotencyKey: crypto.randomUUID(),
  });
  return result.data;
}

export async function approveRequest(request: ApprovalRequest, comment?: string): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'approveArtifactCommand');
  const result = await command({ orgId: request.orgId, projectId: request.projectId, requestId: request.id, artifactType: request.artifactType, artifactId: request.artifactId, snapshotHash: request.snapshotHash, idempotencyKey: crypto.randomUUID(), ...(comment === undefined ? {} : { comment }) });
  return result.data;
}

export async function returnRequest(request: ApprovalRequest, comment: string): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'returnArtifactCommand');
  const result = await command({ orgId: request.orgId, projectId: request.projectId, requestId: request.id, artifactType: request.artifactType, artifactId: request.artifactId, snapshotHash: request.snapshotHash, idempotencyKey: crypto.randomUUID(), comment });
  return result.data;
}

export async function createType2Project(input: { orgId: string; projectId: string; code: string; name: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createProjectCommand');
  const result = await command({ ...input, templateId: 'type-2-residential-v1', idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export async function updateProject(input: { orgId: string; projectId: string; code: string; name: string; status: 'active' | 'onHold' | 'completed'; dueAt?: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'updateProjectCommand');
  return (await command({ ...input, idempotencyKey: crypto.randomUUID() })).data;
}

export async function archiveProject(input: { orgId: string; projectId: string; reason: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'archiveProjectCommand');
  return (await command({ ...input, idempotencyKey: crypto.randomUUID() })).data;
}
