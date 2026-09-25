import fs from 'node:fs';
import assert from 'node:assert/strict';
import {families,out} from './table-seal-p95.mjs';
import {read,sha} from './table-weld-p93.mjs';
const records=[];
for(const family of families){
 const r=read(`${out}/${family}.json`),[L,W,H]=r.cavityMm;
 assert.equal(r.motion.steps.length,44);assert.ok(r.motion.steps.every(s=>!s.hits.length));assert.deepEqual(r.audit.initialCollisions,[]);
 const rows=r.baseCutPieces.map((p,i)=>[p.tag,'SEAL-BASE',p.role,1,i<4?(i<2?L:W):'',3,2,p.innerRadiusMm??'',p.outerRadiusMm??'','']);
 rows.push(...r.seals.slice(1).map(p=>[p.tag,p.owner,'VERTICAL_TAPER_FOOT',1,H,3,2,'','',p.footWidthMm]));assert.equal(rows.length,12);
 const csv=`${out}/${family}-parts.csv`;
 fs.writeFileSync(csv,['tag,assembly_or_parent,shape,quantity,length_mm,free_width_mm,free_thickness_mm,inner_radius_mm,outer_radius_mm,foot_width_mm',...rows.map(r=>r.join(','))].join('\n')+'\n');
 records.push({family,sourceSetups:read(r.source.path).sourceSetups,files:['json','svg','png','csv'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`;return {path,sha256:sha(path)};})});
}
const pins=['tools/modular-program/table-seal-p95.mjs','tools/modular-program/convex-clip-p95.mjs','tools/modular-program/table-seal-boards-p95.mjs','tools/modular-program/table-seal-assets-p95.mjs',`${out}/register.json`].map(path=>({path,sha256:sha(path)}));
fs.writeFileSync(`${out}/boards.json`,JSON.stringify({revision:'P95',records:records.map(r=>({family:r.family,files:r.files.filter(f=>!f.path.endsWith('.csv'))})),status:'GENERATED_CANDIDATE_SEE_QA_RECORD',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/assets.json`,JSON.stringify({revision:'P95',records,pins,commonFiles:[{path:`${out}/DETAIL_TH.md`,sha256:sha(`${out}/DETAIL_TH.md`)}],status:'SEAL_LAYOUT_CANDIDATE',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>P95 ซีลแม่แบบโต๊ะ</title><style>body{max-width:1200px;margin:32px auto;padding:0 24px;font:18px system-ui;color:#123456;background:#f4f7fa}img{width:100%}p{line-height:1.65}section{margin:40px 0}a{color:#174f80}</style><h1>P95 — ร่องและซีลแม่แบบโต๊ะ</h1><p>6ขนาด/9setup. 12ชิ้นยางตัดเป็น5ชุดติดตั้งต่อโต๊ะ ช่องหล่อเดิมไม่เปลี่ยน. ตรวจมิติและทางถอดnominal ไม่ใช่ผลทดสอบกันรั่วหรือการอนุมัติผลิต</p><p><a href="DETAIL_TH.md">รายละเอียดภาษาไทยและข้อจำกัด</a></p>${families.map(f=>`<section><h2>${f}</h2><a href="${f}-board.png"><img src="${f}-board.png" alt="${f} ร่องซีลและการประกอบ"></a><p><a download href="${f}-board.png">PNG</a> · <a download href="${f}-board.svg">SVG</a> · <a download href="${f}.json">JSON geometry</a> · <a download href="${f}-parts.csv">รายการชิ้นยาง12ชิ้น</a></p></section>`).join('')}<p>ขั้น5/8ยังไม่ครบทั้งหมด. แนวเหล็กคอนกรีตไม่มีขนาดตามP52. แรงปิด/วัสดุ/การกันรั่ว/ฐานและระบบยกยังต้องตรวจ</p></html>`);
console.log('P95 assets:6 sizes /9 setups /45 references');
