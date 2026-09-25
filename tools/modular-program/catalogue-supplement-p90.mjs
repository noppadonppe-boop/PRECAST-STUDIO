import fs from 'node:fs';import assert from 'node:assert/strict';import {read,sha,dir} from './foot-flex-audit-p90.mjs';
const old=read('output/stage5-library-p89/register.json'),r=read(dir+'/register.json'),audit=read(dir+'/audit.json'),closure=read('output/stage5-closure-p90/register.json');
assert.equal(audit.refinementAcceptedGroups,24);assert.ok(audit.sensitivity.every(r=>r.refinementAccepted));assert.equal(closure.records.length,44);
const pins=new Map(old.pins.map(i=>[i.path,i.sha256])),pin=(p,h=sha(p))=>{assert.equal(sha(p),h,'Stale '+p);pins.set(p,h);};
for(const p of ['output/stage5-library-p89/register.json',dir+'/register.json',dir+'/audit.json',dir+'/benchmarks.json',dir+'/batch-plan.json',dir+'/refinement-plan.json','tools/modular-program/refine_foot_flex_p90.py','knowledge/modular-program-r02/foot-study-plan-p90.json','tools/modular-program/foot-flex-audit-p90.mjs','tools/modular-program/foot-flex-report-p90.mjs','tools/modular-program/catalogue-supplement-p90.mjs','output/stage5-closure-p90/register.json','tools/modular-program/stage5-closure-p90.mjs'])pin(p);
for(const [p,h] of Object.entries(read(dir+'/benchmarks.json').sourceHashes))pin(p,h);
assert.equal(r.reportGeneratorSha256,sha('tools/modular-program/foot-flex-report-p90.mjs'));assert.equal(r.auditSha256,sha(dir+'/audit.json'));
const records=structuredClone(old.records);
for(const item of r.records){
 const candidate=read(`output/base-thread-candidate-p89/${item.key}.json`),record=records.find(v=>v.id===candidate.id);assert.ok(record);
 const files=item.files.map((f,i)=>{pin(f.path,f.sha256);if(/-h[\d.]+-r18\.5-L\d+\.json$/.test(f.path)){const m=read(f.path);for(const input of m.inputs)pin(input.path.replaceAll('\\','/'),input.sha256);}return {key:`P90-DEMAND-${i+1}`,...f};});
 record.groups.push({revision:'P90',label:'ผลแรงขาฐานแบบทางเลือก P89 — แหวน Ø37 / ไม่ใช่กำลังรับได้',role:'ANALYSIS_STUDY',files});
}
for(const i of closure.pins)pin(i.path,i.sha256);
for(const item of closure.records)pin(`output/stage5-closure-p90/${item.id}.json`);
for(const [p,h]of pins)assert.equal(sha(p),h,'Stale inherited pin '+p);
fs.mkdirSync('output/stage5-library-p90',{recursive:true});
fs.writeFileSync('output/stage5-library-p90/register.json',JSON.stringify({...old,revision:'P90',records,pins:[...pins].map(([path,sha256])=>({path,sha256})),candidateBasis:'P89 remains an unadopted candidate. P90 validates specified W01 foot demand studies only; no P88/full-connection capacity inheritance.',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
console.log({records:records.length,files:records.reduce((s,r)=>s+r.groups.reduce((n,g)=>n+g.files.length,0),0),pins:pins.size});
