import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {root,loft,swept,properties as polyProperties} from './cap-geometry-p55.mjs';import {cellFaces} from './prism-tools-p54.mjs';import {half,area} from './prism-bore-p66.mjs';import {keys} from './abd-base-lock-p66.mjs';export {keys};
export function sections(){const tri=[[6,30],[356,30],[6,650]],clip=(p,n,d)=>half(p,n,d);return [clip(tri,[0,1],100),clip(clip(clip(tri,[0,-1],-100),[0,1],200),[1,0],106),clip(clip(clip(tri,[0,-1],-100),[0,1],200),[-1,0],-206),clip(tri,[0,-1],-200)].filter(p=>p.length>=3&&Math.abs(area(p))>1e-6);}
export function build(key){const input=`output/abd-base-lock-p66/${key}.json`,raw=fs.readFileSync(path.join(root,input)),m=JSON.parse(raw),[family,side]=key.split('-'),s=family==='D'?200/2825:0,L=Math.hypot(1,s),stock=[];
 for(const [owner,stations,outer]of [['M01',[400,2200],true],['M03',[400,1900],false]])for(const [i,v]of stations.entries())for(const [j,v0]of [-35,25].entries()){
  const map=([n,z],vv)=>{const u=outer?-n:150+n,x=(u+s*vv)/L,y=(-s*u+vv)/L;return [side==='RH'?1490-x:x,y,z];};
  const solids=sections().map(p=>loft(p.map(q=>map(q,v+v0)),p.map(q=>map(q,v+v0+10)))),props=solids.map(polyProperties),volume=props.reduce((a,p)=>a+p.volumeMm3,0);
  stock.push({tag:`${owner}-G${i+1}${j+1}`,owner,foot:`${owner}-F${i+1}`,role:'WELDED_WALL_FOOT_GUSSET',thicknessMm:10,localProfileMm:[[6,30],[356,30],[6,650]],walerNotchMm:{n:[106,206],z:[100,200]},solids,massKg:volume*7850/1e9,cgMm:[0,1,2].map(k=>props.reduce((a,p)=>a+p.volumeMm3*p.cgMm[k],0)/volume)});
 }
 for(const owner of ['M05','M06']){const end=m.parts.find(p=>p.tag===owner),cy=end.contactEdgesMm.flat().reduce((a,p,_,all)=>a+p[1]/all.length,0);for(const [j,t0]of [-35,25].entries()){
  const map=([n,z],t)=>{let x=owner==='M05'?75+t:1490+n,y=owner==='M05'?-n:cy+t;return [side==='RH'?1490-x:x,y,z];};
  const profile=[[6,30],[356,30],[6,650]],f=loft(profile.map(p=>map(p,t0)),profile.map(p=>map(p,t0+10))),p=polyProperties(f);
  stock.push({tag:owner+'-G1'+(j+1),owner,foot:owner+'-F1',role:'WELDED_END_FOOT_GUSSET',thicknessMm:10,localProfileMm:profile,solids:[f],massKg:p.volumeMm3*7850/1e9,cgMm:p.cgMm});
 }}
 const actors=new Map(m.parts.map(p=>[p.tag,p.cells.map(cellFaces)])),extra=new Map(['M01','M03','M05','M06'].map(tag=>[tag,stock.filter(p=>p.owner===tag).flatMap(p=>p.solids)])),concrete=m.concrete.cells.map(cellFaces),clashes=[];
 for(const g of stock){for(const [tag,solids]of actors)if(g.solids.some(a=>solids.some(b=>swept(a,b))))clashes.push([g.tag,tag]);if(g.solids.some(a=>concrete.some(b=>swept(a,b))))clashes.push([g.tag,'CONCRETE']);}
 for(let i=0;i<stock.length;i++)for(let j=0;j<i;j++)if(stock[i].solids.some(a=>stock[j].solids.some(b=>swept(a,b))))clashes.push([stock[i].tag,stock[j].tag]);
 const moves=[],translate=(ff,d)=>ff.map(f=>f.map(p=>p.map((v,i)=>v+d[i])));
 for(const [tag,...legs]of m.sequence){let base=actors.get(tag),added=extra.get(tag)??[];for(const d of legs){const hits=[];
  if(added.some(a=>concrete.some(b=>swept(a,b,d))))hits.push('CONCRETE');
  for(const [other,obs]of actors)if(other!==tag){const ex=extra.get(other)??[];if(added.some(a=>[...obs,...ex].some(b=>swept(a,b,d)))||base.some(a=>ex.some(b=>swept(a,b,d))))hits.push(other);}
  moves.push({tag,deltaMm:d,hits});base=base.map(f=>translate(f,d));added=added.map(f=>translate(f,d));}
  actors.delete(tag);extra.delete(tag);
 }
 return {revision:'P69',key,id:m.id,units:'mm',inputSnapshot:{path:input,sha256:crypto.createHash('sha256').update(raw).digest('hex')},source:m.source,stock,totalAddedKg:stock.reduce((a,g)=>a+g.massKg,0),audit:{staticHits:clashes,additionalIntegratedMoves:moves,baselineP66Passed:m.audit.staticHits.length===0&&m.audit.moves.every(v=>!v.hits.length)},scope:'WALL_AND_END_FOOT_GUSSETS',limitations:['Twelve integral welded plates, not independent temporary supports.','Waler notch is nominal zero-clearance fit; welding access and fabrication tolerances remain unresolved.','No weld, plate buckling, restraint, bolt-group capacity or supported-handling approval.','Roof bracing and seam locks remain Stage5 tasks.'],engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const out=path.join(root,'output/abd-end-gusset-p69');fs.mkdirSync(out,{recursive:true});for(const k of (process.argv[2]?[process.argv[2]]:keys)){const m=build(k);fs.writeFileSync(path.join(out,k+'.json'),JSON.stringify(m,null,2));console.log(k,{static:m.audit.staticHits,moves:m.audit.additionalIntegratedMoves.filter(v=>v.hits.length),mass:m.totalAddedKg});}}
