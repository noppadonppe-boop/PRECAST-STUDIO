import fs from 'node:fs';import assert from 'node:assert/strict';import {sha} from './base-thread-candidate-p89.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),old=read('output/stage5-library-p88/register.json'),r=read('output/base-thread-candidate-p89/register.json');
const pins=new Map(old.pins.map(i=>[i.path,i.sha256])),pin=(p,h=sha(p))=>{assert.equal(sha(p),h,'Stale '+p);pins.set(p,h);};
for(const p of ['output/stage5-library-p88/register.json','output/base-thread-candidate-p89/register.json','knowledge/modular-program-r02/thread-study-p89.json','tools/modular-program/base-thread-candidate-p89.mjs','tools/modular-program/base-thread-boards-p89.mjs','tools/modular-program/catalogue-supplement-p89.mjs'])pin(p);
assert.equal(r.generatorSha256,sha('tools/modular-program/base-thread-candidate-p89.mjs'));assert.equal(r.boardGeneratorSha256,sha('tools/modular-program/base-thread-boards-p89.mjs'));
const records=structuredClone(old.records);
for(const item of r.records){
 const record=records.find(v=>v.id===item.id);assert.ok(record);assert.equal(item.geometryRole,'UNADOPTED_CANDIDATE');
 for(const i of item.inputSnapshots)pin(i.path,i.sha256);
 const files=item.files.map((f,i)=>{pin(f.path,f.sha256);return {key:`P89-CANDIDATE-${i+1}`,...f};});
 record.groups.push({revision:'P89',label:'ทางเลือก M20×60 / แหวน21×37×3 / เกลียวฐานทะลุ — ไม่สืบทอดผลแรงเดิม',role:'UNADOPTED_CANDIDATE',files});
}
for(const [p,h]of pins)assert.equal(sha(p),h,'Stale inherited pin '+p);
fs.mkdirSync('output/stage5-library-p89',{recursive:true});
fs.writeFileSync('output/stage5-library-p89/register.json',JSON.stringify({...old,revision:'P89',records,pins:[...pins].map(([path,sha256])=>({path,sha256})),candidateBasis:'P89 is a proposed hardware geometry, NOT a replacement for P85 analysed input. P86/P88 not revalidated. P88 normal pitch correction: M01=250, M03=240 mm.'},null,2));
console.log({records:records.length,files:records.reduce((s,r)=>s+r.groups.reduce((n,g)=>n+g.files.length,0),0),pins:pins.size});
