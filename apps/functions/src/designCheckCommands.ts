import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, type ConstructionScenario, type DesignCheckPayload, type PermissionContext, type ProductModelPayload, type ProjectRole } from '@precast/domain';
import { productModelPayloadSchema, type CreateDesignCheckRevisionCommand } from '@precast/schemas';
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

export function buildDesignCheckRegister(model: ProductModelPayload, analysisRunId: string, analysisOutputHash: string): DesignCheckPayload {
  const panelIds = model.panels.map((item) => item.id).sort(); const jointIds = model.joints.map((item) => item.id).sort(); const anchorIds = model.anchors.map((item) => item.id).sort();
  const fallback = panelIds[0]; if (fallback === undefined) throw new AuthorizationError('Design checks require at least one panel.', 'failed-precondition');
  const finalScenario: ConstructionScenario = model.stages.includes('final') ? 'final' : model.stages[0] ?? 'final';
  const liftingScenario: ConstructionScenario = model.stages.includes('lifting') ? 'lifting' : finalScenario;
  const combination = [...model.loadCombinations].sort((a, b) => a.id.localeCompare(b.id))[0]?.id;
  const pending = (id: string, category: DesignCheckPayload['checks'][number]['category'], scenario: ConstructionScenario, entityIds: string[], message: string): DesignCheckPayload['checks'][number] => ({
    id, category, scenario, entityIds: entityIds.length > 0 ? entityIds : [fallback], ...(combination === undefined ? {} : { governingCombinationId: combination }),
    codeClauseRef: 'NOT IMPLEMENTED — verified design method pending', status: 'NOT_CHECKED', message,
  });
  return {
    schemaVersion: '1.0.0', units: 'kN-m-MPa', engine: 'precast-design-check-register@1.0.0', analysisRunId, analysisOutputHash, overallStatus: 'NOT_CHECKED',
    checks: [
      pending('check-panel-strength', 'panelStrength', finalScenario, panelIds, 'Panel strength calculation is not implemented in the local fixture.'),
      pending('check-serviceability', 'serviceability', finalScenario, panelIds, 'Serviceability limits and reinforcement response remain unverified.'),
      pending('check-opening', 'opening', finalScenario, panelIds, 'Opening reinforcement and local stress checks remain unverified.'),
      pending('check-joint', 'joint', finalScenario, jointIds, 'Joint strength, stiffness and ductility checks remain unverified.'),
      pending('check-anchor', 'anchor', finalScenario, anchorIds, 'Embedded anchor capacity and interaction checks remain unverified.'),
      pending('check-lifting', 'lifting', liftingScenario, anchorIds, 'Lifting insert, breakout and handling-stage checks remain unverified.'),
      pending('check-transport', 'transport', model.stages.includes('transport') ? 'transport' : finalScenario, panelIds, 'Transport support, dynamic and stability checks remain unverified.'),
    ],
  };
}

export async function createDesignCheckRevision(db: Firestore, uid: string, command: CreateDesignCheckRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId); const projectRef = db.doc(root); const calculationRef = db.doc(`${root}/calculationReports/${command.calculationId}`); const analysisRef = db.doc(`${root}/analysisRuns/${command.analysisRunId}`); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const [receipt, project, calculation, analysis, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(calculationRef), tx.get(analysisRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (receipt.exists) { const data = record(receipt.data()); if (data.actorUid !== uid || data.commandName !== 'createDesignCheckRevision') throw new AuthorizationError('Idempotency key was used by another command.', 'failed-precondition'); return { resourceId: required(data, 'resourceId'), state: required(data, 'resultState'), auditEventId: required(data, 'auditEventId'), replayed: true }; }
    if (!project.exists || calculation.exists || !analysis.exists) throw new AuthorizationError('Project/analysis is missing or calculation ID exists.', 'failed-precondition');
    const decision = can('create', 'calculation', context); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Design check creation denied.', 'permission-denied');
    const projectData = record(project.data()); const analysisData = record(analysis.data()); const gates = record(projectData.gateStates);
    if (gates.G3 !== 'approved' || projectData.currentApprovedAnalysisRunId !== command.analysisRunId || analysisData.status !== 'approved' || analysisData.locked !== true || analysisData.snapshotHash !== command.expectedAnalysisHash) throw new AuthorizationError('Current G3 analysis approval and matching hash are required.', 'failed-precondition');
    const modelVersionId = required(projectData, 'currentModelVersionId'); const model = await tx.get(db.doc(`${root}/productModelVersions/${modelVersionId}`)); const parsedModel = productModelPayloadSchema.safeParse(model.data()?.payload);
    if (!model.exists || !parsedModel.success) throw new AuthorizationError('Locked Product Model is unavailable.', 'failed-precondition');
    const outputHash = required(analysisData, 'outputHash'); const payload = buildDesignCheckRegister(parsedModel.data, command.analysisRunId, outputHash); const upstreamRefs = { sourceRevisionId: required(projectData, 'currentSourceRevisionId'), designBasisVersionId: required(projectData, 'currentDesignBasisVersionId'), modelVersionId, loadModelVersionId: required(projectData, 'currentLoadModelVersionId'), analysisRunId: command.analysisRunId };
    const draftHash = computeArtifactSnapshotHash({ artifactType: 'calculation', artifactId: command.calculationId, artifactRevision: command.revision, createdBy: uid, upstreamRefs, payload: payload as unknown as Record<string, unknown> });
    tx.create(calculationRef, { id: command.calculationId, revision: command.revision, status: 'draft', locked: false, createdBy: uid, isCurrentRevision: true, upstreamRefs, payload, overallStatus: payload.overallStatus, blockingConditions: payload.checks.filter((check) => check.status === 'FAIL' || (check.status === 'NOT_CHECKED' && check.disposition === undefined)).map((check) => `${check.id}: ${check.status}`), draftHash, createdAt: now, updatedAt: now });
    tx.update(projectRef, { currentCalculationReportId: command.calculationId, currentStage: 'design', 'gateStates.G4': 'inProgress', updatedAt: now, updatedBy: uid });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'calculation', artifactId: command.calculationId, artifactRevision: command.revision, action: 'create', stateBefore: 'none', stateAfter: 'draft', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: draftHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createDesignCheckRevision', actorUid: uid, resourceId: command.calculationId, resultState: 'draft', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.calculationId, state: 'draft', auditEventId: command.idempotencyKey, replayed: false };
  });
}
