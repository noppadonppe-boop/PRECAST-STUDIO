import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {families,build as sealed,removalAudit} from './table-seal-p95.mjs';
import {read,sha,axes,sources} from './table-weld-p93.mjs';
import {box} from './table-channel-p94.mjs';
import {rect,drilled,cellFaces} from './prism-tools-p54.mjs';
import {properties,swept,loft} from './cap-geometry-p55.mjs';
import {lineGroup,add,scale,cross} from './weld-group-p93.mjs';
import {simpleBeam,rhs} from './elastic-beam-p48.mjs';
export {families};
export const out='output/table-lock-base-p97';
const density=7850,g=9.80665;
const mapped=(f,fn)=>f.map(face=>face.map(fn));
const bounds=f=>[0,1,2].map(i=>[Math.min(...f.flat().map(v=>v[i])),Math.max(...f.flat().map(v=>v[i]))]);
export function mass(solids){
 const rows=solids.map(properties),v=rows.reduce((s,r)=>s+r.volumeMm3,0);assert.ok(v>0);
 return {volumeMm3:v,nominalSteelKg:v*density/1e9,cgMm:[0,1,2].map(i=>rows.reduce((s,r)=>s+r.volumeMm3*r.cgMm[i],0)/v)};
}
export function tieSection(){
 const thickness=6,area=2*90*6+2*88*6;
 const Ih=2*6*90**3/12+2*(88*6**3/12+88*6*32**2);
 const Iv=2*(90*6**3/12+90*6*47**2)+2*6*88**3/12;
 const Am=64*94,J=4*Am**2/(2*(64+94)/thickness);
 return {areaMm2:area,horizontalBendingI_mm4:Ih,verticalBendingI_mm4:Iv,horizontalZ_mm3:Ih/45,verticalZ_mm3:Iv/50,medianCellAreaMm2:Am,thinWallJ_mm4:J,
  torsionModel:'Single cell Bredt approximation; median64x94, wall6; projecting flanges not credited to J. Not local warping/distortion/end restraint verification.',
  reference:{url:'https://ocw.mit.edu/courses/16-20-structural-mechanics-fall-2002/a58ea050460c29f7389ff55e084521ed_ho3.pdf',pdfPages:[1,3],printedPages:['3-1','3-3'],checked:'2026-09-18'}};
}
export function fixedTwist({lengthMm,J_mm4,G=200000/2.6,torques}){
 assert.ok(lengthMm>0&&J_mm4>0&&G>0&&torques.every(p=>p.xMm>=0&&p.xMm<=lengthMm&&Number.isFinite(p.torqueNmm)));
 const total=torques.reduce((s,p)=>s+p.torqueNmm,0),R0=torques.reduce((s,p)=>s+p.torqueNmm*(lengthMm-p.xMm)/lengthMm,0),R1=total-R0;
 const xs=[...new Set([0,lengthMm,...torques.map(p=>p.xMm)])].sort((a,b)=>a-b);
 const rotation=x=>(R0*x-torques.reduce((s,p)=>s+p.torqueNmm*Math.max(0,x-p.xMm),0))/(G*J_mm4);
 const points=xs.map(x=>({xMm:x,rotationRad:rotation(x)})),internal=xs.slice(0,-1).map((x,i)=>({fromMm:x,toMm:xs[i+1],torqueNmm:R0-torques.filter(p=>p.xMm<=x).reduce((s,p)=>s+p.torqueNmm,0)}));
 assert.ok(Math.abs(rotation(lengthMm))<1e-10);
 return {lengthMm,G,J_mm4,reactionTorquesNmm:[R0,R1],points,internal,maxAbsTorqueNmm:Math.max(...internal.map(p=>Math.abs(p.torqueNmm))),maxAbsRotationRad:Math.max(...points.map(p=>Math.abs(p.rotationRad))),torqueResidualNmm:R0+R1-total,endRotationRad:[rotation(0),rotation(lengthMm)],scope:'Both ends held at zero twist, elastic uniform member; actual rail rotation and joint flexibility excluded.'};
}
/** Draw nominal equal-leg fillets; root positions, not a deposited-bead guarantee. */
function weld(tag,a,b,n1,n2,fn,role,station=null){
 const leg=3*Math.sqrt(2),tri=p=>[p,add(p,scale(n1,leg)),add(p,scale(n2,leg))],physicalLengthMm=Math.hypot(...a.map((x,i)=>x-b[i]));
 assert.ok(physicalLengthMm-6>=30);
 const d=b.map((x,i)=>(x-a[i])/physicalLengthMm);
 return {tag,role,station,parent:'M00',throatMm:3,physicalLengthMm,effectiveLengthMm:physicalLengthMm-6,root:[fn(a),fn(b)],effectiveRoot:[fn(add(a,scale(d,3))),fn(add(b,scale(d,-3)))],faces:mapped(loft(tri(a),tri(b)),fn)};
}
export function build(family,{audit=true}={}){
 const c=sealed(family),old=read(`${'output/table-seal-backer-p96'}/${family}.json`),[L,W,H]=c.cavityMm;
 const bed=c.parts.find(p=>p.id==='M00');bed.solids.push(...old.bars.map(b=>b.faces),...old.welds.map(w=>w.faces));
 const baseBefore=mass(bed.solids),cuts=[],welds=[],replaced=[],stations=c.sourceCandidate.sourceModel.lockSchedule;
 const addCut=(tag,faces,dimensions,role,station=null)=>{const solids=Array.isArray(faces[0][0][0])?faces:[faces];cuts.push({tag,parent:'M00',role,station,quantity:1,finishedDimensionsMm:dimensions,solids,...mass(solids)});bed.solids.push(...solids);};
 for(const s of stations){
  const a=axes(s.parent,c.cavityMm),along=['M01','M02'].includes(s.parent)?s.x:s.y;
  const fn=v=>a.toGlobal(add(v,[along,0,0])),local=v=>[a.t[0]*(v[0]-a.origin[0])+a.t[1]*(v[1]-a.origin[1])-along,a.u[0]*(v[0]-a.origin[0])+a.u[1]*(v[1]-a.origin[1]),v[2]];
  // Replace only the old70x70x14 pad, including its source annular hole cells.
  const removed=[];bed.solids=bed.solids.filter(f=>{const b=bounds(mapped(f,local)),inside=Math.abs(b[2][0]+20)<1e-6&&Math.abs(b[2][1]+6)<1e-6&&b[0][0]>=-35-1e-6&&b[0][1]<=35+1e-6&&b[1][0]>=45-1e-6&&b[1][1]<=115+1e-6;if(inside)removed.push(f);return !inside;});
  assert.equal(removed.length,36,s.id+' old pad cells');replaced.push({station:s.id,...mass(removed)});
  addCut(`${s.id}-PAD90`,drilled(rect(-45,45,45,115,-20,-6),0,80).map(f=>mapped(cellFaces(f),fn)),[90,70,14],'BOLT_BACKING',s.id);
  const side=['M01','M02'].includes(s.parent),zBottom=side?-96:-160,uStart=side?10:45;
  for(const [suffix,t0,t1]of [['L',-34,-28],['R',28,34]]){
   addCut(`${s.id}-CHEEK-${suffix}`,mapped(box(t0,t1,uStart,115,zBottom,-20),fn),[115-uStart,-20-zBottom,6],'PEDESTAL_CHEEK',s.id);
   for(const [edge,t,sign]of [['I',suffix==='L'?t1:t0,suffix==='L'?1:-1],['O',suffix==='L'?t0:t1,suffix==='L'?-1:1]]){
    welds.push(weld(`${s.id}-${suffix}-TOP-${edge}`,[t,50,-20],[t,110,-20],[sign,0,0],[0,0,-1],fn,'PAD_CHEEK',s.id));
    welds.push(weld(`${s.id}-${suffix}-BASE-${edge}`,[t,side?15:50,zBottom],[t,side?55:110,zBottom],[sign,0,0],[0,0,1],fn,'CHEEK_BASE',s.id));
   }
  }
  if(side){
   addCut(`${s.id}-SHOE`,mapped(box(-45,45,-40,60,-106,-96),fn),[90,100,10],'RAIL_SHOE',s.id);
   for(const [suffix,t,sign]of [['L',-45,-1],['R',45,1]])welds.push(weld(`${s.id}-SHOE-${suffix}`,[t,-25,-106],[t,25,-106],[sign,0,0],[0,0,1],fn,'SHOE_RAIL',s.id));
  }
 }
 // Closed built-up end ties carry the pressure eccentricity as torsion.
 // Projecting flanges permit accessible external fillets on all four wall seams.
 for(const parent of ['M03','M04']){
  const fr=axes(parent,c.cavityMm),fn=fr.toGlobal;
  for(const [tag,u0,u1,z0,z1,dim]of [['TOP',35,125,-166,-160,[W-100,90,6]],['BOT',35,125,-260,-254,[W-100,90,6]],['WIN',45,51,-254,-166,[W-100,88,6]],['WOUT',109,115,-254,-166,[W-100,88,6]]])addCut(`${parent}-TIE-${tag}`,mapped(box(50,W-50,u0,u1,z0,z1),fn),dim,'END_TIE');
  for(const [suffix,u,du]of [['IN',45,-1],['OUT',115,1]])for(const [end,z,dz]of [['UP',-166,-1],['DOWN',-254,1]])welds.push(weld(`${parent}-TIE-${suffix}-${end}`,[55,u,z],[W-55,u,z],[0,du,0],[0,0,dz],fn,'TIE_WEB_FLANGE'));
  for(const [end,t,dt]of [['S',50,1],['N',W-50,-1]]){
   for(const [tag,u,du]of [['WIN',45,-1],['WOUT',115,1]])welds.push(weld(`${parent}-END-${end}-${tag}`,[t,u,-248],[t,u,-172],[dt,0,0],[0,du,0],fn,'TIE_MAIN_RAIL'));
   for(const [tag,z,dz]of [['TOP',-160,1],['BOT',-260,-1]])welds.push(weld(`${parent}-END-${end}-${tag}`,[t,40,z],[t,120,z],[dt,0,0],[0,0,dz],fn,'TIE_MAIN_RAIL'));
  }
 }
 const collisions=[];
 if(audit){
  for(const cut of cuts)for(const f of cut.solids)for(const p of c.parts)for(const q of p.solids)if(q!==f&&swept(f,q))collisions.push(`${cut.tag}:${p.id}`);
  for(const w of welds)for(const p of c.parts)if(p.solids.some(f=>swept(w.faces,f)))collisions.push(`${w.tag}:${p.id}`);
  const older=[...c.sourceCandidate.welds.flatMap(w=>w.nominalSolids),...c.seals.flatMap(s=>s.solids)];
  for(const obj of [...cuts.flatMap(p=>p.solids.map(f=>({tag:p.tag,faces:f}))),...welds])if(older.some(f=>swept(obj.faces,f)))collisions.push(`${obj.tag}:PRIOR_WELD_OR_SEAL`);
  for(let i=0;i<welds.length;i++)for(let j=0;j<i;j++)if(swept(welds[i].faces,welds[j].faces))collisions.push(`${welds[i].tag}:${welds[j].tag}`);
  assert.deepEqual(collisions,[],family);
 }
 bed.solids.push(...welds.map(w=>w.faces));
 const motion=audit?removalAudit(c):null;if(motion)assert.ok(motion.steps.every(s=>!s.hits.length),JSON.stringify(motion.steps.filter(s=>s.hits.length)));
 const assemblies=c.parts.filter(p=>/^M0/.test(p.id)).map(p=>({id:p.id,...mass([...p.solids,...c.sourceCandidate.welds.filter(w=>w.parent===p.id).flatMap(w=>w.nominalSolids)])}));
 const allSteel=mass([...c.parts.flatMap(p=>p.solids),...c.sourceCandidate.welds.flatMap(w=>w.nominalSolids)]);
 return {family,cavityMm:c.cavityMm,c,cuts,welds,replaced,collisions,motion,assemblies,allSteel,baseBefore,addedNetNominalSteelKg:mass(bed.solids).nominalSteelKg-baseBefore.nominalSteelKg};
}
export function liftSupportCase({L,W,cells,xSupports,allowance=1.2,amplification=1.3}){
 const [a,b]=xSupports;assert.ok(a>0&&a<b&&b<L&&allowance>=1&&amplification>=1);
 const section=rhs(200,100,6),parts=cells.map(f=>mass([f])),kg=parts.reduce((s,p)=>s+p.nominalSteelKg,0),cg=[0,1,2].map(i=>parts.reduce((s,p)=>s+p.nominalSteelKg*p.cgMm[i],0)/kg),rails=[];
 for(const j of [0,1]){
  const points=parts.map(p=>({x:p.cgMm[0]-a,P:p.nominalSteelKg*g*allowance*amplification*(j===0?1-p.cgMm[1]/W:p.cgMm[1]/W)}));
  const run=simpleBeam({L:b-a,min:-120-a,max:L+120-a,I:section.I,points,samples:4000});
  rails.push({yMm:j*W,...run,elasticStressMPa:run.maxAbsMomentNmm/section.Z});
 }
 const reactions=rails.flatMap(r=>r.reactionsN.map((N,i)=>({pointMm:[xSupports[i],r.yMm,-306],forceN:N}))),weight=kg*g*allowance*amplification;
 const residual={forceN:reactions.reduce((s,p)=>s+p.forceN,0)-weight,xMomentNmm:reactions.reduce((s,p)=>s+p.forceN*p.pointMm[0],0)-weight*cg[0],yMomentNmm:reactions.reduce((s,p)=>s+p.forceN*p.pointMm[1],0)-weight*cg[1]};
 assert.ok(Math.abs(residual.forceN)<1e-6&&Math.abs(residual.xMomentNmm)<.01&&Math.abs(residual.yMomentNmm)<.01);
 assert.ok(reactions.every(r=>r.forceN>0));
 return {nominalSteelKg:kg,cgMm:cg,massAllowanceFactor:allowance,handlingAmplification:amplification,designVerticalN:weight,xSupportsMm:xSupports,railNominalSharpCornerSection:section,rails,reactions,equilibrium:residual,
  scope:'M00 bare bed only, no shutters, removable bolts or concrete. Proposed under-bed lifting cradle with equalised vertical reactions. Not four independent sling reactions, cradle design, rigging WLL or lifting approval. Cell load allocation preserves moments but is not a3D frame/local-wall solution.'};
}
export function calculate(family){
 const b=build(family),[L,W,H]=b.cavityMm,press=read(`output/table-channel-p94/${family}.json`),demand=[],endTieCases=[],section=tieSection();
 for(const s of b.c.sourceCandidate.sourceModel.lockSchedule){
  const f=axes(s.parent,b.cavityMm),ts=['M01','M02'].includes(s.parent)?s.x:s.y;
  const groups=['PAD_CHEEK','CHEEK_BASE',...(['M01','M02'].includes(s.parent)?['SHOE_RAIL']:[])];
  const panel=press.panels.find(p=>p.parent===s.parent),at=p=>p.reactions.find(r=>Math.abs(r.xMm-ts)<1e-6).forceN;
  for(const run of panel.runs)for(const lambda of [1,1.5])for(const role of groups){
   const F=at(run)*lambda,ws=b.welds.filter(w=>w.station===s.id&&w.role===role),r=lineGroup({segments:ws.map(w=>w.effectiveRoot),forceN:scale(f.u,F),originMm:f.toGlobal([ts,0,H/3]),throatMm:3});
   assert.ok(r.forceResidualN.every(x=>Math.abs(x)<1e-7)&&r.momentResidualNmm.every(x=>Math.abs(x)<1e-5));
   assert.ok(run.supportKNmm===null||run.supportKNmm>0);
   demand.push({station:s.id,parent:s.parent,role,sourceSupportK:run.supportKNmm,pressureMultiplier:lambda,netPressureN:F,result:r,capacityRatio:null});
  }
 }
 for(const parent of ['M03','M04']){
  const fr=axes(parent,b.cavityMm),p=press.panels.find(p=>p.parent===parent),arm=H/3+210;
  for(const run of p.runs)for(const lambda of [1,1.5]){
   const points=run.reactions.map(r=>({x:r.xMm-50,P:r.forceN*lambda}));
   const beam=simpleBeam({L:W-100,I:section.horizontalBendingI_mm4,points,samples:4000});
   const torsion=fixedTwist({lengthMm:W-100,J_mm4:section.thinWallJ_mm4,torques:points.map(p=>({xMm:p.x,torqueNmm:p.P*arm}))});
   const endWelds=['S','N'].map((side,i)=>{
    const group=b.welds.filter(w=>w.tag.startsWith(`${parent}-END-${side}-`));
    return {side,result:lineGroup({segments:group.map(w=>w.effectiveRoot),forceN:scale(fr.u,beam.reactionsN[i]),momentAtOriginNmm:scale(cross([0,0,1],fr.u),torsion.reactionTorquesNmm[i]),originMm:fr.toGlobal([i?W-50:50,80,-210]),throatMm:3}),capacityRatio:null};
   });
   endTieCases.push({parent,sourceSupportK:run.supportKNmm,pressureMultiplier:lambda,pressureArmMm:arm,beam,torsion,horizontalElasticStressMPa:beam.maxAbsMomentNmm/section.horizontalZ_mm3,torsionWallShearMPa:torsion.maxAbsTorqueNmm/(2*section.medianCellAreaMm2*6),torsionFlowNmm:torsion.maxAbsTorqueNmm/(2*section.medianCellAreaMm2),pressureHeightMovementSumMm:beam.maxAbsDeflectionMm+arm*torsion.maxAbsRotationRad,endWelds,scope:'Assigned pressure wrench only; maxima summed conservatively. No actual bed/contact stiffness or vertical/selfweight/handling combination.'});
  }
 }
 const original=read(sources(family).original),n=Math.round(L/original.ribPitchMm),used=b.c.sourceCandidate.sourceModel.lockSchedule.filter(s=>s.parent==='M01').map(s=>s.x);
 const possible=Array.from({length:n},(_,i)=>(i+.5)*original.ribPitchMm).filter(x=>used.every(v=>Math.abs(v-x)>100));
 assert.ok(possible.length>=2);
 const a=possible.reduce((a,v)=>Math.abs(v-.2*L)<Math.abs(a-.2*L)?v:a),z=possible.reduce((a,v)=>Math.abs(v-.8*L)<Math.abs(a-.8*L)?v:a);
 const bed=b.c.parts.find(p=>p.id==='M00'),lifting=liftSupportCase({L,W,cells:bed.solids,xSupports:[a,z]});
 return {revision:'P97',family,cavityMm:b.cavityMm,sourceSetups:press.sourceSetups,status:'BASE_LOADPATH_CANDIDATE',sources:[`output/table-channel-p94/${family}.json`,`output/table-seal-p95/${family}.json`,`output/table-seal-backer-p96/${family}.json`,...Object.values(sources(family))].map(path=>({path,sha256:sha(path)})),
  cuts:b.cuts,welds:b.welds,replaced:b.replaced,geometry:{initialCollisions:b.collisions,motion:b.motion,scope:'Nominal stock and weld envelopes, complete previous44-step demould path. No fabrication tolerances, deformed contact or tool-arm/access certification.'},
  assemblies:b.assemblies,allModelledSteel:b.allSteel,addedNetNominalSteelKg:b.addedNetNominalSteelKg,demand,endTieSection:section,endTieCases,lifting,
  massLimits:['RHS remains sharp-corner nominal. Seals/paint/unmodelled bed joints/rigging are excluded; gross cylindrical bolt models are not certified hardware mass.','M00 cradle study uses20% distributed mass reserve and1.30 handling multiplier as proposals, not code-prescribed or measured factors. Weigh completed bed and update load distribution before equipment selection.'],
  loadpathLimits:['Net pressure wrench only; whole groups do not resolve bolt tension/prying/preload/seal action pairs, nor prove the minimum stiffness of a support.','M16 in18mm holes can slip before bearing. Existing supportK cases remain sensitivity values, not actual stiffness of this pedestal.','Local plate/RHS-wall/stability/end-tie and weld code resistance remain to be closed; no whole connection PASS inferred from low elastic demand.','Cradle load points are required vertical support positions, not new lifting eyes. Direct slings around rails risk hitting the casting bed; no unverified sling route is shown.'],
  stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(out,{recursive:true});const records=[];
 for(const family of families){const r=calculate(family);fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(r,null,2));records.push({family,sourceSetups:r.sourceSetups,file:`${family}.json`,sha256:sha(`${out}/${family}.json`),cutPieces:r.cuts.length,weldRoutes:r.welds.length,paths:r.geometry.motion.steps.length,bedNominalKg:r.assemblies[0].nominalSteelKg,addedNetNominalSteelKg:r.addedNetNominalSteelKg});console.log(JSON.stringify(records.at(-1)));}
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P97',records,status:'BASE_LOADPATH_CANDIDATE',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
}
