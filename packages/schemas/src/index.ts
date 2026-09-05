import { z } from 'zod';

export const artifactTypeSchema = z.enum([
  'sourceRevision', 'designBasis', 'productModel', 'loadModel', 'analysis', 'estimate', 'calculation', 'drawingSet', 'releasePackage',
]);

const commandIdentitySchema = z.object({
  orgId: z.string().min(1),
  projectId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

const snapshotHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const sourceValidationSchema = z.object({
  unitValid: z.boolean(),
  coordinateValid: z.boolean(),
  levelsValid: z.boolean(),
  objectIdentityValid: z.boolean(),
  objectCount: z.number().int().nonnegative(),
  duplicateGlobalIds: z.number().int().nonnegative(),
});

export const sourceFileSchema = z.object({
  name: z.string().trim().regex(/^[a-zA-Z0-9][a-zA-Z0-9._ -]*\.(ifc|pdf)$/i),
  contentType: z.enum(['application/pdf', 'application/x-step', 'application/ifc', 'text/plain']),
  size: z.number().int().positive().max(100 * 1024 * 1024),
});

export const designBasisPayloadSchema = z.object({
  jurisdiction: z.string().trim().min(2).max(120),
  designCode: z.string().trim().min(2).max(80),
  designCodeEdition: z.string().trim().min(2).max(24),
  loadingCode: z.string().trim().min(2).max(80),
  loadingCodeEdition: z.string().trim().min(2).max(24),
  units: z.literal('kN-m-MPa'),
  designLifeYears: z.number().int().min(1).max(200),
  riskCategory: z.string().trim().min(1).max(80),
  concrete: z.object({
    fc28Mpa: z.number().min(10).max(150),
    fcLiftMpa: z.number().min(5).max(100),
    densityKgM3: z.number().min(1000).max(3500),
    stiffnessMpa: z.number().min(1000).max(100000),
    durabilityClass: z.string().trim().min(1).max(80),
    source: z.string().trim().min(2).max(240),
  }),
  reinforcement: z.object({ fyMpa: z.number().min(200).max(1000), source: z.string().trim().min(2).max(240) }),
  handling: z.object({
    liftingDynamicFactor: z.number().min(1).max(5),
    transportDynamicFactor: z.number().min(1).max(5),
    storageSupportRule: z.string().trim().min(3).max(500),
    source: z.string().trim().min(2).max(240),
  }),
  fireResistanceMinutes: z.number().int().min(0).max(360),
  inheritedFrom: z.string().trim().min(1).max(120),
  overrideReasons: z.record(z.string(), z.string().trim().min(3).max(500)),
});

const entityIdSchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/);
const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() });
const scenarioSchema = z.enum(['service', 'demould', 'lifting', 'transport', 'storage', 'installation', 'final']);

