import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir='output/mould-hardware-p41',read=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
const model=read('model.json'),calcs=read('engineering-review.json'),motion=read('removal-audit.json');
const names=fs.readdirSync(dir).filter(n=>n.endsWith('.png')).sort();
const title=['ภาพประกอบแม่แบบและคอนกรีต','ภาพแยกประกอบ','รายละเอียดโครงค้ำและล็อกฐาน','ตรวจโครงด้านใน','จับกรอบหน้าต่างและลำดับถอด','รูปทรงเหล็กเสริม ไม่ระบุขนาด','ชิ้นแม่แบบรายชิ้น 1','ชิ้นแม่แบบรายชิ้น 2','แนวคิดระบบยกและแรง','แปลนและรูปตัดมีมิติ'];
const schedule=model.items.map(p=>({id:p.id,name:p.name,group:p.group,quantity:1,envelopeMm:p.bounds.max.map((v,i)=>v-p.bounds.min[i]),modelStockSumKg:p.steelMassUpperBoundKg,details:p.details,status:'DEVELOPMENT_NOT_CUT_LIST'}));
fs.writeFileSync(dir+'/parts-register.json',JSON.stringify(schedule,null,2));
fs.writeFileSync(dir+'/README.md',`# TS-C-H15-LH-W01 — ชุดส่งตรวจ P41

**งานพัฒนา ยังไม่ใช่แบบผลิตที่ผ่านออกแบบครบ** ขั้น5/8ภาพรวมยัง50% ไม่เปลี่ยนภาพเก่าในเว็บ ไม่ถือว่าจบทุก Typical

[เปิดแกลเลอรีภายในแพ็กเกจ](index.html)

## ภาพ10แผ่น

${names.map((n,i)=>`${i+1}. [${title[i]}](${n}) · [SVG](${n.replace('.png','.svg')})`).join('\n')}

## รายละเอียดที่เพิ่มจากตัวอย่างเดิม

แม่แบบหลัก13ชุด, ตัวจับหน้าต่าง4ชิ้น, fastener116รายการ รวม133 object; โครงค้ำ18สถานี ใช้M24ฐาน72ตัวและM24รอยต่อ32ตัว แยกจากM12จับกรอบ4ตัวและชุดนัต/แหวนM20อีก8รายการ ไม่ใช่จำนวนแผ่นเหล็กที่จะตัดจริง

มีรูปค้ำ เสาตั้ง หน้าแปลน รูยึด โบลต์ หูยกเสนอ และตัวจับหน้าต่างอยู่ในโมเดล ไม่ใช่ภาพAI หูยกที่เห็นยังไม่ใช่อุปกรณ์ที่ยืนยันWLL; รูเกลียว/หัวโบลต์เป็นรูปย่อ และงานเชื่อม/mitreยังไม่ใช่รายละเอียดCNC

## รายการข้อมูล/ผลตรวจ

- [โมเดลเต็ม](model.json) / [ทะเบียนชิ้นส่วน](parts-register.json)
- [ผลตรวจประกอบ](collision-audit.json) / [ตรวจ28ช่วงการเลื่อน](removal-audit.json): ${motion.status} เฉพาะขอบเขตที่ระบุ ไม่รวมการถอนfastener/พื้นที่ประแจ/การจับด้วยเครน/แรงติดแบบ/ความคลาดเคลื่อนจริง
- [รายการคำนวณและสิ่งที่ยังไม่ผ่านตรวจ](ENGINEERING-REVIEW.md) / [ค่าคำนวณ](engineering-review.json)
- [รูปทรงเหล็ก RF01–05](reinforcement-shapes.json): ไม่กำหนดขนาด ระยะเรียง จำนวน ระยะหุ้ม หรือBBSตามผู้ใช้สั่ง

## ข้อจำกัดที่สำคัญ

งานออกแบบวิศวกรรมตามP40ยังไม่ครบ100%: whole-frame, weld/bolt/prying/thread, เสถียรภาพในแต่ละช่วง, พื้นโรงงาน และระบบยก/พลิกที่ผ่านการตรวจยังต้องปิดให้ครบก่อนผลิต ไม่ใช้ผลgeometryหรือbeam screeningแทนการรับรอง

มวลเหล็ก stock-sum ของโมเดลประมาณ${calcs.modelSteelStockSumKg.toFixed(1)}kg รวมฐานขนาด3550×4900แต่ไม่ใช่น้ำหนักเครื่องมือสำเร็จ: มีintersectionซ้ำของชิ้นเชื่อม และยังไม่รวมงานเชื่อม สี หรือrigging ฟิลด์ชื่อsteelMassUpperBoundKgในโมเดลหมายถึงstock-sumของcellsที่จำลองเท่านั้น ต้องตรวจมวลจริง/CGก่อนเลือกเครื่องยก

ฐานและโครงรอบนี้ยังไม่ปรับให้ประหยัดวัสดุ การไม่จำกัดเครนไม่ได้หมายถึงไม่ต้องตรวจฐานโรงงานหรือพิกัดเครนตามระยะทำงาน

ทุกไฟล์เป็นชุดreview PNG/SVG/JSON ไม่ใช่ native Revit/STAAD, DXFที่ผ่านRevit หรือใบอนุมัติผลิต ภาพทั้งหมดเป็นพิกัดท่าหล่อ ยกเว้นข้อความมิติช่องหน้าต่างที่ระบุท่าติดตั้ง
`);
fs.writeFileSync(dir+'/index.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TS-C Mould P41 — Review</title><style>body{font:18px Tahoma,sans-serif;margin:0;background:#eef2f6;color:#18324d}header,main{max-width:1300px;margin:auto;padding:24px}header{background:#17324e;color:white}h1{font-size:28px}aside{background:#fff0dc;padding:18px;border-left:5px solid #a35e20}section{background:white;padding:18px;margin:24px 0;border-radius:10px}img{width:100%;height:auto}a{color:#19588b}nav{display:flex;flex-wrap:wrap;gap:18px}</style><header><h1>TS-C-H15-LH-W01 · Steel mould P41</h1><p>ชุดภาพจากโมเดล · รูปทรงเหล็กไม่ระบุขนาด · ขั้น5/8 ภาพรวม50%</p></header><main><aside>ชุดส่งตรวจเพื่อพัฒนา ไม่ใช่แบบผลิตที่ผ่านคำนวณครบ ระบบยก/พื้นโรงงาน/การตรวจจุดต่อและเสถียรภาพยังไม่ปิด</aside><nav><a href="README.md">สรุปและข้อจำกัด</a><a href="ENGINEERING-REVIEW.md">รายการคำนวณ</a><a href="parts-register.json" download>ทะเบียนชิ้นส่วน</a><a href="model.json" download>โมเดลข้อมูล</a></nav>${names.map((n,i)=>`<section><h2>${i+1}. ${title[i]}</h2><a href="${n}"><img src="${n}" loading="lazy" alt="${title[i]}"></a><nav><a download href="${n}">ดาวน์โหลด PNG</a><a download href="${n.replace('.png','.svg')}">ดาวน์โหลด SVG</a></nav></section>`).join('')}</main></html>`);
fs.writeFileSync(dir+'/qa.json',JSON.stringify({revision:'P41-R00',automatedTests:{command:'node --test tools/modular-program/mould-hardware-p41.test.mjs',passed:7,total:7},visualReview:'10 PNG boards inspected; revised text and view direction checked',stage:5,stagePercentLegacyChecklist:50,stageComplete:false,productionReleased:false,engineeringApproved:false,scope:'One pilot only; no legacy website updates'},null,2));
const files=fs.readdirSync(dir).filter(n=>n!=='manifest.json').map(n=>{const b=fs.readFileSync(path.join(dir,n));return {file:n,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
fs.writeFileSync(dir+'/manifest.json',JSON.stringify({revision:'P41-R00',files,source:model.source,sourceSha256:model.sourceSha256,notProductionRelease:true},null,2));
for(const f of files)if(createHash('sha256').update(fs.readFileSync(path.join(dir,f.file))).digest('hex')!==f.sha256)throw Error('Hash mismatch '+f.file);
console.log(JSON.stringify({files:files.length,boards:names.length,manifestVerified:true}));
