import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileSlots} from './file-slots-a01.mjs';
import {root,build} from './build-r02.mjs';
test('every product has exactly one RVT and one STD obligation',()=>{
 const {slots}=fileSlots();assert.equal(new Set(slots.map(s=>s.id)).size,96);
 for(const p of build().products)assert.deepEqual(slots.filter(s=>s.productId===p.id).map(s=>s.kind),['RVT','STD']);
});
test('all slots are private and honestly pending at correct stages',()=>{
 for(const s of fileSlots().slots){assert.equal(s.artifactId,null);assert.equal(s.intakeStatus,'NOT_CREATED');assert.equal(s.nativeValidationStatus,'NOT_CHECKED');assert.equal(s.visibility,'INTERNAL_TEAM');assert.equal(s.dueStage,s.kind==='RVT'?'P6':'P7');}
});
test('saved file-slot supplement matches generation',()=>{assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'data/modular-program/r02/file-slots-a01.json'),'utf8')),fileSlots());});
