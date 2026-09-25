import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {cellFaces,swept} from './mould-pilot-p39.mjs';
import {raster} from './drawing-raster-p36.mjs';
const extended=process.argv.includes('--p51'),revision=extended?'P51':'P47';
const out=extended?'output/table-lock-p51':'output/floor-lock-p47';fs.mkdirSync(out,{recursive:true});
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rect=(x0,x1,y0,y1,z0,z1)=>({poly:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],z0,z1});
const disk=(x,y,r,z0,z1)=>({poly:Array.from({length:32},(_,i)=>[x+r*Math.cos(i*Math.PI/16),y+r*Math.sin(i*Math.PI/16)]),z0,z1});
function ring(x,y,r,R,z0,z1,square=false){return Array.from({length:32},(_,i)=>{const at=(a,inside)=>{const c=Math.cos(a),s=Math.sin(a),v=inside?r:square?R/Math.max(Math.abs(c),Math.abs(s)):R;return [x+v*c,y+v*s];};let a=i*Math.PI/16,b=(i+1)*Math.PI/16;return {poly:[at(a,false),at(b,false),at(b,true),at(a,true)],z0,z1};});}
function cutRect(b,x,y,r){const [x0,y0]=b.poly[0],[x1,y1]=b.poly[2],a=Math.max(x0,x-r),c=Math.min(x1,x+r),d=Math.max(y0,y-r),e=Math.min(y1,y+r);if(c<=a||e<=d)return [b];return [[x0,a,y0,y1],[c,x1,y0,y1],[a,c,y0,d],[a,c,e,y1]].filter(([a,b,c,d])=>b>a&&d>c).map(v=>rect(...v,b.z0,b.z1));}
function drilled(b,x,y){return [...cutRect(b,x,y,12),...ring(x,y,9,12,b.z0,b.z1,true)];}
function bound(c){return {lo:[Math.min(...c.poly.map(p=>p[0])),Math.min(...c.poly.map(p=>p[1])),c.z0],hi:[Math.max(...c.poly.map(p=>p[0])),Math.max(...c.poly.map(p=>p[1])),c.z1]};}
function hit(a,b,d=[0,0,0]){const A=bound(a),B=bound(b);if([0,1,2].some(i=>Math.max(A.hi[i],A.hi[i]+d[i])<=B.lo[i]+.001||Math.min(A.lo[i],A.lo[i]+d[i])>=B.hi[i]-.001))return false;return swept(a,b,d);}
const coll=(aa,bb,d)=>aa.some(a=>bb.some(b=>hit(a,b,d)));
function render(parts,w,h){const ff=parts.flatMap(p=>p.cells.flatMap(c=>cellFaces(c).map(face=>({face,color:p.color}))));const raw=([x,y,z])=>[(x-y)*.866,(x+y)*.42-z],pts=ff.flatMap(f=>f.face.map(raw)),lo=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1]))],hi=[Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))],s=Math.min((w-30)/(hi[0]-lo[0]),(h-30)/(hi[1]-lo[1]));return raster(ff,w,h,v=>{const q=raw(v);return [15+(q[0]-lo[0])*s,15+(q[1]-lo[1])*s];},([x,y,z])=>-x-y-z*2);}
assert.equal(coll([rect(0,1,0,1,0,1)],[rect(2,3,0,1,0,1)],[4,0,0]),true);
assert.equal(coll([disk(0,0,8,0,12)],drilled(rect(-40,40,-40,40,0,12),0,0)),false);
const results=[];
for(const family of (extended?['NW01','NW02','NR-S','NR-N']:['F2660','NF02'])){
 const source=`output/${extended?'table-mould-p51':'floor-mould-p46'}/${family}/model.json`,old=JSON.parse(fs.readFileSync(source)),[L,W,H]=old.cavityMm;
 const parts=old.parts.map(p=>({id:p.id,color:p.id==='M00'?'#55778b':p.color,cells:p.cells.map(b=>rect(b.min[0],b.max[0],b.min[1],b.max[1],b.min[2],b.max[2]))}));
 const bed=parts[0],coords=[];const add=(parent,x,y)=>coords.push({id:'LK'+String(coords.length+1).padStart(2,'0'),parent,x,y});
 const intervals=extended?Array.from({length:4},(_,k)=>Math.floor((k+.5)*Math.round(L/old.ribPitchMm)/4)):[1,4,7,10];
 for(const i of intervals){const x=(i+.5)*old.ribPitchMm;add('M01',x,-80);add('M02',x,W+80);}
 for(const y of [W/3,2*W/3]){add('M03',-80,y);add('M04',L+80,y);}
 let skin=[bed.cells.shift()];for(const c of coords)skin=skin.flatMap(b=>cutRect(b,c.x,c.y,12));bed.cells.push(...skin,...coords.flatMap(c=>ring(c.x,c.y,9,12,-6,0,true)));
 for(const c of coords){const {id,parent,x,y}=c,p=parts.find(p=>p.id===parent);let foot,web;
 if(parent==='M01'){foot=rect(x-40,x+40,-110,-6,0,12);web=rect(x-3,x+3,-56,-6,12,60);}
 if(parent==='M02'){foot=rect(x-40,x+40,W+6,W+110,0,12);web=rect(x-3,x+3,W+6,W+56,12,60);}
 if(parent==='M03'){foot=rect(-110,-6,y-40,y+40,0,12);web=rect(-56,-6,y-3,y+3,12,60);}
 if(parent==='M04'){foot=rect(L+6,L+110,y-40,y+40,0,12);web=rect(L+6,L+56,y-3,y+3,12,60);}
 p.cells.push(...drilled(foot,x,y),web);bed.cells.push(...drilled(rect(x-35,x+35,y-35,y+35,-20,-6),x,y));
 parts.push({id:id+'-B',color:'#bb842c',cells:[disk(x,y,8,-38,15),disk(x,y,13,15,25)]},{id:id+'-W',color:'#d6a545',cells:ring(x,y,9,15,12,15)},{id:id+'-N',color:'#cba86a',cells:ring(x,y,8,15,-34,-20)});
 }
 const concrete=[rect(0,L,0,W,0,H)],hits=[];
 for(let i=0;i<parts.length;i++){if(coll(parts[i].cells,concrete))hits.push(parts[i].id+'-CONCRETE');for(let j=i+1;j<parts.length;j++)if(coll(parts[i].cells,parts[j].cells))hits.push(parts[i].id+'-'+parts[j].id);}
 assert.deepEqual(hits,[]);
 const active=new Map(parts.map(p=>[p.id,p])),steps=[];
 // Nut withdrawal represents the envelope after unscrewing; no thread helix simulated.
 const order=[...coords.map(c=>[c.id+'-N',[0,0,-70]]),...coords.map(c=>[c.id+'-B',[0,0,120]]),...coords.map(c=>[c.id+'-W',[0,0,120]]),['M03',[-300,0,0]],['M04',[300,0,0]],['M01',[0,-300,0]],['M02',[0,300,0]]];
 for(const [id,d]of order){const p=active.get(id),hh=[];if(coll(p.cells,concrete,d))hh.push('CONCRETE');for(const [key,q]of active)if(key!==id&&coll(p.cells,q.cells,d))hh.push(key);steps.push({id,translationMm:d,hits:hh});assert.deepEqual(hh,[],id);active.delete(id);}
 const socket=coords.map(c=>{const zones=[disk(c.x,c.y,21,25,90),disk(c.x,c.y,21,-90,-34)];const obstacles=parts.filter(p=>!p.id.startsWith(c.id+'-')).flatMap(p=>p.cells);return {id:c.id,toolEnvelopeRadiusMm:21,nominalEnvelopeClear:!coll(zones,obstacles)};});assert.ok(socket.every(c=>c.nominalEnvelopeClear));
 const folder=`${out}/${family}`;fs.mkdirSync(folder,{recursive:true});
 const audit={source,sourceSha256:hash(source),sourceCavityUnchanged:true,locks:coords.length,initialHits:hits,steps,socket,scope:'Convex-prism nominal solids; thread rotation, torque, workers, rigging, parking, loads and tolerances excluded',engineeringApproved:false};
 fs.writeFileSync(`${folder}/model.json`,JSON.stringify({revision,cavityMm:old.cavityMm,parts,lockSchedule:coords,boltProposal:'M16 simplified cylinders, grade/torque not selected',holeNominalMm:18,footPlateMm:12,bedDoublerMm:14,audit,productionReleased:false},null,2));
 fs.writeFileSync(`${folder}/audit.json`,JSON.stringify(audit,null,2));
 const shot=render(parts,1400,700);const c=coords[0],detail=parts.map(p=>({...p,cells:p.cells.filter(b=>{const a=bound(b);return a.lo[0]>=c.x-60&&a.hi[0]<=c.x+60&&a.lo[1]>=-120&&a.hi[1]<=0;})})).filter(p=>p.cells.length);const ds=render(detail,650,520);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1400"><rect width="1800" height="1400" fill="white"/><g fill="#10274c" font-family="Arial"><text x="35" y="55" font-size="36">P47 | ${family} — SIDE SHUTTER LOCK STUDY</text><text x="35" y="100" font-size="24">12 proposed M16 stations / hole18 / foot12 / underside doubler14 mm — geometry only</text><image href="${shot}" x="160" y="120" width="1400" height="700"/><text x="35" y="870" font-size="27">LOCK DETAIL — LOCAL PARTS ONLY</text><image href="${ds}" x="20" y="890" width="650" height="450"/><text x="730" y="910" font-size="26">Nominal checks: no solid penetration</text><text x="730" y="965" font-size="24">36 fastener withdrawals + 4 shutter paths</text><text x="730" y="1020" font-size="24">Socket envelopes: radius21 mm above / below</text><text x="730" y="1075" font-size="24">Support shutter before unscrewing nuts</text><text x="730" y="1130" font-size="24">Remove bolts and washers before sliding shutter</text><text x="730" y="1185" font-size="24">Weld / bolt strength / lifting: NOT VERIFIED</text><text x="35" y="1370" font-size="23">DEVELOPMENT MODEL — NOT FOR FABRICATION OR USE. SOURCE CONCRETE UNCHANGED.</text></g></svg>`;
 if(extended)svg=svg.replace('P47 |','P51 |');
 fs.writeFileSync(`${folder}/01-LOCKS.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${folder}/01-LOCKS.png`);results.push({family,locks:coords.length,paths:steps.length,socketChecks:socket.length,sourceSetups:old.sources.length});
}
fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision,results,stage:5,stagePercent:50,engineeringApproved:false,productionReleased:false},null,2));console.log(JSON.stringify(results));
