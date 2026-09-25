import { describe, expect, it } from 'vitest';
import { applyThaiPrecastPreset, designCriteriaIssues, emptyDesignCriteria } from './designCriteria';

describe('precast project design criteria', () => {
  it('keeps the Thai preset incomplete and never supplies project loads or lifting factors', () => {
    const draft = applyThaiPrecastPreset(emptyDesignCriteria());
    expect(draft.standards.find((s) => s.category === 'precast')).toMatchObject({ code: 'ACI/PCI CODE-319', edition: '2025' });
    expect(draft.values.fcLift).toBe('');
    expect(draft.values.liveLoad).toBe('');
    expect(draft.values.liftFactor).toBe('');
    expect(designCriteriaIssues(draft).length).toBeGreaterThan(0);
    expect(applyThaiPrecastPreset(draft)).toEqual(draft);
  });
  it('preserves existing code choices and reports incompatible ACI editions', () => {
    const draft = emptyDesignCriteria();
    draft.standards[1] = { ...draft.standards[1]!, code: 'ACI 318', edition: '2019' };
    const preset = applyThaiPrecastPreset(draft);
    expect(preset.standards[1]!.edition).toBe('2019');
    expect(designCriteriaIssues(preset).some((issue) => issue.message.includes('ต้องใช้ร่วมกับ ACI 318-25'))).toBe(true);
  });
  it('requires applicability reasons and rejects duplicate standards, placeholders and bad units input', () => {
    const draft = emptyDesignCriteria();
    draft.standards[7] = { ...draft.standards[7]!, applicability: 'notApplicable', reason: '' };
    draft.values.fcLift = '20 MPa';
    draft.values.density = 'Infinity';
    draft.values.liveLoad = 'TBD';
    draft.standards[0] = { ...draft.standards[1]! };
    const issues = designCriteriaIssues(draft);
    expect(issues.some((issue) => issue.message.includes('เหตุผล'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('ต้องมีหนึ่งรายการ'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('ขณะยก · MPa: ต้องอยู่ระหว่าง'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('ความหนาแน่นมวล · kg/m³: ต้องอยู่ระหว่าง'))).toBe(true);
  });
});
