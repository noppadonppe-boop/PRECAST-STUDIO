import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const r=JSON.parse(await readFile(resolve(root,'output/tsc-step2c-r00/diagnostic_results.json'),'utf8'));
test('diagnostic evidence is traceable and cannot approve a building',async()=>{
  assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);
  assert.equal(r.full_bay_solid_validation,'NOT_RUN');assert.equal(r.coupon_runs.length,36);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_source_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
});
test('brick affine patch, analytic traction conditions, positive Jacobian and equilibrium',()=>{
  assert.ok(r.brick_patch.relative_error<1e-8);
  for(const c of r.coupon_runs){
    assert.ok(Number.isFinite(c.energy_kNm)&&c.energy_kNm>0);assert.ok(c.global_equilibrium_relative<1e-6);
    assert.ok(c.analytic_boundary_checks.free_radial_faces<1e-8);assert.ok(Math.abs(c.analytic_boundary_checks.net_axial_force)<1e-8);
    assert.ok(Math.abs(c.analytic_boundary_checks.moment-1)<1e-8);
    assert.ok(Math.abs(c.applied_6[4]+1.5)<1e-8);
    if(c.model==='solid')assert.ok(c.minimum_jacobian_m3>0);
  }
});
test('solid coupon convergence and through-thickness stress differ from linear-section recovery',()=>{
  for(const c of r.coupon_comparisons){
    assert.ok(c.solid_targets_met);assert.ok(c.solid_exact_energy_error<.02);assert.ok(c.energy_changes.solid<.02);
    assert.ok(c.solid_stress_rms.every(v=>v<.05));assert.ok(c.inner_stress_to_straight_nominal>1.18);
    assert.ok(c.outer_stress_to_straight_nominal<.87);
    const runs=r.coupon_runs.filter(v=>v.model==='solid'&&v.t_m===c.t_m&&v.nu===c.nu);
    assert.ok(runs[2].energy_exact_relative_error<runs[1].energy_exact_relative_error&&runs[1].energy_exact_relative_error<runs[0].energy_exact_relative_error);
  }
});
test('fixed stations retain all eight components and do not erase previous failed peak checks',()=>{
  assert.equal(r.fixed_stations.original_peak_criterion_superseded,false);
  assert.equal(r.fixed_stations.runs.length,6);
  for(const run of r.fixed_stations.runs){assert.equal(run.stations.length,5);for(const s of run.stations){assert.equal(Object.keys(s.point_values).length,3);for(const p of Object.values(s.point_values)){assert.equal(Object.keys(p).length,8);assert.ok(Object.values(p).every(Number.isFinite));}}}
  assert.ok(r.fixed_stations.comparisons.every(c=>!c.point_targets_met&&!c.integral_targets_met));
});
