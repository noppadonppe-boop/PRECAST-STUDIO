import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BimIntake } from './BimIntake';
import type * as BimTypes from './types';
const mocks = vi.hoisted(() => ({ store: vi.fn(), parse: vi.fn(), load: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ mode: 'shared', user: { uid: 'u1' } }) }));
vi.mock('../components/SharedMenuEditor', () => ({ SharedMenuEditor: () => <p>Existing notes</p> }));
vi.mock('../data/sharedRepository', () => ({ watchSharedCollection: (_category: string, receive: (rows: unknown[]) => void) => { receive([{ data: { kind: 'bim-source', projectId: 'p1', id: 'rvt-one', fileType: 'rvt', fileName: 'Source.rvt', createdAt: '2026-09-07T00:00:00Z', uploadedBy: 'u1', sha256: 'a' } }]); return () => {}; } }));
vi.mock('./bimRepository', () => ({ storeBimSource: mocks.store, loadBimSource: mocks.load }));
vi.mock('./readIfc', () => ({ readIfc: mocks.parse }));
vi.mock('./BimViewer', () => ({ BimViewer: () => <p>Real geometry viewer</p> }));
vi.mock('./types', async (original) => ({ ...await original<typeof BimTypes>(), sha256: () => Promise.resolve('a'.repeat(64)) }));
const parsed = { schema: 'IFC2X3', elements: [], meshes: [], duplicateGuids: 0, missingGuids: 0, triangleCount: 12, lengthUnits: ['MILLIMETRE'], levels: ['L1'], warnings: [] };
function file(name: string, bytes: number[]) { const value = new File([new Uint8Array(bytes)], name); Object.defineProperty(value, 'arrayBuffer', { value: () => Promise.resolve(new Uint8Array(bytes).buffer) }); return value; }
beforeEach(() => { vi.clearAllMocks(); mocks.parse.mockResolvedValue(parsed); mocks.store.mockResolvedValue({ id: 'bim-new' }); });
describe('shared BIM intake flow', () => {
  it('pairs the parsed IFC with the explicitly selected RVT and preserves notes', async () => {
    render(<BimIntake projectId="p1" />);
    fireEvent.change(screen.getByLabelText('ต้นฉบับ Revit ของ IFC'), { target: { value: 'rvt-one' } });
    fireEvent.change(screen.getByLabelText('นำเข้า IFC'), { target: { files: [file('Model.ifc', [1, 2])] } });
    await waitFor(() => expect(mocks.store).toHaveBeenCalledWith('p1', expect.any(File), 'a'.repeat(64), parsed, 'rvt-one', expect.any(Function)));
    expect(await screen.findByText(/บันทึก bim-new แล้ว/)).toBeVisible();
    expect(screen.getByText('Existing notes')).toBeVisible();
  });
  it('keeps RVT awaiting conversion and never feeds it to the IFC parser', async () => {
    render(<BimIntake projectId="p1" />);
    fireEvent.change(screen.getByLabelText('แนบต้นฉบับ Revit'), { target: { files: [file('Model.rvt', [208, 207, 17, 224, 161, 177, 26, 225])] } });
    expect(await screen.findByText(/บันทึกต้นฉบับ RVT แล้ว/)).toBeVisible();
    expect(mocks.parse).not.toHaveBeenCalled();
    expect(mocks.store).toHaveBeenCalledWith('p1', expect.any(File), 'a'.repeat(64), null, null, expect.any(Function));
  });
  it('does not claim persistence after Storage failure', async () => {
    mocks.store.mockRejectedValue(new Error('storage/unauthorized'));
    render(<BimIntake projectId="p1" />);
    fireEvent.change(screen.getByLabelText('นำเข้า IFC'), { target: { files: [file('Model.ifc', [1, 2])] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('storage/unauthorized');
    expect(screen.getByRole('status')).toHaveTextContent('ยังไม่ยืนยันการบันทึก');
    expect(screen.getByLabelText('นำเข้า IFC')).toBeEnabled();
  });
  it('rejects a truncated RVT header without uploading', async () => {
    render(<BimIntake projectId="p1" />);
    fireEvent.change(screen.getByLabelText('แนบต้นฉบับ Revit'), { target: { files: [file('Broken.rvt', [208])] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('ส่วนหัวของ Revit');
    expect(mocks.store).not.toHaveBeenCalled();
  });
});
