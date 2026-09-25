import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const base='output/staad-p7-p130-r1',hash=b=>crypto.createHash('sha256').update(b).digest('hex'),index=JSON.parse(fs.readFileSync(base+'/index.json')),results=[];
for(const row of index.results){
 const runs=fs.readdirSync(row.folder+'/runs').map(d=>row.folder+'/runs/'+d).filter(d=>fs.existsSync(d+'/group-reaction-verification.json'));
 assert.equal(runs.length,1,'Select an explicit immutable run if multiple verified runs exist');const folder=runs[0],v=JSON.parse(fs.readFileSync(folder+'/group-reaction-verification.json')),spec=JSON.parse(fs.readFileSync(folder+'/study-spec.json'));
 assert.equal(v.status,'PASS_RECOVERED_GROUP_EQUILIBRIUM_TRIAL_ONLY');
 for(const [file,expected]of [[row.basename+'.STD',v.inputSha256],[row.basename+'.ANL',v.analysisSha256],['study-spec.json',v.specSha256]])assert.equal(hash(fs.readFileSync(folder+'/'+file)),expected);
 assert.equal(hash(fs.readFileSync(row.folder+'/'+row.basename+'.STD')),v.inputSha256);
 assert.match(fs.readFileSync(folder+'/'+row.basename+'.log','utf8'),/STAAD Exit Code: 100, Warning Count: 0, Error Count: 0/);
 assert(v.forceResidualN.every(n=>Math.abs(n)<5));assert(v.momentResidualNm.every(n=>Math.abs(n)<10));
 const mesh=JSON.parse(fs.readFileSync(spec.meshPath));let minAngle=180,maxAngle=0;
 for(const e of mesh.elements.filter(e=>e.nodeIds.length===3)){const p=e.nodeIds.map(id=>mesh.nodes[id-1].xyzMm);for(let i=0;i<3;i++){const a=p[(i+1)%3].map((v,k)=>v-p[i][k]),b=p[(i+2)%3].map((v,k)=>v-p[i][k]),ang=Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,k)=>s+v*b[k],0)/Math.hypot(...a)/Math.hypot(...b))))*180/Math.PI;minAngle=Math.min(minAngle,ang);maxAngle=Math.max(maxAngle,ang);}}
 assert(minAngle>=5&&maxAngle<=165);
 results.push({productId:row.productId,runFolder:folder,verificationPath:folder+'/group-reaction-verification.json',inputPath:folder+'/'+row.basename+'.STD',status:v.status,warnings:0,errors:0,plates:v.plateCount,beams:v.beamCount,weightKN:spec.weightKN,maxForceResidualN:Math.max(...v.forceResidualN.map(Math.abs)),maxMomentResidualNm:Math.max(...v.momentResidualNm.map(Math.abs)),minTriangleAngleDeg:minAngle,maxTriangleAngleDeg:maxAngle,inputSha256:v.inputSha256,analysisSha256:v.analysisSha256});
}
assert.equal(results.length,12);
const report={revision:'P130-R1',status:'12_NATIVE_RIGID_SELFWEIGHT_REFERENCE_RUNS_PASS',results,products:12,warningCount:0,errorCount:0,scope:'Type I A/B/D, four uses each. All-rigid trial, selfweight only; not final structural analysis or RC design.',stage7CompletionPercent:5,finalAnalysedProducts:0,rcDesignedProducts:0,engineeringApproved:false,productionReleased:false};
fs.writeFileSync(base+'/verification-index.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({products:12,maxForceResidualN:Math.max(...results.map(r=>r.maxForceResidualN)),maxMomentResidualNm:Math.max(...results.map(r=>r.maxMomentResidualNm)),minTriangleAngleDeg:Math.min(...results.map(r=>r.minTriangleAngleDeg)),maxTriangleAngleDeg:Math.max(...results.map(r=>r.maxTriangleAngleDeg))}));
