/** Elastic screening only. Compression and downward displacement are positive. */
export const prestressFields = [
  { key: 'widthMm', label: 'ความกว้าง b · mm', min: 1, max: 10000 },
  { key: 'depthMm', label: 'ความสูง h · mm', min: 1, max: 10000 },
  { key: 'spanM', label: 'ช่วงรองรับ L · m', min: 0.1, max: 100 },
  { key: 'eccentricityMm', label: 'ระยะเยื้องศูนย์ e · mm (บวก = ลวดต่ำกว่าศูนย์กลาง)', min: -5000, max: 5000 },
  { key: 'strandCount', label: 'จำนวนลวด / เส้น', min: 1, max: 10000 },
  { key: 'strandAreaMm2', label: 'พื้นที่ลวดต่อเส้น · mm²', min: 0.1, max: 10000 },
  { key: 'fpuMpa', label: 'กำลังดึงประลัยลวด fpu · MPa', min: 100, max: 3000 },
  { key: 'jackingStressMpa', label: 'หน่วยแรงดึงเริ่มต้น fpj · MPa', min: 1, max: 3000 },
  { key: 'elasticLossMpa', label: 'สูญเสีย Elastic shortening · MPa', min: 0, max: 3000 },
  { key: 'frictionLossMpa', label: 'สูญเสีย Friction · MPa', min: 0, max: 3000 },
  { key: 'anchorageLossMpa', label: 'สูญเสีย Anchorage seating · MPa', min: 0, max: 3000 },
  { key: 'initialRelaxationLossMpa', label: 'สูญเสีย Relaxation ก่อนถ่ายแรง · MPa', min: 0, max: 3000 },
  { key: 'creepLossMpa', label: 'สูญเสีย Creep หลังถ่ายแรง · MPa', min: 0, max: 3000 },
  { key: 'shrinkageLossMpa', label: 'สูญเสีย Shrinkage หลังถ่ายแรง · MPa', min: 0, max: 3000 },
  { key: 'relaxationLossMpa', label: 'สูญเสีย Relaxation หลังถ่ายแรง · MPa', min: 0, max: 3000 },
  { key: 'transferStrengthMpa', label: 'กำลังคอนกรีตขณะถ่ายแรง fci · MPa', min: 1, max: 150 },
  { key: 'serviceStrengthMpa', label: 'กำลังคอนกรีตขณะใช้งาน fc · MPa', min: 1, max: 150 },
  { key: 'transferModulusMpa', label: 'โมดูลัสขณะถ่ายแรง Eci · MPa', min: 1000, max: 100000 },
  { key: 'serviceModulusMpa', label: 'โมดูลัสขณะใช้งาน Ec · MPa', min: 1000, max: 100000 },
  { key: 'transferLoadKnM', label: 'น้ำหนักกระจายรวมขณะถ่ายแรง · kN/m', min: 0, max: 10000 },
  { key: 'serviceLoadKnM', label: 'น้ำหนักกระจายรวมขณะใช้งาน · kN/m', min: 0, max: 10000 },
  { key: 'transferCompressionLimitMpa', label: 'ขีดจำกัดแรงอัดขณะถ่ายแรง · MPa', min: 0.01, max: 150 },
  { key: 'transferTensionLimitMpa', label: 'ขีดจำกัดแรงดึงขณะถ่ายแรง · MPa (ขนาดบวก)', min: 0, max: 20 },
  { key: 'serviceCompressionLimitMpa', label: 'ขีดจำกัดแรงอัดขณะใช้งาน · MPa', min: 0.01, max: 150 },
  { key: 'serviceTensionLimitMpa', label: 'ขีดจำกัดแรงดึงขณะใช้งาน · MPa (ขนาดบวก)', min: 0, max: 20 },
] as const;
export type PrestressField = typeof prestressFields[number]['key'];
export interface PrestressInput {
  system: 'pretension' | 'posttension';
  memberReference: string;
  source: string;
  /** Explicit confirmation: straight tendon, uniform force, rectangular uncracked section, simple supports, UDL. */
  assumptionsConfirmed: boolean;
  values: Record<PrestressField, string>;
}
export function emptyPrestressInput(): PrestressInput {
  return { system: 'pretension', memberReference: '', source: '', assumptionsConfirmed: false, values: Object.fromEntries(prestressFields.map(({ key }) => [key, ''])) as PrestressInput['values'] };
}
export function prestressInputIssues(input: PrestressInput): string[] {
  const issues: string[] = [];
  if (!['pretension', 'posttension'].includes(input.system)) issues.push('ระบบอัดแรงไม่ถูกต้อง');
  if (!input.memberReference.trim()) issues.push('ระบุชิ้นงาน / Revision / ชุดน้ำหนัก');
  if (!input.source.trim()) issues.push('ระบุแหล่งอ้างอิงวัสดุ การสูญเสีย และขีดจำกัดหน่วยแรง');
  if (!input.assumptionsConfirmed) issues.push('ยืนยันขอบเขตแบบจำลองก่อนคำนวณ');
  for (const field of prestressFields) {
    const value = input.values[field.key];
    if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Number(value)) || Number(value) < field.min || Number(value) > field.max) issues.push(`${field.label}: ต้องระบุค่าระหว่าง ${field.min}–${field.max}`);
  }
  if (issues.length) return issues;
  const n = numbers(input);
  if (!Number.isInteger(n.strandCount)) issues.push('จำนวนลวดต้องเป็นจำนวนเต็ม');
  if (Math.abs(n.eccentricityMm) >= n.depthMm / 2) issues.push('ศูนย์กลางลวดต้องอยู่ภายในหน้าตัด');
  if (n.strandCount * n.strandAreaMm2 >= n.widthMm * n.depthMm) issues.push('พื้นที่ลวดรวมต้องน้อยกว่าพื้นที่หน้าตัด');
  if (n.jackingStressMpa >= n.fpuMpa) issues.push('หน่วยแรงดึงเริ่มต้นต้องต่ำกว่า fpu (ยังต้องตรวจขีดจำกัดการดึงตาม Code)');
  if (losses(n).total >= n.jackingStressMpa) issues.push('การสูญเสียรวมต้องน้อยกว่าหน่วยแรงดึงเริ่มต้น');
  if (input.system === 'pretension' && n.frictionLossMpa !== 0) issues.push('แบบจำลอง Pre-tension ลวดตรงนี้กำหนด Friction เป็น 0');
  if (n.transferCompressionLimitMpa > n.transferStrengthMpa || n.serviceCompressionLimitMpa > n.serviceStrengthMpa) issues.push('ขีดจำกัดแรงอัดต้องไม่เกินกำลังคอนกรีตในช่วงนั้น');
  return issues;
}
type NumericInput = Record<PrestressField, number>;
function numbers(input: PrestressInput): NumericInput { return Object.fromEntries(prestressFields.map(({ key }) => [key, Number(input.values[key])])) as NumericInput; }
function losses(n: NumericInput) {
  const immediate = n.elasticLossMpa + n.frictionLossMpa + n.anchorageLossMpa + n.initialRelaxationLossMpa;
  const longTerm = n.creepLossMpa + n.shrinkageLossMpa + n.relaxationLossMpa;
  return { immediate, longTerm, total: immediate + longTerm };
}
export const prestressReferences = [
  'https://www.fhwa.dot.gov/bridge/lrfd/pscus056.cfm',
  'https://www.fhwa.dot.gov/bridge/lrfd/pscus054.cfm',
];
export const prestressExclusions = [
  'การสูญเสียเป็นค่าที่ผู้ใช้ป้อน ไม่ได้ทำนายจากอายุ ความชื้น ความยาวลวด หรือขั้นตอนดึง',
  'ตรวจเฉพาะกลางช่วงหนึ่งชุดน้ำหนักต่อช่วงอายุ ไม่ครอบคลุมทุกหน้าตัดหรือทุก load combination',
  'ไม่ตรวจ ULS ดัด/เฉือน รอยร้าว ระยะหุ้ม ระยะถ่ายแรง/ฝังยึด bursting และอุปกรณ์ยึด',
  'ไม่รวมลวดโค้ง แรงอัดแปรตามความยาว หน้าตัดประกอบ duct void คานต่อเนื่อง หรือ second-order effects',
  'การโก่งตัวเป็น elastic uncracked estimate ไม่ใช่ผลระยะยาวจาก creep/shrinkage และประวัติการบรรทุก',
];
export function calculatePrestress(input: PrestressInput) {
  const issues = prestressInputIssues(input);
  if (issues.length) throw new Error(issues.join('\n'));
  const n = numbers(input);
  const loss = losses(n);
  const areaMm2 = n.widthMm * n.depthMm;
  const inertiaMm4 = n.widthMm * n.depthMm ** 3 / 12;
  const sectionModulusMm3 = inertiaMm4 / (n.depthMm / 2);
  const strandAreaMm2 = n.strandCount * n.strandAreaMm2;
  const force = (stress: number) => strandAreaMm2 * stress / 1000;
  const transferStressMpa = n.jackingStressMpa - loss.immediate;
  const effectiveStressMpa = transferStressMpa - loss.longTerm;
  const stage = (forceKn: number, loadKnM: number, modulusMpa: number, compressionLimit: number, tensionLimit: number) => {
    const momentKnm = loadKnM * n.spanM ** 2 / 8;
    const axial = forceKn * 1000 / areaMm2;
    const bending = (momentKnm * 1e6 - forceKn * 1000 * n.eccentricityMm) / sectionModulusMm3;
    const topMpa = axial + bending;
    const bottomMpa = axial - bending;
    const compressionMpa = Math.max(0, topMpa, bottomMpa);
    const tensionMpa = Math.max(0, -topMpa, -bottomMpa);
    const lengthMm = n.spanM * 1000;
    // 1 kN/m = 1 N/mm. Constant Pe moment: displacement at L/2 = -Pe L²/(8EI).
    const gravityDeflectionMm = 5 * loadKnM * lengthMm ** 4 / (384 * modulusMpa * inertiaMm4);
    const prestressDeflectionMm = -forceKn * 1000 * n.eccentricityMm * lengthMm ** 2 / (8 * modulusMpa * inertiaMm4);
    return { forceKn, momentKnm, topMpa, bottomMpa, compressionMpa, tensionMpa,
      compressionLimitMpa: compressionLimit, tensionLimitMpa: tensionLimit,
      comparison: compressionMpa <= compressionLimit && tensionMpa <= tensionLimit ? 'WITHIN_USER_LIMITS' as const : 'EXCEEDS_USER_LIMITS' as const,
      gravityDeflectionMm, prestressDeflectionMm, netElasticDeflectionMm: gravityDeflectionMm + prestressDeflectionMm,
      hasTension: tensionMpa > 0 };
  };
  return { method: 'prestress-elastic-rectangular-straight-v1', status: 'PRELIMINARY_NOT_VERIFIED', canRelease: false,
    areaMm2, inertiaMm4, sectionModulusMm3, strandAreaMm2,
    lossMpa: loss, lossPercent: loss.total / n.jackingStressMpa * 100,
    jackingForceKn: force(n.jackingStressMpa), transferStressMpa, effectiveStressMpa,
    transfer: stage(force(transferStressMpa), n.transferLoadKnM, n.transferModulusMpa, n.transferCompressionLimitMpa, n.transferTensionLimitMpa),
    service: stage(force(effectiveStressMpa), n.serviceLoadKnM, n.serviceModulusMpa, n.serviceCompressionLimitMpa, n.serviceTensionLimitMpa),
    exclusions: prestressExclusions, references: prestressReferences };
}
