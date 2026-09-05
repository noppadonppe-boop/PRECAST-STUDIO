import { collection, doc, limit, onSnapshot, orderBy, query, setDoc, Timestamp, updateDoc, where, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable } from 'firebase/storage';
import type { AnalysisRunRecord, ApprovalRequest, ArtifactType, AuditEvent, DesignBasisPayload, DesignCheckPayload, DocumentationSetPayload, EstimatePayload, LoadAnalysisSettingsPayload, ProductModelPayload, ProjectRecord, ReleasePackagePayload, SourceValidationSummary } from '@precast/domain';
import { designCheckPayloadSchema, documentationSetPayloadSchema, estimatePayloadSchema, loadAnalysisSettingsPayloadSchema, productModelPayloadSchema, releasePackagePayloadSchema } from '@precast/schemas';
import { firebaseAuth, firestore, functions, storage } from '../firebase/client';
import { canonicalSourceContentType, validateSourceFile } from './sourceFileValidation';

export { validateSourceFile } from './sourceFileValidation';

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
      ...(typeof data.currentModelVersionId === 'string' ? { currentModelVersionId: data.currentModelVersionId } : {}),
      ...(typeof data.currentLoadModelVersionId === 'string' ? { currentLoadModelVersionId: data.currentLoadModelVersionId } : {}),
      ...(typeof data.currentApprovedAnalysisRunId === 'string' ? { currentApprovedAnalysisRunId: data.currentApprovedAnalysisRunId } : {}),
      ...(typeof data.currentCalculationReportId === 'string' ? { currentCalculationReportId: data.currentCalculationReportId } : {}),
      ...(typeof data.currentEstimateVersionId === 'string' ? { currentEstimateVersionId: data.currentEstimateVersionId } : {}),
      ...(typeof data.currentDrawingSetId === 'string' ? { currentDrawingSetId: data.currentDrawingSetId } : {}),
      ...(typeof data.currentReleasePackageId === 'string' ? { currentReleasePackageId: data.currentReleasePackageId } : {}),
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

export interface ProductModelState {
  id: string;
  revision: string;
  status: string;
  createdBy: string;
  draftHash: string;
  locked: boolean;
  payload: ProductModelPayload;
  upstreamRefs: { sourceRevisionId: string; designBasisVersionId: string };
}

export interface LoadModelState {
  id: string;
  revision: string;
  status: string;
  createdBy: string;
  draftHash: string;
  locked: boolean;
  payload: LoadAnalysisSettingsPayload;
  upstreamRefs: { sourceRevisionId: string; designBasisVersionId: string; modelVersionId: string };
}

export type AnalysisRunState = AnalysisRunRecord;

export interface CalculationState {
  id: string;
  revision: string;
  status: string;
  createdBy: string;
  draftHash: string;
  locked: boolean;
  payload: DesignCheckPayload;
  blockingConditions: string[];
}

export interface EstimateState {
  id: string;
  revision: string;
  status: string;
  estimateState: 'incomplete' | 'readyForReview';
  createdBy: string;
  draftHash: string;
  locked: boolean;
  payload: EstimatePayload;
  blockingConditions: string[];
}

export interface DocumentationSetState {
  id: string;
  revision: string;
  status: string;
  documentationState: 'incomplete' | 'readyForReview';
  createdBy: string;
  draftHash: string;
  snapshotHash?: string;
  locked: boolean;
  payload: DocumentationSetPayload;
  blockingConditions: string[];
}

export interface ReleasePackageState {
  id: string;
  revision: string;
  status: string;
  releaseState: 'readyForTechnicalApproval' | 'released';
  createdBy: string;
  draftHash: string;
  snapshotHash?: string;
  locked: boolean;
  payload: ReleasePackagePayload;
  blockingConditions: string[];
  approvedBy?: string;
  releasedBy?: string;
  recipient?: string;
  productionQueue?: string;
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

export function watchProductModel(orgId: string, projectId: string, artifactId: string, onValue: (artifact: ProductModelState) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/productModelVersions/${artifactId}`), (snapshot) => {
    if (!snapshot.exists()) return onError(new Error('Product Model was not found.'));
    const data = snapshot.data();
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), createdBy: String(data.createdBy), draftHash: String(data.draftHash), locked: data.locked === true, payload: data.payload as ProductModelPayload, upstreamRefs: data.upstreamRefs as ProductModelState['upstreamRefs'] });
  }, onError);
}

export function watchLoadModel(orgId: string, projectId: string, artifactId: string, onValue: (artifact: LoadModelState) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/loadModelVersions/${artifactId}`), (snapshot) => {
    if (!snapshot.exists()) return onError(new Error('Load Model was not found.'));
    const data = snapshot.data();
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), createdBy: String(data.createdBy), draftHash: String(data.draftHash), locked: data.locked === true, payload: data.payload as LoadAnalysisSettingsPayload, upstreamRefs: data.upstreamRefs as LoadModelState['upstreamRefs'] });
  }, onError);
}

