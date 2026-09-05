import { doc, onSnapshot } from 'firebase/firestore';
import type { ProjectRecord } from '@precast/domain';
import { firestore } from '../firebase/client';

export const pilotGates = [
  { gate: 'G0', label: 'Source', collection: 'sourceRevisions', field: 'currentSourceRevisionId' },
  { gate: 'G1', label: 'Design Basis', collection: 'designBasisVersions', field: 'currentDesignBasisVersionId' },
  { gate: 'G2', label: 'Product Model', collection: 'productModelVersions', field: 'currentModelVersionId' },
  { gate: 'G3', label: 'Approved Analysis', collection: 'analysisRuns', field: 'currentApprovedAnalysisRunId' },
  { gate: 'G4', label: 'Calculation', collection: 'calculationReports', field: 'currentCalculationReportId' },
  { gate: 'G5', label: 'Estimate', collection: 'estimateVersions', field: 'currentEstimateVersionId' },
  { gate: 'G6', label: 'Drawing Set', collection: 'drawingSets', field: 'currentDrawingSetId' },
  { gate: 'G7', label: 'Release Package', collection: 'releasePackages', field: 'currentReleasePackageId' },
] as const;
export interface PilotEvidence { id: string; status: string; revision: string; hash: string; scanState: string; blockers: string[] }
export type PilotEvidenceSnapshot = Record<string, PilotEvidence | null>;
const safeSegment = (value: string) => value.length > 0 && !value.includes('/') && value !== '.' && value !== '..';

export function watchPilotEvidence(project: ProjectRecord, onValue: (value: PilotEvidenceSnapshot) => void, onError: (error: Error) => void) {
  const values: PilotEvidenceSnapshot = {};
  let active = true;
  const links = pilotGates.filter((gate) => project[gate.field]);
  if (![project.orgId, project.id, ...links.map((gate) => project[gate.field]!)].every(safeSegment)) {
    onError(new Error('Invalid evidence reference.')); return () => {};
  }
  const stops = links.map((gate) => {
    const id = project[gate.field]!;
    return onSnapshot(doc(firestore, `organizations/${project.orgId}/projects/${project.id}/${gate.collection}/${id}`), (snapshot) => {
      if (!active) return;
      const data = snapshot.data();
      const str = (key: string): string => typeof data?.[key] === 'string' ? data[key] : 'not recorded';
      values[gate.gate] = data ? { id, status: str('status'), revision: str('revision'), hash: typeof data.snapshotHash === 'string' ? data.snapshotHash : str('draftHash'), scanState: str('scanState'), blockers: Array.isArray(data.blockingConditions) ? data.blockingConditions.filter((item): item is string => typeof item === 'string') : [] } : null;
      onValue({ ...values });
    }, (error) => { if (active) onError(error); });
  });
  return () => { active = false; stops.forEach((stop) => stop()); };
}
