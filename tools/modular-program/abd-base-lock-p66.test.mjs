import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {keys,collide} from './abd-base-lock-p66.mjs';import {properties} from './prism-tools-p54.mjs';
const read=k=>JSON.parse(fs.readFileSync(`output/abd-base-lock-p66/${k}.json`));
for(const k of keys)test(k+' source, holes and integrated withdrawal',()=>{
 const m=read(k),src=JSON.parse(fs.readFileSync(`output/abd-roof-frame-p65/${k}.json`));
 assert.deepEqual(m.concrete,src.concrete);assert.equal(m.baseFeet.length,10);assert.equal(m.baseLocks.length,40);
 assert.deepEqual(m.audit.staticHits,[]);assert.deepEqual(m.audit.moves.filter(v=>v.hits.length),[]);assert.deepEqual(m.audit.socketChecks.filter(v=>v.hits.length),[]);
 assert.deepEqual(m.audit.remainingTags,['M00']);assert.equal(m.audit.moves.length,k.endsWith('W01')?211:173);
 const expected=40*32/2*100*Math.sin(2*Math.PI/32)*20;assert.ok(Math.abs(m.bedBoreRemovedVolumeMm3-expected)<.1);
 for(const n of ['wall','roof','end'])assert.deepEqual(m[n+'FrameProperties'],properties(m[n+'FrameStock'].flatMap(p=>p.cells)));
 assert.equal(m.productionReleased,false);
});
test('negative: former short withdrawal hits retained washer',()=>{const m=read('A-LH-S00'),b=m.parts.find(p=>p.tag==='M01-F1-B1'),w=m.parts.find(p=>p.tag===b.tag+'-W');const raised=b.cells.map(c=>({...c,z0:c.z0+50,z1:c.z1+50}));assert.ok(collide(raised,w.cells,[-400,0,0]));});
test('negative: unbored bed obstructs screws',()=>{const m=read('A-LH-S00'),src=JSON.parse(fs.readFileSync('output/abd-roof-frame-p65/A-LH-S00.json'));assert.ok(collide(m.parts.find(p=>p.tag===m.baseLocks[0].tag).cells,src.parts.find(p=>p.tag==='M00').cells));});
for(const f of ['A','B','D'])test(f+' LH/RH foot mass and CG',()=>{const a=read(f+'-LH-W01').baseFootProperties,b=read(f+'-RH-W01').baseFootProperties;assert.ok(Math.abs(a.massKg-b.massKg)<1e-6);assert.ok(Math.abs(a.cgMm[0]+b.cgMm[0]-1490)<1e-5);});