export function watchAnalysisRun(orgId: string, projectId: string, runId: string, onValue: (run: AnalysisRunState | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/analysisRuns/${runId}`), (snapshot) => {
    if (!snapshot.exists()) { onValue(null); return; }
    onValue(snapshot.data() as AnalysisRunState);
  }, onError);
}

export function watchCalculation(orgId: string, projectId: string, calculationId: string, onValue: (calculation: CalculationState | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/calculationReports/${calculationId}`), (snapshot) => {
    if (!snapshot.exists()) { onValue(null); return; }
    const data = snapshot.data(); const parsed = designCheckPayloadSchema.safeParse(data.payload);
    if (!parsed.success) return onError(new Error('Design Check register is invalid.'));
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), createdBy: String(data.createdBy), draftHash: String(data.draftHash), locked: data.locked === true, payload: parsed.data, blockingConditions: Array.isArray(data.blockingConditions) ? data.blockingConditions.filter((item): item is string => typeof item === 'string') : [] });
  }, onError);
}

export function watchEstimate(orgId: string, projectId: string, estimateId: string, onValue: (estimate: EstimateState | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/estimateVersions/${estimateId}`), (snapshot) => {
    if (!snapshot.exists()) { onValue(null); return; }
    const data = snapshot.data(); const parsed = estimatePayloadSchema.safeParse(data.payload);
    if (!parsed.success) return onError(new Error('Engineering estimate is invalid.'));
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), estimateState: data.estimateState === 'readyForReview' ? 'readyForReview' : 'incomplete', createdBy: String(data.createdBy), draftHash: String(data.draftHash), locked: data.locked === true, payload: parsed.data, blockingConditions: Array.isArray(data.blockingConditions) ? data.blockingConditions.filter((item): item is string => typeof item === 'string') : [] });
  }, onError);
}

export function watchDocumentationSet(orgId: string, projectId: string, drawingSetId: string, onValue: (value: DocumentationSetState | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/drawingSets/${drawingSetId}`), (snapshot) => {
    if (!snapshot.exists()) { onValue(null); return; }
    const data = snapshot.data(); const parsed = documentationSetPayloadSchema.safeParse(data.payload);
    if (!parsed.success) return onError(new Error('Documentation Set is invalid.'));
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), documentationState: data.documentationState === 'readyForReview' ? 'readyForReview' : 'incomplete', createdBy: String(data.createdBy), draftHash: String(data.draftHash), ...(typeof data.snapshotHash === 'string' ? { snapshotHash: data.snapshotHash } : {}), locked: data.locked === true, payload: parsed.data, blockingConditions: Array.isArray(data.blockingConditions) ? data.blockingConditions.filter((item): item is string => typeof item === 'string') : [] });
  }, onError);
}

