import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Catalogue } from './Catalogue';
import { filterProducts, type CatalogueData, type Product, type Filters } from './model';

const root = resolve(import.meta.dirname, '../../../..');
const matrix = JSON.parse(readFileSync(resolve(root, 'knowledge/modular-program-r01/product_matrix.json'), 'utf8')) as Product[];
const baseline = JSON.parse(readFileSync(resolve(root, 'knowledge/modular-program-r01/baseline.json'), 'utf8'));
const products = matrix.map(p => ({ ...p, recipe: baseline.recipes[p.type], artifact: { id: `${p.product_id}-R00`, revision: 'R00', status: 'CONCEPT', visibility: 'INTERNAL_TEAM', bytes: 100, source_hash: 'test-hash', url: `/api/catalogue/artifacts/${p.product_id}-R00` } }));
const data = { products, typical: [], recipes: baseline.recipes, revision: 'WEB-01', source_revision: 'R01', source_hash: 'test-seed', standardization: baseline.standardization, access: { name: 'Test', mode: 'LOCAL_OWNER_PREVIEW' }, engineering: { ...baseline, code: 'source code', thickness: baseline.thickness_policy } } as CatalogueData;
const filters: Filters = { query: '', use: 0, family: '', plan: '', status: '' };
afterEach(() => { vi.unstubAllGlobals(); });
describe('catalogue filters', () => {
  it('indexes all combinations with correct counts', () => {
    expect(filterProducts(products, filters)).toHaveLength(48);
    for (const use of [1, 2, 3, 4]) expect(filterProducts(products, { ...filters, use })).toHaveLength(12);
    for (const family of ['A', 'B', 'C', 'D']) expect(filterProducts(products, { ...filters, family })).toHaveLength(12);
    for (const plan of ['I', 'L', 'U']) expect(filterProducts(products, { ...filters, plan })).toHaveLength(16);
  });
  it('searches Thai / English / tags and combines filters', () => {
    for (const query of ['ออฟฟิศ', 'office', 'TS-C', 'โค้ง']) expect(filterProducts(products, { ...filters, query }).length).toBeGreaterThan(0);
    expect(filterProducts(products, { ...filters, query: 'u-c4' }).map(p => p.display_code)).toEqual(['U-C4']);
    expect(filterProducts(products, { ...filters, use: 3, family: 'B', plan: 'L' }).map(p => p.display_code)).toEqual(['L-B3']);
    expect(filterProducts(products, { ...filters, query: 'nothing matches' })).toEqual([]);
  });
  it('preserves separate legacy and STD15 concept states', () => {
    expect(filterProducts(products, { ...filters, status: 'LEGACY20' })).toHaveLength(16);
    expect(filterProducts(products, { ...filters, status: 'STD15' })).toHaveLength(32);
    expect(filterProducts(products, { ...filters, status: 'NOT_ANALYSED' })).toHaveLength(48);
  });
});
describe('catalogue interactions', () => {
  it('filters, opens detail, shows unstarted engineering and compares three plans', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    render(<Catalogue/>);
    const list = await screen.findByRole('region', { name: 'รายการแบบ' });
    expect(within(list).getAllByRole('article')).toHaveLength(48);
    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหาแบบ' }), { target: { value: 'I-C1' } });
    expect(within(list).getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'ดูรายละเอียด I-C1' }));
    expect(screen.getByText('LEGACY20 / NOT STD15 GEOMETRY')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'วิศวกรรม' }));
    expect(screen.getByText('NOT_STARTED')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'เปรียบเทียบ I / L / U' }));
    for (const id of ['I-C1', 'L-C1', 'U-C1']) expect(screen.getByRole('button', { name: `รายละเอียด ${id}` })).toBeInTheDocument();
  });
  it('does not render catalogue when API rejects membership', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<Catalogue/>);
    expect(await screen.findByRole('heading', { name: 'คลังแบบส่วนตัว' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'รายการแบบ' })).not.toBeInTheDocument();
  });
});
