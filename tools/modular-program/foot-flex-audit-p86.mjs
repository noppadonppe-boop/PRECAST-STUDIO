import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='output/foot-flex-p86';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const issuedInputHashes=new Map(['83','85'].flatMap(rev=>read(`output/stage5-update-p${rev}/manifest.json`).files.map(f=>['output/'+f.path,f.sha256])));
const norm=v=>Math.hypot(...v),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const plan=read(dir+'/batch-plan.json'),bench=read(dir+'/benchmarks.json'),crit=plan.criteria;
const refinePlan=read(dir+'/refinement-plan.json');assert.deepEqual(refinePlan.criteria,crit);
assert.equal(refinePlan.sourceSha256,sha('tools/modular-program/refine_foot_flex_p86.py'));
const plateBench=read(dir+'/plate-benchmark.json');
assert.equal(plateBench.sourceSha256,sha('tools/modular-program/plate_bench_p86.py'));
assert.ok(plateBench.passed&&plateBench.rows.at(-1).relativeError<.01);
for(const [p,h] of Object.entries(bench.sourceHashes))assert.equal(sha(p),h);
assert.ok(bench.acceptedMPC.accepted&&!bench.rejectedMultiStepDiagnostic.accepted);
export function checkResult(r){
  for(const i of r.inputs){assert.equal(sha(i.path),i.sha256);assert.equal(i.sha256,issuedInputHashes.get(i.path.replaceAll('\\','/')),'Input no longer matches its earlier delivered snapshot');}
  assert.equal(r.solverSha256,sha('tools/modular-program/foot_flex_p86.py'));
  assert.equal(r.mesherSha256,sha('tools/modular-program/foot_mesh_p86.py'));
  assert.equal(r.basis.thicknessMm,30);
  assert.ok(norm(r.forceResidualN)<crit.forceEquilibriumN);
  assert.ok(norm(r.momentResidualNmm)<crit.momentEquilibriumNmm);
  assert.ok(r.maxFreeVerticalResidualN<crit.freeVerticalResidualN);
  assert.ok(r.maxFreeBendingResidualNmm<crit.freeBendingResidualNmm);
  assert.ok(r.meshAudit.maxWasherConstraintErrorMm<crit.washerCompatibilityMm);
  assert.ok(Math.abs(r.meshAudit.areaMm2-r.meshAudit.sourceAreaMm2)<.02);
  assert.equal(r.meshAudit.maxEdgeMultiplicity,2);
  assert.equal(r.engineeringApproved,false);assert.equal(r.productionReleased,false);assert.equal(r.stageComplete,false);
  for(const b of r.boltForces){
    const root=r.bolts.find(x=>x.tag===b.tag);
    assert.ok(b.tensionN>=-1e-7);
    assert.ok(Math.abs(b.tensionN-r.basis.kBoltNPerMm*Math.max(0,root.displacement[2]))<1e-5);
  }
  const nodes=new Map(r.nodes.map(n=>[n.tag,n]));
  for(const a of r.reactions.filter(a=>a.kind==='bed')){
    assert.ok(a.forceN[2]>=-1e-7);
    if(nodes.get(a.plateNode).displacementMm[2]>1e-9)assert.ok(Math.abs(a.forceN[2])<1e-7);
  }
  const prior=read(`output/foot-demand-p84/${r.key}-${r.foot}.json`);
  const shift=cross(sub(prior.originMm,r.originFabricationMm),prior.appliedForceN);
  const expectedM=prior.appliedMomentNmm.map((x,i)=>x+shift[i]);
  assert.ok(Math.abs(prior.appliedForceN[2]-r.appliedForceN[2])<1e-6);
  assert.ok(norm(sub(expectedM.slice(0,2),r.appliedMomentNmm.slice(0,2)))<.01);
}
const rows=[];
for(const family of 'ABD')for(const side of ['LH','RH'])for(const owner of ['M01','M03'])for(const foot of [1,2]){
  const id=`${family}-${side}-W01-${owner}-F${foot}`;
  const initial=read(`${dir}/${id}-h20.json`),mid=read(`${dir}/${id}-h10.json`);checkResult(initial);checkResult(mid);
  const coarseH=family==='D'?10:20,fineH=family==='D'?7.5:10;
  const a=family==='D'?mid:initial,b=family==='D'?read(`${dir}/${id}-h7.5.json`):mid;checkResult(b);
  const ta=a.boltForces.map(b=>b.tensionN),tb=b.boltForces.map(b=>b.tensionN);
  const deltaT=norm(sub(ta,tb))/norm(tb),deltaW=Math.abs(a.maxUpwardDisplacementMm-b.maxUpwardDisplacementMm)/Math.abs(b.maxUpwardDisplacementMm);
  const option=read(`output/foot-demand-p84/${id}-option.json`);
  const rigid=option.scenarios.find(s=>s.kContactNPerMm3===1000&&s.effectiveBoltLengthMm===50);
  assert.ok(rigid);
  rows.push({id,key:b.key,foot:b.foot,coarseMeshTargetMm:coarseH,fineMeshTargetMm:fineH,initialFile:family==='D'?`${id}-h20.json`:null,initialDisplacementRefinementRelative:Math.abs(initial.maxUpwardDisplacementMm-mid.maxUpwardDisplacementMm)/Math.abs(mid.maxUpwardDisplacementMm),coarseFile:`${id}-h${coarseH}.json`,fineFile:`${id}-h${fineH}.json`,coarseSha256:sha(`${dir}/${id}-h${coarseH}.json`),fineSha256:sha(`${dir}/${id}-h${fineH}.json`),boltForcesKN:tb.map(x=>x/1000),maximumTensionKN:Math.max(...tb)/1000,rigidMaximumTensionKN:Math.max(...rigid.boltTensionsN)/1000,amplification:Math.max(...tb)/Math.max(...rigid.boltTensionsN),maxUpwardDisplacementMm:b.maxUpwardDisplacementMm,minDisplacementMm:b.minDisplacementMm,boltRefinementRelative:deltaT,displacementRefinementRelative:deltaW,refinementAccepted:deltaT<=crit.boltForceVectorL2Relative&&deltaW<=crit.maxUpwardDisplacementRelative,coarseQuads:a.cells.length,fineQuads:b.cells.length});
}
const mirrorChecks=[];
for(const r of rows.filter(r=>r.id.includes('-LH-'))){
  const other=rows.find(s=>s.id===r.id.replace('-LH-','-RH-'));
  const t=norm(sub(r.boltForcesKN,other.boltForcesKN))/norm(r.boltForcesKN);
  const w=Math.abs(r.maxUpwardDisplacementMm-other.maxUpwardDisplacementMm)/r.maxUpwardDisplacementMm;
  mirrorChecks.push({left:r.id,right:other.id,boltRelative:t,displacementRelative:w,passed:t<.001&&w<.001});
}
const probe=read(dir+'/rigid-limit-probe.json'),rigid=read('output/foot-demand-p84/A-LH-W01-M01-F1-option.json').scenarios.find(s=>s.kContactNPerMm3===1000&&s.effectiveBoltLengthMm===50);
assert.equal(probe.solverSha256,sha('tools/modular-program/foot_flex_p86.py'));
const rigidError=norm(sub(probe.boltForces.map(b=>b.tensionN),rigid.boltTensionsN))/norm(rigid.boltTensionsN);
assert.ok(rigidError<.01); // independent rigid-limit sanity check, not a production thickness.
const audit={revision:'P86',stage:5,totalGroups:24,verifiedResultFiles:56,refinementAcceptedGroups:rows.filter(r=>r.refinementAccepted).length,criteria:crit,sourceHashes:bench.sourceHashes,plateBenchmark:{file:'plate-benchmark.json',fineGridRelativeError:plateBench.rows.at(-1).relativeError,passed:plateBench.passed,note:'Error versus thin-plate theory is not monotonic across these three meshes; this is a 1% bending-scale check, not a stress-convergence claim.'},rigidLimit:{file:'rigid-limit-probe.json',thicknessMm:300,purpose:'Artificial stiffness limit only; production geometry remains t30',boltVectorRelativeError:rigidError,passed:rigidError<.01},mirrorChecks,rows,stageComplete:false,engineeringApproved:false,productionReleased:false};
fs.writeFileSync(dir+'/audit.json',JSON.stringify(audit,null,2));
const cols=['id','maximumTensionKN','rigidMaximumTensionKN','amplification','maxUpwardDisplacementMm','minDisplacementMm','boltRefinementRelative','displacementRefinementRelative','refinementAccepted'];
fs.writeFileSync(dir+'/summary.csv',cols.join(',')+'\n'+rows.map(r=>cols.map(c=>r[c]).join(',')).join('\n')+'\n');
console.log(JSON.stringify({verifiedFiles:audit.verifiedResultFiles,refinementAccepted:audit.refinementAcceptedGroups,total:24,mirrorPassed:mirrorChecks.filter(m=>m.passed).length,rigidError,maximumTensionKN:Math.max(...rows.map(r=>r.maximumTensionKN)),maxUpwardDisplacementMm:Math.max(...rows.map(r=>r.maxUpwardDisplacementMm)),pendingRefinement:rows.filter(r=>!r.refinementAccepted).map(r=>({id:r.id,deltaT:r.boltRefinementRelative,deltaW:r.displacementRefinementRelative}))},null,2));
