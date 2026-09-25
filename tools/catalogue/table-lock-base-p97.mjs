import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadTableBasesP97(root){
 const path='output/table-lock-base-p97/assets.json';let b;try{b=await readFile(resolve(root,path));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const assets=JSON.parse(b),pins=[{path,sha256:hash(b)}],records=[];
 assert.equal(assets.revision,'P97');assert.equal(assets.status,'BASE_LOADPATH_CANDIDATE');assert.equal(assets.stageComplete,false);assert.equal(assets.productionReleased,false);assert.equal(assets.engineeringApproved,false);
 assert.deepEqual(assets.records.map(r=>r.family),['F2660','NF02','NW01','NW02','NR-S','NR-N']);assert.deepEqual(assets.commonFiles.map(f=>f.path),['output/table-lock-base-p97/DETAIL_TH.md']);
 const pin=async p=>{assert.equal(hash(await readFile(resolve(root,p.path))),p.sha256,'Stale P97 input: '+p.path);pins.push(p);};
 for(const p of [...assets.pins,...assets.commonFiles])await pin(p);
 for(const r of assets.records){
  assert.deepEqual(r.files.map(f=>f.path),['json','svg','png','csv'].map(ext=>`output/table-lock-base-p97/${r.family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`));
  for(const f of r.files)await pin(f);const data=JSON.parse(await readFile(resolve(root,r.files[0].path)));
  assert.equal(data.family,r.family);assert.equal(data.status,'BASE_LOADPATH_CANDIDATE');assert.equal(data.stageComplete,false);assert.equal(data.productionReleased,false);assert.equal(data.engineeringApproved,false);
  assert.equal(data.cuts.length,52);assert.equal(data.welds.length,136);assert.equal(data.geometry.motion.steps.length,44);assert.ok(data.geometry.motion.steps.every(s=>!s.hits.length));assert.deepEqual(data.geometry.initialCollisions,[]);
  assert.equal(data.endTieCases.length,12);assert.equal(data.demand.length,192);assert.ok(data.demand.every(d=>d.capacityRatio===null));
  for(const p of data.sources)await pin(p);assert.deepEqual(r.sourceSetups,data.sourceSetups);
  const parent=JSON.parse(await readFile(resolve(root,`output/table-channel-p94/${r.family}.json`)));assert.deepEqual(r.sourceSetups,parent.sourceSetups);
  for(const id of r.sourceSetups)records.push({id,family:r.family,files:[...r.files,...assets.commonFiles]});
 }
 assert.equal(records.length,9);assert.equal(new Set(records.map(r=>r.id)).size,9);return {revision:'P97',records,pins};
}
