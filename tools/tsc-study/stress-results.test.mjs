import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const r=JSON.parse(await readFile(resolve(root,'output/tsc-step2e-r00/stress_results.json'),'utf8'));
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('local stress evidence is traceable, preserves old criteria, and is not a production approval',async()=>{
  assert.equal(r.new_FEM_solves,0);assert.equal(r.runs.length,6);
  assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);
  assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');
  assert.equal(r.prior_peak_criteria_superseded,false);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_source_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
});
test('affine reconstruction and all saved Gauss stresses agree with the displacement-based stress law',()=>{
  assert.ok(r.synthetic_checks.affine_stress_error_kPa<1e-6);assert.ok(r.synthetic_checks.inverse_mapping_error<1e-9);
  assert.equal(r.runs.reduce((s,v)=>s+v.gauss_points_checked,0),732160);
  for(const run of r.runs){assert.ok(run.gauss_reproduction_max_error_kPa<1e-6);assert.ok(run.max_inverse_mapping_residual_m<1e-9);}
});
test('all 490 physical points are common across meshes, with right-handed axes and retained one-sided values',()=>{
  const reference=r.runs[0].samples;
  for(const run of r.runs){
    assert.equal(run.samples.length,490);assert.equal(new Set(run.samples.map(p=>p.key)).size,490);
    for(let i=0;i<reference.length;i++){
      const p=run.samples[i];assert.equal(p.key,reference[i].key);assert.deepEqual(p.xyz_m,reference[i].xyz_m);
      assert.ok(p.fraction>0&&p.fraction<1);assert.ok(p.sides.length>0);
      const [s,y,n]=p.axes_s_y_n;
      const cross=[s[1]*y[2]-s[2]*y[1],s[2]*y[0]-s[0]*y[2],s[0]*y[1]-s[1]*y[0]];
      cross.forEach((v,j)=>near(v,n[j]));for(const a of [s,y,n])near(a.reduce((sum,v)=>sum+v*v,0),1);
      for(const side of p.sides){assert.ok(side.natural.every(q=>Math.abs(q)<=1+1e-7));assert.ok(side.local_kPa.every(Number.isFinite));}
      for(let k=0;k<6;k++){
        const values=p.sides.map(s=>s.local_kPa[k]);near(p.mean_kPa[k],values.reduce((a,b)=>a+b,0)/values.length);
        near(p.min_kPa[k],Math.min(...values));near(p.max_kPa[k],Math.max(...values));
      }
    }
  }
});
test('reported local diagnostics recompute from raw samples without hiding failed fields or element jumps',()=>{
  const floor=r.basis.qa_declared_before_postprocessing.stress_reference_floor_kPa;
  for(const c of r.comparisons){
    const a=r.runs.find(s=>s.pattern===c.pattern&&s.mesh==='D2'),b=r.runs.find(s=>s.pattern===c.pattern&&s.mesh==='D3');
    for(const g of c.groups){
      const ap=a.samples.filter(p=>p.group===g.group),bp=b.samples.filter(p=>p.group===g.group);
      assert.equal(bp.length,g.points);assert.equal(g.fields.length,6);
      for(const [k,v] of g.fields.entries()){
        const differences=bp.map((p,i)=>Math.abs(p.mean_kPa[k]-ap[i].mean_kPa[k]));
        const change=bp.map((p,i)=>differences[i]/Math.max(Math.abs(p.mean_kPa[k]),floor));
        const spread=bp.map(p=>(p.max_kPa[k]-p.min_kPa[k])/Math.max(Math.abs(p.mean_kPa[k]),floor));
        const rms=Math.sqrt(differences.reduce((s,v)=>s+v*v,0)/bp.length)/Math.max(Math.sqrt(bp.reduce((s,p)=>s+p.mean_kPa[k]**2,0)/bp.length),floor);
        near(v.max_point_change,Math.max(...change));near(v.max_spread_relative,Math.max(...spread));near(v.rms_change,rms);
        assert.equal(v.targets_met,v.max_point_change<=.05&&rms<=.05&&v.max_spread_relative<=.05);
      }
      assert.equal(g.all_six_targets_met,g.fields.every(f=>f.targets_met));assert.equal(g.all_six_targets_met,false);
    }
  }
});
test('symmetric FULL loading gives mirror stress with the declared continuous profile-axis signs',()=>{
  for(const run of r.runs.filter(s=>s.pattern==='FULL')){
    const byKey=new Map(run.samples.map(p=>[p.key,p]));
    for(const p of run.samples.filter(p=>p.hand==='LH')){
      const mirrored=byKey.get(p.key.replace('LH/','RH/'));
      const sign=[1,1,1,-1,-1,1];p.mean_kPa.forEach((v,k)=>near(v*sign[k],mirrored.mean_kPa[k],1e-5));
    }
  }
});
