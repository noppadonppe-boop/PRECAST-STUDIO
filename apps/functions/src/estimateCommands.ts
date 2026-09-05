import { createHash } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, type DesignCheckStatus, type EstimatePayload, type EstimateUnit, type PermissionContext, type PriceBookRecord, type ProductModelPayload, type ProjectRole } from '@precast/domain';
import { estimatePayloadSchema, priceBookSchema, productModelPayloadSchema, type CreateEstimateRevisionCommand } from '@precast/schemas';
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

interface CostParameters {
  effectiveDate: string;
  indirectPercent: number;
  contingencyPercent: number;
  markupPercent: number;
  vatPercent: number;
  uncertaintyPercent: number;
  designDependencyStatus: DesignCheckStatus;
}

interface QuantityLine {
  id: string; costCode: string; description: string; category: EstimatePayload['lines'][number]['category'];
  elementIds: string[]; quantityRule: string; rawQuantity: number; wastePercent: number; unit: EstimateUnit;
}

function quantityLines(model: ProductModelPayload): QuantityLine[] {
  const panelIds = model.panels.map((item) => item.id).sort();
  const liftingAnchors = model.anchors.filter((item) => item.kind === 'lifting').map((item) => item.id).sort();
  const jointIds = model.joints.map((item) => item.id).sort();
  const formwork = model.panels.reduce((sum, panel) => {
    const openings = panel.openings.reduce((openingSum, opening) => openingSum + opening.widthM * opening.heightM, 0);
    const face = Math.max(0, panel.geometry.widthM * panel.geometry.heightM - openings);
    const edges = 2 * (panel.geometry.widthM + panel.geometry.heightM) * panel.geometry.thicknessM;
    return sum + 2 * face + edges;
  }, 0);
  const jointLength = model.joints.reduce((sum, joint) => {
    const connected = joint.panelIds.map((id) => model.panels.find((panel) => panel.id === id)?.geometry.heightM ?? 0);
    return sum + Math.min(...connected);
  }, 0);
  return [
    { id: 'line-concrete', costCode: 'CONC-C40', description: 'C40 precast concrete', category: 'material', elementIds: panelIds, quantityRule: 'Sum exact panel volumeM3 from the approved Product Model.', rawQuantity: model.panels.reduce((sum, item) => sum + item.volumeM3, 0), wastePercent: 3, unit: 'm3' },
    { id: 'line-formwork', costCode: 'FORM-PANEL', description: 'Panel contact formwork', category: 'manufacturing', elementIds: panelIds, quantityRule: 'Two net panel faces plus perimeter edges; opening areas deducted from both faces.', rawQuantity: formwork, wastePercent: 5, unit: 'm2' },
    { id: 'line-lifting', costCode: 'ANCH-LIFT', description: 'Certified lifting anchors', category: 'material', elementIds: liftingAnchors.length > 0 ? liftingAnchors : panelIds, quantityRule: 'Count lifting-kind anchor entities; panel IDs are retained only when no anchor entity exists.', rawQuantity: liftingAnchors.length, wastePercent: 0, unit: 'each' },
    { id: 'line-joints', costCode: 'JOINT-SEAL', description: 'Panel joint sealing system', category: 'installation', elementIds: jointIds.length > 0 ? jointIds : panelIds, quantityRule: 'Sum the lesser panel height for every model joint.', rawQuantity: jointLength, wastePercent: 8, unit: 'm' },
    { id: 'line-transport', costCode: 'LOG-TRANSPORT', description: 'Precast transport allowance by model weight', category: 'logistics', elementIds: panelIds, quantityRule: 'Sum panel weightKn and convert to metric tonnes using 9.80665 kN/t.', rawQuantity: model.panels.reduce((sum, item) => sum + item.weightKn, 0) / 9.80665, wastePercent: 0, unit: 't' },
  ];
}

