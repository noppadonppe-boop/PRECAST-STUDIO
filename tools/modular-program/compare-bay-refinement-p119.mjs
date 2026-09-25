import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const root='output/staad-p7-p119',plan=JSON.parse(fs.readFileSync(root+'/refinement-plan.json'));
const runs=[plan.baselineRun,...process.argv.slice(2)];assert.equal(runs.length,3,'Pass r1 and r2 actual run directories');
const reports=runs.map(p=>JSON.parse(fs.readFileSync(p+'/verification.json'))),specs=runs.map(p=>JSON.parse(fs.readFileSync(p+'/study-spec.json')));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(let i=0;i<3;i++){
 assert.equal(reports[i].specHash,hash(runs[i]+'/study-spec.json'));assert.equal(specs[i].meshSha256,hash(specs[i].meshPath));
 if(i>0){assert.equal(specs[i].elements,specs[i-1].elements*4);assert(Math.abs(specs[i].weightKN-specs[0].weightKN)<1e-8);const qa=JSON.parse(fs.readFileSync(`${root}/r${i}/mesh-quality.json`));assert.equal(qa.defects.length,0);assert.equal(qa.qualityFlags.length,0);}
 for(const r of reports[i].results){assert.equal(r.inputSha256,hash(`${runs[i]}/${r.case}.STD`));assert.equal(r.analysisSha256,hash(`${runs[i]}/${r.case}.ANL`));}
}
const change=(a,b)=>Math.abs(b-a)/Math.max(Math.abs(b),1e-12),cases=[];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function canonicalPeaks(run,name){
 const data=JSON.parse(fs.readFileSync(`${run}/${name}-shell-resultants.json`)),peaks={};
 assert.equal(data.analysisSha256,hash(`${run}/${name}.ANL`));
 for(const record of data.records){
  const {x,y,z}=record.localAxesInSTAAD,X=[0,0,1],Y=cross(z,X);assert(Math.abs(dot(X,z))<1e-8);
  const [a,b,c,d]=[dot(X,x),dot(X,y),dot(Y,x),dot(Y,y)];
  // Refinement cycles the start corner; only quarter-turn changes are accepted here.
  assert([a,b,c,d].every(v=>Math.abs(v-Math.round(v))<1e-8));assert(Math.abs(a*d-b*c-1)<1e-8);
  const q=record.resultants,v={};
  for(const [xx,yy,xy] of [['Nxx','Nyy','Nxy'],['Mxx','Myy','Mxy']]){
   v[xx]=a*a*q[xx]+2*a*b*q[xy]+b*b*q[yy];v[yy]=c*c*q[xx]+2*c*d*q[xy]+d*d*q[yy];v[xy]=a*c*q[xx]+(a*d+b*c)*q[xy]+b*d*q[yy];
  }
  v.Qx=a*q.Qx+b*q.Qy;v.Qy=c*q.Qx+d*q.Qy;
  for(const [k,value] of Object.entries(v))if(!peaks[k]||Math.abs(value)>peaks[k].absoluteValue)peaks[k]={absoluteValue:Math.abs(value),value,element:record.element,centroidSTAADm:record.centroidSTAADm};
 }
 return peaks;
}
for(const name of specs[0].cases){
 const rr=reports.map(r=>r.results.find(x=>x.case===name)),lhs=specs[0].selectedParts[0];assert(rr.every(Boolean));
 const d=rr.map(r=>r.maxDownwardMm),h=rr.map(r=>Math.abs(r.partBaseForcesN[lhs][0])/1000),m=rr.map(r=>r.crownJointResultantsByPart[lhs].momentKNm[2]);
 const dc=change(d[1],d[2]),hc=change(h[1],h[2]),mc=change(m[1],m[2]),nearZero=m.every(x=>Math.abs(x)<plan.criteria.crownMomentNearZeroThresholdKNm);
 const globalPass=dc<plan.criteria.lastRefinementMaxDownwardRelativeChange&&hc<plan.criteria.lastRefinementBaseHorizontalRelativeChange&&(nearZero||mc<plan.criteria.lastRefinementCrownMomentRelativeChange);
 const peaks={},canonical=runs.map(run=>canonicalPeaks(run,name));
 for(const key of Object.keys(rr[0].localComponentExtremaNotConcurrentDesignVector)){
  const v=canonical.map(p=>p[key].absoluteValue);
  peaks[key]={absolutePeakValues:v,lastChangeFraction:change(v[1],v[2]),peakLocations:canonical.map(p=>p[key]),basis:'canonical x=bay longitudinal STAAD Z; y=normal cross x; quarter-turn mapping of native local results',interpretation:'DIAGNOSTIC_ONLY_NOT_A_CONVERGENCE_ACCEPTANCE_OR_DESIGN_VECTOR'};
 }
 cases.push({case:name,downwardMm:d,horizontalBaseResultantKN:h,crownMzLH_KNm:m,lastDownwardChangeFraction:dc,lastHorizontalChangeFraction:hc,crownMomentNearZero:nearZero,lastCrownMomentChangeFraction:nearZero?null:mc,globalMetricsPass:globalPass,localPeakDiagnostics:peaks});
}
const report={status:cases.every(c=>c.globalMetricsPass)?'GLOBAL_SUBASSEMBLY_METRICS_WITHIN_PRESET_REFINEMENT_LIMITS':'REFINEMENT_CRITERIA_NOT_MET',runs,elements:specs.map(s=>s.elements),criteria:plan.criteria,cases,localPeakDesignConvergenceVerified:false,curveDiscretizationConvergenceVerified:false,wholeBuildingConvergenceVerified:false,engineeringApproved:false,limitations:plan.limits};
fs.writeFileSync(root+'/comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));assert(cases.every(c=>c.globalMetricsPass));
