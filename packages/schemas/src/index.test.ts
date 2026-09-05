import { describe, expect, it } from 'vitest';
import { approvalCommandSchema, mockAnalysisInputSchema } from './index';

describe('versioned runtime schemas', () => {
  it('rejects an unversioned mock analysis payload', () => {
    expect(mockAnalysisInputSchema.safeParse({ projectId: 'p1' }).success).toBe(false);
  });

  it('rejects a malformed approval snapshot hash', () => {
    const result = approvalCommandSchema.safeParse({
      orgId: 'o1', projectId: 'p1', requestId: 'r1', artifactType: 'designBasis', artifactId: 'db1',
      snapshotHash: 'not-a-hash', idempotencyKey: '2f6b1204-45b1-49af-97eb-f5f35ca0d22b',
    });
    expect(result.success).toBe(false);
  });
});

