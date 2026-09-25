import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {simpleBeam,rhs} from './elastic-beam-p48.mjs';
const extended=process.argv.includes('--p51'),revision=extended?'P51':'P48';
const out=extended?'output/table-demand-p51':'output/floor-demand-p48';fs.mkdirSync(out,{recursive:true});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const E=200000,rho=7850,g=9.80665,gamma=25;
function cell(c){let a=0,x=0,y=0;for(let i=0;i<c.poly.length;i++){const p=c.poly[i],q=c.poly[(i+1)%c.poly.length],s=p[0]*q[1]-q[0]*p[1];a+=s;x+=(p[0]+q[0])*s;y+=(p[1]+q[1])*s;}return {kg:Math.abs(a/2)*(c.z1-c.z0)*rho/1e9,x:x/(3*a),y:y/(3*a),z:(c.z0+c.z1)/2};}
const results=[];
for(const family of (extended?['NW01','NW02','NR-S','NR-N']:['F2660','NF02'])){
 const source=`output/${extended?'table-lock-p51':'floor-lock-p47'}/${family}/model.json`,p46=`output/${extended?'table-mould-p51':'floor-mould-p46'}/${family}/model.json`,m=JSON.parse(fs.readFileSync(source)),old=JSON.parse(fs.readFileSync(p46)),[L,W,H]=m.cavityMm;
 const cells=m.parts.flatMap(p=>p.cells.map(c=>({...cell(c),part:p.id}))),kg=cells.reduce((s,c)=>s+c.kg,0),cg=['x','y','z'].map(k=>cells.reduce((s,c)=>s+c.kg*c[k],0)/kg);
 const pressure=gamma*H/1e6; // N/mm2: gamma kN/m3 * H mm / 1e6
 const pitch=old.ribPitchMm,n=Math.round(L/pitch),ribSection=rhs(100,50,4),railSection=rhs(200,100,6);
 const cases=[];
 for(const surchargeKPa of [0,2.5]){
  // 2.5 kPa is an explicit uniform sensitivity case, NOT an approved code load.
  const p=pressure+surchargeKPa/1000,ribs=[];
  for(let i=0;i<=n;i++){
   const x=i*pitch,a=i===0?0:x-pitch/2,b=i===n?L:x+pitch/2,trib=b-a;
   const skinTrib=trib+(i===0||i===n?120:0);
   const rib=simpleBeam({L:W,min:-120,max:W+120,I:ribSection.I,patches:[{a:0,b:W,q:p*trib},{a:-120,b:W+120,q:skinTrib*6*rho*g/1e9},{a:-100,b:W+100,q:ribSection.area*rho*g/1e9}]});
   ribs.push({id:`RB${String(i+1).padStart(2,'0')}`,xMm:x,tributaryMm:trib,...rib,elasticStressMPa:rib.maxAbsMomentNmm/ribSection.Z});
  }
  // Rails: concrete/surcharge tributary reactions + exact P47 steel-cell mass moments.
  // Steel is mapped directly to the two rail centrelines by transverse static balance.
  // This does not verify local load paths from locks/plates/welds into rails.
  const rails=[0,1].map(j=>{
   const points=[...ribs.map(r=>({x:r.xMm,P:p*r.tributaryMm*W/2})),...cells.map(c=>({x:c.x,P:c.kg*g*(j===0?1-c.y/W:c.y/W)}))];
   const model={L,min:-120,max:L+120,I:railSection.I,points},r=simpleBeam(model),fine=simpleBeam({...model,samples:4000});
   assert.ok(Math.abs(r.maxAbsDeflectionMm-fine.maxAbsDeflectionMm)<.001);
   return {id:`RL0${j+1}`,yMm:j*W,...r,elasticStressMPa:r.maxAbsMomentNmm/railSection.Z,extremaSamplingDifferenceMm:Math.abs(r.maxAbsDeflectionMm-fine.maxAbsDeflectionMm)};
  });
  const pads=rails.flatMap(r=>r.reactionsN.map((N,i)=>({xMm:i*L,yMm:r.yMm,verticalN:N}))),total=p*L*W+kg*g;
  const forceResidual=pads.reduce((s,r)=>s+r.verticalN,0)-total;
  const xResidual=pads.reduce((s,r)=>s+r.verticalN*r.xMm,0)-(p*L*W*L/2+kg*g*cg[0]);
  const yResidual=pads.reduce((s,r)=>s+r.verticalN*r.yMm,0)-(p*L*W*W/2+kg*g*cg[1]);
  assert.ok(Math.abs(forceResidual)<1e-6&&Math.abs(xResidual)<.01&&Math.abs(yResidual)<.01);
  const clear=old.maxSkinClearSpanMm,q=p+6*rho*g/1e9,skin=simpleBeam({L:clear,I:6**3/12,patches:[{a:0,b:clear,q}]});
  cases.push({id:surchargeKPa?'SENSITIVITY-2.5KPA':'STATIC-CAST',surchargeKPa,concretePressureKPa:pressure*1000,skin:{clearSpanMm:clear,...skin,elasticStressMPa:skin.maxAbsMomentNmm/(6**2/6)},ribs,rails,pads,totalVerticalN:total,equilibrium:{forceResidualN:forceResidual,xFirstMomentResidualNmm:xResidual,yFirstMomentResidualNmm:yResidual}});
 }
 // Statics only: tributary shutter forces, NOT resolved bolt forces/stiffness analysis.
 const lockDemands=[];
 for(const parent of ['M01','M02','M03','M04']){
  const alongX=['M01','M02'].includes(parent),length=alongX?L:W,locks=m.lockSchedule.filter(l=>l.parent===parent).sort((a,b)=>(alongX?a.x-b.x:a.y-b.y));
  locks.forEach((lock,i)=>{const at=l=>alongX?l.x:l.y,a=i?(at(locks[i-1])+at(lock))/2:0,b=i<locks.length-1?(at(lock)+at(locks[i+1]))/2:length,F=pressure*H*(b-a)/2;lockDemands.push({...lock,tributaryMm:b-a,horizontalAllocatedN:F,allocatedBaseMomentNmm:F*H/3,forceHeightMm:H/3,status:'TRIBUTARY_ALLOCATION_NOT_BOLT_REACTION'});});
 }
 const result={revision,family,source,sourceSha256:sha(source),p46Source:p46,p46Sha256:sha(p46),cavityMm:m.cavityMm,sourceSetups:old.sources.map(s=>s.id),steelKg:kg,steelCGmm:cg,concreteReportKg:L*W*H/1e9*2400,concreteDesignGravityN:pressure*L*W,sections:{rib:ribSection,rail:railSection},cases,lockDemands,engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(result,null,2));results.push(result);
}
const fmt=(v,n=3)=>v.toFixed(n);
let md='# P48 — Floor mould elastic demand study\n\nขั้น 5/8 ยังไม่ปิด 100% — ผลนี้ไม่ใช่แบบพร้อมผลิต\n\n';
md+='## ขอบเขตและสมมติฐาน\n\nใช้ช่องหล่อและจุดล็อก P47 เดิม ไม่เปลี่ยน Typical: F2660 และ NF02 รวม 5 setup. หน่วย N/mm/MPa; เหล็ก E=200000 MPa, density=7850 kg/m³, g=9.80665. รูปหน้าตัด RHS เป็นมุมคมตามโมเดล ไม่ใช่ตารางผู้ผลิตจริง.\n\nกรณีศึกษาเสนอรองรับสี่จุด (0,0), (L,0), (0,W), (L,W) ใต้ราง ไม่ได้ยืนยันว่ามีฐาน/พื้นโรงงานนี้แล้ว. รางเป็นคานรองรับอย่างง่าย; ซี่โครงแยกคานตามแนว Y ไม่มีการถ่ายโมเมนต์ระหว่างราง/ซี่โครง. ไม่ใช่ 3D grillage หรือ plate FEM.\n\nแรงคอนกรีตสดใช้ gamma=25 kN/m³ ตาม P40/P44 ไม่ใช้มวลรายงาน 2400 kg/m³ แทนแรงออกแบบ. เปรียบเทียบ STATIC-CAST กับ surcharge 2.5 kPa กระจายทั่วช่องหล่อเพื่อ sensitivity เท่านั้น ไม่ใช่ load combination ตาม code หรือโหลดคน/อุปกรณ์ที่เลือกแล้ว. ไม่มีแรงกระแทก/สั่น/เทเยื้องศูนย์/ลม/ยก.\n\nผิวเหล็กตรวจแถบกว้าง 1 mm ช่วงใสระหว่างซี่โครง; ซี่โครงรับ tributary concrete + self-weight RHS + skin strip6 รวมขอบยื่น. รางรับปฏิกิริยาคอนกรีตจากซี่โครงและน้ำหนักเซลล์เหล็ก P47 ทั้งหมดโดยแจกตามสมดุลขวาง ไม่มีการนับน้ำหนักซ้ำ. การแจกน้ำหนักเหล็กลงรางรักษาแรงและโมเมนต์รวม แต่ไม่พิสูจน์ load path เฉพาะจุดของแผ่น/หูล็อก/รอยเชื่อม. ผลโก่งแยกชั้น ไม่ใช่การโก่งรวมผิวแม่แบบ.\n\nจุดล็อกรายงานแรงจัดสรรตามช่วงรับแรงและโมเมนต์ที่ฐานเท่านั้น ยังไม่ใช่แรงเฉือน/แรงดึงของโบลต์ เพราะต้องวิเคราะห์ stiffness, bearing toe, prying และแนวเชื่อมร่วมกัน. ห้ามนำค่าเหล่านี้ไปเลือกโบลต์โดยตรง.\n\n## ผลคำนวณ\n\n|แม่แบบ / case|แรงลงฐานรวม kN|แรงสูงสุดต่อจุด kN|ความเค้นผิว MPa|ความเค้นซี่โครง MPa|ความเค้นราง MPa|โก่งราง mm|\n|---|---:|---:|---:|---:|---:|---:|\n';
for(const r of results)for(const c of r.cases)md+=`|${r.family} / ${c.id}|${fmt(c.totalVerticalN/1000)}|${fmt(Math.max(...c.pads.map(p=>p.verticalN))/1000)}|${fmt(c.skin.elasticStressMPa)}|${fmt(Math.max(...c.ribs.map(x=>x.elasticStressMPa)))}|${fmt(Math.max(...c.rails.map(x=>x.elasticStressMPa)))}|${fmt(Math.max(...c.rails.map(x=>x.maxAbsDeflectionMm)))}|\n`;
md+='\n## มวลและจุดล็อก\n\n';
for(const r of results)md+=`- ${r.family}: steel model ${fmt(r.steelKg,1)} kg; CG [${r.steelCGmm.map(v=>fmt(v,1)).join(', ')}] mm; concrete report ${fmt(r.concreteReportKg,1)} kg. จุดล็อก 12 จุด: แรงจัดสรรสูงสุด ${fmt(Math.max(...r.lockDemands.map(l=>l.horizontalAllocatedN))/1000)} kN, โมเมนต์จัดสรรสูงสุด ${fmt(Math.max(...r.lockDemands.map(l=>l.allocatedBaseMomentNmm))/1e6,4)} kN·m.\n`;
md+='\n## ตรวจสอบและงานที่ต้องปิด\n\nสูตรคานทดสอบเทียบ UDL, midpoint load, overhang/uplift, patch-load reactions และ RHS area. ตรวจ sumF และ first moments สองแกนของฐานทั้งสี่จุด; เปรียบเทียบ sampling 2000/4000 สำหรับ extrema ของราง (ไม่ใช่ mesh convergence FEM). Geometry inputs มี SHA-256.\n\nยังไม่ทำ code capacity check ของเหล็ก/bolt/weld, plate local bending, shear/torsion/buckling, stability/erection/demoulding, support contact/pad/floor, lifting, tolerance/seal. ไม่มีค่า allowable deflection ที่อนุมัติ จึงไม่แสดง PASS จากค่า elastic stress หรือ deflection. ชุดนี้ไม่แก้สถานะ approved/released และไม่เริ่มขั้น6.\n\nPressure background: [ACI 347R-14, section4.2.2.2](https://www.concrete.org/Portals/0/Files/PDF/CEU-347R-14.pdf) กล่าวถึง full liquid head สำหรับ SCC เมื่อไม่มีหลักฐานลดแรงดัน; โครงการนี้ยังไม่เลือก SCC และผล P48 ไม่ใช่การตรวจครบตาม ACI347.\n';
if(extended)md=md.replaceAll('P48','P51').replace('Floor mould','Table mould').replace('ใช้ช่องหล่อและจุดล็อก P47 เดิม ไม่เปลี่ยน Typical: F2660 และ NF02 รวม 5 setup.','ใช้ช่องหล่อและจุดล็อก P51 ไม่เปลี่ยน Typical: NW01/NW02/NR-S/NR-N รวม4setup.').replaceAll('P47','P51');
fs.writeFileSync(`${out}/README.md`,md);
fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision,stage:5,stagePercentLegacyReference:50,status:'PARTIAL_ELASTIC_DEMAND_NOT_CAPACITY_CHECK',families:results.map(r=>({family:r.family,sourceSetups:r.sourceSetups,file:`${r.family}.json`,sha256:sha(`${out}/${r.family}.json`)})),engineeringApproved:false,productionReleased:false},null,2));
console.log(md);
