import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const digest=b=>createHash('sha256').update(b).digest('hex');
// Optional supplementary layouts only; never replace historical P52 artifacts.
export async function loadCastingLiftsP91(root){
 const regPath='output/cap-lift-p91/register.json';
 let bytes;try{bytes=await readFile(resolve(root,regPath));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const reg=JSON.parse(bytes),pins=[{path:regPath,sha256:digest(bytes)}];
 const pin=async(path,sha256)=>{assert.equal(digest(await readFile(resolve(root,path))),sha256,'Stale P91 dependency: '+path);pins.push({path,sha256});};
 assert.equal(reg.revision,'P91');assert.equal(reg.stage,5);assert.equal(reg.stageComplete,false);assert.equal(reg.engineeringApproved,false);assert.equal(reg.productionReleased,false);
 assert.deepEqual(reg.records.map(r=>r.key),['CS1','CS2','CC','CE1','CE2','FS1','FS2','FE1','FE2']);
 assert.equal(new Set(reg.records.map(r=>r.id)).size,9);
 await pin('tools/modular-program/cap-lift-p91.mjs',reg.generatorSha256);
 await pin('knowledge/modular-program-r02/decision-lifting-p52.json',reg.decisionSha256);
 const records=[];
 for(const r of reg.records){
  assert.deepEqual(r.files.map(f=>f.path),['json','svg','png'].map(ext=>`output/cap-lift-p91/${r.key}.${ext}`));
  for(const f of r.files)await pin(f.path,f.sha256);
  const m=JSON.parse(await readFile(resolve(root,r.files[0].path)));
  assert.equal(m.id,r.id);assert.equal(m.typicalId,r.typicalId);assert.equal(m.key,r.key);assert.equal(m.geometryRevision,'P56');
  assert.deepEqual(m.source,r.source);assert.deepEqual(m.previousLiftingSource,r.previousLiftingSource);
  assert.equal(m.source.path,`output/cap-hardware-p56/${r.key}.json`);
  for(const ref of [m.source,m.previousLiftingSource,m.originalTypicalSource,m.algorithmSource])await pin(ref.path,ref.sha256);
  assert.equal(m.stageComplete,false);assert.equal(m.engineeringApproved,false);assert.equal(m.productionReleased,false);
  assert.equal(m.verifiedConcreteCapacityKN,null);assert.equal(m.anchorCapacityKN,null);assert.equal(m.notDrillingCoordinates,true);
  records.push({id:r.id,revision:'P91',geometryRevision:'P56',files:r.files});
 }
 return {revision:'P91',records,pins};
}
