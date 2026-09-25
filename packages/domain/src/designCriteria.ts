import type { DesignBasisPayload } from './types';
import { prestressInputIssues, type PrestressInput } from './prestress';
/** Project criteria are declarations for review, never proof of code compliance. */
export const criteriaGroups = ['มาตรฐาน', 'วัสดุ', 'แรงและชุดน้ำหนัก', 'พรีคาสท์และการติดตั้ง', 'หน่วยและแหล่งอ้างอิง', 'ตรวจความพร้อม'] as const;
export type CriteriaGroup = typeof criteriaGroups[number];
export const standardCategories = ['regulatory', 'concrete', 'precast', 'thaiConcrete', 'guidance', 'loading', 'wind', 'seismic'] as const;
export type StandardCategory = typeof standardCategories[number];
export const standardLabels: Record<StandardCategory, string> = {
  regulatory: 'ข้อกำหนดประเทศไทย', concrete: 'มาตรฐานคอนกรีตหลัก', precast: 'มาตรฐานพรีคาสท์', thaiConcrete: 'วสท. / มาตรฐานคอนกรีตเสริม', guidance: 'คู่มือผลิตและติดตั้ง', loading: 'น้ำหนักบรรทุกและชุดน้ำหนัก', wind: 'แรงลม', seismic: 'แรงแผ่นดินไหว',
};
export interface StandardReference {
  category: StandardCategory;
  code: string;
  edition: string;
  amendment: string;
  scope: string;
  source: string;
  clause: string;
  applicability: 'required' | 'notApplicable';
  reason: string;
}
type CriteriaField = { key: string; label: string; group: CriteriaGroup; hint: string; min?: number; max?: number };
export const criteriaFields = [
  { key: 'location', label: 'สถานที่ตั้งและเขตอำนาจ', group: 'มาตรฐาน', hint: 'จังหวัด อำเภอ พิกัด และหน่วยงานอนุญาต' },
  { key: 'occupancy', label: 'ประเภทการใช้งานอาคาร', group: 'มาตรฐาน', hint: 'ระบุการใช้งานแต่ละพื้นที่' },
  { key: 'hierarchy', label: 'ลำดับการใช้มาตรฐานและการจัดการข้อขัดแย้ง', group: 'มาตรฐาน', hint: 'ระบุมาตรฐานหลัก ขอบเขตมาตรฐานเสริม และการตรวจความสอดคล้องของตัวคูณ' },
  { key: 'designLife', label: 'อายุออกแบบ · ปี', group: 'มาตรฐาน', hint: '', min: 1, max: 200 },
  { key: 'riskCategory', label: 'ระดับความสำคัญอาคารและแหล่งอ้างอิง', group: 'มาตรฐาน', hint: 'ใช้การจัดประเภทตามมาตรฐานที่เลือก' },
  { key: 'concreteType', label: 'ชนิดคอนกรีตและขอบเขตมาตรฐานที่ใช้ได้', group: 'วัสดุ', hint: 'คอนกรีตปกติ / มวลรวมเบา / เซลลูลาร์ พร้อมหลักฐานว่าอยู่ในขอบเขตมาตรฐาน' },
  { key: 'fc28', label: 'กำลังอัดออกแบบที่ 28 วัน · MPa', group: 'วัสดุ', hint: '', min: 10, max: 150 },
  { key: 'fcDemould', label: 'กำลังอัดขณะถอดแบบ · MPa', group: 'วัสดุ', hint: '', min: 5, max: 150 },
  { key: 'fcLift', label: 'กำลังอัดขณะยก · MPa', group: 'วัสดุ', hint: '', min: 5, max: 100 },
  { key: 'density', label: 'ความหนาแน่นมวล · kg/m³', group: 'วัสดุ', hint: '', min: 1000, max: 3500 },
  { key: 'elasticModulus', label: 'โมดูลัสยืดหยุ่น · MPa', group: 'วัสดุ', hint: '', min: 1000, max: 100000 },
  { key: 'fy', label: 'กำลังครากเหล็กเสริม · MPa', group: 'วัสดุ', hint: '', min: 200, max: 1000 },
  { key: 'materialSource', label: 'ข้อกำหนดวัสดุและผลทดสอบอ้างอิง', group: 'วัสดุ', hint: 'เลขเอกสาร Revision วิธีทดสอบ และอายุทดสอบ' },
  { key: 'durability', label: 'สภาพแวดล้อม ระยะหุ้ม และความทนทาน', group: 'วัสดุ', hint: 'ระบุชั้นการสัมผัส ระยะหุ้ม และข้ออ้างอิง' },
  { key: 'fire', label: 'อัตราทนไฟ · นาที', group: 'วัสดุ', hint: '', min: 0, max: 360 },
  { key: 'deadLoad', label: 'น้ำหนักถาวรและน้ำหนักเพิ่มเติม', group: 'แรงและชุดน้ำหนัก', hint: 'ระบุค่า หน่วย แหล่งอ้างอิง และป้องกันการนับน้ำหนักตัวเองซ้ำ' },
  { key: 'liveLoad', label: 'น้ำหนักจรรายพื้นที่', group: 'แรงและชุดน้ำหนัก', hint: 'ระบุพื้นที่ ค่า kN/m² และข้ออ้างอิง รวมแรงจุดที่เกี่ยวข้อง' },
  { key: 'wind', label: 'ข้อมูลและเกณฑ์แรงลม', group: 'แรงและชุดน้ำหนัก', hint: 'ความเร็วอ้างอิง ภูมิประเทศ ความสูง ความดันภายนอก/ภายใน และแหล่งข้อมูล' },
  { key: 'seismic', label: 'ข้อมูลแผ่นดินไหวและชั้นดิน', group: 'แรงและชุดน้ำหนัก', hint: 'พิกัด ชั้นดิน spectrum ระบบต้านแรง และข้ออ้างอิง หรือเหตุผลที่ไม่ใช้' },
  { key: 'serviceCombinations', label: 'ชุดน้ำหนักสภาพใช้งาน · SLS', group: 'แรงและชุดน้ำหนัก', hint: 'ระบุสมการ ตัวคูณ และข้ออ้างอิง' },
  { key: 'ultimateCombinations', label: 'ชุดน้ำหนักตรวจสอบกำลัง · ULS', group: 'แรงและชุดน้ำหนัก', hint: 'ระบุสมการ ตัวคูณน้ำหนัก/ลดกำลัง และความสอดคล้องกับมาตรฐานหลัก' },
  { key: 'constructionLoads', label: 'แรงและชุดน้ำหนักระหว่างก่อสร้าง', group: 'แรงและชุดน้ำหนัก', hint: 'ถอดแบบ ยก ขนส่ง กองเก็บ และติดตั้ง พร้อมข้ออ้างอิง' },
  { key: 'serviceability', label: 'เกณฑ์การโก่งตัว รอยร้าว และผลระยะยาว', group: 'แรงและชุดน้ำหนัก', hint: 'ขีดจำกัด creep / shrinkage และข้ออ้างอิง' },
  { key: 'memberType', label: 'ชนิดชิ้นงานและหน้าที่รับแรง', group: 'พรีคาสท์และการติดตั้ง', hint: 'ผนังรับแรง / ผนังไม่รับแรง / พื้น / คาน / เสา / โมดูลสามมิติ' },
  { key: 'prestress', label: 'ระบบเหล็กเสริมและการอัดแรง', group: 'พรีคาสท์และการติดตั้ง', hint: 'ถ้าอัดแรง ระบุกำลังขณะถ่ายแรง การสูญเสีย และแหล่งอ้างอิง; ถ้าไม่ใช้ให้ระบุ' },
  { key: 'demould', label: 'การถอดแบบและพลิกชิ้นงาน', group: 'พรีคาสท์และการติดตั้ง', hint: 'แรงติดแบบ จุดรองรับ และลำดับการพลิก' },
  { key: 'lifting', label: 'จุดยก มุมสลิง และการกระจายแรง', group: 'พรีคาสท์และการติดตั้ง', hint: 'แบบจุดยก แรงแต่ละจุด และรุ่นอุปกรณ์พร้อมหลักฐานผู้ผลิต' },
  { key: 'liftFactor', label: 'ตัวคูณพลวัตขณะยก', group: 'พรีคาสท์และการติดตั้ง', hint: '', min: 1, max: 5 },
  { key: 'transportFactor', label: 'ตัวคูณพลวัตขณะขนส่ง', group: 'พรีคาสท์และการติดตั้ง', hint: '', min: 1, max: 5 },
  { key: 'handlingSource', label: 'แหล่งอ้างอิงตัวคูณและอุปกรณ์ยก', group: 'พรีคาสท์และการติดตั้ง', hint: 'คู่มือ รุ่นอุปกรณ์ Revision และข้ออ้างอิง ห้ามใช้ค่าตัวอย่างเป็นค่ารับรอง' },
  { key: 'transport', label: 'การขนส่งและตำแหน่งรองรับ', group: 'พรีคาสท์และการติดตั้ง', hint: 'จุดรองรับ การยึดรั้ง และแรงตามทิศทางที่เกี่ยวข้อง' },
  { key: 'storage', label: 'การกองเก็บและจุดรองรับ', group: 'พรีคาสท์และการติดตั้ง', hint: 'ตำแหน่งวัสดุรอง ระดับซ้อน และเสถียรภาพ' },
  { key: 'installation', label: 'ลำดับติดตั้งและค้ำยันชั่วคราว', group: 'พรีคาสท์และการติดตั้ง', hint: 'กำลัง grout ก่อนรับแรง เงื่อนไขถอดค้ำยัน และผู้รับผิดชอบ' },
  { key: 'connections', label: 'รอยต่อ Anchor และ Bearing', group: 'พรีคาสท์และการติดตั้ง', hint: 'ชนิดรอยต่อ dowel / sleeve / grout / plate / weld ตามที่ใช้ พร้อมการตรวจและข้ออ้างอิง' },
  { key: 'loadPath', label: 'เส้นทางถ่ายแรงและระบบต้านแรงด้านข้าง', group: 'พรีคาสท์และการติดตั้ง', hint: 'diaphragm ความแข็งรอยต่อ และสมมติฐานของโมเดล' },
  { key: 'tolerances', label: 'ค่าคลาดเคลื่อนการผลิตและติดตั้ง', group: 'พรีคาสท์และการติดตั้ง', hint: 'ค่าที่ยอมรับได้ ช่องรอยต่อ ระยะรองรับขั้นต่ำ และเอกสารควบคุมคุณภาพ' },
  { key: 'unitSource', label: 'ข้อกำหนดหน่วยและแหล่งอ้างอิงการแปลง', group: 'หน่วยและแหล่งอ้างอิง', hint: 'ระบุเอกสารโครงการและกติกาการรับข้อมูลต่างหน่วย' },
] as const satisfies readonly CriteriaField[];
export type CriteriaFieldKey = typeof criteriaFields[number]['key'];
export interface DesignCriteria {
  prestressCalculation?: PrestressInput | undefined;
  schemaVersion: '1.0';
  presetId: string;
  standards: StandardReference[];
  values: Record<CriteriaFieldKey, string>;
}
export function emptyDesignCriteria(): DesignCriteria {
  return { schemaVersion: '1.0', presetId: '', standards: standardCategories.map((category) => ({ category, code: '', edition: '', amendment: '', scope: '', source: '', clause: '', applicability: 'required', reason: '' })), values: Object.fromEntries(criteriaFields.map(({ key }) => [key, ''])) as DesignCriteria['values'] };
}
const suggestions: Partial<Record<StandardCategory, Partial<StandardReference>>> = {
  regulatory: { code: 'กฎกระทรวงกำหนดการออกแบบโครงสร้างอาคารและลักษณะและคุณสมบัติของวัสดุที่ใช้ในงานโครงสร้างอาคาร', edition: 'พ.ศ. 2566', scope: 'ข้อกำหนดประเทศไทย — ตรวจประกาศที่เกี่ยวข้องและการใช้กับโครงการ', source: 'https://ratchakitcha.soc.go.th/documents/140A054N0000000000400.pdf' },
  concrete: { code: 'ACI CODE-318', edition: '2025', scope: 'มาตรฐานหลักด้านกำลังและรายละเอียดโครงสร้างคอนกรีต', source: 'https://www.concrete.org/topicsinconcrete/topicdetail.aspx?search=318-25' },
  precast: { code: 'ACI/PCI CODE-319', edition: '2025', scope: 'โครงสร้างพรีคาสท์ ใช้ร่วมกับ ACI CODE-318-25', source: 'https://www.concrete.org/Portals/0/Files/PDF/Previews/319-25_preview.pdf' },
  thaiConcrete: { code: 'วสท. 011008-21', edition: '2021', scope: 'มาตรฐานเสริม — ระบุข้อที่นำมาใช้และตรวจความสอดคล้องกับมาตรฐานหลัก', source: 'https://eit.or.th/api/public/file/book/173' },
  guidance: { code: 'PCI Design Handbook', scope: 'คู่มือออกแบบ ผลิต และติดตั้ง — เลือกฉบับและตรวจความสอดคล้องกับ Code หลัก', source: 'https://www.pci.org' },
};
/** Fill empty fields only; never silently replace a project's selected standard. */
export function applyThaiPrecastPreset(current: DesignCriteria): DesignCriteria {
  return { ...current, presetId: 'th-precast-aci2025-v1', standards: current.standards.map((item) => {
    const suggestion = suggestions[item.category];
    if (!suggestion || item.applicability !== 'required' || item.code.trim()) return item;
    return { ...item, ...Object.fromEntries(Object.entries(suggestion).filter(([key]) => !item[key as keyof StandardReference])) };
  }), values: { ...current.values, hierarchy: current.values.hierarchy || 'ข้อกำหนดไทยที่ใช้กับโครงการ → ACI 318-25 ร่วมกับ ACI/PCI 319-25 → มาตรฐานเสริมและคู่มือเฉพาะเรื่อง ต้องตรวจความสอดคล้องของสมการและตัวคูณก่อนรับรอง', unitSource: current.values.unitSource || 'SI: แรง kN; โมเมนต์ kN·m; โมเดล m; รายละเอียด mm; หน่วยแรง MPa = N/mm²; 1 MPa = 1000 kN/m²; ความหนาแน่น kg/m³; น้ำหนักต่อปริมาตร = ความหนาแน่น × 9.80665 / 1000 kN/m³' } };
}
export interface CriteriaIssue { group: CriteriaGroup; message: string }
export function designCriteriaIssues(criteria?: DesignCriteria): CriteriaIssue[] {
  if (!criteria) return [{ group: 'มาตรฐาน', message: 'ยังไม่มีทะเบียน Design Criteria — ต้องเติมข้อมูลก่อนส่งตรวจ' }];
  const issues: CriteriaIssue[] = [];
  if (criteria.prestressCalculation) issues.push(...prestressInputIssues(criteria.prestressCalculation).map((message) => ({ group: 'พรีคาสท์และการติดตั้ง' as const, message: `Prestress: ${message}` })));
  if (criteria.prestressCalculation && /ไม่อัดแรง|ไม่ใช้.*อัดแรง|non[- ]?prestress/i.test(`${criteria.values.prestress} ${criteria.values.concreteType}`)) issues.push({ group: 'พรีคาสท์และการติดตั้ง', message: 'เปิดคำนวณ Prestress แต่ข้อความชนิดคอนกรีต/ระบบอัดแรงระบุไม่อัดแรง — ต้องแก้ข้อมูลให้สอดคล้องก่อนส่งตรวจ' });
  for (const category of standardCategories) {
    const matches = criteria.standards.filter((item) => item.category === category);
    const item = matches[0];
    if (matches.length !== 1 || !item) { issues.push({ group: 'มาตรฐาน', message: `${standardLabels[category]}: ต้องมีหนึ่งรายการ` }); continue; }
    if (item.applicability === 'notApplicable') {
      if (['regulatory', 'concrete', 'precast', 'loading'].includes(category) || item.reason.trim().length < 10) issues.push({ group: 'มาตรฐาน', message: `${standardLabels[category]}: ต้องกำหนดมาตรฐาน หรืออธิบายเหตุผลที่ไม่ใช้ให้ครบถ้วน` });
    } else if (['code', 'edition', 'amendment', 'scope', 'source', 'clause'].some((key) => !item[key as keyof StandardReference].trim() || /^(ยังไม่กำหนด|tbd|pending|not checked|—|-)$/i.test(item[key as keyof StandardReference].trim()))) {
      issues.push({ group: 'มาตรฐาน', message: `${standardLabels[category]}: ระบุรหัส ปี ฉบับแก้ไข ขอบเขต เอกสาร และข้ออ้างอิง` });
    }
  }
  const concrete = criteria.standards.find((s) => s.category === 'concrete');
  const precast = criteria.standards.find((s) => s.category === 'precast');
  if (precast?.applicability === 'required' && /319/.test(precast.code) && /2025|2568|^25$/.test(precast.edition) && (!/ACI.*318/i.test(concrete?.code ?? '') || !/^(2025|2568|25)$/.test(concrete?.edition ?? ''))) issues.push({ group: 'มาตรฐาน', message: 'ACI/PCI 319-25 ต้องใช้ร่วมกับ ACI 318-25 — ตรวจคู่มาตรฐานและปี' });
  for (const field of criteriaFields) {
    const value = criteria.values[field.key].trim();
    if (!value || /^(ยังไม่กำหนด|tbd|pending|not checked|—|-)$/i.test(value)) issues.push({ group: field.group, message: `${field.label}: ยังไม่กำหนด` });
    else if ('min' in field && (!Number.isFinite(Number(value)) || Number(value) < field.min || Number(value) > field.max)) issues.push({ group: field.group, message: `${field.label}: ต้องอยู่ระหว่าง ${field.min}–${field.max}` });
    else if (['designLife', 'fire'].includes(field.key) && !Number.isInteger(Number(value))) issues.push({ group: field.group, message: `${field.label}: ต้องเป็นจำนวนเต็ม` });
  }
  return issues;
}
export const designEngineSupport = { status: 'notVerified', label: 'ยังไม่รับรองการคำนวณตามมาตรฐาน', detail: 'ระบบวิเคราะห์ปัจจุบันเป็น benchmark; การเลือก Code ไม่ทำให้ผลคำนวณผ่านการรับรอง ต้องตรวจวิธีคำนวณและหลักฐานตามฉบับที่เลือก' } as const;

