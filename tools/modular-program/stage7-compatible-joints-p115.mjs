import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const file=process.argv[2]??'output/staad-p7-p115/pilot-mesh.json';
const mesh=JSON.parse(fs.readFileSync(file));
const source=JSON.parse(fs.readFileSync(mesh.sourcePath??'output/stage3-designs-p36/I-C1/model.json'));
const boundaries=new Map();
for(const part of mesh.parts){
 const counts=new Map();
 for(const e of mesh.elements.filter(e=>e.part===part.id))for(let i=0;i<e.nodeIds.length;i++){
  const ids=[e.nodeIds[i],e.nodeIds[(i+1)%e.nodeIds.length]].sort((a,b)=>a-b),key=ids.join(':');
  const edge=counts.get(key)??{ids,count:0};edge.count++;counts.set(key,edge);
 }
 boundaries.set(part.id,new Set([...counts.values()].filter(e=>e.count===1).flatMap(e=>e.ids)));
}
const select=(part,k,value)=>mesh.nodes.filter(n=>n.part===part.id&&boundaries.get(part.id).has(n.id)&&Math.abs(n.xyzMm[k]-value)<1e-6);
const joints=[];
function pair(group,a,b,axis,va,vb){
 const aa=select(a,axis,va),bb=select(b,axis,vb);assert(aa.length>1);assert.equal(aa.length,bb.length);
 const key=n=>n.xyzMm.filter((_,k)=>k!==axis).map(x=>x.toFixed(6)).join(',');
 const map=new Map(bb.map(n=>[key(n),n]));assert.equal(map.size,bb.length);
 const pairs=aa.map(n=>{
  const other=map.get(key(n));assert(other,`${group}: no exact transverse coordinate match`);
  const offset=other.xyzMm.map((v,k)=>v-n.xyzMm[k]);
  assert(offset.every((v,k)=>Math.abs(v-(k===axis?vb-va:0))<1e-6));
  map.delete(key(n));return {nodeA:n.id,nodeB:other.id,offsetMm:offset};
 });
 assert.equal(map.size,0);
 joints.push({id:`${group}-${joints.filter(j=>j.group===group).length+1}`,group,partA:a.id,partB:b.id,gapMm:Math.abs(vb-va),pairs,DOF:null,stiffness:null,capacity:null,connectionDetail:null});
}
const shells=source.instances.filter(p=>p.kind==='SHELL'),floors=source.instances.filter(p=>p.kind==='FLOOR');
for(const a of shells.filter(p=>p.side==='LH')){
 const b=shells.find(p=>p.side==='RH'&&Math.abs(p.boundsMm.min[1]-a.boundsMm.min[1])<1e-6);assert(b);
 pair('JO-CR',a,b,0,1490,1510);
}
for(const parts of [shells.filter(p=>p.side==='LH'),shells.filter(p=>p.side==='RH'),floors]){
 parts.sort((a,b)=>a.boundsMm.min[1]-b.boundsMm.min[1]);
 for(let i=0;i<parts.length-1;i++){
  const a=parts[i],b=parts[i+1],ya=a.boundsMm.max[1],yb=b.boundsMm.min[1];assert(Math.abs(yb-ya-15)<1e-6);
  pair(a.kind==='FLOOR'?'JO-FF':'JO-BY',a,b,1,ya,yb);
 }
}
assert.equal(joints.length,13);
const report={status:'MATCHED_BOUNDARY_COORDINATES_NOT_STRUCTURAL_CONNECTIONS',meshSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),interfaces:joints.length,nodePairs:joints.reduce((s,j)=>s+j.pairs.length,0),byGroup:Object.fromEntries(['JO-CR','JO-BY','JO-FF'].map(g=>[g,{interfaces:joints.filter(j=>j.group===g).length,nodePairs:joints.filter(j=>j.group===g).reduce((s,j)=>s+j.pairs.length,0)}])),joints,limitations:['Node pairs remain separated by actual gaps; no welding or node merging.','Paired mesh nodes do not specify bolt number or actual connector spacing.','Wall seats, END-to-floor/roof and support behaviour remain unresolved.','No loads/materials/connection stiffness/RC design or product solution.']};
fs.writeFileSync(process.argv[3]??'output/staad-p7-p115/joint-pairs.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,interfaces:report.interfaces,nodePairs:report.nodePairs,byGroup:report.byGroup},null,2));
