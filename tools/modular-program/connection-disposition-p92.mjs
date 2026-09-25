// Post-process ISSUED native demands. No new solver, code adoption or production release.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {capacities,checkBolt,bearing,source as jrc} from './bolt-screen-p88.mjs';
export const dir='output/connection-disposition-p92';
export const read=p=>JSON.parse(fs.readFileSync(p));
export const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const near=(a,b,t=1e-5)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t,`${a} != ${b}`);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const guard=r=>{for(const k of ['engineeringApproved','productionReleased','stageComplete'])assert.equal(r[k],false,`Unexpected ${k}`);};
export function toCanonical(key,[x,y,z=0]){
 const s=key.startsWith('D-')?200/2825:0,L=Math.hypot(1,s);
 if(key.includes('-RH-'))x=1490-x;
 return [(x-s*y)/L,(s*x+y)/L,z];
}
export function validatePair(a,r,s,m,old){
 guard(r);guard(m);guard(old);
 assert.equal(a.refinementAccepted,true);assert.equal(a.executionMethod,'NATIVE_OPENSEES_SOLVE');
 assert.equal(r.revision,'P90');assert.equal(r.baseGeometryRevision,'P89');assert.equal(m.revision,'P89');
 assert.equal(m.geometryRole,'UNADOPTED_CANDIDATE');assert.equal(r.executionMethod,'NATIVE_OPENSEES_SOLVE');
 assert.equal(r.solverVersion,'3.8.0');assert.equal(r.key,a.key);assert.equal(r.key,s.key);assert.equal(m.key,r.key);assert.equal(old.key,r.key);
 assert.equal(r.foot,a.foot);assert.equal(r.foot,s.tag);assert.equal(r.foot,old.tag);
 for(const [k,v]of Object.entries({thicknessMm:30,washerPatchRadiusMm:18.5,stressAreaMm2:245,kContactNPerMm3:1000,effectiveBoltLengthMm:a.effectiveBoltLengthMm}))near(r.basis[k],v);
 assert.equal(r.bolts.length,4);assert.equal(r.boltForces.length,4);assert.equal(s.bolts.length,4);
 assert.equal(new Set(r.bolts.map(b=>b.tag)).size,4);assert.equal(new Set(r.boltForces.map(b=>b.tag)).size,4);assert.equal(new Set(s.bolts.map(b=>b.tag)).size,4);
 const foot=m.baseFeet.find(f=>f.tag===r.foot);assert.ok(foot);
 const points=foot.cells.flatMap(c=>c.poly.map(p=>minus(toCanonical(r.key,p),r.originFabricationMm)));
 for(let i=0;i<2;i++){near(Math.min(...points.map(p=>p[i])),i?-100:-175,.001);near(Math.max(...points.map(p=>p[i])),i?100:175,.001);}
 for(const b of r.bolts){
  const v=s.bolts.find(x=>x.tag===b.tag),l=m.baseLocks.find(x=>x.tag===b.tag),f=r.boltForces.find(x=>x.tag===b.tag);
  assert.ok(v&&l&&f,'Unmatched bolt tag');assert.equal(l.foot,r.foot);near(l.footClearanceDiameterMm,22);
  const actual=toCanonical(r.key,l.axisMm);
  for(let i=0;i<2;i++){near(b.xy[i]+r.originFabricationMm[i],v.positionMm[i]+s.originMm[i],.001);near(b.xy[i]+r.originFabricationMm[i],actual[i],.001);}
  assert.ok(Number.isFinite(f.tensionN)&&f.tensionN>=0);near(v.shearMagnitudeN,Math.hypot(...v.shearReactionOnPlateN));
 }
 // P85 shear and P90 vertical handoffs must originate in the SAME P83 wrench.
 const F=r.loadMappings.reduce((a,x)=>plus(a,x.forceN),[0,0,0]);
 const M=r.loadMappings.reduce((a,x)=>{
  const n=r.nodes.find(n=>n.tag===x.plateNode);assert.ok(n);
  const src=plus([n.xyzMm[0],n.xyzMm[1],0],x.offsetMm);
  return plus(a,plus(x.sourceMomentNmm,cross(src,x.forceN)));
 },[0,0,0]);
 const translatedM=plus(old.appliedMomentNmm,cross(minus(old.originMm,r.originFabricationMm),old.appliedForceN));
 for(let i=0;i<3;i++){near(F[i],old.appliedForceN[i],.01);near(M[i],translatedM[i],1);}
 near(r.appliedForceN[2],F[2],.01);near(r.appliedMomentNmm[0],M[0],1);near(r.appliedMomentNmm[1],M[1],1);
 for(let i=0;i<2;i++)near(F[i]+s.bolts.reduce((n,b)=>n+b.shearReactionOnPlateN[i],0),0,.01);
 const reactionMz=s.bolts.reduce((n,b)=>n+(b.positionMm[0]+s.originMm[0]-r.originFabricationMm[0])*b.shearReactionOnPlateN[1]-(b.positionMm[1]+s.originMm[1]-r.originFabricationMm[1])*b.shearReactionOnPlateN[0],0);
 near(M[2]+reactionMz,0,1);
 return {forceN:F,momentNmm:M,originCanonicalMm:r.originFabricationMm,
  axes:'P83 canonical wall coordinates: RH reflection then D-profile rotation; NOT global casting XY. +z upward.',
  sameSourceWrenchVerified:true};
}
export function washerDemand(tensionN,xy,{hole=22,id=21,od=37,thickness=3}={}){
 assert.ok(Number.isFinite(tensionN)&&tensionN>=0);assert.ok(od>hole&&id<od&&thickness>0);
 const effectiveInner=Math.max(hole,id),area=Math.PI/4*(od**2-effectiveInner**2);
 const edgeDistances=[175-Math.abs(xy[0]),100-Math.abs(xy[1])],edgeMargin=Math.min(...edgeDistances)-od/2;
 return {idMm:id,odMm:od,thicknessMm:thickness,clearanceHoleMm:hole,
  nominalSupportedAnnulusMm2:area,nominalWasherEdgeMarginMm:edgeMargin,
  annulusInsideNominalFoot:edgeMargin>=0,pressureOnlyAverageMPa:tensionN/area,
  sensitivity1_5AverageMPa:1.5*tensionN/area,
  meaning:'Demand average over nominal supported annulus (OD37 minus bore22); not peak contact, preload or washer bending. Nominal geometry only.',
  standardProductCompatibility:'ISO7089-200HV with product-grade A/B hex screw class8.8: compatible category, subject to genuine conforming product and substrate/hole suitability.',
  verifiedWasherCapacityN:null};
}
export function makeGroup(a,r,s,m,old,pins){
 const wrench=validatePair(a,r,s,m,old),pitch=m.wallFootHolePitches.find(f=>f.foot===r.foot);assert.ok(pitch);
 const expected=r.owner==='M01'?250:240;near(pitch.normalPitchMm,expected,.001);near(pitch.tangentPitchMm,140,.001);
 const c=capacities({grade:'8.8'}),bolts=r.boltForces.map(f=>{
  const b=r.bolts.find(b=>b.tag===f.tag),v=s.bolts.find(b=>b.tag===f.tag),plate=bearing({xy:b.xy});
  const comp=v.shearReactionOnPlateN.map((x,i)=>Math.abs(1.5*x)/plate.resistanceAlongLocalAxesN[i]);
  return {tag:f.tag,xyMm:b.xy,canonicalPositionMm:plus([...b.xy,0],r.originFabricationMm),
   tensionN:f.tensionN,shearReactionOnPlateN:v.shearReactionOnPlateN,shearMagnitudeN:v.shearMagnitudeN,
   componentCases:[1,1.25,1.5].map(lambda=>checkBolt(f.tensionN,v.shearMagnitudeN,c,lambda)),
   trialFootBearing:{...plate,fuMPa:360,fuBasis:'P88 assumed minimum material case; not project material certificate',pressureMultiplier:1.5,componentRatios:comp,additionalConservativeLinearSum:comp[0]+comp[1]},
   washer:washerDemand(f.tensionN,b.xy),verifiedConnectionCapacityN:null};
 });
 const pairDistances=bolts.flatMap((b,i)=>bolts.slice(i+1).map(c=>Math.hypot(...minus(b.xyMm,c.xyMm))));
 return {id:a.id+(a.effectiveBoltLengthMm===50?'':`-L${a.effectiveBoltLengthMm}`),key:r.key,foot:r.foot,
  studyKind:a.effectiveBoltLengthMm===50?'BASELINE_24_GROUPS':'PILOT_SENSITIVITY_NOT_24_GROUP_BOUND',effectiveBoltLengthMm:a.effectiveBoltLengthMm,
  inputSnapshots:pins,sourceWrench:wrench,geometry:{footMm:[350,200,30],normalPitchMm:expected,tangentPitchMm:140,
   longestBoltSeparationMm:Math.max(...pairDistances),longJoint15dThresholdMm:300,
   noLongJointReductionByLength:Math.max(...pairDistances)<=300,
   maximumSpacingDisposition:'OPEN_APPLICABILITY: p250/240 >200 where JRC Table2.3 footnote1 exposure/compression conditions apply. Indoor alone does not waive compression review.'},
  conditionalBoltResistances:c,bolts,engineeringApproved:false,productionReleased:false,stageComplete:false};
}
export function build(){
 assert.equal(sha(jrc.localPath),jrc.sha256,'JRC source changed');
 const issue90=read('output/stage5-update-p90-p91/manifest.json'),issue89=read('output/stage5-update-p89/manifest.json'),issue85=read('output/stage5-update-p85/manifest.json');
 const issued=new Map([...issue85.files.map(f=>['output/'+f.path,f.sha256]),...issue89.files.map(f=>[f.path.startsWith('base-thread-')?'output/'+f.path:f.path,f.sha256]),...issue90.files.map(f=>[f.path,f.sha256])]);
 // Older archives use paths relative to output; resolve only known exact candidates.
 for(const manifest of [issue85,issue89])for(const f of manifest.files)if(fs.existsSync('output/'+f.path))issued.set('output/'+f.path,f.sha256);
 const pins=new Map(),pin=(p,expected)=>{p=p.replaceAll('\\','/');const h=sha(p);if(expected)assert.equal(h,expected,'Stale source '+p);if(pins.has(p))assert.equal(h,pins.get(p),'Conflicting source '+p);pins.set(p,h);return {path:p,sha256:h};};
 const issuePin=p=>{assert.ok(issued.has(p),'Source not in issued manifests '+p);return pin(p,issued.get(p));};
 const auditPath='output/foot-flex-p90/audit.json',shearPath='output/abd-base-pattern-p85/bolt-demand.json';issuePin(auditPath);issuePin(shearPath);
 const audit=read(auditPath),shear=read(shearPath);guard(audit);assert.equal(audit.refinementAcceptedGroups,24);assert.equal(audit.rows.length,24);assert.equal(audit.sensitivity.length,2);
 const groups=[];
 for(const a of [...audit.rows,...audit.sensitivity]){
  const file='output/foot-flex-p90/'+a.fineFile,nativePin=issuePin(file);assert.equal(nativePin.sha256,a.fineSha256);
  const r=read(file),s=shear.records.find(s=>s.key===r.key&&s.tag===r.foot);assert.ok(s);
  const mp=`output/base-thread-candidate-p89/${r.key}.json`,op=`output/foot-demand-p84/${r.key}-${r.foot}.json`;
  const oldExpected=s.inputs.find(x=>x.path===op)?.sha256;assert.ok(oldExpected,'Missing wrench provenance');
  const mPin=issuePin(mp),m=read(mp),old=read(op),oldPin=pin(op,oldExpected);
  const all=[pin(auditPath),pin(shearPath),nativePin,mPin,oldPin];
  for(const p of [...s.inputs,...r.inputs,...m.inputSnapshots])all.push(pin(p.path,p.sha256));
  groups.push(makeGroup(a,r,s,m,old,[...new Map(all.map(p=>[p.path,p])).values()]));
 }
 const threadPath='knowledge/modular-program-r02/thread-study-p89.json',thread=read(threadPath);pin(threadPath);
 const selected=groups.flatMap(g=>g.bolts.map(b=>({id:g.id,bolt:b.tag,studyKind:g.studyKind,...b.componentCases[2]}))),baseline=selected.filter(c=>c.studyKind==='BASELINE_24_GROUPS'),pilot=selected.filter(c=>c.studyKind!=='BASELINE_24_GROUPS');
 const worst=xs=>xs.reduce((a,b)=>a.ratio>=b.ratio?a:b);
 for(const p of [fileURLToPath(import.meta.url).replaceAll('\\','/').split('/tools/')[1]])pin('tools/'+p);
 pin('tools/modular-program/bolt-screen-p88.mjs');pin(jrc.localPath,jrc.sha256);
 return {revision:'P92',stage:5,status:'UPDATED_STATIC_COMPONENT_STUDY_AND_INSPECTION_PROPOSAL',
  sources:[{...jrc,readPdfPages:[101,102,103,104,105,106,107],visuallyCheckedPdfPages:[104,105,106]},
   {id:'BSI-ISO7089-SCOPE',url:'https://knowledge.bsigroup.com/products/plain-washers-normal-series-product-grade-a',checkedDate:'2026-09-18',evidence:'Published scope, 200HV/8.8 compatibility; additional suitability check for soft substrates/large clearance holes.'},
   {id:'WURTH-0407009120',url:thread.washerSource.url,checkedDate:'2026-09-18',evidence:'M20 nominal21/37/3, steel200HV; no selected coating or torque.'},
   {id:'BOSSARD-BN56',url:thread.boltSource.url,checkedDate:'2026-09-18',evidence:'ISO4017 fully threaded hex steel8.8 family, not a qualified project order.'}],
  demandBasis:'P90 flexible-foot tension + P85 four-bolt in-plane shear, same P83 nominal hydrostatic wrench proven at common origin and same bolt coordinates. Hybrid one-way model, not fully coupled 3D.',
  multiplierBasis:'1/1.25/1.5 pressure-only sensitivities; not statutory combinations, vibration qualification, preload or lifting factors.',
  progress:{baselineGroups:24,baselineBolts:96,pilotGroups:2,pilotBoltCases:8,arithmeticCases:312,subtaskPercent:100,wholeStagePercent:null,wholeStageComplete:false},
  dispositions:[
   {id:'WASHER-SELECTION',status:'COMPATIBLE_PRODUCT_CATEGORY_CONDITIONALLY',decision:'Keep ISO7089 steel200HV 21/37/3 and hex8.8 as P89 candidate; specify genuine product, hard flat clean bearing surface and full supported annulus. Not washer rigidity/capacity approval.'},
   {id:'THREAD-STACK',status:'GEOMETRIC_ACCEPTANCE_PROPOSED',decision:'Total insertion26-28 exceeds recorded manufacturer minimum25.22; nominal27/recess3. Inspect actual full threads/runout/coating and supplied sizes. No rated thread load.',acceptanceEnvelopeMm:thread.incomingInspectionEnvelopeMm},
   {id:'STATIC-BOLT-BODY',status:'UPDATED_CONDITIONAL_ARITHMETIC_COMPLETE',decision:'Use P92 paired results, not stale P88 values. Assumed 8.8/As245/gammaM2=1.25; grade and adopted design basis remain to be confirmed.'},
   {id:'REUSE-AND-TIGHTENING',status:'NOT_QUALIFIED_FOR_REUSABLE_SERVICE',decision:'Do not claim a reusable mould connection from non-preloaded static tension category D. Develop controlled clamping/anti-loosening and cyclic assessment; torque and preload remain null, no arbitrary M20 torque.'},
   {id:'MAXIMUM-SPACING',status:'OPEN_APPLICABILITY',decision:'Keep250/240/140 as modelled. Resolve exposure and plate-compression classification from actual service/combined forces before accepting pitch; do not blanket waive200mm.'},
   {id:'WHOLE-CONNECTION',status:'DESIGN_IN_PROGRESS',decision:'Bed/thread/washer contact, foot yield/net/block tearing, weld/frame/seam, gravity/dynamic, supported demould and lifting remain separate P40 work. No S00 extrapolation.'}
  ],
  summary:{baselineWorst:worst(baseline),pilotWorst:worst(pilot),baselineArithmeticWithinCount:baseline.filter(x=>x.staticArithmeticWithinResistance).length,pilotArithmeticWithinCount:pilot.filter(x=>x.staticArithmeticWithinResistance).length,
   maxBaselineTensionN:Math.max(...groups.filter(g=>g.studyKind==='BASELINE_24_GROUPS').flatMap(g=>g.bolts.map(b=>b.tensionN))),
   maximumWasherSensitivityAverageMPa:Math.max(...groups.flatMap(g=>g.bolts.map(b=>b.washer.sensitivity1_5AverageMPa))),
   minNominalWasherEdgeMarginMm:Math.min(...groups.flatMap(g=>g.bolts.map(b=>b.washer.nominalWasherEdgeMarginMm))),
   maxFootBearingLinearSum:Math.max(...groups.flatMap(g=>g.bolts.map(b=>b.trialFootBearing.additionalConservativeLinearSum)))},
  groups,pins:[...pins].map(([path,sha256])=>({path,sha256})),
  proposedTorqueNm:null,proposedPreloadN:null,verifiedThreadCapacityN:null,verifiedWasherCapacityN:null,verifiedConnectionCapacityN:null,
  engineeringApproved:false,productionReleased:false,stageComplete:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=build();fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/register.json',JSON.stringify(r,null,2));
 for(const key of [...new Set(r.groups.map(g=>g.key))])fs.writeFileSync(`${dir}/${key}.json`,JSON.stringify({...r,groups:r.groups.filter(g=>g.key===key),summaryScope:'Register summary is across6setups; group rows below are only this setup.',key},null,2));
 const header='group,study,bolt,pressure_multiplier,tension_N,shear_N,conditional_bolt_ratio,nominal_pressure_only_washer_average_MPa,nominal_washer_edge_margin_mm\n';
 const rows=gs=>gs.flatMap(g=>g.bolts.flatMap(b=>b.componentCases.map(c=>[g.id,g.studyKind,b.tag,c.lambda,c.tensionN,c.shearN,c.ratio,b.washer.pressureOnlyAverageMPa,b.washer.nominalWasherEdgeMarginMm].join(',')))).join('\n')+'\n';
 fs.writeFileSync(dir+'/checks.csv',header+rows(r.groups));
 for(const key of [...new Set(r.groups.map(g=>g.key))])fs.writeFileSync(`${dir}/${key}-checks.csv`,header+rows(r.groups.filter(g=>g.key===key)));
 console.log(JSON.stringify({progress:r.progress,summary:r.summary},null,2));
}
