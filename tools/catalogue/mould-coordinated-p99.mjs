import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadCoordinatedP99(root){
 const path='output/mould-coordinated-p99/assets.json';let bytes;
 try{bytes=await readFile(resolve(root,path));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const a=JSON.parse(bytes),pins=new Map([[path,{path,sha256:hash(bytes)}]]);
 const pin=async p=>{const old=pins.get(p.path);if(old){assert.equal(old.sha256,p.sha256);return;}assert.equal(hash(await readFile(resolve(root,p.path))),p.sha256,'Stale P99: '+p.path);pins.set(p.path,p);};
 const json=async p=>JSON.parse(await readFile(resolve(root,p)));
 const hold=m=>{assert.equal(m.stageComplete,false);assert.equal(m.engineeringApproved,false);assert.equal(m.productionReleased,false);};
 assert.equal(a.revision,'P99');hold(a);assert.equal(a.records.length,44);assert.equal(new Set(a.records.map(r=>r.id)).size,44);
 for(const p of a.pins)await pin(p);
 const reg=await json('output/mould-coordinated-p99/register.json');hold(reg);assert.equal(reg.records.length,44);await pin(reg.sourceRegister);
 const eq=await json(reg.sourceRegister.path);assert.equal(eq.checked,44);assert.equal(eq.mismatch,0);hold(eq);await pin(eq.sourceInventory);await pin({path:'tools/modular-program/casting-equivalence-p98.mjs',sha256:eq.generatorSha256});
 const records=[];
 for(const r of a.records){
  const prefix='output/mould-coordinated-p99/'+r.id;
  assert.deepEqual(r.files.map(f=>f.path),[prefix+'.json',...['board.png','board.svg','components.csv','sequence.csv','parts.png','parts.svg'].map(n=>prefix+'-'+n),'output/casting-equivalence-p98/'+r.id+'.json']);
  for(const f of r.files)await pin(f);
  const m=await json(r.files[0].path),e=await json(r.files.at(-1).path),rr=reg.records.find(x=>x.id===r.id);assert.ok(rr);assert.equal(rr.sha256,r.files[0].sha256);assert.equal(m.id,r.id);assert.equal(m.typicalId,r.typicalId);hold(m);hold(e);
  assert.equal(m.status,'COORDINATED_DEVELOPMENT_MODEL');assert.equal(m.concrete.geometryStatus,'CHECKED_AGAINST_TYPICAL_LINKED_SOURCE');assert.equal(e.matches,true);assert.deepEqual(e,eq.records.find(x=>x.id===r.id));
  assert.equal(m.parts.length,rr.components);assert.equal(m.seals.length,rr.seals);assert.equal(m.motions.length,rr.motions);assert.equal(new Set(m.parts.map(p=>p.tag)).size,m.parts.length);
  assert.ok(m.motions.every(s=>s.tags.every(t=>m.parts.some(p=>p.tag===t))));
  for(const p of [...m.inputs,...e.inputs])await pin(p);
  records.push(r);
 }
 return {revision:'P99',records,pins:[...pins.values()]};
}
