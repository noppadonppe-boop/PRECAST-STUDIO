import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const old=read('output/stage5-library-p68/register.json'),base=read('output/abd-base-pattern-p85/register.json'),audit=read('output/foot-flex-p86/audit.json');
assert.equal(audit.refinementAcceptedGroups,24);assert.equal(audit.stageComplete,false);
const pins=new Map(old.pins.map(p=>[p.path,p.sha256]));
function pin(p,h=sha(p)){assert.equal(sha(p),h,'Stale source '+p);pins.set(p,h);}
function sources(m){for(const key of ['source','input','overlayInput','inputSnapshot','inputSnapshots','inputs']){
 const list=Array.isArray(m[key])?m[key]:[m[key]];for(const p of list)if(p?.path&&p.sha256)pin(p.path,p.sha256);
}}
for(const p of ['tools/modular-program/catalogue-supplement-p87.mjs','output/stage5-library-p68/register.json','output/abd-base-pattern-p85/register.json','output/foot-flex-p86/audit.json','output/foot-flex-p86/benchmarks.json','output/foot-flex-p86/plate-benchmark.json','output/foot-flex-p86/batch-plan.json','output/foot-flex-p86/refinement-plan.json'])pin(p);
for(const [p,h] of Object.entries(read('output/foot-flex-p86/benchmarks.json').sourceHashes))pin(p,h);
pin('tools/modular-program/plate_bench_p86.py',read('output/foot-flex-p86/plate-benchmark.json').sourceSha256);
const records=structuredClone(old.records);
for(const row of base.records){
 const rec=records.find(r=>r.id===row.id);assert.ok(rec);for(const g of rec.groups)g.role='HISTORICAL_SUBSYSTEM';
 function group(revision,label,role,folder,names){
  const files=names.map((name,i)=>{const p='output/'+folder+'/'+name;pin(p);if(name.endsWith('.json'))sources(read(p));return {key:`P87-${revision}-${String(i+1).padStart(2,'0')}`,path:p,sha256:sha(p)};});
  rec.groups.push({revision,label,role,files});
 }
 const k=row.key;
 group('P71','ชุดแผ่นค้ำผนัง/หัวท้าย/หลังคา — ใช้ส่วนเพิ่มครั้งเดียว','CURRENT_COMPONENT','abd-roof-web-p71',[k+'.json',k+'.png',k+'.svg',k+'-stock.csv']);
 group('P74','ฮาร์ดแวร์จุดล็อกรอยต่อและทางถอด','CURRENT_COMPONENT','seam-hardware-p74',[k+'.json',k+'.png',k+'.svg']);
 group('P80','ซี่ขอบและส่วนต่อโครงผนัง — ข้อมูล geometry','CURRENT_COMPONENT','abd-edge-ribs-p80',[k+'.json']);
 group('P85','ตำแหน่งสลักฐานล่าสุด / รูเจาะ / โมเดลและมวล','CURRENT_BASE','abd-base-pattern-p85',[k+'.json',k+'-board.png',k+'-board.svg',k+'-bores.csv']);
 if(k.endsWith('-W01')){
  const rows=audit.rows.filter(r=>r.key===k);assert.equal(rows.length,4);
  const names=rows.flatMap(r=>[r.id+'-board.png',r.id+'-board.svg',...(r.initialFile?[r.initialFile]:[]),r.coarseFile,r.fineFile]);
  group('P86','แรงดึงสลักและการดัดขาฐาน — กรณีศึกษา ไม่ใช่กำลังรับได้','ANALYSIS_STUDY','foot-flex-p86',names);
 }
}
for(const r of records)for(const g of r.groups)for(const f of g.files)pin(f.path,f.sha256);
const result={revision:'P87',stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false,assemblyBasis:'P85 base + P71 web + P74 seam + P80 edge stock once each; P85 sequence. P66/P67 retained only as history.',analysisBasis:'P86 W01 one-way elastic foot/contact baseline only. No S00 extrapolation or production capacity claim.',records,pins:[...pins].map(([path,sha256])=>({path,sha256}))};
fs.mkdirSync('output/stage5-library-p87',{recursive:true});fs.writeFileSync('output/stage5-library-p87/register.json',JSON.stringify(result,null,2));
console.log({setups:records.length,files:records.reduce((s,r)=>s+r.groups.reduce((n,g)=>n+g.files.length,0),0),pins:pins.size});
