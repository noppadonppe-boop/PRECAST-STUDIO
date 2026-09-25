import { IFCBUILDINGSTOREY, IFCELEMENT, IFCRELDEFINESBYPROPERTIES, IFCRELDEFINESBYTYPE, IFCSIUNIT, IfcAPI } from 'web-ifc';
import { classifyPrecast, type SourceProperty } from './precast';
import type { BimModel } from './types';
interface IfcLine { type: number; GlobalId?: { value: string }; Name?: { value: string }; UnitType?: { value: string }; Prefix?: { value: string } }

/** Reads source geometry only. These findings never grant controlled approval or a clean scan. */
export async function parseIfc(bytes: Uint8Array, wasmUrl?: string): Promise<BimModel> {
  const header = new TextDecoder().decode(bytes.subarray(0, 4096));
  if (!header.includes('ISO-10303-21;') || !header.includes('FILE_SCHEMA')) throw new Error('ไฟล์ไม่ใช่ IFC STEP ที่รองรับ');
  const api = new IfcAPI();
  await api.Init(wasmUrl ? () => wasmUrl : undefined, true);
  let modelId = -1;
  try {
    modelId = api.OpenModel(bytes, { COORDINATE_TO_ORIGIN: true });
    if (modelId < 0 || !api.IsModelOpen(modelId)) throw new Error('เปิด IFC ไม่สำเร็จ');
    const result: BimModel = { schema: api.GetModelSchema(modelId), elements: [], meshes: [], duplicateGuids: 0, missingGuids: 0, levels: [], lengthUnits: [], warnings: [], triangleCount: 0 };
    const ids = api.GetLineIDsWithType(modelId, IFCELEMENT, true);
    if (ids.size() > 100000) throw new Error('โมเดลเกิน 100,000 ชิ้น กรุณาแยกไฟล์ตามอาคารหรือชั้น');
    const guids = new Set<string>();
    type Handle = { value: number };
    interface PropertyLine { Name?: { value: string }; NominalValue?: { value: string | number | boolean }; HasProperties?: Handle[]; HasPropertySets?: Handle[]; RelatedObjects?: Handle[]; RelatingType?: Handle; RelatingPropertyDefinition?: Handle }
    const read = (id: number) => api.GetLine(modelId, id) as PropertyLine;
    const sets = new Map<number, number[]>();
    const typeOf = new Map<number, number>();
    const relations = api.GetLineIDsWithType(modelId, IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relations.size(); i++) {
      const relation = read(relations.get(i));
      if (relation.RelatingPropertyDefinition) for (const object of relation.RelatedObjects ?? []) sets.set(object.value, [...sets.get(object.value) ?? [], relation.RelatingPropertyDefinition.value]);
    }
    const types = api.GetLineIDsWithType(modelId, IFCRELDEFINESBYTYPE);
    for (let i = 0; i < types.size(); i++) {
      const relation = read(types.get(i));
      if (relation.RelatingType) for (const object of relation.RelatedObjects ?? []) typeOf.set(object.value, relation.RelatingType.value);
    }
    const propertyCache = new Map<number, SourceProperty[]>();
    const properties = (setId: number): SourceProperty[] => {
      if (propertyCache.has(setId)) return propertyCache.get(setId)!;
      const values: SourceProperty[] = [];
      for (const ref of read(setId).HasProperties ?? []) {
        const property = read(ref.value);
        if (property.Name && property.NominalValue) values.push({ name: property.Name.value, value: property.NominalValue.value });
      }
      propertyCache.set(setId, values); return values;
    };
    for (let i = 0; i < ids.size(); i++) {
      const id = ids.get(i);
      const line = api.GetLine(modelId, id) as IfcLine;
      const guid = String(line.GlobalId?.value ?? '');
      if (!guid) result.missingGuids++;
      else if (guids.has(guid)) result.duplicateGuids++;
      guids.add(guid);
      const typeId = typeOf.get(id);
      const propertyIds = [...sets.get(id) ?? [], ...(typeId === undefined ? [] : [...sets.get(typeId) ?? [], ...(read(typeId).HasPropertySets ?? []).map((ref) => ref.value)])];
      const type = api.GetNameFromTypeCode(line.type);
      result.elements.push({ id, guid, name: String(line.Name?.value ?? `#${id}`), type, precast: classifyPrecast(type, propertyIds.flatMap(properties)) });
    }
    const levels = api.GetLineIDsWithType(modelId, IFCBUILDINGSTOREY);
    for (let i = 0; i < levels.size(); i++) result.levels.push(String((api.GetLine(modelId, levels.get(i)) as IfcLine).Name?.value ?? `#${levels.get(i)}`));
    const units = api.GetLineIDsWithType(modelId, IFCSIUNIT);
    for (let i = 0; i < units.size(); i++) {
      const unit = api.GetLine(modelId, units.get(i)) as IfcLine;
      if (unit.UnitType?.value === 'LENGTHUNIT') result.lengthUnits.push(`${unit.Prefix?.value ?? ''}${unit.Name?.value ?? ''}`);
    }
    let geometryBytes = 0;
    api.StreamAllMeshes(modelId, (mesh) => {
      for (let i = 0; i < mesh.geometries.size(); i++) {
        const placed = mesh.geometries.get(i);
        const geometry = api.GetGeometry(modelId, placed.geometryExpressID);
        try {
          const vertices = api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
          const indices = api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
          geometryBytes += vertices.byteLength + indices.byteLength;
          if (geometryBytes > 256 * 1024 * 1024) throw new Error('เรขาคณิตใหญ่เกิน 256 MB กรุณาแบ่งโมเดล');
          if (!vertices.every(Number.isFinite) || !placed.flatTransformation.every(Number.isFinite)) throw new Error('พบพิกัดเรขาคณิตไม่ถูกต้อง');
          result.triangleCount += indices.length / 3;
          result.meshes.push({ id: mesh.expressID, vertices: vertices.slice(), indices: indices.slice(), transform: [...placed.flatTransformation], color: [placed.color.x, placed.color.y, placed.color.z, placed.color.w] });
        } finally { geometry.delete(); }
      }
    });
    if (!result.meshes.length) throw new Error('อ่านข้อมูล IFC ได้ แต่ไม่พบเรขาคณิตที่แสดงผลได้');
    if (!result.lengthUnits.length) result.warnings.push('ไม่พบหน่วยความยาวแบบ SI ต้องตรวจหน่วยในไฟล์ต้นฉบับ');
    if (!result.levels.length) result.warnings.push('ไม่พบรายการชั้นอาคาร');
    if (result.duplicateGuids || result.missingGuids) result.warnings.push('พบ GlobalId ซ้ำหรือขาด ต้องแก้ต้นฉบับก่อนนำไปใช้ต่อ');
    result.warnings.push('ตรวจพิกัดที่ตั้งโครงการและความครบถ้วนของชิ้นงานกับแบบต้นฉบับอีกครั้ง');
    return result;
  } finally {
    if (modelId >= 0 && api.IsModelOpen(modelId)) api.CloseModel(modelId);
    api.Dispose();
  }
}
