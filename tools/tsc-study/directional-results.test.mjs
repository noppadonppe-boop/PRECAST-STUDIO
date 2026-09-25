import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const r=await read('output/tsc-step2n-r00/directional_results.json'),old=await read(r.upstream);
const fine=await read(r.raw_sources[1]),elements=new Map(fine.elements.map(e=>[e.id,e]));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('diagnostic keeps source hashes and approval boundaries',async()=>{
  for(const [p,h]of Object.entries({...r.dependency_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(p)).digest('hex'),h,p);
  assert.equal(r.new_FEM_solves,0);assert.equal(r.criteria_changed,false);assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');
});
test('all 24 criteria reproduce prior M1 comparison without reclassification',()=>{
  for(const g of r.groups){const o=old.local_comparisons[0].groups.find(x=>x.group===g.group);assert.equal(g.all_six_targets_met,o.all_six_targets_met);assert.equal(g.points,o.points);
    g.fields.forEach((f,k)=>{near(f.point_change,o.fields[k].max_point_change);near(f.rms_change,o.fields[k].rms_change);near(f.spread,o.fields[k].max_spread_relative);assert.equal(f.failed_metrics.length===0,o.fields[k].targets_met);});}
});
test('all point-side pairs retain original stresses and actual adjacent shared-face nodes',()=>{
  assert.equal(r.points.length,490);
  for(const p of r.points){const src=fine.samples.find(x=>x.key===p.key);assert.deepEqual(p.xyz_m,src.xyz_m);assert.equal(p.pairs.length,src.sides.length*(src.sides.length-1)/2);
    const seen=new Set();for(const pair of p.pairs){seen.add(pair.elements.join('/'));const [a,b]=pair.elements.map(id=>src.sides.find(x=>x.element===id));
      for(let k=0;k<6;k++){near(pair.jump_kPa[k],Math.abs(a.local_kPa[k]-b.local_kPa[k]));near(pair.relative[k],pair.jump_kPa[k]/Math.max(Math.abs(src.mean_kPa[k]),10));}
      const [ea,eb]=pair.elements.map(id=>elements.get(id));const axes=ea.indices.map((v,k)=>v!==eb.indices[k]?k:-1).filter(k=>k>=0);
      assert.equal(pair.direction,axes.length===1?['profile','Y','thickness'][axes[0]]:'multiple');
      if(axes.length===1){assert.equal(ea.nodes.filter(n=>eb.nodes.includes(n)).length,8);const k=axes[0];near(a.natural[k],-b.natural[k]);near(Math.abs(a.natural[k]),1);}
    }assert.equal(seen.size,p.pairs.length);
  }
});
test('directional maxima are exhaustive; absence stays null rather than zero',()=>{
  for(const g of r.groups)for(const d of g.directions){const pairs=r.points.filter(p=>p.group===g.group).flatMap(p=>p.pairs.filter(v=>v.direction===d.direction));assert.equal(d.pair_count,pairs.length);if(!pairs.length)assert.equal(d.worst,null);else near(d.worst.value,Math.max(...pairs.flatMap(p=>p.relative)));}
  assert.equal(r.groups.find(g=>g.group==='base_probe').directions.find(d=>d.direction==='profile').worst,null);
});
test('web summary is compact and records renderer/report hashes',async()=>{
  const web=await read('output/tsc-step2n-r00/web_summary.json');assert.equal(web.points,undefined);assert.equal(web.drawings.length,1);assert.equal(web.engineering_approval,false);
  for(const p of ['tools/tsc-study/render_directional.mjs','output/tsc-step2n-r00/directional_results.json'])assert.equal(web.dependency_hashes[p],createHash('sha256').update(await readFile(p)).digest('hex'));
});
