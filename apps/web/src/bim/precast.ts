export interface PrecastClassification { status: 'precast' | 'review' | 'excluded'; reason: string }
export interface SourceProperty { name: string; value: string | boolean | number }
export function classifyPrecast(type: string, properties: SourceProperty[]): PrecastClassification {
  const structural = /^Ifc(Wall(StandardCase|ElementedCase)?|Slab(StandardCase|ElementedCase)?|Beam(StandardCase)?|Column(StandardCase)?|Member(StandardCase)?|Plate(StandardCase)?|Footing|Pile|StairFlight|BuildingElementProxy)$/.test(type);
  if (!structural) return { status: 'excluded', reason: 'ไม่ใช่ประเภทชิ้นส่วนโครงสร้างที่รองรับ' };
  let yes = false; let no = false;
  for (const property of properties) {
    const name = property.name.toLowerCase().replace(/[ _-]/g, '');
    const value = String(property.value).trim().toLowerCase();
    if (['isprecast', 'precast'].includes(name)) {
      yes ||= ['true', 't', '.t.', '1', 'yes', 'precast'].includes(value);
      no ||= ['false', 'f', '.f.', '0', 'no'].includes(value);
    }
    if (['constructionmethod', 'productionmethod', 'fabricationmethod', 'castingmethod'].includes(name)) {
      yes ||= /^(precast|precast concrete|หล่อสำเร็จ|พรีคาสท์|พรีคาสต์)$/.test(value);
      no ||= /^(cast.?in.?situ|cast.?in.?place|in.?situ|หล่อในที่)$/.test(value);
    }
  }
  if (no) return { status: 'excluded', reason: yes ? 'ข้อมูลพรีคาสท์ขัดแย้งกัน ต้องแก้ต้นฉบับ' : 'ข้อมูลต้นฉบับระบุไม่ใช่พรีคาสท์ / หล่อในที่' };
  if (yes) return { status: 'precast', reason: 'พบ IsPrecast / Precast หรือวิธีผลิตระบุพรีคาสท์ใน IFC' };
  return { status: type === 'IfcBuildingElementProxy' ? 'excluded' : 'review', reason: 'ยังไม่มีข้อมูลยืนยันว่าเป็นพรีคาสท์ใน IFC' };
}
