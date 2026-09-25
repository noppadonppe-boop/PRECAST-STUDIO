import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const out='output/staad-p7-p121';fs.mkdirSync(out,{recursive:true});
const oldPath='output/staad-p7-p115/pilot-mesh.json',old=JSON.parse(fs.readFileSync(oldPath)),source=JSON.parse(fs.readFileSync('output/stage3-designs-p36/I-C1/model.json'));
const axis=JSON.parse(fs.readFileSync('output/staad-p7-p108/PM-I-C1.json')),oldJoints=JSON.parse(fs.readFileSync('output/staad-p7-p115/joint-pairs.json'));
const nodes=[],elements=[],parts=[],oldIds=new Map(),links=[],nodeKeys=new Map();
const key=p=>p.map(v=>v.toFixed(6)).join(','),sub=(a,b)=>a.map((v,k)=>v-b[k]),norm=a=>Math.hypot(...a),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
function node(part,p){const k=part+':'+key(p);if(!nodeKeys.has(k)){nodeKeys.set(k,nodes.length+1);nodes.push({id:nodes.length+1,part,xyzMm:p});}return nodeKeys.get(k);}
function split(v,max=250){v=[...new Set(v.map(x=>Number(x.toFixed(6))))].sort((a,b)=>a-b);const out=[v[0]];for(let i=1;i<v.length;i++){const n=Math.ceil((v[i]-v[i-1])/max);for(let j=1;j<=n;j++)out.push(v[i-1]+(v[i]-v[i-1])*j/n);}return out;}
const endBase=old.nodes.filter(n=>source.instances.find(p=>p.id===n.part)?.kind==='END'&&Math.abs(n.xyzMm[2]-185)<1e-6);
const floorXs=split([170,2830,...endBase.map(n=>n.xyzMm[0])]);
for(const original of old.parts){
 const p=source.instances.find(p=>p.id===original.id),beforeN=nodes.length,beforeE=elements.length;
 if(p.kind!=='FLOOR'){
  for(const n of old.nodes.filter(n=>n.part===p.id))oldIds.set(n.id,node(p.id,n.xyzMm));
  for(const e of old.elements.filter(e=>e.part===p.id))elements.push({...e,id:elements.length+1,nodeIds:e.nodeIds.map(id=>oldIds.get(id))});
 }else{
  const lo=p.boundsMm.min,hi=p.boundsMm.max,ends=endBase.filter(n=>n.xyzMm[1]>=lo[1]&&n.xyzMm[1]<=hi[1]);
  const windowCuts=source.openings.filter(o=>source.instances.find(p=>p.id===o.instanceId)?.kind==='SHELL').flatMap(o=>o.cornersMm.map(p=>p[1])).filter(y=>y>lo[1]&&y<hi[1]);
  const ys=split([lo[1],...windowCuts,...ends.map(n=>n.xyzMm[1]),hi[1]],125);
  for(let i=0;i<floorXs.length-1;i++)for(let j=0;j<ys.length-1;j++){
   const x0=floorXs[i],x1=floorXs[i+1],y0=ys[j],y1=ys[j+1];
   elements.push({id:elements.length+1,part:p.id,nodeIds:[[x0,y0,87.5],[x1,y0,87.5],[x1,y1,87.5],[x0,y1,87.5]].map(v=>node(p.id,v)),thicknessMm:175,areaMm2:(x1-x0)*(y1-y0)});
  }
 }
 const volume=elements.slice(beforeE).reduce((s,e)=>s+e.areaMm2*e.thicknessMm/1e9,0),sourceVolume=p.concreteMassKg/2400;
 assert(Math.abs(volume/sourceVolume-1)<.002);parts.push({...original,nodes:nodes.length-beforeN,elements:elements.length-beforeE,midsurfaceVolumeM3:volume,sourceVolumeM3:sourceVolume,relativeVolumeError:volume/sourceVolume-1});
}
for(const j of oldJoints.joints.filter(j=>j.group!=='JO-FF'))for(const pair of j.pairs)links.push({group:j.group,nodes:[oldIds.get(pair.nodeA),oldIds.get(pair.nodeB)],assumption:'RIGID_REFERENCE_ONLY'});
const floorParts=source.instances.filter(p=>p.kind==='FLOOR').sort((a,b)=>a.boundsMm.min[1]-b.boundsMm.min[1]);
for(let i=0;i<floorParts.length-1;i++)for(const x of floorXs){
 const a=floorParts[i],b=floorParts[i+1];const na=nodeKeys.get(a.id+':'+key([x,a.boundsMm.max[1],87.5])),nb=nodeKeys.get(b.id+':'+key([x,b.boundsMm.min[1],87.5]));assert(na&&nb);links.push({group:'JO-FF',nodes:[na,nb],assumption:'RIGID_REFERENCE_ONLY'});
}
for(const n of endBase){const floor=floorParts.find(p=>n.xyzMm[1]>=p.boundsMm.min[1]&&n.xyzMm[1]<=p.boundsMm.max[1]);assert(floor);const nf=nodeKeys.get(floor.id+':'+key([n.xyzMm[0],n.xyzMm[1],87.5]));assert(nf);links.push({group:'JO-END-BASE',nodes:[nf,oldIds.get(n.id)],assumption:'FIXED_END_PANEL_BASE_TO_FLOOR_TRIAL_NO_ROOF_OR_SIDE_TIES'});}
const shellNodeCount=nodes.length;
const strips=axis.axisMm.map((a,i)=>({a,b:axis.axisMm[(i+1)%axis.axisMm.length],stations:[0,1]}));
function project(p,s){const d=sub(s.b,s.a),t=Math.max(0,Math.min(1,dot(sub(p,s.a),d)/dot(d,d))),xy=s.a.map((v,k)=>v+t*d[k]);return {t,xy,distanceMm:norm(sub(p,xy))};}
for(const s of strips)for(const f of axis.supports){const q=project(f.xyMm,s);if(q.distanceMm<1e-6)s.stations.push(q.t);}
const seats=[];
for(const n of nodes){const p=source.instances.find(p=>p.id===n.part);if(!p||p.kind==='END')continue;
 if(p.kind==='SHELL'&&Math.abs(n.xyzMm[2]-175)>1e-6)continue;
 if(p.kind==='FLOOR'&&!n.xyzMm.slice(0,2).some((v,k)=>Math.abs(v-p.boundsMm.min[k])<1e-6||Math.abs(v-p.boundsMm.max[k])<1e-6))continue;
 const candidates=strips.map((s,i)=>({...project(n.xyzMm.slice(0,2),s),edge:i})).filter(c=>n.xyzMm.slice(0,2).every((v,k)=>v>=Math.min(strips[c.edge].a[k],strips[c.edge].b[k])-125-1e-6&&v<=Math.max(strips[c.edge].a[k],strips[c.edge].b[k])+125+1e-6));
 if(!candidates.length)continue;candidates.sort((a,b)=>a.distanceMm-b.distanceMm||a.edge-b.edge);const c=candidates[0];strips[c.edge].stations.push(c.t);seats.push({sourceNode:n.id,part:n.part,chosenProjection:c,otherCandidates:candidates.slice(1),assumption:'RIGID_SEAT_REFERENCE_CLOSEST_GEOMETRIC_PROJECTION_NOT_CAPACITY_VERIFIED'});
}
const beamMembers=[];
strips.forEach((s,edge)=>{
 const length=norm(sub(s.b,s.a)),ts=split(s.stations.map(t=>t*length),250).map(x=>x/length);
 for(let i=0;i<ts.length-1;i++){const ps=[ts[i],ts[i+1]].map(t=>[s.a[0]+t*(s.b[0]-s.a[0]),s.a[1]+t*(s.b[1]-s.a[1]),-200]);const ids=ps.map(p=>node('BEAM',p)),len=norm(sub(ps[1],ps[0]));assert(len>.01&&len<=250.0001);beamMembers.push({id:elements.length+beamMembers.length+1,nodes:ids,edge:edge+1,lengthMm:len,widthMm:250,depthMm:400});}
});
for(const s of seats){const b=nodeKeys.get('BEAM:'+key([...s.chosenProjection.xy,-200]));assert(b);links.push({group:'JO-SEAT',nodes:[b,s.sourceNode],assumption:s.assumption});s.beamNode=b;}
const supports=axis.supports.map(f=>{const id=nodeKeys.get('BEAM:'+key([...f.xyMm,-200]));assert(id);return {...f,node:id,DOF:'PINNED_TRANSLATIONS_FIXED_ROTATIONS_FREE_TRIAL'};});assert.equal(supports.length,6);
assert(Math.abs(beamMembers.reduce((s,m)=>s+m.lengthMm,0)-17000)<1e-5);
function uf(){const p=new Map(nodes.map(n=>[n.id,n.id]));function find(x){assert(p.has(x));let r=x;while(p.get(r)!==r)r=p.get(r);while(p.get(x)!==x){const next=p.get(x);p.set(x,r);x=next;}return r;}return {find,join:(a,b)=>p.set(find(a),find(b))};}
const rigid=uf();for(const l of links){assert(l.nodes.every(Boolean));rigid.join(...l.nodes);}
const groups=new Map();for(const n of nodes){const r=rigid.find(n.id);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(n.id);}
const supportIds=new Set(supports.map(s=>s.node));const constraints=[...groups.values()].filter(g=>g.length>1).map(g=>{const supported=g.filter(n=>supportIds.has(n));assert(supported.length<=1,'Rigid group must not lock two foundations together');const control=supported[0]??g.find(n=>nodes[n-1].part==='BEAM')??g[0];return {control,dependents:g.filter(n=>n!==control),specification:'RIGID_REFERENCE_ONLY'};});
const connected=uf();for(const e of [...elements,...beamMembers]){const ids=e.nodeIds??e.nodes;for(const n of ids.slice(1))connected.join(ids[0],n);}for(const l of links)connected.join(...l.nodes);assert.equal(new Set(nodes.map(n=>connected.find(n.id))).size,1);
let weightKN=0,cgSum=[0,0,0];const gamma=2400*9.80665/1000;
for(const e of [...elements,...beamMembers]){const ids=e.nodeIds??e.nodes,v=e.nodeIds?e.areaMm2*e.thicknessMm/1e9:e.lengthMm*250*400/1e9,w=v*gamma;weightKN+=w;for(let k=0;k<3;k++)cgSum[k]+=w*ids.reduce((s,id)=>s+nodes[id-1].xyzMm[k],0)/ids.length;}
const mesh={id:source.id,status:'FULL_GEOMETRY_WITH_RIGID_REFERENCE_NOT_DESIGN',sourceSha256:old.sourceSha256,nodes:nodes.slice(0,shellNodeCount),elements,parts};
fs.writeFileSync(out+'/pilot-mesh.json',JSON.stringify(mesh,null,2)+'\n');
const spec={status:'FULL_I_C1_ALL_RIGID_REFERENCE_SELFWEIGHT_NOT_DESIGN',nodes,elements,parts,beamMembers,supports,seats,links,constraints,weightKN,cgSourceMm:cgSum.map(x=>x/weightKN),trial:{E_KNm2:30000000,nu:.2,densityKgM3:2400,unitWeightKNm3:gamma,beamCentroidZmm:-200},criteria:{forceResidualN:5,momentResidualNm:10,warningCount:0,errorCount:0},excluded:['Actual connection flexibility/contact and RC capacity','Code load combinations, LL, finishes, wind, seismic, handling, prestress','END-to-roof and side ties; END base fixed to floor is a trial','Foundation stiffness/design and bearing capacity','All other 47 products'],geometrySourceHash:crypto.createHash('sha256').update(fs.readFileSync(oldPath)).digest('hex'),engineeringApproved:false};
fs.writeFileSync(out+'/study-spec.json',JSON.stringify(spec,null,2)+'\n');
function wrap(tokens){const lines=[];let s='';for(const t of tokens){if(s.length+t.length+1>76){lines.push(s+' -');s=t;}else s+=(s?' ':'')+t;}if(s)lines.push(s);return lines;}
const lines=['STAAD SPACE','START JOB INFORMATION','JOB NAME FULL I C1 RIGID REFERENCE NOT DESIGN','END JOB INFORMATION','UNIT METER KN','JOINT COORDINATES',...nodes.map(n=>`${n.id} ${n.xyzMm[0]/1000} ${n.xyzMm[2]/1000} ${n.xyzMm[1]/1000}`),'MEMBER INCIDENCES',...beamMembers.map(m=>`${m.id} ${m.nodes.join(' ')}`),'ELEMENT INCIDENCES SHELL',...elements.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),'MEMBER PROPERTY',...beamMembers.map(m=>`${m.id} PRIS YD 0.4 ZD 0.25`),'ELEMENT PROPERTY',...elements.map(e=>`${e.id} THICKNESS ${e.thicknessMm/1000}`),'CONSTANTS','E 30000000 ALL','POISSON 0.2 ALL',`DENSITY ${gamma} ALL`,'SUPPORTS',...supports.map(s=>`${s.node} PINNED`),...constraints.flatMap(c=>wrap(['DEPENDENT','RIGID','CONTROL',String(c.control),'JOINT',...c.dependents.map(String)])),'LOAD 1 LOADTYPE Dead TITLE TRIAL SELFWEIGHT ALL RIGID','SELFWEIGHT Y -1','PERFORM ANALYSIS PRINT STATICS CHECK','UNIT METER NEWTON','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT MEMBER FORCES ALL','PRINT ELEMENT STRESSES ALL','FINISH'];
const printEnd=lines.indexOf('FINISH');lines.splice(printEnd,0,'PRINT MEMBER FORCES GLOBAL ALL','PRINT ELEMENT FORCES ALL');
fs.writeFileSync(out+'/PM-I-C1-RIGID-REFERENCE.STD',lines.join('\n')+'\n');
console.log(JSON.stringify({parts:parts.length,shellNodes:shellNodeCount,shellElements:elements.length,beamMembers:beamMembers.length,minBeamLengthMm:Math.min(...beamMembers.map(m=>m.lengthMm)),rigidGroups:constraints.length,maxRigidGroupSize:Math.max(...constraints.map(c=>c.dependents.length+1)),supports:supports.length,weightKN,cgSourceMm:spec.cgSourceMm},null,2));