export const productModelPayloadSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  units: z.literal('kN-m-MPa'),
  coordinateSystem: z.string().trim().min(2).max(120),
  panels: z.array(z.object({
    id: entityIdSchema, mark: z.string().trim().min(1).max(40), type: z.enum(['wall', 'floor', 'roof', 'beam', 'column']),
    sourceObjectIds: z.array(entityIdSchema).min(1).max(50), materialId: entityIdSchema,
    geometry: z.object({ widthM: z.number().positive().max(50), heightM: z.number().positive().max(50), thicknessM: z.number().min(0.05).max(2), offsetM: z.number().min(-10).max(10) }),
    openings: z.array(z.object({ id: entityIdSchema, xM: z.number().nonnegative(), yM: z.number().nonnegative(), widthM: z.number().positive(), heightM: z.number().positive() })).max(50),
    volumeM3: z.number().positive(), weightKn: z.number().positive(), cogM: positionSchema,
  })).min(1).max(200),
  joints: z.array(z.object({ id: entityIdSchema, panelIds: z.tuple([entityIdSchema, entityIdSchema]), stiffnessKnM: z.number().nonnegative().max(1e9), loadPathConfirmed: z.boolean() })).max(400),
  anchors: z.array(z.object({ id: entityIdSchema, panelId: entityIdSchema, kind: z.enum(['lifting', 'embedded']), positionM: positionSchema, capacityKn: z.number().positive().max(1e6) })).max(800),
  supports: z.array(z.object({ id: entityIdSchema, panelId: entityIdSchema, scenario: scenarioSchema, positionM: positionSchema, restrainedDofs: z.array(z.enum(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ'])).min(1).max(6) })).min(1).max(800),
  loadCases: z.array(z.object({ id: entityIdSchema, scenario: scenarioSchema, type: z.enum(['dead', 'live', 'wind', 'handling', 'transport']), magnitude: z.number().finite(), unit: z.enum(['kN', 'kN/m', 'kN/m2']) })).min(1).max(100),
  loadCombinations: z.array(z.object({ id: entityIdSchema, factors: z.record(entityIdSchema, z.number().finite()).refine((value) => Object.keys(value).length > 0, 'At least one load-case factor is required.') })).min(1).max(100),
  stages: z.array(scenarioSchema).min(1).max(7),
  validation: z.object({ unsupportedNodes: z.number().int().nonnegative(), disconnectedElements: z.number().int().nonnegative(), missingLoadPaths: z.number().int().nonnegative(), geometryConflicts: z.number().int().nonnegative() }),
}).superRefine((model, context) => {
  const panelIds = new Set(model.panels.map((panel) => panel.id));
  const entityIds = [...model.panels.map((item) => item.id), ...model.joints.map((item) => item.id), ...model.anchors.map((item) => item.id), ...model.supports.map((item) => item.id), ...model.loadCases.map((item) => item.id), ...model.loadCombinations.map((item) => item.id)];
  if (new Set(entityIds).size !== entityIds.length) context.addIssue({ code: 'custom', message: 'Entity IDs must be globally unique.' });
  for (const panel of model.panels) for (const opening of panel.openings) {
    if (opening.xM + opening.widthM > panel.geometry.widthM || opening.yM + opening.heightM > panel.geometry.heightM) context.addIssue({ code: 'custom', message: `Opening ${opening.id} lies outside panel ${panel.id}.` });
  }
  for (const joint of model.joints) if (joint.panelIds[0] === joint.panelIds[1] || joint.panelIds.some((id) => !panelIds.has(id))) context.addIssue({ code: 'custom', message: `Joint ${joint.id} must connect two known distinct panels.` });
  for (const item of [...model.anchors, ...model.supports]) if (!panelIds.has(item.panelId)) context.addIssue({ code: 'custom', message: `${item.id} references an unknown panel.` });
  const stages = new Set(model.stages);
  for (const item of [...model.supports, ...model.loadCases]) if (!stages.has(item.scenario)) context.addIssue({ code: 'custom', message: `${item.id} references a scenario absent from stages.` });
  const loadCaseIds = new Set(model.loadCases.map((item) => item.id));
  for (const combination of model.loadCombinations) for (const loadCaseId of Object.keys(combination.factors)) if (!loadCaseIds.has(loadCaseId)) context.addIssue({ code: 'custom', message: `${combination.id} references unknown load case ${loadCaseId}.` });
});

export const loadAnalysisSettingsPayloadSchema = z.object({
  schemaVersion: z.literal('1.0.0'), units: z.literal('kN-m-MPa'), elementIdealization: z.literal('shell-mid-surface'), shellFormulation: z.literal('benchmark-shell'),
  meshSizeM: z.number().min(0.02).max(5), refinementZoneIds: z.array(entityIdSchema).max(200),
  stiffnessModifiers: z.object({ membrane: z.number().min(0.01).max(2), bending: z.number().min(0.01).max(2) }),
  solverTolerance: z.number().min(1e-9).max(0.1), maxIterations: z.number().int().min(1).max(10000), resultAveraging: z.enum(['nodal', 'element']),
  scenarios: z.array(z.object({ id: scenarioSchema, activeSupportIds: z.array(entityIdSchema).min(1).max(800), activeJointIds: z.array(entityIdSchema).max(400), loadCaseIds: z.array(entityIdSchema).min(1).max(100), combinationIds: z.array(entityIdSchema).min(1).max(100) })).min(1).max(7),
}).superRefine((settings, context) => {
  if (new Set(settings.scenarios.map((item) => item.id)).size !== settings.scenarios.length) context.addIssue({ code: 'custom', message: 'Analysis scenario IDs must be unique.' });
});

export const submitArtifactCommandSchema = commandIdentitySchema.extend({
  requestId: z.string().min(1),
  artifactType: artifactTypeSchema,
  artifactId: z.string().min(1),
  expectedDraftHash: snapshotHashSchema,
  assignedTo: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional(),
});

export const approveArtifactCommandSchema = commandIdentitySchema.extend({
  requestId: z.string().min(1),
  artifactType: artifactTypeSchema,
  artifactId: z.string().min(1),
  snapshotHash: snapshotHashSchema,
  comment: z.string().trim().max(2000).optional(),
});

export const returnArtifactCommandSchema = approveArtifactCommandSchema.extend({
  comment: z.string().trim().min(1).max(2000),
});

export const createProjectCommandSchema = z.object({
  orgId: z.string().min(1),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,48}$/),
  code: z.string().trim().min(3).max(24),
  name: z.string().trim().min(3).max(120),
  templateId: z.literal('type-2-residential-v1'),
  idempotencyKey: z.string().uuid(),
});

export const createDesignBasisRevisionCommandSchema = commandIdentitySchema.extend({
  designBasisId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,48}$/),
  revision: z.string().trim().min(2).max(24),
  supersedesId: z.string().min(1).optional(),
  payload: designBasisPayloadSchema,
});

