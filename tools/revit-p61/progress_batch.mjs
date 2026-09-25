import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),work=path.join(root,'output/revit-p61-batch'),out=path.join(root,'deliverables/PM_ARC_48_P104');
const data=JSON.parse(fs.readFileSync(path.join(work,'input.json'),'utf8'));
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const products=data.models.map(m=>{
 const folder=path.join(out,m.id),qa=read(path.join(folder,'QA_P104.json'));
 const manifest=read(path.join(folder,'DeliveryManifest_P104.json'));
 const zip=path.join(out,m.id+'_ARC_P104_ReviewPackage.zip');
 const present=manifest?.files?.every(r=>{const p=path.join(folder,r.path);return fs.existsSync(p)&&sha(p)===r.sha256;})??false;
 const packaged=qa?.packaged===true&&qa.coordinationAudit==='PASS'&&qa.relocationTest==='PASS'&&qa.visualReview?.startsWith('PASS')&&present&&fs.existsSync(zip);
 return {id:m.id,nativeBuilt:qa?.nativeSavedReopened===true,coordination:qa?.coordinationAudit??'NOT_BUILT',relocation:qa?.relocationTest??'NOT_BUILT',visualReview:qa?.visualReview??'PENDING',packaged};
});
const delivered=products.filter(p=>p.packaged).length;
const result={revision:'P104',authorizedAdditional:47,acceptedPilot:1,newDelivered:delivered,totalDelivered:delivered+1,totalTarget:48,completionPercent:(delivered+1)/48*100,preparedRecipes:data.models.length,nativeBuilt:products.filter(p=>p.nativeBuilt).length,coordinationPassed:products.filter(p=>p.coordination==='PASS').length,nativeChecksPending:products.filter(p=>p.coordination!=='PASS').length,status:delivered===47&&read(path.join(work,'acceptance.json'))?.stageComplete===true?'COMPLETE_PENDING_USER_REVIEW':'IN_PROGRESS',updatedAt:new Date().toISOString(),products};
fs.writeFileSync(path.join(work,'progress.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,products:undefined}));
