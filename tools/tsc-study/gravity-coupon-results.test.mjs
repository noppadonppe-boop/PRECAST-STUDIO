import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),load=async p=>JSON.parse(await readFile(resolve(root,p),'utf8')),r=await load('output/tsc-step2j-r00/gravity_coupon_results.json'),web=await load('output/tsc-step2j-r00/web_summary.json');
const raw=run=>load(`output/tsc-step2j-r00/${run.id}.json`),near=(a,b,t=1e-7)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<t,`${a} != ${b}`),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],tr=a=>a[0].map((_,i)=>a.map(v=>v[i])),mm=(a,b)=>a.map(row=>tr(b).map(col=>dot(row,col)));
const L=1.5,w=.25,t=.175,a=L/2,c=t/2,gamma=2400*9.80665/1000,K=3*gamma/(2*c*c),E=28321.786532937494*1000,q=gamma*w*t;
function exactS(x,z,nu){const sx=K*z*(x*x-a*a+2*c*c/5-2*z*z/3),sz=K*(z**3-c*c*z)/3;return [sx,nu*(sx+sz),sz,0,0,K*x*(c*c-z*z)];}
function exactU([x,,z],nu){const A=(1-nu*nu)/E,B=nu*(1+nu)/E,C=(1+nu)/E,H=A*a*a+c*c*(2*C-2*A/5-B/3);return [K*x*z*(A*(x*x/3-a*a+2*c*c/5-2*z*z/3)-B*(z*z-c*c)/3),0,K*(A*(z**4/12-c*c*z*z/6)-B*((x*x-a*a+2*c*c/5)*z*z/2-z**4/6)+H*(x*x-a*a)/2-A*(x**4-a**4)/12)];}
const cutExact=x=>[0,0,q*x,0,q*(x*x-a*a)/2,0];
function tensor(G,nu){const mu=E/(2*(1+nu)),lambda=E*nu/((1+nu)*(1-2*nu)),trace=G[0][0]+G[1][1]+G[2][2];return G.map((row,i)=>row.map((v,j)=>mu*(v+G[j][i])+(i===j?lambda*trace:0)));}
const six=T=>[T[0][0],T[1][1],T[2][2],T[0][1],T[1][2],T[2][0]];
const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],edges=[[0,-1,-1],[1,0,-1],[0,1,-1],[-1,0,-1],[0,-1,1],[1,0,1],[0,1,1],[-1,0,1],[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],n20=[...corners,...edges];
function N(p){return [...corners.map(s=>s.reduce((v,k,i)=>v*(1+k*p[i]),1)*(dot(s,p)-2)/8),...edges.map(s=>{const k=s.indexOf(0);return (1-p[k]**2)*s.reduce((v,h,i)=>v*(i===k?1:1+h*p[i]),1)/4;})];}
function recovery(p,u,loc,nu){const h=1e-5,D=tr(loc.map((_,i)=>{const aa=N(loc.map((v,k)=>v+(i===k?h:0))),bb=N(loc.map((v,k)=>v-(i===k?h:0)));return aa.map((v,k)=>(v-bb[k])/(2*h));})),J=mm(tr(p),D),cols=tr(J),det=dot(cols[0],cross(cols[1],cols[2]));assert.ok(det>0);const inv=[cross(cols[1],cols[2]),cross(cols[2],cols[0]),cross(cols[0],cols[1])].map(row=>row.map(v=>v/det)),G=mm(mm(tr(u),D),inv);return {J,T:tensor(G,nu),xyz:mm([N(loc)],p)[0]};}
const qp=[-.9324695142031521,-.6612093864662645,-.2386191860831969,.2386191860831969,.6612093864662645,.9324695142031521],wp=[.1713244923791704,.3607615730481386,.467913934572691,.467913934572691,.3607615730481386,.1713244923791704];
test('nine declared gravity-only runs preserve immutable upstream hashes and design limits',async()=>{
  assert.equal(r.runs.length,9);assert.equal(r.runs.filter(v=>v.nu===.2).length,7);assert.deepEqual(r.runs.filter(v=>v.nu===0).map(v=>v.mesh),['J3','J7']);
  assert.equal(r.engineering_approval,false);assert.equal(r.manufacturing_release,false);assert.equal(r.whole_model_local_stress_convergence,'NOT_ESTABLISHED');assert.match(r.basis.boundary,/NOT a TS-C/);assert.match(r.basis.loads,/No element body-force/);
  for(const [p,h] of Object.entries({...r.dependency_hashes,...r.raw_output_hashes,...web.dependency_hashes,...web.raw_output_hashes}))assert.equal(createHash('sha256').update(await readFile(resolve(root,p))).digest('hex'),h,p);
  assert.equal(createHash('sha256').update(await readFile(resolve(root,'.local-engineering-runtime/openseespywin/opensees.pyd'))).digest('hex'),r.solver.dll_sha256);assert.ok(r.patch_checks.every(p=>p.relative_error<1e-8));
});
test('independent finite differences verify polynomial gravity equilibrium, compatibility, free surfaces and exact energy',()=>{
  for(const nu of [.2,0]){let energy=0;for(const x of [-a,-.53,0,.21,a])for(const z of [-c,-.031,0,.071,c]){
    const p=[x,.125,z],h=1e-6,G=tr(p.map((_,i)=>exactU(p.map((v,k)=>v+(i===k?h:0)),nu).map((v,j)=>(v-exactU(p.map((v,k)=>v-(i===k?h:0)),nu)[j])/(2*h)))),s=exactS(x,z,nu);six(tensor(G,nu)).forEach((v,k)=>near(v,s[k],2e-6));
    const dx=exactS(x+h,z,nu).map((v,k)=>(v-exactS(x-h,z,nu)[k])/(2*h)),dz=exactS(x,z+h,nu).map((v,k)=>(v-exactS(x,z-h,nu)[k])/(2*h));near(dx[0]+dz[5],0,1e-6);near(dx[5]+dz[2],gamma,1e-6);
    if(Math.abs(z)===c){near(s[2],0,1e-10);near(s[5],0,1e-10);}
  }
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){const s=exactS(a*qp[i],c*qp[j],nu),trace=s[0]+s[1]+s[2],eps=s.slice(0,3).map(v=>((1+nu)*v-nu*trace)/E);energy+=(dot(s.slice(0,3),eps)+2*(1+nu)/E*s[5]**2)*a*c*w*wp[i]*wp[j]/2;}
  near(energy,r.analytic_checks.find(v=>v.nu===nu).exact_energy_kNm,1e-13);near(exactU([a,w/2,0],nu)[2],0,1e-15);near(exactU([-a,w/2,0],nu)[2],0,1e-15);
  for(const run of r.runs.filter(v=>v.nu===nu)){near(run.exact_energy_kNm,energy,1e-13);near(run.exact_mid_uz_mm,exactU([0,w/2,0],nu)[2]*1000,1e-12);}
  }
});
test('raw consistent loads carry gravity through analytic end tractions, not fictitious datum reactions',async()=>{
  for(const run of r.runs){const v=await raw(run),sum=loads=>{const f=Array(6).fill(0);for(const [n,t] of Object.entries(loads)){t.forEach((x,k)=>f[k]+=x);cross(v.nodes[n],t).forEach((x,k)=>f[k+3]+=x);}return f;},body=sum(v.body_loads),end=sum(v.end_loads),total=sum(v.loads),R=sum(v.reactions);
    near(body[2],-q*L);near(body[3],-q*L*w/2);near(body[4],0);near(end[2],q*L);near(end[3],q*L*w/2);near(end[4],0);
    for(let k=0;k<6;k++){near(body[k]+end[k],total[k]);near(total[k]+R[k],0,1e-8);near(total[k],run.total_load_6[k]);}
    assert.equal(v.datum.length,3);for(const d of v.datum){near(v.displacements[d.node][d.dof-1],0,1e-15);near(v.reactions[d.node][d.dof-1],0,1e-8);}for(const u of Object.values(v.displacements))near(u[1],0,1e-15);
    assert.equal(run.elements,run.nx*run.ny*run.nz);assert.equal(run.nodes,Object.keys(v.nodes).length);near(run.volume_m3,L*w*t,1e-10);assert.ok(run.min_jacobian_m3>0);assert.ok(run.equilibrium_relative<1e-6);
    let work=0;for(const [n,u] of Object.entries(v.displacements))work+=dot(u,v.loads[n].map((x,k)=>x+v.reactions[n][k]))/2;near(work,run.energy_kNm,1e-10);near(work,run.work_energy_kNm,1e-12);
  }
});
test('all Gauss reference fields, six RMS metrics and sampled independent FE gradients reproduce',async()=>{
  for(const run of r.runs){const v=await raw(run),err=Array(6).fill(0),ref=Array(6).fill(0);let volume=0;for(const e of v.elements){assert.equal(e.gauss.length,27);for(const p of e.gauss){const exact=exactS(p.xyz_m[0],p.xyz_m[2],run.nu);exact.forEach((x,k)=>{near(x,p.exact_kPa[k],1e-8);err[k]+=(p.stress_kPa[k]-x)**2*p.weight_m3;ref[k]+=x*x*p.weight_m3;});volume+=p.weight_m3;}
    if(e.id%Math.max(1,Math.floor(v.elements.length/17))===0){const {T}=recovery(e.nodes.map(n=>v.nodes[n]),e.nodes.map(n=>v.displacements[n]),[0,0,0],run.nu);six(T).forEach((x,k)=>near(x,e.gauss[26].stress_kPa[k],2e-5));}
  }assert.equal(run.gauss_points_checked,v.elements.length*27);for(let k=0;k<6;k++){near(Math.sqrt(err[k]/volume),run.stress_rms_error_kPa[k]);near(Math.sqrt(err[k]/volume)/Math.max(Math.sqrt(ref[k]/volume),10),run.stress_rms_relative[k]);}assert.ok(run.gauss_reproduction_kPa<1e-6);
  }
});
test('all 27 nodal cuts independently sum element forces minus their consistent face loads',async()=>{
  for(const run of r.runs){const v=await raw(run);for(const c of run.cuts){const ex=cutExact(c.origin_m[0]);ex.forEach((x,k)=>near(x,c.exact_lower_6[k],1e-12));for(const [side,sign] of [['lower',1],['upper',-1]]){const row=c.station_row-(side==='lower'?1:0),sum=Array(6).fill(0);
    for(const e of v.elements.filter(e=>e.indices[0]===row))e.nodes.forEach((n,j)=>{if(n20[j][0]!==sign)return;const f=e.forces[j].map((x,k)=>x-e.loads[j][k]),m=cross(v.nodes[n].map((x,k)=>x-c.origin_m[k]),f);f.forEach((x,k)=>sum[k]+=x);m.forEach((x,k)=>sum[k+3]+=x);});sum.forEach((x,k)=>{near(x,c[`nodal_${side}_6`][k]);near(x,sign*ex[k],1e-7);});
  }}}
});
test('unchanged S2I traction integration agrees with independent finite-difference surface integration',async()=>{
  for(const run of r.runs){const v=await raw(run);for(const c of run.cuts)for(const [side,sign] of [['lower',1],['upper',-1]]){const t=c.traces[side];for(const order of ['order4','order6']){near(t[order].area_m2,w*.175,1e-10);for(let k=0;k<6;k++)near(t[order].face_contributions.reduce((s,p)=>s+p.resultant_6[k],0),t[order].resultant_6[k]);}
    for(const face of [t.order6.face_contributions[0],t.order6.face_contributions.at(-1)]){const e=v.elements[face.element-1],p=e.nodes.map(n=>v.nodes[n]),u=e.nodes.map(n=>v.displacements[n]),sum=Array(6).fill(0);let area=0;
      for(let i=0;i<6;i++)for(let j=0;j<6;j++){const {T,J,xyz}=recovery(p,u,[sign,qp[i],qp[j]],run.nu),cols=tr(J),av=cross(cols[1],cols[2]).map(x=>x*sign*wp[i]*wp[j]),F=T.map(row=>dot(row,av)),M=cross(xyz.map((x,k)=>x-c.origin_m[k]),F);F.forEach((x,k)=>sum[k]+=x);M.forEach((x,k)=>sum[k+3]+=x);area+=Math.hypot(...av);}near(area,face.area_m2,1e-9);sum.forEach((x,k)=>near(x,face.resultant_6[k],1e-7));
    }
  }}
});
test('accuracy gates recompute without treating cut convergence or coupon success as module approval',()=>{
  for(const run of r.runs){near(run.displacement_error_relative,Math.abs(run.mid_uz_mm/run.exact_mid_uz_mm-1));near(run.energy_error_relative,Math.abs(run.energy_kNm/run.exact_energy_kNm-1));for(const c of run.cuts){let met=true;const den=c.exact_lower_6.map(x=>Math.max(Math.abs(x),.1));for(const [side,sign] of [['lower',1],['upper',-1]]){const t=c.traces[side];for(let k=0;k<6;k++){near(t.relative_vs_exact_6[k],Math.abs(t.order6.resultant_6[k]-sign*c.exact_lower_6[k])/den[k]);near(t.relative_vs_nodal_6[k],Math.abs(t.order6.resultant_6[k]-c[`nodal_${side}_6`][k])/Math.max(Math.abs(c[`nodal_${side}_6`][k]),.1));near(t.quadrature_change_6[k],Math.abs(t.order6.resultant_6[k]-t.order4.resultant_6[k])/den[k]);}
      met&&=Math.max(...t.relative_vs_exact_6)<=.05&&Math.max(...t.relative_vs_nodal_6)<=.05&&Math.max(...t.quadrature_change_6)<=1e-6;
    }for(let k=0;k<6;k++){near(c.trace_pair_sum_6[k],c.traces.lower.order6.resultant_6[k]+c.traces.upper.order6.resultant_6[k]);near(c.trace_pair_relative_6[k],Math.abs(c.trace_pair_sum_6[k])/den[k]);}assert.equal(c.targets_met,met&&Math.max(...c.trace_pair_relative_6)<=.05);}
    assert.equal(run.all_cut_targets_met,run.cuts.every(c=>c.targets_met));assert.equal(run.accuracy_targets_met,run.all_cut_targets_met&&run.displacement_error_relative<=.02&&run.energy_error_relative<=.02&&Math.max(...run.stress_rms_relative)<=.05);
  }
  const j3=r.runs.find(v=>v.id==='GRAVITY-NU20-J3'),j7=r.runs.find(v=>v.id==='GRAVITY-NU20-J7');assert.equal(j3.all_cut_targets_met,true);assert.equal(j3.accuracy_targets_met,false);assert.equal(j7.accuracy_targets_met,true);assert.equal(web.engineering_approval,false);assert.equal(web.runs[0].cuts[0].traces.lower.order6.face_contributions,undefined);
});
