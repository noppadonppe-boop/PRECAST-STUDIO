import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadTableSealsP95(root){
 const path='output/table-seal-p95/assets.json';let b;try{b=await readFile(resolve(root,path));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const assets=JSON.parse(b),pins=[{path,sha256:hash(b)}],records=[];
 assert.equal(assets.revision,'P95');assert.equal(assets.status,'SEAL_LAYOUT_CANDIDATE');assert.equal(assets.stageComplete,false);assert.equal(assets.productionReleased,false);assert.equal(assets.engineeringApproved,false);
 assert.deepEqual(assets.records.map(r=>r.family),['F2660','NF02','NW01','NW02','NR-S','NR-N']);assert.deepEqual(assets.commonFiles.map(f=>f.path),['output/table-seal-p95/DETAIL_TH.md']);
 const pin=async p=>{assert.equal(hash(await readFile(resolve(root,p.path))),p.sha256,'Stale P95 input: '+p.path);pins.push(p);};
 for(const p of [...assets.pins,...assets.commonFiles])await pin(p);
 for(const r of assets.records){
  assert.deepEqual(r.files.map(f=>f.path),['json','svg','png','csv'].map(ext=>`output/table-seal-p95/${r.family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`));
  for(const f of r.files)await pin(f);const data=JSON.parse(await readFile(resolve(root,r.files[0].path)));
  assert.equal(data.family,r.family);assert.equal(data.status,'SEAL_LAYOUT_CANDIDATE');assert.equal(data.stageComplete,false);assert.equal(data.productionReleased,false);assert.equal(data.engineeringApproved,false);
  assert.equal(data.compression.compressionForceN,null);assert.equal(data.compression.supplierCompoundValidated,false);assert.equal(data.sealCounts.cutPieces,12);assert.equal(data.motion.steps.length,44);assert.ok(data.motion.steps.every(s=>!s.hits.length));
  await pin(data.source);const parent=JSON.parse(await readFile(resolve(root,data.source.path)));assert.deepEqual(r.sourceSetups,parent.sourceSetups);
  for(const id of r.sourceSetups)records.push({id,family:r.family,files:[...r.files,...assets.commonFiles]});
 }
 assert.equal(records.length,9);assert.equal(new Set(records.map(r=>r.id)).size,9);return {revision:'P95',records,pins};
}
