import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await read('output/tsc-step2g-r00/curved_results.json'),old=await read('output/tsc-step2c-r00/diagnostic_results.json');
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function stress(radius,c,nu){const [A,B,C]=c,sr=A/radius**2+B*(2*Math.log(radius)+1)+2*C,st=-A/radius**2+B*(2*Math.log(radius)+3)+2*C;return [st,sr,nu*(sr+st),0,0,0];}
test('30 curved runs preserve provenance, helper identity and all prior approval boundaries',async()=>{
  assert.equal(r.runs.length,30);assert.equal(r.comparisons.length,10);
  assert.equal(r.status,'CURVED_COUPON_BENCHMARK_NOT_FOR_DESIGN');assert.equal(r.full_bay_quadratic_validation,'NOT_RUN');assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.equal(createHash('sha256').update(await readFile(resolve(root,'.local-engineering-runtime/openseespywin/opensees.pyd'))).digest('hex'),r.solver.dll_sha256);
  for(const p of r.patch_checks)assert.ok(p.relative_error<1e-8);
});
test('independent quadrature and earlier Airy reference agree with energy, stress, traction and resultants',()=>{
  for(const s of r.runs){
    const a=.4-s.t_m,R=.4,nu=s.nu,E=28321.786532937494*1000;
    near(stress(a,s.airy_coefficients,nu)[1],0);near(stress(R,s.airy_coefficients,nu)[1],0);
    let energy=0,force=0,moment=0;const N=1024,dr=s.t_m/N;
    for(let i=0;i<=N;i++){
      const x=a+i*dr,[st,sr]=stress(x,s.airy_coefficients,nu),w=dr/3*(i===0||i===N?1:i%2?4:2);
      force+=w*st;moment+=w*x*st;energy+=w*x*((1-nu*nu)*(sr*sr+st*st)-2*nu*(1+nu)*sr*st)*1.5*Math.PI/2/(2*E);
    }
    near(force,0,1e-8);near(moment,1,1e-8);near(energy,s.exact_energy_kNm,1e-12);
    const previous=old.coupon_comparisons.find(c=>c.t_m===s.t_m&&c.nu===s.nu);
    for(const p of previous.exact_stress_profile){const v=stress(p.radius_m,s.airy_coefficients,nu);near(v[0],p.tt_kPa,1e-7);near(v[1],p.rr_kPa,1e-7);}
    [0,0,0,0,-1.5,0].forEach((v,i)=>{near(s.applied_6[i],v);near(s.reaction_6[i],-v,1e-7);});
    near(s.energy_kNm,s.work_energy_kNm,1e-9);near(s.exact_volume_m3,1.5*Math.PI/4*(R*R-a*a));
    assert.ok(s.reference_checks.constitutive_fd_error_kPa<1e-4&&s.reference_checks.divergence_fd_kPa_m<1e-4);
    assert.ok(s.min_jacobian_m3>0&&s.equilibrium_relative<1e-6&&s.stress_reproduction_kPa<1e-6);assert.equal(s.solver_exit,0);
  }
});
test('raw Gauss values and all 45 fixed physical points reproduce six metrics without hiding one-sided shear',async()=>{
  for(const s of r.runs){
    const raw=await read(`output/tsc-step2g-r00/${s.id}.json`);assert.equal(raw.elements.length,s.elements);assert.equal(Object.keys(raw.nodes).length,s.nodes);assert.equal(raw.samples.length,45);
    assert.deepEqual(raw.stress_order,['tt','rr','yy','rt','ry','ty']);
    const err=Array(6).fill(0),ref=Array(6).fill(0);let vol=0;
    for(const e of raw.elements){
      assert.equal(e.gauss.length,s.element==='stdBrick'?8:27);
      for(const p of e.gauss){
        const expected=stress(Math.hypot(p.xyz_m[0],p.xyz_m[2]),s.airy_coefficients,s.nu);expected.forEach((v,i)=>near(v,p.exact_kPa[i],1e-7));
        assert.ok(p.weight_m3>0&&p.local_kPa.every(Number.isFinite));vol+=p.weight_m3;
        for(let i=0;i<6;i++){err[i]+=(p.local_kPa[i]-expected[i])**2*p.weight_m3;ref[i]+=expected[i]**2*p.weight_m3;}
      }
    }
    near(vol,s.volume_m3);err.forEach((v,i)=>near(Math.sqrt(v/vol)/Math.max(Math.sqrt(ref[i]/vol),10),s.gauss_rms_relative[i],1e-7));
    const e2=Array(6).fill(0),r2=Array(6).fill(0),point=Array(6).fill(0),spread=Array(6).fill(0);let ue=0,ur=0;
    for(const p of raw.samples){
      const radius=.4-s.t_m+s.t_m*p.fraction,theta=p.theta_deg*Math.PI/180;
      [radius*Math.cos(theta),p.y_m,radius*Math.sin(theta)].forEach((v,i)=>near(v,p.xyz_m[i],1e-12));
      const exact=stress(radius,s.airy_coefficients,s.nu);exact.forEach((v,i)=>near(v,p.exact_kPa[i],1e-8));
      for(let i=0;i<6;i++){
        const values=p.sides.map(v=>v.local_kPa[i]),mean=values.reduce((a,b)=>a+b,0)/values.length;
        near(mean,p.mean_kPa[i]);near(Math.min(...values),p.min_kPa[i]);near(Math.max(...values),p.max_kPa[i]);
        e2[i]+=(mean-exact[i])**2;r2[i]+=exact[i]**2;point[i]=Math.max(point[i],Math.abs(mean-exact[i])/Math.max(Math.abs(exact[i]),10));spread[i]=Math.max(spread[i],(p.max_kPa[i]-p.min_kPa[i])/Math.max(Math.abs(exact[i]),10));
      }
      ue=Math.max(ue,Math.hypot(...p.displacement_m.map((v,i)=>v-p.exact_displacement_m[i])));ur=Math.max(ur,Math.hypot(...p.exact_displacement_m));
    }
    for(let i=0;i<6;i++){near(Math.sqrt(e2[i]/45)/Math.max(Math.sqrt(r2[i]/45),10),s.fixed_rms_relative[i],1e-8);near(point[i],s.fixed_max_point_relative[i]);near(spread[i],s.fixed_spread_relative[i]);}
    near(ue/ur,s.sample_displacement_error_relative);assert.ok(s.max_inverse_residual_m<1e-9);
  }
});
test('geometry comparison retains identical chord volumes, positive Jacobians and quadratic refinement gains',()=>{
  for(const t of [.15,.175,.2])for(const mesh of ['G1','G2','G3']){
    const [h8,h20,curve]=['H8-CHORD','H20-CHORD','H20-CURVED'].map(model=>r.runs.find(s=>s.model===model&&s.t_m===t&&s.nu===.2&&s.mesh===mesh));
    near(h8.volume_m3,h20.volume_m3,1e-12);near(h8.sampled_radial_geometry_error_mm,h20.sampled_radial_geometry_error_mm,1e-9);
    assert.ok(h20.nodes>h8.nodes);assert.ok(curve.volume_error_relative<h20.volume_error_relative);assert.ok(curve.sampled_radial_geometry_error_mm<h20.sampled_radial_geometry_error_mm);
  }
});
test('all acceptance metrics and last-pair criteria recompute and do not approve full-bay stress',()=>{
  for(const s of r.runs){
    const pass=s.energy_error_relative<=.02&&s.sample_displacement_error_relative<=.02&&s.volume_error_relative<=.001&&[s.gauss_rms_relative,s.fixed_rms_relative,s.fixed_max_point_relative,s.fixed_spread_relative].every(a=>a.every(v=>v<=.05));assert.equal(s.accuracy_targets_met,pass);
  }
  for(const c of r.comparisons){const pair=r.runs.filter(s=>s.model===c.model&&s.t_m===c.t_m&&s.nu===c.nu).slice(-2);near(c.energy_change,Math.abs(pair[1].energy_kNm/pair[0].energy_kNm-1));assert.equal(c.all_targets_met,pair[1].accuracy_targets_met&&c.energy_change<=.02);}
  assert.equal(r.comparisons.filter(c=>c.all_targets_met).length,7);assert.ok(r.comparisons.filter(c=>c.model==='H8-CHORD').every(c=>!c.all_targets_met));
});
