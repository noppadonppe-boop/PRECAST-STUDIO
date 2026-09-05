import { createHash } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, revitDrafting01Fixture, type DesignCheckPayload, type DocumentationCheckStatus, type DocumentationSetPayload, type PermissionContext, type ProductModelPayload, type ProjectRole } from '@precast/domain';
import { designCheckPayloadSchema, documentationSetPayloadSchema, productModelPayloadSchema, type CreateDocumentationSetRevisionCommand } from '@precast/schemas';
import { AuthorizationError } from './authorization';
import { computeArtifactSnapshotHash, type CommandResult } from './workflowCommands';

type RecordValue = Record<string, unknown>;
const rootPath = (orgId: string, projectId: string) => `organizations/${orgId}/projects/${projectId}`;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' ? value as RecordValue : {};
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const required = (data: RecordValue, key: string): string => { const value = data[key]; if (typeof value !== 'string' || value.length === 0) throw new AuthorizationError(`${key} is required.`, 'failed-precondition'); return value; };

async function permissionContext(tx: Transaction, db: Firestore, uid: string, orgId: string, projectId: string, now: Timestamp): Promise<PermissionContext> {
  const [orgMember, projectMember] = await Promise.all([tx.get(db.doc(`organizations/${orgId}/members/${uid}`)), tx.get(db.doc(`${rootPath(orgId, projectId)}/members/${uid}`))]);
  const org = record(orgMember.data()); const project = record(projectMember.data());
  if (!orgMember.exists || org.status !== 'active' || !projectMember.exists || project.status !== 'active') throw new AuthorizationError('Active organization and project membership are required.', 'permission-denied');
  const effective = project.effectiveFrom instanceof Timestamp ? project.effectiveFrom.toMillis() : 0; const expires = project.expiresAt instanceof Timestamp ? project.expiresAt.toMillis() : undefined;
  if (effective > now.toMillis() || (expires !== undefined && expires <= now.toMillis())) throw new AuthorizationError('Project membership is not currently effective.', 'permission-denied');
  return { userId: uid, orgId, projectId, roles: strings(project.roles) as ProjectRole[], capabilities: strings(project.capabilities), membershipStatus: 'active', ...(expires === undefined ? {} : { expiresAt: new Date(expires).toISOString() }) };
}

const reportSections = [
  ['cover', 'Cover and document control'], ['scope', 'Scope and limitations'], ['codes', 'Codes and Design Criteria'], ['materials', 'Materials'], ['loads', 'Loads and combinations'],
  ['analysis-model', 'Analytical model and assumptions'], ['verification', 'Model verification mesh and equilibrium'], ['results', 'Analysis results'], ['panel-checks', 'Panel and reinforcement checks'],
  ['connection-checks', 'Joint anchor and bearing checks'], ['handling-checks', 'Lifting transport and erection checks'], ['conclusions', 'Conclusions and unresolved items'], ['appendices', 'Appendices and result tables'],
] as const;

