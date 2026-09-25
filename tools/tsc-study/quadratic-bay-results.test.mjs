import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),load=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await load('output/tsc-step2h-r00/quadratic_bay_followup.json'),initial=await load('output/tsc-step2h-r00/quadratic_bay_results.json');
const raw=run=>load(`output/tsc-step2h-r00/${run.id}.json`),near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const transpose=a=>a[0].map((_,i)=>a.map(row=>row[i])),mm=(a,b)=>a.map(row=>transpose(b).map(col=>dot(row,col)));
const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],edges=[[0,-1,-1],[1,0,-1],[0,1,-1],[-1,0,-1],[0,-1,1],[1,0,1],[0,1,1],[-1,0,1],[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]];
function N(q){return [...corners.map(s=>s.reduce((p,v,i)=>p*(1+v*q[i]),1)*(dot(s,q)-2)/8),...edges.map(s=>{const k=s.indexOf(0);return (1-q[k]**2)*s.reduce((p,v,i)=>p*(i===k?1:1+v*q[i]),1)/4;})];}
function stress(p,u,q){
  const h=1e-5,D=transpose(q.map((_,i)=>{const a=q.map((v,k)=>v+(i===k?h:0)),b=q.map((v,k)=>v-(i===k?h:0));return N(a).map((v,k)=>(v-N(b)[k])/(2*h));}));
  const J=mm(transpose(p),D),cols=transpose(J),det=dot(cols[0],cross(cols[1],cols[2]));assert.ok(det>0);
  const inv=[cross(cols[1],cols[2]),cross(cols[2],cols[0]),cross(cols[0],cols[1])].map(row=>row.map(v=>v/det));
  const G=mm(mm(transpose(u),D),inv),E=r.basis.material.E_MPa*1000,nu=r.basis.material.nu,mu=E/(2*(1+nu)),lambda=E*nu/((1+nu)*(1-2*nu)),trace=G[0][0]+G[1][1]+G[2][2];
  return G.map((row,i)=>row.map((v,j)=>mu*(v+G[j][i])+(i===j?lambda*trace:0)));
}
test('eight quadratic runs preserve six-run history, fingerprints, declared criteria and approval boundaries',async()=>{
  assert.equal(r.runs.length,8);assert.equal(initial.runs.length,6);assert.deepEqual(r.initial_local_comparisons,initial.local_comparisons);
  assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');
  assert.equal(r.basis.qa_declared_before_solving.max_point_relative_change,.05);assert.deepEqual(r.followup.comparison_pair,['H3','H4']);assert.ok(r.patch_checks[0].relative_error<1e-8);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.equal(createHash('sha256').update(await readFile(resolve(root,'.local-engineering-runtime/openseespywin/opensees.pyd'))).digest('hex'),r.solver.dll_sha256);
});
test('independent circular geometry and nodal resultants verify gravity, LL, equilibrium, work and free Y response',async()=>{
  const t=.175,R=.4,L=1.5,B=3,wall=t*(3-R-t),curve=Math.PI*(R**2-(R-t)**2)/4,roof=t*(B/2-R),volume=2*L*(wall+curve+roof),gamma=2400*9.80665/1000,q=50*9.80665/1000;
  for(const run of r.runs){
    const a=await raw(run),F=Array(6).fill(0),RF=Array(6).fill(0);let work=0;
    for(const [n,v] of Object.entries(a.loads)){const m=cross(a.nodes[n],v);v.forEach((x,i)=>F[i]+=x);m.forEach((x,i)=>F[i+3]+=x);work+=dot(v,a.displacements[n])/2;}
    for(const [n,v] of Object.entries(a.reactions)){v.forEach((x,i)=>RF[i]+=x);cross(a.nodes[n],v).forEach((x,i)=>RF[i+3]+=x);}
    F.forEach((v,i)=>{near(v,run.total_load_6[i]);near(v+RF[i],0,1e-6);});near(work,run.strain_energy_kNm,1e-10);near(volume,run.exact_physical_volume_m3,1e-11);assert.ok(run.mesh_volume_error_relative<1e-5);
    const area=run.pattern==='FULL'?B*L:B*L/2,LL=q*area,LLx=run.pattern==='FULL'?1.5:.75,W=volume*gamma;
    near(run.exact_physical_load_6[2],-W-LL);near(run.exact_physical_load_6[4],W*1.5+LL*LLx);assert.ok(run.physical_load_mapping_relative<1e-5);
    assert.ok(Object.values(a.displacements).some(v=>Math.abs(v[1])>1e-10));
    for(const tags of Object.values(a.bases))for(const n of tags){near(a.displacements[n][0],0,1e-15);near(a.displacements[n][2],0,1e-15);}
    assert.ok(run.min_jacobian_m3>0);assert.ok(run.gauss_reproduction_kPa<1e-6);assert.ok(run.energy_work_relative<1e-6);
  }
});
test('all 48 subbody cut equations and action/reaction pairs retain consistent-load accounting',()=>{
  for(const run of r.runs)for(const c of run.cuts){
    for(let k=0;k<6;k++){near(c.cut_on_lower_LH_6[k]+c.base_about_cut_6[k]+c.physical_load_about_cut_6[k],0,1e-6);near(c.cut_on_lower_LH_6[k]+c.opposite_cut_6[k],0,1e-6);}
    assert.ok(c.fbd_relative<1e-6);assert.ok(c.pair_relative<1e-6);assert.ok(c.mapping_difference_relative<1e-5);
  }
});
test('490 common points, one-sided fields and independent finite-difference shape recovery agree',async()=>{
  const ref=(await load('output/tsc-step2e-r00/STRESS-SOLID-T175-FR-FULL-D3.json')).samples;
  for(const run of r.runs){
    const a=await raw(run);assert.equal(a.samples.length,490);assert.equal(a.elements.length,run.elements);assert.equal(run.gauss_points_checked,a.elements.length*27);
    for(let i=0;i<a.samples.length;i++){
      const p=a.samples[i];assert.equal(p.key,ref[i].key);assert.deepEqual(p.xyz_m,ref[i].xyz_m);assert.deepEqual(p.axes_s_y_n,ref[i].axes_s_y_n);assert.ok(p.sides.length>0);
      for(let k=0;k<6;k++){const v=p.sides.map(s=>s.local_kPa[k]);near(p.mean_kPa[k],v.reduce((a,b)=>a+b,0)/v.length);near(p.min_kPa[k],Math.min(...v));near(p.max_kPa[k],Math.max(...v));}
      if(i%23===0)for(const s of p.sides){const e=a.elements[s.element-1],coords=e.nodes.map(n=>a.nodes[n]),u=e.nodes.map(n=>a.displacements[n]);const loc=mm(mm(p.axes_s_y_n,stress(coords,u,s.natural)),transpose(p.axes_s_y_n));const values=[loc[0][0],loc[1][1],loc[2][2],loc[0][1],loc[0][2],loc[1][2]];values.forEach((v,k)=>near(v,s.local_kPa[k],2e-4));const xyz=mm([N(s.natural)],coords)[0];xyz.forEach((v,k)=>near(v,p.xyz_m[k],1e-9));}
    }
    for(const e of a.elements){assert.equal(e.nodes.length,20);assert.equal(e.gauss_stress_kPa.length,27);assert.ok(e.gauss_stress_kPa.every(p=>p.length===6&&p.every(Number.isFinite)));}
    for(let i=0;i<a.elements.length;i+=Math.max(1,Math.floor(a.elements.length/23))){const e=a.elements[i],T=stress(e.nodes.map(n=>a.nodes[n]),e.nodes.map(n=>a.displacements[n]),[0,0,0]);[T[0][0],T[1][1],T[2][2],T[0][1],T[1][2],T[2][0]].forEach((v,k)=>near(v,e.gauss_stress_kPa[26][k],2e-4));}
    if(run.pattern==='FULL'){const byKey=new Map(a.samples.map(p=>[p.key,p]));for(const p of a.samples.filter(p=>p.hand==='LH')){const m=byKey.get(p.key.replace('LH/','RH/'));p.mean_kPa.forEach((v,k)=>near(v*[1,1,1,-1,-1,1][k],m.mean_kPa[k],1e-5));}}
  }
});
test('both mesh-pair local criteria recompute without dropping failed components or weakening thresholds',async()=>{
  for(const comparison of [...r.initial_local_comparisons,...r.local_comparisons]){
    const a=await raw(r.runs.find(s=>s.pattern===comparison.pattern&&s.mesh===comparison.pair[0])),b=await raw(r.runs.find(s=>s.pattern===comparison.pattern&&s.mesh===comparison.pair[1]));
    for(const group of comparison.groups){
      const ap=a.samples.filter(s=>s.group===group.group),bp=b.samples.filter(s=>s.group===group.group);assert.equal(bp.length,group.points);
      group.fields.forEach((f,k)=>{const d=bp.map((s,i)=>Math.abs(s.mean_kPa[k]-ap[i].mean_kPa[k])),point=bp.map((s,i)=>d[i]/Math.max(Math.abs(s.mean_kPa[k]),10)),spread=bp.map(s=>(s.max_kPa[k]-s.min_kPa[k])/Math.max(Math.abs(s.mean_kPa[k]),10)),rms=Math.sqrt(dot(d,d)/bp.length)/Math.max(Math.sqrt(bp.reduce((s,v)=>s+v.mean_kPa[k]**2,0)/bp.length),10);
        near(f.max_point_change,Math.max(...point));near(f.max_spread_relative,Math.max(...spread));near(f.rms_change,rms);assert.equal(f.targets_met,Math.max(...point)<=.05&&Math.max(...spread)<=.05&&rms<=.05);});
      assert.equal(group.all_six_targets_met,group.fields.every(f=>f.targets_met));
    }
  }
  assert.equal(r.local_comparisons.flatMap(c=>c.groups).filter(g=>g.all_six_targets_met).length,0);
});
test('global convergence is recomputed separately from unavailable whole-model local convergence',()=>{
  for(const c of [...r.initial_global_comparisons,...r.global_comparisons]){
    const a=r.runs.find(v=>v.pattern===c.pattern&&v.mesh===c.pair[0]),b=r.runs.find(v=>v.pattern===c.pattern&&v.mesh===c.pair[1]);
    near(c.displacement_change,Math.abs(b.max_displacement_mm-a.max_displacement_mm)/Math.max(Math.abs(b.max_displacement_mm),.001));near(c.energy_change,Math.abs(b.strain_energy_kNm/a.strain_energy_kNm-1));
    const reaction=Math.max(...['LH','RH'].flatMap(h=>[0,2,4].map(k=>Math.abs(b.base[h][k]-a.base[h][k])/Math.max(Math.abs(b.base[h][k]),.1))));const cut=Math.max(...b.cuts.flatMap((v,i)=>[0,2,4].map(k=>Math.abs(v.cut_on_lower_LH_6[k]-a.cuts[i].cut_on_lower_LH_6[k])/Math.max(Math.abs(v.cut_on_lower_LH_6[k]),.1))));near(c.reaction_change,reaction);near(c.cut_change,cut);assert.equal(c.selected_global_targets_met,c.displacement_change<=.05&&reaction<=.02&&cut<=.05&&c.energy_change<=.02);
  }
});
