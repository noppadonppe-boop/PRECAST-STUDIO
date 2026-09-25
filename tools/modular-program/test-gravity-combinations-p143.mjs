import assert from 'node:assert/strict';
import {gravityCombinations,evaluateScalar,assertFinalReady,build} from './stage7-gravity-combinations-p143.mjs';
const cs=gravityCombinations();
assert.equal(cs.length,16);
for(const c of cs) assert.ok(['Lr','S','R'].filter(x=>x in c.coefficients).length<=1);
const synthetic={D:{complete:true,valueKN:100},L:{complete:true,valueKN:20},Lr:{complete:true,valueKN:10}};
assert.equal(evaluateScalar({D:1.4},synthetic).totalKN,140);
assert.equal(evaluateScalar({D:1.2,L:1.6,Lr:0.5},synthetic).totalKN,157);
assert.equal(evaluateScalar({D:1.2,L:1,Lr:1.6},synthetic).totalKN,156);
assert.equal(evaluateScalar({D:1.2,Lr:1.6},synthetic).totalKN,136);
assert.equal(evaluateScalar({D:1.2,R:1.6},synthetic).totalKN,null);
assert.equal(evaluateScalar({D:1.4},{D:{complete:false,valueKN:100}}).totalKN,null);
assert.equal(evaluateScalar({D:1.4},{D:{complete:true,valueKN:null}}).totalKN,null);
assert.equal(evaluateScalar({D:1.4},{D:{complete:true,valueKN:NaN}}).totalKN,null);
assert.equal(evaluateScalar({D:1.4},{D:{complete:true,valueKN:0}}).totalKN,0);
assert.ok(cs.some(c=>c.coefficients.D===1.2 && Object.keys(c.coefficients).length===1));
const result=build();
const falseApproval=structuredClone(result.products[0]);
for(const key of Object.keys(falseApproval.readiness)) falseApproval.readiness[key]=true;
assert.throws(()=>assertFinalReady(falseApproval),/numeric complete dead load/);
for(const p of result.products) {
  assert.throws(()=>assertFinalReady(p));
  assert.equal(p.deadLoad.completeBuildingDeadLoadKN,null);
  assert.equal(p.roofLoad.totalRainKN,null);
  assert.equal(p.nativeStaadRun,false);
}
console.log('PASS: independent synthetic arithmetic, transient absence, roof alternatives, null/NaN rejection and all48 final-export guards. No structural result claimed.');
