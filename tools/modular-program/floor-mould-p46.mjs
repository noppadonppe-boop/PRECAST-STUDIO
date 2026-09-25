import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {raster} from './drawing-raster-p36.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const extended=process.argv.includes('--p51'),revision=extended?'P51':'P46';
const out=extended?'output/table-mould-p51':'output/floor-mould-p46';fs.mkdirSync(out,{recursive:true});
const reg=JSON.parse(fs.readFileSync('output/stage5-moulds-p38/register.json'));
const candidates=reg.setups.filter(s=>extended?['NODE_WALL','NODE_ROOF'].includes(s.kind):s.kind==='FLOOR'&&!s.typicalId.includes('NF01'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function box(min,max){return {min,max};}
function faces(b){const [x,y,z]=b.min,[X,Y,Z]=b.max;return [[[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]],[[x,y,Z],[x,Y,Z],[X,Y,Z],[X,y,Z]],[[x,y,z],[x,y,Z],[X,y,Z],[X,y,z]],[[X,Y,z],[X,Y,Z],[x,Y,Z],[x,Y,z]],[[x,y,z],[x,Y,z],[x,Y,Z],[x,y,Z]],[[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]]];}
function tube(axis,min,max,t){const transverse=[0,1,2].filter(i=>i!==axis),[a,b]=transverse;const cells=[];for(const side of [0,1]){let lo=[...min],hi=[...max];if(side)lo[a]=max[a]-t;else hi[a]=min[a]+t;cells.push(box(lo,hi));}for(const side of [0,1]){let lo=[...min],hi=[...max];lo[a]+=t;hi[a]-=t;if(side)lo[b]=max[b]-t;else hi[b]=min[b]+t;cells.push(box(lo,hi));}return cells;}
function overlap(a,b){return [0,1,2].every(i=>Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])>1e-7);}
function swept(a,b,d){let enter=0,leave=1;for(let i=0;i<3;i++){if(!d[i]){if(Math.min(a.max[i],b.max[i])-Math.max(a.min[i],b.min[i])<=1e-7)return false;}else{const t1=(b.min[i]-a.max[i])/d[i],t2=(b.max[i]-a.min[i])/d[i];enter=Math.max(enter,Math.min(t1,t2));leave=Math.min(leave,Math.max(t1,t2));}}return leave-enter>1e-8;}
const mass=cells=>cells.reduce((v,b)=>v+b.max.reduce((p,x,i)=>p*(x-b.min[i]),1)*7850/1e9,0);
assert.equal(swept(box([0,0,0],[1,1,1]),box([2,0,0],[3,1,1]),[4,0,0]),true);
assert.equal(swept(box([0,0,0],[1,1,1]),box([1,0,0],[2,1,1]),[-2,0,0]),false);
assert.equal(swept(box([0,0,0],[1,1,1]),box([1,0,0],[2,1,1]),[2,0,0]),true);
assert.equal(swept(box([0,0,0],[1,1,1]),box([2,1,0],[3,2,1]),[4,0,0]),false);
function render(items,w,h){const ff=items.flatMap(p=>p.cells.flatMap(b=>faces({min:b.min.map((x,i)=>x+(p.offset?.[i]||0)),max:b.max.map((x,i)=>x+(p.offset?.[i]||0))}).map(face=>({face,color:p.color}))));const raw=([x,y,z])=>[(x-y)*.866,(x+y)*.42-z];const pp=ff.flatMap(f=>f.face.map(raw)),lo=[Math.min(...pp.map(p=>p[0])),Math.min(...pp.map(p=>p[1]))],hi=[Math.max(...pp.map(p=>p[0])),Math.max(...pp.map(p=>p[1]))],s=Math.min((w-40)/(hi[0]-lo[0]),(h-40)/(hi[1]-lo[1]));return raster(ff,w,h,v=>{const p=raw(v);return [20+(p[0]-lo[0])*s,20+(p[1]-lo[1])*s];},([x,y,z])=>-x-y-z*2);}
const models=[];
for(const [family,[L,W,H]]of (extended?[['NW01',[1485,2430,175]],['NW02',[1302.5,2430,175]],['NR-S',[2865,1365,175]],['NR-N',[2865,1485,175]]]:[['F2660',[2660,1485,175]],['NF02',[2797.5,1297.5,175]]])){
 const mapped=candidates.filter(s=>JSON.stringify(s.dimensionsMm)===JSON.stringify([L,W,H]));
 // Verify the actual source polyhedron is a closed rectangular casting by volume and vertices.
 const sources=mapped.map(s=>{const path=`output/stage5-moulds-p38/${s.folder}/setup.json`,a=JSON.parse(fs.readFileSync(path));const pts=a.cavity.facesMm.flat();const min=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));assert.ok(min.every(x=>Math.abs(x)<1e-6));assert.deepEqual(max,[L,W,H]);assert.ok(pts.every(p=>p.every((v,i)=>Math.abs(v-min[i])<1e-6||Math.abs(v-max[i])<1e-6)));assert.ok(Math.abs(s.concreteKg-L*W*H/1e9*2400)<.01);return {id:s.id,typicalId:s.typicalId,path,sha256:sha(path)};});
 const parts=[];const add=(id,name,cells,color,offset=[0,0,0])=>parts.push({id,name,cells,color,offset,massKg:mass(cells)});
 const bed=[box([-120,-120,-6],[L+120,W+120,0])];const n=Math.ceil(L/240),pitch=L/n;
 for(let i=0;i<=n;i++)bed.push(...tube(1,[i*pitch-25,-100,-106],[i*pitch+25,W+100,-6],4));
 for(const y of [0,W])bed.push(...tube(0,[-100,y-50,-306],[L+100,y+50,-106],6));
 add('M00','Bed: skin6 / ribs RHS100x50x4 / rails RHS200x100x6',bed,'#254f77',[0,0,-350]);
 add('M01','Near side', [box([0,-6,0],[L,0,H]),...tube(0,[0,-56,60],[L,-6,110],4)],'#326a96',[0,-300,0]);
 add('M02','Far side',[box([0,W,0],[L,W+6,H]),...tube(0,[0,W+6,60],[L,W+56,110],4)],'#326a96',[0,300,0]);
 add('M03','Left end',[box([-6,-6,0],[0,W+6,H]),...tube(1,[-56,-6,60],[-6,W+6,110],4)],'#326a96',[-300,0,0]);
 add('M04','Right end',[box([L,-6,0],[L+6,W+6,H]),...tube(1,[L+6,-6,60],[L+56,W+6,110],4)],'#326a96',[300,0,0]);
 const concrete=box([0,0,0],[L,W,H]);const all=parts.flatMap(p=>p.cells.map(c=>({part:p.id,c})));const collisions=[];
 for(let i=0;i<all.length;i++){assert.ok(!overlap(all[i].c,concrete),'steel overlaps casting');for(let j=i+1;j<all.length;j++)if(overlap(all[i].c,all[j].c))collisions.push([all[i].part,all[j].part]);}
 assert.equal(collisions.length,0);
 const checks=[];for(const p of parts.slice(1)){const direction=p.offset;const obstacles=[concrete,...parts.filter(q=>q.id!==p.id).flatMap(q=>q.cells)];const hit=p.cells.some(c=>obstacles.some(o=>swept(c,o,direction)));checks.push({id:p.id,translationMm:direction,positiveVolumeCollision:hit});assert.equal(hit,false);}
 const model={revision,family,sources,cavityMm:[L,W,H],units:'mm',parts,concreteFacesMm:faces(concrete),ribPitchMm:pitch,maxSkinClearSpanMm:pitch-50,massKgStockSum:parts.reduce((s,p)=>s+p.massKg,0),checks:{steelCastingOverlap:false,steelSteelOverlap:false,nominalTranslations:checks},missing:['Locks/cleats/fasteners and fixing holes','weld details','gaskets and tolerances','lifting hardware','foundation and whole-frame design'],engineeringApproved:false,productionReleased:false};models.push(model);
 const folder=`${out}/${family}`;fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/model.json`,JSON.stringify(model,null,2));
 const image=(data,x,y,w,h)=>`<image href="${data}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1300"><rect width="1800" height="1300" fill="white"/><g font-family="Arial" fill="#10274c"><text x="35" y="55" font-size="36" font-weight="bold">P46 | ${family} — FLOOR MOULD STRUCTURE STUDY</text><text x="35" y="95" font-size="23">Cavity ${L} x ${W} x ${H} mm | Five assemblies | Stock steel ${model.massKgStockSum.toFixed(1)} kg</text><text x="35" y="145" font-size="25">A | NOMINAL ASSEMBLY — LOCKS NOT YET MODELLED</text><text x="930" y="145" font-size="25">B | FINISHED CONCRETE — SOURCE GEOMETRY</text>`;
 svg+=image(render(parts.map(p=>({...p,offset:[0,0,0]})),850,470),20,165,850,470)+image(render([{cells:[concrete],color:'#b9babc'}],850,470),920,165,850,470);
 svg+='<text x="35" y="690" font-size="25">C | SEPARATED PARTS — OFFSETS ARE DISPLAY ONLY</text>';
 svg+=image(render(parts,1000,480),20,710,1000,480);
 const notes=['M00: casting bed + 2 support rails','M01 / M02: long-side shutters','M03 / M04: end shutters',`Rib centre pitch ${pitch.toFixed(2)} mm`,`Clear skin span ${model.maxSkinClearSpanMm.toFixed(2)} mm`,'Steel skin 6 mm; side stiffeners RHS50x50x4','Nominal side pull: 300 mm outward','Remove locks only with temporary support','LOCKS / LIFTING / WELDS: NOT DESIGNED'];
 notes.forEach((s,i)=>svg+=`<text x="1040" y="760" transform="translate(0 ${i*43})" font-size="22">${s}</text>`);
 svg+='<text x="35" y="1250" font-size="23">MODEL-DERIVED GEOMETRY STUDY — NOT FOR FABRICATION, CASTING OR LIFTING</text></g></svg>';
 if(extended)svg=svg.replace('P46 |','P51 |').replace('FLOOR MOULD','TABLE MOULD');
 fs.writeFileSync(`${folder}/01-STRUCTURE.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${folder}/01-STRUCTURE.png`);
}
assert.equal(models.flatMap(m=>m.sources).length,extended?4:5);
fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision,models:models.map(m=>({family:m.family,sources:m.sources,parts:m.parts.map(({cells,offset,color,...p})=>p),checks:m.checks})),status:'PARTIAL_TOOL_SOLIDS_NOT_COMPLETE_HARDWARE',stagePercent:50},null,2));
console.log(JSON.stringify(models.map(m=>({family:m.family,sourceSetups:m.sources.length,assemblies:m.parts.length,stockKg:m.massKgStockSum,clearSpanMm:m.maxSkinClearSpanMm,nominalPaths:m.checks.nominalTranslations.length}))));
