import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build,read,sha,validatePair,washerDemand,toCanonical} from './connection-disposition-p92.mjs';
import {capacities,checkBolt} from './bolt-screen-p88.mjs';
const r=build(),close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('24 baseline +2 pilot groups, not 26 independently qualified geometries',()=>{
 assert.equal(r.groups.length,26);assert.equal(r.groups.filter(g=>g.studyKind==='BASELINE_24_GROUPS').length,24);
 assert.equal(r.groups.flatMap(g=>g.bolts.flatMap(b=>b.componentCases)).length,312);
 assert.equal(r.progress.wholeStageComplete,false);assert.equal(r.progress.wholeStagePercent,null);
 assert.equal(r.summary.baselineArithmeticWithinCount,96);assert.equal(r.summary.pilotArithmeticWithinCount,8);
 for(const g of r.groups)assert.equal(g.sourceWrench.sameSourceWrenchVerified,true);
});
test('closed-form bolt calculations have N units and pressure sensitivities only',()=>{
 const c=capacities();close(c.tensionResistanceN,141120);close(c.shearResistanceN,94080);
 const q=checkBolt(40000,9000,c,1.5);close(q.interactionRatio,13500/94080+60000/(1.4*141120));assert.equal(q.connectionPassed,null);
});
test('washer uses area outside foot bore22, not washer ID21 or a solid disk',()=>{
 const w=washerDemand(40000,[125,70]);close(w.nominalSupportedAnnulusMm2,Math.PI/4*(37**2-22**2));
 close(w.pressureOnlyAverageMPa,40000/w.nominalSupportedAnnulusMm2);close(w.nominalWasherEdgeMarginMm,11.5);
 assert.equal(w.verifiedWasherCapacityN,null);assert.equal(w.annulusInsideNominalFoot,true);
 assert.equal(washerDemand(40000,[170,70]).annulusInsideNominalFoot,false);
 assert.throws(()=>washerDemand(-1,[0,0]));assert.throws(()=>washerDemand(1,[0,0],{hole:40,id:21,od:37,thickness:3}));
});
test('M01 pitch250 and M03 pitch240 retained, neither silently declared all-service accepted',()=>{
 for(const g of r.groups){assert.equal(g.geometry.normalPitchMm,g.foot.startsWith('M01')?250:240);assert.equal(g.geometry.tangentPitchMm,140);assert.equal(g.geometry.noLongJointReductionByLength,true);assert.match(g.geometry.maximumSpacingDisposition,/OPEN_APPLICABILITY/);}
});
test('D RH reflected and rotated coordinates are not raw casting X/Y',()=>{
 const q=toCanonical('D-RH-W01',[1490,0,0]);close(q[0],0);close(q[1],0);
 const p=toCanonical('D-RH-W01',[0,0,0]);close(Math.hypot(...p),1490);assert.ok(p[1]>0);
});
const a=read('output/foot-flex-p90/audit.json').rows.find(g=>g.key==='D-RH-W01'&&g.foot==='M03-F2');
const native=read('output/foot-flex-p90/'+a.fineFile),s=read('output/abd-base-pattern-p85/bolt-demand.json').records.find(g=>g.key===a.key&&g.tag===a.foot),m=read('output/base-thread-candidate-p89/'+a.key+'.json'),old=read('output/foot-demand-p84/'+a.id+'.json');
function altered({ar=a,n=native,sr=s,mr=m,o=old}={}){return ()=>validatePair(ar,n,sr,mr,o);}
test('pair proves common-origin source wrench and actual bolt positions',()=>assert.equal(altered()().sameSourceWrenchVerified,true));
test('rejects a bolt coordinate shifted by1mm',()=>{const n=structuredClone(native);n.bolts[0].xy[0]+=1;assert.throws(altered({n}));});
test('rejects same max force imported from another load case',()=>{const o=structuredClone(old);o.appliedMomentNmm[2]+=10000;assert.throws(altered({o}));});
test('rejects stale P86 demand or old washer patch',()=>{
 const n={...native,revision:'P86'};assert.throws(altered({n}));
 assert.throws(altered({n:{...native,basis:{...native.basis,washerPatchRadiusMm:20}}}));
});
test('rejects reused tags, omitted source bolt and false release',()=>{
 assert.throws(altered({sr:{...s,bolts:s.bolts.slice(1)}}));
 assert.throws(altered({n:{...native,boltForces:[native.boltForces[0],...native.boltForces.slice(0,3)]}}));
 assert.throws(altered({mr:{...m,productionReleased:true}}));
});
test('current results are recomputed rather than copied from P88 summary',()=>{
 close(r.summary.baselineWorst.ratio,0.4561065024525057,1e-10);close(r.summary.pilotWorst.ratio,0.46766389720826995,1e-10);
 close(r.summary.maximumWasherSensitivityAverageMPa,92.25456707609715);close(r.summary.minNominalWasherEdgeMarginMm,11.5);
});
test('pins match and no torque, preload, washer/thread/system capacity or production approval invented',()=>{
 for(const p of r.pins)assert.equal(sha(p.path),p.sha256,p.path);
 for(const k of ['proposedTorqueNm','proposedPreloadN','verifiedThreadCapacityN','verifiedWasherCapacityN','verifiedConnectionCapacityN'])assert.equal(r[k],null);
 for(const k of ['engineeringApproved','productionReleased','stageComplete'])assert.equal(r[k],false);
 assert.equal(r.dispositions.find(x=>x.id==='REUSE-AND-TIGHTENING').status,'NOT_QUALIFIED_FOR_REUSABLE_SERVICE');
});
test('issued inputs are not overwritten by postprocessing',()=>{
 const oldIssued=read('output/stage5-update-p90-p91/manifest.json');
 for(const f of oldIssued.files.filter(f=>f.path.startsWith('output/foot-flex-p90/')||f.path.startsWith('output/cap-lift-p91/')))assert.equal(sha(f.path),f.sha256);
});
