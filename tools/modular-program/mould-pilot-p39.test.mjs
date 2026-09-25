import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {out,check,swept} from './mould-pilot-p39.mjs';
const model=JSON.parse(fs.readFileSync(path.join(out,'model.json')));
const box=(x,y,z)=>({poly:[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],z0:z,z1:z+1});
test('source geometry and hash remain traceable',()=>{
 const bytes=fs.readFileSync(model.source);
 assert.equal(model.sourceSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.deepEqual(model.concreteFacesMm,JSON.parse(bytes).cavity.facesMm);
});
test('13 unique proposed assemblies; not production approved',()=>{
 assert.equal(model.parts.length,13);assert.equal(new Set(model.parts.map(p=>p.id)).size,13);
 assert.equal(model.engineeringApproved,false);assert.equal(model.productionReleased,false);
 for(const p of model.parts)for(const c of p.cells){assert.ok(c.z1>c.z0);assert.ok(c.poly.length>=3);}
});
test('nominal assembly and 16 continuous motion legs pass',()=>{
 const audit=check();assert.equal(audit.status,'PASS_NOMINAL_MODEL_ONLY');
 assert.equal(audit.steps.length,16);assert.deepEqual(audit.initialInterferences,[]);
 assert.ok(audit.steps.every(s=>s.hits.length===0));
 assert.ok(Math.abs(audit.sourceVolumeM3-audit.collisionVolumeM3)<1e-9);
});
test('continuous SAT detects mid-path crossing, separates clear paths and vertical motion',()=>{
 assert.equal(swept(box(0,0,0),box(2,0,0),[4,0,0]),true);
 assert.equal(swept(box(0,0,0),box(1,0,0),[-3,0,0]),false);
 assert.equal(swept(box(0,0,0),box(2,2,0),[4,0,0]),false);
 assert.equal(swept(box(0,0,0),box(0,0,2),[0,0,4]),true);
 assert.equal(swept(box(0,0,0),box(0,0,2),[0,0,-4]),false);
});
test('four full-size boards include development-only warning',()=>{
 for(const name of ['01-OVERVIEW','02-PARTS','03-SEQUENCE','04-DIMENSIONS']){
  const png=fs.readFileSync(path.join(out,name+'.png'));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),2400);assert.equal(png.readUInt32BE(20),1700);
  assert.match(fs.readFileSync(path.join(out,name+'.svg'),'utf8'),/NOT RELEASED FOR FABRICATION/);
 }
});
