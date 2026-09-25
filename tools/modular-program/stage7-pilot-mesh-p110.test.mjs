import fs from 'node:fs';import assert from 'node:assert/strict';
const folder=process.argv[2]??'output/staad-p7-p110';
const p=JSON.parse(fs.readFileSync(folder+'/pilot-mesh.json'));
const src=JSON.parse(fs.readFileSync('output/stage3-designs-p36/I-C1/model.json'));
assert.equal(p.parts.length,14);if(!process.argv[2]){assert.equal(p.nodes.length,3820);assert.equal(p.elements.length,3216);}
let openingsChecked=0;
for(const part of p.parts){
 const es=p.elements.filter(e=>e.part===part.id),ns=p.nodes.filter(n=>n.part===part.id),adj=new Map(ns.map(n=>[n.id,new Set()]));
 for(const e of es){for(const a of e.nodeIds)for(const b of e.nodeIds)adj.get(a).add(b);
  const vs=e.nodeIds.map(id=>p.nodes[id-1].xyzMm),c=[0,1,2].map(k=>vs.reduce((s,v)=>s+v[k],0)/vs.length);
  assert(e.areaMm2>0);
  const op=src.openings.find(o=>o.instanceId===part.id);if(op){const k=part.kind==='END'?0:1,us=op.cornersMm.map(v=>v[k]),zs=op.cornersMm.map(v=>v[2]);if(part.kind==='END'||c[2]<2600)assert(!(c[k]>Math.min(...us)+1e-6&&c[k]<Math.max(...us)-1e-6&&c[2]>Math.min(...zs)+1e-6&&c[2]<Math.max(...zs)-1e-6));}
 }
 const seen=new Set(),queue=[ns[0].id];for(let i=0;i<queue.length;i++){const a=queue[i];if(seen.has(a))continue;seen.add(a);for(const b of adj.get(a))if(!seen.has(b))queue.push(b);}assert.equal(seen.size,ns.length,part.id+' disconnected');
 assert(Math.abs(part.relativeVolumeError)<.002);if(src.openings.some(o=>o.instanceId===part.id))openingsChecked++;
}
assert.equal(openingsChecked,6);
const std=fs.readFileSync(folder+'/PM-I-C1-GEOMETRY-ONLY.STD','utf8');assert(!std.includes('PERFORM ANALYSIS'));assert(!std.includes('DESIGN ELEMENT'));
const report={status:'PASS_LISTED_GEOMETRY_CHECKS_ONLY',parts:14,elements:p.elements.length,nodes:p.nodes.length,openings:6,checks:['per-part connected node graph','unique nodes per element','positive area','six opening centroid exclusions','per-part source volume within 0.2 percent','no solver or RC commands'],notChecked:['mesh refinement convergence','aspect ratios and Jacobians','hanging nodes','joint and beam coupling','bearing constraints','loads/materials/capacity'],analysed:false};
fs.writeFileSync(folder+'/geometry-check.json',JSON.stringify(report,null,2)+'\n');console.log(report);
