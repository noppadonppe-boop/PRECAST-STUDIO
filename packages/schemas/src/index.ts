import { z } from 'zod';

export const artifactTypeSchema = z.enum([
  'sourceRevision', 'designBasis', 'analysis', 'estimate', 'calculation', 'drawingSet', 'releasePackage',
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
export type FreezeSourceRevisionCommand = z.infer<typeof freezeSourceRevisionCommandSchema>;
export type UpdateProjectCommand = z.infer<typeof updateProjectCommandSchema>;
export type ArchiveProjectCommand = z.infer<typeof archiveProjectCommandSchema>;
export type EngineeringIssueInput = z.infer<typeof engineeringIssueSchema>;
export type MockAnalysisInput = z.infer<typeof mockAnalysisInputSchema>;
