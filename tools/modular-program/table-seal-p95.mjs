import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {families,build as channel,box} from './table-channel-p94.mjs';
import {read,sha,axes} from './table-weld-p93.mjs';
import {loft,properties,swept} from './cap-geometry-p55.mjs';
import {subtractMany} from './convex-clip-p95.mjs';
export {families};export const out='output/table-seal-p95';
const volume=ss=>ss.reduce((s,f)=>s+properties(f).volumeMm3,0);
/** Exact design centerline: four straight lengths L/W and4 quarter circles R3.
 * Arc surface tessellation only, not polygonal CNC cutting instructions.
 */
export function baseLoop(L,W,width=3.4,z0=-1.1,z1=0,segments=16){
 const r=3,ri=r-width/2,ro=r+width/2;assert.ok(L>0&&W>0&&ri>0&&segments>=4);
 const solids=[box(0,L,-ro,-ri,z0,z1),box(0,L,W+ri,W+ro,z0,z1),box(-ro,-ri,0,W,z0,z1),box(L+ri,L+ro,0,W,z0,z1)];
 for(const [x,y,start]of [[0,0,Math.PI],[L,0,Math.PI*1.5],[L,W,0],[0,W,Math.PI*.5]])for(let i=0;i<segments;i++){
  const a=start+i*Math.PI/2/segments,b=start+(i+1)*Math.PI/2/segments,p=(rad,ang,z)=>[x+rad*Math.cos(ang),y+rad*Math.sin(ang),z],lower=[p(ro,a,z0),p(ro,b,z0),p(ri,b,z0),p(ri,a,z0)],upper=lower.map(([x,y])=>[x,y,z1]);solids.push(loft(lower,upper));
 }
 return {solids,exactCenterlineLengthMm:2*(L+W)+2*Math.PI*r,exactAreaMm2:2*(L+W)*width+Math.PI*(ro**2-ri**2),radiiMm:[ri,r,ro],maxArcSagMm:ro*(1-Math.cos(Math.PI/4/segments))};
}
export function compressionRange({freeMin=1.9,freeMax=2.1,grooveMin=1.05,grooveMax=1.15,contactGapMax=.1}={}){
 const min=1-(grooveMax+contactGapMax)/freeMin,max=1-grooveMin/freeMax;return {minRatio:min,maxRatio:max,geometryOnly:true,compressionForceN:null,supplierCompoundValidated:false};
}
export function junctionEnvelope({installedFootWidthMax=2.1,installedDepthMax=1.25,relativePositionError=.1,baseSealWidthMin=2.9}={}){
 const outerRequired=Math.hypot(installedDepthMax+relativePositionError,3+installedFootWidthMax/2+relativePositionError),outerAvailable=3+baseSealWidthMin/2;
 return {outerRequiredMm:outerRequired,outerAvailableMm:outerAvailable,marginMm:outerAvailable-outerRequired,withinProposedEnvelope:outerRequired<=outerAvailable,scope:'Plan footprint only at compressed T-contact; not adhesive or water-tightness proof.'};
}
export function baseCutPieces(L,W){
 const free=baseLoop(L,W,3,0,2),pieces=free.solids.slice(0,4).map((f,i)=>({tag:`SB-S${i+1}`,role:'STRAIGHT_STRIP',quantity:1,freeWidthMm:3,freeThicknessMm:2,freeSolids:[f]}));
 for(let i=0;i<4;i++)pieces.push({tag:`SB-C${i+1}`,role:'DIE_CUT_QUARTER_RING',quantity:1,freeWidthMm:3,freeThicknessMm:2,innerRadiusMm:1.5,outerRadiusMm:4.5,freeSolids:free.solids.slice(4+16*i,4+16*(i+1))});
 return pieces;
}
export function build(key){
 const c=channel(key),[L,W,H]=c.cavityMm,loop=baseLoop(L,W),parts=structuredClone(c.parts),cuts=[{parent:'M00',tag:'SG-BASE',cutters:loop.solids}],seals=[];
 const baseSeal=baseLoop(L,W,3,-1.1,0);seals.push({tag:'SEAL-BASE',owner:'M00',solids:baseSeal.solids,installedCompressedThicknessMm:1.1,freeThicknessMm:2,freeWidthMm:3});
 const verticals=[];
 for(const parent of ['M03','M04'])for(const [suffix,t]of [['SOUTH',-3],['NORTH',W+3]]){
  const fr=axes(parent,c.cavityMm),map=f=>f.map(face=>face.map(fr.toGlobal)),tag=`SG-${parent}-${suffix}`;
  cuts.push({parent,tag,cutters:[map(box(t-1.7,t+1.7,0,1.1,0,H))]});
  // Foot narrows3.0->2.0 over last5mm. The separate interval check includes
  // installed foot width2.1 max, joint depth1.25 max and relative offset0.1mm.
  const lower=[[t-1,0,0],[t+1,0,0],[t+1,1.1,0],[t-1,1.1,0]],upper=[[t-1.5,0,5],[t+1.5,0,5],[t+1.5,1.1,5],[t-1.5,1.1,5]];
  const s={tag:`SEAL-${parent}-${suffix}`,owner:parent,solids:[map(loft(lower,upper)),map(box(t-1.5,t+1.5,0,1.1,5,H))],installedCompressedThicknessMm:1.1,freeThicknessMm:2,freeWidthMm:3,footWidthMm:2,footTaperHeightMm:5,contactRequiresCompatibleJointBondAndLeakTest:true};
  seals.push(s);verticals.push({parent,tag,localCenterT:t,grooveWidthMm:3.4,grooveDepthMm:1.1,heightMm:H,sealTag:s.tag});
 }
 const materialChanges=[];
 for(const p of parts){const own=cuts.filter(g=>g.parent===p.id).flatMap(g=>g.cutters);if(!own.length)continue;const before=volume(p.solids);p.solids=subtractMany(p.solids,own);const after=volume(p.solids);materialChanges.push({parent:p.id,removedVolumeMm3:before-after,removedSteelKg:(before-after)*7850/1e9});}
 return {family:key,cavityMm:c.cavityMm,sourceCandidate:c,parts,cuts,seals,baseCutPieces:baseCutPieces(L,W),verticals,baseGroove:{widthMm:3.4,depthMm:1.1,centerRadiusMm:3,edgeRadiiMm:loop.radiiMm,exactAreaMm2:loop.exactAreaMm2,exactCenterlineLengthMm:loop.exactCenterlineLengthMm,maxArcSagMm:loop.maxArcSagMm,segmentsPerQuarter:16},materialChanges};
}
export function audit(c){
 const collisions=[];
 for(const cut of c.cuts)if(cut.cutters.some(f=>swept(f,c.sourceCandidate.concrete)))collisions.push(`${cut.tag}:CAVITY`);
 for(const seal of c.seals){if(seal.solids.some(f=>swept(f,c.sourceCandidate.concrete)))collisions.push(`${seal.tag}:CAVITY`);for(const p of c.parts)if(seal.solids.some(f=>p.solids.some(g=>swept(f,g))))collisions.push(`${seal.tag}:${p.id}`);}
 const volumeExpected=c.baseGroove.exactAreaMm2*c.baseGroove.depthMm,base=c.materialChanges.find(p=>p.parent==='M00'),volumeApprox=c.cuts[0].cutters.reduce((s,f)=>s+properties(f).volumeMm3,0);
 const verticalRemoved=c.materialChanges.filter(p=>p.parent!=='M00').reduce((s,p)=>s+p.removedVolumeMm3,0);
 return {initialCollisions:collisions,baseVolumeExpectedExactMm3:volumeExpected,baseVolumeApproxMm3:volumeApprox,baseRemovedMm3:base.removedVolumeMm3,baseRemovalVersusApproxErrorMm3:base.removedVolumeMm3-volumeApprox,arcTessellationVolumeErrorMm3:volumeApprox-volumeExpected,verticalRemovedMm3:verticalRemoved,verticalExpectedMm3:4*3.4*1.1*175,scope:'Installed compressed geometry and cut volume only. Rubber recovery, friction and leak performance are not capacity or performance checks.'};
}
export function removalAudit(c){
 const active=new Map(c.parts.map(p=>[p.id,{id:p.id,solids:[...p.solids,...c.sourceCandidate.welds.filter(w=>w.parent===p.id).flatMap(w=>w.nominalSolids),...c.seals.filter(s=>s.owner===p.id).flatMap(s=>s.solids)]}]));
 const steps=[];
 const move=(id,delta,remove,phase)=>{const p=active.get(id),obs=[{id:'CONCRETE',solids:[c.sourceCandidate.concrete]},...active.values()].filter(q=>q.id!==id),hits=obs.filter(q=>p.solids.some(a=>q.solids.some(b=>swept(a,b,delta)))).map(q=>q.id);
  steps.push({id,translationMm:delta,phase,removeAfterStep:remove,hits});if(remove)active.delete(id);else p.solids=p.solids.map(f=>f.map(face=>face.map(v=>v.map((x,i)=>x+delta[i]))));};
 for(const old of c.sourceCandidate.sourceModel.audit.steps.filter(s=>!/^M0/.test(s.id)))move(old.id,old.translationMm,true,'REMOVE_FASTENER_WITH_EXTERNAL_PANEL_SUPPORT');
 for(const id of ['M03','M04','M01','M02']){const d={M03:[-1,0],M04:[1,0],M01:[0,-1],M02:[0,1]}[id];move(id,[5*d[0],5*d[1],2],false,'CONTROLLED_OUTWARD_AND_UPWARD_SEAL_RELEASE');move(id,[295*d[0],295*d[1],0],true,'MAIN_TRANSLATION_AFTER_CLEARANCE');}
 return {steps,sealStateInSweptCheck:'INSTALLED_COMPRESSED_NOMINAL',mainTravelFreeRecoveryCheck:{commandedRaiseMm:2,raiseToleranceProposedMm:.25,maxRecoveredBaseProtrusionMm:2.1-1.05,minClearanceMm:2-.25-(2.1-1.05),endOutwardReleaseMm:5,maxVerticalSealRecoveryMm:2.1-1.05,minNormalGapAfterReleaseMm:5-.25-(2.1-1.05)},limits:['First release can include intended elastic seal contact; rigid SAT is not a rubber recovery or friction solver.','Temporary support/handling tool capacity and actual lift control are not designed by this movement record.','T-junction bond integrity and prototype leak/release tests still required.']};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(out,{recursive:true});const records=[];
 for(const family of families){const c=build(family),checks=audit(c),motion=removalAudit(c);assert.deepEqual(checks.initialCollisions,[]);assert.ok(Math.abs(checks.baseRemovalVersusApproxErrorMm3)<.01);assert.ok(Math.abs(checks.verticalRemovedMm3-checks.verticalExpectedMm3)<.01);assert.ok(motion.steps.every(s=>!s.hits.length));
  const r={revision:'P95',family,source:{path:`output/table-channel-p94/${family}.json`,sha256:sha(`output/table-channel-p94/${family}.json`)},cavityMm:c.cavityMm,baseGroove:c.baseGroove,verticals:c.verticals,cutters:c.cuts,seals:c.seals,baseCutPieces:c.baseCutPieces,sealCounts:{cutPieces:12,baseStraight:4,baseDieCutCorners:4,vertical:4,assembledItems:5,baseLoopSplices:8},junctionEnvelope:junctionEnvelope(),materialChanges:c.materialChanges,compression:compressionRange(),audit:checks,motion,status:'SEAL_LAYOUT_CANDIDATE',stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
  fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(r,null,2));records.push({family,file:`${family}.json`,sha256:sha(`${out}/${family}.json`),...checks});console.log(JSON.stringify({family,checks}));}
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P95',records,status:'SEAL_LAYOUT_CANDIDATE',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
}
