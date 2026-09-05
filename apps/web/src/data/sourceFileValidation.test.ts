import { describe, expect, it } from 'vitest';
import { canonicalSourceContentType, validateSourceFile } from './sourceFileValidation';

describe('BIM source file validation', () => {
  it('normalizes an IFC selected by browsers that provide no MIME type', () => {
    const file = { name: 'Precast_Module_Test.ifc', type: '', size: 388_772 };
    expect(canonicalSourceContentType(file)).toBe('application/x-step');
    expect(validateSourceFile(file)).toEqual([]);
  });

  it('normalizes a generic binary MIME only when the extension is IFC', () => {
    expect(validateSourceFile({ name: 'model.ifc', type: 'application/octet-stream', size: 1024 })).toEqual([]);
    expect(validateSourceFile({ name: 'model.exe', type: 'application/octet-stream', size: 1024 })).not.toEqual([]);
  });

  it('keeps the 100 MB source limit', () => {
    expect(validateSourceFile({ name: 'large.ifc', type: '', size: 101 * 1024 * 1024 })).not.toEqual([]);
  });
});
