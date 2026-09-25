import { createHash } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { can, revitDrafting01Fixture, validateRevitDraftingProfile, type DocumentationSetPayload, type PermissionContext, type ProjectRole, type ReleaseFileRecord, type ReleasePackagePayload, type RevitDraftingExportProfile } from '@precast/domain';
import { documentationSetPayloadSchema, exportJobResultSchema, releasePackagePayloadSchema, type CreateReleasePackageRevisionCommand, type ExportJobResult, type ReleaseProductionPackageCommand } from '@precast/schemas';
import { AuthorizationError } from './authorization';
import { computeArtifactSnapshotHash, type CommandResult } from './workflowCommands';
import { assertDesignBasisCriteriaReady } from './designBasisReadiness';

type RecordValue = Record<string, unknown>;
const rootPath = (orgId: string, projectId: string) => `organizations/${orgId}/projects/${projectId}`;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' ? value as RecordValue : {};
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const required = (data: RecordValue, key: string): string => { const value = data[key]; if (typeof value !== 'string' || value.length === 0) throw new AuthorizationError(`${key} is required.`, 'failed-precondition'); return value; };
const sha256 = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

function assertUpstreamRefs(data: RecordValue, expected: Record<string, string>, artifactName: string): void {
  const refs = record(data.upstreamRefs);
  for (const [key, value] of Object.entries(expected)) if (refs[key] !== value) throw new AuthorizationError(`${artifactName} references stale ${key} evidence.`, 'failed-precondition');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

async function permissionContext(tx: Transaction, db: Firestore, uid: string, orgId: string, projectId: string, now: Timestamp): Promise<PermissionContext> {
  const [orgMember, projectMember] = await Promise.all([tx.get(db.doc(`organizations/${orgId}/members/${uid}`)), tx.get(db.doc(`${rootPath(orgId, projectId)}/members/${uid}`))]);
  const org = record(orgMember.data()); const project = record(projectMember.data());
  if (!orgMember.exists || org.status !== 'active' || !projectMember.exists || project.status !== 'active') throw new AuthorizationError('Active organization and project membership are required.', 'permission-denied');
  const effective = project.effectiveFrom instanceof Timestamp ? project.effectiveFrom.toMillis() : 0; const expires = project.expiresAt instanceof Timestamp ? project.expiresAt.toMillis() : undefined;
  if (effective > now.toMillis() || (expires !== undefined && expires <= now.toMillis())) throw new AuthorizationError('Project membership is not currently effective.', 'permission-denied');
  return { userId: uid, orgId, projectId, roles: strings(project.roles) as ProjectRole[], capabilities: strings(project.capabilities), membershipStatus: 'active', ...(expires === undefined ? {} : { expiresAt: new Date(expires).toISOString() }) };
}

export function buildRevitDraftingDxf(drawing: DocumentationSetPayload['drawings'][number], profile: RevitDraftingExportProfile = revitDrafting01Fixture) {
  const profileProblems = validateRevitDraftingProfile(profile);
  if (profileProblems.length > 0) throw new AuthorizationError(profileProblems.join(' '), 'failed-precondition');
  const width = drawing.geometry.widthM * 1000; const height = drawing.geometry.heightM * 1000; const panelLeft = drawing.cogM.x - drawing.geometry.widthM / 2;
  const layers = Object.values(profile.semanticLayers);
  const polyline = (layer: string, points: Array<[number, number]>) => {
    const values: string[] = ['0', 'LWPOLYLINE', '8', layer, '90', String(points.length), '70', '1'];
    for (const [x, y] of points) values.push('10', x.toFixed(3), '20', y.toFixed(3));
    return values;
  };
  const entityLines: string[] = [...polyline(profile.semanticLayers.outline, [[0, 0], [width, 0], [width, height], [0, height]])];
  for (const opening of drawing.openings) entityLines.push(...polyline(profile.semanticLayers.opening, [[opening.xM * 1000, opening.yM * 1000], [(opening.xM + opening.widthM) * 1000, opening.yM * 1000], [(opening.xM + opening.widthM) * 1000, (opening.yM + opening.heightM) * 1000], [opening.xM * 1000, (opening.yM + opening.heightM) * 1000]]));
  for (const anchor of drawing.anchors) {
    const x = (anchor.positionM.x - panelLeft) * 1000; const y = anchor.positionM.y * 1000;
    entityLines.push('0', 'CIRCLE', '8', profile.semanticLayers.embed, '10', x.toFixed(3), '20', y.toFixed(3), '30', '0.000', '40', '25.000');
    entityLines.push('0', 'TEXT', '8', profile.semanticLayers.rebarText, '10', (x + 40).toFixed(3), '20', (y + 40).toFixed(3), '30', '0.000', '40', '60.000', '1', `${anchor.id} ${anchor.capacityKn}kN`, '7', profile.font.fallback);
  }
  entityLines.push('0', 'CIRCLE', '8', profile.semanticLayers.center, '10', (width / 2).toFixed(3), '20', (drawing.cogM.y * 1000).toFixed(3), '30', '0.000', '40', '30.000');
  entityLines.push('0', 'TEXT', '8', profile.semanticLayers.text, '10', '0.000', '20', (height + 120).toFixed(3), '30', '0.000', '40', '75.000', '1', `${drawing.drawingNumber} ${drawing.revision} ${drawing.elementMark}`, '7', profile.font.fallback);
  const tableLines = layers.flatMap((layer) => ['0', 'LAYER', '2', layer, '70', '0', '62', '7', '6', 'CONTINUOUS']);
  const lines = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1032', '9', '$INSUNITS', '70', '4', '9', '$MEASUREMENT', '70', '1', '9', '$EXTMIN', '10', '0.000', '20', '0.000', '30', '0.000', '9', '$EXTMAX', '10', width.toFixed(3), '20', (height + 120).toFixed(3), '30', '0.000', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(layers.length), ...tableLines, '0', 'ENDTAB', '0', 'TABLE', '2', 'STYLE', '70', '1', '0', 'STYLE', '2', profile.font.fallback, '70', '0', '40', '0.000', '41', '1.000', '50', '0.000', '3', 'arial.ttf', '4', '', '0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...entityLines, '0', 'ENDSEC', '0', 'EOF'];
  const dxf = `${lines.join('\r\n')}\r\n`; const digest = sha256(dxf);
  const entityCounts = entityLines.reduce<Record<string, number>>((counts, value, index) => { if (entityLines[index - 1] === '0') counts[value] = (counts[value] ?? 0) + 1; return counts; }, {});
  return { dxf, sha256: digest, manifest: { profileId: profile.id, profileVersion: profile.version, drawingId: drawing.id, drawingNumber: drawing.drawingNumber, revision: drawing.revision, panelMarks: [drawing.elementMark], sourceModelVersionId: drawing.sourceRefs.modelVersionId, calculationReportId: drawing.sourceRefs.calculationReportId, units: profile.units, intendedScale: profile.intendedScale, origin: profile.origin, bounds: { minX: 0, minY: 0, maxX: width, maxY: height + 120 }, semanticLayers: profile.semanticLayers, fonts: [{ requested: profile.font.requested, emitted: profile.font.fallback, fallbackUsed: profile.font.fallbackUsed }], entityCounts, geometrySha256: sha256(stableJson({ geometry: drawing.geometry, openings: drawing.openings, anchors: drawing.anchors, cogM: drawing.cogM })), dxfSha256: digest, exporterVersion: 'precast-revit-dxf@1.0.0' } };
}

