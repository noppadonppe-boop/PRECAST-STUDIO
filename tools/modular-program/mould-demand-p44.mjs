import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='output/mould-demand-p44';fs.mkdirSync(dir,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const register='output/stage5-moulds-p38/register.json';
const setups=JSON.parse(fs.readFileSync(register)).setups;
// Static fluid screening only. Per-metre strip is vertical, full depth,
// with neither opening deductions nor transfer to specific hardware.
export function strip(H,gamma=25){return {basePressureKPa:gamma*H,horizontalKNPerM:gamma*H*H/2,baseMomentKNmPerM:gamma*H**3/6,resultantAboveBaseM:H/3};}
assert.equal(strip(0).basePressureKPa,0);assert.equal(strip(1).horizontalKNPerM,12.5);
assert.ok(Math.abs(strip(1.485).basePressureKPa-37.125)<1e-10);
const rows=setups.map(s=>{
 const source=`output/stage5-moulds-p38/${s.folder}/setup.json`,a=JSON.parse(fs.readFileSync(source));
 const points=a.cavity.facesMm.flat();const low=Math.min(...points.map(p=>p[2])),high=Math.max(...points.map(p=>p[2])),H=(high-low)/1000;
 assert.ok(Math.abs(H*1000-s.dimensionsMm[2])<1e-6,s.id+' casting height');
 const pilot=s.typicalId==='TS-C-H15-LH-W01-P05';
 return {id:s.id,typicalId:s.typicalId,kind:s.kind,source,sourceSha256:hash(source),castingHeightMm:H*1000,concreteKg:s.concreteKg,concreteOnlyGravityKN:s.concreteKg*9.80665/1000,staticFullHead:strip(H),uniformBasePressureEnvelope:{horizontalKNPerM:25*H*H,baseMomentKNmPerM:25*H**3/2},hardwareStatus:pilot?'P41_DEVELOPMENT_MODEL':'NOT_MODELLED',fullStrengthDesign:'OPEN',liftingDesign:'OPEN',floorSupportVerification:'AWAITING_FACTORY_DATA',release:false};
});
assert.equal(rows.length,44);assert.equal(new Set(rows.map(r=>r.id)).size,44);
const result={revision:'P44',stage:5,overallPercent:50,status:'STATIC_LOAD_INPUTS_ONLY',assumptions:{topPour:true,gammaKNM3:25,gravityMS2:9.80665,pressureModel:'p(z)=gamma*(H-z)',heightSource:'Casting-coordinate Z extent, not installed building height',scope:'Per metre vertical full-height strip, not actual force on curved/sloped/opening-containing mould faces',excluded:['Impact and vibration','Pump pressure','Strength/load factors','Whole-frame stiffness and stability','Weld bolt anchor capacities','Adhesion and lifting dynamics'],referenceContext:'https://apps.peri.com/SLR/index.php?lang=en&norm=aci',referenceNote:'Background only; no PERI calculator execution or code compliance claimed'},registerSha256:hash(register),rows};
fs.writeFileSync(`${dir}/demand-register.json`,JSON.stringify(result,null,2));
const header='Tag,Height_mm,Concrete_kg,pbase_kPa,Horiz_static_kN_per_m,Mbase_static_kNm_per_m,Hardware_status';
fs.writeFileSync(`${dir}/demand-register.csv`,header+'\n'+rows.map(r=>[r.typicalId,r.castingHeightMm.toFixed(3),r.concreteKg.toFixed(2),r.staticFullHead.basePressureKPa.toFixed(4),r.staticFullHead.horizontalKNPerM.toFixed(4),r.staticFullHead.baseMomentKNmPerM.toFixed(4),r.hardwareStatus].join(',')).join('\n'));
const n=x=>x.toFixed(3);
fs.writeFileSync(`${dir}/README.md`,`# P44 — ฐานแรงดันเท 44 setup\n\nขั้น 5/8 ยัง 50% ไม่มีรายการใดอนุมัติผลิตเพิ่ม\n\nใช้ท่าหล่อจากพิกัด Z จริง ไม่ใช้ความสูงอาคาร 3 เมตร สมมติ gamma=25 kN/m³ เทจากด้านบน แยกจากความหนาแน่นรายงานมวลเดิม\n\nสูตรต่อความกว้างผนังแนวดิ่ง 1 เมตร: pbase=gamma H; F=gamma H²/2; Mbase=gamma H³/6; จุดกระทำ H/3 จากฐาน แยกกรณีแรงดันสม่ำเสมอเต็มความสูงไว้ใน JSON เพื่อเทียบ P41 ไม่ผสมสองกรณีเป็นผลเดียว\n\nนี่เป็น load input ไม่ใช่แรงจริงรายแผงโค้ง/เอียง ไม่ใช่ reaction ของค้ำหรือโบลต์ และยังไม่รวมแรงจี้/กระแทกหรือชุดน้ำหนักออกแบบ ต้องรวมแรงตามผิวและทางถ่ายแรงในโมเดลแม่แบบจริงก่อนเลือกหน้าตัด\n\n[JSON](demand-register.json) · [CSV](demand-register.csv)\n\n|Typical|ท่าหล่อสูง mm|pbase kPa|F kN/m|M kNm/m|\n|---|---:|---:|---:|---:|\n${rows.map(r=>`|${r.typicalId}|${n(r.castingHeightMm)}|${n(r.staticFullHead.basePressureKPa)}|${n(r.staticFullHead.horizontalKNPerM)}|${n(r.staticFullHead.baseMomentKNmPerM)}|`).join('\n')}\n\n## งานที่ยังต้องปิด\n\n1. สร้าง hardware solids ที่เหลือ43 setup พร้อม BOM/รอยต่อและรูปชิ้นผลิตจริง\n2. คำนวณผิว/ซี่/โครง/ล็อก/รอยเชื่อมและเสถียรภาพทุกสถานะทั้ง44ชุด\n3. ตรวจช่องเปิด ทิศถอด ระยะเผื่อ พื้นที่ประแจ จุดรองรับชั่วคราวและระบบยก\n4. จัดทำแบบรายละเอียดและภาพตามสไตล์ที่ยืนยันจากโมเดลที่ตรวจแล้ว\n5. ต้องรับข้อมูลพื้นโรงงาน และกำลัง/เหล็ก/พุกคอนกรีตวันยก ก่อนปิดรายละเอียดที่ขึ้นกับข้อมูลเหล่านั้น\n\n[PERI: ขอบเขตเครื่องมือแรงดันแบบ](https://apps.peri.com/SLR/index.php?lang=en&norm=aci) เป็นเอกสารบริบท ไม่ได้ใช้ผลเครื่องมือหรืออ้างว่าผ่านมาตรฐาน\n`);
console.log(JSON.stringify({setups:rows.length,hardwareModelCount:rows.filter(r=>r.hardwareStatus==='P41_DEVELOPMENT_MODEL').length,rangeKPa:[Math.min(...rows.map(r=>r.staticFullHead.basePressureKPa)),Math.max(...rows.map(r=>r.staticFullHead.basePressureKPa))],validation:'44 heights/source IDs checked + 3 strip benchmarks',stagePercent:50}));
