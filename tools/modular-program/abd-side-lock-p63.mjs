import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {root} from './cap-geometry-p55.mjs';import {build as previous,keys} from './abd-window-p62.mjs';
import {rect,drillMany,disk,ring,properties,collide,shift} from './prism-tools-p54.mjs';
export {keys};
export function build(key){
 const [family,side]=key.split('-'),m=previous(`${family}-LH-W01`),s=family==='D'?200/2825:0,L=Math.hypot(1,s),xy=(u,v)=>[(u+s*v)/L,(-s*u+v)/L],wc=m.parts.find(p=>p.tag==='WC'),newStock=[],newParts=[],locks=[];
 const push=(tag,owner,role,cells)=>{const p={tag,owner,role,cells};newStock.push(p);m.parts.find(p=>p.tag===owner).cells.push(...cells);};
 for(const [i,tag,y,edge,postY,sign]of [[1,'W03',960,906,1100,1],[2,'W04',2040,2094,1900,-1]])for(const [j,z]of [[1,360],[2,1090]]){
  const x=s*y+75*L,vPost=L*postY+s*75,nearY=y+25*sign,farA=xy(50,vPost-25*sign),farB=xy(100,vPost-25*sign),prefix=`SL${i}${j}`;
  const boss=drillMany(rect(x-25,x+25,y-25,y+25,z-20,z),[{x,y,r:6,box:9}]);
  const bridgePoly=sign===1?[[x-25,nearY],[x+25,nearY],farB,farA]:[farA,farB,[x+25,nearY],[x-25,nearY]];
  push(prefix+'-BOSS','WC','THREADED_BOSS50x50x20_NOMINAL_M12',boss);
  push(prefix+'-LINK','WC','PROFILED_LINK_PLATE20', [{poly:bridgePoly,z0:z-20,z1:z}]);
  const tab=drillMany(rect(x-25,x+25,Math.min(edge,y-26),Math.max(edge,y+26),z,z+10),[{x,y,r:7,box:10}]);
  push(prefix+'-TAB',tag,'SIDE_INSERT_TAB10',tab);
  newParts.push({tag:prefix+'-SCREW',role:'NOMINAL_M12_SCREW',cells:[disk(x,y,6,z-18,z+13),disk(x,y,10,z+13,z+21)]},{tag:prefix+'-WASHER',role:'WASHER14_ID24_OD3',cells:ring(x,y,7,12,z+10,z+13)});
  locks.push({tag:prefix,owner:tag,axisMm:[x,y,z],nominalScrew:'M12',nominalEngagementMm:18,tabClearanceDiameterMm:14,bossNominalThreadEnvelopeMm:12,toolEnvelopeDiameterMm:28,toolEnvelopeHeightMm:34,toolNote:'Low-profile right-angle driver envelope only; handle/operator reach not yet modeled'});
 }
 m.parts.push(...newParts);m.stock.push(...newStock);
 // Keep cassette feet bolted while releasing both side inserts; release base screws only before WC withdrawal.
 const sideRows=m.sequence.filter(r=>['W03','W04'].includes(r[0]));
 const seq=[...newParts.map(p=>[p.tag,[0,0,60],[-250,0,0]]),...sideRows,...m.sequence.filter(r=>!['W03','W04'].includes(r[0]))];
 if(side==='RH'){
  const mir=c=>({...c,poly:c.poly.map(([x,y])=>[1490-x,y]).reverse()});for(const p of m.parts)p.cells=p.cells.map(mir);for(const p of m.stock)p.cells=p.cells.map(mir);for(const h of m.baseScrewSeats)h.x=1490-h.x;for(const r of locks)r.axisMm[0]=1490-r.axisMm[0];for(const row of seq)for(const d of row.slice(1))d[0]=-d[0];
  const original=previous(key);m.source=original.source;m.concrete=original.concrete;m.castingTransform=original.castingTransform;m.id=original.id;
 }
 for(const p of m.parts)p.properties=properties(p.cells);
 const staticHits=[];for(let i=0;i<m.parts.length;i++){if(collide(m.parts[i].cells,m.concrete.cells))staticHits.push([m.parts[i].tag,'CONCRETE']);for(let j=0;j<i;j++)if(collide(m.parts[i].cells,m.parts[j].cells))staticHits.push([m.parts[i].tag,m.parts[j].tag]);}
 const active=new Map(m.parts.map(p=>[p.tag,p.cells])),moves=[];
 for(const [tag,...legs]of seq){let cs=active.get(tag);for(const d of legs){const hits=[];if(collide(cs,m.concrete.cells,d))hits.push('CONCRETE');for(const [other,obs]of active)if(other!==tag&&collide(cs,obs,d))hits.push(other);moves.push({tag,deltaMm:d,hits});cs=cs.map(c=>shift(c,d));}active.delete(tag);}
 const socketChecks=locks.map(l=>{const [x,y,z]=l.axisMm,cs=[disk(x,y,14,z+13,z+47)];return {tag:l.tag,hits:m.parts.filter(p=>p.tag!==l.tag+'-SCREW'&&collide(cs,p.cells)).map(p=>p.tag)};});
 const stockHits=[];for(let i=0;i<m.stock.length;i++)for(let j=0;j<i;j++)if(collide(m.stock[i].cells,m.stock[j].cells))stockHits.push([m.stock[i].tag,m.stock[j].tag]);
 return {...m,revision:'P63',key,locks,sequence:seq,audit:{staticHits,moves,socketChecks,stockIntersections:stockHits,remainingTags:[...active.keys()]},cassetteProperties:properties(wc.cells),limits:['Four positive side-insert attachments added as nominal geometry, not verified screw/weld strength.','Screws lift 60 mm then withdraw outward before side plates can slide; upper screws must remain below the head contact skin.','Side inserts require temporary capture/support during screw release. Cassette requires designed support before base screw release.','Main shell backframes/locks, welds, tolerances, seals and handling design remain open.','P62 demand values do not include added stock/hardware or side-insert load transfer; recompute structural model before using capacity results.'],engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const out=path.join(root,'output/abd-side-lock-p63');fs.mkdirSync(out,{recursive:true});for(const key of keys){const m=build(key);fs.writeFileSync(path.join(out,key+'.json'),JSON.stringify(m,null,2));console.log(key,{static:m.audit.staticHits,moves:m.audit.moves.filter(v=>v.hits.length),tools:m.audit.socketChecks.filter(v=>v.hits.length),stock:m.audit.stockIntersections,kg:m.cassetteProperties.massKg});}}
