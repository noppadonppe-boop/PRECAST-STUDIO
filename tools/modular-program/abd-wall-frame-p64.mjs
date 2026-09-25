import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {root} from './cap-geometry-p55.mjs';import {build as skin,keys} from './abd-shell-skins-p60.mjs';import {build as window} from './abd-side-lock-p63.mjs';import {tube,collide,shift,properties} from './prism-tools-p54.mjs';
export {keys};
export function build(key){const [family,side,variant]=key.split('-'),win=variant==='W01',m=win?window(`${family}-LH-${variant}`):skin(`${family}-LH-${variant}`),source=skin(key),s=family==='D'?200/2825:0,L=Math.hypot(1,s),xy=([u,v])=>[(u+s*v)/L,(-s*u+v)/L],stock=[];
 const parts=m.parts;
 for(const tag of ['M01','M03']){
  const p=parts.find(p=>p.tag===tag),edge=skin(`${family}-LH-${variant}`).parts.find(p=>p.tag===tag).contactEdgesMm[0],maxV=Math.max(...edge.map(([x,y])=>(s*x+y)/L))-250,outer=tag==='M01',u0=outer?-106:156,u1=outer?-6:256,w0=outer?-206:256,w1=outer?-106:356,openV=[850*L,2150*L+s*150];
  const add=(name,role,axis,lo,hi)=>{const cs=tube(axis,lo,hi,5).map(c=>({...c,poly:c.poly.map(xy)}));stock.push({tag:`${tag}-${name}`,owner:tag,role,cells:cs,localMinMm:lo,localMaxMm:hi,wallThicknessMm:5});p.cells.push(...cs);};
  let i=0;
  for(let v=100;v<=maxV-25;v+=300){const spans=outer&&win&&v+25>openV[0]&&v-25<openV[1]?[[30,250],[1240,1485]]:[[30,1485]];for(const [z0,z1]of spans)add(`R${++i}`,'RHS100_NORMAL_DEPTH_50_TANGENT_WIDTH',2,[u0,v-25,z0],[u1,v+25,z1]);}
  let j=0;
  for(const z of [100,650,1300]){const ranges=outer&&win&&z===650?[[50,openV[0]],[openV[1],maxV]]:[[50,maxV]];for(const [a,b]of ranges)if(b>a)add(`W${++j}`,'SHS100_WALER',1,[w0,a,z],[w1,b,z+100]);}
 }
 let sequence=m.sequence??m.audit.moves.reduce((a,r)=>{let row=a.find(x=>x[0]===r.tag);if(!row){row=[r.tag];a.push(row);}row.push([...r.deltaMm]);return a;},[]);
 if(side==='RH'){const mir=c=>({...c,poly:c.poly.map(([x,y])=>[1490-x,y]).reverse()});for(const p of parts)p.cells=p.cells.map(mir);for(const p of stock)p.cells=p.cells.map(mir);for(const row of sequence)for(const d of row.slice(1))d[0]=-d[0];}
 for(const p of parts)p.properties=properties(p.cells);
 const staticHits=[];for(let i=0;i<parts.length;i++){if(collide(parts[i].cells,source.concrete.cells))staticHits.push([parts[i].tag,'CONCRETE']);for(let j=0;j<i;j++)if(collide(parts[i].cells,parts[j].cells))staticHits.push([parts[i].tag,parts[j].tag]);}
 const active=new Map(parts.map(p=>[p.tag,p.cells])),moves=[];for(const [tag,...legs]of sequence){let cs=active.get(tag);for(const d of legs){const hits=[];if(collide(cs,source.concrete.cells,d))hits.push('CONCRETE');for(const [other,obs]of active)if(other!==tag&&collide(cs,obs,d))hits.push(other);moves.push({tag,deltaMm:d,hits});cs=cs.map(c=>shift(c,d));}active.delete(tag);}
 const stockHits=[];for(let i=0;i<stock.length;i++)for(let j=0;j<i;j++)if(collide(stock[i].cells,stock[j].cells))stockHits.push([stock[i].tag,stock[j].tag]);
 return {revision:'P64',key,id:source.id,stage:5,source:source.source,concrete:source.concrete,castingTransform:source.castingTransform,parts,wallFrameStock:stock,wallFrameProperties:properties(stock.flatMap(p=>p.cells)),sequence,audit:{staticHits,moves,stockIntersections:stockHits,remainingTags:[...active.keys()]},limits:['Wall ribs/walers only. Roof framing, braces, base locks and strength design remain incomplete.','RHS/SHS dimensions are development selections, not code-checked sizes.','Outer window frame has a real clear corridor for cassette hardware withdrawal.','Existing window/tool access needs rechecking after braces/base locks are added.','No handling-support or crane release; temporary capture remains required.'],engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const out=path.join(root,'output/abd-wall-frame-p64');fs.mkdirSync(out,{recursive:true});for(const key of keys){const m=build(key);fs.writeFileSync(path.join(out,key+'.json'),JSON.stringify(m,null,2));console.log(key,{static:m.audit.staticHits,moves:m.audit.moves.filter(r=>r.hits.length),stock:m.audit.stockIntersections,count:m.wallFrameStock.length,kg:m.wallFrameProperties.massKg});}}
