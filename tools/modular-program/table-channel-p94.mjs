import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {families,read,sha,sources,axes,makeCandidate as previousCandidate} from './table-weld-p93.mjs';
import {loft,oriented,properties,swept} from './cap-geometry-p55.mjs';
import {add,scale,lineGroup,resistanceBound} from './weld-group-p93.mjs';
import {continuousBeam} from './continuous-beam-p49.mjs';
export {families};
export const out='output/table-channel-p94';
const bbox=f=>[0,1,2].map(i=>[Math.min(...f.flat().map(v=>v[i])),Math.max(...f.flat().map(v=>v[i]))]);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const box=(t0,t1,u0,u1,z0,z1)=>loft([[t0,u0,z0],[t1,u0,z0],[t1,u1,z0],[t0,u1,z0]],[[t0,u0,z1],[t1,u0,z1],[t1,u1,z1],[t0,u1,z1]]);
const mapped=(f,fn)=>f.map(face=>face.map(fn));
export function seam(a,b,uDirection,zDirection,leg=3*Math.sqrt(2)){
 const tri=p=>[p,add(p,[0,uDirection*leg,0]),add(p,[0,0,zDirection*leg])];return loft(tri(a),tri(b));
}
export function ring(z,down=false,throat=3){
 const roots=[[-3,17.5,z],[3,17.5,z],[3,49.5,z],[-3,49.5,z]],normals=[[0,-1,0],[1,0,0],[0,1,0],[-1,0,0]],vertical=[0,0,down?-1:1],leg=throat*Math.sqrt(2),solids=[];
 for(let i=0;i<4;i++){
  const a=roots[i],b=roots[(i+1)%4],n=normals[i],tri=p=>[p,add(p,scale(n,leg)),add(p,scale(vertical,leg))];solids.push(loft(tri(a),tri(b)));
  const p=roots[i],n0=normals[(i+3)%4],n1=n,apex=add(p,scale(vertical,leg));
  for(let j=0;j<8;j++){const v=f=>add(p,scale(add(scale(n0,Math.cos(f*Math.PI/2)),scale(n1,Math.sin(f*Math.PI/2))),leg)),a0=v(j/8),b0=v((j+1)/8);solids.push(oriented([[p,b0,a0],[p,a0,apex],[a0,b0,apex],[b0,p,apex]]));}
 }
 return {roots:roots.map((p,i)=>[p,roots[(i+1)%4]]),solids,leg};
}
export function toleranceStack({skinBackMax=6.25,webMin=17.25,webMax=49.75,flangeOuterMin=55.75,legMax=4.75}={}){
 const result={betweenWeldsMm:webMin-legMax-(skinBackMax+legMax),outerLandingMm:flangeOuterMin-(webMax+legMax),webSkinGapMm:webMin-skinBackMax};
 return {...result,withinProposedEnvelope:Object.values(result).every(v=>v>=1),scope:'One-dimensional joint envelope only; as-welded inspection required. Not all mould tolerances.'};
}
export function section(){
 const rectangles=[{tag:'SKIN',u0:0,u1:6,h:175},{tag:'CH-FL-LOW',u0:6,u1:56,h:6},{tag:'CH-FL-UP',u0:6,u1:56,h:6},{tag:'CH-BACK',u0:50,u1:56,h:38}];
 const areaMm2=rectangles.reduce((s,r)=>s+(r.u1-r.u0)*r.h,0),centroidOutwardMm=rectangles.reduce((s,r)=>s+(r.u1-r.u0)*r.h*(r.u0+r.u1)/2,0)/areaMm2;
 const I_mm4=rectangles.reduce((s,r)=>{const w=r.u1-r.u0,A=w*r.h;return s+r.h*w**3/12+A*((r.u0+r.u1)/2-centroidOutwardMm)**2;},0);
 return {rectangles,areaMm2,centroidOutwardMm,I_mm4,Z_mm3:I_mm4/Math.max(centroidOutwardMm,56-centroidOutwardMm),QskinMm3:1050*(centroidOutwardMm-3),QbackMm3:228*(53-centroidOutwardMm),basis:'Full composite skin and three PL6 plates, nominal; weld volume excluded. Not measured stiffness.'};
}
export function build(key){
 const old=previousCandidate(key),{sourceModel:m}=old;const parts=structuredClone(old.parts),welds=[],cutParts=[],[L,W]=m.cavityMm;
 for(const parent of ['M01','M02','M03','M04']){
  const fr=axes(parent,m.cavityMm),isX=['M01','M02'].includes(parent),a0=isX?0:-6,b0=isX?L:W+6,p=parts.find(p=>p.id===parent),toLocal=v=>[fr.t[0]*(v[0]-fr.origin[0])+fr.t[1]*(v[1]-fr.origin[1]),fr.u[0]*(v[0]-fr.origin[0])+fr.u[1]*(v[1]-fr.origin[1]),v[2]];
  const before=p.solids.length; p.solids=p.solids.filter(f=>{const b=bbox(mapped(f,toLocal));return !(b[0][0]===a0&&b[0][1]===b0&&b[1][0]>=6&&b[1][1]<=56&&b[2][0]>=60&&b[2][1]<=110);});
  assert.equal(before-p.solids.length,4,`${key}/${parent} requires exact four source RHS walls`);
  for(const [tag,u0,u1,z0,z1] of [['CH-FL-LOW',6,56,60,66],['CH-FL-UP',6,56,104,110],['CH-BACK',50,56,66,104]]){
   const faces=mapped(box(a0,b0,u0,u1,z0,z1),fr.toGlobal);p.solids.push(faces);cutParts.push({tag:`${parent}-${tag}`,parent,quantity:1,material:'S235JR proposed PL6',finishedDimensionsMm:tag==='CH-BACK'?[b0-a0,38,6]:[b0-a0,50,6],faces,properties:properties(faces)});
  }
  for(const [tag,u,z,du,dz]of [['WS-LOWER',6,60,1,-1],['WS-UPPER',6,110,1,1],['WC-LOWER',50,66,-1,1],['WC-UPPER',50,104,-1,-1]]){
   welds.push({tag:`${parent}-${tag}`,parent,role:tag.startsWith('WS')?'SKIN_CHANNEL':'CHANNEL_BACK_FLANGE',throatMm:3,legNominalMm:3*Math.sqrt(2),legMaxProposedMm:4.75,effectiveLengthMm:b0-a0-6,rootSegmentsMm:[[fr.toGlobal([a0,u,z]),fr.toGlobal([b0,u,z])]],nominalSolids:[mapped(seam([a0,u,z],[b0,u,z],du,dz),fr.toGlobal)],access:tag.startsWith('WC')?'Weld and gauge in open U before attaching skin':'External weld after U positioned on skin',endDetail:'Continuous seam;6mm effective length deduction. No strength credit at run starts/ends. Fit-up and termination per qualified WPS.'});
  }
  for(const station of m.lockSchedule.filter(s=>s.parent===parent)){
   const along=isX?station.x:station.y,fn=v=>fr.toGlobal(add(v,[along,0,0])),oldBox=bbox(mapped(box(-3,3,16,50,12,60),fn)),i=p.solids.findIndex(f=>eq(bbox(f),oldBox));assert.ok(i>=0);
   const faces=mapped(box(-3,3,17.5,49.5,12,60),fn);p.solids[i]=faces;cutParts.push({tag:`${station.id}-WEB`,parent,quantity:1,material:'S235JR proposed PL6',finishedDimensionsMm:[32,48,6],faces,properties:properties(faces)});
   for(const [tag,z,down]of [['WF',12,false],['WR',60,true]]){const w=ring(z,down);welds.push({tag:`${station.id}-${tag}`,parent,station:station.id,role:tag==='WF'?'WEB_FOOT':'WEB_CHANNEL',throatMm:3,legNominalMm:w.leg,legMaxProposedMm:4.75,effectiveLengthMm:76,closedRoot:true,rootSegmentsMm:w.roots.map(s=>s.map(fn)),nominalSolids:w.solids.map(f=>mapped(f,fn))});}
  }
 }
 return {family:key,cavityMm:m.cavityMm,concrete:old.concrete,parts,welds,cutParts,sourceModel:m};
}
export function geometryAudit(c){
 const initial=[],beads=c.welds.flatMap(w=>w.nominalSolids.map(f=>({id:w.tag,parent:w.parent,faces:f}))),all=c.parts.map(p=>({...p,solids:[...p.solids,...beads.filter(b=>b.parent===p.id).map(b=>b.faces)]}));
 for(const b of beads){if(swept(b.faces,c.concrete))initial.push(`${b.id}:CONCRETE`);for(const p of c.parts)if(p.solids.some(f=>swept(b.faces,f)))initial.push(`${b.id}:${p.id}`);}
 // Physical cut plates must not overlap each other or remaining parent stock.
 for(const p of c.cutParts){const owner=c.parts.find(x=>x.id===p.parent);for(const f of owner.solids)if(f!==p.faces&&swept(p.faces,f))initial.push(`${p.tag}:PARENT_STOCK`);}
 for(let i=0;i<all.length;i++)for(let j=0;j<i;j++)if(all[i].solids.some(a=>all[j].solids.some(b=>swept(a,b))))initial.push(`${all[i].id}:${all[j].id}`);
 const active=new Map(all.map(p=>[p.id,p])),steps=[];
 for(const step of c.sourceModel.audit.steps){const p=active.get(step.id),obstacles=[{id:'CONCRETE',solids:[c.concrete]},...active.values()].filter(q=>q.id!==p.id),hits=obstacles.filter(q=>p.solids.some(a=>q.solids.some(b=>swept(a,b,step.translationMm)))).map(q=>q.id);steps.push({...step,hits});active.delete(step.id);}
 return {initialCollisions:initial,continuousSteps:steps,scope:'Nominal complete translational source sequence with all source hardware and new parts/welds; no rotation, tolerances, supporting-equipment or capacity assertion.'};
}
function maxShear(b){return Math.max(...[0,b.lengthMm,...b.reactions.map(r=>r.xMm)].flatMap(x=>[false,true].map(after=>Math.abs(b.lineLoadNmm*x-b.reactions.filter(r=>after?r.xMm<=x:r.xMm<x).reduce((s,r)=>s+r.forceN,0)))));}
export function calculate(key){
 const c=build(key),sec=section(),cap=resistanceBound(),q=25*175**2/2/1e6,panels=[],cases=[],seams=[],old=read(`${'output/table-weld-p93'}/${key}.json`);
 for(const parent of ['M01','M02','M03','M04']){
  const side=['M01','M02'].includes(parent),length=c.cavityMm[side?0:1],locks=c.sourceModel.lockSchedule.filter(p=>p.parent===parent).sort((a,b)=>side?a.x-b.x:a.y-b.y),supports=locks.map(p=>side?p.x:p.y),runs=[];
  for(const supportK of [null,1000,100]){
   const beam=continuousBeam({length,supports,I:sec.I_mm4,q,supportK}),fine=continuousBeam({length,supports,I:sec.I_mm4,q,supportK,subdivisions:4});
   assert.ok(Math.abs(beam.forceResidualN)<1e-6&&Math.abs(beam.momentResidualNmm)<.001);
   const convergence={deflectionDifferenceMm:Math.abs(beam.maxDeflectionMm-fine.maxDeflectionMm),reactionDifferenceN:Math.max(...beam.reactions.map((r,i)=>Math.abs(r.forceN-fine.reactions[i].forceN)))};
   assert.ok(convergence.deflectionDifferenceMm<1e-4&&convergence.reactionDifferenceN<1e-5);
   const {values,...compact}=beam; runs.push({...compact,convergence,elasticStressMPa:beam.maxMomentNmm/sec.Z_mm3});
   for(const lambda of [1,1.5]){
    const endFactor=length/(length-6),Q=sec.QskinMm3,V=maxShear(beam),ecc=175/3-85,upper=q/2+q*ecc/50,lower=q/2-q*ecc/50;
    const wsStress=Math.hypot(Math.max(Math.abs(upper),Math.abs(lower)),V*Q/sec.I_mm4/2)*lambda*endFactor/3;
    // WC is an assigned pressure-only transfer case, NOT a proven shell-force bound.
    // Assign 2q to each seam plus VQback/I without sharing; local distortion is separate.
    const wcStress=Math.hypot(2*q,V*sec.QbackMm3/sec.I_mm4)*lambda*endFactor/3;
    seams.push({parent,supportK,pressureMultiplier:lambda,wsStressMPa:wsStress,wcStressMPa:wcStress,wsRatio:wsStress/cap.resultantBoundMPa,wcRatio:wcStress/cap.resultantBoundMPa,basis:'WS:q/couple + halfVQskin/I; WC:2q and fullVQback/I assigned to each seam; not local shell solution or proven upper bound.'});
    for(let i=0;i<locks.length;i++)for(const [role,z,down]of [['WF',12,false],['WR',60,true]]){
     const r=beam.reactions[i];assert.ok(r.forceN>0);const w=ring(z,down),result=lineGroup({segments:w.roots,forceN:[0,r.forceN*lambda,0],originMm:[0,0,175/3],throatMm:3});
     cases.push({station:locks[i].id,parent,role,supportK,pressureMultiplier:lambda,reactionN:r.forceN,result,ratio:result.worst.stressResultantMPa/cap.resultantBoundMPa});
    }
   }
  }
  panels.push({parent,spanMm:length,runs});
 }
 const audit=geometryAudit(c);assert.deepEqual(audit.initialCollisions,[]);assert.ok(audit.continuousSteps.every(s=>s.hits.length===0));
 const tolerance=toleranceStack();assert.ok(tolerance.withinProposedEnvelope);
 return {revision:'P94',family:key,sourceSetups:old.sourceSetups,cavityMm:c.cavityMm,status:'BUILT_UP_CHANNEL_CANDIDATE',sources:[...Object.values(sources(key)),`output/table-weld-p93/${key}.json`].map(path=>({path,sha256:sha(path)})),section:sec,capacity:cap,parts:c.cutParts,welds:c.welds,panels,cases,seams,audit,tolerance,
  proposal:{grade:'S235JR PL6 proposed, certificates absent',webMm:[32,48,6],webPositionU:[17.5,49.5],throatMinMm:3,legNominalMm:3*Math.sqrt(2),legMaxProposedMm:4.75,positionToleranceMm:.25,fitUpGapMaxProposedMm:.2,additionalSteelMassVersusOriginalRhsKg:(sec.areaMm2-1050-736)*(2*c.cavityMm[0]+2*(c.cavityMm[1]+12))*7850/1e9,notFinishedMass:true},
  summary:{sizes:1,lockStations:12,changedCutPieces:c.cutParts.length,weldRootGroups:c.welds.length,panelSupportCases:panels.reduce((s,p)=>s+p.runs.length,0),stationWeldCases:cases.length,seamCases:seams.length,maxStationRatio:Math.max(...cases.map(r=>r.ratio)),maxWsRatio:Math.max(...seams.map(r=>r.wsRatio)),maxWcRatio:Math.max(...seams.map(r=>r.wcRatio)),maxDeflectionAt1_5Mm:1.5*Math.max(...panels.flatMap(p=>p.runs.map(r=>r.maxDeflectionMm))),maxElasticStressAt1_5MPa:1.5*Math.max(...panels.flatMap(p=>p.runs.map(r=>r.elasticStressMPa)))},
  exclusions:['Local parent-plate/distortional bending and actual bracket/bolt/contact stiffness not verified.','Nominal global beam composite behaviour requires qualified full seams. No torsional restraint or fatigue proof.','Seals, global mould tolerances, frame/bed welds and lifting remain separate design work.','No shop trial, inspection, material certificate, load test or human release is claimed.'],stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(out,{recursive:true});const records=[];for(const family of families){const r=calculate(family);fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(r,null,2));records.push({family,file:`${family}.json`,sha256:sha(`${out}/${family}.json`),...r.summary});console.log(JSON.stringify(records.at(-1)));}
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P94',records,sourceSetupCount:9,stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false,generatorSha256:sha(fileURLToPath(import.meta.url))},null,2));
}
