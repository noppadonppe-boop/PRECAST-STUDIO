import fs from 'node:fs';import assert from 'node:assert/strict';
const meshPath=process.argv[2]??'output/staad-p7-p112/pilot-mesh.json';
const mesh=JSON.parse(fs.readFileSync(meshPath));
const source=JSON.parse(fs.readFileSync('output/stage3-designs-p36/I-C1/model.json'));
const axis=JSON.parse(fs.readFileSync('output/staad-p7-p108/PM-I-C1.json'));
const beamNodes=[],beamMembers=[],nodeMap=new Map(),seatCandidates=[],jointEdges=[];
const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
const strips=axis.axisMm.map((a,i)=>({a,b:axis.axisMm[(i+1)%axis.axisMm.length],stations:[0,1]}));
function project(p,s){const d=sub(s.b,s.a),t=Math.max(0,Math.min(1,dot(sub(p,s.a),d)/dot(d,d))),xy=s.a.map((v,k)=>v+t*d[k]);return {t,xy,distanceMm:Math.hypot(...sub(p,xy))};}
const beamNode=p=>{const key=p.map(v=>v.toFixed(6)).join(',');if(!nodeMap.has(key)){nodeMap.set(key,mesh.nodes.length+beamNodes.length+1);beamNodes.push({id:mesh.nodes.length+beamNodes.length+1,xyzMm:[...p,-200]});}return nodeMap.get(key);};
for(const s of strips){const length=Math.hypot(...sub(s.b,s.a)),n=Math.ceil(length/250);for(let i=1;i<n;i++)s.stations.push(i/n);for(const f of axis.supports){const q=project(f.xyMm,s);if(q.distanceMm<1e-5)s.stations.push(q.t);}}
for(const part of mesh.parts){
 const piece=source.instances.find(i=>i.id===part.id),edges=new Map();
 for(const e of mesh.elements.filter(e=>e.part===part.id))for(let j=0;j<e.nodeIds.length;j++){const a=e.nodeIds[j],b=e.nodeIds[(j+1)%e.nodeIds.length],key=[a,b].sort((x,y)=>x-y).join(':');if(!edges.has(key))edges.set(key,{a,b,count:0});edges.get(key).count++;}
 const boundary=[...edges.values()].filter(e=>e.count===1);
 const bnodes=[...new Set(boundary.flatMap(e=>[e.a,e.b]))];
 for(const id of bnodes){const p=mesh.nodes[id-1].xyzMm;
  if(part.kind==='SHELL'&&Math.abs(p[2]-175)>1e-5)continue;
  if(!['SHELL','FLOOR'].includes(part.kind))continue;
  const possible=[];strips.forEach((s,k)=>{const q=project(p.slice(0,2),s);const inRect=p.slice(0,2).every((v,j)=>v>=Math.min(s.a[j],s.b[j])-125-1e-6&&v<=Math.max(s.a[j],s.b[j])+125+1e-6);if(inRect){s.stations.push(q.t);possible.push({edge:k+1,...q});}});
  if(possible.length)seatCandidates.push({sourceNode:id,part:part.id,kind:part.kind,candidates:possible,actualLoadDistribution:null,DOF:null,stiffness:null,capacity:null});
 }
 for(const e of boundary){const p=mesh.nodes[e.a-1].xyzMm,q=mesh.nodes[e.b-1].xyzMm,eq=(k,v)=>Math.abs(p[k]-v)<1e-5&&Math.abs(q[k]-v)<1e-5;let group=null;
  if(part.kind==='SHELL'&&(eq(0,1490)||eq(0,1510)))group='JO-CR';
  else if(part.kind==='SHELL'&&eq(2,175))group='JO-BS';
  else if(['SHELL','FLOOR'].includes(part.kind)&&[1492.5,1507.5,2992.5,3007.5,4492.5,4507.5].some(y=>eq(1,y)))group=part.kind==='FLOOR'?'JO-FF':'JO-BY';
  else if(part.kind==='END'&&eq(2,185))group='JO-END-BASE';
  if(group)jointEdges.push({group,part:part.id,nodes:[e.a,e.b],lengthMm:Math.hypot(...sub(q,p)),pairing:null,DOF:null,stiffness:null,detail:null});
 }
}
strips.forEach((s,k)=>{const ts=[...new Set(s.stations.map(t=>Number(t.toFixed(12))))].sort((a,b)=>a-b);for(let j=0;j<ts.length-1;j++){const points=[ts[j],ts[j+1]].map(t=>s.a.map((v,i)=>v+t*(s.b[i]-v))),a=beamNode(points[0]),b=beamNode(points[1]);const length=Math.hypot(...sub(points[1],points[0]));assert(length>1e-6&&length<=250.0001);beamMembers.push({id:mesh.elements.length+beamMembers.length+1,edge:k+1,nodes:[a,b],lengthMm:length,widthMm:250,depthMm:400});}});
const supports=axis.supports.map(s=>{const nearest=beamNodes.find(n=>Math.hypot(...sub(n.xyzMm.slice(0,2),s.xyMm))<1e-5);assert(nearest);return {...s,node:nearest.id,DOF:null,stiffness:null};});
for(const seat of seatCandidates)for(const c of seat.candidates){const b=beamNodes.find(n=>Math.hypot(...sub(n.xyzMm.slice(0,2),c.xy))<1e-5);assert(b);c.beamNode=b.id;c.offsetSourceMinusBeamMm=sub(mesh.nodes[seat.sourceNode-1].xyzMm,b.xyzMm);}
assert.equal(supports.length,6);assert.equal(new Set(beamNodes.map(n=>n.id)).size,beamNodes.length);
assert(Math.abs(beamMembers.reduce((s,m)=>s+m.lengthMm,0)-17000)<1e-5);
const deg=new Map(beamNodes.map(n=>[n.id,0]));for(const e of beamMembers)for(const n of e.nodes)deg.set(n,deg.get(n)+1);assert([...deg.values()].every(n=>n===2));
const out=process.argv[3]??'output/staad-p7-p113';fs.mkdirSync(out,{recursive:true});
const data={id:source.id,status:'BEAM_AND_INTERFACE_GEOMETRY_NO_COUPLING_OR_ANALYSIS',meshSource:meshPath,axisSource:'output/staad-p7-p108/PM-I-C1.json',trialDatum:{beamCentroidZmm:-200,beamTopZmm:0,wallBottomZmm:175,floorMidZmm:87.5},beamNodes,beamMembers,supports,seatCandidates,jointEdges,limits:['Candidate mappings are not rigid links or connectors.','More than one candidate near a corner requires load distribution; never duplicate load at each candidate.','Interpolation needed at nonmatching mesh interfaces; nearest-node tying is not validated.','END base load path is not assigned to beam automatically.']};
fs.writeFileSync(`${out}/beam-joint-map.json`,JSON.stringify(data,null,2)+'\n');
const lines=['STAAD SPACE','* GEOMETRY ONLY - JOINT COUPLING NOT DEFINED','UNIT METER KN','JOINT COORDINATES',...[...mesh.nodes,...beamNodes].map(n=>`${n.id} ${n.xyzMm[0]/1000} ${n.xyzMm[2]/1000} ${n.xyzMm[1]/1000}`),'MEMBER INCIDENCES',...beamMembers.map(e=>`${e.id} ${e.nodes.join(' ')}`),'ELEMENT INCIDENCES SHELL',...mesh.elements.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),'MEMBER PROPERTY',...beamMembers.map(e=>`${e.id} PRIS YD 0.4 ZD 0.25`),'ELEMENT PROPERTY',...mesh.elements.map(e=>`${e.id} THICKNESS ${e.thicknessMm/1000}`),'FINISH'];
fs.writeFileSync(`${out}/PM-I-C1-BEAM-SHELL-GEOMETRY.STD`,lines.join('\n')+'\n');console.log(JSON.stringify({beamNodes:beamNodes.length,beamMembers:beamMembers.length,supports:supports.length,seatNodeCandidates:seatCandidates.length,jointEdgeSegments:jointEdges.length,totalBeamAxisM:17,groups:[...new Set(jointEdges.map(e=>e.group))]}));
