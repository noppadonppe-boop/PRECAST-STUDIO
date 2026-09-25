import fs from 'node:fs';import assert from 'node:assert/strict';import {read,sha} from './foot-flex-audit-p90.mjs';
const out='output/stage5-closure-p90',base=read('output/stage5-library-p61/register.json'),supp=read('output/stage5-library-p89/register.json'),lift=read('output/concrete-lift-p52/register.json');
const requirements=[
 ['P40-1','บัญชีชิ้นจริงและอุปกรณ์','จำนวน stock/subassembly ไม่ใช่ BOM ผลิตที่ปิดแล้ว; ต้องรวม seals, retention, lifting fittings และเชื่อมกับรายละเอียดผลิต'],
 ['P40-2','3D / มิติ / tolerance / revision','มี geometry และมิติพัฒนา; ต้องกำหนด tolerance และตรวจ fit ของรุ่นออกแบบเดียวกับชุดผลิต'],
 ['P40-3','ประกอบครบ / ช่องหล่อ / ทางทำงาน','ต้องปิดซีล ช่องเท/จี้ การเข้าถึงเครื่องมือจริงและอุปกรณ์พยุง ไม่ใช้ภาพAIรับรองกลไก'],
 ['P40-4','ถอดแบบอย่างมีการรองรับ','มีผลการเลื่อน nominal บางระบบ; ต้องเพิ่มการรองรับก่อนปลด ทางหมุนเกลียว/เครนและพื้นที่พักตามชิ้นจริง'],
 ['P40-5','ชิ้นคอนกรีตตรง Typical','มี Typical และ geometry ต้นทาง; ต้องรวมผลทวนสอบในชุดประกอบที่ตรึง revision สุดท้าย ไม่อนุมัติด้วยความสวยของภาพ'],
 ['P40-6','กำลัง / จุดต่อ / เสถียรภาพแม่แบบ','ผล demand/component screening ไม่เท่ากับผ่านทั้งระบบ; ต้องปิดผิว/โครง/ฐาน/weld/bolt/brace/anchor และช่วงประกอบถอด'],
 ['P40-7','ยกแม่แบบ / ชิ้นถอด / คอนกรีต / พลิก','P52ยอมรับกำลังยกคอนกรีตเพื่อพัฒนาและไม่ระบุขนาดเหล็ก; ยังต้องกำหนดอุปกรณ์ยกเหล็ก rigging จุดรองรับและแรงแต่ละช่วง'],
 ['P40-8','รายละเอียดผลิต / QC / ทดลองประกอบ','ต้องมีรอยเชื่อม/รู/ผิว/ค่าคลาดเคลื่อน/ลำดับตรวจและเกณฑ์ทดสอบจาก revision คำนวณเดียวกัน']
];
const queues={
 TABLE:{label:'แม่แบบโต๊ะ: พื้นและแผงโหนด',next:'ปิดชุดรอยเชื่อมและจุดยึดจาก P49/P51; ระบุวัสดุ/รู/ความคลาดเคลื่อน/ซีล แล้วรวมระบบรองรับและยก',order:2},
 NOTCHED:{label:'แม่แบบพื้นเว้า N01/N02',next:'เพิ่มรายละเอียดพินกันหมุน รอยเชื่อม จุดยึด และการพยุง M02 ตามทางถอนสองช่วง ก่อนยกเข้าที่พัก',order:3},
 END:{label:'แม่แบบแผงปลาย A/B/C/D',next:'ตรวจแรงผิว/โครงตาม profile จริง จุดล็อกและรอยเชื่อม; ปิดการยกแผงแบบโค้งและชุด box-out',order:4},
 CAP:{label:'แม่แบบครอบและแผงปิดขอบโหนด',next:'ตรวจแรง/ล็อก/รอยเชื่อมและแปลงแผนยก P52 ให้ตรงท่าหล่อ P56 ก่อนตรวจการพลิก',order:5},
 C_SHELL:{label:'แม่แบบซีก C',next:'แยก cut pieces จาก stock ซ้อน P59 ตรวจเบ้ารับเกลียว/รอยเชื่อมและอุปกรณ์ยก แล้วตรวจมวลและทางถอดรวมใหม่',order:6},
 ABD_SHELL:{label:'แม่แบบซีก A/B/D',next:'ผล demand P90 ตรวจครบเฉพาะขาผนัง W01; ต่อไปตรวจแหวน/เกลียว/รอยเชื่อม การรวมแรงและระบบรองรับ รวมถึงกรณี S00 ที่ยังไม่ครอบคลุม ไม่ขยาย FE ซ้ำโดยไม่มีข้อไม่ผ่านหรือ input เปลี่ยน',order:1}
};
fs.mkdirSync(out,{recursive:true});const pins=new Map();
function pin(p,h=sha(p)){assert.equal(sha(p),h,'Stale evidence '+p);pins.set(p,h);return {path:p,sha256:h};}
pin('output/stage5-library-p61/register.json');pin('output/stage5-library-p89/register.json');pin('output/concrete-lift-p52/register.json');pin('knowledge/modular-program-r02/STAGE5_STEEL_MOULD_REQUIREMENTS_P40.md');pin('knowledge/modular-program-r02/decision-lifting-p52.json');
const records=[];
for(const s of base.records){
 const id=s.id,grp=supp.records.find(r=>r.id===id),lr=lift.records.find(r=>r.id===id);assert.ok(lr);
 const kind=grp?'ABD_SHELL':id.includes('-H15-')?'C_SHELL':id.includes('-EPX-')?'END':s.sourceRevision==='P56'?'CAP':s.sourceRevision==='P54'?'NOTCHED':'TABLE';
 const evidence=s.files.map(f=>pin(f.path,f.sha256));
 if(grp)for(const g of grp.groups.filter(g=>['P71','P74','P80','P85','P89'].includes(g.revision)))for(const f of g.files)evidence.push(pin(f.path,f.sha256));
 const concreteReference=pin(lr.source,lr.sourceSha256),liftingReferences=lr.files.map(f=>pin(f.path,f.sha256));
 const sourceModels=s.files.filter(f=>f.path.endsWith('.json')).map(f=>({path:f.path,model:read(f.path)}));
 const observedLimits=sourceModels.flatMap(({path,model})=>{
  const limits=[...(model.limits??[]),...(model.limitations??[])];
  if(model.weldsDesigned===false)limits.push('weldsDesigned=false');if(model.tolerancesAssigned===false)limits.push('tolerancesAssigned=false');if(model.capacityChecked===false)limits.push('capacityChecked=false');
  return limits.map(message=>({path,message}));
 });
 const key=grp?.groups.find(g=>g.revision==='P89').files.find(f=>f.path.endsWith('.json')).path.split('/').at(-1).replace('.json','');
 const futureDemand=key?.endsWith('W01')?`output/foot-flex-p90/${key}-summary.json`:null;
 if(futureDemand&&fs.existsSync(futureDemand))evidence.push(pin(futureDemand));
 const checks=requirements.map(([tag,title,gap])=>({tag,title,status:'OPEN_PARTIAL_EVIDENCE',complete:false,remaining:gap}));
 // This is an evidence/closure review, not a new geometry or code acceptance.
 const r={revision:'P90',id,typicalId:s.typicalId,familyWorkstream:kind,workstream:queues[kind],geometryBasis:grp?'P85 + P71 + P74 + P80 once each; P89 is an unadopted candidate':s.sourceRevision,pressureDemandP90:futureDemand&&fs.existsSync(futureDemand)?futureDemand:null,evidence,concreteReference,liftingReferences,liftingCoordinateReview:kind==='CAP'?'REMAP_REQUIRED_P52_TO_P56':'RECONCILE_WITH_FINAL_MOULD_REVISION',observedSourceLimits:observedLimits,requirements:checks,closedP40Deliverables:0,completeP40Design:false,stageComplete:false,engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(`${out}/${id}.json`,JSON.stringify(r,null,2));records.push(r);
}
assert.equal(records.length,44);assert.equal(new Set(records.map(r=>r.id)).size,44);
const groups=Object.entries(queues).map(([id,g])=>({...g,id,setups:records.filter(r=>r.familyWorkstream===id).map(r=>r.id)})).sort((a,b)=>a.order-b.order);
assert.equal(groups.reduce((n,g)=>n+g.setups.length,0),44);
const result={revision:'P90',stage:5,purpose:'Complete44-setup closure inventory against P40; partial evidence does not close an entire deliverable.',records,workstreams:groups,coverage:{reviewedSetups:44,totalSetups:44,inventoryPercent:100,completeP40Setups:0},stageCompletionPercent:null,percentageNote:'100% applies only to inventory coverage; no weighted Stage5 completion baseline has been approved. Zero fully closed setups does not mean no development work has been done.',sharedSources:[{family:'F2660',setups:records.filter(r=>r.evidence.some(f=>f.path==='output/floor-mould-p46/F2660/model.json')).map(r=>r.id),meaning:'Four product-family slots share this exact mould geometry. Not four independent physical tools or four independent analyses.'}],pins:[...pins].map(([path,sha256])=>({path,sha256})),generatorSha256:sha('tools/modular-program/stage5-closure-p90.mjs'),stageComplete:false,engineeringApproved:false,productionReleased:false};
fs.writeFileSync(out+'/register.json',JSON.stringify(result,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
fs.writeFileSync(out+'/index.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ขั้น5 บัญชีปิดงาน44ชุด</title><style>body{font:17px Tahoma,Arial;line-height:1.8;color:#132f53;max-width:1280px;margin:auto;padding:24px}.note{background:#fff0d7;padding:18px}details{margin:16px 0}summary{cursor:pointer}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccd2d8;padding:10px;text-align:left}a{color:#17568b}code{overflow-wrap:anywhere}</style><h1>ขั้น5/8 — บัญชีงานเพื่อปิดครบ44ชุด</h1><p class="note">ทบทวนทะเบียนครบ44/44ชุด =100%เฉพาะการทำบัญชี<br>ยังไม่มีชุดใดปิดผลส่งมอบครบทั้ง8หมวดP40 ไม่ใช่หมายความว่ายังไม่ได้ทำงาน และไม่ใช่ขั้น5เสร็จ100%</p><p>เก็บขอบเขตเดิม ไม่ย้ายงานแม่แบบไปขั้นSTAAD ไม่ขอข้อมูลเหล็กยกคอนกรีตซ้ำ: ใช้แนวเหล็กไม่ระบุขนาดและสมมติกำลังเพียงพอเพื่อพัฒนาตามP52. การอนุมัติวิศวกรรมและอนุมัติผลิตแยกจากความครบของงานเอกสาร</p><p><a href="register.json" download>ทะเบียนรวม JSON</a> · <a href="../foot-flex-p90/index.html">ผลตรวจขาฐาน P90</a></p><h2>ลำดับปิดงานภายในขั้น5</h2><table><tr><th>ลำดับ</th><th>กลุ่ม</th><th>ชุด</th><th>งานถัดไปที่ต้องปิด</th></tr>${groups.map(g=>`<tr><td>${g.order}</td><td>${esc(g.label)}</td><td>${g.setups.length}</td><td>${esc(g.next)}</td></tr>`).join('')}</table><p>หลังปิดงานตามกลุ่ม ต้องรวมระบบยก/พลิก/พยุง ซีล/tolerance และชุดแบบผลิต–QC ให้ตรงrevisionเดียวกันทุกชุด จึงนับปิดP40ได้ ไม่เพิ่มรอบคำนวณโดยไม่มี input ที่เปลี่ยนหรือเกณฑ์จบเฉพาะงาน</p><h2>ข้อกำหนดตรวจรับ8หมวด — ไม่ตัดลด</h2><ol>${requirements.map(([tag,title,gap])=>`<li><strong>${esc(tag+' '+title)}</strong> — ${esc(gap)}</li>`).join('')}</ol><h2>รายชุดและหลักฐานที่มี</h2>${records.map(r=>`<details><summary>${esc(r.typicalId)} · ${esc(r.geometryBasis)}</summary><p><a href="${r.id}.json" download>บัญชีรายชุด / แหล่งข้อมูลและhash</a></p><p>${esc(r.workstream.next)}</p><p>แผนยก: ${esc(r.liftingCoordinateReview)}${r.pressureDemandP90?' · มีผลตรวจแรงขาฐานP90':''}</p><ul>${r.observedSourceLimits.map(e=>`<li>${esc(e.message)} <small>(${esc(e.path)})</small></li>`).join('')}</ul><p>ทั้ง8หมวดยังคงเปิดในระดับผลส่งมอบรวม รายละเอียด geometry/demand ที่มีไม่ถูกนับเป็นการผ่านหมวดกำลังหรือระบบยก</p></details>`).join('')}<p>ใช้แม่แบบพื้นF2660ร่วมจริง4family slotsตามแหล่งgeometryเดียวกัน; ไม่รายงานเป็น4แม่แบบที่ต้องซื้อหรือ4ผลคำนวณอิสระ แม่แบบรูปคล้ายอื่นไม่ใช้ผลร่วมจนพิสูจน์ equivalence</p></html>`);
console.log({reviewed:44,workstreams:groups.map(g=>[g.id,g.setups.length]),completeP40Setups:0,pins:pins.size});
