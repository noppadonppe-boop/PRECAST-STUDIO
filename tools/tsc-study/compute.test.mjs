import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { buildStudy, sectionCase, threeHinge } from './compute.mjs';
const study=await buildStudy(resolve(import.meta.dirname,'../..'));
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('overall 3m includes floor; exact clear dimensions and volumes',()=>{
  study.cases.forEach(c=>{near(c.clear_flat_height_m+ c.t_m+c.floor_t_m,3);near(c.clear_width_m+2*c.t_m,3);near(c.floor_volume_m3,3*1.5*c.floor_t_m);near(c.total_primary_volume_m3,2*c.half_volume_m3+c.floor_volume_m3);});
  near(study.cases[1].clear_flat_height_m,2.65);near(study.cases[1].inner_radius_m,.225);
});
test('independent numeric quadrature confirms annulus centroid and section area',()=>{
  for(const c of study.cases){
    const N=10000,R=c.outer_radius_m,r=c.inner_radius_m,d=(Math.PI/2)/N;
    let area=0,mx=0,mz=0;
    for(let i=0;i<N;i++){const a=Math.PI/2+(i+.5)*d;const A=(R*R-r*r)*d/2;area+=A;mx+=.4*A+Math.cos(a)*(R**3-r**3)*d/3;mz+=2.6*A+Math.sin(a)*(R**3-r**3)*d/3;}
    const arc=c.parts.find(p=>p.name==='quarter_annulus');near(area,arc.area,1e-9);near(mx/area,arc.x,1e-8);near(mz/area,arc.z,1e-8);
  }
});
test('roof and floor area mapping preserves loads without curved-area double counting',()=>{
  for(const c of study.cases){near(c.roof_LL_full_kN,2.20649625);near(c.floor_LL_gross_kN,6.61948875);assert.ok(c.floor_LL_clear_strip_kN<c.floor_LL_gross_kN);}
});
test('all LH/RH/global equilibrium equations close for both benchmark patterns',()=>{
  for(const c of study.cases) for(const pattern of study.basis.benchmark.roof_patterns) for(const gamma of [0,12,24]) {
    const r=threeHinge(c,gamma,pattern);
    for(const value of Object.values(r.residuals))near(value,0,1e-10);
    for(const [key,coef] of Object.entries(c.reaction_coefficients[pattern]))near(r[key],coef.gamma_coefficient*gamma+coef.LL_constant,1e-10);
  }
});
test('symmetric hinge has zero crown shear; half loading does not',()=>{
  for(const c of study.cases){near(threeHinge(c,17,'SYMMETRIC_FULL').crown_on_LH_Cz_kN,0);assert.ok(threeHinge(c,17,'LEFT_HALF_ONLY').crown_on_LH_Cz_kN>0);}
});
test('benchmark and material uncertainty never become design/FEM approval',()=>{
  assert.equal(study.FEM_results,null);assert.equal(study.design_capacity,null);assert.equal(study.basis.loads.gamma_kN_m3,null);assert.equal(study.approval.design_approved,false);assert.equal(study.basis.geometry.selected_thickness_m,null);
  assert.throws(()=>sectionCase(study.basis,.5));
});
