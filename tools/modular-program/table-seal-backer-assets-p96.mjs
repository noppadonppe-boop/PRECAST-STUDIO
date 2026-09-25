import fs from 'node:fs';
import assert from 'node:assert/strict';
import {families,out} from './table-seal-backer-p96.mjs';
import {read,sha} from './table-weld-p93.mjs';
const records=families.map(family=>{
 const r=read(`${out}/${family}.json`);assert.equal(r.status,'BACKER_LAYOUT_CANDIDATE');assert.equal(r.motion.steps.length,44);assert.ok(r.motion.steps.every(s=>!s.hits.length));assert.deepEqual(r.weldClashes,[]);
 return {family,sourceSetups:read(`output/table-channel-p94/${family}.json`).sourceSetups,files:['json','svg','png','csv'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`;return {path,sha256:sha(path)};})};
});
const pins=['tools/modular-program/table-seal-backer-p96.mjs','tools/modular-program/table-seal-backer-boards-p96.mjs','tools/modular-program/table-seal-backer-assets-p96.mjs',`${out}/register.json`].map(path=>({path,sha256:sha(path)}));
fs.writeFileSync(`${out}/assets.json`,JSON.stringify({revision:'P96',records,pins,commonFiles:[{path:`${out}/DETAIL_TH.md`,sha256:sha(`${out}/DETAIL_TH.md`)}],status:'BACKER_LAYOUT_CANDIDATE',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/boards.json`,JSON.stringify({revision:'P96',records,status:'GENERATED_CANDIDATE_SEE_QA_RECORD',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>P96 แถบรองซีล</title><style>body{max-width:1200px;margin:32px auto;padding:0 24px;font:18px system-ui;color:#123456;background:#f4f7fa}img{width:100%}p{line-height:1.65}section{margin:40px 0}a{color:#174f80}</style><h1>P96 — แถบรองซีลใต้โต๊ะ</h1><p>6ขนาด/9setup. เป็นชิ้นตัดระหว่างซี่โครง ไม่สอดคานผ่านRHS. ไม่เปลี่ยนช่องหล่อ. กรณีแรงกดซีล0.10MPaเป็นขอบเขตทดลองไม่ใช่ผลวัสดุหรือกำลังรับรอง</p><p><a href="DETAIL_TH.md">รายละเอียดภาษาไทย</a></p>${families.map(f=>`<section><h2>${f}</h2><a href="${f}-board.png"><img src="${f}-board.png" alt="${f} แถบรองซีล"></a><p><a download href="${f}-board.png">PNG</a> · <a download href="${f}-board.svg">SVG</a> · <a download href="${f}.json">JSON geometry/demand</a> · <a download href="${f}-parts.csv">บัญชีแถบรอง</a></p></section>`).join('')}<p>ขั้น5/8ยังไม่ครบทั้งหมด. ไม่อนุมัติผลิต เท หรือยก</p></html>`);
console.log('P96 assets:6sizes/9setups/45references');
