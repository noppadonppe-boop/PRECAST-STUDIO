import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),load=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
const r=await load('output/tsc-step2i-r00/local_mesh_results.json'),a=await load('output/tsc-step2i-r00/traction_results.json'),web=await load('output/tsc-step2i-r00/web_summary.json');
const raw=mesh=>load(mesh==='H4'?'output/tsc-step2h-r00/QSB-T175-FR-FULL-H4.json':`output/tsc-step2i-r00/LOCAL-T175-FR-FULL-${mesh}.json`);
const near=(a,b,t=1e-7)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<t,`${a} != ${b}`),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],transpose=a=>a[0].map((_,i)=>a.map(v=>v[i])),mm=(a,b)=>a.map(row=>transpose(b).map(col=>dot(row,col)));
const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],edges=[[0,-1,-1],[1,0,-1],[0,1,-1],[-1,0,-1],[0,-1,1],[1,0,1],[0,1,1],[-1,0,1],[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]];
function N(q){return [...corners.map(s=>s.reduce((p,v,i)=>p*(1+v*q[i]),1)*(dot(s,q)-2)/8),...edges.map(s=>{const k=s.indexOf(0);return (1-q[k]**2)*s.reduce((p,v,i)=>p*(i===k?1:1+v*q[i]),1)/4;})];}
function recovery(p,u,q){
  const h=1e-5,D=transpose(q.map((_,i)=>{const aa=N(q.map((v,k)=>v+(i===k?h:0))),bb=N(q.map((v,k)=>v-(i===k?h:0)));return aa.map((v,k)=>(v-bb[k])/(2*h));}));
  const J=mm(transpose(p),D),cols=transpose(J),det=dot(cols[0],cross(cols[1],cols[2]));assert.ok(det>0);
  const inv=[cross(cols[1],cols[2]),cross(cols[2],cols[0]),cross(cols[0],cols[1])].map(row=>row.map(v=>v/det)),G=mm(mm(transpose(u),D),inv),E=r.inherited_basis.material.E_MPa*1000,nu=r.inherited_basis.material.nu,mu=E/(2*(1+nu)),lambda=E*nu/((1+nu)*(1-2*nu)),trace=G[0][0]+G[1][1]+G[2][2];
  return {J,T:G.map((row,i)=>row.map((v,j)=>mu*(v+G[j][i])+(i===j?lambda*trace:0))),xyz:mm([N(q)],p)[0]};
}
test('S2I preserves fingerprints, FULL-only scope, previous baseline and unapproved status',async()=>{
  assert.equal(r.runs.length,3);assert.deepEqual(r.runs.map(v=>v.mesh),['IB','IY','IBY']);assert.ok(r.runs.every(v=>v.pattern==='FULL'));assert.equal(a.runs.length,11);assert.equal(a.new_FEM_solves,0);
  for(const v of [r,a,web]){assert.equal(v.engineering_approval,false);assert.equal(v.manufacturing_release,false);}
  assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');assert.equal(r.reference_run.id,'QSB-T175-FR-FULL-H4');assert.deepEqual(r.basis.new_patterns,['FULL']);assert.ok(r.patch_checks[0].relative_error<1e-8);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes,...a.dependency_hashes,...a.raw_output_hashes,...web.dependency_hashes,...web.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.equal(createHash('sha256').update(await readFile(resolve(root,'.local-engineering-runtime/openseespywin/opensees.pyd'))).digest('hex'),r.solver.dll_sha256);
  assert.equal(web.traction.runs[0].cuts[0].traces.lower.order6.face_contributions,undefined);assert.equal(web.drawings.length,2);
});
test('directional knot counts, independent geometry/resultants/work and original support constraints agree',async()=>{
  const t=.175,R=.4,L=1.5,B=3,volume=2*L*(t*(3-R-t)+Math.PI*(R**2-(R-t)**2)/4+t*(B/2-R)),W=volume*2400*9.80665/1000,LL=50*9.80665/1000*B*L;
  for(const run of r.runs){const v=await raw(run.mesh),k=run.mesh_knots,base=run.mesh!=='IY',edge=run.mesh!=='IB';assert.equal(k.wall_z_m.length,base?35:26);assert.equal(k.y_m.length,edge?25:17);assert.equal(k.arc_divisions,24);assert.equal(k.through_thickness,6);assert.equal(run.elements,2*(k.wall_z_m.length-1+24+11)*(k.y_m.length-1)*6);assert.equal(run.nodes,Object.keys(v.nodes).length);assert.equal(run.boundary_conditions_changed,false);
    for(let i=0;i<k.wall_z_m.length-1;i++)near(k.wall_z_m[i+1]-k.wall_z_m[i],base&&i<12?.02425:.097,1e-12);
    for(let i=0;i<k.y_m.length;i++)near(k.y_m[i]+k.y_m.at(-1-i),L,1e-12);near(k.y_m[1],edge?.0234375:.09375,1e-12);
    const F=Array(6).fill(0),RF=Array(6).fill(0);let work=0;
    for(const [n,f] of Object.entries(v.loads)){f.forEach((x,i)=>F[i]+=x);cross(v.nodes[n],f).forEach((x,i)=>F[i+3]+=x);work+=dot(f,v.displacements[n])/2;}
    for(const [n,f] of Object.entries(v.reactions)){f.forEach((x,i)=>RF[i]+=x);cross(v.nodes[n],f).forEach((x,i)=>RF[i+3]+=x);}
    F.forEach((x,i)=>{near(x,run.total_load_6[i]);near(x+RF[i],0,1e-6);});near(work,run.strain_energy_kNm,1e-10);near(run.exact_physical_volume_m3,volume,1e-11);near(run.exact_physical_load_6[2],-W-LL);near(run.exact_physical_load_6[4],(W+LL)*1.5);
    assert.ok(run.min_jacobian_m3>0);assert.ok(run.mesh_volume_error_relative<1e-5);assert.ok(run.gauss_reproduction_kPa<1e-6);assert.ok(run.energy_work_relative<1e-6);assert.ok(run.physical_load_mapping_relative<1e-5);
    for(const tags of Object.values(v.bases)){for(const n of tags){near(v.displacements[n][0],0,1e-15);near(v.displacements[n][2],0,1e-15);}const datum=tags.find(n=>Math.abs(v.nodes[n][1]-.75)<1e-10&&Math.min(Math.abs(v.nodes[n][0]-.0875),Math.abs(v.nodes[n][0]-2.9125))<1e-10);assert.ok(datum);near(v.displacements[datum][1],0,1e-15);assert.ok(tags.some(n=>Math.abs(v.displacements[n][1])>1e-10));}
  }
});
test('all 18 new subbody cuts retain consistent loads and action/reaction in six components',()=>{
  for(const run of r.runs){assert.equal(run.cuts.length,6);for(const c of run.cuts){for(let k=0;k<6;k++){near(c.cut_on_lower_LH_6[k]+c.base_about_cut_6[k]+c.physical_load_about_cut_6[k],0,1e-6);near(c.cut_on_lower_LH_6[k]+c.opposite_cut_6[k],0,1e-6);}assert.ok(c.fbd_relative<1e-6);assert.ok(c.pair_relative<1e-6);}}
});
test('490 physical points, one-sided stresses and sampled independent shape gradients remain consistent',async()=>{
  const reference=(await raw('H4')).samples;
  for(const run of r.runs){const v=await raw(run.mesh);assert.equal(v.samples.length,490);assert.equal(run.gauss_points_checked,v.elements.length*27);
    for(let i=0;i<v.samples.length;i++){const p=v.samples[i];assert.equal(p.key,reference[i].key);assert.deepEqual(p.xyz_m,reference[i].xyz_m);assert.deepEqual(p.axes_s_y_n,reference[i].axes_s_y_n);assert.ok(p.sides.length>0);
      for(let k=0;k<6;k++){const values=p.sides.map(s=>s.local_kPa[k]);near(p.mean_kPa[k],values.reduce((a,b)=>a+b,0)/values.length);near(p.min_kPa[k],Math.min(...values));near(p.max_kPa[k],Math.max(...values));}
      if(i%23===0)for(const s of p.sides){const e=v.elements[s.element-1],{T,xyz}=recovery(e.nodes.map(n=>v.nodes[n]),e.nodes.map(n=>v.displacements[n]),s.natural),loc=mm(mm(p.axes_s_y_n,T),transpose(p.axes_s_y_n));[loc[0][0],loc[1][1],loc[2][2],loc[0][1],loc[0][2],loc[1][2]].forEach((x,k)=>near(x,s.local_kPa[k],2e-4));xyz.forEach((x,k)=>near(x,p.xyz_m[k],1e-9));}
    }
    for(const e of v.elements){assert.equal(e.nodes.length,20);assert.equal(e.gauss_stress_kPa.length,27);assert.ok(e.gauss_stress_kPa.every(g=>g.length===6&&g.every(Number.isFinite)));}
    for(let i=0;i<v.elements.length;i+=Math.floor(v.elements.length/23)){const e=v.elements[i],{T}=recovery(e.nodes.map(n=>v.nodes[n]),e.nodes.map(n=>v.displacements[n]),[0,0,0]);[T[0][0],T[1][1],T[2][2],T[0][1],T[1][2],T[2][0]].forEach((x,k)=>near(x,e.gauss_stress_kPa[26][k],2e-4));}
  }
});
test('all directional comparisons recompute point/RMS/spread and retain failures without convergence claims',async()=>{
  for(const c of r.local_comparisons){const aa=await raw(c.pair[0]),bb=await raw(c.pair[1]);for(const g of c.groups){const ap=aa.samples.filter(s=>s.group===g.group),bp=bb.samples.filter(s=>s.group===g.group);assert.equal(g.points,bp.length);
    g.fields.forEach((f,k)=>{const diff=bp.map((s,i)=>Math.abs(s.mean_kPa[k]-ap[i].mean_kPa[k])),point=bp.map((s,i)=>diff[i]/Math.max(Math.abs(s.mean_kPa[k]),10)),spread=bp.map(s=>(s.max_kPa[k]-s.min_kPa[k])/Math.max(Math.abs(s.mean_kPa[k]),10)),rms=Math.sqrt(dot(diff,diff)/bp.length)/Math.max(Math.sqrt(bp.reduce((sum,s)=>sum+s.mean_kPa[k]**2,0)/bp.length),10);near(f.max_point_change,Math.max(...point));near(f.max_spread_relative,Math.max(...spread));near(f.rms_change,rms);assert.equal(f.targets_met,Math.max(...point)<=.05&&Math.max(...spread)<=.05&&rms<=.05);});assert.equal(g.all_six_targets_met,g.fields.every(f=>f.targets_met));}
    const q=r.global_comparisons.find(q=>q.pair.join('/')===c.pair.join('/')),x=aa.summary,y=bb.summary;near(q.displacement_change,Math.abs(y.max_displacement_mm/x.max_displacement_mm-1));near(q.energy_change,Math.abs(y.strain_energy_kNm/x.strain_energy_kNm-1));near(q.reaction_change,Math.max(...['LH','RH'].flatMap(h=>[0,2,4].map(k=>Math.abs(y.base[h][k]-x.base[h][k])/Math.max(Math.abs(y.base[h][k]),.1)))));
  }
});
test('66 cuts retain both traces, face integration sums, reference floors and all-component criteria',()=>{
  assert.ok(a.affine_traction_patch.max_resultant_error<1e-7);assert.equal(a.affine_traction_patch.faces_checked,12);assert.equal(a.runs.flatMap(v=>v.cuts).length,66);
  for(const run of a.runs){for(const c of run.cuts){const den=c.nodal_lower_6.map(v=>Math.max(Math.abs(v),.1));let passed=true;
    for(const side of ['lower','upper']){const t=c.traces[side],ref=side==='lower'?c.nodal_lower_6:c.nodal_upper_6;
      for(const order of ['order4','order6']){const v=t[order];near(v.area_m2,.175*1.5,1e-10);near(v.face_contributions.reduce((s,p)=>s+p.area_m2,0),v.area_m2,1e-10);for(let k=0;k<6;k++)near(v.face_contributions.reduce((s,p)=>s+p.resultant_6[k],0),v.resultant_6[k]);}
      for(let k=0;k<6;k++){near(t.difference_vs_nodal_6[k],t.order6.resultant_6[k]-ref[k]);near(t.relative_vs_nodal_6[k],Math.abs(t.difference_vs_nodal_6[k])/Math.max(Math.abs(ref[k]),.1));near(t.quadrature_change_6[k],Math.abs(t.order6.resultant_6[k]-t.order4.resultant_6[k])/den[k]);}
      passed&&=Math.max(...t.relative_vs_nodal_6)<=.05&&Math.max(...t.quadrature_change_6)<=1e-6;
    }
    for(let k=0;k<6;k++){near(c.trace_pair_sum_6[k],c.traces.lower.order6.resultant_6[k]+c.traces.upper.order6.resultant_6[k]);near(c.trace_pair_relative_6[k],Math.abs(c.trace_pair_sum_6[k])/den[k]);near(c.nodal_lower_6[k]+c.nodal_upper_6[k],0,1e-6);}
    assert.equal(c.targets_met,passed&&Math.max(...c.trace_pair_relative_6)<=.05);
  }assert.equal(run.all_cut_targets_met,run.cuts.every(c=>c.targets_met));}
});
test('independent finite-difference gradients and surface normals reproduce selected traction face integrals',async()=>{
  const q=[-.9324695142031521,-.6612093864662645,-.2386191860831969,.2386191860831969,.6612093864662645,.9324695142031521],w=[.1713244923791704,.3607615730481386,.467913934572691,.467913934572691,.3607615730481386,.1713244923791704];
  for(const mesh of ['H4','IBY']){const v=await raw(mesh),run=a.runs.find(s=>s.mesh===mesh&&s.pattern==='FULL');for(const c of run.cuts)for(const side of ['lower','upper']){
    const sign=side==='lower'?1:-1,faces=c.traces[side].order6.face_contributions;
    for(const face of [faces[0],faces[Math.floor(faces.length/2)],faces.at(-1)]){const e=v.elements[face.element-1],p=e.nodes.map(n=>v.nodes[n]),u=e.nodes.map(n=>v.displacements[n]),sum=Array(6).fill(0);let area=0;
      for(let i=0;i<6;i++)for(let j=0;j<6;j++){const {T,J,xyz}=recovery(p,u,[sign,q[i],q[j]]),cols=transpose(J),av=cross(cols[1],cols[2]).map(x=>x*sign*w[i]*w[j]),F=T.map(row=>dot(row,av)),M=cross(xyz.map((x,k)=>x-c.origin_m[k]),F);F.forEach((x,k)=>sum[k]+=x);M.forEach((x,k)=>sum[k+3]+=x);area+=Math.hypot(...av);}
      near(area,face.area_m2,1e-9);sum.forEach((x,k)=>near(x,face.resultant_6[k],2e-7));
    }
  }}
});
