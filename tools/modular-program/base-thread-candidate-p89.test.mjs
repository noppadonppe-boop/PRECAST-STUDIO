import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {keys,dir,sha,fitStack,wallPitch} from './base-thread-candidate-p89.mjs';
import {properties,rect} from './prism-tools-p54.mjs';import {collide} from './abd-base-lock-p66.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const evidence=read('knowledge/modular-program-r02/thread-study-p89.json');
test('fit stack uses length minus actual foot and washer, not length minus nominal foot only',()=>{
 const s=fitStack(evidence.incomingInspectionEnvelopeMm);near(s.insertionMinMm,26);near(s.insertionMaxMm,28);near(s.tipRecessMinMm,1.8);near(s.tipRecessMaxMm,4.2);assert.equal(s.fullThreadLengthVerified,false);assert.equal(s.meetsStudyInsertionCriterion,true);
 const short=structuredClone(evidence.incomingInspectionEnvelopeMm);short.underheadLength=[52.5,53.5];assert.equal(fitStack(short).meetsStudyInsertionCriterion,false);
 const long=structuredClone(short);long.underheadLength=[64.5,65.5];assert.equal(fitStack(long).noUndersideProtrusion,false);
});
test('live manufacturer observations distinguish effective from total and do not issue capacity',()=>{
 const c=evidence.calculator;assert.equal(c.inputs.holeCase,'Blind Hole');for(const r of c.observedCases)near(r.totalEngagementMm-r.effectiveEngagementMm,7.5);
 assert.equal(c.observedCases[0].fullBoltStrengthCriterionSatisfied,false);assert.equal(evidence.verifiedThreadCapacityN,null);assert.equal(evidence.engineeringApproved,false);
});
for(const key of keys)test(key+' candidate dimensions / unchanged concrete / provenance / clear continuous paths',()=>{
 const m=read(`${dir}/${key}.json`),p=read(`output/abd-base-pattern-p85/${key}.json`),bed=m.parts.find(p=>p.tag==='M00');
 assert.equal(m.geometryRole,'UNADOPTED_CANDIDATE');assert.equal(m.baseLocks.length,40);assert.equal(m.parts.length,p.parts.length);assert.deepEqual(m.concrete,p.concrete);assert.deepEqual(m.sequence,p.sequence);assert.deepEqual(m.baseFeet,p.baseFeet);
 for(const i of m.inputSnapshots)assert.equal(sha(i.path),i.sha256);assert.equal(sha('tools/modular-program/base-thread-candidate-p89.mjs'),m.generatorSha256);
 for(const b of m.baseLocks){
  assert.deepEqual(b.axisMm,p.baseLocks.find(l=>l.tag===b.tag).axisMm);assert.equal(b.nominalEngagementMm,27);assert.equal(b.threadSeatDepthMm,30);assert.equal(b.tapDrillDiameterMm,null);
  const bolt=m.parts.find(v=>v.tag===b.tag),washer=m.parts.find(v=>v.tag===b.tag+'-W'),[x,y]=b.axisMm;
  assert.equal(washer.role,'ISO7089_200HV_WASHER21_ID37_OD3_CANDIDATE');assert.match(bolt.role,/M20X2_5X60/);assert.ok(!m.limits.some(l=>l.startsWith('Lift base screws 100 mm')));
  assert.equal(bolt.cells[0].z0,-27);assert.equal(bolt.cells[0].z1,33);assert.equal(bolt.cells[1].poly.length,6);assert.equal(bolt.cells[1].z1,45.5);
  for(const q of bolt.cells[1].poly)near(Math.hypot(q[0]-x,q[1]-y),30/Math.sqrt(3));
  for(const c of washer.cells){assert.equal(c.z0,30);assert.equal(c.z1,33);for(const q of c.poly)assert.ok([10.5,18.5].some(r=>Math.abs(Math.hypot(q[0]-x,q[1]-y)-r)<1e-6));}
  assert.equal(collide(bed.cells,[rect(x-.5,x+.5,y-.5,y+.5,-29,-28)]),false,'through-bed opening');
  near(properties(bolt.cells).massKg,bolt.properties.massKg);near(properties(washer.cells).massKg,washer.properties.massKg);
 }
 for(const r of m.relocations){const [x,y]=r.oldAxisMm;assert.equal(collide(bed.cells,[rect(x-.5,x+.5,y-.5,y+.5,-29,-28)]),true,'no abandoned old bore');}
 assert.deepEqual(m.audit.staticHits,[]);assert.equal(m.audit.toolChecks.length,76);assert.ok(m.audit.toolChecks.every(t=>!t.hits.length));assert.ok(m.audit.changedGeometryContinuousMoves.every(t=>!t.hits.length));assert.deepEqual(m.audit.remainingTags,['M00']);
 for(const r of wallPitch(m)){near(r.normalPitchMm,r.owner==='M01'?250:240);near(r.tangentPitchMm,140);}
 assert.equal(m.forceReuse.verifiedConnectionCapacityN,null);assert.equal(m.forceReuse.status,'P86_P88_NOT_VALIDATED_FOR_P89');assert.equal(m.engineeringApproved,false);assert.equal(m.productionReleased,false);assert.equal(m.stageComplete,false);
 const web=read(m.overlayReferences.web),seam=read(m.overlayReferences.seam),edge=read(m.overlayReferences.edge),prism=properties([...m.parts,...seam.plates,...seam.hardware,...edge.stock].flatMap(p=>p.cells)),parts=[prism,...web.stock],mass=parts.reduce((s,p)=>s+p.massKg,0);
 near(mass,m.currentSteelMassAndCg.massKg);for(let i=0;i<3;i++)near(parts.reduce((s,p)=>s+p.massKg*p.cgMm[i],0)/mass,m.currentSteelMassAndCg.cgMm[i]);
});
for(const f of ['A','B','D'])for(const v of ['S00','W01'])test(`${f}-${v} mirrored hardware / nominal mass and CG`,()=>{
 const a=read(`${dir}/${f}-LH-${v}.json`),b=read(`${dir}/${f}-RH-${v}.json`);near(a.currentSteelMassAndCg.massKg,b.currentSteelMassAndCg.massKg);near(a.currentSteelMassAndCg.cgMm[0]+b.currentSteelMassAndCg.cgMm[0],1490);for(let i=1;i<3;i++)near(a.currentSteelMassAndCg.cgMm[i],b.currentSteelMassAndCg.cgMm[i]);
});
