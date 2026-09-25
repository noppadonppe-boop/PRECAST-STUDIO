import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {root} from './cap-geometry-p55.mjs';import {build as skins} from './abd-shell-skins-p60.mjs';
import {rect,tube,drillMany,disk,ring,properties,collide,shift} from './prism-tools-p54.mjs';
export const keys=['A','B','D'].flatMap(f=>['LH','RH'].map(s=>`${f}-${s}-W01`));
function clip(poly,y,above){const out=[],inside=p=>above?p[1]>=y-1e-8:p[1]<=y+1e-8;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],A=inside(a),B=inside(b);if(A)out.push(a);if(A!==B){const t=(y-a[1])/(b[1]-a[1]);out.push([a[0]+t*(b[0]-a[0]),y]);}}return out;}
export function build(key){
 const [family,side]=key.split('-'),base=skins(`${family}-LH-W01`),source=side==='LH'?base:skins(key),s=base.windowBasis.wallSlopeXperY,L=Math.hypot(1,s),parts=structuredClone(base.parts),stock=[],bolts=[],holes=[];
 const xy=([u,v])=>[(u+s*v)/L,(-s*u+v)/L],map=c=>({...c,poly:c.poly.map(xy)});
 // Cut only the actual window aperture in the outer contact skin, not the concrete.
 const outer=parts.find(p=>p.tag==='M01');outer.cells=outer.cells.flatMap(c=>[{...c,z1:292.5},{...c,z0:1192.5},...[[900,false],[2100,true]].map(([y,a])=>({...c,poly:clip(c.poly,y,a),z0:292.5,z1:1192.5})).filter(c=>c.poly.length>2)]);
 const sill=parts.find(p=>p.tag==='W01'),head=parts.find(p=>p.tag==='W02');
 const unit={tag:'WC',role:'REMOVABLE_WINDOW_CASSETTE_AND_EXTERNAL_TOWERS',cells:[...sill.cells,...head.cells]};
 stock.push({tag:'WC-SILL',role:'SILL_CONTACT',cells:sill.cells},{tag:'WC-HEAD',role:'HEAD_CONTACT',cells:head.cells});
 for(const [i,y] of [1100,1900].entries()){
  const v=L*y+s*75; // Centres follow the original sloping wall, normal coordinate u=75 mm.
  const add=(tag,role,cells)=>{const cs=cells.map(map);stock.push({tag,role,cells:cs});unit.cells.push(...cs);};
  add(`WC-C${i+1}`,'INNER_SHS50x50x4',tube(2,[50,v-25,298.5],[100,v+25,1186.5],4));
  add(`WC-T${i+1}`,'EXTERNAL_SHS100x100x6',tube(2,[-450,v-50,20],[-350,v+50,1130],6));
  for(const [j,z]of [400,1000].entries())add(`WC-B${i+1}${j+1}`,'RHS100_DEEP_50_WIDE_5',tube(0,[-350,v-25,z],[50,v+25,z+100],5));
  const hs=[-70,70].flatMap(du=>[-70,70].map(dv=>({x:-400+du,y:v+dv,r:11,box:14})));
  add(`WC-F${i+1}`,'BASE_PLATE200x200x20',drillMany(rect(-500,-300,v-100,v+100,0,20),hs));
  for(const [j,h]of hs.entries()){
   const [x,yy]=xy([h.x,h.y]),tag=`WB${i+1}${j+1}`;
   holes.push({x,y:yy,r:10,box:14,tag,nominalThread:'M20',threadSeatDepthMm:25,threadGeometry:'NOMINAL_ENVELOPE_NOT_TAP_DRILL'});
   bolts.push({tag,role:'M20_NOMINAL_BASE_SCREW',cells:[disk(x,yy,10,-25,23),disk(x,yy,17,23,36)]});
   const washer={tag:`WW${i+1}${j+1}`,role:'WASHER22_ID40_OD3',cells:ring(x,yy,11,20,20,23)};parts.push(washer);
  }
 }
 parts.splice(parts.indexOf(sill),1);parts.splice(parts.indexOf(head),1);parts.push(unit,...bolts);
 const bed=parts.find(p=>p.tag==='M00');bed.cells=[rect(-1000,2490,-1000,3900,-30,-25),...drillMany(rect(-1000,2490,-1000,3900,-25,0),holes)];
 const sequence=[...bolts.map(p=>[p.tag,[0,0,90]]),...parts.filter(p=>p.tag.startsWith('WW')).map(p=>[p.tag,[0,0,90]]),['W03',[20*s,20,0],[-250,0,0]],['W04',[-20*s,-20,0],[-250,0,0]],['WC',[-800,0,0],[0,0,1800]],...base.audit.moves.reduce((arr,m)=>{if(m.tag.startsWith('W'))return arr;let r=arr.find(r=>r[0]===m.tag);if(!r){r=[m.tag];arr.push(r);}r.push([...m.deltaMm]);return arr;},[])];
 if(side==='RH'){
  const mir=c=>({...c,poly:c.poly.map(([x,y])=>[1490-x,y]).reverse()});
  for(const p of parts)p.cells=p.cells.map(mir);
  for(const p of stock)p.cells=p.cells.map(mir);
  for(const h of holes)h.x=1490-h.x;
  for(const row of sequence)for(const d of row.slice(1))d[0]=-d[0];
 }
 for(const p of parts)p.properties=properties(p.cells);
 const hits=[];for(let i=0;i<parts.length;i++){if(collide(parts[i].cells,source.concrete.cells))hits.push([parts[i].tag,'CONCRETE']);for(let j=0;j<i;j++)if(collide(parts[i].cells,parts[j].cells))hits.push([parts[i].tag,parts[j].tag]);}
 const active=new Map(parts.map(p=>[p.tag,p.cells])),moves=[];for(const [tag,...legs]of sequence){let cs=active.get(tag);for(const d of legs){const hits=[];if(collide(cs,source.concrete.cells,d))hits.push('CONCRETE');for(const [other,obs]of active)if(other!==tag&&collide(cs,obs,d))hits.push(other);moves.push({tag,deltaMm:d,hits});cs=cs.map(c=>shift(c,d));}active.delete(tag);}
 const tools=holes.map(h=>{const cs=[disk(h.x,h.y,24,23,150)],hits=parts.filter(p=>!p.tag.startsWith('WB')&&!p.tag.startsWith('WW')&&collide(cs,p.cells)).map(p=>p.tag);return {bolt:h.tag,socketDiameterMm:48,accessHeightMm:127,hits};});
 const stockHits=[];for(let i=0;i<stock.length;i++)for(let j=0;j<i;j++)if(collide(stock[i].cells,stock[j].cells))stockHits.push([stock[i].tag,stock[j].tag]);
 return {revision:'P62',key,id:source.id,stage:5,source:source.source,concrete:source.concrete,castingTransform:source.castingTransform,parts,stock,baseScrewSeats:holes,sequence,audit:{staticHits:hits,moves,socketChecks:tools,stockIntersections:stockHits,remainingTags:[...active.keys()]},cassetteProperties:properties(parts.find(p=>p.tag==='WC').cells),limits:['Window retention subsystem only; full wall/roof backframes and locks remain to be integrated.','Thread geometry is a nominal envelope, not a machining drawing or verified threaded connection.','Provide independently designed temporary capture/support before removing base screws; translation clearance does not establish handling stability.','Sill/head/columns/towers are welded into one cassette; side inserts release before cassette withdrawal. Side-insert locking, seals and weld detailing are still required.','No bar sizes added; concrete lifting assumption follows P52. No mould lifting or fabrication release.'],engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const out=path.join(root,'output/abd-window-p62');fs.mkdirSync(out,{recursive:true});for(const key of keys){const m=build(key);fs.writeFileSync(path.join(out,key+'.json'),JSON.stringify(m,null,2));console.log(key,{hits:m.audit.staticHits,motion:m.audit.moves.filter(r=>r.hits.length),tool:m.audit.socketChecks.filter(r=>r.hits.length),stock:m.audit.stockIntersections,kg:m.cassetteProperties.massKg});}}
