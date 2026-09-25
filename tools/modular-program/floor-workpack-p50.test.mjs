import fs from 'node:fs';import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const volume=c=>{let a=0;for(let i=0;i<c.poly.length;i++){const p=c.poly[i],q=c.poly[(i+1)%c.poly.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a/2)*(c.z1-c.z0);};
for(const family of ['F2660','NF02']){
 const p=JSON.parse(fs.readFileSync(`output/floor-workpack-p50/${family}-parts.json`)),m=JSON.parse(fs.readFileSync(p.geometrySource));
 test(`${family}: BOM volume reconciles with steel solids excluding hardware`,()=>{
  let v=0;for(const r of p.rows){const d=r.dimensionsMm;v+=r.quantity*(r.stock==='RHS'?(d[0]*d[1]-(d[0]-2*d[2])*(d[1]-2*d[2]))*d[3]:d[0]*d[1]*d[2]);}
  const holePolygonArea=16*9**2*Math.sin(Math.PI/16);v-=12*holePolygonArea*(6+12+14);
  const actual=m.parts.filter(x=>/^M0/.test(x.id)).flatMap(x=>x.cells).reduce((s,c)=>s+volume(c),0);
  assert.ok(Math.abs(v-actual)<.01,`${v} vs ${actual}`);assert.equal(p.stockPieceCount,60);assert.equal(p.hardwarePieceCount,36);
 });
 test(`${family}: source hash and drilling origins reconcile`,()=>{
  assert.equal(createHash('sha256').update(fs.readFileSync(p.geometrySource)).digest('hex'),p.geometrySha256);
  p.holes.forEach(h=>{const s=m.lockSchedule.find(l=>l.id===h.id);assert.deepEqual(h.cavityOriginXYmm,[s.x,s.y]);assert.deepEqual(h.bedPlateCornerXYmm,[s.x+120,s.y+120]);});assert.equal(p.productionReleased,false);
 });
}
