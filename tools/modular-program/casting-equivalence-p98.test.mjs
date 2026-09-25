import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFaces,volumeCg,inversePose,validateRotation,auditRecord} from './casting-equivalence-p98.mjs';
import {box} from './table-channel-p94.mjs';
import {read} from './table-weld-p93.mjs';
test('P98 topology comparison rejects changed edge cycles, openings and displaced faces',()=>{
 const b=box(0,10,0,20,0,30),equivalent=[...b].reverse().map(f=>[...f.slice(1),f[0]].reverse());
 assert.equal(compareFaces(b,equivalent).sameFacetsAndCyclicEdges,true);
 const moved=structuredClone(b);moved[0][0][0]+=.01;assert.equal(compareFaces(b,moved).sameFacetsAndCyclicEdges,false);
 const crossed=structuredClone(b);[crossed[0][1],crossed[0][2]]=[crossed[0][2],crossed[0][1]];assert.equal(compareFaces(b,crossed).sameFacetsAndCyclicEdges,false);
 assert.equal(compareFaces(b,b.slice(1)).sameFacetsAndCyclicEdges,false);
});
test('P98 mass and proper rotation round-trip benchmarks',()=>{
 const p=volumeCg(box(10,20,30,50,60,90));assert.equal(p.volumeMm3,6000);assert.deepEqual(p.cgMm,[15,40,75]);
 const R=[[1,0,0],[0,0,1],[0,-1,0]];validateRotation(R);
 assert.deepEqual(inversePose([5,10,15],{basisRows:R,rotatedOriginMm:[10,20,30]}),[15,-45,30]);
 assert.throws(()=>validateRotation([[-1,0,0],[0,1,0],[0,0,1]]));
});
test('P98 independently repeats all44 pinned comparisons, including9 rotated caps',()=>{
 const index=read('output/casting-equivalence-p98/register.json'),old=read('output/stage5-closure-p90/register.json');assert.equal(index.checked,44);
 for(const r of old.records){const a=auditRecord(r),b=index.records.find(x=>x.id===r.id);assert.deepEqual(a,b);assert.ok(a.matches);assert.equal(a.stageComplete,false);assert.equal(a.engineeringApproved,false);assert.equal(a.productionReleased,false);}
 assert.equal(index.records.filter(r=>r.currentPose).length,9);
});
