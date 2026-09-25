import fs from 'node:fs';import path from 'node:path';import {test} from 'node:test';import assert from 'node:assert/strict';
import {root,hash,volumeCg} from './stage5-p38.mjs';import {out} from './notched-mould-p54.mjs';
import {rect,collide,properties,drilled,disk,shift} from './prism-tools-p54.mjs';
test('continuous collision detects mid-path obstacle; drilled hole clears nominal shaft',()=>{assert.equal(collide([rect(0,1,0,1,0,1)],[rect(2,3,0,1,0,1)],[4,0,0]),true);assert.equal(collide([rect(0,1,0,1,0,1)],[rect(1,2,0,1,0,1)],[-2,0,0]),false);assert.equal(collide(drilled(rect(-40,40,-40,40,0,12),0,0),[disk(0,0,8,-10,30)]),false);});
for(const side of ['N01','N02'])test(side+' source, mass, mirror, tool access and actual continuous removal',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(out,side,'model.json'))),s=JSON.parse(fs.readFileSync(path.join(root,m.source.path)));
 assert.equal(hash(path.join(root,m.source.path)),m.source.sha256);assert.deepEqual(m.concreteFacesMm,s.cavity.facesMm);assert.equal(m.concreteKg,s.mass.concreteKg);
 assert.ok(Math.abs(properties(m.concreteCells).volumeMm3/1e9-volumeCg(s.cavity.facesMm).volumeM3)<1e-9);
 assert.equal(m.lockSchedule.length,15);assert.equal(m.stockPieceCount,73);assert.equal(m.physicalSubassemblyCount,7);assert.equal(m.nominalFastenerObjectCount,47);assert.equal(m.lockSchedule.filter(c=>c.pin).length,2);
 assert.equal(m.audit.steps.length,54);assert.equal(m.audit.socket.length,15);assert.ok(m.audit.socket.every(s=>s.clear));assert.deepEqual(m.audit.initialHits,[]);assert.deepEqual(m.audit.straightPullRejected.hits,['M03']);
 const active=new Map(m.parts.map(p=>[p.id,p.cells]));for(let i=0;i<m.audit.steps.length;i++){const st=m.audit.steps[i],cells=active.get(st.id);assert.ok(!collide(cells,m.concreteCells,st.translationMm));for(const [id,q]of active)if(id!==st.id)assert.ok(!collide(cells,q,st.translationMm),`${st.id}/${id}`);active.set(st.id,cells.map(c=>shift(c,st.translationMm)));if(m.audit.steps[i+1]?.id!==st.id)active.delete(st.id);}
 assert.deepEqual([...active.keys()],['M00']);assert.equal(m.engineeringApproved,false);assert.equal(m.productionReleased,false);
 const gross=m.stock.reduce((sum,r)=>sum+r.quantity*(r.shape==='PLATE'?r.sizeMm.reduce((a,v)=>a*v,1):(r.sectionMm[0]*r.sectionMm[1]-(r.sectionMm[0]-2*r.sectionMm[2])*(r.sectionMm[1]-2*r.sectionMm[2]))*r.cutLengthMm),0);
 const holeArea=32/2*9**2*Math.sin(2*Math.PI/32),pinArea=32/2*5.5**2*Math.sin(2*Math.PI/32),net=gross-(15*holeArea+2*pinArea)*(6+12+14);assert.ok(Math.abs(net-properties(m.parts.filter(p=>p.id.startsWith('M')).flatMap(p=>p.cells)).volumeMm3)<.02,'Stock sum matches drilled model');
});
test('whole mirrored assembly keeps mass and mirrored CG',()=>{const a=JSON.parse(fs.readFileSync(path.join(out,'N01/model.json'))),b=JSON.parse(fs.readFileSync(path.join(out,'N02/model.json')));assert.ok(Math.abs(a.steelMassKg-b.steelMassKg)<1e-7);assert.ok(Math.abs(a.steelCgMm[0]+b.steelCgMm[0]-2797.5)<1e-7);assert.ok(Math.abs(a.steelCgMm[1]-b.steelCgMm[1])<1e-7);for(let i=0;i<a.lockSchedule.length;i++)assert.ok(Math.abs(a.lockSchedule[i].x+b.lockSchedule[i].x-2797.5)<1e-7);});
