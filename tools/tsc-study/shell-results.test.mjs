import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {sectionCase,threeHinge} from './compute.mjs';
const root=resolve(import.meta.dirname,'../..');
const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await read('output/tsc-step2b-r00/shell_results.json');
const b=await read('knowledge/modular-tsc-step2a/study_basis.json');
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('shell result provenance and incomplete engineering status are preserved',async()=>{
  assert.equal(r.runs.length,74);assert.equal(r.solver.version,'3.8.0');assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);
  assert.equal(r.status,'ANALYSED_QA_INCOMPLETE_NOT_FOR_DESIGN');assert.equal(r.solid_comparison,'NOT_RUN');
  for(const [p,h] of Object.entries(r.dependency_hashes))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
});
test('flat bending and membrane benchmarks plus E scaling have numerical evidence',()=>{
  const rows=r.benchmarks.cantilever;
  assert.ok(rows[2].relative_error<rows[1].relative_error&&rows[1].relative_error<rows[0].relative_error);
  assert.ok(rows[2].relative_error<.03);assert.ok(r.benchmarks.membrane.relative_error<1e-6);
  near(r.benchmarks.E_scaling.displacement_ratio,2);near(r.benchmarks.E_scaling.base_force_max_difference_kN,0);
});
test('all shell cases preserve exact physical gravity and match independent P3 reactions',()=>{
  for(const run of r.runs){
    const c=sectionCase(b,run.t_m),g=r.basis.material.density_kg_m3*r.basis.gravity_m_s2/1000;
    near(-run.total_load_6[2],g*c.shell_volume_m3+c.roof_LL_full_kN*(run.pattern==='FULL'?1:.5));
    assert.ok(run.equilibrium_relative<1e-6);assert.ok(run.interface_pair_relative<1e-6);
    if(run.joint==='P-H'){
      const expected=threeHinge(c,g,run.pattern==='FULL'?'SYMMETRIC_FULL':'LEFT_HALF_ONLY');
      near(run.base.LH[0],expected.RLx_kN);near(run.base.LH[2],expected.RLz_kN);near(run.base.RH[2],expected.RRz_kN);near(run.crown_on_half.LH[2],expected.crown_on_LH_Cz_kN);
    }
  }
});
test('raw fine mesh includes finite Gauss data, orthonormal outward local axes and six-component loads',async()=>{
  const model=await read('output/tsc-step2b-r00/T175-P-H-FULL-M3.json');
  assert.equal(model.elements.length,2560);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  for(const e of model.elements){
    near(dot(e.e1,e.e1),1);near(dot(e.e2,e.e2),1);near(dot(e.normal,e.normal),1);near(dot(e.e1,e.e2),0);
    near(e.e2[1],1);assert.ok(e.normal[2]>=-1e-9);
    assert.equal(e.gauss_resultants.length,4);assert.ok(e.gauss_resultants.every(a=>a.length===8&&a.every(Number.isFinite)));
  }
  for(const a of Object.values(model.loads))assert.equal(a.length,6);
});
test('mesh QA remains incomplete instead of treating successful solves as design approval',()=>{
  assert.equal(r.convergence.length,24);
  assert.ok(r.convergence.every(c=>c.global_targets_met));
  assert.ok(r.convergence.every(c=>!c.interior_targets_met));
  const m4=r.convergence.filter(c=>c.last_pair[1]==='M4');assert.equal(m4.length,2);
  assert.ok(m4.every(c=>c.interior_resultant_changes.Qy>.05));
});
