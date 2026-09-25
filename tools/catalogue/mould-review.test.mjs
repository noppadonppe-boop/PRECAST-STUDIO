import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadMouldCatalogue} from './mould-data.mjs';
import {allowed} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('closed Stage-5 planning scope: 44 setups, withdrawn images inaccessible, protected downloads',async()=>{
 const c=await loadMouldCatalogue(root),member={name:'QA',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000},d=await c.view(member,allowed);
 assert.equal(d.setups.length,44);assert.equal(d.status,'STAGE5_PLANNING_SCOPE_COMPLETE');assert.equal(c.artifacts.size,2106);
 assert.equal(d.scopeClosureRevision,'P100');assert.equal(d.stageCompletionPercent,100);assert.equal(d.stageComplete,true);assert.ok(d.stageClosure);assert.equal(d.deferredWorkstreams.length,3);assert.equal(d.engineeringApproved,false);assert.equal(d.productionReleased,false);
 assert.equal(d.coordinatedRevision,'P99');assert.ok(d.setups.every(s=>s.coordinatedFiles.length===8));
 assert.equal(d.tableWeldRevision,'P93');assert.equal(d.setups.filter(s=>s.tableWeldFiles.length).length,9);assert.equal(d.setups.flatMap(s=>s.tableWeldFiles).length,45);
 assert.equal(d.tableBaseRevision,'P97');assert.equal(d.setups.filter(s=>s.tableBaseFiles.length).length,9);assert.equal(d.setups.flatMap(s=>s.tableBaseFiles).length,45);
 assert.equal(d.tableBackerRevision,'P96');assert.equal(d.setups.filter(s=>s.tableBackerFiles.length).length,9);assert.equal(d.setups.flatMap(s=>s.tableBackerFiles).length,45);
 assert.equal(d.tableSealRevision,'P95');assert.equal(d.setups.filter(s=>s.tableSealFiles.length).length,9);assert.equal(d.setups.flatMap(s=>s.tableSealFiles).length,45);
 assert.equal(d.tableChannelRevision,'P94');assert.equal(d.setups.filter(s=>s.tableChannelFiles.length).length,9);assert.equal(d.setups.flatMap(s=>s.tableChannelFiles).length,45);
 assert.equal(d.castingLiftingRevision,'P91');assert.equal(d.setups.filter(s=>s.currentLiftingFiles.length).length,9);
 assert.equal(d.setups.flatMap(s=>s.currentLiftingFiles).length,27);
 assert.equal(d.supplementRevision,'P92');assert.equal(d.setups.filter(s=>s.supplementGroups.length).length,12);
 const extra=d.setups.flatMap(s=>s.supplementGroups.flatMap(g=>g.files));assert.equal(extra.length,738);
 const p92=d.setups.flatMap(s=>s.supplementGroups.filter(g=>g.revision==='P92'));assert.equal(p92.length,6);assert.ok(p92.every(g=>g.files.length===5&&g.role==='CONDITIONAL_COMPONENT_CHECK'));
 assert.ok(d.setups.every(s=>s.closureFile&&s.closureReview.openDeliverables===8));
 const p90=d.setups.filter(s=>s.supplementGroups.some(g=>g.revision==='P90'));assert.equal(p90.length,6);assert.equal(p90.flatMap(s=>s.supplementGroups.find(g=>g.revision==='P90').files).length,88);
 const closureOnly=await c.view({...member,artifactIds:[d.setups[0].closureFile.id]},allowed);assert.equal(closureOnly.setups.length,1);assert.equal(closureOnly.setups[0].files.length,0);assert.equal(closureOnly.setups[0].presentation,null);assert.equal(closureOnly.setups[0].supplementGroups.length,0);assert.ok(closureOnly.setups[0].closureReview);
 const p89=d.setups.filter(s=>s.supplementGroups.some(g=>g.revision==='P89'));assert.equal(p89.length,12);
 for(const s of p89){const g=s.supplementGroups.find(g=>g.revision==='P89');assert.equal(g.role,'UNADOPTED_CANDIDATE');assert.equal(g.files.length,4);const a=g.files.find(f=>f.filename.endsWith('-hardware.csv'));const text=(await c.bytes(a.id)).toString('utf8').trim().split('\n');assert.equal(text.length,41);assert.ok(text.slice(1).every(l=>l.endsWith('UNADOPTED_CANDIDATE')));}
 const p88=d.setups.filter(s=>s.supplementGroups.some(g=>g.revision==='P88'));assert.equal(p88.length,6);
 for(const s of p88){const g=s.supplementGroups.find(g=>g.revision==='P88');assert.equal(g.role,'CONDITIONAL_COMPONENT_CHECK');assert.equal(g.files.length,13);const a=g.files.find(f=>f.filename.endsWith('-checks.csv'));const text=(await c.bytes(a.id)).toString('utf8').trim().split('\n');assert.equal(text.length,97);const key=a.filename.replace('-checks.csv','');assert.ok(text.slice(1).every(l=>l.startsWith(key+'-')));}
 assert.equal(d.setups.filter(s=>s.supplementGroups.some(g=>g.revision==='P86')).length,6);
 for(const s of d.setups.filter(s=>s.supplementGroups.length)){
  assert.equal(s.supplementGroups.find(g=>g.revision==='P85').role,'CURRENT_BASE');
  assert.equal(s.supplementGroups.find(g=>g.revision==='P66').role,'HISTORICAL_SUBSYSTEM');
 }
 const only=await c.view({...member,artifactIds:[extra[0].id]},allowed);assert.equal(only.setups.length,1);assert.equal(only.setups[0].supplementGroups.flatMap(g=>g.files).length,1);assert.equal(only.setups[0].files.length,0);assert.equal(only.setups[0].developmentFiles.length,0);assert.equal(only.setups[0].presentation,null);assert.equal(only.setups[0].closureReview,null);assert.equal(only.setups[0].closureFile,null);
 assert.equal(d.developmentRevision,'P61');assert.equal(d.setups.filter(s=>s.developmentFiles.length).length,44);
 assert.equal(d.setups.filter(s=>s.hardwareStatus==='PARTIAL_DEVELOPMENT').length,32);
 assert.equal(d.setups.filter(s=>s.hardwareStatus==='CONTACT_SKINS_AND_LOADS_ONLY').length,12);
 assert.equal(d.liftingRevision,'P52');assert.ok(d.setups.every(s=>s.liftingFiles.length===3));
 const p91file=d.setups.find(s=>s.currentLiftingFiles.length).currentLiftingFiles[0];
 const poseOnly=await c.view({...member,artifactIds:[p91file.id]},allowed);assert.equal(poseOnly.setups.length,1);assert.equal(poseOnly.setups[0].currentLiftingFiles.length,1);assert.equal(poseOnly.setups[0].liftingFiles.length,0);assert.equal(poseOnly.setups[0].presentation,null);assert.equal(poseOnly.setups[0].closureReview,null);
 assert.equal(d.presentationRevision,'P43');assert.ok(d.setups.every(s=>s.presentation?.filename.endsWith('-STYLE.png')));
 const denied=await c.view({...member,canReadEngineering:false},allowed);assert.equal(denied.setups.length,0);
 for(const s of d.setups){assert.equal(s.files.length,7);assert.ok(s.files.some(f=>f.filename==='03-GEOMETRY-REVIEW.png'));assert.ok(s.files.every(f=>!/(CONCEPT|TOOLING)/.test(f.filename)));}
 for(const a of c.artifacts.values()){const b=await readFile(resolve(root,a.path));assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(c.mayRead({...member,canReadEngineering:false},a,allowed),false);}
 const csv=[...c.artifacts.values()].find(a=>a.filename==='LH-W01-locks.csv');assert.match(csv.contentType,/text\/csv/);assert.ok(await c.bytes(csv.id));
 const restricted=await c.view({...member,artifactIds:[csv.id]},allowed);assert.equal(restricted.setups.length,1);assert.equal(restricted.setups[0].developmentFiles.length,1);assert.equal(restricted.setups[0].historicalDevelopmentFiles.length,0);assert.equal(restricted.setups[0].liftingFiles.length,0);assert.equal(restricted.setups[0].files.length,0);assert.equal(restricted.archive,null);
 assert.equal(await c.bytes('MF-C-H15-LH-W01-P05-P38-03-CONCEPT-PNG'),null);
 assert.match(d.archive.filename,/P38R1-GEOMETRY-REVIEW/);
 const audit=JSON.parse(await readFile(resolve(root,'output/stage5-moulds-p38/geometry-review-p38r1.json')));
 assert.equal(audit.records.length,44);assert.ok(audit.records.every(r=>r.inverseCoordinateMaxErrorMm<1e-8&&r.demouldingVerified===false&&r.physicalToolSolids===false));
 const manifest=JSON.parse(await readFile(resolve(root,'output/stage5-moulds-p38/manifest.json')));assert.ok(manifest.files.every(f=>!/(03-CONCEPT|02-TOOLING|IMAGEGEN|imagegen-jobs)/.test(f.path)));
});
