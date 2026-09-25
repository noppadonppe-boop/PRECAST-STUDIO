import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const out='output/stage5-update-p51';fs.mkdirSync(out,{recursive:true});
const folders=['floor-connections-p49','floor-workpack-p50','table-mould-p51','table-lock-p51','table-demand-p51','table-connections-p51','table-workpack-p51'];
for(const f of folders)fs.cpSync(`output/${f}`,`${out}/${f}`,{recursive:true});
const tests=['elastic-beam-p48','floor-demand-p48','continuous-beam-p49','floor-workpack-p50','table-p51'].map(s=>`tools/modular-program/${s}.test.mjs`);
const testOutput=execFileSync(process.execPath,['--test',...tests],{encoding:'utf8'});fs.writeFileSync(`${out}/test-results.txt`,testOutput);
const register=JSON.parse(fs.readFileSync('output/stage5-moulds-p38/register.json')),mapped=new Map();
for(const f of ['F2660','NF02']){const m=JSON.parse(fs.readFileSync(`output/floor-mould-p46/${f}/model.json`));for(const s of m.sources)mapped.set(s.id,`P47/P48/P49/P50-${f}`);}
for(const f of ['NW01','NW02','NR-S','NR-N']){const m=JSON.parse(fs.readFileSync(`output/table-mould-p51/${f}/model.json`));for(const s of m.sources)mapped.set(s.id,`P51-${f}`);}
mapped.set('MF-C-H15-LH-W01-P05-P38','P41');
const coverage=register.setups.map(s=>({id:s.id,typicalId:s.typicalId,kind:s.kind,hardwareDevelopmentPackage:mapped.get(s.id)||null,hardwareDevelopmentStatus:mapped.has(s.id)?'PARTIAL':'NOT_MODELLED',completeP40Design:false,engineeringApproved:false,productionReleased:false}));
fs.writeFileSync(`${out}/coverage.json`,JSON.stringify({stage:5,legacyChecklistPercent:50,totalSetups:44,hardwareDevelopmentCoverage:mapped.size,completeP40Setups:0,scope:'Coverage only; not percent complete and not capacity verification',setups:coverage},null,2));
let md='# ขั้น5 — ชุดงานต่อเนื่อง P49–P51\n\nยังไม่ครบ100%ตามขอบเขตP40 — ไม่ใช่แบบพร้อมผลิต\n\n## เปิดงาน\n\n';
md+='- [ผลแรงจุดล็อกพื้นเดิม](floor-connections-p49/README.md)\n- [บัญชีชิ้นและผังเจาะพื้นเดิม](floor-workpack-p50/README.md)\n- [บัญชีชิ้นและผังเจาะโหนด4ขนาด](table-workpack-p51/README.md)\n- [ผลแรงแนวดิ่งโหนด](table-demand-p51/README.md)\n- [ผลแรงจุดล็อกโหนด](table-connections-p51/README.md)\n- [ผลทดสอบ](test-results.txt)\n\n';
for(const f of ['NW01','NW02','NR-S','NR-N'])md+=`- ${f}: [3D โครงแม่แบบ](table-mould-p51/${f}/01-STRUCTURE.png) / [3D จุดล็อก](table-lock-p51/${f}/01-LOCKS.png) / [ผังเจาะ](table-workpack-p51/${f}-DRILLING.png)\n`;
md+='\n## สถานะ\n\nเพิ่ม4setupโหนด ทำให้มีhardwareระดับพัฒนาครอบคลุม10/44setup; อีก34setupยังไม่จำลองhardware. ไม่มีsetupใดครบP40ทุกข้อ. 50%เป็นตัวเลขอ้างอิงchecklistเดิม ไม่ใช่เปอร์เซ็นต์พร้อมผลิต. ไม่ได้ข้ามไปขั้น6หรือเปลี่ยนภาพเดิมในเว็บ.\n\nP51ตรวจทางเคลื่อนnominal160ช่วงและพื้นที่ประแจ48ตำแหน่ง, บัญชีวัสดุตรงปริมาตรsolidหลังหักรู. ผลแรงทั้งหมดเป็นกรณีศึกษา elastic; ยังต้องตรวจ connection/contact/weld/strength/stability/rigging/floorและรายละเอียดอุปกรณ์จริง.\n\nงานยกคอนกรีตยังปิดผลไม่ได้จากรูปทรงเหล็กเสริมอย่างเดียว ต้องมีขนาดเหล็ก กำลังคอนกรีตตอนยกและระบบพุก. ไม่สมมติข้อมูลเหล่านี้เป็นค่ารับรองเพื่อให้ครบ100%.\n\nJSON paths อ้างโครงการเดิมเพื่อtraceability; ไม่ใช่standalone build. ภาพ/รายงานในแพ็กเกจเปิดได้โดยไม่รันสคริปต์. ไม่รวมมาตรฐานลิขสิทธิ์หรือข้อมูลรับรองที่ไม่มี.\n';
fs.writeFileSync(`${out}/README.md`,md);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk(out).filter(p=>!p.endsWith('manifest.json')).sort().map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
fs.writeFileSync(`${out}/manifest.json`,JSON.stringify({revision:'P51',files,engineeringApproved:false,productionReleased:false},null,2));console.log(JSON.stringify({files:files.length,hardwareCoverage:mapped.size,totalSetups:44,tests:testOutput.split('\n').filter(x=>/tests |pass |fail /.test(x))}));