export function watchReleasePackage(orgId: string, projectId: string, releasePackageId: string, onValue: (value: ReleasePackageState | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/releasePackages/${releasePackageId}`), (snapshot) => {
    if (!snapshot.exists()) { onValue(null); return; }
    const data = snapshot.data(); const parsed = releasePackagePayloadSchema.safeParse(data.payload);
    if (!parsed.success) return onError(new Error('Release Package manifest is invalid.'));
    onValue({ id: snapshot.id, revision: String(data.revision), status: String(data.status), releaseState: data.releaseState === 'released' ? 'released' : 'readyForTechnicalApproval', createdBy: String(data.createdBy), draftHash: String(data.draftHash), ...(typeof data.snapshotHash === 'string' ? { snapshotHash: data.snapshotHash } : {}), locked: data.locked === true, payload: parsed.data, blockingConditions: Array.isArray(data.blockingConditions) ? data.blockingConditions.filter((item): item is string => typeof item === 'string') : [], ...(typeof data.approvedBy === 'string' ? { approvedBy: data.approvedBy } : {}), ...(typeof data.releasedBy === 'string' ? { releasedBy: data.releasedBy } : {}), ...(typeof data.recipient === 'string' ? { recipient: data.recipient } : {}), ...(typeof data.productionQueue === 'string' ? { productionQueue: data.productionQueue } : {}) });
  }, onError);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export async function saveProductModelDraft(input: { orgId: string; projectId: string; artifact: ProductModelState; payload: ProductModelPayload }): Promise<void> {
  const parsed = productModelPayloadSchema.safeParse(input.payload);
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  const snapshot = { artifactType: 'productModel', artifactId: input.artifact.id, artifactRevision: input.artifact.revision, createdBy: input.artifact.createdBy, upstreamRefs: input.artifact.upstreamRefs, payload: parsed.data };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable(snapshot)));
  const draftHash = `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  await updateDoc(doc(firestore, `organizations/${input.orgId}/projects/${input.projectId}/productModelVersions/${input.artifact.id}`), { payload: parsed.data, draftHash, updatedAt: Timestamp.now(), updatedBy: input.artifact.createdBy });
}

async function snapshotHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable(value)));
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function saveLoadModelDraft(input: { orgId: string; projectId: string; artifact: LoadModelState; payload: LoadAnalysisSettingsPayload }): Promise<void> {
  const parsed = loadAnalysisSettingsPayloadSchema.safeParse(input.payload);
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  const canonical = { ...parsed.data, refinementZoneIds: [...new Set(parsed.data.refinementZoneIds)].sort(), scenarios: [...parsed.data.scenarios].sort((a, b) => a.id.localeCompare(b.id)).map((scenario) => ({ ...scenario, activeSupportIds: [...new Set(scenario.activeSupportIds)].sort(), activeJointIds: [...new Set(scenario.activeJointIds)].sort(), loadCaseIds: [...new Set(scenario.loadCaseIds)].sort(), combinationIds: [...new Set(scenario.combinationIds)].sort() })) };
  const draftHash = await snapshotHash({ artifactType: 'loadModel', artifactId: input.artifact.id, artifactRevision: input.artifact.revision, createdBy: input.artifact.createdBy, upstreamRefs: input.artifact.upstreamRefs, payload: canonical });
  await updateDoc(doc(firestore, `organizations/${input.orgId}/projects/${input.projectId}/loadModelVersions/${input.artifact.id}`), { payload: canonical, draftHash, updatedAt: Timestamp.now(), updatedBy: input.artifact.createdBy });
}

export async function createLoadModelRevision(input: { orgId: string; projectId: string; id: string; revision: string; payload: LoadAnalysisSettingsPayload }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createLoadModelRevisionCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, loadModelVersionId: input.id, revision: input.revision, payload: input.payload, idempotencyKey: crypto.randomUUID() })).data;
}

export async function queueAnalysisRun(input: { orgId: string; projectId: string; runId: string; revision: string; loadModel: LoadModelState; modelHash: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'queueAnalysisRunCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, runId: input.runId, revision: input.revision, loadModelVersionId: input.loadModel.id, benchmarkId: 'two-panel-static-v1', expectedModelHash: input.modelHash, expectedLoadModelHash: input.loadModel.draftHash, idempotencyKey: crypto.randomUUID() })).data;
}

export async function cancelAnalysisRun(input: { orgId: string; projectId: string; runId: string; reason: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'cancelAnalysisRunCommand');
  return (await command({ ...input, idempotencyKey: crypto.randomUUID() })).data;
}

export async function submitAnalysis(input: { orgId: string; projectId: string; analysis: AnalysisRunState; assignedTo: string }): Promise<CommandResult> {
  if (input.analysis.draftHash === undefined) throw new Error('Completed analysis review hash is missing.');
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'analysis', artifactId: input.analysis.id, expectedDraftHash: input.analysis.draftHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() })).data;
}

export async function createDesignCheckRevision(input: { orgId: string; projectId: string; calculationId: string; revision: string; analysis: AnalysisRunState }): Promise<CommandResult> {
  if (input.analysis.snapshotHash === undefined) throw new Error('Approved analysis snapshot hash is missing.');
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createDesignCheckRevisionCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, calculationId: input.calculationId, revision: input.revision, analysisRunId: input.analysis.id, expectedAnalysisHash: input.analysis.snapshotHash, idempotencyKey: crypto.randomUUID() })).data;
}

export async function submitCalculation(input: { orgId: string; projectId: string; calculation: CalculationState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'calculation', artifactId: input.calculation.id, expectedDraftHash: input.calculation.draftHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() })).data;
}

export async function createEstimateRevision(input: { orgId: string; projectId: string; estimateId: string; revision: string; modelHash: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createEstimateRevisionCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, estimateId: input.estimateId, revision: input.revision, priceBookId: 'pb-th-2026', priceBookRevision: 'PB-R01', effectiveDate: '2026-09-05', expectedModelHash: input.modelHash, indirectPercent: 10, contingencyPercent: 5, markupPercent: 12, vatPercent: 7, uncertaintyPercent: 15, idempotencyKey: crypto.randomUUID() })).data;
}

