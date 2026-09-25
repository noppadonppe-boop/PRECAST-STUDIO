import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { designCriteriaIssues } from '@precast/domain';
import { designCriteriaSchema } from '@precast/schemas';
import sample from '../../public/samples/test-module/sample.json';
import { TestModuleContent } from './TestModuleWorkspace';

const criteria = designCriteriaSchema.parse(sample.criteria);
function open(menu: string, value = criteria) {
  return render(<MemoryRouter><TestModuleContent sample={sample} menu={menu} criteria={value} onCriteriaChange={() => undefined} /></MemoryRouter>);
}
describe('Retained Test Module G0–G9', () => {
  it('G0 preserves source identity, units, real element/opening counts and QA', () => {
    open('intake');
    expect(screen.getByText(sample.source.ifcSha256)).toBeVisible();
    expect(sample.model.checks.every((c) => c.passed)).toBe(true);
    expect(sample.model.elements).toHaveLength(5);
    expect(sample.model.elements.reduce((n, e) => n + e.openings.length, 0)).toBe(3);
    expect(sample.model.sourceLengthUnit).toBe('mm');
    expect(sample.model.geometryUnit).toBe('m');
  });
  it('G1 fills every criteria field without implying approval', () => {
    expect(designCriteriaIssues(criteria)).toEqual([]);
    expect(Object.keys(criteria.values)).toHaveLength(37);
    expect(criteria.standards).toHaveLength(8);
    open('criteria');
    expect(screen.getByText(/ช่องที่ต้องเติมเพิ่ม 0 รายการ/)).toBeVisible();
    expect(screen.getByText(/มีข้อมูลครบไม่ได้หมายถึงผ่าน Code/)).toBeVisible();
  });
  it('G2 reconciles all source panels and floor without using the old two-wall fixture', () => {
    open('panel');
    fireEvent.click(screen.getByRole('button', { name: 'TM-S01' }));
    expect(screen.getByRole('heading', { name: 'TM-S01 · พื้น' })).toBeVisible();
    expect(sample.model.elements.reduce((n, e) => n + e.volumeM3, 0)).toBeCloseTo(16.179, 8);
    expect(screen.queryByText(/LC-1200/)).not.toBeInTheDocument();
  });
  it('G3 converts mass to force once and explicitly marks lifting demand without capacity', () => {
    open('loads');
    for (const p of sample.panels) {
      expect(p.weightKn).toBeCloseTo(p.volumeM3 * 2400 * 9.80665 / 1000, 8);
      expect(p.liftSlingDemandKn).toBeCloseTo(1.5 * p.weightKn / Math.sqrt(3), 8);
      expect(p.anchorCapacityStatus).toBe('NOT_CHECKED');
    }
    expect(screen.getByText(/Demand เท่านั้น/)).toBeVisible();
  });
  it('G4 verifies FE equilibrium and deflection against the independent reference', () => {
    open('analysis');
    expect(sample.analysis.runs.map((r) => r.elements)).toEqual([2, 4, 8]);
    const q = sample.analysis.serviceLineLoadKnM;
    const exactMm = 5 * q * 3 ** 4 / (384 * 28e6 * (0.3 ** 3 / 12)) * 1000;
    for (const r of sample.analysis.runs) {
      expect(r.deflectionMm).toBeCloseTo(exactMm, 9);
      expect(r.reactionLeftKn + r.reactionRightKn).toBeCloseTo(q * 3, 8);
    }
    expect(screen.getByText(/โมดูลทั้งหลังและผลระยะยาว NOT_CHECKED/)).toBeVisible();
  });
  it('G5 keeps unverified reinforcement, joints and lifecycle checks NOT_CHECKED', () => {
    open('design');
    expect(screen.getByRole('heading', { name: 'Trial reinforcement / Design check register' })).toBeVisible();
    expect(screen.getAllByText('NOT_CHECKED').length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByRole('button', { name: /อนุมัติ/ })).not.toBeInTheDocument();
  });
  it('G6 reconciles the estimate and exposes provisional quantities and exclusions', () => {
    open('cost');
    expect(sample.cost.rows[0]!.quantity).toBeCloseTo(16.179 * 1.03, 8);
    expect(sample.cost.rows.reduce((s, r) => s + r.amountThb, 0)).toBeCloseTo(124733.04, 2);
    expect(screen.getByText(/ไม่ใช่ BBS/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'ดาวน์โหลด BOQ CSV' })).toHaveAttribute('href', '/samples/test-module/Test-Module-BOQ.csv');
  });
  it('G7 links the traceable report and manifest with no signed approval', () => {
    open('report');
    expect(screen.getByRole('link', { name: /เปิดรายงานฉบับเต็ม/ })).toHaveAttribute('href', '/samples/test-module/Test-Module-Report.html');
    expect(screen.getByText(/ไม่มีลายเซ็นหรือผลอนุมัติ/)).toBeVisible();
  });
  it('G8 selects the correct source drawing and DXF for each of five elements', () => {
    open('shop');
    for (const e of sample.model.elements) {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: e.id } });
      expect(screen.getByRole('img')).toHaveAttribute('src', `/samples/test-module/drawings/${e.id}.svg`);
      expect(screen.getByRole('link', { name: `ดาวน์โหลด ${e.id} DXF` })).toHaveAttribute('href', `/samples/test-module/drawings/${e.id}.dxf`);
    }
  });
  it('G9 prevents production release and maps ten test steps onto the original eight gates', () => {
    open('release');
    expect(screen.getByRole('button', { name: 'ส่งผลิต' })).toBeDisabled();
    expect(sample.release.canRelease).toBe(false);
    expect(sample.stages.map((s) => s.sequence)).toEqual(Array.from({ length: 10 }, (_, i) => `G${i}`));
    expect([...new Set(sample.stages.map((s) => s.gate))]).toEqual(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']);
  });
  it('marks old evidence stale if a saved criterion or code edition changes', () => {
    open('analysis', { ...criteria, values: { ...criteria.values, density: '2500' } });
    expect(screen.getByRole('alert')).toHaveTextContent('OUT OF DATE');
  });
});