export function inspectRevitDraftingDxf(dxf: string, profile: RevitDraftingExportProfile = revitDrafting01Fixture): string[] {
  const problems = [...validateRevitDraftingProfile(profile)]; const tokens = dxf.trim().split(/\r?\n/); const pairs: Array<[string, string]> = [];
  for (let index = 0; index < tokens.length - 1; index += 2) pairs.push([tokens[index]?.trim() ?? '', tokens[index + 1]?.trim() ?? '']);
  if (!pairs.some(([code, value], index) => code === '9' && value === '$ACADVER' && pairs[index + 1]?.[1] === 'AC1032')) problems.push('DXF version is not R2018/AC1032.');
  if (!pairs.some(([code, value], index) => code === '9' && value === '$INSUNITS' && pairs[index + 1]?.[1] === '4')) problems.push('DXF $INSUNITS is not millimetres.');
  const entityStart = pairs.findIndex(([code, value], index) => code === '2' && value === 'ENTITIES' && pairs[index - 1]?.[1] === 'SECTION'); const entityEnd = pairs.findIndex(([code, value], index) => index > entityStart && code === '0' && value === 'ENDSEC');
  if (entityStart < 0 || entityEnd < 0) problems.push('DXF Model Space ENTITIES section is missing.');
  const entityPairs = entityStart < 0 || entityEnd < 0 ? [] : pairs.slice(entityStart + 1, entityEnd); const allowed = new Set<string>(profile.allowedEntities);
  for (const [code, value] of entityPairs) if (code === '0' && !allowed.has(value)) problems.push(`Unsupported DXF entity ${value}.`);
  for (const [code, value] of entityPairs) if (['30', '31', '32', '33'].includes(code) && Number(value) !== 0) problems.push('DXF contains non-zero Z geometry.');
  if (entityPairs.some(([code, value]) => code === '67' && value === '1')) problems.push('DXF contains Paper Space entities.');
  const coordinates = entityPairs.filter(([code]) => ['10', '11', '20', '21'].includes(code)).map(([, value]) => Number(value)).filter(Number.isFinite);
  if (coordinates.length === 0 || Math.max(...coordinates.map(Math.abs)) > profile.maximumExtentMm) problems.push('DXF geometry exceeds the configured local-origin extent.');
  if (!coordinates.some((value) => Math.abs(value) < 1e-6)) problems.push('DXF geometry is not anchored near the local origin.');
  const knownLayers = new Set(Object.values(profile.semanticLayers)); for (let index = 0; index < entityPairs.length; index += 1) if (entityPairs[index]?.[0] === '8' && !knownLayers.has(entityPairs[index]?.[1] ?? '')) problems.push(`Unknown semantic layer ${entityPairs[index]?.[1]}.`);
  for (const layer of knownLayers) if (!pairs.some(([code, value]) => code === '2' && value === layer)) problems.push(`Required layer ${layer} is missing.`);
  if (/XREF|ACAD_PROXY_ENTITY|IMAGE/i.test(dxf)) problems.push('DXF contains a prohibited external or proxy resource.');
  return [...new Set(problems)];
}

