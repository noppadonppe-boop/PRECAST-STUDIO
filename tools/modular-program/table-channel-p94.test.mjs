import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {section,toleranceStack,build,calculate,ring,families} from './table-channel-p94.mjs';
import {properties,swept} from './cap-geometry-p55.mjs';
import {read,sha,sources} from './table-weld-p93.mjs';
import {lineGroup} from './weld-group-p93.mjs';
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
test('P94 composite section checked by independent rectangle raw moments',()=>{
 const r=section();near(r.areaMm2,1878);
 const A=1050+600+228,Q=1050*3+600*31+228*53,J=175*6**3/3+12*(56**3-6**3)/3+38*(56**3-50**3)/3;
 near(r.centroidOutwardMm,Q/A);near(r.I_mm4,J-Q*Q/A,1e-6);
});
test('P94 root group length, centroid, direct resultant and eccentric wrench',()=>{
 const r=ring(12),x=lineGroup({segments:r.roots,forceN:[0,1000,0],originMm:[0,33.5,12]});near(x.effectiveLengthMm,76);near(x.centroidMm[1],33.5);near(x.worst.stressResultantMPa,1000/228);
 const y=lineGroup({segments:r.roots,forceN:[30,1000,50],originMm:[0,0,175/3]});assert.ok(y.forceResidualN.every(v=>Math.abs(v)<1e-8));assert.ok(y.momentResidualNmm.every(v=>Math.abs(v)<1e-6));
});
test('P94 proposed tolerances stay positive at simultaneous extremes; oversize weld rejected',()=>{
 const x=toleranceStack();near(x.betweenWeldsMm,1.5);near(x.outerLandingMm,1.25);assert.ok(x.withinProposedEnvelope);assert.equal(toleranceStack({legMax:6}).withinProposedEnvelope,false);
});
test('P94 all 6 assembled candidates use 12 channel plates and 12 real station webs',()=>{
 for(const f of families){const c=build(f);assert.equal(c.cutParts.length,24);assert.equal(c.welds.length,40);assert.equal(c.cutParts.filter(p=>p.tag.includes('CH-')).length,12);
  const plateVolumes=c.cutParts.filter(p=>p.tag.includes('CH-')).reduce((s,p)=>s+properties(p.faces).volumeMm3,0);near(plateVolumes,(2*c.cavityMm[0]+2*(c.cavityMm[1]+12))*828,1e-5);
  for(const p of c.cutParts)assert.ok(!swept(p.faces,c.concrete));assert.deepEqual(c.cavityMm,read(sources(f).model).cavityMm);
 }
});
test('P94 actual recalculated beam forces, geometry, source hashes and scope remain coordinated',()=>{
 for(const f of families){const r=calculate(f);assert.equal(r.panels.length,4);assert.equal(r.cases.length,144);assert.equal(r.seams.length,24);assert.equal(r.audit.continuousSteps.length,40);assert.deepEqual(r.audit.initialCollisions,[]);assert.ok(r.audit.continuousSteps.every(s=>!s.hits.length));
  assert.ok(r.cases.every(x=>x.ratio<1));for(const p of r.panels)for(const b of p.runs){assert.ok(Math.abs(b.forceResidualN)<1e-6);assert.ok(Math.abs(b.momentResidualNmm)<.001);assert.ok(b.convergence.deflectionDifferenceMm<1e-4);}
  for(const s of r.sources)assert.equal(sha(s.path),s.sha256);assert.equal(r.stageComplete,false);assert.equal(r.productionReleased,false);assert.equal(r.engineeringApproved,false);
 }
});
test('P94 generated file source and summary equal freshly calculated values',()=>{
 for(const f of families){const r=read(`output/table-channel-p94/${f}.json`),current=calculate(f);assert.deepEqual(r.summary,current.summary);assert.equal(r.section.I_mm4,current.section.I_mm4);assert.ok(fs.existsSync(`output/table-weld-p93/${f}.json`));}
});
