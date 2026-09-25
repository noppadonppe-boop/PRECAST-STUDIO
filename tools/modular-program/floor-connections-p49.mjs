import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {continuousBeam} from './continuous-beam-p49.mjs';import {rhs} from './elastic-beam-p48.mjs';
const extended=process.argv.includes('--p51'),revision=extended?'P51':'P49';
const out=extended?'output/table-connections-p51':'output/floor-connections-p49';fs.mkdirSync(out,{recursive:true});const results=[];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const family of (extended?['NW01','NW02','NR-S','NR-N']:['F2660','NF02'])){
 const source=`output/${extended?'table-lock-p51':'floor-lock-p47'}/${family}/model.json`,model=JSON.parse(fs.readFileSync(source)),[L,W,H]=model.cavityMm;
 const A1=6*H,A2=rhs(50,50,4).area,c=(A1*3+A2*31)/(A1+A2),I=H*6**3/12+A1*(3-c)**2+rhs(50,50,4).I+A2*(31-c)**2,Z=I/Math.max(c,56-c);
 const q=25*H**2/2/1e6,panels=[];
 for(const parent of ['M01','M02','M03','M04']){
  const isX=['M01','M02'].includes(parent),length=isX?L:W,locks=model.lockSchedule.filter(l=>l.parent===parent).sort((a,b)=>isX?a.x-b.x:a.y-b.y),supports=locks.map(l=>isX?l.x:l.y),cases=[];
  for(const supportK of [null,1000,100]){
   const beam=continuousBeam({length,supports,I,q,supportK}),fine=continuousBeam({length,supports,I,q,supportK,subdivisions:4});
   assert.ok(Math.abs(beam.forceResidualN)<1e-6&&Math.abs(beam.momentResidualNmm)<.001);
   assert.ok(Math.abs(beam.maxDeflectionMm-fine.maxDeflectionMm)<1e-4);
   const demands=beam.reactions.map((r,i)=>{
    // Outward pressure overturns about the OUTER foot bearing zone, not its inner edge.
    // P47 bolt at u=80, outer edge u=110. Trial resultant u=100 or110 => lever20 or30.
    const baseMomentNmm=r.forceN*H/3;
    return {id:locks[i].id,...r,baseMomentNmm,boltCoupleSensitivity:[20,30].flatMap(leverMm=>[1,2].map(pryingMultiplier=>({leverMm,pryingMultiplier,tensionTrialN:Math.max(0,baseMomentNmm)/leverMm*pryingMultiplier,shearTrialN:r.forceN}))),note:'Simplified moment allocation assumes common force height. Torsion, contact and prying not solved.'};
   });
   cases.push({supportK,...beam,elasticStressMPa:beam.maxMomentNmm/Z,meshReactionDifferenceN:Math.max(...beam.reactions.map((r,i)=>Math.abs(r.forceN-fine.reactions[i].forceN))),demands});
  }
  panels.push({parent,lengthMm:length,locks:locks.map(l=>l.id),section:{centroidOutwardMm:c,I_mm4:I,Z_mm3:Z,assumedCompositeSkinAndRHS:true},cases});
 }
 const r={revision,family,source,sourceSha256:hash(source),cavityMm:model.cavityMm,panels,baseContactTrial:{boltOutwardMm:80,outerFootEdgeMm:110,compressionResultantTrialMm:[100,110],pryingMultipliers:[1,2],notBoundsOnRealPrying:true},capacityChecked:false,engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(r,null,2));results.push(r);
}
let md='# P49 — แรงจุดล็อกแม่แบบพื้นจากความแข็งแผง\n\nขั้น5/8 งานต่อจาก P48 ไม่เปลี่ยน geometry P47 และไม่ใช่แบบอนุมัติผลิต\n\n## แบบจำลอง\n\nแผงยาว/หัวท้ายแต่ละแผงเป็นคานต่อเนื่องตามแนวนอน รับแรงคอนกรีตสามเหลี่ยมเต็มสูง175mm รวมเป็น line load0.3828125N/mm ที่สูง58.333mm. สมมติหน้าตัดผิว6mmเชื่อมร่วม RHS50×50×4 เต็มที่; ไม่รวมการโก่งบิด/การบิดตัวของหน้าตัด รอยเชื่อมจริงยังไม่ตรวจ. รองรับตามสถานีล็อก12จุดของแต่ละขนาด ไม่หารแรงเท่ากัน. หัวท้ายคำนวณช่วงรับแรงคอนกรีตW ไม่รวมปลายเหล็กยื่น6mmที่ไม่สัมผัสคอนกรีต.\n\nเปรียบเทียบ support rigid กับ spring1000 และ100N/mm เป็น sensitivity ที่ผู้ช่วยเสนอ ไม่ใช่ความแข็งจริงของโบลต์/เท้า/ฐาน. ไม่รวมส่วนแบ่งแรงผ่านมุมแผงหรือแรงเสียดทาน. ผลเป็นแรงแนวนอนที่ชุดรองรับอุดมคติ ไม่ใช่ผล connection3D.\n\n## ผลสรุป\n\n|แม่แบบ|แผง|k N/mm|แรงสถานีสูงสุด N|โก่งแผงสูงสุด mm|elastic stress MPa|\n|---|---|---:|---:|---:|---:|\n';
for(const r of results)for(const p of r.panels)for(const c of p.cases)md+=`|${r.family}|${p.parent}|${c.supportK??'rigid'}|${Math.max(...c.reactions.map(x=>x.forceN)).toFixed(2)}|${c.maxDeflectionMm.toFixed(4)}|${c.elasticStressMPa.toFixed(3)}|\n`;
md+='\n## ประเด็นขอบเท้าและแรงดึงโบลต์\n\nในพิกัดท้องถิ่น u วัดออกจากผิวคอนกรีต โบลต์อยู่80mm ขอบเท้านอก110mm. เมื่อแรงดันผลักแผงออก ขอบเท้าด้านนอกเป็นบริเวณกดรองรับ; ระยะคู่แรงไม่ใช่80mm. ศึกษาตำแหน่งแรงกด u=100/110 ให้ lever20/30mm และ T=M/lever. คูณแรงดึง1หรือ2เพื่อ sensitivity ของ prying เท่านั้น **ค่า2ไม่ใช่ขอบบนรับรอง**. ต้องทำ contact/plate/weld model จึงทราบแรงโบลต์จริง. ไม่เปลี่ยนเป็น PASS หรือเลือกเกรด/แรงขันจากค่าทดลองนี้.\n\n';
for(const r of results){const all=r.panels.flatMap(p=>p.cases.flatMap(c=>c.demands.flatMap(d=>d.boltCoupleSensitivity)));md+=`- ${r.family}: แรงดึงทดลองสูงสุด ${(Math.max(...all.map(x=>x.tensionTrialN))/1000).toFixed(3)}kN จากชุดสมมติฐานทั้งหมด; ไม่ใช่พิกัดใช้งาน.\n`;}
md+='\n## การตรวจ\n\nตัวแก้สมการใหม่ไม่มี side effects ต่อ P41. ทดสอบคานเดี่ยว, คานสองช่วง, spring settlement และ mesh refinement4เท่า. ทุกแผงทุกกรณีตรวจสมดุลแรง/โมเมนต์. งานนี้เพิ่ม24กรณีแผง และ72ค่าปฏิกิริยาสถานี ไม่ใช่แม่แบบใหม่24ชุด.\n\nยังต้องปิด: ความแข็งจริง/contact/prying, weld/bolt/bearing/thread/cyclic use, จุดรองรับบนฐาน, การยกและกำลังคอนกรีตวันยก. P48 tributary allocationเก็บเป็นประวัติ ไม่แทนด้วยค่าคานโดยไม่ระบุสมมติฐาน.\n';
if(extended)md=md.replaceAll('P49','P51').replaceAll('P47','P51').replace('24กรณีแผง และ72ค่าปฏิกิริยาสถานี','48กรณีแผง และ144ค่าปฏิกิริยาสถานี');
fs.writeFileSync(`${out}/README.md`,md);fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision,families:results.map(r=>({family:r.family,source:r.source,sourceSha256:r.sourceSha256,file:`${r.family}.json`})),panelCases:results.length*12,reactionCases:results.length*36,stage:5,stagePercentLegacyReference:50,engineeringApproved:false,productionReleased:false},null,2));console.log(md);