function requiredRoles(files: ReleaseFileRecord[], drawingIds: string[]): string[] {
  const missing: string[] = [];
  if (!files.some((file) => file.role === 'calculationPdfa')) missing.push('Calculation PDF/A');
  if (!files.some((file) => file.role === 'schedule')) missing.push('schedule');
  if (!files.some((file) => file.role === 'audit')) missing.push('audit evidence');
  for (const id of drawingIds) {
    if (!files.some((file) => file.role === 'shopDrawingPdfa' && file.drawingId === id)) missing.push(`${id} PDF/A`);
    if (!files.some((file) => file.role === 'shopDrawingDxf' && file.drawingId === id)) missing.push(`${id} DXF`);
  }
  return missing;
}

export function buildReleasePackagePayload(input: { packageId: string; revision: string; exportJobId: string; designBasisVersionId: string; designBasisSnapshotHash: string; modelVersionId: string; modelSnapshotHash: string; calculationReportId: string; calculationSnapshotHash: string; drawingSetId: string; drawingSetSnapshotHash: string; drawingIds: string[]; exportJob: ExportJobResult }): ReleasePackagePayload {
  const files = [...input.exportJob.files].sort((a, b) => a.path.localeCompare(b.path)); const missing = requiredRoles(files, input.drawingIds);
  if (missing.length > 0) throw new AuthorizationError(`Export job is missing required files: ${missing.join(', ')}.`, 'failed-precondition');
  if (input.exportJob.revitVerification.status !== 'PASS' || input.exportJob.revitVerification.visualComparison !== 'PASS') throw new AuthorizationError('Actual target Revit import and PDF/A visual comparison must PASS before package composition.', 'failed-precondition');
  const allowedSourceHashes = new Set([input.designBasisSnapshotHash, input.modelSnapshotHash, input.calculationSnapshotHash, input.drawingSetSnapshotHash]);
  if (files.some((file) => !allowedSourceHashes.has(file.sourceSnapshotHash))) throw new AuthorizationError('Export file references an unapproved or stale source snapshot.', 'failed-precondition');
  const upstream = { designBasisVersionId: input.designBasisVersionId, designBasisSnapshotHash: input.designBasisSnapshotHash, modelVersionId: input.modelVersionId, modelSnapshotHash: input.modelSnapshotHash, calculationReportId: input.calculationReportId, calculationSnapshotHash: input.calculationSnapshotHash, drawingSetId: input.drawingSetId, drawingSetSnapshotHash: input.drawingSetSnapshotHash };
  const manifestSha256 = sha256(stableJson({ upstream, exportProfileId: 'REVIT-DRAFTING-01', files, revitVerification: input.exportJob.revitVerification }));
  const checksumsSha256 = sha256(files.map((file) => `${file.sha256.slice(7)}  ${file.path}`).join('\n') + '\n');
  const checks: ReleasePackagePayload['preflight']['checks'] = [
    { id: 'release-g6-approval', category: 'g6Approval', status: 'PASS', message: 'Current G6 Documentation Set is independently approved and locked.' },
    { id: 'release-upstreams', category: 'upstreamAlignment', status: 'PASS', message: 'Design Basis, model, calculation and drawing revision hashes are aligned.' },
    { id: 'release-files', category: 'fileCompleteness', status: 'PASS', message: `${files.length} worker-produced files cover every required package role.` },
    { id: 'release-checksums', category: 'checksumIntegrity', status: 'PASS', message: 'Every file has a SHA-256 checksum and the checksum register is deterministic.' },
    { id: 'release-revit', category: 'revitDxf', status: 'PASS', message: `DXF import passed ${input.exportJob.revitVerification.target} ${input.exportJob.revitVerification.targetVersion} verification.` },
    { id: 'release-storage', category: 'immutableStorage', status: 'PASS', message: 'Export worker attests immutable package storage.' },
  ];
  const payload: ReleasePackagePayload = { schemaVersion: '1.0.0', engine: 'precast-release-manifest@1.0.0', issuePurpose: 'productionRelease', packageName: `${input.packageId}_${input.revision}`, exportJobId: input.exportJobId, upstream, exportProfileId: 'REVIT-DRAFTING-01', files, manifestSha256, checksumsSha256, revitVerification: input.exportJob.revitVerification, preflight: { overallStatus: 'PASS', checks } };
  const parsed = releasePackagePayloadSchema.safeParse(payload); if (!parsed.success) throw new AuthorizationError('Server-generated Release Package failed schema validation.', 'failed-precondition'); return parsed.data;
}

