import { describe, expect, it } from 'vitest';
import { runDeterministicMockAnalysis } from './mockAnalysis';

const input = {
  schemaVersion: '0.1.0-mock' as const,
  projectId: 'project-a', sourceRevisionId: 'src-r02', designBasisVersionId: 'db-r02', modelVersionId: 'model-r04',
  units: 'kN-m-MPa' as const, panel: { widthM: 3, heightM: 3.2, thicknessM: 0.15 },
};

describe('deterministic mock analysis fixture', () => {
  it('returns identical hashes for identical input and never claims PASS', () => {
    const first = runDeterministicMockAnalysis(input);
    const second = runDeterministicMockAnalysis(input);
    expect(first).toEqual(second);
    expect(first.summary.status).toBe('notChecked');
    expect(first.summary.selfWeightKn).toBeCloseTo(34.56);
  });
});

