import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lineGroup,resistanceBound,cross,sub,scale} from './weld-group-p93.mjs';
import {families,rectangularWeld,makeCandidate,checkGeometry,axes,read,sha,sources} from './table-weld-p93.mjs';
import {loft,properties} from './cap-geometry-p55.mjs';

const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
const root=rectangularWeld(12).rootSegments;
test('closed rectangular weld exact area/centroid/inertia and concentric load',()=>{
 const r=lineGroup({segments:root,forceN:[0,1000,0],originMm:[0,33,12]});
 near(r.effectiveLengthMm,80);r.centroidMm.forEach((v,i)=>near(v,[0,33,12][i]));
 near(r.inertiaLineMm3[0][0],10018.666666666667);near(r.inertiaLineMm3[1][1],648);near(r.inertiaLineMm3[2][2],10666.666666666667);
 near(r.worst.stressResultantMPa,1000/80/3);r.forceResidualN.forEach(v=>near(v,0));r.momentResidualNmm.forEach(v=>near(v,0));
});
test('pure moment about tangent matches line-section formula',()=>{
 const M=10000,r=lineGroup({segments:root,forceN:[0,0,0],momentAtOriginNmm:[M,0,0]});
 near(r.worst.stressResultantMPa,M*17/(10018.666666666667*3));
});
test('translated origin gives same weld demand; equilibrium includes eccentricity',()=>{
 const F=[17,824,-51],o=[0,0,175/3],M=[4,9,23],r=lineGroup({segments:root,forceN:F,originMm:o,momentAtOriginNmm:M}),p=[83,147,-82];
 const next=lineGroup({segments:root,forceN:F,originMm:p,momentAtOriginNmm:sub(M,cross(sub(p,o),F))});
 near(r.worst.stressResultantMPa,next.worst.stressResultantMPa);next.forceResidualN.forEach(v=>near(v,0));next.momentResidualNmm.forEach(v=>near(v,0,1e-6));
});
test('linear load scaling, rotated coordinate invariance and failures',()=>{
 const F=[17,824,-51],o=[0,0,175/3],r=lineGroup({segments:root,forceN:F,originMm:o}),twice=lineGroup({segments:root,forceN:scale(F,2),originMm:o});
 near(twice.worst.stressResultantMPa,2*r.worst.stressResultantMPa);
 const rotate=([x,y,z])=>[z,x,y],q=lineGroup({segments:root.map(s=>s.map(rotate)),forceN:rotate(F),originMm:rotate(o)});near(q.worst.stressResultantMPa,r.worst.stressResultantMPa);
 assert.throws(()=>lineGroup({segments:[[[0,0,0],[100,0,0]],[[100,0,0],[200,0,0]]],forceN:F}),/Singular/);
 assert.throws(()=>lineGroup({segments:root,forceN:F,throatMm:2.9}));
 assert.throws(()=>lineGroup({segments:root.map(s=>s.map(p=>scale(p,.01))),forceN:F}),/effective weld length/);
 assert.throws(()=>lineGroup({segments:root,forceN:[NaN,0,0]}));
});
test('conservative traction bound implies both directional criteria',()=>{
 const b=resistanceBound();near(b.resultantBoundMPa,360/Math.sqrt(3));
 for(let i=0;i<=100;i++){const s=b.resultantBoundMPa*Math.cos(i*Math.PI/200),t=b.resultantBoundMPa*Math.sin(i*Math.PI/200);assert.ok(Math.sqrt(s*s+3*t*t)<=b.fuMPa/b.betaW/b.gammaM2+1e-9);assert.ok(s<=.9*b.fuMPa/b.gammaM2+1e-9);}
 assert.throws(()=>resistanceBound({fuMPa:0}));
});
test('fillet envelope geometry has positive volume and includes connected corners',()=>{
 for(const down of [false,true]){const w=rectangularWeld(60,down);assert.equal(w.solids.length,36);assert.ok(w.solids.every(s=>properties(s).volumeMm3>0));near(w.legMm,3*Math.sqrt(2));
  const v=w.solids.reduce((s,f)=>s+properties(f).volumeMm3,0),analytic=80*9+Math.PI*w.legMm**3/3;assert.ok(v<analytic&&v>analytic*.999,'Faceted quarter-cone volume bounds');
 }
});
for(const key of families)test(`${key}: sources, actual geometry, force pairing and scope`,()=>{
 const r=read(`output/table-weld-p93/${key}.json`);r.sources.forEach(s=>assert.equal(sha(s.path),s.sha256));
 assert.equal(r.reference.sha256,sha(r.reference.path));assert.equal(r.summary.stations,12);assert.equal(r.welds.length,32);assert.equal(r.cases.length,144);assert.equal(r.skinSeams.length,24);
 assert.deepEqual(r.geometry.initialCollisions,[]);assert.equal(r.geometry.continuousDeltaChecks.length,40);assert.ok(r.geometry.continuousDeltaChecks.every(s=>s.hits.length===0));
 for(const c of r.cases){c.result.forceResidualN.forEach(v=>near(v,0));c.result.momentResidualNmm.forEach(v=>near(v,0,1e-6));near(c.result.forceN[1],c.pressureReactionN*c.pressureMultiplier);assert.equal(c.wholeConnectionPassed,null);}
 assert.ok(r.summary.maxStationWeldRatio<.09);assert.ok(r.summary.maxSkinSeamRatio<.008);assert.equal(r.materialChange.steelWebRemovedKg,12*16*48*6*7850/1e9);
 assert.equal(r.stageComplete,false);assert.equal(r.engineeringApproved,false);assert.equal(r.productionReleased,false);assert.equal(r.pressureBasis.supportStiffnessVerified,false);
 assert.equal(r.welds.filter(w=>w.closedRoot).length,24);assert.ok(r.welds.filter(w=>!w.closedRoot).every(w=>w.endDeductionMm===6));
 assert.equal(r.sourceSetups.length,key==='F2660'?4:1);
});
test('negative geometry: restoring original web clashes with new all-round weld',()=>{
 const c=makeCandidate('F2660'),station=c.sourceModel.lockSchedule[0],frame=axes(station.parent,c.sourceModel.cavityMm),along=station.x,fn=([t,u,z])=>frame.toGlobal([t+along,u,z]);
 const old=loft([[-3,6,12],[3,6,12],[3,56,12],[-3,56,12]].map(fn),[[-3,6,60],[3,6,60],[3,56,60],[-3,56,60]].map(fn));
 c.parts.find(p=>p.id===station.parent).solids.push(old);const audit=checkGeometry(c);assert.ok(audit.initialCollisions.some(x=>x.includes('LK01-WR')));
});
test('six sizes map to exactly nine setup slots, not 72 moulds',()=>{
 const ids=families.flatMap(key=>read(`output/table-weld-p93/${key}.json`).sourceSetups);assert.equal(ids.length,9);assert.equal(new Set(ids).size,9);
 const reg=read('output/table-weld-p93/register.json');assert.equal(reg.records.length,6);reg.records.forEach(x=>assert.equal(x.sha256,sha(`output/table-weld-p93/${x.file}`)));
});
