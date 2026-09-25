import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixedTwist,tieSection,liftSupportCase,calculate,families,mass} from './table-lock-base-p97.mjs';
import {box} from './table-channel-p94.mjs';
const near=(x,y,t=1e-8)=>assert.ok(Math.abs(x-y)<=t,`${x} != ${y}`);
test('P97 closed cell / determinate torque compatibility benchmarks',()=>{
 const s=tieSection();near(s.areaMm2,2136);near(s.medianCellAreaMm2,6016);near(s.thinWallJ_mm4,4*6016**2*6/(2*(64+94)));
 const r=fixedTwist({lengthMm:1000,J_mm4:100000,G:80000,torques:[{xMm:500,torqueNmm:20000}]});
 assert.deepEqual(r.reactionTorquesNmm,[10000,10000]);near(r.maxAbsRotationRad,20000*1000/(4*80000*100000));near(r.torqueResidualNmm,0);
 const a=fixedTwist({lengthMm:1000,J_mm4:100000,G:80000,torques:[{xMm:250,torqueNmm:20000}]});
 assert.deepEqual(a.reactionTorquesNmm,[15000,5000]);near(a.maxAbsRotationRad,20000*250*750/(1000*80000*100000));
 assert.throws(()=>fixedTwist({lengthMm:100,J_mm4:1,torques:[{xMm:101,torqueNmm:1}]}));
});
test('P97 mass, shifted pickup reactions, load scaling and invalid pickup',()=>{
 const cells=[box(0,1000,0,500,0,10)],m=mass(cells);near(m.nominalSteelKg,39.25);assert.deepEqual(m.cgMm,[500,250,5]);
 const r=liftSupportCase({L:1000,W:500,cells,xSupports:[200,800],allowance:1,amplification:1});
 for(const p of r.reactions)near(p.forceN,39.25*9.80665/4);
 const s=liftSupportCase({L:1000,W:500,cells,xSupports:[200,800],allowance:1.2,amplification:1.3});
 near(s.designVerticalN/r.designVerticalN,1.56);near(s.rails[0].maxAbsDeflectionMm/r.rails[0].maxAbsDeflectionMm,1.56);
 const asym=liftSupportCase({L:1000,W:500,cells:[box(300,500,100,200,0,10)],xSupports:[200,800],allowance:1,amplification:1});
 near(asym.reactions[0].forceN/asym.designVerticalN,(1-150/500)*(800-400)/600);
 assert.throws(()=>liftSupportCase({L:1000,W:500,cells,xSupports:[800,200]}));
});
test('P97 all six exact geometries, paths, cut quantities and traceable demand',()=>{
 for(const f of families){
  const r=calculate(f),saved=JSON.parse(fs.readFileSync(`output/table-lock-base-p97/${f}.json`));assert.deepEqual(r,saved);
  assert.equal(r.cuts.length,52);assert.equal(r.welds.length,136);assert.equal(r.demand.length,192);assert.equal(r.endTieCases.length,12);
  assert.deepEqual([...new Set(r.demand.map(c=>c.sourceSupportK))],[null,1000,100]);
  assert.equal(new Set(r.cuts.map(p=>p.tag)).size,52);assert.equal(r.cuts.filter(p=>p.role==='END_TIE').length,8);
  assert.ok(r.cuts.every(p=>p.nominalSteelKg>0));assert.ok(r.welds.every(w=>w.effectiveLengthMm>=30));
  assert.equal(r.geometry.motion.steps.length,44);assert.ok(r.geometry.motion.steps.every(s=>!s.hits.length));assert.deepEqual(r.geometry.initialCollisions,[]);
  for(const c of r.endTieCases){near(c.beam.equilibrium.forceN,0,1e-6);near(c.torsion.torqueResidualNmm,0,1e-6);assert.ok(c.endWelds.every(w=>w.result.forceResidualN.every(x=>Math.abs(x)<1e-6)&&w.result.momentResidualNmm.every(x=>Math.abs(x)<1e-5)));}
  assert.equal(r.stageComplete,false);assert.equal(r.productionReleased,false);assert.equal(r.engineeringApproved,false);
  assert.ok(r.demand.every(d=>d.capacityRatio===null));assert.ok(r.addedNetNominalSteelKg>0);
  near(r.assemblies.find(a=>a.id==='M00').nominalSteelKg,r.lifting.nominalSteelKg,1e-6);
 }
});
