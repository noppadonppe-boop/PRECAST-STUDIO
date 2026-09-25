import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {compose,out} from './mould-consolidation-p99.mjs';
import {read,sha} from './table-weld-p93.mjs';
import {bounds,compareFaces} from './casting-equivalence-p98.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
test('P99 all44 composed models reproduce source overlays, metadata and motion identities',()=>{
 const eq=read('output/casting-equivalence-p98/register.json'),reg=read(`${out}/register.json`);
 assert.equal(reg.records.length,44);assert.equal(new Set(reg.records.map(r=>r.id)).size,44);
 const products=new Set();
 for(const a of eq.records){
  const expected=compose(a),r=reg.records.find(r=>r.id===a.id),m=read(r.model);assert.equal(sha(r.model),r.sha256);assert.deepEqual(m,expected);
  assert.equal(m.units,'mm');assert.equal(m.stageComplete,false);assert.equal(m.engineeringApproved,false);assert.equal(m.productionReleased,false);
  assert.equal(m.concrete.nominalKg,a.metrics.authoritativeConcreteKg);assert.ok(compareFaces(m.concrete.faces,expected.concrete.faces).sameFacetsAndCyclicEdges);
  for(const p of [...m.parts,...m.seals]){assert.deepEqual(p.envelopeMm,bounds(p.solids.flat()));assert.ok(p.dimensionsXYZmm.every(x=>x>0));assert.equal(p.nominalStockMassKg===null,p.material!=='STEEL_NOMINAL');}
  for(const s of m.usedBy)products.add(s.productId);
  if(m.kind==='TABLE'){assert.equal(m.parts.length,41);assert.equal(m.seals.length,5);assert.equal(m.motions.length,44);assert.ok(m.motions.every(x=>x.nominalHits.length===0));}
  if(m.kind==='ABD_SHELL'){assert.equal(m.parts.length,a.id.includes('W01')?186:159);assert.ok(m.remainingDesign.some(s=>s.includes('P89 remains separate')));}
  assert.equal(m.qaPlan.length,5);assert.ok(m.qaPlan.every(q=>q.accepted===false));assert.ok(m.remainingDesign.length>0);
 }
 assert.equal(products.size,48);
});
test('P99 all44 boards and parts atlases match records, include end cores and avoid false cut dimensions',async()=>{
 const assets=read(`${out}/assets.json`);assert.equal(assets.records.length,44);
 for(const p of assets.pins)assert.equal(sha(p.path),p.sha256);
 for(const r of assets.records){
  assert.equal(r.files.length,8);for(const f of r.files)assert.equal(sha(f.path),f.sha256);
  const m=read(r.files[0].path),major=m.parts.filter(p=>/^[MCW]\d\d$/.test(p.tag));
  const b=await sharp(`${out}/${r.id}-board.png`).metadata(),p=await sharp(`${out}/${r.id}-parts.png`).metadata();assert.equal(b.width,2200);assert.equal(b.height,1650);assert.equal(p.width,2200);assert.equal(p.height,200+Math.ceil(major.length/3)*450);
  const atlas=fs.readFileSync(`${out}/${r.id}-parts.svg`,'utf8');for(const part of major)assert.ok(atlas.includes('>'+part.tag+'</text>'));assert.match(atlas,/not a cutting dimension/);
  if(m.kind==='END')assert.equal(major.some(x=>x.tag==='C01'),m.id.includes('-D01-'));
  assert.equal(fs.readFileSync(`${out}/${r.id}-components.csv`,'utf8').trim().split('\n').length,m.parts.length+m.seals.length+1);
  assert.equal(fs.readFileSync(`${out}/${r.id}-sequence.csv`,'utf8').trim().split('\n').length,m.motions.length+1);
 }
});
