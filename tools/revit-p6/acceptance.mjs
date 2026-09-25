import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),work=path.join(root,'output/revit-p6');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const input=read('output/revit-p6/input.json'),manifest=read('output/revit-p6/delivery-manifest.json'),web=read('output/revit-p6/web-audit.json');
assert.equal(manifest.products.length,48);assert.equal(new Set(manifest.products.map(p=>p.productId)).size,48);assert.equal(web.status,'PASS');assert.equal(web.manifestSha256,hash('output/revit-p6/delivery-manifest.json'));
let instances=0,maxBoundsErrorMm=0,maxVolumeRelativeError=0,totalWarnings=0;
const records=[];
for(const p of manifest.products){
 const m=input.models.find(m=>m.id===p.productId);assert.ok(m);assert.equal(hash(p.sourcePath),p.sourceSha256);assert.equal(p.files.length,10);
 for(const f of p.files){assert.equal(hash(f.path),f.sha256);assert.equal(fs.statSync(path.join(root,f.path)).size,f.bytes);}
 const qa=read(p.files.find(f=>f.kind==='QA').path);assert.equal(qa.status,'PASS');assert.equal(qa.visualReview,'REVIEWED');assert.ok(qa.nativeReopened&&qa.nativeSaved&&qa.pdfExport);assert.equal(qa.revitVersion,'2026');assert.equal(qa.concreteInstanceCount,m.instances.length);assert.equal(qa.engineeringApproved,false);assert.equal(qa.productionReleased,false);assert.equal(qa.warnings.length,0);assert.equal(qa.sheets.length,7);assert.equal(qa.imageViews.length,4);assert.equal(qa.dimensionAudit.length,8);assert.ok(qa.dimensionAudit.every(d=>d.visibleDimensions>=2));
 assert.deepEqual(qa.checks.map(c=>c.instanceId).sort(),m.instances.map(i=>i.id).sort());
 for(const c of qa.checks){assert.ok(c.pass&&c.boundsErrorMm<=1&&c.volumeRelativeError<=.01);maxBoundsErrorMm=Math.max(maxBoundsErrorMm,c.boundsErrorMm);maxVolumeRelativeError=Math.max(maxVolumeRelativeError,c.volumeRelativeError);}
 instances+=qa.concreteInstanceCount;totalWarnings+=qa.warnings.length;
 records.push({productId:p.productId,nativeRvt:p.files.find(f=>f.kind==='RVT'),nativeReopened:true,instanceCount:qa.concreteInstanceCount,qa:p.files.find(f=>f.kind==='QA')});
}
assert.equal(instances,1584);assert.equal(input.library.length,88);assert.equal(new Set(input.library.map(i=>i.typicalId)).size,44);assert.equal(hash(manifest.sharedLibrary.path),manifest.sharedLibrary.sha256);
const weights=[5,10,15,10,10,10,12.5,12.5,10,5];
const report={revision:'P102',stage:6,totalProgrammeStages:8,status:'STAGE6_COMPLETE_AWAITING_USER_REVIEW',stageComplete:true,stageCompletionPercent:100,stageAcceptedByUser:false,nextStageAuthorized:false,scope:'P101 development and coordination BIM, not structural or production release',nativeVersion:'2026',productCount:48,concreteInstances:instances,typicalTags:44,geometryFamilyVariants:88,pdfSets:48,pdfSheets:336,pngExports:192,csvSchedules:48,productArchives:48,sharedLibrary:manifest.sharedLibrary,maxBoundsErrorMm,maxVolumeRelativeError,totalWarnings,checkpoints:weights.map((weight,i)=>({id:'6.'+(i+1),weightPercent:weight,status:'PASS'})),records,websiteAudit:'output/revit-p6/web-audit.json',deliveryManifest:'output/revit-p6/delivery-manifest.json',engineeringApproved:false,productionReleased:false,deferredProductionWorkstreams:['PE-01','PE-02','PE-03']};
fs.writeFileSync(path.join(work,'acceptance.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,stageCompletionPercent:100,productCount:48,instances,maxBoundsErrorMm,maxVolumeRelativeError}));