export async function createReleasePackageRevision(db: Firestore, uid: string, command: CreateReleasePackageRevisionCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId); const projectRef = db.doc(root); const packageRef = db.doc(`${root}/releasePackages/${command.releasePackageId}`); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const [receipt, project, existing, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(packageRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (receipt.exists) { const data = record(receipt.data()); if (data.actorUid !== uid || data.commandName !== 'createReleasePackageRevision') throw new AuthorizationError('Idempotency key was used by another command.', 'failed-precondition'); return { resourceId: required(data, 'resourceId'), state: required(data, 'resultState'), auditEventId: required(data, 'auditEventId'), replayed: true }; }
    if (!project.exists || existing.exists) throw new AuthorizationError(existing.exists ? 'Release Package revision already exists.' : 'Project does not exist.', 'failed-precondition');
    const decision = can('create', 'releasePackage', context); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Release Package composition denied.', 'permission-denied');
    const projectData = record(project.data()); const drawingSetId = required(projectData, 'currentDrawingSetId'); const gates = record(projectData.gateStates);
    if (gates.G4 !== 'approved' || gates.G6 !== 'approved') throw new AuthorizationError('Approved current G4 and G6 evidence is required before Release Package composition.', 'failed-precondition');
    const sourceRevisionId = required(projectData, 'currentSourceRevisionId'); const designBasisVersionId = required(projectData, 'currentDesignBasisVersionId'); const modelVersionId = required(projectData, 'currentModelVersionId'); const analysisRunId = required(projectData, 'currentApprovedAnalysisRunId'); const calculationReportId = required(projectData, 'currentCalculationReportId');
    const [basis, model, calculation, drawingSet, exportJob] = await Promise.all([tx.get(db.doc(`${root}/designBasisVersions/${designBasisVersionId}`)), tx.get(db.doc(`${root}/productModelVersions/${modelVersionId}`)), tx.get(db.doc(`${root}/calculationReports/${calculationReportId}`)), tx.get(db.doc(`${root}/drawingSets/${drawingSetId}`)), tx.get(db.doc(`${root}/exportJobs/${command.exportJobId}`))]);
    const basisData = record(basis.data()); const modelData = record(model.data()); const calculationData = record(calculation.data()); const drawingData = record(drawingSet.data()); const parsedDrawing = documentationSetPayloadSchema.safeParse(drawingData.payload); const parsedExport = exportJobResultSchema.safeParse(exportJob.data());
    for (const [name, snapshot, data] of [['Design Basis', basis, basisData], ['Product Model', model, modelData], ['Calculation Report', calculation, calculationData], ['Documentation Set', drawingSet, drawingData]] as const) if (!snapshot.exists || data.status !== 'approved' || data.locked !== true || typeof data.snapshotHash !== 'string') throw new AuthorizationError(`${name} must be approved, locked and hashed.`, 'failed-precondition');
    assertUpstreamRefs(basisData, { sourceRevisionId }, 'Design Basis');
    assertDesignBasisCriteriaReady(basisData.payload);
    assertUpstreamRefs(modelData, { sourceRevisionId, designBasisVersionId }, 'Product Model');
    assertUpstreamRefs(calculationData, { sourceRevisionId, designBasisVersionId, modelVersionId, analysisRunId }, 'Calculation Report');
    assertUpstreamRefs(drawingData, { sourceRevisionId, designBasisVersionId, modelVersionId, analysisRunId, calculationReportId }, 'Documentation Set');
    if (!parsedDrawing.success || parsedDrawing.data.preflight.overallStatus !== 'PASS' || parsedDrawing.data.overallDesignStatus !== 'PASS' || strings(drawingData.blockingConditions).length > 0) throw new AuthorizationError('G6 Documentation Set is not release-ready.', 'failed-precondition');
    if (drawingData.snapshotHash !== command.expectedDrawingSetHash) throw new AuthorizationError('Documentation Set hash changed before package composition.', 'failed-precondition');
    if (!parsedExport.success || parsedExport.data.sourceDrawingSetId !== drawingSetId || parsedExport.data.sourceDrawingSetHash !== command.expectedDrawingSetHash) throw new AuthorizationError('Completed export worker evidence for the current G6 snapshot is required.', 'failed-precondition');
    const payload = buildReleasePackagePayload({ packageId: command.releasePackageId, revision: command.revision, exportJobId: command.exportJobId, designBasisVersionId, designBasisSnapshotHash: required(basisData, 'snapshotHash'), modelVersionId, modelSnapshotHash: required(modelData, 'snapshotHash'), calculationReportId, calculationSnapshotHash: required(calculationData, 'snapshotHash'), drawingSetId, drawingSetSnapshotHash: command.expectedDrawingSetHash, drawingIds: parsedDrawing.data.drawings.map((drawing) => drawing.id), exportJob: parsedExport.data });
    const upstreamRefs = { sourceRevisionId, designBasisVersionId, modelVersionId, analysisRunId, calculationReportId, drawingSetId };
    const draftHash = computeArtifactSnapshotHash({ artifactType: 'releasePackage', artifactId: command.releasePackageId, artifactRevision: command.revision, createdBy: uid, upstreamRefs, payload: payload as unknown as Record<string, unknown> });
    tx.create(packageRef, { id: command.releasePackageId, revision: command.revision, status: 'draft', releaseState: 'readyForTechnicalApproval', locked: false, isCurrentRevision: true, createdBy: uid, upstreamRefs, payload, blockingConditions: [], draftHash, createdAt: now, updatedAt: now, updatedBy: uid });
    tx.update(projectRef, { currentReleasePackageId: command.releasePackageId, 'gateStates.G7': 'readyForReview', updatedAt: now, updatedBy: uid });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'releasePackage', artifactId: command.releasePackageId, artifactRevision: command.revision, action: 'create', stateBefore: 'none', stateAfter: 'readyForTechnicalApproval', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: draftHash });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'createReleasePackageRevision', actorUid: uid, resourceId: command.releasePackageId, resultState: 'readyForTechnicalApproval', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.releasePackageId, state: 'readyForTechnicalApproval', auditEventId: command.idempotencyKey, replayed: false };
  });
}

