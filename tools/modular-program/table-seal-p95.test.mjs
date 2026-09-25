import {test} from 'node:test';
import assert from 'node:assert/strict';
import {box} from './table-channel-p94.mjs';
import {clip,subtractConvex,subtractMany} from './convex-clip-p95.mjs';
import {properties,swept} from './cap-geometry-p55.mjs';
import {baseLoop,compressionRange,junctionEnvelope,baseCutPieces,build,audit,removalAudit,families} from './table-seal-p95.mjs';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`),volume=ss=>ss.reduce((s,f)=>s+properties(f).volumeMm3,0);
test('P95 halfspace cube clip and complement preserve exact volume',()=>{
 const c=box(0,10,0,10,0,10);near(properties(clip(c,[1,0,0],4)).volumeMm3,400);near(properties(clip(c,[-1,0,0],-4)).volumeMm3,600);assert.deepEqual(clip(c,[1,0,0],-1),[]);assert.strictEqual(clip(c,[1,0,0],20),c);
});
test('P95 diagonal clipping checked against tetrahedron analytic volume',()=>{
 const c=box(0,10,0,10,0,10),n=[1,1,1].map(x=>x/Math.sqrt(3));near(properties(clip(c,n,10/Math.sqrt(3))).volumeMm3,1000/6);
});
test('P95 subtraction handles inner cavity, edge contact, full cover and sequential cuts',()=>{
 const c=box(0,10,0,10,0,10),d=box(2,8,2,8,2,8),p=subtractConvex(c,d);near(volume(p),784);assert.ok(p.every(x=>!swept(x,d)));
 for(let i=0;i<p.length;i++)for(let j=0;j<i;j++)assert.equal(swept(p[i],p[j]),false);
 near(volume(subtractConvex(c,box(10,12,0,10,0,10))),1000);assert.deepEqual(subtractConvex(c,box(-1,11,-1,11,-1,11)),[]);
 near(volume(subtractMany([c],[box(0,2,0,10,0,10),box(8,10,0,10,0,10)])),600);
});
test('P95 corner arcs stay outside concrete; volumes agree with rounded exact path',()=>{
 const loop=baseLoop(100,50),concrete=box(0,100,0,50,0,175);assert.equal(loop.solids.length,68);assert.ok(loop.maxArcSagMm<.006);assert.ok(loop.solids.every(f=>!swept(f,concrete)));
 near(loop.exactCenterlineLengthMm,300+6*Math.PI);assert.ok(Math.abs(volume(loop.solids)-loop.exactAreaMm2*1.1)<.12);
 assert.throws(()=>baseLoop(100,50,6));
});
test('P95 compression stack is geometric only and supplier capacity remains unknown',()=>{
 const c=compressionRange();near(c.minRatio,1-1.25/1.9);near(c.maxRatio,.5);assert.equal(c.compressionForceN,null);assert.equal(c.supplierCompoundValidated,false);
});
test('P95 twelve rubber cut pieces are distinct from five assembled seals',()=>{
 const p=baseCutPieces(100,50);assert.equal(p.length,8);assert.equal(p.filter(x=>x.role==='STRAIGHT_STRIP').length,4);near(volume(p.flatMap(x=>x.freeSolids)),volume(baseLoop(100,50,3,0,2).solids));
 const e=junctionEnvelope();assert.ok(e.withinProposedEnvelope);assert.ok(e.marginMm>.08);assert.equal(junctionEnvelope({installedFootWidthMax:2.7}).withinProposedEnvelope,false);
});
test('P95 all six cases remove the correct steel without changing the cavity',()=>{
 for(const family of families){const c=build(family),a=audit(c);assert.deepEqual(a.initialCollisions,[]);near(a.baseRemovedMm3,a.baseVolumeApproxMm3,.001);near(a.verticalRemovedMm3,2618,.001);assert.equal(c.seals.length,5);assert.equal(c.verticals.length,4);assert.ok(c.materialChanges.every(m=>m.removedSteelKg>0));}
});
test('P95 revised nominal paths preserve end-first release and distinguish recovery from SAT',()=>{
 for(const family of families){const r=removalAudit(build(family));assert.equal(r.steps.length,44);assert.ok(r.steps.every(s=>!s.hits.length));assert.deepEqual(r.steps.slice(36).map(s=>s.id),['M03','M03','M04','M04','M01','M01','M02','M02']);near(r.mainTravelFreeRecoveryCheck.minClearanceMm,.7);assert.equal(r.sealStateInSweptCheck,'INSTALLED_COMPRESSED_NOMINAL');assert.match(r.limits[0],/not a rubber/);}
});