export async function submitEstimate(input: { orgId: string; projectId: string; estimate: EstimateState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'estimate', artifactId: input.estimate.id, expectedDraftHash: input.estimate.draftHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() })).data;
}

export async function createDocumentationSetRevision(input: { orgId: string; projectId: string; drawingSetId: string; revision: string; modelHash: string; calculation: CalculationState }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createDocumentationSetRevisionCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, drawingSetId: input.drawingSetId, revision: input.revision, reportId: 'report-r01', reportRevision: 'CR-R01', expectedModelHash: input.modelHash, calculationReportId: input.calculation.id, expectedCalculationHash: input.calculation.draftHash, idempotencyKey: crypto.randomUUID() })).data;
}

export async function submitDocumentationSet(input: { orgId: string; projectId: string; drawingSet: DocumentationSetState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'drawingSet', artifactId: input.drawingSet.id, expectedDraftHash: input.drawingSet.draftHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() })).data;
}

export async function createReleasePackageRevision(input: { orgId: string; projectId: string; releasePackageId: string; revision: string; exportJobId: string; drawingSetHash: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createReleasePackageRevisionCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, releasePackageId: input.releasePackageId, revision: input.revision, exportJobId: input.exportJobId, expectedDrawingSetHash: input.drawingSetHash, idempotencyKey: crypto.randomUUID() })).data;
}

export async function submitReleasePackage(input: { orgId: string; projectId: string; releasePackage: ReleasePackageState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'releasePackage', artifactId: input.releasePackage.id, expectedDraftHash: input.releasePackage.draftHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() })).data;
}

export async function releaseProductionPackage(input: { orgId: string; projectId: string; releasePackage: ReleasePackageState; recipient: string; productionQueue: string }): Promise<CommandResult> {
  if (input.releasePackage.snapshotHash === undefined) throw new Error('Approved Release Package snapshot hash is missing.');
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'releaseProductionPackageCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, releasePackageId: input.releasePackage.id, expectedSnapshotHash: input.releasePackage.snapshotHash, recipient: input.recipient, productionQueue: input.productionQueue, idempotencyKey: crypto.randomUUID() })).data;
}

export async function uploadSourceFile(input: { orgId: string; projectId: string; file: File; onProgress: (percent: number) => void }): Promise<string> {
  const errors = validateSourceFile(input.file);
  if (errors.length > 0) throw new Error(`Upload rejected: ${errors.join('; ')}`);
  const uid = firebaseAuth.currentUser?.uid;
  if (uid === undefined) throw new Error('Sign in before uploading a source file.');
  const uploadId = crypto.randomUUID();
  const sourceId = `src-${uploadId.slice(0, 8)}`;
  const path = `organizations/${input.orgId}/projects/${input.projectId}/source-staging/${uid}/${uploadId}/${input.file.name}`;
  const contentType = canonicalSourceContentType(input.file);
  const task = uploadBytesResumable(ref(storage, path), input.file, {
    contentType,
    customMetadata: { scanState: 'quarantined', uploadedBy: uid, orgId: input.orgId, projectId: input.projectId },
  });
  await new Promise<void>((resolve, reject) => task.on('state_changed', (snapshot) => input.onProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
  await setDoc(doc(firestore, `organizations/${input.orgId}/projects/${input.projectId}/sourceRevisions/${sourceId}`), {
    id: sourceId, revision: `SRC-${new Date().toISOString().slice(0, 10)}-${uploadId.slice(0, 4).toUpperCase()}`,
    status: 'draft', scanState: 'quarantined', locked: false, createdBy: uid, isCurrentRevision: true,
    storagePath: path, fileName: input.file.name, contentType, size: input.file.size,
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

export async function submitProductModel(input: { orgId: string; projectId: string; artifact: ProductModelState; assignedTo: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'submitArtifactCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, requestId: `apr-${crypto.randomUUID()}`, artifactType: 'productModel', artifactId: input.artifact.id, expectedDraftHash: input.artifact.draftHash, assignedTo: input.assignedTo, idempotencyKey: crypto.randomUUID() })).data;
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

export async function createProductModelRevision(input: { orgId: string; projectId: string; id: string; revision: string; payload: ProductModelPayload; supersedesId?: string }): Promise<CommandResult> {
  const command = httpsCallable<Record<string, unknown>, CommandResult>(functions, 'createProductModelRevisionCommand');
  return (await command({ orgId: input.orgId, projectId: input.projectId, modelVersionId: input.id, revision: input.revision, payload: input.payload, ...(input.supersedesId === undefined ? {} : { supersedesId: input.supersedesId }), idempotencyKey: crypto.randomUUID() })).data;
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