export function buildEngineeringEstimate(model: ProductModelPayload, priceBook: PriceBookRecord, parameters: CostParameters): EstimatePayload {
  const lines: EstimatePayload['lines'] = quantityLines(model).map((quantity) => {
    const candidates = priceBook.items.filter((item) => item.costCode === quantity.costCode && item.status === 'approved');
    const unitCandidates = candidates.filter((item) => item.unit === quantity.unit);
    const currentCandidates = unitCandidates.filter((item) => item.effectiveFrom <= parameters.effectiveDate && (item.effectiveTo === undefined || item.effectiveTo >= parameters.effectiveDate))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id));
    const unitCandidate = currentCandidates[0];
    const payableQuantity = quantity.rawQuantity * (1 + quantity.wastePercent / 100);
    let rateStatus: EstimatePayload['lines'][number]['rateStatus'] = 'missingRate';
    if (candidates.length > 0 && unitCandidates.length === 0) rateStatus = 'unitMismatch';
    else if (unitCandidates.length > 0 && unitCandidate === undefined) rateStatus = 'expiredRate';
    else if (unitCandidate !== undefined) rateStatus = 'current';
    const unitRate = rateStatus === 'current' ? unitCandidate!.baseRate : null;
    return { ...quantity, sourceType: 'model', payableQuantity, unitRate, rateSourceRef: rateStatus === 'current' ? unitCandidate!.sourceRef : null, amount: unitRate === null ? null : payableQuantity * unitRate, rateStatus };
  });
  const pricedDirectCost = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const incomplete = lines.some((line) => line.rateStatus !== 'current') || parameters.designDependencyStatus !== 'PASS';
  type DerivedTotals = Pick<EstimatePayload['summary'], 'directCost' | 'indirectCost' | 'contingency' | 'estimatedCost' | 'markup' | 'sellingPrice' | 'vat' | 'grandTotal' | 'lowRange' | 'highRange'>;
  const absent: DerivedTotals = { directCost: null, indirectCost: null, contingency: null, estimatedCost: null, markup: null, sellingPrice: null, vat: null, grandTotal: null, lowRange: null, highRange: null };
  let completed: DerivedTotals = absent;
  if (!incomplete) {
    const directCost = pricedDirectCost; const indirectCost = directCost * parameters.indirectPercent / 100;
    const contingency = (directCost + indirectCost) * parameters.contingencyPercent / 100; const estimatedCost = directCost + indirectCost + contingency;
    const markup = estimatedCost * parameters.markupPercent / 100; const sellingPrice = estimatedCost + markup; const vat = sellingPrice * parameters.vatPercent / 100; const grandTotal = sellingPrice + vat;
    completed = { directCost, indirectCost, contingency, estimatedCost, markup, sellingPrice, vat, grandTotal, lowRange: grandTotal * (1 - parameters.uncertaintyPercent / 100), highRange: grandTotal * (1 + parameters.uncertaintyPercent / 100) };
  }
  const estimate: EstimatePayload = {
    schemaVersion: '1.0.0', maturity: 'engineering', currency: 'THB', quantityRuleVersion: 'precast-qto@1.0.0', priceBookId: priceBook.id, priceBookRevision: priceBook.revision,
    effectiveDate: parameters.effectiveDate, designDependencyStatus: parameters.designDependencyStatus, uncertaintyPercent: parameters.uncertaintyPercent, lines,
    summary: { pricedDirectCost, ...completed, indirectPercent: parameters.indirectPercent, contingencyPercent: parameters.contingencyPercent, markupMethod: 'markup', markupPercent: parameters.markupPercent, vatPercent: parameters.vatPercent },
    assumptions: [
      { id: 'assumption-design', classification: 'excluded', statement: 'G4 design checks must reach PASS before this estimate can be submitted or issued.', blocking: parameters.designDependencyStatus !== 'PASS' },
      { id: 'assumption-geometry', classification: 'included', statement: 'Quantities use exact model values without rounding; rounding is display-only.', blocking: false },
      { id: 'assumption-scope', classification: 'excluded', statement: 'Land, finance charges, permits and owner-supplied works are excluded.', blocking: false },
    ],
  };
  const parsed = estimatePayloadSchema.safeParse(estimate);
  if (!parsed.success) throw new AuthorizationError('Server-calculated estimate failed deterministic schema validation.', 'failed-precondition');
  return parsed.data;
}

export function estimateBlockingConditions(payload: EstimatePayload): string[] {
  const conditions: string[] = [];
  if (payload.designDependencyStatus !== 'PASS') conditions.push(`G4 design dependency is ${payload.designDependencyStatus}.`);
  for (const line of payload.lines.filter((item) => item.rateStatus !== 'current')) conditions.push(`${line.costCode}: ${line.rateStatus}.`);
  return conditions;
}

