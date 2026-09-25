import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const folder=process.argv[2];assert(folder);
const spec=JSON.parse(fs.readFileSync(path.join(folder,'study-spec.json'))),rawMesh=fs.readFileSync(spec.meshPath),mesh=JSON.parse(rawMesh);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');assert.equal(hash(rawMesh),spec.meshSha256);
const nodes=new Map(mesh.nodes.map(n=>[n.id,n]));const elements=new Map(mesh.elements.filter(e=>spec.selectedParts.includes(e.part)).map(e=>[e.id,e]));
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a);assert(l>1e-9);return a.map(x=>x/l);};
const staad=xyz=>[xyz[0]/1000,xyz[2]/1000,xyz[1]/1000];
function rows(s,heading){const start=s.indexOf(heading);assert(start>=0);const end=s.indexOf('END OF LATEST ANALYSIS RESULT',start);assert(end>start);return s.slice(start,end).split(/\r?\n/).map(l=>l.trim().split(/\s+/)).filter(a=>a.length===8&&a.every(x=>Number.isFinite(Number(x)))).map(a=>a.map(Number));}
const results=[];
for(const name of spec.cases){
 const anlBytes=fs.readFileSync(path.join(folder,name+'.ANL')),text=anlBytes.toString('utf8');assert(text.includes('END OF THE STAAD.Pro RUN'));
 assert(/Warning Count: 0, Error Count: 0/.test(fs.readFileSync(path.join(folder,name+'.log'),'utf8')));
 const reactions=rows(text,'SUPPORT REACTIONS -UNIT NEWT METE'),disp=rows(text,'JOINT DISPLACEMENT (CM   RADIANS)');
 assert.equal(reactions.length,spec.supports.length);assert.equal(new Set(reactions.map(r=>r[0])).size,spec.supports.length);
 assert.equal(disp.length,spec.nodes);assert.equal(new Set(disp.map(r=>r[0])).size,spec.nodes);
 let sumF=[0,0,0],sumM=[0,0,0];const sideForces={},partExternal=new Map(spec.selectedParts.map(p=>[p,{force:[0,0,0],moment:[0,0,0]}]));
 const crownReferenceSTAADm=[1.5,2.925,.75];
 for(const r of reactions){assert.equal(r[1],1);assert(spec.supports.includes(r[0]));const n=nodes.get(r[0]),F=r.slice(2,5),M=r.slice(5,8);sumF=add(sumF,F);sumM=add(sumM,add(M,cross(staad(n.xyzMm),F)));sideForces[n.part]=add(sideForces[n.part]??[0,0,0],F);const pe=partExternal.get(n.part);pe.force=add(pe.force,F);pe.moment=add(pe.moment,add(M,cross(sub(staad(n.xyzMm),crownReferenceSTAADm),F)));}
 for(const e of elements.values()){
  const xyz=[0,1,2].map(k=>e.nodeIds.reduce((s,id)=>s+nodes.get(id).xyzMm[k],0)/e.nodeIds.length),F=[0,-e.areaMm2*e.thicknessMm/1e9*spec.trialUnitWeightKNM3*1000,0],pe=partExternal.get(e.part);
  pe.force=add(pe.force,F);pe.moment=add(pe.moment,cross(sub(staad(xyz),crownReferenceSTAADm),F));
 }
 const crownJointResultants=Object.fromEntries([...partExternal].map(([p,v])=>[p,{forceKN:v.force.map(x=>-x/1000),momentKNm:v.moment.map(x=>-x/1000)}]));
 const cj=Object.values(crownJointResultants);assert(add(cj[0].forceKN,cj[1].forceKN).every(x=>Math.abs(x)*1000<spec.criteria.forceResidualN));assert(add(cj[0].momentKNm,cj[1].momentKNm).every(x=>Math.abs(x)*1000<spec.criteria.momentResidualNm));
 const load=[0,-spec.weightKN*1000,0],moment=cross(staad(spec.cgSourceMm),load),forceResidual=add(sumF,load),momentResidual=add(sumM,moment);
 assert(forceResidual.every(x=>Math.abs(x)<spec.criteria.forceResidualN));assert(momentResidual.every(x=>Math.abs(x)<spec.criteria.momentResidualNm));
 for(const r of disp){assert.equal(r[1],1);if(spec.supports.includes(r[0]))assert(r.slice(2,5).every(x=>Math.abs(x)<1e-10));}
 const stressStart=text.indexOf('ELEMENT STRESSES    FORCE,LENGTH UNITS= NEWT METE');assert(stressStart>=0);
 const lines=text.slice(stressStart).split(/\r?\n/),forces=[];
 for(let i=0;i<lines.length-1;i++){
  const a=lines[i].trim().split(/\s+/),b=lines[i+1].trim().split(/\s+/);
  if(a.length!==7||b.length!==5||![...a,...b].every(x=>Number.isFinite(Number(x))))continue;
  const [id,loadcase,SQX,SQY,MX,MY,MXY]=a.map(Number),[VONT,VONB,SX,SY,SXY]=b.map(Number);
  const e=elements.get(id);assert(e);assert.equal(loadcase,1);const t=e.thicknessMm/1000;
  const points=[...e.nodeIds].reverse().map(id=>staad(nodes.get(id).xyzMm));
  const x=unit(sub(points[1],points[0])),z=unit(cross(sub(points[1],points[0]),sub(points[e.nodeIds.length===3?2:3],points[1]))),y=unit(cross(z,x));
  forces.push({element:id,part:e.part,loadCase:1,centroidSTAADm:[0,1,2].map(k=>points.reduce((s,p)=>s+p[k],0)/points.length),localAxesInSTAAD:{x,y,z},thicknessM:t,
   resultants:{Nxx:SX*t/1000,Nyy:SY*t/1000,Nxy:SXY*t/1000,Mxx:MX/1000,Myy:MY/1000,Mxy:MXY/1000,Qx:SQX*t/1000,Qy:SQY*t/1000},
   rawNative:{SQX,SQY,MX,MY,MXY,SX,SY,SXY,VONT,VONB}});
 }
 assert.equal(forces.length,elements.size);assert.equal(new Set(forces.map(f=>f.element)).size,elements.size);
 const maxDownward=disp.reduce((best,r)=>r[3]<best[3]?r:best,disp[0]);
 const maxHorizontal=disp.reduce((best,r)=>Math.abs(r[2])>Math.abs(best[2])?r:best,disp[0]);
 const components=Object.keys(forces[0].resultants),extrema={};
 for(const component of components){const min=forces.reduce((a,b)=>a.resultants[component]<b.resultants[component]?a:b),max=forces.reduce((a,b)=>a.resultants[component]>b.resultants[component]?a:b);extrema[component]={min:min.resultants[component],minElement:min.element,max:max.resultants[component],maxElement:max.element};}
 const forceData={status:'RAW_SINGLE_CASE_TRIAL_RESULTANTS_NOT_RC_DESIGN',case:name,analysisSha256:hash(anlBytes),units:{Nxx_Nyy_Nxy_Qx_Qy:'kN/m',Mxx_Myy_Mxy:'kN.m/m'},signConvention:'Native STAAD local element signs preserved; local axes from reversed STD incidence, not building axes.',sourceHelp:'STAAD.Pro 2023 Help/GUID-777CEFB1-4F20-457A-8594-C3F8288A1AF5.html',records:forces};
 fs.writeFileSync(path.join(folder,name+'-shell-resultants.json'),JSON.stringify(forceData,null,2)+'\n');
 fs.writeFileSync(path.join(folder,name+'-nodal-results.json'),JSON.stringify({reactionUnits:'N,N.m',displacementUnits:'cm,rad',columns:['joint','load','x','y','z','rx','ry','rz'],reactions,displacements:disp},null,2)+'\n');
 results.push({case:name,status:'SELFWEIGHT_EQUILIBRIUM_PASS_NOT_DESIGN',forceResidualN:forceResidual,momentResidualNm:momentResidual,sumReactionsN:sumF,partBaseForcesN:sideForces,crownReferenceSTAADm,crownJointResultantsByPart:crownJointResultants,crownResultantMethod:'Negative of external support-plus-selfweight resultants for each half at one common reference; whole-interface resultant, not per connector.',minVerticalSupportReactionN:Math.min(...reactions.map(r=>r[3])),maxDownwardMm:-maxDownward[3]*10,maxDownwardNode:maxDownward[0],maxHorizontalAbsMm:Math.abs(maxHorizontal[2])*10,maxHorizontalNode:maxHorizontal[0],localComponentExtremaNotConcurrentDesignVector:extrema,analysisSha256:hash(anlBytes),inputSha256:hash(fs.readFileSync(path.join(folder,name+'.STD')))});
}
const report={status:'PASS_LISTED_TWO_HALF_SHELL_STUDY_CHECKS_ONLY',specHash:hash(fs.readFileSync(path.join(folder,'study-spec.json'))),criteria:spec.criteria,results,limitations:spec.excluded,wholeBuildingAnalysed:false,meshConvergenceVerified:false,connectionCapacityVerified:false,engineeringApproved:false};
fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,results:results.map(({localComponentExtremaNotConcurrentDesignVector,...r})=>r)},null,2));
