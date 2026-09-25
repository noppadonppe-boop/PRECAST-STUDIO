import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir='output/mould-style-p43';
const jobs=JSON.parse(fs.readFileSync(`${dir}/jobs.json`,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const records=jobs.filter(j=>fs.existsSync(j.output)).map(j=>({id:j.id,typicalId:j.typicalId,path:j.output,sha256:hash(j.output),bytes:fs.statSync(j.output).size,source:j.source,sourceSha256:j.sourceSha256,status:'AI_PRESENTATION_REVIEW',engineeringApproved:false,productionReleased:false}));
if(records.length!==44)throw Error(`Only ${records.length}/44 images; package not complete`);
for(const j of jobs)if(hash(j.source)!==j.sourceSha256||hash(j.style)!==j.styleSha256)throw Error(`Stale input: ${j.id}`);
for(const j of jobs){j.status='GENERATED_VISUALLY_REVIEWED_PRESENTATION_ONLY';j.outputSha256=hash(j.output);}
fs.writeFileSync(`${dir}/jobs.json`,JSON.stringify(jobs,null,2));
fs.writeFileSync(`${dir}/manifest.json`,JSON.stringify({revision:'P43',count:records.length,stage:5,engineeringProgressPercent:50,records},null,2));
fs.writeFileSync(`${dir}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>P43 · Mould image library</title><style>body{font:16px system-ui;background:#f4f6fa;color:#102648;margin:30px}h1{font-size:30px}input{padding:14px;width:min(600px,90%);margin:20px 0}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}article{background:white;border:1px solid #d5dce6;border-radius:12px;padding:16px}img{width:100%}a{color:#174f88}small{display:block;margin:8px 0}</style><h1>PRECAST MOULD · P43</h1><p>ภาพนำเสนอ 44 รายการ · ขั้นที่ 5/8 · งานวิศวกรรม 50%</p><p>สีน้ำเงิน: โครงรองรับ · เงิน: ผิวสัมผัส · เหลือง: insert · เทา: คอนกรีต</p><p>ภาพ AI สำหรับนำเสนอ ไม่ใช่แบบผลิตหรือรับรองการยก — มิติและรูปทรงให้ยึดโมเดลต้นทาง ชิ้นที่ไม่มีแบบอุปกรณ์แสดงเฉพาะผิวสัมผัส</p><input id="q" placeholder="ค้นหา Tag / Type / อาคาร"><main>${jobs.map(j=>`<article data-search="${esc([j.id,j.typicalId,j.kind,...j.usedBy.map(x=>x.productId)].join(' ').toLowerCase())}"><h2>${esc(j.typicalId)}</h2><a href="${path.basename(j.output)}"><img loading="lazy" src="${path.basename(j.output)}" alt="${esc(j.typicalId)}"></a><small>${esc(j.kind)}</small><a download href="${path.basename(j.output)}">ดาวน์โหลด PNG</a></article>`).join('')}</main><script>document.querySelector('#q').addEventListener('input',e=>{for(const a of document.querySelectorAll('article'))a.hidden=!a.dataset.search.includes(e.target.value.toLowerCase().trim())})</script></html>`);
console.log({count:records.length,index:`${dir}/index.html`});
