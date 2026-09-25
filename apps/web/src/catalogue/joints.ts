export type JointGroupId = 'J-S' | 'J-N' | 'J-B';
export type JointApplication = 'wall' | 'node' | 'base';

export interface JointProduct {
  name: string;
  kind: string;
  note: string;
  websiteUrl: string;
  catalogUrl: string;
}

export interface JointGroup {
  id: JointGroupId;
  title: string;
  subtitle: string;
  description: string;
  applications: JointApplication[];
  loadPath: string;
  designInputs: string[];
  selectionNotes: string[];
  products: JointProduct[];
}

const momentPrecast = 'https://www.moment-solutions.com/products/precast-technologies/';
const mGCfCatalog = 'https://www.moment-solutions.com/wp-content/uploads/2026/05/Moment-MGC-F-Brochure_Digital-May26_compressed.pdf';
const mGClCatalog = 'https://www.moment-solutions.com/wp-content/uploads/2026/07/Moment-MGC-L-Brochure_July-26_digital.pdf';
const loopBoxCatalog = 'https://www.moment-solutions.com/wp-content/uploads/2023/03/MOMENT-Loop-Box_compressed.pdf';
const hekCatalog = 'https://www.moment-solutions.com/wp-content/uploads/2020/11/HEK-Precast-Coupler-Brochure.pdf';
const mpsTCatalog = 'https://www.moment-solutions.com/wp-content/uploads/2024/11/Leviat-Moment-MPS-T-Precast-Shoe_Oct24.pdf';

export const jointGroups: JointGroup[] = [
  {
    id: 'J-S',
    title: 'Standard Bay Joint',
    subtitle: 'รอยต่อแผง / ช่วงตรง',
    description: 'รอยต่อระหว่างแผงหรือช่วงโมดูลที่ต่อซ้ำกัน เหมาะสำหรับกำหนดเป็นรายละเอียดมาตรฐานของ bay-to-bay และผนังหรือหลังคาที่ต่อเนื่องกัน',
    applications: ['wall'],
    loadPath: 'Bearing + shear key + connector + seal / closure',
    designInputs: ['แรงอัด N และแรงเฉือน V', 'แรงดึงหรือแรงเปิดรอยต่อ T', 'ความกว้างช่องรอยต่อและค่าคลาดเคลื่อนติดตั้ง', 'ระยะขอบ คอนกรีตรอบ connector และเหล็กเสริมถ่ายแรง'],
    selectionNotes: ['ใช้ HEK เมื่อเหมาะกับรอยต่อแบบขันน็อตแห้งและต้องการถอดได้', 'ใช้ Loop Box เมื่อเป็นรอยต่อผนังต่อผนังหรือผนังต่อเสาและต้องการถ่ายแรงผ่าน loop/closure', 'MGC-F หรือ MGC-L ใช้เป็นตัวเลือก grout coupler ได้ แต่ต้องตรวจแรงและรายละเอียดเหล็กจริง'],
    products: [
      { name: 'HALFEN HEK Precast Coupler', kind: 'Bolted dry coupler', note: 'ระบบขันน็อตแบบแห้ง ติดตั้งเร็ว และถอดได้ในบางกรณี', websiteUrl: `${momentPrecast}hek-precast-coupler/`, catalogUrl: hekCatalog },
      { name: 'MOMENT Loop Box', kind: 'Wire loop box', note: 'เหมาะกับผนังต่อผนัง / ผนังต่อเสา และทำ shear key ได้เมื่อออกแบบร่วมกับ closure', websiteUrl: `${momentPrecast}moment-single-double-wire-loop-box/`, catalogUrl: loopBoxCatalog },
      { name: 'MOMENT MGC-F / MGC-L', kind: 'Grout coupler', note: 'ตัวเลือกต่อเหล็กเสริมด้วย grout ต้องเลือกตามขนาดเหล็ก แรง และวิธีติดตั้ง', websiteUrl: 'https://www.moment-solutions.com/products/rebar-coupler/', catalogUrl: mGCfCatalog },
    ],
  },
  {
    id: 'J-N',
    title: 'Node Joint',
    subtitle: 'รอยต่อโหนด N90 / TR / NR / NW',
    description: 'รอยต่อบริเวณจุดรวมชิ้นส่วน เช่น มุม จุดต่อผนัง–หลังคา หรือ node ที่มีแรงหลายทิศทาง ต้องแยกพิจารณาจากรอยต่อช่วงตรงและตรวจเส้นทางถ่ายแรงแบบ 3D',
    applications: ['node'],
    loadPath: 'Embedded steel + reinforcement continuity + closure grout',
    designInputs: ['แรงร่วม N–V–M และแรงบิดถ้ามี', 'ลำดับการประกอบและพื้นที่เข้าถึงเพื่อเท grout', 'เหล็กเสริมต่อเนื่อง เหล็กหนวดกุ้ง และระยะ anchorage', 'แรงเฉพาะที่ การแตกร้าว และความแข็งของ node ในโมเดล'],
    selectionNotes: ['อย่านำค่าของ J-S ไปใช้แทน node โดยอัตโนมัติ', 'ต้องทำ shop detail ให้ตำแหน่ง connector, rebar และช่องเท grout ไม่ชนกัน', 'ขอ technical proposal แบบ custom node จากผู้ขายก่อนล็อก geometry และแบบผลิต'],
    products: [
      { name: 'MOMENT MGC-F Grout Coupler', kind: 'Full-grout coupler', note: 'ใช้เป็นข้อมูลตั้งต้นสำหรับจุดต่อเหล็กที่ต้องการถ่ายแรงผ่าน grout', websiteUrl: 'https://www.moment-solutions.com/products/rebar-coupler/moment-grout-coupler/', catalogUrl: mGCfCatalog },
      { name: 'MOMENT MGC-L Grout Coupler', kind: 'Half-grout coupler', note: 'เหมาะกับกรณีที่ต้องจัดการ tolerance และลำดับติดตั้งตามเงื่อนไขหน้างาน', websiteUrl: 'https://www.moment-solutions.com/products/rebar-coupler/moment-grout-coupler/', catalogUrl: mGClCatalog },
      { name: 'MOMENT Loop Box', kind: 'Custom loop / closure', note: 'ใช้พิจารณาร่วมกับรายละเอียด closure และเหล็กเสริมรอบ node ไม่ใช่เลือกจาก catalog เพียงอย่างเดียว', websiteUrl: `${momentPrecast}moment-single-double-wire-loop-box/`, catalogUrl: loopBoxCatalog },
    ],
  },
  {
    id: 'J-B',
    title: 'Base Joint',
    subtitle: 'รอยต่อโมดูลกับฐานราก',
    description: 'รอยต่อแนวดิ่งระหว่างผนังหรือโมดูลกับฐานราก ใช้ bearing และ leveling grout ร่วมกับ dowel, anchor หรือระบบ shoe เพื่อควบคุมแรงเลื่อน แรงยก และการพลิกคว่ำ',
    applications: ['base'],
    loadPath: 'Bearing + leveling grout + dowel / anchor + hold-down',
    designInputs: ['แรงอัด N แรงเฉือน V โมเมนต์ M และแรงยก', 'กำลังรับแรงของ bearing / grout และการกระจายแรงที่ฐาน', 'anchor bolt, dowel, edge distance และ concrete breakout', 'ลำดับยก ตั้งระดับ ค้ำยันชั่วคราว และการเท grout ปิดท้าย'],
    selectionNotes: ['MPS-T เป็นจุดเริ่มต้นสำหรับระบบ precast shoe และ anchor bolt ที่ฐานหรือเสา', 'ต้องกำหนดระดับฐานและ tolerance ให้สัมพันธ์กับ leveling grout', 'ห้ามล็อกขนาด shoe หรือ anchor จากน้ำหนักอย่างเดียว ต้องใช้แรงออกแบบและตรวจฐานรากร่วมด้วย'],
    products: [
      { name: 'MOMENT MPS-T Precast Shoe', kind: 'Precast shoe + anchor', note: 'ระบบต่อแบบ bolted connection สำหรับฐาน/เสา ปรับตั้งได้ก่อน grout ปิดงาน', websiteUrl: `${momentPrecast}moment-precast-shoe/`, catalogUrl: mpsTCatalog },
      { name: 'MOMENT MGC-F / MGC-L', kind: 'Grout coupler at base', note: 'พิจารณาเมื่อต้องการต่อเหล็กแนวดิ่งหรือ dowel ผ่าน grout ตามรายละเอียดที่ออกแบบ', websiteUrl: 'https://www.moment-solutions.com/products/rebar-coupler/', catalogUrl: mGCfCatalog },
    ],
  },
];

