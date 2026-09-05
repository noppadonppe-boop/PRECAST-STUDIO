import { collection, doc, limit, onSnapshot, orderBy, query, Timestamp, where, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { ApprovalRequest, ArtifactType, AuditEvent } from '@precast/domain';
import { firestore, functions } from '../firebase/client';

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

interface CommandResult { resourceId: string; state: string; auditEventId: string; replayed: boolean }

export interface DesignBasisState {
  id: string;
  revision: string;
  status: string;
  createdBy: string;
  draftHash: string;
}

export function watchDesignBasis(orgId: string, projectId: string, artifactId: string, onValue: (artifact: DesignBasisState) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/designBasisVersions/${artifactId}`), (snapshot) => {
    if (!snapshot.exists()) {
      onError(new Error('Design Basis draft was not found.'));
      return;
    }
    const data = snapshot.data();
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), createdBy: String(data.createdBy), draftHash: String(data.draftHash) });
  }, onError);
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
