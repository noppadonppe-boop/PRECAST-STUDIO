import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';
import {loadCastingLiftsP91} from './casting-lifts-p91.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P91 supplementary casting layouts: exactly nine source-pinned records and27 artifacts',async()=>{
 const r=await loadCastingLiftsP91(root);assert.equal(r.records.length,9);assert.equal(r.records.flatMap(x=>x.files).length,27);
 assert.ok(r.pins.some(x=>x.path==='knowledge/modular-program-r02/decision-lifting-p52.json'));
 for(const x of r.records){assert.equal(x.revision,'P91');assert.equal(x.geometryRevision,'P56');assert.equal(x.files.length,3);}
 assert.equal(r.pins.filter(x=>x.path.startsWith('output/cap-hardware-p56/')).length,9);
 assert.equal(r.pins.filter(x=>x.path.startsWith('output/concrete-lift-p52/')).length,9);
});