export function buildDocumentationSet(input: { model: ProductModelPayload; modelVersionId: string; modelSnapshotHash: string; calculation: DesignCheckPayload; calculationReportId: string; calculationSnapshotHash: string; calculationStatus: string; drawingSetRevision: string; reportId: string; reportRevision: string }): DocumentationSetPayload {
  const designStatus = input.calculation.overallStatus;
  const panelIds = input.model.panels.map((panel) => panel.id).sort();
  const drawings = [...input.model.panels].sort((a, b) => a.mark.localeCompare(b.mark) || a.id.localeCompare(b.id)).map((panel, index) => {
    const anchors = input.model.anchors.filter((anchor) => anchor.panelId === panel.id).sort((a, b) => a.id.localeCompare(b.id));
    return ({
    id: `drawing-${panel.id}`, drawingNumber: `PC-${panel.mark}-${String(index + 1).padStart(3, '0')}`, panelId: panel.id, elementMark: panel.mark, panelType: panel.type, sheet: `S${String(index + 1).padStart(2, '0')}`,
    revision: input.drawingSetRevision, status: 'draft' as const, geometry: panel.geometry, openings: panel.openings, anchorIds: anchors.map((anchor) => anchor.id), anchors,
    materialId: panel.materialId, volumeM3: panel.volumeM3, weightKn: panel.weightKn, cogM: panel.cogM, reinforcementStatus: 'NOT_CHECKED' as const,
    sourceRefs: { modelVersionId: input.modelVersionId, calculationReportId: input.calculationReportId },
  }); });
  const identityPass = new Set(drawings.map((drawing) => drawing.drawingNumber)).size === drawings.length && new Set(drawings.map((drawing) => drawing.elementMark)).size === drawings.length;
  const liftingStatus: DocumentationCheckStatus = drawings.some((drawing) => drawing.anchorIds.length === 0) ? 'FAIL' : 'NOT_CHECKED';
  const preflightChecks: DocumentationSetPayload['preflight']['checks'] = [
    { id: 'preflight-model-hash', category: 'modelHash', status: 'PASS', entityIds: panelIds, message: `Drawing geometry is bound to ${input.modelSnapshotHash}.` },
    { id: 'preflight-drawing-identity', category: 'drawingIdentity', status: identityPass ? 'PASS' : 'FAIL', entityIds: panelIds, message: identityPass ? 'Drawing numbers and element marks are unique.' : 'Duplicate drawing number or element mark detected.' },
    { id: 'preflight-geometry', category: 'geometry', status: 'PASS', entityIds: panelIds, message: 'Panel outline and opening geometry were copied from the validated Product Model.' },
    { id: 'preflight-dimensions', category: 'dimensions', status: 'PASS', entityIds: panelIds, message: 'Overall width height thickness opening dimensions weight volume and COG are present.' },
    { id: 'preflight-title-block', category: 'titleBlock', status: 'PASS', entityIds: panelIds, message: 'Draft title block contains drawing number revision panel mark and upstream references.' },
    { id: 'preflight-lifting', category: 'lifting', status: liftingStatus, entityIds: drawings.flatMap((drawing) => drawing.anchorIds).length > 0 ? drawings.flatMap((drawing) => drawing.anchorIds) : panelIds, message: liftingStatus === 'FAIL' ? 'At least one panel has no lifting anchor entity.' : 'Lifting points are located, but the lifting design remains NOT CHECKED.' },
    { id: 'preflight-reinforcement', category: 'reinforcement', status: 'NOT_CHECKED', entityIds: panelIds, message: 'Reinforcement bar marks spacing cover laps and schedules are not implemented.' },
    { id: 'preflight-engineering', category: 'engineeringApproval', status: input.calculationStatus === 'approved' && designStatus === 'PASS' ? 'PASS' : 'NOT_CHECKED', entityIds: input.calculation.checks.flatMap((check) => check.entityIds), message: input.calculationStatus === 'approved' && designStatus === 'PASS' ? 'Approved G4 calculation snapshot is referenced.' : `G4 calculation is ${input.calculationStatus} with ${designStatus} design status.` },
  ];
  const overallStatus: DocumentationCheckStatus = preflightChecks.some((check) => check.status === 'FAIL') ? 'FAIL' : preflightChecks.some((check) => check.status === 'NOT_CHECKED') ? 'NOT_CHECKED' : 'PASS';
  const designSectionStatus: DocumentationCheckStatus = input.calculationStatus === 'approved' ? designStatus : 'NOT_CHECKED';
  const payload: DocumentationSetPayload = {
    schemaVersion: '1.0.0', units: 'kN-m-MPa', engine: 'precast-documentation-register@1.0.0', issuePurpose: 'internalReview', modelVersionId: input.modelVersionId, modelSnapshotHash: input.modelSnapshotHash,
    calculationReportId: input.calculationReportId, calculationSnapshotHash: input.calculationSnapshotHash, calculationStatus: input.calculationStatus, overallDesignStatus: designStatus, exportProfile: revitDrafting01Fixture,
    calculationReport: { id: input.reportId, revision: input.reportRevision, documentState: 'previewOnly', sections: reportSections.map(([id, title], index) => ({ id, number: index + 1, title, status: index >= 8 && index <= 11 ? designSectionStatus : 'PASS', sourceRefs: index < 5 ? [input.modelVersionId, input.calculationReportId] : [input.calculationReportId, input.calculation.analysisRunId], message: index >= 8 && index <= 11 ? `Section preserves ${designSectionStatus} design evidence.` : 'Section source references are registered for deterministic rendering.' })) },
    drawings, preflight: { overallStatus, checks: preflightChecks },
  };
  const parsed = documentationSetPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new AuthorizationError('Server-generated Documentation Set failed deterministic schema validation.', 'failed-precondition');
  return parsed.data;
}

