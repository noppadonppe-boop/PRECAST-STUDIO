import { describe, expect, it } from 'vitest';
import type { DocumentationSetPayload } from '@precast/domain';
import type { ExportJobResult } from '@precast/schemas';
import { buildReleasePackagePayload, buildRevitDraftingDxf, inspectRevitDraftingDxf } from './releaseCommands';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
const drawing: DocumentationSetPayload['drawings'][number] = {
  id: 'drawing-panel-a', drawingNumber: 'PC-W1-001', panelId: 'panel-a', elementMark: 'W1', panelType: 'wall', sheet: 'S01', revision: 'DS-R01', status: 'draft',
  geometry: { widthM: 3, heightM: 3, thicknessM: 0.15, offsetM: 0 }, openings: [{ id: 'opening-a', xM: 1, yM: 0, widthM: 1, heightM: 2 }], anchorIds: ['lift-a'],
  anchors: [{ id: 'lift-a', panelId: 'panel-a', kind: 'lifting', positionM: { x: 1, y: 2.7, z: 0.075 }, capacityKn: 25 }], materialId: 'c40', volumeM3: 1.35, weightKn: 31.8,
  cogM: { x: 1.5, y: 1.5, z: 0.075 }, reinforcementStatus: 'PASS', sourceRefs: { modelVersionId: 'pm-r01', calculationReportId: 'calc-r01' },
};

describe('M8 deterministic export and release contracts', () => {
  it('emits deterministic R2018 millimetre DXF that passes structural Revit-ready preflight', () => {
    const first = buildRevitDraftingDxf(drawing); const second = buildRevitDraftingDxf(drawing);
    expect(first).toEqual(second); expect(first.sha256).toBe('sha256:03fe3c4f12ba5b95c1b98221cbd1cad52fec971690e255d5637a56ff8284dc53'); expect(first.dxf).toContain('$INSUNITS\r\n70\r\n4');
    expect(first.dxf).toContain('PC-OUTLINE'); expect(first.dxf).toContain('PC-EMBED'); expect(inspectRevitDraftingDxf(first.dxf)).toEqual([]);
    expect(inspectRevitDraftingDxf(first.dxf.replace('AC1032', 'AC1027'))).toContain('DXF version is not R2018/AC1032.');
  });

  it('composes a stable checksummed manifest only from complete externally verified files', () => {
    const dxf = buildRevitDraftingDxf(drawing); const exportJob: ExportJobResult = {
      schemaVersion: '1.0.0', worker: 'precast-export-worker@1.0.0', status: 'completed', sourceDrawingSetId: 'ds-r01', sourceDrawingSetHash: hash('d'), immutableStorage: true,
      files: [
        { path: '01_Calculation/report.pdf', role: 'calculationPdfa', mediaType: 'application/pdf', sha256: hash('1'), sizeBytes: 1000, sourceSnapshotHash: hash('c'), revision: 'CALC-R01' },
        { path: '02_Shop_Drawings_PDF/pc-w1-001.pdf', role: 'shopDrawingPdfa', mediaType: 'application/pdf', sha256: hash('2'), sizeBytes: 900, sourceSnapshotHash: hash('d'), drawingId: drawing.id, drawingNumber: drawing.drawingNumber, revision: drawing.revision },
        { path: '06_Revit_Drafting/pc-w1-001.dxf', role: 'shopDrawingDxf', mediaType: 'application/dxf', sha256: dxf.sha256, sizeBytes: dxf.dxf.length, sourceSnapshotHash: hash('d'), drawingId: drawing.id, drawingNumber: drawing.drawingNumber, revision: drawing.revision },
        { path: '04_Schedules/panel-schedule.xlsx', role: 'schedule', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sha256: hash('4'), sizeBytes: 800, sourceSnapshotHash: hash('d'), revision: 'DS-R01' },
        { path: '04_Schedules/audit.json', role: 'audit', mediaType: 'application/json', sha256: hash('5'), sizeBytes: 700, sourceSnapshotHash: hash('d'), revision: 'DS-R01' },
      ],
      revitVerification: { status: 'PASS', target: 'Autodesk Revit', targetVersion: '2026', workflow: 'DraftingViewCurrentViewOnly', sizeToleranceMm: 0.5, visualComparison: 'PASS', dxfHashes: [dxf.sha256], verifiedAt: '2026-09-05T12:00:00.000Z', verifiedBy: 'revit-lab-fixture' },
    };
    const input = { packageId: 'rel-r01', revision: 'REL-R01', exportJobId: 'export-r01', designBasisVersionId: 'db-r02', designBasisSnapshotHash: hash('b'), modelVersionId: 'pm-r01', modelSnapshotHash: hash('a'), calculationReportId: 'calc-r01', calculationSnapshotHash: hash('c'), drawingSetId: 'ds-r01', drawingSetSnapshotHash: hash('d'), drawingIds: [drawing.id], exportJob };
    const first = buildReleasePackagePayload(input); expect(first).toEqual(buildReleasePackagePayload(input)); expect(first.preflight.overallStatus).toBe('PASS'); expect(first.manifestSha256).toMatch(/^sha256:/); expect(first.checksumsSha256).toMatch(/^sha256:/);
    expect(() => buildReleasePackagePayload({ ...input, exportJob: { ...exportJob, revitVerification: { ...exportJob.revitVerification, status: 'NOT_CHECKED' } } })).toThrow('Actual target Revit import');
  });
});