export function criteriaFromDesignBasis(basis: DesignBasisPayload): DesignCriteria {
  if (basis.criteria) return basis.criteria;
  const criteria = emptyDesignCriteria();
  criteria.standards = criteria.standards.map((item) => item.category === 'concrete' ? { ...item, code: basis.designCode, edition: basis.designCodeEdition } : item.category === 'loading' ? { ...item, code: basis.loadingCode, edition: basis.loadingCodeEdition } : item);
  criteria.values = { ...criteria.values, location: basis.jurisdiction, designLife: String(basis.designLifeYears), riskCategory: basis.riskCategory, fc28: String(basis.concrete.fc28Mpa), fcLift: String(basis.concrete.fcLiftMpa), density: String(basis.concrete.densityKgM3), elasticModulus: String(basis.concrete.stiffnessMpa), fy: String(basis.reinforcement.fyMpa), materialSource: basis.concrete.source, durability: basis.concrete.durabilityClass, fire: String(basis.fireResistanceMinutes), liftFactor: String(basis.handling.liftingDynamicFactor), transportFactor: String(basis.handling.transportDynamicFactor), handlingSource: basis.handling.source, storage: basis.handling.storageSupportRule };
  return criteria;
}
/** Keep the existing solver-facing fields aligned with the new criteria register. */
export function withDesignCriteria(basis: DesignBasisPayload, criteria: DesignCriteria): DesignBasisPayload {
  const v = criteria.values;
  const concrete = criteria.standards.find((s) => s.category === 'concrete')!;
  const loading = criteria.standards.find((s) => s.category === 'loading')!;
  const number = (text: string, previous: number) => text.trim() ? Number(text) : previous;
  return { ...basis, criteria, designCode: concrete.code || basis.designCode, designCodeEdition: concrete.edition || basis.designCodeEdition, loadingCode: loading.code || basis.loadingCode, loadingCodeEdition: loading.edition || basis.loadingCodeEdition,
    jurisdiction: v.location || basis.jurisdiction, designLifeYears: number(v.designLife, basis.designLifeYears), riskCategory: v.riskCategory || basis.riskCategory, fireResistanceMinutes: number(v.fire, basis.fireResistanceMinutes),
    concrete: { ...basis.concrete, fc28Mpa: number(v.fc28, basis.concrete.fc28Mpa), fcLiftMpa: number(v.fcLift, basis.concrete.fcLiftMpa), densityKgM3: number(v.density, basis.concrete.densityKgM3), stiffnessMpa: number(v.elasticModulus, basis.concrete.stiffnessMpa), durabilityClass: v.durability || basis.concrete.durabilityClass, source: v.materialSource || basis.concrete.source },
    reinforcement: { ...basis.reinforcement, fyMpa: number(v.fy, basis.reinforcement.fyMpa), source: v.materialSource || basis.reinforcement.source },
    handling: { ...basis.handling, liftingDynamicFactor: number(v.liftFactor, basis.handling.liftingDynamicFactor), transportDynamicFactor: number(v.transportFactor, basis.handling.transportDynamicFactor), storageSupportRule: v.storage || basis.handling.storageSupportRule, source: v.handlingSource || basis.handling.source },
  };
}
