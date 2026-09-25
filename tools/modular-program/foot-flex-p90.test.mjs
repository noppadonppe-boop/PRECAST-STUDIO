import test from 'node:test';import assert from 'node:assert/strict';
import {audit,checkResult,read,dir} from './foot-flex-audit-p90.mjs';
const a=audit();
for(const r of a.rows)test(r.id+' native mesh refinement',()=>assert.ok(r.refinementAccepted,JSON.stringify(r)));
for(const r of a.sensitivity)test('Pilot Leff'+r.effectiveBoltLengthMm+' refinement',()=>assert.ok(r.refinementAccepted,JSON.stringify(r)));
test('No mirror-derived or S00 extrapolated results',()=>{assert.equal(a.mirrorReuse.used,false);assert.equal(a.verifiedNativeFiles,64);assert.ok(a.rows.every(r=>r.executionMethod==='NATIVE_OPENSEES_SOLVE'&&r.key.endsWith('W01')));});
const p=read(dir+'/'+a.rows[0].fineFile);
for(const [label,mutate] of [
 ['stale input',r=>r.inputs[0].sha256='stale'],
 ['old washer',r=>r.basis.washerPatchRadiusMm=20],
 ['imbalance',r=>r.forceResidualN=[0,0,100]],
 ['MPC violation',r=>r.meshAudit.maxWasherConstraintErrorMm=.1],
 ['old solver',r=>r.solverSha256='old'],
 ['claimed release',r=>r.productionReleased=true],
 ['invented native',r=>r.executionMethod='MIRROR_DERIVED_LOCAL_RESPONSE']
])test('Reject '+label,()=>{const v=structuredClone(p);mutate(v);assert.throws(()=>checkResult(v));});
