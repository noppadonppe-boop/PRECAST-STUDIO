import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyDesignCriteria, emptyPrestressInput, type calculatePrestress, type DesignCriteria, type PrestressInput } from '@precast/domain';
import { PrestressCalculator } from './PrestressCalculator';
import { DesignCriteriaEditor } from './DesignCriteriaEditor';

function completeCriteria(): DesignCriteria {
  const input = emptyPrestressInput();
  input.memberReference = 'PS-01 test R1'; input.source = 'Synthetic test data — not design criteria'; input.assumptionsConfirmed = true;
  input.values = {
    widthMm: '300', depthMm: '600', spanM: '6', eccentricityMm: '100', strandCount: '10', strandAreaMm2: '100', fpuMpa: '1860', jackingStressMpa: '1000',
    elasticLossMpa: '50', frictionLossMpa: '0', anchorageLossMpa: '20', initialRelaxationLossMpa: '10', creepLossMpa: '60', shrinkageLossMpa: '40', relaxationLossMpa: '20',
    transferStrengthMpa: '30', serviceStrengthMpa: '40', transferModulusMpa: '30000', serviceModulusMpa: '35000', transferLoadKnM: '10', serviceLoadKnM: '20',
    transferCompressionLimitMpa: '18', transferTensionLimitMpa: '0', serviceCompressionLimitMpa: '24', serviceTensionLimitMpa: '0',
  };
  return { ...emptyDesignCriteria(), prestressCalculation: input };
}
function Editable() { const [value, setValue] = useState(completeCriteria); return <PrestressCalculator value={value} onChange={setValue} />; }
describe('Prestress calculator workflow', () => {
  it('opens from criteria, retains input when switching tabs and honors locked criteria', () => {
    function Editor() { const [value, setValue] = useState(emptyDesignCriteria); return <DesignCriteriaEditor value={value} onChange={setValue} />; }
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'พรีคาสท์และการติดตั้ง' }));
    fireEvent.click(screen.getByLabelText('เปิดใช้การคำนวณ Prestress'));
    fireEvent.change(screen.getByLabelText('ความกว้าง b · mm'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: 'วัสดุ' }));
    fireEvent.click(screen.getByRole('button', { name: 'พรีคาสท์และการติดตั้ง' }));
    expect(screen.getByLabelText('ความกว้าง b · mm')).toHaveValue(450);
    expect(screen.queryByRole('button', { name: /ดาวน์โหลดรายการคำนวณ Prestress/ })).not.toBeInTheDocument();
  });
  it('updates results on edit and removes stale results/export when a required value is cleared', () => {
    render(<Editable />);
    expect(screen.getByText(/PRELIMINARY_NOT_VERIFIED/)).toBeVisible();
    expect(screen.getAllByText('อยู่ในขีดจำกัดที่กรอก')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('ขีดจำกัดแรงอัดขณะใช้งาน · MPa'), { target: { value: '4' } });
    expect(screen.getByText('เกินขีดจำกัดที่กรอก')).toBeVisible();
    fireEvent.change(screen.getByLabelText('ความสูง h · mm'), { target: { value: '' } });
    expect(screen.queryByText(/PRELIMINARY_NOT_VERIFIED/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ดาวน์โหลดรายการคำนวณ Prestress/ })).not.toBeInTheDocument();
  });
  it('shows results read-only in downstream pages and prevents editing locked drafts', () => {
    const onChange = vi.fn();
    const view = render(<PrestressCalculator value={completeCriteria()} onChange={onChange} disabled />);
    expect(screen.getByLabelText('ความกว้าง b · mm')).toBeDisabled();
    expect(screen.getByLabelText('เปิดใช้การคำนวณ Prestress')).toBeDisabled();
    view.rerender(<PrestressCalculator value={completeCriteria()} />);
    expect(screen.getByLabelText('ความกว้าง b · mm')).toBeDisabled();
    expect(screen.getByRole('button', { name: /ดาวน์โหลดรายการคำนวณ Prestress/ })).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('exports current inputs, criteria, numeric results and limitations together', async () => {
    let blob: Blob | undefined;
    const createObjectURL = vi.fn((value: Blob) => { blob = value; return 'blob:prestress-test'; });
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.useFakeTimers();
    try {
      render(<PrestressCalculator value={completeCriteria()} />);
      fireEvent.click(screen.getByRole('button', { name: /ดาวน์โหลดรายการคำนวณ Prestress/ }));
      expect(click).toHaveBeenCalledOnce();
      vi.runAllTimers();
      vi.useRealTimers();
      const text = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.readAsText(blob!); });
      const file = JSON.parse(text) as { input: PrestressInput; designCriteria: DesignCriteria; result: ReturnType<typeof calculatePrestress> };
      expect(file.input.memberReference).toBe('PS-01 test R1');
      expect(file.designCriteria.prestressCalculation).toEqual(file.input);
      expect(file.result.service.forceKn).toBe(800);
      expect(file.result.canRelease).toBe(false);
      expect(file.result.exclusions.length).toBeGreaterThan(0);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:prestress-test');
    } finally { vi.useRealTimers(); vi.unstubAllGlobals(); click.mockRestore(); }
  });
});
