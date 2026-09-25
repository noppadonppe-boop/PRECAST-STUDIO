import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {capacities,checkBolt,bearing,build,validatePair,sha} from './bolt-screen-p88.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),r=build();
test('Independent exact M20 class8.8 arithmetic',()=>{
 const c=capacities();assert.equal(c.tensionResistanceN,141120);assert.equal(c.shearResistanceN,94080);
 const s=checkBolt(47040,23520,c);assert.equal(s.shearRatio,.25);assert.equal(s.tensionRatio,1/3);
 assert.ok(Math.abs(s.interactionRatio-(.25+1/4.2))<1e-12);
});
test('Tension must be checked separately, not only interaction',()=>{
 const s=checkBolt(1.2*141120,0,capacities());assert.ok(s.interactionRatio<1);assert.equal(s.staticArithmeticWithinResistance,false);
});
test('Shear and combined limits each enforced',()=>{
 assert.equal(checkBolt(0,95000,capacities()).staticArithmeticWithinResistance,false);
 assert.equal(checkBolt(.9*141120,.5*94080,capacities()).staticArithmeticWithinResistance,false);
});
test('Invalid or unknown material/demand never silently passes',()=>{
 for(const x of [-1,NaN,Infinity])assert.throws(()=>checkBolt(x,0,capacities()));
 assert.throws(()=>capacities({grade:'UNKNOWN'}));assert.throws(()=>capacities({gammaM2:0}));
});
test('Outer-plate bearing independent hand result and reflection symmetry',()=>{
 const b=bearing({xy:[125,70]});assert.deepEqual(b.edgeDistancesMm,[50,30]);
 assert.ok(Math.abs(b.resistanceAlongLocalAxesN[0]-(2.8*30/22-1.7)*(50/66)*360*20*30/1.25)<1e-7);
 assert.deepEqual(b,bearing({xy:[-125,-70]}));assert.ok(b.minimumEdgesWithinRule);
});
test('24feet /96bolts /576 explicitly labelled sensitivity cases, not44setups',()=>{
 assert.equal(r.groups.length,24);assert.equal(new Set(r.groups.map(g=>g.key)).size,6);
 assert.equal(r.progress.boltLocations,96);assert.equal(r.progress.arithmeticCases,576);
 assert.equal(r.progress.wholeStagePercent,null);assert.equal(r.stageComplete,false);
});
for(const g of r.groups)test(g.id+' source-pinned force pairing / no release',()=>{
 for(const i of g.inputSnapshots)assert.equal(sha(i.path),i.sha256);
 const d=read('output/abd-base-pattern-p85/bolt-demand.json').records.find(x=>x.key===g.key&&x.tag===g.foot);
 for(const b of g.bolts){
  assert.equal(b.shearMagnitudeN,d.bolts.find(x=>x.tag===b.tag).shearMagnitudeN);
  assert.equal(b.cases.length,6);assert.equal(b.verifiedCapacityN,null);
  const a=b.cases.find(x=>x.grade==='8.8'&&x.lambda===1),z=b.cases.find(x=>x.grade==='8.8'&&x.lambda===1.5);
  assert.ok(Math.abs(z.ratio-1.5*a.ratio)<1e-12);assert.equal(z.connectionPassed,null);
 }
 assert.equal(g.engineeringApproved,false);assert.equal(g.productionReleased,false);assert.equal(g.stageComplete,false);
});
const a=read('output/foot-flex-p86/audit.json').rows[0],p=read('output/foot-flex-p86/'+a.fineFile),d=read('output/abd-base-pattern-p85/bolt-demand.json').records[0];
test('Negative: reject force transfer from a different foot or wrong bolt coordinate',()=>{
 assert.throws(()=>validatePair(a,p,{...d,tag:'M01-F2'}));
 const q=structuredClone(d);q.bolts[0].positionMm[0]+=1;assert.throws(()=>validatePair(a,p,q));
});
test('Negative: unaccepted mesh or changed bolt stiffness or release flag',()=>{
 assert.throws(()=>validatePair({...a,refinementAccepted:false},p,d));
 assert.throws(()=>validatePair(a,{...p,basis:{...p.basis,effectiveBoltLengthMm:80}},d));
 assert.throws(()=>validatePair(a,{...p,productionReleased:true},d));
});
test('Report restrictions retained regardless of arithmetic result',()=>{
 assert.ok(r.exclusions.some(x=>x.includes('thread stripping')));assert.ok(r.exclusions.some(x=>x.includes('fatigue')));
 assert.ok(r.groups.every(x=>x.geometry.maximumPitchReview.includes('250mm')));
 assert.equal(r.proposedDevelopmentCase.materialAndConnectionDesignBasisApproved,false);
});
