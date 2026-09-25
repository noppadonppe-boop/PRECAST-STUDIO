import fs from 'node:fs';import assert from 'node:assert/strict';
import {read,sha,dir} from './connection-disposition-p92.mjs';
const old=read('output/stage5-library-p90/register.json'),r=read(dir+'/register.json'),assets=read(dir+'/assets.json');
assert.equal(r.groups.length,26);assert.equal(assets.files.length,18);assert.equal(assets.sourceRegisterSha256,sha(dir+'/register.json'));assert.equal(assets.generatorSha256,sha('tools/modular-program/connection-boards-p92.mjs'));
const pins=new Map(),pin=(path,h=sha(path))=>{assert.equal(sha(path),h,'Stale '+path);if(pins.has(path))assert.equal(pins.get(path),h,'Conflicting pin '+path);pins.set(path,h);};
for(const p of [...old.pins,...r.pins])pin(p.path,p.sha256);
for(const p of ['output/stage5-library-p90/register.json',dir+'/register.json',dir+'/assets.json','tools/modular-program/catalogue-supplement-p92.mjs'])pin(p);
const records=structuredClone(old.records);
for(const key of [...new Set(r.groups.map(g=>g.key))]){
 const m=read(`output/base-thread-candidate-p89/${key}.json`),record=records.find(s=>s.id===m.id);assert.ok(record);
 const paths=[...assets.files.filter(f=>f.key===key).map(f=>{pin(f.path,f.sha256);return f.path;}),`${dir}/${key}-checks.csv`,dir+'/INSPECTION_TH.md'];
 const files=paths.map((path,i)=>{pin(path);return {key:`P92-CONNECTION-${i+1}`,path,sha256:sha(path),bytes:fs.statSync(path).size};});
 assert.equal(files.length,5);record.groups.push({revision:'P92',label:'จุดยึดขาผนัง — จับคู่แรง P90 / รายละเอียดและตรวจรับเสนอ',role:'CONDITIONAL_COMPONENT_CHECK',files});
}
const out='output/stage5-library-p92';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/register.json',JSON.stringify({...old,revision:'P92',records,pins:[...pins].map(([path,sha256])=>({path,sha256})),candidateBasis:'P89 unchanged candidate. P92 paired static bolt/foot-bearing checks and nominal washer/inspection details are not reusable whole-connection qualification.',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
console.log({records:records.length,files:records.reduce((s,r)=>s+r.groups.reduce((n,g)=>n+g.files.length,0),0),pins:pins.size});
