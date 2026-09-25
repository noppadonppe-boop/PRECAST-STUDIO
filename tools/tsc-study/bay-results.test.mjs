import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await read('output/tsc-step2d-r00/bay_results.json');
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('Step 2D preserves provenance and does not approve local stresses or manufacture',async()=>{
  assert.equal(r.solid_runs.length,6);assert.equal(r.shell_audits.length,6);
  assert.equal(r.status,'PARTIAL_SOLID_AND_CUT_QA_NOT_FOR_DESIGN');
  assert.equal(r.local_stress_convergence,'NOT_ESTABLISHED');
  assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.ok(r.brick_patch.relative_error<1e-8);
});
test('independent physical geometry/load calculation agrees with each solid mesh',()=>{
  const B=3,H=3,R=.4,L=1.5,t=.175,gamma=2400*9.80665/1000,q=50*9.80665/1000;
  // Two walls + two exact quarter annuli + horizontal flat roof, no floor.
  const volume=L*(2*t*(H-R-t)+Math.PI/2*(R*R-(R-t)**2)+(B-2*R)*t);
  for(const s of r.solid_runs){
    const area=s.pattern==='FULL'?B*L:B*L/2;
    const LL=q*area,SW=gamma*volume,xLL=s.pattern==='FULL'?B/2:B/4;
    near(s.exact_physical_volume_m3,volume);near(s.total_load_6[2],-SW-LL);
    near(s.total_load_6[3],-(SW+LL)*L/2);near(s.total_load_6[4],SW*B/2+LL*xLL);
    assert.ok(s.min_jacobian_m3>0);assert.ok(s.minimum_gravity_nodal_fraction>=0);
    assert.ok(s.exact_load_mapping_relative<1e-6);assert.ok(s.equilibrium_relative<1e-6);
    assert.equal(s.solver_exit,0);assert.equal(s.linear_system,'SuperLU / Plain numbering');
    assert.ok(Number.isFinite(s.strain_energy_kNm)&&s.strain_energy_kNm>0);
  }
});
test('six shell reproductions and all 72 subbody cuts satisfy independently summed FBD and action/reaction',()=>{
  for(const s of r.shell_audits){assert.ok(s.reproduction_error<1e-8);assert.ok(s.nodal_load_reconstruction_max_error<1e-8);}
  for(const s of [...r.shell_audits,...r.solid_runs]){
    assert.deepEqual(s.cuts.map(c=>c.id),['W-TOP','C22.5','C45','C67.5','R-START','CROWN']);
    for(const c of s.cuts){
      assert.ok(c.fbd_relative<1e-6);assert.ok(c.pair_relative<1e-6);
      for(let k=0;k<6;k++){
        near(c.cut_on_lower_LH_6[k]+c.base_about_cut_6[k]+c.physical_load_about_cut_6[k],0);
        near(c.cut_on_lower_LH_6[k]+c.opposite_cut_6[k],0);
      }
    }
  }
});
test('global D2/D3 targets hold only for the explicitly tested quantities and load patterns',()=>{
  for(const c of r.comparisons){
    assert.deepEqual(c.solid_last_pair,['D2','D3']);assert.ok(c.global_mesh_targets_met);
    assert.ok(c.displacement_change<=.05);assert.ok(c.reaction_change<=.02);assert.ok(c.cut_change<=.05);
    const s=r.solid_runs.filter(v=>v.pattern===c.pattern);
    assert.ok(s[2].mesh_volume_error_relative<s[1].mesh_volume_error_relative&&s[1].mesh_volume_error_relative<s[0].mesh_volume_error_relative);
    assert.ok(Math.abs(c.solid_vs_shell_crown_uz_relative)<.05);
  }
});
test('raw 3D solids retain finite nodal displacements and eight six-component stress stations per brick',async()=>{
  for(const s of r.solid_runs){
    const raw=await read(`output/tsc-step2d-r00/${s.id}.json`);
    assert.equal(Object.keys(raw.nodes).length,s.nodes);assert.equal(raw.elements.length,s.elements);
    assert.deepEqual(raw.stress_order,['xx','yy','zz','xy','yz','zx']);
    for(const u of Object.values(raw.displacements)){assert.equal(u.length,3);assert.ok(u.every(Number.isFinite));}
    for(const e of raw.elements){assert.equal(e.forces.length,8);assert.equal(e.gauss_stress_kPa.length,8);for(const p of e.gauss_stress_kPa){assert.equal(p.length,6);assert.ok(p.every(Number.isFinite));}}
    // Traction-free side faces have actual nonzero lateral displacement, unlike plane-strain coupon.
    assert.ok(Object.entries(raw.nodes).some(([n,p])=>p[1]===0&&Math.abs(raw.displacements[n][1])>1e-10));
  }
});
