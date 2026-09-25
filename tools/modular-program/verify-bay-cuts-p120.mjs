import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const folder=process.argv[2];assert(folder);
const spec=JSON.parse(fs.readFileSync(path.join(folder,'study-spec.json'))),meshBytes=fs.readFileSync(spec.meshPath),mesh=JSON.parse(meshBytes);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(hash(meshBytes),spec.meshSha256);assert(spec.printCornerForces);
const nodes=new Map(mesh.nodes.map(n=>[n.id,n])),elements=new Map(mesh.elements.filter(e=>spec.selectedParts.includes(e.part)).map(e=>[e.id,e]));
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),neg=a=>a.map(v=>-v);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const xyz=id=>{const p=nodes.get(id).xyzMm;return [p[0]/1000,p[2]/1000,p[1]/1000];};
const centroid=e=>[0,1,2].map(k=>e.nodeIds.reduce((s,id)=>s+xyz(id)[k],0)/e.nodeIds.length);
const load=e=>[0,-e.areaMm2*e.thicknessMm/1e9*spec.trialUnitWeightKNM3*1000,0];
const criteria={perElementForceN:1,perElementMomentNm:1,sectionForceN:5,sectionMomentNm:5};
const results=[];
for(const name of spec.cases){
 const bytes=fs.readFileSync(path.join(folder,name+'.ANL')),text=bytes.toString('utf8');
 assert(text.includes('END OF THE STAAD.Pro RUN'));assert(/Warning Count: 0, Error Count: 0/.test(fs.readFileSync(path.join(folder,name+'.log'),'utf8')));
 const start=text.indexOf('ELEMENT FORCES    FORCE,LENGTH UNITS= NEWT METE');assert(start>=0);const forces=new Map();let current=null;
 for(const line of text.slice(start).split(/\r?\n/)){
  const h=line.match(/ELE\.NO\.\s+(\d+) FOR LOAD CASE\s+(\d+)/);if(h){current=Number(h[1]);assert.equal(Number(h[2]),1);assert(elements.has(current));assert(!forces.has(current));forces.set(current,[]);continue;}
  if(current===null)continue;const a=line.trim().split(/\s+/);if(a.length!==7||!a.every(v=>Number.isFinite(Number(v))))continue;
  const [node,...values]=a.map(Number);assert(elements.get(current).nodeIds.includes(node));forces.get(current).push({node,F:values.slice(0,3),M:values.slice(3)});
 }
 assert.equal(forces.size,elements.size);
 let maxElementF=0,maxElementM=0;
 for(const [id,rr] of forces){const e=elements.get(id);assert.equal(rr.length,e.nodeIds.length);assert.equal(new Set(rr.map(r=>r.node)).size,e.nodeIds.length);const p=centroid(e);let F=load(e),M=[0,0,0];for(const r of rr){F=add(F,r.F);M=add(M,add(r.M,cross(sub(xyz(r.node),p),r.F)));}maxElementF=Math.max(maxElementF,...F.map(Math.abs));maxElementM=Math.max(maxElementM,...M.map(Math.abs));}
 assert(maxElementF<criteria.perElementForceN,`${name}: native corner-force body-load convention not verified ${maxElementF}`);
 assert(maxElementM<criteria.perElementMomentNm,`${name}: element moment residual ${maxElementM}`);
 const cuts=[];
 for(const cutMm of [1075,2275]){
  const origin=[1.5,cutMm/1000,.75],group=new Map(spec.selectedParts.map(p=>[p,{F:[0,0,0],M:[0,0,0],cutNodes:new Set()}]));let gravityF=[0,0,0],gravityM=[0,0,0],count=0;
  for(const e of elements.values()){
   const zs=e.nodeIds.map(id=>nodes.get(id).xyzMm[2]),lo=Math.min(...zs),hi=Math.max(...zs);
   assert(!(lo<cutMm-1e-6&&hi>cutMm+1e-6),'Cut must follow existing element boundaries');
   if(lo<cutMm-1e-6)continue;count++;const w=load(e);gravityF=add(gravityF,w);gravityM=add(gravityM,cross(sub(centroid(e),origin),w));
   for(const r of forces.get(e.id))if(Math.abs(nodes.get(r.node).xyzMm[2]-cutMm)<1e-6){const g=group.get(e.part);g.F=add(g.F,r.F);g.M=add(g.M,add(r.M,cross(sub(xyz(r.node),origin),r.F)));g.cutNodes.add(r.node);}
  }
  assert(count>0);let F=[0,0,0],M=[0,0,0];for(const g of group.values()){assert(g.cutNodes.size>1);F=add(F,g.F);M=add(M,g.M);}
  const fResidual=add(F,gravityF),mResidual=add(M,gravityM);
  assert(fResidual.every(v=>Math.abs(v)<criteria.sectionForceN),`${name} cut${cutMm} force ${fResidual}`);
  assert(mResidual.every(v=>Math.abs(v)<criteria.sectionMomentNm),`${name} cut${cutMm} moment ${mResidual}`);
  cuts.push({sourceCutHeightMm:cutMm,referenceSTAADm:origin,upperRegionElements:count,upperGravityForceN:gravityF,upperGravityMomentNm:gravityM,expectedCutForceN:neg(gravityF),expectedCutMomentNm:neg(gravityM),actualCutForceN:F,actualCutMomentNm:M,forceResidualN:fResidual,momentResidualNm:mResidual,byPart:Object.fromEntries([...group].map(([p,g])=>{const coords=[...g.cutNodes].map(xyz),ref=[0,1,2].map(k=>(Math.min(...coords.map(v=>v[k]))+Math.max(...coords.map(v=>v[k])))/2);return [p,{forceKN:g.F.map(v=>v/1000),momentKNm:g.M.map(v=>v/1000),ownSectionReferenceSTAADm:ref,momentAboutOwnSectionKNm:sub(g.M,cross(sub(ref,origin),g.F)).map(v=>v/1000),cutNodeCount:g.cutNodes.size}];}))});
 }
 results.push({case:name,analysisSha256:hash(bytes),inputSha256:hash(fs.readFileSync(path.join(folder,name+'.STD'))),maxElementForceResidualN:maxElementF,maxElementMomentResidualNm:maxElementM,cuts});
}
const report={status:'PASS_CORNER_FORCE_SECTION_EQUILIBRIUM_ONLY',specSha256:hash(fs.readFileSync(path.join(folder,'study-spec.json'))),criteria,results,
 method:'Native global corner forces are verified here to balance each element self-weight. Sum upper-side cut-node forces WITHOUT subtracting body loads a second time; compare to independent upper-region gravity resultants.',
 limitations:['This verifies section resultants, not local corner reinforcement or singular stress capacity.','Sections follow mesh boundaries at window sill/head. Both halves included in global equilibrium; crown actions cancel internally.','No final bearing, beam, whole-building or RC design approval.'],engineeringApproved:false};
fs.writeFileSync(path.join(folder,'section-cuts.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
