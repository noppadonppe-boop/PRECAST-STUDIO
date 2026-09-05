import { createHash } from 'node:crypto';
import { mockAnalysisInputSchema, type MockAnalysisInput } from '@precast/schemas';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`;
}

export function runDeterministicMockAnalysis(raw: MockAnalysisInput) {
  const input = mockAnalysisInputSchema.parse(raw);
  const areaM2 = input.panel.widthM * input.panel.heightM;
  const volumeM3 = areaM2 * input.panel.thicknessM;
  const selfWeightKn = volumeM3 * 24;
  const summary = {
    status: 'notChecked' as const,
    areaM2,
    volumeM3,
    selfWeightKn,
    notice: 'Deterministic M0 fixture only. Not an authoritative engineering analysis.',
    engineName: 'precast-mock-fixture',
    engineVersion: '0.1.0',
  };
  return { inputHash: sha256(input), outputHash: sha256(summary), summary };
}

