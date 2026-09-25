import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkResult} from './foot-flex-audit-p86.mjs';
const dir='output/foot-flex-p86',audit=JSON.parse(fs.readFileSync(dir+'/audit.json'));
for(const row of audit.rows)test(row.id+' | force and displacement refinement <=2%',()=>{
 assert.ok(row.refinementAccepted,JSON.stringify(row));
 assert.ok(row.maximumTensionKN>0&&row.maxUpwardDisplacementMm>0);
});
test('12 independently solved LH/RH pairs',()=>{
 assert.equal(audit.mirrorChecks.length,12);
 for(const r of audit.mirrorChecks)assert.ok(r.passed,JSON.stringify(r));
});
test('rigid stiffness limit agrees within 1%',()=>assert.ok(audit.rigidLimit.passed));
test('independent thin-plate bending scale within 1%',()=>assert.ok(audit.plateBenchmark.passed&&audit.plateBenchmark.fineGridRelativeError<.01));
const pilot=JSON.parse(fs.readFileSync(dir+'/A-LH-W01-M01-F1-h10.json'));
test('reject reaction imbalance',()=>assert.throws(()=>checkResult({...pilot,forceResidualN:[0,0,100]})));
test('reject incompatible washer motion even if equilibrium closes',()=>assert.throws(()=>checkResult({...pilot,meshAudit:{...pilot.meshAudit,maxWasherConstraintErrorMm:.1}})));
test('reject stale solver hash',()=>assert.throws(()=>checkResult({...pilot,solverSha256:'stale'})));
test('reject production release',()=>assert.throws(()=>checkResult({...pilot,productionReleased:true})));
