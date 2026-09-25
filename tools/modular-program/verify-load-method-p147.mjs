import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const folder=process.argv[2];assert.ok(folder);const spec=JSON.parse(fs.readFileSync(path.join(folder,'spec.json')));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(hash(spec.sourcePath),spec.sourceSha256);
function parseRows(text,start,end,count){
 const begin=text.indexOf(start);assert.ok(begin>=0,start);const finish=text.indexOf(end,begin);assert.ok(finish>begin,end);
 const rows=[];let current=null;
 for(const line of text.slice(begin,finish).split(/\r?\n/)){
  const v=line.trim().split(/\s+/);if(!v.every(n=>n!==''&&Number.isFinite(Number(n))))continue;
  const a=v.map(Number);
  if(a.length===count&&a[1]===1){current=a[0];rows.push(a);}
  else if(a.length===count-1&&a[0]===2&&current!==null)rows.push([current,...a]);
 }
 return rows;
}
const results=[];
for(const c of spec.cases){
 const file=path.join(folder,c.id+'.ANL'),text=fs.readFileSync(file,'utf8');
 assert.match(text,/END OF THE STAAD.Pro RUN/);assert.match(fs.readFileSync(path.join(folder,c.id+'.log'),'utf8'),/Warning Count: 0, Error Count: 0/);
 const rr=parseRows(text,'SUPPORT REACTIONS -UNIT NEWT METE','PRINT JOINT DISPLACEMENTS ALL',8),dd=parseRows(text,'JOINT DISPLACEMENT (CM','PRINT ELEMENT STRESSES ALL',8),ss=parseRows(text,'ELEMENT  LOAD','MAXIMUM STRESSES AMONG',7);
 assert.equal(rr.length,c.nodes.length*2);assert.equal(dd.length,c.nodes.length*2);assert.equal(ss.length,c.elements.length*2);
 for(const r of [rr,dd,ss])assert.equal(new Set(r.map(v=>`${v[0]}:${v[1]}`)).size,r.length);
 const methods=[];
 for(const load of [1,2]){
  const reactions=rr.filter(r=>r[1]===load),deflection=dd.find(r=>r[0]===c.centerNode&&r[1]===load),stress=ss.filter(r=>r[1]===load);
  const F=[0,0,0],M=[0,0,0];for(const r of reactions){const [x,y,z]=c.nodes.find(n=>n.id===r[0]).xyz;for(let k=0;k<3;k++)F[k]+=r[k+2];M[0]+=r[5]+y*r[4]-z*r[3];M[1]+=r[6]+z*r[2]-x*r[4];M[2]+=r[7]+x*r[3]-y*r[2];}
  F[1]-=c.loadKN*1000;M[0]+=c.loadKN*1000*spec.bM/2;M[2]-=c.loadKN*1000*spec.aM/2;
  assert.ok(F.every(v=>Math.abs(v)<spec.criteria.reactionResidualN),`${c.id} force ${F}`);
  assert.ok(M.every(v=>Math.abs(v)<spec.criteria.momentResidualNm),`${c.id} moment ${M}`);
  const centerIds=[(c.n/2-1)*c.n+c.n/2,(c.n/2-1)*c.n+c.n/2+1,(c.n/2)*c.n+c.n/2,(c.n/2)*c.n+c.n/2+1];
  const centerRows=stress.filter(r=>centerIds.includes(r[0]));assert.equal(centerRows.length,4);
  methods.push({load,method:load===1?'NATIVE_PRESSURE':'QUARTER_AREA_NODAL',unitDeflectionMm:-deflection[3]*10/spec.amplitudeKNm2,
   unitNearCenterMomentsKNmPerM:[4,5,6].map(k=>centerRows.reduce((s,r)=>s+r[k],0)/4/1000/spec.amplitudeKNm2),
   unitPeakAbsMomentKNmPerM:[4,5,6].map(k=>Math.max(...stress.map(r=>Math.abs(r[k])))/1000/spec.amplitudeKNm2),
   forceResidualN:F,momentResidualNm:M});
 }
 const byMethod={deflection:Math.abs(methods[1].unitDeflectionMm/methods[0].unitDeflectionMm-1),moments:[0,1].map(k=>Math.abs(methods[1].unitNearCenterMomentsKNmPerM[k]/methods[0].unitNearCenterMomentsKNmPerM[k]-1))};
 results.push({id:c.id,n:c.n,inputSha256:hash(path.join(folder,c.id+'.STD')),analysisSha256:hash(file),methods,relativeMethodDifference:byMethod});
}
const prev=results.at(-2),last=results.at(-1);
const meshChange=last.methods.map((m,i)=>({method:m.method,deflection:Math.abs(m.unitDeflectionMm/prev.methods[i].unitDeflectionMm-1),moments:[0,1].map(k=>Math.abs(m.unitNearCenterMomentsKNmPerM[k]/prev.methods[i].unitNearCenterMomentsKNmPerM[k]-1))}));
const methodPass=results.every(r=>[r.relativeMethodDifference.deflection,...r.relativeMethodDifference.moments].every(v=>v<spec.criteria.methodRelativeDifference));
const meshPass=meshChange.every(r=>[r.deflection,...r.moments].every(v=>v<spec.criteria.lastMeshRelativeChange));
const report={revision:'P147',status:methodPass&&meshPass?'PASS_ISOLATED_UNIFORM_LOAD_COMPARISON_ONLY':'REVIEW_REQUIRED',methodPass,meshPass,criteria:spec.criteria,specSha256:hash(path.join(folder,'spec.json')),results,lastMeshRelativeChange:meshChange,
 limitations:['Only uniformly loaded full rectangular cells, not partially loaded edge cells or curved/triangular plates.','No claim of true building support conditions or RC design.','Near-center moments are average of four adjacent cell centers, not exact extrapolated point value.','Uniform load amplified1000 for printed precision and normalized; no nonlinear validity or physical capacity inferred.','No acceptance of corner peak singularities or whole-building mesh convergence.'],engineeringApproved:false};
fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