export async function releaseProductionPackage(db: Firestore, uid: string, command: ReleaseProductionPackageCommand): Promise<CommandResult> {
  return db.runTransaction(async (tx) => {
    const now = Timestamp.now(); const root = rootPath(command.orgId, command.projectId); const projectRef = db.doc(root); const packageRef = db.doc(`${root}/releasePackages/${command.releasePackageId}`); const receiptRef = db.doc(`${root}/commandReceipts/${command.idempotencyKey}`);
    const [receipt, project, snapshot, context] = await Promise.all([tx.get(receiptRef), tx.get(projectRef), tx.get(packageRef), permissionContext(tx, db, uid, command.orgId, command.projectId, now)]);
    if (receipt.exists) { const data = record(receipt.data()); if (data.actorUid !== uid || data.commandName !== 'releaseProductionPackage') throw new AuthorizationError('Idempotency key was used by another command.', 'failed-precondition'); return { resourceId: required(data, 'resourceId'), state: required(data, 'resultState'), auditEventId: required(data, 'auditEventId'), replayed: true }; }
    if (!project.exists || !snapshot.exists) throw new AuthorizationError('Project or Release Package does not exist.', 'failed-precondition');
    const data = record(snapshot.data()); const decision = can('release', 'releasePackage', { ...context, artifactStatus: required(data, 'status'), artifactCreatedBy: required(data, 'createdBy'), isCurrentRevision: data.isCurrentRevision !== false }); if (!decision.allowed) throw new AuthorizationError(decision.reason ?? 'Production Release denied.', 'permission-denied');
    const projectData = record(project.data()); if (projectData.currentReleasePackageId !== command.releasePackageId || record(projectData.gateStates).G4 !== 'approved' || record(projectData.gateStates).G6 !== 'approved') throw new AuthorizationError('Only the current package with approved G4/G6 evidence can be released.', 'failed-precondition');
    if (data.status !== 'approved' || data.locked !== true || data.snapshotHash !== command.expectedSnapshotHash) throw new AuthorizationError('Release Package must be independently approved, locked and hash-matched.', 'failed-precondition');
    const approvedBy = required(data, 'approvedBy'); if (approvedBy === uid) throw new AuthorizationError('Technical approval and Production Release require distinct actors.', 'failed-precondition');
    const parsed = releasePackagePayloadSchema.safeParse(data.payload); if (!parsed.success || parsed.data.preflight.overallStatus !== 'PASS' || parsed.data.revitVerification.status !== 'PASS' || strings(data.blockingConditions).length > 0) throw new AuthorizationError('Release preflight or Revit verification is incomplete.', 'failed-precondition');
    const refs = record(data.upstreamRefs);
    for (const [refKey, projectKey] of Object.entries({ sourceRevisionId: 'currentSourceRevisionId', designBasisVersionId: 'currentDesignBasisVersionId', modelVersionId: 'currentModelVersionId', analysisRunId: 'currentApprovedAnalysisRunId', calculationReportId: 'currentCalculationReportId', drawingSetId: 'currentDrawingSetId' })) if (refs[refKey] !== projectData[projectKey]) throw new AuthorizationError(`Release Package is stale because ${projectKey} changed.`, 'failed-precondition');
    const currentBasis = await tx.get(db.doc(`${root}/designBasisVersions/${required(projectData, 'currentDesignBasisVersionId')}`));
    const basisData = record(currentBasis.data());
    if (basisData.status !== 'approved' || basisData.locked !== true || basisData.snapshotHash !== parsed.data.upstream.designBasisSnapshotHash) throw new AuthorizationError('Current Design Basis approval no longer matches the release package.', 'failed-precondition');
    assertDesignBasisCriteriaReady(basisData.payload);
    tx.update(packageRef, { status: 'released', releaseState: 'released', locked: true, releasedBy: uid, releasedAt: now, recipient: command.recipient, productionQueue: command.productionQueue });
    tx.update(projectRef, { currentStage: 'productionRelease', 'gateStates.G7': 'approved', updatedAt: now, updatedBy: uid });
    tx.create(db.doc(`${root}/auditEvents/${command.idempotencyKey}`), { id: command.idempotencyKey, orgId: command.orgId, projectId: command.projectId, artifactType: 'releasePackage', artifactId: command.releasePackageId, artifactRevision: required(data, 'revision'), action: 'release', stateBefore: 'approved', stateAfter: 'released', actorUid: uid, effectiveRoles: context.roles, delegatedCapabilities: context.capabilities, occurredAt: now, requestId: command.idempotencyKey, idempotencyKey: command.idempotencyKey, snapshotHash: command.expectedSnapshotHash, comment: `Released to ${command.recipient} / ${command.productionQueue}.` });
    tx.create(receiptRef, { idempotencyKey: command.idempotencyKey, commandName: 'releaseProductionPackage', actorUid: uid, resourceId: command.releasePackageId, resultState: 'released', auditEventId: command.idempotencyKey, createdAt: now });
    return { resourceId: command.releasePackageId, state: 'released', auditEventId: command.idempotencyKey, replayed: false };
  });
}
