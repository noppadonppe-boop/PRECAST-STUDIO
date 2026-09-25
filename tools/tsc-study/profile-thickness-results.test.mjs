import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),load=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await load('output/tsc-step2k-r00/profile_thickness_verified.json'),web=await load('output/tsc-step2k-r00/web_summary.json');
const raw=m=>load(`output/tsc-step2k-r00/PT-T175-FR-FULL-${m}.json`),near=(a,b,t=1e-7)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<t,`${a} != ${b}`);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
test('S2K hashes, runtime and non-design scope remain traceable',async()=>{
  assert.deepEqual(r.runs.map(v=>v.mesh),['KP','KT']);assert.equal(r.reference_run.mesh,'H4');assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');
  for(const v of [r,web]){assert.equal(v.engineering_approval,false);assert.equal(v.manufacturing_release,false);}
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes,...web.dependency_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.equal(createHash('sha256').update(await readFile(resolve(root,'.local-engineering-runtime/openseespywin/opensees.pyd'))).digest('hex'),r.solver.dll_sha256);
  assert.equal(web.traction[0].cuts[0].traces.lower.order6.face_contributions,undefined);assert.equal(web.drawings.length,2);
});
test('directional meshes keep geometry, free Y and original support, without changing thickness',async()=>{
  for(const s of r.runs){const v=await raw(s.mesh),kp=s.mesh==='KP';assert.equal(s.elements,kp?15552:15360);assert.equal(s.nodes,kp?73557:70753);assert.equal(s.t_m,.175);assert.equal(s.pattern,'FULL');assert.equal(s.mesh_knots.arc_divisions,kp?32:24);assert.equal(s.mesh_knots.through_thickness,kp?6:8);assert.equal(s.mesh_knots.wall_z_m.length,kp?28:26);assert.equal(s.mesh_knots.y_m.length,17);
    const regions={};for(const e of v.elements.filter(e=>e.hand==='LH'&&e.indices[1]===0&&e.indices[2]===0))regions[e.region]=(regions[e.region]||0)+1;
    assert.deepEqual(regions,{wall:kp?27:25,shoulder:kp?32:24,roof:kp?22:11});
    assert.equal(Object.keys(v.nodes).length,s.nodes);assert.equal(v.elements.length,s.elements);
    for(const ids of Object.values(v.bases)){for(const n of ids){near(v.nodes[n][2],.175,1e-12);near(v.displacements[n][0],0,1e-15);near(v.displacements[n][2],0,1e-15);}assert.ok(ids.some(n=>Math.abs(v.displacements[n][1])>1e-10));}
    const keys=new Set(Object.values(v.nodes).map(p=>p.map(x=>x.toFixed(10)).join('/')));assert.equal(keys.size,s.nodes,'No duplicated disconnected interface nodes');
    assert.ok(s.min_jacobian_m3>0);assert.ok(s.mesh_volume_error_relative<1e-5);assert.ok(s.gauss_reproduction_kPa<1e-6);assert.equal(s.gauss_points_checked,27*s.elements);
  }
});
test('independent load, reaction and energy sums agree with physical volume and 12 cut FBDs',async()=>{
  const t=.175,R=.4,L=1.5,volume=2*L*(t*(3-R-t)+Math.PI*(R*R-(R-t)**2)/4+t*(1.5-R)),W=volume*23.53596+.4903325*4.5;
  for(const s of r.runs){const v=await raw(s.mesh),F=Array(6).fill(0),RF=Array(6).fill(0);let work=0;
    for(const [n,f] of Object.entries(v.loads)){f.forEach((x,k)=>F[k]+=x);cross(v.nodes[n],f).forEach((x,k)=>F[k+3]+=x);work+=dot(f,v.displacements[n])/2;}
    for(const [n,f] of Object.entries(v.reactions)){f.forEach((x,k)=>RF[k]+=x);cross(v.nodes[n],f).forEach((x,k)=>RF[k+3]+=x);}
    F.forEach((x,k)=>{near(x,s.total_load_6[k]);near(x+RF[k],0,1e-6);});near(work,s.strain_energy_kNm,1e-10);near(s.exact_physical_volume_m3,volume,1e-11);near(s.exact_physical_load_6[2],-W);assert.ok(s.physical_load_mapping_relative<1e-5);
    assert.equal(s.cuts.length,6);for(const c of s.cuts)for(let k=0;k<6;k++){near(c.cut_on_lower_LH_6[k]+c.opposite_cut_6[k],0,1e-7);near(c.cut_on_lower_LH_6[k]+c.base_about_cut_6[k]+c.physical_load_about_cut_6[k],0,1e-6);}
  }
});
test('same 490 physical samples and six-field local comparisons preserve failed results',async()=>{
  const ref=await load(r.basis.reference);
  for(const s of r.runs){const v=await raw(s.mesh);assert.equal(v.samples.length,490);for(let i=0;i<490;i++){assert.equal(v.samples[i].key,ref.samples[i].key);assert.deepEqual(v.samples[i].xyz_m,ref.samples[i].xyz_m);assert.deepEqual(v.samples[i].axes_s_y_n,ref.samples[i].axes_s_y_n);}}
  assert.equal(r.local_comparisons.length,2);for(const c of r.local_comparisons){assert.equal(c.groups.length,4);for(const g of c.groups){assert.equal(g.fields.length,6);for(const f of g.fields)assert.equal(f.targets_met,f.max_point_change<=.05&&f.rms_change<=.05&&f.max_spread_relative<=.05);assert.equal(g.all_six_targets_met,g.fields.every(f=>f.targets_met));}}
});
test('traction face contributions, quadrature and all six acceptance fields are recomputed',()=>{
  for(const s of [r.reference_run,...r.runs])for(const c of s.cuts){const angle={'W-TOP':0,'C22.5':22.5,'C45':45,'C67.5':67.5,'R-START':90}[c.id];const expected=c.id==='CROWN'?[1.5,.75,2.9125]:[.4-.3125*Math.cos(angle*Math.PI/180),.75,2.6+.3125*Math.sin(angle*Math.PI/180)];expected.forEach((v,k)=>near(v,c.origin_m[k],1e-12));}
  assert.equal(r.physical_cut_patch_checks.length,3);assert.ok(r.physical_cut_patch_checks.every(v=>v.max_resultant_error<1e-7));
  assert.equal(r.traction_runs.length,3);assert.ok(r.affine_traction_patch.max_resultant_error<1e-7);
  for(const run of r.traction_runs){assert.equal(run.cuts.length,6);for(const c of run.cuts){let ok=true;
    for(const side of ['lower','upper']){const tr=c.traces[side],ref=side==='lower'?c.nodal_lower_6:c.nodal_upper_6;
      for(const order of ['order4','order6']){const v=tr[order];near(v.face_contributions.reduce((s,x)=>s+x.area_m2,0),.2625,1e-10);for(let k=0;k<6;k++)near(v.face_contributions.reduce((s,x)=>s+x.resultant_6[k],0),v.resultant_6[k]);}
      for(let k=0;k<6;k++){const rel=Math.abs(tr.order6.resultant_6[k]-ref[k])/Math.max(Math.abs(ref[k]),.1),quad=Math.abs(tr.order6.resultant_6[k]-tr.order4.resultant_6[k])/Math.max(Math.abs(c.nodal_lower_6[k]),.1);near(rel,tr.relative_vs_nodal_6[k]);near(quad,tr.quadrature_change_6[k]);ok&&=rel<=.05&&quad<=1e-6;}
    }
    for(let k=0;k<6;k++){const sum=c.traces.lower.order6.resultant_6[k]+c.traces.upper.order6.resultant_6[k],rel=Math.abs(sum)/Math.max(Math.abs(c.nodal_lower_6[k]),.1);near(sum,c.trace_pair_sum_6[k]);near(rel,c.trace_pair_relative_6[k]);ok&&=rel<=.05;}assert.equal(c.targets_met,ok);
  }}
});
