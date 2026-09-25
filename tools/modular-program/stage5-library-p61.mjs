import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,hash} from './stage5-p38.mjs';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const old=read('output/stage5-library-p53/register.json');
const records=structuredClone(old.records),pins=[];
function pin(p){pins.push({path:p,sha256:hash(path.join(root,p))});}
function set(id,revision,files,source,status='PARTIAL_DEVELOPMENT'){
 const r=records.find(r=>r.id===id);assert.ok(r,id);
 if(source){assert.equal(hash(path.join(root,source.path)),source.sha256);pins.push(source);}
 Object.assign(r,{hardwareStatus:status,sourceRevision:revision,files:files.map((p,i)=>({key:`P61-DEV-${String(i+1).padStart(2,'0')}`,path:p,sha256:hash(path.join(root,p))})),completeP40Design:false});
}
pin('output/stage5-library-p53/register.json');
for(const r of records)r.sourceRevision=r.files.length?'P53':null;
const np='output/notched-mould-p54/register.json';pin(np);
for(const r of read(np).records){const d=`output/notched-mould-p54/${r.side}`;set(r.id,'P54',[`${d}/model.json`,`${d}/01-ASSEMBLY.png`,`${d}/01-ASSEMBLY.svg`,`${d}/02-PLAN-SEQUENCE.png`,`${d}/02-PLAN-SEQUENCE.svg`,`output/notched-demand-p54/${r.side}.json`],r.source);}
for(const [folder,rev,status] of [['cap-hardware-p56','P56','PARTIAL_DEVELOPMENT'],['end-hardware-p58','P58','PARTIAL_DEVELOPMENT'],['c-shell-p59','P59','PARTIAL_DEVELOPMENT'],['abd-shell-skins-p60','P60','CONTACT_SKINS_AND_LOADS_ONLY']]){
 const rp=`output/${folder}/register.json`;pin(rp);
 for(const r of read(rp).records){const paths=r.files.map(f=>{const p=`output/${folder}/${f.name}`;assert.equal(hash(path.join(root,p)),f.sha256);return p;});set(r.id,rev,paths,r.source,status);}
}
assert.equal(records.length,44);assert.equal(new Set(records.map(r=>r.id)).size,44);assert.ok(records.every(r=>r.files.length));
const hardwareDevelopmentSetups=records.filter(r=>r.hardwareStatus==='PARTIAL_DEVELOPMENT').length;assert.equal(hardwareDevelopmentSetups,32);
const result={revision:'P61',stage:5,records,pins,hardwareDevelopmentSetups,contactOnlySetups:12,totalSetups:44,stageComplete:false,stageCompletionPercent:null,engineeringApproved:false,productionReleased:false};
const dest=path.join(root,'output/stage5-library-p61');fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'register.json'),JSON.stringify(result,null,2));
console.log({revision:'P61',setups:44,hardwareDevelopmentSetups,contactOnlySetups:12,files:records.reduce((n,r)=>n+r.files.length,0)});
