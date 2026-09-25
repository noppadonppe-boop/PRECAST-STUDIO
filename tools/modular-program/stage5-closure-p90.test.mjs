import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {read,sha} from './foot-flex-audit-p90.mjs';
const d=read('output/stage5-closure-p90/register.json');
test('44 unique setups, eight intact P40 requirements each',()=>{
 assert.equal(d.records.length,44);assert.equal(new Set(d.records.map(r=>r.id)).size,44);
 for(const r of d.records){assert.deepEqual(r.requirements.map(x=>x.tag),Array.from({length:8},(_,i)=>'P40-'+(i+1)));assert.deepEqual(read('output/stage5-closure-p90/'+r.id+'.json'),r);assert.equal(r.completeP40Design,false);}
 assert.deepEqual(d.workstreams.map(g=>g.setups.length),[12,9,2,8,9,4]);
 assert.ok(d.workstreams.find(g=>g.id==='ABD_SHELL').next.includes('ตรวจครบเฉพาะขาผนัง W01'));
 assert.ok(!d.workstreams.find(g=>g.id==='ABD_SHELL').next.includes('ปิดผล demand P90 ให้ครบ'));
});
test('evidence hashes and shared geometry are exact, not visually inferred',()=>{
 for(const i of d.pins)assert.equal(sha(i.path),i.sha256,i.path);
 assert.equal(d.generatorSha256,sha('tools/modular-program/stage5-closure-p90.mjs'));
 assert.equal(d.sharedSources[0].setups.length,4);
});
test('P52 assumption preserved, nine changed casting plans flagged',()=>{
 assert.equal(d.records.filter(r=>r.liftingCoordinateReview==='REMAP_REQUIRED_P52_TO_P56').length,9);
 assert.ok(d.pins.some(p=>p.path==='knowledge/modular-program-r02/decision-lifting-p52.json'));
 assert.equal(d.coverage.inventoryPercent,100);assert.equal(d.stageCompletionPercent,null);assert.equal(d.stageComplete,false);assert.equal(d.productionReleased,false);
});
