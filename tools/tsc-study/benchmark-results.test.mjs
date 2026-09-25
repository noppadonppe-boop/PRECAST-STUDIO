import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..');
const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await read('output/tsc-step2f-r00/benchmark_results.json');
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('benchmark provenance and module/design approval remain distinct',async()=>{
  assert.equal(r.runs.length,28);assert.equal(r.runs.filter(x=>x.mapping==='consistent').length,24);
  assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);
  assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');
  assert.equal(r.status,'COUPON_BENCHMARK_NOT_FOR_DESIGN');
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.equal(createHash('sha256').update(await readFile(resolve(root,'.local-engineering-runtime/openseespywin/opensees.pyd'))).digest('hex'),r.solver.dll_sha256);
});
test('independent closed-form energy, tip and external resultants agree for all 28 runs',()=>{
  const L=1.5,b=.25,t=.175,c=t/2,I=b*t**3/12,E=28321.786532937494*1000,nu=.2;
  for(const s of r.runs){
    const M=s.case==='M',a=(1-nu**2)/E,e=(1+nu)/E;
    const tip=M?-a*L*L/(2*I):-(a*L**3/3+e*c*c*L)/I;
    const U=M?a*L/(2*I):a*L**3/(6*I)+e*b*L*4*c**5/(15*I**2);
    near(s.exact_tip_uz_mm,tip*1000);near(s.exact_energy_kNm,U,1e-12);
    const force=M?[0,0,0,0,1,0]:[0,0,-1,-b/2,L,0];
    force.forEach((v,i)=>{near(s.total_load_6[i],v);near(s.reaction_6[i],-v,1e-7);});
    near(s.volume_m3,L*b*t,1e-10);near(s.energy_kNm,s.work_energy_kNm,1e-9);
    assert.ok(s.min_jacobian_m3>0);assert.equal(s.solver_exit,0);assert.ok(s.equilibrium_relative<1e-6);assert.ok(s.gauss_reproduction_kPa<1e-6);
  }
});
test('raw exact fields, six weighted RMS metrics and node boundary conditions reproduce independently',async()=>{
  const L=1.5,b=.25,t=.175,c=t/2,I=b*t**3/12,E=28321.786532937494*1000,nu=.2;
  for(const s of r.runs){
    const raw=await read(`output/tsc-step2f-r00/${s.id}.json`);
    assert.equal(raw.elements.length,s.elements);assert.equal(Object.keys(raw.nodes).length,s.nodes);
    assert.deepEqual(raw.stress_order,['xx','yy','zz','xy','yz','zx']);
    for(const [n,[x,,z]] of Object.entries(raw.nodes)){
      near(raw.displacements[n][1],0,1e-12);
      if(x===0){
        const ux=s.case==='M'?0:((1+nu)*(1-nu/2)/E)/I*z**3/3;
        const uz=-nu*(1+nu)/E/I*z*z/2*(s.case==='M'?1:L);
        near(raw.displacements[n][0],ux,1e-12);near(raw.displacements[n][2],uz,1e-12);
      }
    }
    const err=Array(6).fill(0),ref=Array(6).fill(0);let volume=0;
    for(const e of raw.elements){
      assert.equal(e.gauss.length,s.formulation==='stdBrick'?8:27);
      for(const p of e.gauss){
        const [x,,z]=p.xyz_m;const sx=(s.case==='M'?1:L-x)*z/I,tau=s.case==='M'?0:(z*z-c*c)/(2*I);
        [sx,nu*sx,0,0,0,tau].forEach((v,i)=>near(v,p.exact_kPa[i],1e-8));
        assert.ok(p.stress_kPa.every(Number.isFinite));assert.ok(p.weight_m3>0);volume+=p.weight_m3;
        for(let k=0;k<6;k++){err[k]+=(p.stress_kPa[k]-p.exact_kPa[k])**2*p.weight_m3;ref[k]+=p.exact_kPa[k]**2*p.weight_m3;}
      }
    }
    if(s.mapping==='consistent')for(let k=0;k<6;k++){
      near(s.stress_rms_error_kPa[k],Math.sqrt(err[k]/volume),1e-7);
      near(s.stress_rms_relative[k],Math.sqrt(err[k]/volume)/Math.max(Math.sqrt(ref[k]/volume),10),1e-7);
    }else{assert.equal(s.stress_rms_relative,null);assert.equal(s.tip_error_relative,null);assert.equal(s.energy_error_relative,null);assert.equal(s.accuracy_targets_met,false);}
  }
});
test('all-six acceptance is recomputed, not inferred from tip accuracy',()=>{
  assert.ok(r.analytic_checks.constitutive_error_kPa<1e-7);assert.ok(r.analytic_checks.gradient_error<1e-9);assert.ok(r.analytic_checks.equilibrium_derivative_kPa_per_m<1e-5);
  for(const p of r.patch_checks){assert.ok(p.relative_error<1e-8);assert.ok(p.expected_stress_kPa.slice(3).every(x=>Math.abs(x)>1));}
  for(const s of r.runs.filter(v=>v.mapping==='consistent'))assert.equal(s.accuracy_targets_met,s.tip_error_relative<=.02&&s.energy_error_relative<=.02&&s.stress_rms_relative.every(v=>v<=.05));
  assert.equal(r.runs.filter(s=>s.accuracy_targets_met).length,9);
  const low=r.runs.find(s=>s.id==='stdBrick-V-Q6-consistent');assert.ok(low.tip_error_relative<.02&&low.stress_rms_relative[5]>1);
  const high=r.runs.find(s=>s.id==='20NodeBrick-V-Q6-consistent');assert.ok(high.stress_rms_relative[5]<.01);
  for(const s of r.runs.filter(v=>v.formulation==='20NodeBrick'&&v.case==='M'))assert.ok(s.stress_rms_relative.every(v=>v<1e-7));
});
test('load sensitivity compares the same mesh and retains changed-traction results, not exact-error scores',async()=>{
  for(const c of r.mapping_comparisons){
    const a=await read(`output/tsc-step2f-r00/${c.formulation}-V-${c.mesh}-consistent.json`),b=await read(`output/tsc-step2f-r00/${c.formulation}-V-${c.mesh}-equal_nodes.json`);
    assert.deepEqual(a.nodes,b.nodes);a.summary.total_load_6.forEach((v,i)=>near(v,b.summary.total_load_6[i]));
    near(c.tip_difference_relative,Math.abs(b.summary.tip_uz_mm/a.summary.tip_uz_mm-1));
    for(const reg of c.regions){
      const err=Array(6).fill(0);let vol=0;
      a.elements.forEach((e,i)=>e.gauss.forEach((p,j)=>{
        const x=p.xyz_m[0]/1.5;if(reg.region==='near'?x<.9:x<.25||x>.75)return;
        const q=b.elements[i].gauss[j];vol+=p.weight_m3;for(let k=0;k<6;k++)err[k]+=(q.stress_kPa[k]-p.stress_kPa[k])**2*p.weight_m3;
      }));
      assert.ok(vol>0);err.forEach((v,k)=>near(Math.sqrt(v/vol),reg.rms_difference_kPa[k],1e-7));
    }
  }
});
