import fs from 'node:fs';
import assert from 'node:assert/strict';
import {families,out} from './table-lock-base-p97.mjs';
import {read,sha} from './table-weld-p93.mjs';
const records=families.map(family=>{
 const r=read(`${out}/${family}.json`);assert.equal(r.status,'BASE_LOADPATH_CANDIDATE');assert.equal(r.cuts.length,52);assert.equal(r.welds.length,136);assert.equal(r.geometry.motion.steps.length,44);assert.ok(r.geometry.motion.steps.every(s=>!s.hits.length));assert.deepEqual(r.geometry.initialCollisions,[]);
 return {family,sourceSetups:r.sourceSetups,files:['json','svg','png','csv'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`;return {path,sha256:sha(path)};})};
});
const pins=['tools/modular-program/table-lock-base-p97.mjs','tools/modular-program/table-lock-base-boards-p97.mjs','tools/modular-program/table-lock-base-assets-p97.mjs',`${out}/register.json`].map(path=>({path,sha256:sha(path)}));
fs.writeFileSync(`${out}/assets.json`,JSON.stringify({revision:'P97',records,pins,commonFiles:[{path:`${out}/DETAIL_TH.md`,sha256:sha(`${out}/DETAIL_TH.md`)}],status:'BASE_LOADPATH_CANDIDATE',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>P97 ฐานรองจุดล็อก</title><style>body{max-width:1200px;margin:32px auto;padding:0 24px;font:18px system-ui;color:#123456;background:#f4f7fa}img{width:100%}p{line-height:1.65}section{margin:40px 0}a{color:#174f80}</style><h1>P97 — ฐานรองจุดล็อกโต๊ะ / ฐานเปล่าขณะยก</h1><p>6ขนาด/9setup. ชิ้นใหม่หรือทดแทน52ชิ้นต่อโต๊ะ ไม่ใช่ BOM ทั้งโต๊ะ. ไม่เปลี่ยนช่องหล่อ และไม่อนุมัติผลิตหรือยก</p><p><a href="DETAIL_TH.md">รายละเอียดภาษาไทยและข้อจำกัด</a></p>${families.map(f=>`<section><h2>${f}</h2><a href="${f}-board.png"><img src="${f}-board.png" alt="${f} ฐานรองจุดล็อก"></a><p><a download href="${f}-board.png">PNG</a> · <a download href="${f}-board.svg">SVG</a> · <a download href="${f}.json">JSON geometry/demand</a> · <a download href="${f}-parts.csv">บัญชีชิ้นเพิ่ม/ทดแทน</a></p></section>`).join('')}<p>จุดรับฐานในภาพไม่ใช่หูยก. ขั้น5/8ยังไม่ครบP40ทั้งหมด</p></html>`);
console.log('P97 assets:6sizes/9setups/45references');
