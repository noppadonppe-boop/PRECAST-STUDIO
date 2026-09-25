import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export const dir='output/foot-flex-p90';
export const read=p=>JSON.parse(fs.readFileSync(p));
export const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const plan=read('knowledge/modular-program-r02/foot-study-plan-p90.json'),crit=plan.criteria;
const snapshots=new Map([
 ...read('output/stage5-update-p83/manifest.json').files.map(f=>['output/'+f.path,f.sha256]),
 ...read('output/stage5-update-p86/manifest.json').files.map(f=>['output/'+f.path,f.sha256]),
 ...read('output/stage5-update-p89/manifest.json').files.map(f=>[f.path,f.sha256])
]);
const norm=v=>Math.hypot(...v),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const name=(id,h,L=50)=>`${id}-h${h}-r18.5-L${L}.json`;
export function checkResult(r){
 assert.equal(r.revision,'P90');assert.equal(r.baseGeometryRevision,'P89');assert.equal(r.executionMethod,'NATIVE_OPENSEES_SOLVE');
 assert.ok(r.key.endsWith('-W01'));assert.ok(['M01','M03'].includes(r.owner));
 assert.deepEqual(r.inputs.map(i=>i.path.replaceAll('\\','/')),[`output/base-thread-candidate-p89/${r.key}.json`,`output/wall-frame-p83/${r.key}-${r.owner}-h25.json`]);
 for(const i of r.inputs){const p=i.path.replaceAll('\\','/');assert.equal(sha(p),i.sha256,'Stale input '+p);assert.equal(i.sha256,snapshots.get(p),'Not the issued input '+p);}
 assert.equal(r.solverSha256,sha('tools/modular-program/foot_flex_p90.py'));assert.equal(r.mesherSha256,sha('tools/modular-program/foot_mesh_p86.py'));
 assert.equal(r.solverVersion,'3.8.0');assert.equal(r.basis.thicknessMm,30);assert.equal(r.basis.washerPatchRadiusMm,18.5);
 assert.ok([40,50,60].includes(r.basis.effectiveBoltLengthMm));assert.equal(r.basis.kContactNPerMm3,1000);
 assert.equal(r.basis.kBoltNPerMm,200000*245/r.basis.effectiveBoltLengthMm);
 assert.ok(norm(r.forceResidualN)<crit.forceEquilibriumN);assert.ok(norm(r.momentResidualNmm)<crit.momentEquilibriumNmm);
 assert.ok(r.maxFreeVerticalResidualN<crit.freeVerticalResidualN);assert.ok(r.maxFreeBendingResidualNmm<crit.freeBendingResidualNmm);
 assert.ok(r.meshAudit.maxWasherConstraintErrorMm<crit.washerCompatibilityMm);
 assert.ok(Math.abs(r.meshAudit.areaMm2-r.meshAudit.sourceAreaMm2)<crit.plateAreaErrorMm2);assert.equal(r.meshAudit.maxEdgeMultiplicity,2);
 assert.equal(r.preparedModel.shellCount,r.cells.length);assert.equal(r.preparedModel.plateNodeCount,r.nodes.length);
 assert.equal(r.engineeringApproved,false);assert.equal(r.productionReleased,false);assert.equal(r.stageComplete,false);
 assert.equal(r.boltForces.length,4);assert.equal(new Set(r.boltForces.map(b=>b.tag)).size,4);
 assert.deepEqual(r.bolts.map(b=>b.tag),r.boltForces.map(b=>b.tag),'Plot/table bolt order mismatch');
 for(const b of r.boltForces){const root=r.bolts.find(x=>x.tag===b.tag);assert.ok(Number.isFinite(b.tensionN)&&b.tensionN>=-1e-7);assert.ok(Math.abs(b.tensionN-r.basis.kBoltNPerMm*Math.max(0,root.displacement[2]))<1e-5);}
 const nodes=new Map(r.nodes.map(n=>[n.tag,n]));
 for(const n of r.nodes)assert.ok([...n.xyzMm,...n.displacementMm].every(Number.isFinite));
 for(const c of r.cells){assert.equal(c.ids.length,4);assert.ok(c.ids.every(i=>nodes.has(i)));assert.ok(c.gaussResultants.flat().every(Number.isFinite));}
 for(const a of r.reactions.filter(a=>a.kind==='bed')){assert.ok(a.forceN[2]>=-1e-7);if(nodes.get(a.plateNode).displacementMm[2]>1e-9)assert.ok(Math.abs(a.forceN[2])<1e-7);}
 const prior=read(`output/foot-demand-p84/${r.key}-${r.foot}.json`),shift=cross(sub(prior.originMm,r.originFabricationMm),prior.appliedForceN);
 const expectedM=prior.appliedMomentNmm.map((x,i)=>x+shift[i]);assert.ok(Math.abs(prior.appliedForceN[2]-r.appliedForceN[2])<1e-6);assert.ok(norm(sub(expectedM.slice(0,2),r.appliedMomentNmm.slice(0,2)))<.01);
 // Source geometry is unchanged except the P89 washer/head/thread proposal.
 const old=read(`output/abd-base-pattern-p85/${r.key}.json`),candidate=read(`output/base-thread-candidate-p89/${r.key}.json`);
 assert.deepEqual(old.baseFeet.find(f=>f.tag===r.foot),candidate.baseFeet.find(f=>f.tag===r.foot));
}
export function compare(id,h1,h2,L=50){
 const af=name(id,h1,L),bf=name(id,h2,L),a=read(`${dir}/${af}`),b=read(`${dir}/${bf}`);checkResult(a);checkResult(b);
 assert.equal(a.key+'-'+a.foot,id);assert.equal(b.key+'-'+b.foot,id);assert.equal(a.meshTargetMm,h1);assert.equal(b.meshTargetMm,h2);assert.equal(a.basis.effectiveBoltLengthMm,L);assert.equal(b.basis.effectiveBoltLengthMm,L);
 const ta=a.boltForces.map(b=>b.tensionN),tb=b.boltForces.map(b=>b.tensionN),dt=norm(sub(ta,tb))/norm(tb),dw=Math.abs(a.maxUpwardDisplacementMm-b.maxUpwardDisplacementMm)/Math.abs(b.maxUpwardDisplacementMm);
 return {id,key:b.key,foot:b.foot,executionMethod:b.executionMethod,effectiveBoltLengthMm:L,coarseMeshTargetMm:h1,fineMeshTargetMm:h2,coarseFile:af,fineFile:bf,coarseSha256:sha(`${dir}/${af}`),fineSha256:sha(`${dir}/${bf}`),boltForcesKN:tb.map(v=>v/1000),maximumTensionKN:Math.max(...tb)/1000,maxUpwardDisplacementMm:b.maxUpwardDisplacementMm,minDisplacementMm:b.minDisplacementMm,boltRefinementRelative:dt,displacementRefinementRelative:dw,refinementAccepted:dt<=crit.boltForceVectorL2Relative&&dw<=crit.maxUpwardDisplacementRelative,coarseQuads:a.cells.length,fineQuads:b.cells.length};
}
export function audit(){
 const batch=read(dir+'/batch-plan.json'),status=read(dir+'/batch-status.json'),bench=read(dir+'/benchmarks.json');
 assert.equal(batch.runnerSha256,sha('tools/modular-program/run_foot_flex_p90.py'));assert.equal(batch.studyPlanSha256,sha('knowledge/modular-program-r02/foot-study-plan-p90.json'));
 assert.equal(status.completed,52);assert.equal(status.errors.length,0);assert.equal(new Set(status.records.map(r=>r.file)).size,52);
 const refinement=read(dir+'/refinement-plan.json'),refined=read(dir+'/refinement-status.json');
 assert.equal(refinement.sourceSha256,sha('tools/modular-program/refine_foot_flex_p90.py'));assert.deepEqual(refinement.criteria,crit);
 assert.equal(refinement.originalPlanSha256,sha('knowledge/modular-program-r02/foot-study-plan-p90.json'));
 assert.equal(refinement.selected.length,12);assert.equal(refined.completed,12);assert.equal(refined.errors.length,0);
 for(const s of refinement.selected)for(const i of s.inputs)assert.equal(sha(dir+'/'+i.path),i.sha256);
 const refinedIds=new Set(refinement.selected.map(s=>`${s.args[0]}-${s.args[1]}-F${s.args[2]}`));
 for(const [p,h] of Object.entries(bench.sourceHashes))assert.equal(sha(p),h);assert.ok(bench.passed&&bench.acceptedMPC.accepted&&!bench.rejectedMultiStepDiagnostic.accepted);
 assert.ok(bench.plateRows.at(-1).relativeError<.01);
 const rows=[];
 for(const f of 'ABD')for(const side of ['LH','RH'])for(const owner of ['M01','M03'])for(const foot of [1,2]){
  const id=`${f}-${side}-W01-${owner}-F${foot}`,extra=refinedIds.has(id),h1=f==='D'||extra?10:20,h2=f==='D'||extra?7.5:10,oldH=f==='D'?7.5:10;
  const row=compare(id,h1,h2),old=read(`output/foot-flex-p86/${id}-h${oldH}.json`);
  row.initialFile=extra?name(id,20):null;
  if(extra){const initial=read(dir+'/'+row.initialFile);checkResult(initial);row.initialSha256=sha(dir+'/'+row.initialFile);row.initialRefinement=refinement.selected.find(s=>`${s.args[0]}-${s.args[1]}-F${s.args[2]}`===id);}
  row.P86Reference={path:`output/foot-flex-p86/${id}-h${oldH}.json`,sha256:sha(`output/foot-flex-p86/${id}-h${oldH}.json`),meshTargetMm:oldH,washerRadiusMm:20,maximumTensionKN:Math.max(...old.boltForces.map(x=>x.tensionN))/1000,maxUpwardDisplacementMm:old.maxUpwardDisplacementMm};
  assert.equal(row.P86Reference.sha256,snapshots.get(row.P86Reference.path),'Historical comparison changed since P86 issue');
  row.changeFromP86={maximumTensionRelative:row.maximumTensionKN/row.P86Reference.maximumTensionKN-1,maximumUpliftRelative:row.maxUpwardDisplacementMm/row.P86Reference.maxUpwardDisplacementMm-1,note:'Comparison of accepted outputs; mesh differs for additionally refined A/B groups. Not an isolated washer-radius effect.'};
  const sameMesh=read(dir+'/'+name(id,oldH));row.sameMeshRadiusComparison={meshTargetMm:oldH,oldRadiusMm:20,newRadiusMm:18.5,maximumTensionRelative:Math.max(...sameMesh.boltForces.map(x=>x.tensionN))/1000/row.P86Reference.maximumTensionKN-1,maximumUpliftRelative:sameMesh.maxUpwardDisplacementMm/row.P86Reference.maxUpwardDisplacementMm-1};rows.push(row);
 }
 const sensitivity=[40,60].map(L=>compare('D-RH-W01-M03-F2',10,7.5,L));
 const mirrors=rows.filter(r=>r.key.includes('-LH-')).map(a=>{const b=rows.find(r=>r.id===a.id.replace('-LH-','-RH-'));return {left:a.id,right:b.id,bothNative:true,boltRelative:norm(sub(a.boltForcesKN,b.boltForcesKN))/norm(a.boltForcesKN),upliftRelative:Math.abs(a.maxUpwardDisplacementMm-b.maxUpwardDisplacementMm)/a.maxUpwardDisplacementMm};});
 const prep=read(dir+'/D-LH-W01-M03-F2-h10-r18.5-L50-prepared.json'),pilot=read(dir+'/'+name('D-RH-W01-M03-F2',10));
 assert.notEqual(prep.geometryConstraintHash,pilot.preparedModel.geometryConstraintHash);
 const report={revision:'P90',stage:5,scope:plan.scope,verifiedNativeFiles:64,totalGroups:24,refinementAcceptedGroups:rows.filter(r=>r.refinementAccepted).length,criteria:crit,rows,sensitivity,mirrorChecks:mirrors,mirrorReuse:{used:false,reason:'Pilot canonical FE geometry/constraint hashes differed; all result cases solved natively.',preparedInputFile:'D-LH-W01-M03-F2-h10-r18.5-L50-prepared.json',preparedInputSha256:sha(dir+'/D-LH-W01-M03-F2-h10-r18.5-L50-prepared.json')},benchmarks:{file:'benchmarks.json',sha256:sha(dir+'/benchmarks.json'),passed:bench.passed},sensitivityScope:'Leff40/60 stiffness alternatives for the pilot only; not physical bolt tolerance or all-group envelope.',verifiedConnectionCapacityN:null,stageComplete:false,engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(dir+'/audit.json',JSON.stringify(report,null,2));
 const cols=['id','effectiveBoltLengthMm','maximumTensionKN','maxUpwardDisplacementMm','boltRefinementRelative','displacementRefinementRelative','refinementAccepted','executionMethod'];
 fs.writeFileSync(dir+'/summary.csv',cols.join(',')+'\n'+[...rows,...sensitivity].map(r=>cols.map(c=>r[c]).join(',')).join('\n')+'\n');
 console.log(JSON.stringify({nativeFiles:64,groups:24,accepted:report.refinementAcceptedGroups,sensitivityAccepted:sensitivity.filter(r=>r.refinementAccepted).length,maxT:Math.max(...rows.map(r=>r.maximumTensionKN)),pending:rows.filter(r=>!r.refinementAccepted)},null,2));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)audit();
