import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const out=process.argv[2]??'output/staad-p7-p148';fs.mkdirSync(out,{recursive:true});
const mapPath='output/staad-p7-p145/floor-load-map.json',map=JSON.parse(fs.readFileSync(mapPath));
const product=map.products.find(p=>p.productId==='PM-I-C1'),patch=product.patches[0];
const source=JSON.parse(fs.readFileSync(product.sourceGeometry.path)),floor=source.instances.find(p=>p.id===patch.sourceConcreteInstance);
const x0=floor.boundsMm.min[0],y0=floor.boundsMm.min[1],a=(floor.boundsMm.max[0]-x0)/1000,b=(floor.boundsMm.max[1]-y0)/1000,t=floor.thicknessMm/1000;
const px=patch.polygonXYmm.map(p=>(p[0]-x0)/1000),py=patch.polygonXYmm.map(p=>(p[1]-y0)/1000);
const actualPatchRect={x0:Math.min(...px),x1:Math.max(...px),z0:Math.min(...py),z1:Math.max(...py)};
// Isolate the dominant actual partial-cell boundary at z=0.1525m. The 3mm edge offsets
// would create grossly distorted aligned reference plates and are retained for a separate study.
const loadRect={x0:0,x1:a,z0:actualPatchRect.z0,z1:b};
const actualArea=(actualPatchRect.x1-actualPatchRect.x0)*(actualPatchRect.z1-actualPatchRect.z0);
const area=(loadRect.x1-loadRect.x0)*(loadRect.z1-loadRect.z0),centroid=[(loadRect.x0+loadRect.x1)/2,(loadRect.z0+loadRect.z1)/2];
assert.ok(Math.abs(actualArea-patch.areaM2)<1e-10);assert.deepEqual([a,b,t],[2.66,1.485,.175]);
const amplitude=1000;
function unique(a){return [...new Set(a.map(v=>+v.toFixed(12)))].sort((x,y)=>x-y);}
function split(points,max){points=unique(points);const out=[points[0]];for(let i=1;i<points.length;i++){const n=Math.ceil((points[i]-points[i-1])/max);for(let j=1;j<=n;j++)out.push(points[i-1]+(points[i]-points[i-1])*j/n);}return unique(out);}
function integral(lo,hi,a,b,upper){const length=hi-lo,mid=(lo+hi)/2;return length*(upper?(mid-a)/(b-a):(b-mid)/(b-a));}
function build(id,xs,zs,method){
 const nodes=[],elements=[],node=(i,j)=>j*xs.length+i+1,loads=new Map(),loaded=[];
 for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++)nodes.push({id:node(i,j),xyz:[xs[i],0,zs[j]],edge:i===0||j===0||i===xs.length-1||j===zs.length-1});
 for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
  const e={id:elements.length+1,nodeIds:[node(i,j),node(i+1,j),node(i+1,j+1),node(i,j+1)],rect:{x0:xs[i],x1:xs[i+1],z0:zs[j],z1:zs[j+1]}};elements.push(e);
  const c={x0:Math.max(e.rect.x0,loadRect.x0),x1:Math.min(e.rect.x1,loadRect.x1),z0:Math.max(e.rect.z0,loadRect.z0),z1:Math.min(e.rect.z1,loadRect.z1)};
  if(c.x1<=c.x0||c.z1<=c.z0)continue;
  if(method==='ALIGNED_NATIVE'){
   assert.ok(Math.abs(c.x0-e.rect.x0)<1e-10&&Math.abs(c.x1-e.rect.x1)<1e-10&&Math.abs(c.z0-e.rect.z0)<1e-10&&Math.abs(c.z1-e.rect.z1)<1e-10);
   loaded.push(e.id);
  }else{
   const xy=e.nodeIds.map(n=>nodes[n-1].xyz),w=xy.map(([x,,z])=>amplitude*integral(c.x0,c.x1,e.rect.x0,e.rect.x1,Math.abs(x-e.rect.x1)<1e-10)*integral(c.z0,c.z1,e.rect.z0,e.rect.z1,Math.abs(z-e.rect.z1)<1e-10));
   assert.ok(Math.abs(w.reduce((s,v)=>s+v,0)-amplitude*(c.x1-c.x0)*(c.z1-c.z0))<1e-7);
   e.nodeIds.forEach((n,k)=>loads.set(n,(loads.get(n)??0)+w[k]));
  }
 }
 const center=nodes.find(n=>Math.abs(n.xyz[0]-a/2)<1e-10&&Math.abs(n.xyz[2]-b/2)<1e-10);assert.ok(center);
 let total=0,mx=0,mz=0;
 if(method==='ALIGNED_NATIVE')for(const eid of loaded){const r=elements[eid-1].rect,q=amplitude*(r.x1-r.x0)*(r.z1-r.z0);total+=q;mx+=q*(r.z0+r.z1)/2;mz-=q*(r.x0+r.x1)/2;}
 else for(const [nid,q] of loads){const [x,,z]=nodes[nid-1].xyz;total+=q;mx+=q*z;mz-=q*x;}
 assert.ok(Math.abs(total-amplitude*area)<1e-6);assert.ok(Math.abs(mx-amplitude*area*centroid[1])<1e-6);assert.ok(Math.abs(mz+amplitude*area*centroid[0])<1e-6);
 const lines=['STAAD SPACE','UNIT METER KN','JOINT COORDINATES',...nodes.map(n=>`${n.id} ${n.xyz.join(' ')}`),'ELEMENT INCIDENCES SHELL',...elements.map(e=>`${e.id} ${e.nodeIds.join(' ')}`),'ELEMENT PROPERTY',`1 TO ${elements.length} THICKNESS ${t}`,'CONSTANTS','E 30000000 ALL','POISSON 0.2 ALL','SUPPORTS',...nodes.map(n=>`${n.id} FIXED BUT ${n.edge?'MX MZ':'FY MX MZ'}`),'LOAD 1 LOADTYPE None TITLE ACTUAL PARTIAL RECTANGLE SCALED TEST'];
 if(method==='ALIGNED_NATIVE')lines.push('ELEMENT LOAD',...loaded.map(id=>`${id} PR GY -${amplitude}`));else lines.push('JOINT LOAD',...[...loads].map(([id,q])=>`${id} FY ${(-q).toFixed(10)}`));
 lines.push('PERFORM ANALYSIS','UNIT METER NEWTON','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT ELEMENT STRESSES ALL','FINISH');
 fs.writeFileSync(`${out}/${id}.STD`,lines.join('\n')+'\n');return {id,method,xs,zs,nodeCount:nodes.length,elementCount:elements.length,loadedElementCount:loaded.length,loadedNodeCount:loads.size,centerNode:center.id,loadKN:amplitude*area};
}
const cases=[];
for(const n of [8,16,32,64]){
 const ux=Array.from({length:n+1},(_,i)=>a*i/n),uz=Array.from({length:n+1},(_,i)=>b*i/n);cases.push(build(`PARTIAL-UNALIGNED-${n}`,ux,uz,'EXACT_BILINEAR_NODAL'));
 const h=Math.max(a,b)/n,ax=split([0,loadRect.x0,a/2,loadRect.x1,a],h),az=split([0,loadRect.z0,b/2,loadRect.z1,b],h);cases.push(build(`PARTIAL-ALIGNED-${n}`,ax,az,'ALIGNED_NATIVE'));
}
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec={revision:'P148',purpose:'DOMINANT_ACTUAL_PARTIAL_CELL_BOUNDARY_SENSITIVITY_NOT_PRODUCT_DESIGN',sources:[{path:mapPath,sha256:hash(mapPath)},{path:product.sourceGeometry.path,sha256:hash(product.sourceGeometry.path)}],productId:product.productId,floorId:floor.id,patch,actualPatchRectangleM:actualPatchRect,localSlab:{aM:a,bM:b,tM:t},localLoadRectangleM:loadRect,areaM2:area,centroidM:centroid,E_KNm2:30e6,nu:.2,amplitudeKNm2:amplitude,normalization:'Linear results divided by1000 for unit1kN/m2; amplitude only improves printed precision.',support:'Isolated slab, vertical simple support along four edges; in-plane translations and drilling rotation restrained.',excludedGeometry:'The actual 3mm x-edge and upper z-edge offsets are excluded from this aligned-reference case because they create badly shaped 175mm-thick plate strips; exact mapping remains unaccepted for those edges pending a non-distorted refinement study.',criteria:{reactionResidualN:1,momentResidualNm:2,finestMethodRelativeDifference:.02,lastMeshRelativeChange:.02},cases,engineeringApproved:false};
fs.writeFileSync(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');console.log(JSON.stringify({areaM2:area,centroidM:centroid,cases:cases.map(c=>({id:c.id,nodes:c.nodeCount,elements:c.elementCount}))},null,2));
