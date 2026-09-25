import fs from 'node:fs';import assert from 'node:assert/strict';
const input=process.argv[2]??'output/staad-p7-p110/pilot-mesh.json', reportPath=process.argv[3]??'output/staad-p7-p111/mesh-quality.json';
const mesh=JSON.parse(fs.readFileSync(input));
const source=JSON.parse(fs.readFileSync(mesh.sourcePath??'output/stage3-designs-p36/I-C1/model.json'));
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function clip(p,k,v,ge){const r=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],u=ge?a[k]>=v:a[k]<=v,w=ge?b[k]>=v:b[k]<=v;if(u)r.push(a);if(u!==w){const t=(v-a[k])/(b[k]-a[k]);r.push(a.map((x,j)=>x+t*(b[j]-x)));}}return r;}
function area2(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2);}
const defects=[],qualityFlags=[],parts=[];
for(const part of mesh.parts){const ns=mesh.nodes.filter(n=>n.part===part.id),es=mesh.elements.filter(e=>e.part===part.id),edges=new Map();let maxEdgeRatio=0,maxWarpMm=0;
 for(const e of es){const p=e.nodeIds.map(id=>mesh.nodes[id-1].xyzMm),v=p.map((a,i)=>sub(p[(i+1)%p.length],a)),lengths=v.map(norm),n=cross(v[0],v[1]),nn=norm(n);if(nn<1e-8){defects.push({element:e.id,type:'DEGENERATE'});continue;}
  const ratio=Math.max(...lengths)/Math.min(...lengths);maxEdgeRatio=Math.max(maxEdgeRatio,ratio);if(ratio>10)qualityFlags.push({element:e.id,type:'EDGE_RATIO_GT_10',value:ratio});
  if(p.length===3){const angles=p.map((a,i)=>{const u=sub(p[(i+1)%3],a),w=sub(p[(i+2)%3],a);return Math.acos(Math.max(-1,Math.min(1,dot(u,w)/(norm(u)*norm(w)))))*180/Math.PI;});if(Math.min(...angles)<5||Math.max(...angles)>165)qualityFlags.push({element:e.id,type:'TRIANGLE_ANGLE_SCREEN',anglesDeg:angles});}
  const warp=Math.max(...p.map(q=>Math.abs(dot(sub(q,p[0]),n))/nn));maxWarpMm=Math.max(maxWarpMm,warp);if(warp>.001)defects.push({element:e.id,type:'NONPLANAR',warpMm:warp});
  for(let i=0;i<v.length;i++)if(dot(cross(v[i],v[(i+1)%v.length]),n)<=0)defects.push({element:e.id,type:'NONCONVEX_OR_COLLINEAR'});
  for(let i=0;i<p.length;i++){const a=e.nodeIds[i],b=e.nodeIds[(i+1)%p.length],key=[a,b].sort((a,b)=>a-b).join(':');if(!edges.has(key))edges.set(key,[]);edges.get(key).push({element:e.id,a,b});}
  const op=source.openings.find(o=>o.instanceId===part.id);
  if(op){const horizontal=sub(op.cornersMm[1],op.cornersMm[0]),vertical=sub(op.cornersMm[3],op.cornersMm[0]),on=cross(horizontal,vertical),parallel=Math.abs(dot(on,n))/(norm(on)*nn)>1-1e-6;
   if(parallel){const k=Math.abs(horizontal[0])>Math.abs(horizontal[1])?0:1,us=op.cornersMm.map(q=>q[k]),zs=op.cornersMm.map(q=>q[2]);let poly=p.map(q=>[q[k],q[2]]);for(const [j,b,g]of[[0,Math.min(...us),true],[0,Math.max(...us),false],[1,Math.min(...zs),true],[1,Math.max(...zs),false]]){if(!poly.length)break;poly=clip(poly,j,b,g);}if(poly.length&&area2(poly)>.001)defects.push({element:e.id,type:'OPENING_OVERLAP',areaMm2:area2(poly)});}
  }
 }
 let boundaryEdges=0,hangingNodes=0;
 for(const uses of edges.values()){if(uses.length>2)defects.push({type:'NONMANIFOLD',uses});if(uses.length===2&&uses[0].a===uses[1].a)defects.push({type:'INCONSISTENT_NORMAL',uses});if(uses.length!==1)continue;boundaryEdges++;const {a,b,element}=uses[0],p=mesh.nodes[a-1].xyzMm,q=mesh.nodes[b-1].xyzMm,v=sub(q,p),vv=dot(v,v);
  for(const node of ns){if(node.id===a||node.id===b)continue;const r=node.xyzMm;if(r.some((x,k)=>x<Math.min(p[k],q[k])-1e-5||x>Math.max(p[k],q[k])+1e-5))continue;const w=sub(r,p),t=dot(w,v)/vv;if(t>1e-7&&t<1-1e-7&&norm(cross(w,v))/Math.sqrt(vv)<1e-5){hangingNodes++;defects.push({type:'HANGING_NODE',node:node.id,edge:[a,b],element});}}
 }
 parts.push({part:part.id,elements:es.length,boundaryEdges,hangingNodes,maxEdgeRatio,maxWarpMm});
}
const report={status:defects.length?'DEFECTS_FOUND':'LISTED_TOPOLOGY_AND_OPENING_CHECKS_PASS',defects,qualityFlags,parts,limitations:['Edge ratio threshold10 is a screening flag, not code criterion or convergence acceptance.','No numerical Jacobian sampling implemented; convex coplanar checks only.','Still requires beam-joint-coupling and actual analysis convergence.']};
fs.mkdirSync('output/staad-p7-p111',{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({...report,input},null,2)+'\n');console.log(JSON.stringify({status:report.status,defects:defects.length,qualityFlags:qualityFlags.length,types:[...new Set(defects.map(d=>d.type))],maxEdgeRatio:Math.max(...parts.map(p=>p.maxEdgeRatio))}));
