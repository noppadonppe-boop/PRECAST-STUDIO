import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simpleBeam} from './elastic-beam-p48.mjs';
import {build,families,stripUDL} from './table-seal-backer-p96.mjs';
import {swept} from './cap-geometry-p55.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('P96 analytic UDL agrees with independent Macaulay integration and scaling',()=>{
 const s=stripUDL({spanMm:200,tMm:4.9,widthMm:3,pMPa:.1}),m=simpleBeam({L:200,I:s.I_mm4,patches:[{a:0,b:200,q:.3}]});near(s.momentNmm,m.maxAbsMomentNmm);near(s.deflectionMm,m.maxAbsDeflectionMm);near(s.reactionPerEndN,m.reactionsN[0]);
 const x=stripUDL({spanMm:400,tMm:4.9,widthMm:3,pMPa:.1});near(x.deflectionMm/s.deflectionMm,16);near(x.stressMPa/s.stressMPa,4);assert.throws(()=>stripUDL({spanMm:0,tMm:4.9,pMPa:.1}));
});
test('P96 all six real bay infills fit without stock overlap and balance seal forces',()=>{
 for(const family of families){const r=build(family);assert.equal(r.barCount,2*(r.ribCount-1));assert.ok(r.bars.every(b=>!b.initialCollisions.length));for(let i=0;i<r.bars.length;i++)for(let j=0;j<i;j++)assert.equal(swept(r.bars[i].faces,r.bars[j].faces),false);
  const c=r.operatingCandidate;near(c.baseSealForceN,.1*(2*(r.cavityMm[0]+r.cavityMm[1])*3+Math.PI*18));near(r.stripChecks.supportedBacker.reactionPerEndN*2,c.lineLoadNmm*(r.pitchMm-50));assert.ok(r.stripChecks.supportedBacker.deflectionMm<.001);assert.equal(c.compoundQualified,false);
  assert.equal(r.welds.length,r.barCount*6);assert.deepEqual(r.weldClashes,[]);assert.ok(r.insertions.every(s=>!s.hits.length));assert.equal(r.motion.steps.length,44);assert.ok(r.motion.steps.every(s=>!s.hits.length));assert.ok(r.nominalWeldMetalKg>0);
 }
});
