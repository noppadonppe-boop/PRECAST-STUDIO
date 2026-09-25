// Static fastener-body / local foot bearing study. NOT a whole-connection release.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export const dir='output/bolt-screen-p88';
const read=p=>JSON.parse(fs.readFileSync(p));
export const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
export const source={
 id:'JRC96658-2015-CONNECTIONS',title:'Design of steel buildings with the Eurocodes, with worked examples',
 url:'https://publications.jrc.ec.europa.eu/repository/bitstream/JRC96658/jrc_steel_report_2015_07_22.pdf',
 doi:'10.2788/605700',localPath:'knowledge/modular-program-r02/references/JRC96658-2015.pdf',
 sha256:'e0c0ee256c3fe9da00ca21d31a175e6f2e2407536349f9c361b188d679b4e327',
 authority:'European Commission Joint Research Centre; training report reproducing selected first-generation EN1993-1-8 provisions, NOT a complete current adopted code / National Annex.',
 readPdfPages:[23,101,102,103,104,105,106,107,119],visuallyCheckedPdfPages:[106],
 clauses:[
  {ref:'JRC Table2.1 / EN1993-1-8 Table3.1',pdfPage:101,printedPage:85,scope:'4.6: fyb240/fub400;8.8: fyb640/fub800 MPa'},
  {ref:'JRC Table2.2 / EN1993-1-8 Table3.2',pdfPage:102,printedPage:86,scope:'Separate shear/bearing, tension/punching checks; non-preloaded tension not for frequent tensile variations.'},
  {ref:'JRC Table2.3 / EN1993-1-8 Table3.3',pdfPage:104,printedPage:88,scope:'e>=1.2d0, p1>=2.2d0, p2>=2.4d0; maximum pitch and applicability footnotes must also be checked.'},
  {ref:'JRC2.1.3 + Table2.4 / EN1993-1-8 Table3.4 excerpt',pdfPage:106,printedPage:90,scope:'Fv=alpha*fub*As/gamma; Ft=0.9*fub*As/gamma; V/Fv+T/(1.4Ft)<=1. Bearing separately parallel/normal to an edge.'},
  {ref:'JRC2.1.3 conditions',pdfPage:105,printedPage:89,scope:'Normal-hole / thread conformity / washer / packing restrictions; no automatic application to an unqualified tapped bed.'},
  {ref:'JRC2.1.4',pdfPage:107,printedPage:91,scope:'Long joints >15d require shear reduction; group rules differ from individual fastener checks.'}
 ],
 gammaM2:{value:1.25,status:'EXPLICIT_TRIAL_PARTIAL_FACTOR_NOT_SELECTED_NATIONAL_ANNEX',context:'JRC p7 and worked connection example p103 use1.25; this study does not certify a Thai steel-mould design basis.'}
};
export function capacities({grade='8.8',stressAreaMm2=245,gammaM2=1.25}={}){
 assert.ok(['4.6','8.8'].includes(grade),'Unsupported grade');
 assert.ok(Number.isFinite(stressAreaMm2)&&stressAreaMm2>0);
 assert.ok(Number.isFinite(gammaM2)&&gammaM2>=1);
 const fubMPa=grade==='8.8'?800:400,fybMPa=grade==='8.8'?640:240;
 return {grade,fubMPa,fybMPa,stressAreaMm2,gammaM2,shearPlanes:1,threadsInShearPlane:true,
  shearResistanceN:.6*fubMPa*stressAreaMm2/gammaM2,tensionResistanceN:.9*fubMPa*stressAreaMm2/gammaM2};
}
export function checkBolt(T,V,c,lambda=1){
 assert.ok([T,V,lambda].every(Number.isFinite)&&T>=0&&V>=0&&lambda>0,'Invalid demand');
 const tensionRatio=lambda*T/c.tensionResistanceN,shearRatio=lambda*V/c.shearResistanceN;
 const interactionRatio=shearRatio+tensionRatio/1.4,ratio=Math.max(tensionRatio,shearRatio,interactionRatio);
 return {lambda,tensionN:lambda*T,shearN:lambda*V,tensionRatio,shearRatio,interactionRatio,ratio,
  staticArithmeticWithinResistance:ratio<=1,connectionPassed:null};
}
// Deliberately use the smaller distance to opposite edges: conservative for either load sign.
export function bearing({xy,width=350,height=200,d=20,d0=22,t=30,fu=360,fub=800,gamma=1.25}){
 const e=xy.map((v,i)=>(i?height:width)/2-Math.abs(v));
 assert.ok(e.every(x=>x>d0/2));
 const R=e.map((e1,i)=>{
  const k=Math.min(2.8*e[1-i]/d0-1.7,2.5),alpha=Math.min(e1/(3*d0),fub/fu,1);
  assert.ok(k>0&&alpha>0);return k*alpha*fu*d*t/gamma;
 });
 return {edgeDistancesMm:e,resistanceAlongLocalAxesN:R,minEdgeRequiredMm:1.2*d0,
  minimumEdgesWithinRule:e.every(x=>x>=1.2*d0),basis:'Outer 30mm foot plate only; smaller opposing edge distances; not the tapped bed, washer, net section or block tearing.'};
}
export function validatePair(a,r,s){
 assert.ok(a.refinementAccepted,'Unaccepted mesh');assert.equal(r.key,s.key);
 assert.equal(r.foot,s.tag);assert.equal(a.key,r.key);assert.equal(a.foot,r.foot);
 assert.equal(r.basis.thicknessMm,30);assert.equal(r.basis.stressAreaMm2,245);
 assert.equal(r.basis.effectiveBoltLengthMm,50);assert.equal(r.basis.kContactNPerMm3,1000);
 for(const k of ['engineeringApproved','productionReleased','stageComplete'])assert.equal(r[k],false);
 assert.equal(r.boltForces.length,4);assert.equal(s.bolts.length,4);
 assert.equal(new Set(s.bolts.map(b=>b.tag)).size,4);
 for(const b of r.bolts){
  const sb=s.bolts.find(x=>x.tag===b.tag);assert.ok(sb,'Bolt tag mismatch');
  b.xy.forEach((x,i)=>near(x+r.originFabricationMm[i],sb.positionMm[i]+s.originMm[i],.001));
 }
 for(const f of r.boltForces)assert.ok(s.bolts.some(b=>b.tag===f.tag));
}
export function build(){
 assert.equal(sha(source.localPath),source.sha256,'Source document changed');
 const paths=['output/foot-flex-p86/audit.json','output/abd-base-pattern-p85/bolt-demand.json'];
 const issued=new Map(['85','86'].flatMap(rev=>read(`output/stage5-update-p${rev}/manifest.json`).files.map(f=>['output/'+f.path,f.sha256])));
 function pin(p){const h=sha(p);assert.equal(h,issued.get(p),'Not the issued source snapshot: '+p);return {path:p,sha256:h};}
 const inputs=paths.map(pin),[a,d]=paths.map(read),groups=[];
 assert.equal(a.refinementAcceptedGroups,24);assert.equal(a.rows.length,24);assert.equal(d.records.length,24);
 for(const ar of a.rows){
  const path='output/foot-flex-p86/'+ar.fineFile,pinned=pin(path),r=read(path),s=d.records.find(x=>x.key===r.key&&x.tag===r.foot);
  assert.ok(s);assert.equal(pinned.sha256,ar.fineSha256);validatePair(ar,r,s);
  const bolts=r.boltForces.map(f=>{
   const b=r.bolts.find(x=>x.tag===f.tag),v=s.bolts.find(x=>x.tag===f.tag),c=capacities(),plate=bearing({xy:b.xy});
   const cases=['4.6','8.8'].flatMap(grade=>[1,1.25,1.5].map(lambda=>{
    const cap=capacities({grade}),check=checkBolt(f.tensionN,v.shearMagnitudeN,cap,lambda);
    return {grade,...check};
   }));
   const plateDemandRatios=v.shearReactionOnPlateN.map((x,i)=>Math.abs(1.5*x)/plate.resistanceAlongLocalAxesN[i]);
   return {tag:f.tag,xyMm:b.xy,nominalDiameterMm:20,clearanceHoleMm:22,tensionN:f.tensionN,
    shearReactionOnPlateN:v.shearReactionOnPlateN,shearMagnitudeN:v.shearMagnitudeN,cases,
    trialFootBearing:{...plate,fuMPa:360,fuStatus:'ASSUMED_PLATE_MATERIAL_NOT_CERTIFIED',pressureMultiplier:1.5,
     componentRatios:plateDemandRatios,additionalConservativeLinearSum:plateDemandRatios.reduce((s,v)=>s+v,0)},
    conditionalResistance:c,verifiedCapacityN:null};
  });
  groups.push({id:ar.id,key:r.key,foot:r.foot,originFabricationMm:r.originFabricationMm,
   inputSnapshots:[...inputs,pinned,...s.inputs.map(i=>{assert.equal(sha(i.path),i.sha256);return i;})],bolts,
   geometry:{footDimensionsMm:[350,200,30],bedThicknessMm:30,nominalEngagementMm:20,washerIdOdThicknessMm:[22,40,3],holePitchMm:[250,140],minimumEdgeMm:30,
    maximumPitchReview:'250mm exceeds the 200mm prescriptive limit WHERE Table3.3 maximum-spacing conditions apply. Exposure/compression classification and an alternative detail have NOT been closed.'},
   coverage:{pressureCaseOnly:true,oneWayWallReactions:true,hybridVerticalAndShearModels:true,
    gravityIncluded:false,fatigueIncluded:false,slipIncluded:false,threadStrippingIncluded:false,washerStrengthIncluded:false},
   engineeringApproved:false,productionReleased:false,stageComplete:false});
 }
 const checks=groups.flatMap(g=>g.bolts.flatMap(b=>b.cases.map(c=>({id:g.id,bolt:b.tag,...c}))));
 const selected=checks.filter(c=>c.grade==='8.8'&&c.lambda===1.5),worst=selected.reduce((a,b)=>a.ratio>b.ratio?a:b);
 return {revision:'P88',stage:5,status:'STATIC_COMPONENT_SCREEN_NOT_CONNECTION_APPROVAL',source,
  inputSnapshots:inputs,generatorSha256:sha(fileURLToPath(import.meta.url)),
  proposedDevelopmentCase:{fastener:'M20 class8.8',nominalPitchMm:2.5,stressAreaMm2:245,
   status:'PROPOSED_STRENGTH_CASE_ONLY_NO_PURCHASE_OR_HARDWARE_GEOMETRY_SUBSTITUTION',
   normalHoleAndThreadConformity:'REQUIRES_SPECIFICATION_AND_CERTIFICATION',
   materialAndConnectionDesignBasisApproved:false},
  demandBasis:'Pair by setup/foot/bolt and physical coordinates: P86 flexible-foot tension with P85 elastic four-bolt shear under the SAME nominal hydrostatic case. This is a hybrid one-way screening pair, NOT a newly solved coupled 3D system. No maxima from different bolts/cases are paired.',
  multiplierBasis:'1,1.25,1.5 multiply the pressure-only demand for sensitivity, NOT statutory load combinations or certified vibration factors. Positive scaling preserves the ideal linear elastic/unilateral zero-gap case; no extrapolation to preload, gravity or yielding.',
  exclusions:['Tapped-bed internal/external thread stripping, pull-out and bed bending','Washer flexibility and head/washer punching','Foot yield lines, net section and block tearing','Welds / braces / complete frame and base interaction','Slip / frequent reuse / fatigue / locking and installation method','Gravity / impact / handling / floor / system load combinations','Other38 setups including solid S00 variants; roof/end/window-cassette connections in the six studied setups'],
  progress:{groupsComplete:24,groupsPlanned:24,subtaskPercent:100,boltLocations:96,arithmeticCases:checks.length,
   wholeStagePercent:null,wholeStageComplete:false},
  summary:{maximumBaselineTensionN:Math.max(...groups.flatMap(g=>g.bolts.map(b=>b.tensionN))),maximumBaselineShearN:Math.max(...groups.flatMap(g=>g.bolts.map(b=>b.shearMagnitudeN))),
   selectedTrial:worst,selectedArithmeticWithinCount:selected.filter(c=>c.staticArithmeticWithinResistance).length,selectedTotal:selected.length,
   maxLocalFootBearingLinearSum:Math.max(...groups.flatMap(g=>g.bolts.map(b=>b.trialFootBearing.additionalConservativeLinearSum)))},
  groups,engineeringApproved:false,productionReleased:false,stageComplete:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=build();fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(dir+'/register.json',JSON.stringify(r,null,2));
 for(const g of r.groups)fs.writeFileSync(dir+'/'+g.id+'.json',JSON.stringify({revision:'P88',source:r.source,demandBasis:r.demandBasis,multiplierBasis:r.multiplierBasis,...g},null,2));
 const rows=r.groups.flatMap(g=>g.bolts.flatMap(b=>b.cases.map(c=>[g.id,b.tag,c.grade,c.lambda,c.tensionN,c.shearN,c.tensionRatio,c.shearRatio,c.interactionRatio,c.ratio,c.staticArithmeticWithinResistance].join(','))));
 fs.writeFileSync(dir+'/checks.csv','foot,bolt,trial_grade,pressure_multiplier,tension_N,shear_N,T_ratio,V_ratio,interaction_ratio,governing_ratio,arithmetic_within_only\n'+rows.join('\n')+'\n');
 console.log(JSON.stringify({progress:r.progress,summary:r.summary},null,2));
}
