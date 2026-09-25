import fs from 'node:fs';
import path from 'node:path';
import {root,hash} from './stage5-p38.mjs';
const dest=path.join(root,'output/stage5-library-p53');fs.mkdirSync(dest,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p))),reg=read('output/stage5-moulds-p38/register.json');
const mappings=new Map();
for(const [base,names]of [['floor',['F2660','NF02']],['table',['NW01','NW02','NR-S','NR-N']]])for(const name of names){
 const rev=base==='floor'?'p46':'p51',source=`output/${base}-mould-${rev}/${name}/model.json`,m=read(source);
 const files=[source,`output/${base}-lock-${base==='floor'?'p47':'p51'}/${name}/01-LOCKS.png`,`output/${base}-lock-${base==='floor'?'p47':'p51'}/${name}/model.json`,`output/${base}-lock-${base==='floor'?'p47':'p51'}/${name}/audit.json`,`output/${base}-demand-${base==='floor'?'p48':'p51'}/${name}.json`,`output/${base}-connections-${base==='floor'?'p49':'p51'}/${name}.json`,`output/${base}-workpack-${base==='floor'?'p50':'p51'}/${name}-parts.json`,`output/${base}-workpack-${base==='floor'?'p50':'p51'}/${name}-DRILLING.png`];
 for(const s of m.sources)mappings.set(s.id,files);
}
const pilot='MF-C-H15-LH-W01-P05-P38';
mappings.set(pilot,['output/mould-hardware-p41/model.json','output/mould-hardware-p41/engineering-review.json',...fs.readdirSync(path.join(root,'output/mould-hardware-p41')).filter(n=>/^\d.*\.png$/.test(n)&&!n.startsWith('09-')).map(n=>'output/mould-hardware-p41/'+n)]);
const records=reg.setups.map(s=>({id:s.id,typicalId:s.typicalId,kind:s.kind,hardwareStatus:mappings.has(s.id)?'PARTIAL_DEVELOPMENT':'NOT_MODELLED',files:(mappings.get(s.id)??[]).map((p,i)=>({key:`P53-DEV-${String(i+1).padStart(2,'0')}`,path:p,sha256:hash(path.join(root,p))})),completeP40Design:false}));
fs.writeFileSync(path.join(dest,'register.json'),JSON.stringify({revision:'P53',stage:5,records,hardwareDevelopmentSetups:mappings.size,totalSetups:44,engineeringApproved:false,productionReleased:false},null,2));
console.log({mapped:mappings.size,files:records.reduce((s,r)=>s+r.files.length,0)});
