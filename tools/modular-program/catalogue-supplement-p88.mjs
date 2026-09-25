import fs from 'node:fs';import assert from 'node:assert/strict';import {sha} from './bolt-screen-p88.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),old=read('output/stage5-library-p87/register.json'),r=read('output/bolt-screen-p88/register.json');
const pins=new Map(old.pins.map(i=>[i.path,i.sha256]));
const pin=(p,h=sha(p))=>{assert.equal(sha(p),h,'Stale input '+p);pins.set(p,h);};
for(const p of ['output/stage5-library-p87/register.json','output/bolt-screen-p88/register.json','tools/modular-program/bolt-screen-p88.mjs','tools/modular-program/bolt-screen-report-p88.mjs','tools/modular-program/catalogue-supplement-p88.mjs'])pin(p);
pin(r.source.localPath,r.source.sha256);assert.equal(r.generatorSha256,sha('tools/modular-program/bolt-screen-p88.mjs'));
const records=structuredClone(old.records);
for(const key of new Set(r.groups.map(g=>g.key))){
 const groups=r.groups.filter(g=>g.key===key),record=records.find(v=>v.groups.some(g=>g.files.some(f=>f.path===`output/abd-base-pattern-p85/${key}.json`)));
 assert.ok(record);assert.equal(groups.length,4);
 for(const g of groups)for(const i of g.inputSnapshots)pin(i.path,i.sha256);
 const names=groups.flatMap(g=>[g.id+'.png',g.id+'.svg',g.id+'.json']);
 const files=names.map((name,i)=>{const p='output/bolt-screen-p88/'+name;pin(p);return {key:`P88-STATIC-${i+1}`,path:p,sha256:sha(p)};});
 // Keep each downloadable force dataset confined to its setup, not a global CSV under a per-setup ACL.
 const csv=`output/bolt-screen-p88/${key}-checks.csv`,lines=fs.readFileSync('output/bolt-screen-p88/checks.csv','utf8').trimEnd().split('\n');
 fs.writeFileSync(csv,[lines[0],...lines.slice(1).filter(l=>l.startsWith(key+'-'))].join('\n')+'\n');
 pin(csv);files.push({key:'P88-STATIC-CSV',path:csv,sha256:sha(csv)});
 record.groups.push({revision:'P88',label:'ตรวจตัวโบลต์/แรงกดรูขาแบบมีเงื่อนไข — ยังไม่ผ่านจุดยึดทั้งชุด',role:'CONDITIONAL_COMPONENT_CHECK',files});
}
for(const [p,h] of pins)assert.equal(sha(p),h,'Stale pin '+p);
fs.mkdirSync('output/stage5-library-p88',{recursive:true});
fs.writeFileSync('output/stage5-library-p88/register.json',JSON.stringify({...old,revision:'P88',records,pins:[...pins].map(([path,sha256])=>({path,sha256})),componentCheckBasis:'P88 static bolt-body / local foot-bearing trials; not thread/washer/fatigue or full-connection approval.'},null,2));
console.log({records:records.length,files:records.reduce((s,r)=>s+r.groups.reduce((n,g)=>n+g.files.length,0),0),pins:pins.size});
