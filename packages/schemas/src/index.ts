import { z } from 'zod';

export const artifactTypeSchema = z.enum([
  'sourceRevision', 'designBasis', 'analysis', 'estimate', 'calculation', 'drawingSet', 'releasePackage',
]);

export const approvalCommandSchema = z.object({
  orgId: z.string().min(1),
  projectId: z.string().min(1),
  requestId: z.string().min(1),
  artifactType: artifactTypeSchema,
  artifactId: z.string().min(1),
  snapshotHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
  comment: z.string().trim().max(2000).optional(),
});

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
export type MockAnalysisInput = z.infer<typeof mockAnalysisInputSchema>;

