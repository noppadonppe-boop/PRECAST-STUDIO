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
export type MockAnalysisInput = z.infer<typeof mockAnalysisInputSchema>;