export function documentationBlockingConditions(payload: DocumentationSetPayload): string[] {
  return payload.preflight.checks.filter((check) => check.status !== 'PASS').map((check) => `${check.category}: ${check.status}.`);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export function buildDocumentationExportManifest(input: { id: string; revision: string; status: string; locked: boolean; snapshotHash?: string; blockingConditions: string[]; payload: unknown }) {
  const parsed = documentationSetPayloadSchema.safeParse(input.payload);
  if (!parsed.success || input.status !== 'approved' || !input.locked || input.snapshotHash === undefined || input.blockingConditions.length > 0 || parsed.data.preflight.overallStatus !== 'PASS' || parsed.data.overallDesignStatus !== 'PASS') {
    throw new AuthorizationError('Calculation DOCX/PDF and drawing exports require approved G4/G6 snapshots and PASS preflight with no blockers.', 'failed-precondition');
  }
  const payloadHash = `sha256:${createHash('sha256').update(stableJson(parsed.data)).digest('hex')}`; const base = `${input.id}-${input.revision}`.toLowerCase();
  return { documentationSetId: input.id, revision: input.revision, snapshotHash: input.snapshotHash, payloadHash, files: [
    { format: 'docx', name: `${base}-calculation-draft.docx`, authority: 'editableDraft' }, { format: 'pdfa-2b', name: `${base}-calculation-issued.pdf`, authority: 'issuedImmutable' },
    ...parsed.data.drawings.flatMap((drawing) => [{ format: 'pdfa-2b', name: `${drawing.drawingNumber.toLowerCase()}.pdf`, authority: 'issuedImmutable' }, { format: 'svg', name: `${drawing.drawingNumber.toLowerCase()}-preview.svg`, authority: 'preview' }]),
    { format: 'xlsx', name: `${base}-result-tables.xlsx`, authority: 'schedule' }, { format: 'csv', name: `${base}-drawing-register.csv`, authority: 'schedule' }, { format: 'json', name: `${base}-manifest.json`, authority: 'audit' },
  ] };
}

export async function createDocumentationSetRevision(db: Firestore, uid: string, command: CreateDocumentationSetRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId); const projectRef = db.doc(root); const drawingSetRef = db.doc(`${root}/drawingSets/${command.drawingSetId}`); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const [receipt, project, existing, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(drawingSetRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (receipt.exists) { const data = record(receipt.data()); if (data.actorUid !== uid || data.commandName !== 'createDocumentationSetRevision') throw new AuthorizationError('Idempotency key was used by another command.', 'failed-precondition'); return { resourceId: required(data, 'resourceId'), state: required(data, 'resultState'), auditEventId: required(data, 'auditEventId'), replayed: true }; }
    if (!project.exists || existing.exists) throw new AuthorizationError(existing.exists ? 'Documentation Set revision ID already exists.' : 'Project does not exist.', 'failed-precondition');
    const decision = can('create', 'drawingSet', context); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Documentation Set creation denied.', 'permission-denied');
    const projectData = record(project.data()); if (record(projectData.gateStates).G3 !== 'approved') throw new AuthorizationError('Approved G3 evidence is required before documentation preview.', 'failed-precondition');
    if (projectData.currentCalculationReportId !== command.calculationReportId) throw new AuthorizationError('Documentation Set must reference the current calculation revision.', 'failed-precondition');
    const modelVersionId = required(projectData, 'currentModelVersionId'); const [modelSnapshot, calculationSnapshot] = await Promise.all([tx.get(db.doc(`${root}/productModelVersions/${modelVersionId}`)), tx.get(db.doc(`${root}/calculationReports/${command.calculationReportId}`))]);
    const modelData = record(modelSnapshot.data()); const calculationData = record(calculationSnapshot.data()); const parsedModel = productModelPayloadSchema.safeParse(modelData.payload); const parsedCalculation = designCheckPayloadSchema.safeParse(calculationData.payload);
    const calculationHash = typeof calculationData.snapshotHash === 'string' ? calculationData.snapshotHash : calculationData.draftHash;
    if (!modelSnapshot.exists || !parsedModel.success || modelData.status !== 'approved' || modelData.locked !== true || modelData.snapshotHash !== command.expectedModelHash) throw new AuthorizationError('Current approved, locked Product Model hash is required.', 'failed-precondition');
    if (!calculationSnapshot.exists || !parsedCalculation.success || calculationHash !== command.expectedCalculationHash) throw new AuthorizationError('Current calculation revision and matching hash are required.', 'failed-precondition');
    const payload = buildDocumentationSet({ model: parsedModel.data, modelVersionId, modelSnapshotHash: command.expectedModelHash, calculation: parsedCalculation.data, calculationReportId: command.calculationReportId, calculationSnapshotHash: command.expectedCalculationHash, calculationStatus: required(calculationData, 'status'), drawingSetRevision: command.revision, reportId: command.reportId, reportRevision: command.reportRevision });
    const upstreamRefs = { sourceRevisionId: required(projectData, 'currentSourceRevisionId'), designBasisVersionId: required(projectData, 'currentDesignBasisVersionId'), modelVersionId, analysisRunId: required(projectData, 'currentApprovedAnalysisRunId'), calculationReportId: command.calculationReportId };
    const draftHash = computeArtifactSnapshotHash({ artifactType: 'drawingSet', artifactId: command.drawingSetId, artifactRevision: command.revision, createdBy: uid, upstreamRefs, payload: payload as unknown as Record<string, unknown> }); const blockingConditions = documentationBlockingConditions(payload);
    tx.create(drawingSetRef, { id: command.drawingSetId, revision: command.revision, status: 'draft', documentationState: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', locked: false, createdBy: uid, isCurrentRevision: true, upstreamRefs, payload, blockingConditions, draftHash, createdAt: now, updatedAt: now, updatedBy: uid });
    tx.update(projectRef, { currentDrawingSetId: command.drawingSetId, currentStage: 'drawing', 'gateStates.G6': blockingConditions.length === 0 ? 'inProgress' : 'needsAttention', updatedAt: now, updatedBy: uid });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'drawingSet', artifactId: command.drawingSetId, artifactRevision: command.revision, action: 'create', stateBefore: 'none', stateAfter: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: draftHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createDocumentationSetRevision', actorUid: uid, resourceId: command.drawingSetId, resultState: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.drawingSetId, state: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', auditEventId: command.idempotencyKey, replayed: false };
  });
}
