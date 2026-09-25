import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='output/mould-design-p40';fs.mkdirSync(dir,{recursive:true});
const src='output/mould-pilot-p39/model.json', model=JSON.parse(fs.readFileSync(src));
const E=200000, gamma=25, H=1.485, p=gamma*H, q=p/1000;
// Linear-elastic simply-supported unit-width strip. N, mm, MPa.
function strip(t,L){const I=t**3/12,Z=t**2/6,M=q*L**2/8;
 return {tMm:t,spanMm:L,pressureKPa:p,momentNmmPerMm:M,stressMPa:M/Z,deflectionMm:5*q*L**4/(384*E*I),nominalFyMPa:235,status:'ELASTIC_SCREEN_ONLY'};}
function beam(name,I,Z,L,tributary){const w=q*tributary,M=w*L*L/8;
 return {name,I_mm4:I,Z_mm3:Z,spanMm:L,tributaryMm:tributary,lineLoadNmm:w,momentNmm:M,stressMPa:M/Z,deflectionMm:5*w*L**4/(384*E*I),endShearKN:w*L/2000,status:'ELASTIC_SCREEN_ONLY'};}
const faceOld=strip(6,588.5),faceNew=strip(6,250);
const secondary=beam('Flat rib 80 deep x 8; supports at <=600',8*80**3/12,8*80**2/6,600,250);
const I=(100**4-88**4)/12;
const primary=beam('SHS100x100x6; idealised supports z0 and z1200',I,I/50,1200,600);
const width=.6,full=p*H*width,hydro=full/2,attach=1.2;
const braceH=full*(H/2)/attach,braceN=braceH*Math.sqrt(2);
const report={revision:'P40-R00',source:src,sourceSha256:createHash('sha256').update(fs.readFileSync(src)).digest('hex'),typical:model.typicalId,
 basis:{pour:'TOP_CONFIRMED_BY_USER',H_m:H,gamma_kN_m3:gamma,E_MPa:E,pressureBase_kPa:p,loadFactorsApplied:false,codeComplianceChecked:false,craneExistingCapacityConstraint:'NONE_REQUESTED_BY_USER_REQUIRED_CRANE_TO_BE_SIZED',operatingCase:'SEPARATE_MOULD_AND_CONCRETE_LIFT_PROPOSED'},
 faceOld,faceNew,secondary,primary,
 stationDemand:{widthM:width,hydrostaticForceKN:hydro,hydrostaticResultantHeightM:H/3,uniformEnvelopeForceKN:full,uniformEnvelopeResultantHeightM:H/2,braceAttachHeightM:attach,braceAngleDeg:45,braceHorizontalKN:braceH,braceAxialKN:braceN,braceVerticalKN:braceH,bottomHorizontalKN:full-braceH,note:'SERVICE DEMANDS only; no capacity claimed. Independent 0.6m strip idealisation, not reactions of full mould.'},
 nominalFyComparisonOnly:{oldFaceExceeds235:faceOld.stressMPa>235,newFaceBelow235:faceNew.stressMPa<235},
 revisedGeometryRequired:true,oldSATValidForNewHardware:false,engineeringApproved:false,productionReleased:false,
 remaining:['Whole-frame compatibility and curved/end/opening support load paths','Local pressure, placement impact and vibration cases','Strength combinations and applicable steel/joint design clauses','Welds, lock prying, bolts/pins, hole bearing and repeated use','Brace buckling and base frame/anchorage/factory floor','Revised hardware solids and continuous clearance checks','Mass/CG with all hardware and concrete handling reinforcement','Lifting hardware manufacturer checks, release strength, adhesion, rotation and crane envelope']};
