import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {rect,cellFaces} from './prism-tools-p54.mjs';
import {loft,oriented,properties,swept} from './cap-geometry-p55.mjs';
import {lineGroup,resistanceBound,add,sub,scale,cross} from './weld-group-p93.mjs';

export const families=['F2660','NF02','NW01','NW02','NR-S','NR-N'];
export const out='output/table-weld-p93';
export const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export const read=p=>JSON.parse(fs.readFileSync(p));
export function sources(key){const ext=!['F2660','NF02'].includes(key);return {
 model:`output/${ext?'table-lock-p51':'floor-lock-p47'}/${key}/model.json`,
 pressure:`output/${ext?'table-connections-p51':'floor-connections-p49'}/${key}.json`,
 stock:`output/${ext?'table-workpack-p51':'floor-workpack-p50'}/${key}-parts.json`,
 original:`output/${ext?'table-mould-p51':'floor-mould-p46'}/${key}/model.json`,
};}
export function axes(parent,[L,W]){
 const data={M01:{origin:[0,0,0],t:[1,0,0],u:[0,-1,0]},M02:{origin:[0,W,0],t:[1,0,0],u:[0,1,0]},M03:{origin:[0,0,0],t:[0,1,0],u:[-1,0,0]},M04:{origin:[L,0,0],t:[0,1,0],u:[1,0,0]}}[parent];
 assert.ok(data,'Unknown shutter');return {...data,toGlobal:([t,u,z])=>add(data.origin,add(scale(data.t,t),add(scale(data.u,u),[0,0,z])))};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const boxAt=(fn,t0,t1,u0,u1,z0,z1)=>loft([[t0,u0,z0],[t1,u0,z0],[t1,u1,z0],[t0,u1,z0]].map(fn),[[t0,u0,z1],[t1,u0,z1],[t1,u1,z1],[t0,u1,z1]].map(fn));
function bead(a,b,outward,vertical,leg){
 const tri=p=>[p,add(p,scale(outward,leg)),add(p,scale(vertical,leg))];return loft(tri(a),tri(b));
}
/** Continuous rectangular root. Fillet corner shape is a faceted nominal cone,
 * not a prediction of the deposited weld profile. Each sector is a convex tetrahedron.
 */
export function rectangularWeld(z,down=false,a=3){
 const roots=[[-3,16,z],[3,16,z],[3,50,z],[-3,50,z]],vertical=[0,0,down?-1:1],leg=a*Math.sqrt(2),solids=[];
 const normals=[[0,-1,0],[1,0,0],[0,1,0],[-1,0,0]];
 for(let i=0;i<4;i++)solids.push(bead(roots[i],roots[(i+1)%4],normals[i],vertical,leg));
 for(let i=0;i<4;i++){
  const p=roots[i],n0=normals[(i+3)%4],n1=normals[i],apex=add(p,scale(vertical,leg));
  for(let j=0;j<8;j++){
   const v=f=>add(p,scale(add(scale(n0,Math.cos(f*Math.PI/2)),scale(n1,Math.sin(f*Math.PI/2))),leg)),a0=v(j/8),b0=v((j+1)/8);
   solids.push(oriented([[p,b0,a0],[p,a0,apex],[a0,b0,apex],[b0,p,apex]]));
  }
 }
 return {rootSegments:roots.map((p,i)=>[p,roots[(i+1)%4]]),solids,throatMm:a,legMm:leg,continuousClosedRoot:true,fullSizeRequiredAtCorners:true};
}
export function makeCandidate(key){
 assert.ok(families.includes(key));const paths=sources(key),m=read(paths.model),base=read(paths.original),cavity=cellFaces(rect(0,m.cavityMm[0],0,m.cavityMm[1],0,m.cavityMm[2]));
 const parts=m.parts.map(p=>({id:p.id,color:p.color,solids:p.cells.map(cellFaces)})),replacements=[],welds=[];
 for(const station of m.lockSchedule){
  const p=parts.find(x=>x.id===station.parent),frame=axes(station.parent,m.cavityMm),along=['M01','M02'].includes(station.parent)?station.x:station.y;
  const local=v=>frame.toGlobal(add(v,[along,0,0]));
  const oldWeb=boxAt(local,-3,3,6,56,12,60),bbox=faces=>[0,1,2].map(i=>[Math.min(...faces.flat().map(v=>v[i])),Math.max(...faces.flat().map(v=>v[i]))]);
  const oldBox=bbox(oldWeb),index=p.solids.findIndex(s=>same(bbox(s),oldBox));assert.ok(index>=0,`${key}/${station.id} missing exact original web`);
  p.solids[index]=boxAt(local,-3,3,16,50,12,60);
  replacements.push({station:station.id,parent:station.parent,oldWebLocalMm:{t:[-3,3],u:[6,56],z:[12,60]},newWebLocalMm:{t:[-3,3],u:[16,50],z:[12,60]},removedVolumeMm3:16*48*6,removedMassKg:16*48*6*7850/1e9});
  for(const [suffix,z,down] of [['WF',12,false],['WR',60,true]]){
   const w=rectangularWeld(z,down),tag=`${station.id}-${suffix}`,record={tag,parent:station.parent,station:station.id,role:suffix==='WF'?'WEB_TO_FOOT':'WEB_TO_RHS_UNDERSIDE',throatMm:3,legMm:w.legMm,effectiveLengthMm:80,closedRoot:true,rootSegmentsMm:w.rootSegments.map(s=>s.map(local)),nominalSolids:w.solids.map(s=>s.map(f=>f.map(local)))};
   welds.push(record);
  }
 }
 for(const parent of ['M01','M02','M03','M04']){
  const frame=axes(parent,m.cavityMm),isSide=['M01','M02'].includes(parent),a0=isSide?0:-6,b0=isSide?m.cavityMm[0]:m.cavityMm[1]+6;
  for(const [name,z,vertical]of [['LOWER',60,[0,0,-1]],['UPPER',110,[0,0,1]]]){
   const a=[a0,6,z],b=[b0,6,z],s=bead(a,b,[0,1,0],vertical,3*Math.sqrt(2));
   welds.push({tag:`${parent}-WS-${name}`,parent,role:'SKIN_TO_RHS',throatMm:3,legMm:3*Math.sqrt(2),rootSegmentsMm:[[frame.toGlobal(a),frame.toGlobal(b)]],effectiveLengthMm:b0-a0-6,closedRoot:false,endDeductionMm:6,endReturn:'Not credited; ends terminate at coplanar stock ends. Configuration and full-size termination require WPS review.',nominalSolids:[s.map(f=>f.map(frame.toGlobal))]});
  }
 }
 return {key,paths,sourceModel:m,sourceStock:base,concrete:cavity,parts,welds,replacements};
}
export function checkGeometry(candidate){
 const {parts,welds,sourceModel:m,concrete}=candidate;
 const beads=welds.flatMap(w=>w.nominalSolids.map(faces=>({owner:w.parent,tag:w.tag,faces}))),initial=[];
 // Previously accepted untouched steel remains pinned. Test every added bead
 // against current steel, concrete and beads of OTHER detachable assemblies.
 for(const b of beads){
  if(swept(b.faces,concrete))initial.push(`${b.tag}:CONCRETE`);
  for(const p of parts)if(p.solids.some(s=>swept(b.faces,s)))initial.push(`${b.tag}:${p.id}`);
 }
 for(let i=0;i<beads.length;i++)for(let j=0;j<i;j++)if(beads[i].owner!==beads[j].owner&&swept(beads[i].faces,beads[j].faces))initial.push(`${beads[i].tag}:${beads[j].tag}`);
 const active=new Map(parts.map(p=>[p.id,p])),steps=[];
 for(const step of m.audit.steps){
  const p=active.get(step.id),own=beads.filter(b=>b.owner===p.id),obstacles=[{id:'CONCRETE',solids:[concrete]},...active.values()].filter(q=>q.id!==p.id),hits=[];
  const moving=[...p.solids,...own.map(b=>b.faces)];
  // Every existing path must clear the added welds; new bead paths clear all steel.
  for(const q of obstacles){const otherBeads=beads.filter(b=>b.owner===q.id).map(b=>b.faces);
   if(moving.some(s=>otherBeads.some(t=>swept(s,t,step.translationMm)))||own.some(b=>q.solids.some(t=>swept(b.faces,t,step.translationMm))))hits.push(q.id);
  }
  steps.push({id:step.id,translationMm:step.translationMm,hits});active.delete(step.id);
 }
 const leg=3*Math.sqrt(2),clearance={webToSkinBeadMm:16-leg-(6+leg),outerWeldToRhsEdgeMm:56-(50+leg),boltShankToWebWeldMm:80-8-(50+leg)};
 return {initialCollisions:initial,continuousDeltaChecks:steps,nominalClearance:clearance,unchangedPathsInheritedFrom:m.audit.source,scope:'All new bead/current steel intersections and delta paths; source unchanged geometry audit pinned. Nominal square-corner RHS. No tool rotation, heat distortion, tolerances or supported handling claim.',limits:['Fillet solids show minimum nominal geometric envelope, not actual deposited bead inspection.','End returns on longitudinal WS are not credited; joint-end WPS disposition remains required.','RHS supplier corner radius/contact profile must fit before fabrication.']};
}
function maxBeamShear(beam){const pts=[0,beam.lengthMm,...beam.reactions.map(r=>r.xMm)];return Math.max(...pts.flatMap(x=>[false,true].map(after=>Math.abs(beam.lineLoadNmm*x-beam.reactions.filter(r=>after?r.xMm<=x:r.xMm<x).reduce((s,r)=>s+r.forceN,0)))));}
export function calculate(key){
 const paths=sources(key),m=read(paths.model),d=read(paths.pressure),stock=read(paths.stock),sourceHashes=Object.values(paths).map(path=>({path,sha256:sha(path)}));
 assert.equal(d.sourceSha256,sha(paths.model));assert.equal(stock.geometrySha256,sha(paths.model));assert.deepEqual(d.cavityMm,m.cavityMm);
 const pinned=new Map(read('output/stage5-closure-p90/register.json').pins.map(x=>[x.path,x.sha256]));
 for(const pin of sourceHashes)if(pinned.has(pin.path))assert.equal(pin.sha256,pinned.get(pin.path),`Issued source changed: ${pin.path}`);
 const capacity=resistanceBound(),cases=[],skinSeams=[],H=m.cavityMm[2],q=25*H*H/2/1e6;
 assert.equal(H,175);assert.equal(m.lockSchedule.length,12);
 for(const panel of d.panels)for(const beam of panel.cases){
  assert.ok(Math.abs(beam.lineLoadNmm-q)<1e-12);assert.equal(beam.demands.length,panel.locks.length);
  const Q=H*6*(panel.section.centroidOutwardMm-3),maxV=maxBeamShear(beam);
  for(const lambda of [1,1.5]){
   const q1=q*lambda,momentPerLength=q1*(H/3-85),upper=q1/2+momentPerLength/50,lower=q1/2-momentPerLength/50;
   const endFactor=panel.lengthMm/(panel.lengthMm-6),parallel=maxV*Q/panel.section.I_mm4/2*lambda*endFactor;
   const maxStress=Math.hypot(Math.max(Math.abs(upper),Math.abs(lower))*endFactor,parallel)/3;
   skinSeams.push({panel:panel.parent,supportK:beam.supportK,pressureMultiplier:lambda,transverseUpperNmm:upper*endFactor,transverseLowerNmm:lower*endFactor,longitudinalShearFlowEachNmm:parallel,endLengthAmplification:endFactor,maxStressResultantMPa:maxStress,ratio:maxStress/capacity.resultantBoundMPa,method:'q pressure/couple plus VQ/I split to two equal a3 longitudinal seams; conservative endpoint deduction amplification; excludes vertical/self-weight/torsion/handling'});
   for(const demand of beam.demands){
    const station=m.lockSchedule.find(s=>s.id===demand.id);assert.equal(station.parent,panel.parent);
    assert.ok(demand.forceN>=0,'Negative reaction needs separate bearing/loadpath design');
    const F=[0,demand.forceN*lambda,0],application=[0,0,H/3];
    for(const [role,z,down]of [['WEB_TO_FOOT',12,false],['WEB_TO_RHS_UNDERSIDE',60,true]]){
     const w=rectangularWeld(z,down),result=lineGroup({segments:w.rootSegments,forceN:F,originMm:application,throatMm:3}),ratio=result.worst.stressResultantMPa/capacity.resultantBoundMPa;
     assert.ok(result.forceResidualN.every(v=>Math.abs(v)<1e-7)&&result.momentResidualNmm.every(v=>Math.abs(v)<1e-5));
     cases.push({station:demand.id,panel:panel.parent,role,supportK:beam.supportK,pressureMultiplier:lambda,forceApplicationLocalMm:application,pressureReactionN:demand.forceN,throatMm:3,result,ratio,staticWeldArithmeticWithinBound:ratio<=1,wholeConnectionPassed:null});
    }
   }
  }
 }
 const candidate=makeCandidate(key),geometry=checkGeometry(candidate);
 assert.deepEqual(geometry.initialCollisions,[]);assert.ok(geometry.continuousDeltaChecks.every(s=>s.hits.length===0));
 assert.ok(Object.values(geometry.nominalClearance).every(v=>v>0));
 const grossWeldVolume=candidate.welds.reduce((s,w)=>s+w.nominalSolids.reduce((v,f)=>v+properties(f).volumeMm3,0),0),removed=candidate.replacements.reduce((s,r)=>s+r.removedMassKg,0);
 return {revision:'P93',family:key,sourceSetups:stock.sourceSetups,cavityMm:m.cavityMm,status:'WELD_LAYOUT_CANDIDATE_PRESSURE_ONLY',sources:sourceHashes,
  materialProposal:{plate:'S235JR proposed; mill certificate not provided',rhs:'S235JRH proposed; actual corner geometry not yet selected',fuMinimumStudyMPa:360,betaW:.8,gammaM2Trial:1.25,weldConsumable:'compatible strength/toughness required; WPS and actual process not selected'},
  reference:{path:'knowledge/modular-program-r02/references/JRC96658-2015.pdf',sha256:sha('knowledge/modular-program-r02/references/JRC96658-2015.pdf'),url:'https://publications.jrc.ec.europa.eu/repository/handle/JRC96658',pagesPdf:[113,114,115,116,117,118],printedPages:'97–102',equation:'2.14, conservative resultant bound;0.9 normal cap additionally imposed'},
  pressureBasis:{heightMm:H,gammaKNm3:25,multipliers:[1,1.5],approvedCodeCombination:false,supportCases:['rigid',1000,100],supportStiffnessVerified:false},
  welds:candidate.welds,replacements:candidate.replacements,geometry,capacity,cases,skinSeams,
  materialChange:{steelWebRemovedKg:removed,nominalWeldMetalEnvelopeKg:grossWeldVolume*7850/1e9,netNominalMassChangeKg:grossWeldVolume*7850/1e9-removed,notFinalMouldMass:'Only described weld envelope and web change; other welds/fittings remain absent. Not a lifting mass.'},
  summary:{stations:12,rootGroups:candidate.welds.length,stationCases:cases.length,skinSeamCases:skinSeams.length,maxStationWeldRatio:Math.max(...cases.map(c=>c.ratio)),maxSkinSeamRatio:Math.max(...skinSeams.map(c=>c.ratio))},
  fabricationNotes:['a3 means minimum effective throat3mm; equal-leg nominal4.243mm, not leg3mm.','WR/WF closed roots: continuous full-size all round with corners blended; no four independent6mm load-carrying welds.','Trim web to34x48x6; locate u16–50,t±3,z12–60. Do not trim skin or move lock holes.','No structural credit for short foot-to-skin or web-to-skin beads. Keep intentional10mm web-to-skin gap.','Weld WR before closing obstructed fabrication access; verify WR underface with gauge before assembly.','Weld starts/ends and RHS corner fit require WPS/detail review. Distortion control and dimensional QA required.'],
  exclusions:['Not actual bracket support stiffness/contact/prying/bolt demand. P49/P51 spring cases remain idealised.','Only pressure transfer through side shutters. No frame/rib/bed/doubler weld approval.','No fatigue, vibration, tightening, bolt/nut/washer/thread, parent plate local failure, lifting, erection or floor approval.','No source Typical change; not a production drawing release.'],stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(out,{recursive:true});const results=[];
 for(const family of families){const r=calculate(family);fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(r,null,2));results.push({family,file:`${family}.json`,sha256:sha(`${out}/${family}.json`),...r.summary});console.log(JSON.stringify(results.at(-1)));}
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P93',records:results,sourceSetupCount:9,stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false,generatorSha256:sha(fileURLToPath(import.meta.url))},null,2));
}