export const createProductModelRevisionCommandSchema = commandIdentitySchema.extend({
  modelVersionId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,48}$/),
  revision: z.string().trim().min(2).max(24),
  supersedesId: z.string().min(1).optional(),
  payload: productModelPayloadSchema,
});

export const createLoadModelRevisionCommandSchema = commandIdentitySchema.extend({
  loadModelVersionId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,48}$/), revision: z.string().trim().min(2).max(24),
  payload: loadAnalysisSettingsPayloadSchema,
});

export const queueAnalysisRunCommandSchema = commandIdentitySchema.extend({
  runId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,48}$/), revision: z.string().trim().min(2).max(24), loadModelVersionId: z.string().min(1),
  benchmarkId: z.literal('two-panel-static-v1'), expectedModelHash: snapshotHashSchema, expectedLoadModelHash: snapshotHashSchema,
});

export const cancelAnalysisRunCommandSchema = commandIdentitySchema.extend({ runId: z.string().min(1), reason: z.string().trim().min(3).max(500) });

export const freezeSourceRevisionCommandSchema = commandIdentitySchema.extend({
  sourceRevisionId: z.string().min(1),
  expectedSnapshotHash: snapshotHashSchema,
});

export const updateProjectCommandSchema = commandIdentitySchema.extend({
  code: z.string().trim().min(3).max(24),
  name: z.string().trim().min(3).max(120),
  status: z.enum(['active', 'onHold', 'completed']),
  dueAt: z.string().datetime().optional(),
});

export const archiveProjectCommandSchema = commandIdentitySchema.extend({
  reason: z.string().trim().min(3).max(500),
});

export const engineeringIssueSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,64}$/),
  artifactType: artifactTypeSchema,
  artifactId: z.string().min(1),
  artifactRevision: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string().trim().min(3).max(160),
  comment: z.string().trim().min(1).max(2000),
});

// Backward-compatible M0 export; M1 callers should use the explicit schema name.
export const approvalCommandSchema = approveArtifactCommandSchema;

export const mockAnalysisInputSchema = z.object({
  schemaVersion: z.literal('0.1.0-mock'),
  projectId: z.string().min(1),
  sourceRevisionId: z.string().min(1),
  designBasisVersionId: z.string().min(1),
  modelVersionId: z.string().min(1),
  units: z.literal('kN-m-MPa'),
  panel: z.object({ widthM: z.number().positive(), heightM: z.number().positive(), thicknessM: z.number().positive() }),
});

export type ApprovalCommand = z.infer<typeof approvalCommandSchema>;
export type SubmitArtifactCommand = z.infer<typeof submitArtifactCommandSchema>;
export type ApproveArtifactCommand = z.infer<typeof approveArtifactCommandSchema>;
export type ReturnArtifactCommand = z.infer<typeof returnArtifactCommandSchema>;
export type CreateProjectCommand = z.infer<typeof createProjectCommandSchema>;
export type CreateDesignBasisRevisionCommand = z.infer<typeof createDesignBasisRevisionCommandSchema>;
export type CreateProductModelRevisionCommand = z.infer<typeof createProductModelRevisionCommandSchema>;
export type CreateLoadModelRevisionCommand = z.infer<typeof createLoadModelRevisionCommandSchema>;
export type QueueAnalysisRunCommand = z.infer<typeof queueAnalysisRunCommandSchema>;
export type CancelAnalysisRunCommand = z.infer<typeof cancelAnalysisRunCommandSchema>;
export type FreezeSourceRevisionCommand = z.infer<typeof freezeSourceRevisionCommandSchema>;
export type UpdateProjectCommand = z.infer<typeof updateProjectCommandSchema>;
export type ArchiveProjectCommand = z.infer<typeof archiveProjectCommandSchema>;
export type EngineeringIssueInput = z.infer<typeof engineeringIssueSchema>;
export type MockAnalysisInput = z.infer<typeof mockAnalysisInputSchema>;
