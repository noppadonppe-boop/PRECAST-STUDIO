import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {root,out,setups,volumeCg,hash} from './stage5-p38.mjs';
const ss=setups(),read=p=>JSON.parse(fs.readFileSync(path.join(out,p),'utf8'));
for(const s of ss)test(s.id+' cavity, mould sides, transform, mass and holds',()=>{
 assert.deepEqual(read(s.id+'/setup.json'),JSON.parse(JSON.stringify(s)));assert.ok(s.tooling.some(t=>t.role==='BED'));
 assert.equal(s.cavity.facesMm.flat().every(v=>v.every(Number.isFinite)),true);
 assert.ok(Math.abs(s.mass.meshVolumeM3*2400-s.mass.concreteKg)<.5);
 for(const t of s.tooling)for(const n of t.suggestedPatchReleaseVectors)assert.ok(Math.abs(Math.hypot(...n)-1)<1e-8);
 const m=JSON.parse(fs.readFileSync(path.join(root,s.source.model))),src=m.instances.find(i=>i.id===s.source.instanceId);const {basisRows:a,rotatedOriginMm:b}=s.castingTransform;
 for(let j=0;j<s.cavity.facesMm.length;j++)for(let k=0;k<s.cavity.facesMm[j].length;k++){const v=s.cavity.facesMm[j][k],back=[0,1,2].map(c=>a.reduce((sum,row,r)=>sum+row[c]*(v[r]+b[r]),0));assert.ok(back.every((n,c)=>Math.abs(n-src.facesMm[j][k][c])<1e-7));}
 for(const o of s.openings){assert.equal(o.verticesCastingMm.length,8);assert.ok(volumeCg(o.facesMm).volumeM3>0);assert.ok(o.verticesCastingMm.every(v=>v.every((n,k)=>n>=-.001&&n<=s.cavity.dimensionsMm[k]+.001)));}
 const solid=ss.find(r=>r.typicalId===s.typicalId.replace('-W01-','-S00-').replace('-D01-','-S01-'));
 if(s.openings.length)assert.ok(Math.abs(s.mass.concreteKg+s.openings.reduce((sum,o)=>sum+volumeCg(o.facesMm).volumeM3*2400,0)-solid.mass.concreteKg)<.5);
 assert.equal(s.lifting.anchorCoordinatesMm,null);assert.equal(s.lifting.releasedForLifting,false);assert.equal(s.productionReleased,false);assert.equal(s.cavity.manufacturingToleranceMm,null);
 for(const name of ['00-TYPICAL','01-CAVITY','02-TOOLING']){assert.equal(fs.readFileSync(path.join(out,s.id,name+'.png')).subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.match(fs.readFileSync(path.join(out,s.id,name+'.svg'),'utf8'),/<svg/);}
});
test('44 setups map exact quantities to all48 products without assuming physical mould count',()=>{
 assert.equal(ss.length,44);assert.equal(new Set(ss.map(s=>s.id)).size,44);const r=read('register.json');assert.equal(r.physicalMouldCount,null);
 const ps=read('product-mapping.json').products;assert.equal(ps.length,48);assert.equal(ps.reduce((s,p)=>s+p.pieceCount,0),1584);
 for(const p of ps){assert.equal(p.setups.reduce((s,b)=>s+b.quantity,0),p.pieceCount);assert.ok(p.setups.every(b=>ss.some(s=>s.id===b.setupId&&s.typicalId===b.typicalId)));assert.equal(p.toolSetsToPurchase,null);}
 assert.equal(r.reuseCandidates.length,12);assert.ok(r.reuseCandidates.every(r=>!r.interchangeabilityApproved));
});
test('all input dependencies unchanged and original P35/P36 preserved',()=>{for(const p of read('dependencies.json').sources)assert.equal(hash(path.join(root,p.path)),p.sha256);assert.equal(hash(path.join(root,'output/PM-STAGE3-P36-REVIEW.zip')),'ab8cbf7e8c45aff15dc0f82e84dc235b62dc5f72fe3e9244caa1695add449782');assert.equal(hash(path.join(root,'output/PM-STAGE2-P35-REVIEW.zip')),'5661e4931bd88cf139a45c0ee75214af4dbaa0dd9155148dd717518e512164ae');});