export const jointApplicationLabels: Record<JointApplication | 'all', string> = {
  all: 'ทั้งหมด',
  wall: 'แผง / ช่วงตรง',
  node: 'โหนด / มุม',
  base: 'ฐาน / ฐานราก',
};

export const jointCatalogLinks = [
  { title: 'Leviat Product Overview', description: 'ภาพรวมกลุ่มผลิตภัณฑ์ Leviat และแบรนด์ในเครือ', url: 'https://www.leviat.com/mwdownloads/download/link/id/273.pdf', kind: 'Catalog PDF' },
  { title: 'MOMENT Precast Technologies', description: 'หน้ารวมผลิตภัณฑ์รอยต่อ precast ทางการ', url: momentPrecast, kind: 'เว็บไซต์ทางการ' },
  { title: 'MOMENT Product Brochures', description: 'หน้ารวม Catalog และเอกสารผลิตภัณฑ์ล่าสุด', url: 'https://www.moment-solutions.com/download/product-brochure/', kind: 'Catalog Center' },
  { title: 'MOMENT Contact / Distributors', description: 'ตรวจสอบผู้แทนจำหน่ายและช่องทางติดต่อ', url: 'https://www.moment-solutions.com/contact-us/', kind: 'เว็บไซต์ทางการ' },
];

export const thailandDistributor = {
  company: 'Cons Inno Co., Ltd.',
  address: '88 หมู่ 4 ตำบลบางสีทอง อำเภอบางกรวย จังหวัดนนทบุรี 11130',
  phone: '+66 92 786 6464',
  email: 'info@consinno.com',
  websiteUrl: 'https://www.consinno.com/home',
  sourceUrl: 'https://www.moment-solutions.com/contact-us/',
};
