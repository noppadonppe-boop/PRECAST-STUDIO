import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const folder=process.argv[2];assert(folder,'Run directory required');
const referencePath=path.resolve(folder,'../../reference.json');
const ref=JSON.parse(fs.readFileSync(referencePath)),tol=ref.acceptanceTolerances;
assert(ref.beamTheory==='Euler-Bernoulli SET SHEAR','This verifier is for the isolated EB constraint benchmark');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function table(text,title){
 const start=text.indexOf(title);assert(start>=0);const end=text.indexOf('END OF LATEST ANALYSIS RESULT',start);assert(end>start);
 const rows=[];let joint=null;
 for(const line of text.slice(start,end).split(/\r?\n/)){
  if(!/^\s*\d+\s+[-\d.\s]+$/.test(line))continue;
  const vals=line.trim().split(/\s+/).map(Number);if(![7,8].includes(vals.length))continue;
  if(vals.length===8)joint=vals.shift();assert(joint!==null);
  rows.push({joint,load:vals.shift(),values:vals});
 }
 return rows;
}
const results=[];
for(const name of ['TRANSLATIONS','RIGID']){
 const filename=path.join(folder,name+'.ANL'),text=fs.readFileSync(filename,'utf8');
 assert(text.includes('END OF THE STAAD.Pro RUN'));
 assert(/Warning Count: 0, Error Count: 0/.test(fs.readFileSync(path.join(folder,name+'.log'),'utf8')));
 assert(text.includes('JOINT DISPLACEMENT (CM   RADIANS)'));assert(text.includes('SUPPORT REACTIONS -UNIT KN   METE'));
 const reactions=table(text,'SUPPORT REACTIONS -UNIT'),displacements=table(text,'JOINT DISPLACEMENT (');
 assert.equal(reactions.length,4);assert.equal(displacements.length,8);
 for(let load=1;load<=2;load++){
  const expected=ref.reference[name][load-1];let maxForceError=0,maxMomentError=0,maxTranslationError=0,maxRotationError=0;
  const nativeReactions=[];
  for(const [i,joint] of [1,4].entries()){
   const row=reactions.find(r=>r.joint===joint&&r.load===load);assert(row);
   const got=[row.values[0],row.values[1],row.values[5]];nativeReactions.push(got);
   got.forEach((x,k)=>{const error=Math.abs(x-expected.baseReactionsKN_KNm[i][k]);assert(error<=(k===2?tol.momentKNm:tol.forceKN),`${name} LC${load} reaction ${joint} component ${k} error ${error}`);if(k===2)maxMomentError=Math.max(maxMomentError,error);else maxForceError=Math.max(maxForceError,error);});
   assert(row.values.slice(2,5).every(x=>Math.abs(x)<1e-10));
  }
  for(const [i,joint] of [2,3].entries()){
   const row=displacements.find(r=>r.joint===joint&&r.load===load);assert(row);
   const got=[row.values[0]/100,row.values[1]/100,row.values[5]];
   got.forEach((x,k)=>{const error=Math.abs(x-expected.topDisplacementsMrad[3*i+k]);assert(error<=(k===2?tol.rotationRad:tol.translationM),`${name} LC${load} displacement ${joint} component ${k} error ${error}`);if(k===2)maxRotationError=Math.max(maxRotationError,error);else maxTranslationError=Math.max(maxTranslationError,error);});
   assert(row.values.slice(2,5).every(x=>Math.abs(x)<1e-10));
  }
  const [a,b]=nativeReactions;
  const equilibrium=[a[0]+b[0]+(load===1?10:0),a[1]+b[1],a[2]+b[2]+ref.offsetM*b[1]+(load===1?-ref.lengthM*10:10)];
  assert(Math.abs(equilibrium[0])<=2*tol.forceKN);assert(Math.abs(equilibrium[1])<=2*tol.forceKN);
  assert(Math.abs(equilibrium[2])<=2*tol.momentKNm+ref.offsetM*tol.forceKN);
  results.push({name,load,maxForceErrorKN:maxForceError,maxMomentErrorKNm:maxMomentError,maxTranslationErrorM:maxTranslationError,maxRotationErrorRad:maxRotationError,roundedNativeEquilibrium:equilibrium});
 }
}
const report={status:'PASS_LINEAR_OFFSET_CONSTRAINT_BENCHMARK_ONLY',referenceSha256:hash(referencePath),tolerances:tol,results,hashes:Object.fromEntries(['TRANSLATIONS','RIGID'].map(n=>[n,{input:hash(path.join(folder,n+'.STD')),analysis:hash(path.join(folder,n+'.ANL'))}])),limitations:['SET SHEAR used ONLY to isolate EB constraint transformation; not a product setting.','Rotation precision limited to 0.0001 rad in printed native output.','Does not validate chained constraints, contact, product joints, concrete or RC code design.','Default-shear first trial remains unverified against its Timoshenko reference.']};
fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
