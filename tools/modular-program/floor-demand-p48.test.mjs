import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
for(const family of ['F2660','NF02']){
 const r=JSON.parse(fs.readFileSync(`output/floor-demand-p48/${family}.json`));
 test(`${family}: source revision, equilibrium and allocations`,()=>{
  assert.equal(createHash('sha256').update(fs.readFileSync(r.source)).digest('hex'),r.sourceSha256);
  const [L,W,H]=r.cavityMm;
  for(const c of r.cases){assert.equal(c.ribs.length,13);assert.equal(c.pads.length,4);assert.ok(Math.abs(c.ribs.reduce((s,x)=>s+x.tributaryMm,0)-L)<1e-8);Object.values(c.equilibrium).forEach(x=>assert.ok(Math.abs(x)<.01));assert.ok(c.pads.every(x=>x.verticalN>0));assert.ok(c.rails.every(x=>x.extremaSamplingDifferenceMm<.001));}
  for(const parent of ['M01','M02','M03','M04']){const locks=r.lockDemands.filter(x=>x.parent===parent),length=['M01','M02'].includes(parent)?L:W;assert.ok(Math.abs(locks.reduce((s,x)=>s+x.horizontalAllocatedN,0)-25*H/1e6*H*length/2)<1e-8);}
  assert.equal(r.engineeringApproved,false);assert.equal(r.productionReleased,false);
 });
}
