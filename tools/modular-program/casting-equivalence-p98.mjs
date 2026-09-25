import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {read,sha,sources,families} from './table-weld-p93.mjs';
import {build as table} from './table-lock-base-p97.mjs';
export const out='output/casting-equivalence-p98';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const bounds=f=>[0,1,2].map(i=>[Math.min(...f.flat().map(v=>v[i])),Math.max(...f.flat().map(v=>v[i]))]);
export function validateRotation(R){
 assert.equal(R.length,3);assert.ok(R.every(r=>r.length===3&&r.every(Number.isFinite)));
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(dot(R[i],R[j])-(i===j?1:0))<1e-10);
 assert.ok(Math.abs(dot(R[0],cross(R[1],R[2]))-1)<1e-10,'Casting pose must be proper rotation, not reflection');
}
export function inversePose(point,pose){
 const R=pose.basisRows,v=pose.originSourceMm?add(point,pose.localShiftMm):add(point,pose.rotatedOriginMm);
 const rotated=[0,1,2].map(j=>R.reduce((s,row,i)=>s+row[j]*v[i],0));
 return pose.originSourceMm?add(rotated,pose.originSourceMm):rotated;
}
function canonicalFace(f,tolerance=1e-6){
 const points=f.map(p=>p.map(v=>Math.round(v/tolerance)).join(','));
 const candidates=[];for(const q of [points,[...points].reverse()])for(let i=0;i<q.length;i++)candidates.push([...q.slice(i),...q.slice(0,i)].join(';'));
 return candidates.sort()[0];
}
export function compareFaces(actual,expected,tolerance=1e-6){
 assert.ok(actual.length&&expected.length&&[...actual,...expected].every(f=>f.length>=3&&f.every(v=>v.length===3&&v.every(Number.isFinite))));
 const A=actual.map(f=>canonicalFace(f,tolerance)).sort(),B=expected.map(f=>canonicalFace(f,tolerance)).sort();
 const exactTopologyAtTolerance=JSON.stringify(A)===JSON.stringify(B);
 const nearest=(a,b)=>Math.max(...a.flat().map(v=>Math.min(...b.flat().map(w=>Math.hypot(...sub(v,w))))));
 return {sameFacetsAndCyclicEdges:exactTopologyAtTolerance,actualFaces:actual.length,expectedFaces:expected.length,coordinateQuantizationMm:tolerance,maxBidirectionalVertexDistanceMm:Math.max(nearest(actual,expected),nearest(expected,actual)),boundsActualMm:bounds(actual),boundsExpectedMm:bounds(expected),meaning:'Facet cycle comparison allows face order, cyclic start and winding changes only. Vertex distance supplements, not substitutes for topology. This is nominal model equivalence, not shop tolerances.'};
}
export function volumeCg(faces){
 const bb=bounds(faces),origin=bb.map(([a,b])=>(a+b)/2);let V=0,M=[0,0,0];
 for(const face of faces){const a=sub(face[0],origin);for(let i=1;i<face.length-1;i++){const b=sub(face[i],origin),c=sub(face[i+1],origin),v=dot(a,cross(b,c))/6;V+=v;M=M.map((m,j)=>m+v*(a[j]+b[j]+c[j])/4);}}
 assert.ok(Math.abs(V)>1e-6);return {volumeMm3:Math.abs(V),signedVolumeMm3:V,cgMm:M.map((v,i)=>origin[i]+v/V)};
}
const cache=new Map();
function tableShape(f){if(!cache.has(f))cache.set(f,table(f,{audit:false}));return cache.get(f);}
export function resolveModel(record){
 const paths=record.evidence.filter(f=>f.path.endsWith('.json')).map(f=>f.path),kind=record.familyWorkstream;
 if(kind==='TABLE'){
  const f=families.find(f=>read(`output/table-lock-base-p97/${f}.json`).sourceSetups.some(s=>(typeof s==='string'?s:s.id)===record.id));assert.ok(f,record.id);
  const r=read(`output/table-lock-base-p97/${f}.json`),b=tableShape(f);
  return {path:`output/table-lock-base-p97/${f}.json`,revision:'P97',faces:b.c.sourceCandidate.concrete,pose:null,extraPins:[...Object.values(sources(f)),`output/table-channel-p94/${f}.json`,`output/table-seal-p95/${f}.json`,`output/table-seal-backer-p96/${f}.json`],family:f,overlayGeometryChangesConcrete:false};
 }
 const prefix={C_SHELL:'output/c-shell-p59/',ABD_SHELL:'output/abd-base-pattern-p85/',NOTCHED:'output/notched-mould-p54/',END:'output/end-hardware-p58/',CAP:'output/cap-hardware-p56/'}[kind];
 const path=paths.find(p=>p.startsWith(prefix));assert.ok(path,record.id);const m=read(path);
 const extraPins=kind==='ABD_SHELL'?paths.filter(p=>['output/abd-roof-web-p71/','output/seam-hardware-p74/','output/abd-edge-ribs-p80/','output/base-thread-candidate-p89/'].some(x=>p.startsWith(x))):[];
 if(kind==='ABD_SHELL'){const candidate=read(extraPins.find(p=>p.startsWith('output/base-thread-candidate')));assert.deepEqual(candidate.concrete,m.concrete);}
 return {path,revision:m.revision,faces:m.concrete?.faces??m.concreteFacesMm,pose:kind==='CAP'?m.transform:null,extraPins,family:kind,overlayGeometryChangesConcrete:false};
}
export function auditRecord(record){
 const pins=new Map(),pin=(path,expected)=>{const h=sha(path);if(expected)assert.equal(h,expected,'Stale '+path);pins.set(path,h);return read(path);};
 const s=pin(record.concreteReference.path,record.concreteReference.sha256);assert.equal(s.id,record.id);assert.equal(s.typicalId,record.typicalId);
 const parent=pin(s.source.model,s.source.modelSha256);pin(s.source.typicalSource,s.source.typicalSourceSha256);
 const instance=parent.instances.find(i=>i.id===s.source.instanceId);assert.ok(instance);assert.equal(instance.typicalId,s.typicalId);
 assert.equal(instance.sourceSha256,s.source.typicalSourceSha256);assert.equal(instance.source,s.source.typicalSource);
 const latest=resolveModel(record);pin(latest.path);for(const p of latest.extraPins)pin(p);
 validateRotation(s.castingTransform.basisRows);if(latest.pose)validateRotation(latest.pose.basisRows);
 const inSource=latest.faces.map(f=>f.map(p=>latest.pose?inversePose(p,latest.pose):p));
 const inBuilding=inSource.map(f=>f.map(p=>inversePose(p,s.castingTransform)));
 const sourceComparison=compareFaces(inSource,s.cavity.facesMm),buildingComparison=compareFaces(inBuilding,instance.facesMm);
 const metrics=volumeCg(latest.faces),expected=volumeCg(s.cavity.facesMm),cgInSource=latest.pose?inversePose(metrics.cgMm,latest.pose):metrics.cgMm;
 const volumeRelativeError=Math.abs(metrics.volumeMm3-expected.volumeMm3)/expected.volumeMm3,cgErrorMm=Math.hypot(...sub(cgInSource,expected.cgMm));
 const matches=sourceComparison.sameFacetsAndCyclicEdges&&buildingComparison.sameFacetsAndCyclicEdges&&volumeRelativeError<1e-9&&cgErrorMm<1e-6;
 return {revision:'P98',id:s.id,typicalId:s.typicalId,kind:record.familyWorkstream,modelRevision:latest.revision,modelPath:latest.path,modelFamily:latest.family,
  status:matches?'NOMINAL_CASTING_EQUIVALENCE_CHECKED':'MISMATCH_REQUIRES_REVIEW',matches,sourceComparison,buildingComparison,
  metrics:{...metrics,volumeRelativeError,cgErrorMm,authoritativeConcreteKg:s.mass.concreteKg,facetedMeshKg:metrics.volumeMm3*2400/1e9,meshMinusAuthoritativeKg:metrics.volumeMm3*2400/1e9-s.mass.concreteKg,densityKgM3:2400,notWholePieceLiftingMass:true},
  normalThicknessMm:s.cavity.normalThicknessMm,castingDimensionsMm:bounds(latest.faces).map(([a,b])=>b-a),sourceCastingDimensionsMm:s.cavity.dimensionsMm,
  openings:s.openings.map(o=>({tag:o.id,type:o.type,roughWidthMm:o.roughWidthMm,roughHeightVerticalInstalledMm:o.roughHeightVerticalInstalledMm})),
  originalTypicalBoard:s.sourceTypicalBoard,sourceTransform:s.castingTransform,currentPose:latest.pose,
  scope:'P40-5 nominal concrete geometry matches frozen Typical-linked Stage3 instance and P38 cavity. Not form skin contact completeness, tolerances, shrinkage, removal equipment, strength or production release. Revalidate if any pinned geometry changes. Steel-only candidate overlays do not promote their design.',
  inputs:[...pins].map(([path,sha256])=>({path,sha256})),stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
}
export function generate(){
 fs.mkdirSync(out,{recursive:true});const source=read('output/stage5-closure-p90/register.json');assert.equal(source.records.length,44);
 const records=source.records.map(r=>{const a=auditRecord(r);fs.writeFileSync(`${out}/${a.id}.json`,JSON.stringify(a,null,2));console.log(a.id,a.status);return a;});
 const checked=records.filter(r=>r.matches).length;const result={revision:'P98',stage:5,reviewed:44,checked,mismatch:44-checked,geometryReviewPercent:checked/44*100,wholeStagePercent:null,sourceInventory:{path:'output/stage5-closure-p90/register.json',sha256:sha('output/stage5-closure-p90/register.json')},records,generatorSha256:sha('tools/modular-program/casting-equivalence-p98.mjs'),stageComplete:false,engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(`${out}/register.json`,JSON.stringify(result,null,2));
 fs.writeFileSync(`${out}/summary.csv`,['setup,typical,model_revision,nominal_geometry_matches,casting_x_mm,casting_y_mm,casting_z_mm,normal_thickness_mm,authoritative_concrete_kg,faceted_mesh_kg,max_vertex_error_mm',...records.map(r=>[r.id,r.typicalId,r.modelRevision,r.matches,...r.castingDimensionsMm,r.normalThicknessMm??'',r.metrics.authoritativeConcreteKg,r.metrics.facetedMeshKg,r.sourceComparison.maxBidirectionalVertexDistanceMm].join(','))].join('\n')+'\n');
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=generate();console.log({checked:r.checked,mismatch:r.mismatch});}
