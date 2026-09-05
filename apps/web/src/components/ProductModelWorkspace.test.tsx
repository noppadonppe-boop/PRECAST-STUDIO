import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductModelPayload } from '@precast/domain';
import { ProductModelWorkspace } from './ProductModelWorkspace';

describe('Product Model inspector', () => {
  it('uses normalized model geometry and weight and delegates selection without persisting changes', () => {
    const model: ProductModelPayload = { schemaVersion: '1.0.0', units: 'kN-m-MPa', coordinateSystem: 'PROJECT-LOCAL',
      panels: [{ id: 'actual-wall', mark: 'W-24', type: 'wall', materialId: 'CON-30', sourceObjectIds: ['ifc-global-id'], geometry: { widthM: 4.2, heightM: 3.1, thicknessM: .18, offsetM: 2 }, openings: [], volumeM3: 2.3436, weightKn: 56.2464, cogM: { x: 4.1, y: 1.55, z: 0 } }],
      joints: [], anchors: [], supports: [], loadCases: [], loadCombinations: [], stages: [], validation: { unsupportedNodes: 0, disconnectedElements: 0, missingLoadPaths: 0, geometryConflicts: 0 } };
    const select = vi.fn();
    render(<ProductModelWorkspace model={model} selectedIds={['actual-wall']} onSelect={select} />);
    const inspector = screen.getByRole('complementary', { name: 'คุณสมบัติ Product Model' });
    expect(within(inspector).getByText('56.25 kN')).toBeVisible();
    expect(within(inspector).getByText('ifc-global-id')).toBeVisible();
    expect(screen.queryByText('LC-1200')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'เลือก W-24' }), { key: 'Enter' });
    expect(select).toHaveBeenCalledWith('actual-wall');
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    expect(screen.getByRole('img', { name: 'plan · Product Model · 1 ชิ้นงาน' })).toBeVisible();
    expect(model.panels[0]!.geometry.thicknessM).toBe(.18);
  });
});