export interface EstimateExportManifest {
  estimateId: string;
  estimateRevision: string;
  estimateSnapshotHash: string;
  payloadHash: string;
  files: Array<{ format: 'xlsx' | 'pdf' | 'csv' | 'json'; name: string }>;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export function buildEstimateExportManifest(input: { id: string; revision: string; status: string; locked: boolean; snapshotHash?: string; blockingConditions: string[]; payload: unknown }): EstimateExportManifest {
  const parsed = estimatePayloadSchema.safeParse(input.payload);
  if (!parsed.success || input.status !== 'approved' || !input.locked || input.snapshotHash === undefined || input.blockingConditions.length > 0) {
    throw new AuthorizationError('XLSX, PDF and audit exports require an approved, locked, reproducible estimate snapshot with no blockers.', 'failed-precondition');
  }
  if (estimateBlockingConditions(parsed.data).length > 0 || parsed.data.summary.grandTotal === null) throw new AuthorizationError('Estimate dependencies or totals are incomplete; exports remain blocked.', 'failed-precondition');
  const canonical = stableJson(parsed.data);
  const payloadHash = `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
  const base = `${input.id}-${input.revision}`.toLowerCase();
  return { estimateId: input.id, estimateRevision: input.revision, estimateSnapshotHash: input.snapshotHash, payloadHash, files: [
    { format: 'xlsx', name: `${base}-boq.xlsx` }, { format: 'pdf', name: `${base}-estimate.pdf` }, { format: 'csv', name: `${base}-audit.csv` }, { format: 'json', name: `${base}-audit.json` },
  ] };
}

export async function createEstimateRevision(db: Firestore, uid: string, command: CreateEstimateRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId);
    const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`); const projectRef = db.doc(root); const estimateRef = db.doc(`${root}/estimateVersions/${command.estimateId}`);
    const priceBookRef = db.doc(`organizations/${command.orgId}/priceBooks/${command.priceBookId}`);
    const [receipt, project, existing, bookSnapshot, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(estimateRef), tx.get(priceBookRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (receipt.exists) { const data = record(receipt.data()); if (data.actorUid !== uid || data.commandName !== 'createEstimateRevision') throw new AuthorizationError('Idempotency key was used by another command.', 'failed-precondition'); return { resourceId: required(data, 'resourceId'), state: required(data, 'resultState'), auditEventId: required(data, 'auditEventId'), replayed: true }; }
    if (!project.exists || existing.exists) throw new AuthorizationError(existing.exists ? 'Estimate revision ID already exists.' : 'Project does not exist.', 'failed-precondition');
    const decision = can('create', 'estimate', context); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Estimate creation denied.', 'permission-denied');
    const projectData = record(project.data()); if (record(projectData.gateStates).G3 !== 'approved') throw new AuthorizationError('G3 must be approved before quantity takeoff.', 'failed-precondition');
    const modelVersionId = required(projectData, 'currentModelVersionId'); const modelRef = db.doc(`${root}/productModelVersions/${modelVersionId}`); const modelSnapshot = await tx.get(modelRef); const modelData = record(modelSnapshot.data());
    if (!modelSnapshot.exists || modelData.status !== 'approved' || modelData.locked !== true || modelData.snapshotHash !== command.expectedModelHash) throw new AuthorizationError('Estimate requires the current approved, locked Product Model snapshot.', 'failed-precondition');
    const model = productModelPayloadSchema.parse(modelData.payload); const parsedBook = priceBookSchema.safeParse(bookSnapshot.data());
    if (!bookSnapshot.exists || !parsedBook.success || parsedBook.data.status !== 'approved' || parsedBook.data.revision !== command.priceBookRevision) throw new AuthorizationError('The selected approved Price Book revision is unavailable.', 'failed-precondition');
    const calculationId = typeof projectData.currentCalculationReportId === 'string' ? projectData.currentCalculationReportId : undefined;
    let designDependencyStatus: DesignCheckStatus = 'NOT_CHECKED';
    if (calculationId !== undefined) { const calculation = await tx.get(db.doc(`${root}/calculationReports/${calculationId}`)); const payload = record(record(calculation.data()).payload); if (payload.overallStatus === 'PASS' || payload.overallStatus === 'FAIL' || payload.overallStatus === 'NOT_CHECKED') designDependencyStatus = payload.overallStatus; }
    const payload = buildEngineeringEstimate(model, parsedBook.data, { ...command, designDependencyStatus });
    const upstreamRefs = { sourceRevisionId: required(projectData, 'currentSourceRevisionId'), designBasisVersionId: required(projectData, 'currentDesignBasisVersionId'), modelVersionId, analysisRunId: required(projectData, 'currentApprovedAnalysisRunId'), ...(calculationId === undefined ? {} : { calculationReportId: calculationId }) };
    const draftHash = computeArtifactSnapshotHash({ artifactType: 'estimate', artifactId: command.estimateId, artifactRevision: command.revision, createdBy: uid, upstreamRefs, payload: payload as unknown as Record<string, unknown> });
    const blockingConditions = estimateBlockingConditions(payload); const auditRef = db.doc(`${root}/auditEvents/${command.idempotencyKey}`);
    tx.create(estimateRef, { id: command.estimateId, revision: command.revision, status: 'draft', estimateState: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', maturity: payload.maturity, locked: false, createdBy: uid, isCurrentRevision: true, upstreamRefs, payload, blockingConditions, draftHash, createdAt: now, updatedAt: now, updatedBy: uid });
    tx.update(projectRef, { currentEstimateVersionId: command.estimateId, currentStage: 'estimate', 'gateStates.G5': blockingConditions.length === 0 ? 'inProgress' : 'needsAttention', updatedAt: now, updatedBy: uid });
    tx.create(auditRef, { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'estimate', artifactId: command.estimateId, artifactRevision: command.revision, action: 'create', stateBefore: 'none', stateAfter: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: draftHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createEstimateRevision', actorUid: uid, resourceId: command.estimateId, resultState: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.estimateId, state: blockingConditions.length === 0 ? 'readyForReview' : 'incomplete', auditEventId: command.idempotencyKey, replayed: false };
  });
}