assert.ok(Math.abs(report.stationDemand.bottomHorizontalKN+braceH-full)<1e-10);
assert.ok(Math.abs(braceH*attach-full*H/2)<1e-10);
assert.ok(faceOld.deflectionMm>faceNew.deflectionMm);
assert.ok(Math.abs(strip(6,500).deflectionMm/faceNew.deflectionMm-16)<1e-10);
fs.writeFileSync(path.join(dir,'calculation.json'),JSON.stringify(report,null,2));
const f=n=>n.toFixed(3);
fs.writeFileSync(path.join(dir,'DESIGN-REVIEW.md'),`# P40 — ตรวจฐานออกแบบแม่แบบเหล็ก TS-C-H15-LH-W01

## ขอบเขตและคำตอบผู้ใช้

ผู้ใช้ให้เริ่มออกแบบจุดล็อก ค้ำยัน ความแข็งแรง และระบบยกในขั้น5 ยืนยันเทจากด้านบน และให้จัดหาเครนตามความต้องการ ไม่จำกัดด้วยเครนเดิม งานนี้เริ่มการคำนวณจริง แต่ยังไม่ใช่แบบครบระบบหรือคำสั่งผลิต

## แรงดันตั้งต้น

ท่าหล่อเดิมทำให้ความสูงคอนกรีตสด H=${H} m ไม่ใช่ความสูงอาคาร3m สมมติ gamma=${gamma} kN/m³, p=gamma H=${f(p)} kPa ที่ฐาน ใช้แรงดันฐานสม่ำเสมอเต็มช่วงสำหรับตรวจแผ่นแบบง่าย; แรงดันจริงกรณีสถิตเป็นรูปสามเหลี่ยม ยังไม่รวม impact/vibration/pumping หรือ load factors ไม่ลดแรงดันเพราะคอนกรีตเริ่มแข็ง

## ตรวจผิวแบบและซี่โครงแบบ elastic screening

E=200000 MPa; แบบจำลอง simply supported: M=wL²/8, stress=M/Z, deflection=5wL⁴/(384EI) สมบัติหน้าตัดเป็น nominal ไม่หัก tolerance/รู/เชื่อม ไม่มีการอ้างผ่าน code

| รายการ | ช่วง mm | Stress MPa | Deflection mm |
|---|---:|---:|---:|
| ผิว6mm / ระยะซี่เดิม |588.5|${f(faceOld.stressMPa)}|${f(faceOld.deflectionMm)}|
| ผิว6mm / ระยะซี่เสนอใหม่ |250|${f(faceNew.stressMPa)}|${f(faceNew.deflectionMm)}|
| ซี่แบน80ลึก×8 / ระยะรองรับ600 |600|${f(secondary.stressMPa)}|${f(secondary.deflectionMm)}|
| SHS100×100×6 / แบบจำลองช่วง1200 |1200|${f(primary.stressMPa)}|${f(primary.deflectionMm)}|

ผล: ห้ามยกขนาด P39 เป็นแบบรับแรงที่ผ่านแล้ว ระยะซี่เดิมให้ stress สูงกว่า nominal fy235 ที่ใช้เทียบและการโก่งมาก จึงเสนอผิว6mm ที่มีแนวรองรับห่างไม่เกิน250mm พร้อมโครงหลักรองรับซี่ห่างไม่เกิน600mm ต้องเพิ่มแนวรองรับขอบและตรวจช่วงยื่น ไม่ถือผลแผ่นตรงนี้ครอบคลุมมุมโค้ง/ช่องเปิด

ค่าการโก่งของแต่ละสมาชิกไม่ใช่การโก่งรวมผิวแม่แบบ ต้องรวมผล deformation ของ support frame และตั้ง tolerance กับโรงงานก่อนตรวจยอมรับ

## แรงสถานีค้ำตัวอย่างต่อความกว้าง0.60m

แรงสถิตสามเหลี่ยม ${f(hydro)} kN ที่ระดับ ${f(H/3)} m; แรง uniform envelope ${f(full)} kN ที่ระดับ ${f(H/2)} m

เลือกจุดค้ำที่ z=1.20m และมุม45° เพื่อเริ่มหา demand: แรงแนวนอนค้ำ ${f(braceH)} kN, axial ${f(braceN)} kN, องค์ประกอบแนวดิ่ง ${f(braceH)} kN, แรงแนวนอนที่ฐานอีก ${f(full-braceH)} kN ตรวจสมดุลแรงและโมเมนต์แล้ว

ตัวเลขเหล่านี้คือแรงใช้งานจากแบบจำลองสถานีอิสระ ไม่ใช่ WLL ที่เลือกซื้อ ไม่ใช่แรงในทุกค้ำของแม่แบบ3D และไม่ใช่การตรวจ SHS100 หรือจุดล็อกผ่าน ต้องเพิ่ม load combinations, buckling, eccentricity, weld/clevis/pin, base anchorage และเสถียรภาพรวม

## แนวรายละเอียดที่จะพัฒนาจากแรงดังกล่าว

- ผิวตรงและผิวม้วนโค้งแยก subassembly; เพิ่มซี่หลังตามช่วงที่ตรวจ ไม่เพิ่มรอยแบ่งบนผิวคอนกรีต
- รอยต่อแบบใช้หน้าแปลนและสลัก/โบลต์ถอดได้ด้านหลังผิว ไม่ให้ bolt ทะลุเนื้อคอนกรีตโดยไม่มีรายละเอียด sleeve ที่ตกลงไว้
- ค้ำถอดได้เชื่อมแรงเข้ากรอบฐานผ่าน clevis/pin; ปลดได้เฉพาะเมื่อชุดแบบมีการรองรับทดแทน ต้องออกแบบช่องทางยกและพื้นที่ถอยก่อนกำหนดพิกัดสุดท้าย
- บล็อกหน้าต่าง4ชิ้นต้องมีตัวจับ/โครงรับภายในช่องเปิด ไม่อาศัยการลอยหรือแรงเสียดทานระหว่างแผ่นผิว
- ระบบยกแยกหูยกเหล็กบนโครงแม่แบบออกจากพุกยกคอนกรีต ห้ามใช้ค่าพุกหรือแบ่งแรง4จุดโดยไม่มี CG/rigging model; ไม่ยกแม่แบบพร้อมคอนกรีตในกรณีเริ่มต้น

## สถานะที่ตรวจจริง

ตรวจสูตร elastic strip/beam และสมดุลสถานีค้ำ ไม่มีแบบจำลอง hardware ใหม่หรือภาพ revised assembly ในแพ็กเกจนี้ ผล SAT ของP39จึงยังไม่ครอบคลุมงานใหม่ ขั้น5คง50%ตามchecklistเดิม ไม่อ้างงานออกแบบครบ100%

## แหล่งตรวจประกอบการกำหนดขอบเขต

- [PERI fresh-concrete pressure calculator: parameters, scope and separate system capacity](https://apps.peri.com/SLR/index.php?lang=en&norm=csa%2F1000)
- [HALFEN FRIMEDA technical information: lifting selection, adhesion and dynamic actions](https://www.moment-solutions.com/wp-content/uploads/2023/03/HALFEN_FRIMEDA_TPA_22-EN-2pdf.com-edit-metadata.pdf)

ไม่ได้คัดลอกค่า capacity จากภาพแนบหรือใช้แหล่งอ้างอิงเหล่านี้เป็นหลักฐานว่าแบบของเราได้รับรองแล้ว
`);
console.log(JSON.stringify(report,null,2));
