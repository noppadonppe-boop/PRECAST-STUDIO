import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const input=JSON.parse(fs.readFileSync('output/revit-p6/input.json','utf8'));
test('48 unique source models retain all 1584 instances and hashes',()=>{
 assert.equal(input.models.length,48);assert.equal(new Set(input.models.map(m=>m.id)).size,48);
 assert.equal(input.models.reduce((s,m)=>s+m.instances.length,0),1584);
 for(const m of input.models){const b=fs.readFileSync(m.sourcePath);assert.equal(createHash('sha256').update(b).digest('hex'),m.sourceSha256);const source=JSON.parse(b);assert.deepEqual(m.instances.map(i=>i.id),source.instances.map(i=>i.id));assert.deepEqual(m.openings,source.openings);}
});
test('44 typical references have valid perpendicular native extrusion geometry',()=>{
 assert.equal(new Set(input.library.map(i=>i.typicalId)).size,44);
 for(const f of input.library)for(const p of f.prisms){assert.ok(p.depth>0);assert.ok(Math.abs(Math.hypot(...p.direction)-1)<1e-6);for(let i=0;i<p.profile.length;i++){const a=p.profile[i],b=p.profile[(i+1)%p.profile.length];assert.ok(Math.abs(a.reduce((s,v,k)=>s+(b[k]-v)*p.direction[k],0))<.01,f.key);}}
});
