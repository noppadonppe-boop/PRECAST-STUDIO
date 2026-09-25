import { describe, expect, it } from 'vitest';
import { validateBimFile } from './types';
describe('BIM source acceptance', () => {
  it('accepts IFC and RVT independent of browser MIME', () => {
    expect(validateBimFile({ name: 'Wall.IFC', size: 12 })).toBe('ifc');
    expect(validateBimFile({ name: 'Room.rvt', size: 100 * 1024 * 1024 })).toBe('rvt');
  });
  it('rejects empty, oversized and disguised files', () => {
    for (const file of [{ name: 'a.ifc', size: 0 }, { name: 'a.rvt', size: 100 * 1024 * 1024 + 1 }, { name: 'a.ifc.exe', size: 20 }]) expect(() => validateBimFile(file)).toThrow();
  });
});
