// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseIfc } from './parseIfc';
describe('actual Revit IFC parsing', () => {
  it('extracts geometry and stable identities from the real companion file', async () => {
    const bytes = readFileSync(new URL('../../../../Precast_Module_Test.ifc', import.meta.url));
    const result = await parseIfc(bytes);
    expect(result.schema).toBe('IFC2X3');
    expect(result.elements.filter((element) => element.type.startsWith('IfcWall'))).toHaveLength(4);
    expect(result.elements.filter((element) => element.type === 'IfcSlab')).toHaveLength(1);
    expect(result.meshes.length).toBeGreaterThan(0);
    expect(result.triangleCount).toBeGreaterThan(0);
    expect(result.duplicateGuids).toBe(0);
    expect(result.missingGuids).toBe(0);
    expect(result.lengthUnits).toContain('MILLIMETRE');
    expect(result.levels.length).toBeGreaterThan(0);
    expect(result.meshes.every((mesh) => mesh.vertices.every(Number.isFinite))).toBe(true);
    expect(result.elements.filter((element) => element.precast?.status === 'precast')).toHaveLength(0);
    expect(result.elements.filter((element) => element.precast?.status === 'review')).toHaveLength(5);
  }, 30000);
  it('rejects renamed garbage before opening WASM', async () => {
    await expect(parseIfc(new TextEncoder().encode('not an IFC'))).rejects.toThrow('IFC STEP');
  });
  it('reads both instance and type precast property sets', async () => {
    const original = readFileSync(new URL('../../../../e2e/fixtures/synthetic-bim.ifc', import.meta.url), 'utf8');
    for (const relation of ["#33=IFCRELDEFINESBYPROPERTIES('0000000000000000000008',#5,$,$,(#27),#32);", "#33=IFCWALLTYPE('0000000000000000000008',#5,'Precast type',$,$,(#32),$,$,$,.STANDARD.);\n#34=IFCRELDEFINESBYTYPE('0000000000000000000009',#5,$,$,(#27),#33);"]) {
      const text = original.replace('ENDSEC;\nEND-ISO', "#31=IFCPROPERTYSINGLEVALUE('IsPrecast',$,IFCBOOLEAN(.T.),$);\n#32=IFCPROPERTYSET('0000000000000000000010',#5,'QA',$,(#31));\n" + relation + '\nENDSEC;\nEND-ISO');
      const model = await parseIfc(new TextEncoder().encode(text));
      expect(model.elements.find((element) => element.id === 27)?.precast?.status).toBe('precast');
    }
  });
});
