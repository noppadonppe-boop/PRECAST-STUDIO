import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const root='output/staad-p7-p119';fs.mkdirSync(root,{recursive:true});
const sourcePath='output/staad-p7-p115/pilot-mesh.json',source=JSON.parse(fs.readFileSync(sourcePath));
const selected=['PM-I-C1-I-S01-LH','PM-I-C1-I-S01-RH'];
let current={...source,nodes:source.nodes.filter(n=>selected.includes(n.part)),elements:source.elements.filter(e=>selected.includes(e.part)),parts:source.parts.filter(p=>selected.includes(p.id))};
const areaSum=m=>m.elements.reduce((s,e)=>s+e.areaMm2,0),originalArea=areaSum(current);
const sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const avg=ps=>[0,1,2].map(k=>ps.reduce((s,p)=>s+p[k],0)/ps.length);
const area=p=>{let a=[0,0,0];for(let i=1;i<p.length-1;i++){const c=cross(sub(p[i],p[0]),sub(p[i+1],p[0]));a=a.map((x,k)=>x+c[k]/2);}return Math.hypot(...a);};
const levels=[];
for(let level=1;level<=2;level++){
 const oldNodes=new Map(current.nodes.map(n=>[n.id,n])),nodes=[],elements=[],keys=new Map();
 function node(part,p){const key=part+':'+p.map(v=>v.toFixed(7)).join(',');if(!keys.has(key)){keys.set(key,nodes.length+1);nodes.push({id:nodes.length+1,part,xyzMm:p});}return keys.get(key);}
 for(const e of current.elements){
  assert.equal(e.nodeIds.length,4);const p=e.nodeIds.map(id=>oldNodes.get(id).xyzMm),mid=p.map((q,i)=>avg([q,p[(i+1)%4]])),centre=avg(p);
  for(let i=0;i<4;i++){const q=[p[i],mid[i],centre,mid[(i+3)%4]],a=area(q);assert(a>0);assert(Math.abs(a-e.areaMm2/4)<1e-4);elements.push({id:elements.length+1,part:e.part,nodeIds:q.map(p=>node(e.part,p)),thicknessMm:e.thicknessMm,areaMm2:a,parentElement:e.id});}
 }
 assert.equal(elements.length,current.elements.length*4);
 const parts=selected.map(id=>{const es=elements.filter(e=>e.part===id),original=source.parts.find(p=>p.id===id),volume=es.reduce((s,e)=>s+e.areaMm2*e.thicknessMm/1e9,0);return {...original,nodes:nodes.filter(n=>n.part===id).length,elements:es.length,midsurfaceVolumeM3:volume,relativeVolumeError:volume/original.sourceVolumeM3-1};});
 current={...source,nodes,elements,parts,refinementLevel:level,refinementNote:'Bilinear subdivision of existing planar quads; retains original 32 curved-profile facets. Not a curvature-discretization study.'};
 assert(Math.abs(areaSum(current)-originalArea)<1e-4);
 const folder=`${root}/r${level}`;fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/pilot-mesh.json`,JSON.stringify(current,null,2)+'\n');
 levels.push({level,meshPath:`${folder}/pilot-mesh.json`,nodes:nodes.length,elements:elements.length});
}
const plan={status:'CRITERIA_RECORDED_BEFORE_NATIVE_REFINEMENT_RUN',sourcePath,sourceHash:crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),baselineRun:'output/staad-p7-p118/runs/bce8e402c45f4bf8b5f9593f13d6700c',levels,criteria:{lastRefinementMaxDownwardRelativeChange:.05,lastRefinementBaseHorizontalRelativeChange:.05,lastRefinementCrownMomentRelativeChange:.05,crownMomentNearZeroThresholdKNm:.01},limits:['Both hinge/rigid crown cases must be compared.','Do not accept local peak shell force convergence from displacement convergence.','Base ideal support, material and load assumptions unchanged.','Curve facets not refined; whole-building convergence not tested.']};
fs.writeFileSync(`${root}/refinement-plan.json`,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify(plan,null,2));
