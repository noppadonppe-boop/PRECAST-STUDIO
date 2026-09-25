import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build,root} from './build-r02.mjs';
test('48 stable product identities, 12 per family/use and 16 per plan',()=>{
 const d=build(); assert.equal(d.products.length,48); assert.equal(new Set(d.products.map(p=>p.id)).size,48);
 for(const f of ['A','B','C','D']) assert.equal(d.products.filter(p=>p.family===f).length,12);
 for(const u of [1,2,3,4]) assert.equal(d.products.filter(p=>p.use===u).length,12);
 for(const p of ['I','L','U']) assert.equal(d.products.filter(x=>x.plan===p).length,16);
});
test('revision references resolve and plan-specific groups are explicit',()=>{
 const d=build(); const ids=new Set(d.segmentRevisions.map(s=>s.id));
 for(const p of d.products){const r=d.productRevisions.find(r=>r.id===p.currentRevisionId); assert.equal(r.productId,p.id);assert.equal(r.segmentRevisionIds.length,p.plan==='I'?3:6);r.segmentRevisionIds.forEach(id=>assert.ok(ids.has(id)));}
 for(const s of d.segmentTypes)assert.ok(ids.has(s.currentRevisionId));
});
test('development thickness is not engineering approval; unknown kit is not zero',()=>{
 const d=build(); for(const s of d.segmentRevisions){assert.equal(s.engineeringThicknessMm,null);assert.equal(s.approvedForManufacture,false);assert.equal(s.castDimensionsMm,null); if(s.segmentTypeId.endsWith('-TR'))assert.equal(s.developmentThicknessMm,null);else assert.equal(s.developmentThicknessMm,s.segmentTypeId.includes('-H15-')?150:175);}
 assert.deepEqual(d.approval,{engineeringApproved:false,productionReleased:false});
});
test('no fake deliverables or cloud identity; geometry stays provisional',()=>{
 const d=build();assert.deepEqual(d.artifacts,[]);assert.deepEqual(d.assemblyInstances,[]);assert.equal(d.orgId,null);assert.equal(d.remoteProjectId,null);assert.equal(d.pilot.castLengthMm,null);assert.equal(d.pilot.jointGapMm,null);
 d.productRevisions.forEach(r=>{assert.equal(r.geometryRevisionId,null);assert.equal(r.revitStatus,'NOT_CREATED');assert.equal(r.visibility,'INTERNAL_TEAM');});
});
test('checked-in seed matches reproducible source hashes and contents',()=>{
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'data/modular-program/r02/catalogue.json'),'utf8')),build());
});
test('current programme index resolves and Revit precedes deferred analysis',()=>{
 const index=JSON.parse(fs.readFileSync(path.join(root,'knowledge/modular-program-current.json'),'utf8'));
 for(const key of ['knowledge_path','decisions_path','historical_snapshot'])assert.ok(fs.existsSync(path.join(root,'knowledge',index[key])));
 const d=JSON.parse(fs.readFileSync(path.join(root,'knowledge',index.decisions_path),'utf8'));
 assert.ok(d.stages.indexOf('P6_48_REVIT_DELIVERIES')<d.stages.indexOf('P7_STAAD_AND_EIT_CALCULATIONS'));
 assert.equal(d.analysis.status,'PAUSED_BY_USER');assert.equal(d.storage.cloud_provisioning_authorized,false);
});
test('project skill basic frontmatter and active revision routing',()=>{
 const s=fs.readFileSync(path.join(root,'skills/precast-modular-workflow/SKILL.md'),'utf8');
 assert.match(s,/^---\r?\nname: precast-modular-workflow\r?\ndescription: [^\r\n]+\r?\n---/);
 assert.ok(s.includes('knowledge/modular-program-current.json'));
 assert.ok(s.includes('knowledge/modular-program-r02/README.md'));
});
