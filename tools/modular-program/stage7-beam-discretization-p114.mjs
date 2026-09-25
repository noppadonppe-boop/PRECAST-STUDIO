import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Geometry/load-transfer preprocessor, NOT an interface stiffness model.
const input=process.argv[2]??'output/staad-p7-p113/beam-joint-map.json';
const old=JSON.parse(fs.readFileSync(input));
const axis=JSON.parse(fs.readFileSync(old.axisSource));
const mesh=JSON.parse(fs.readFileSync(old.meshSource));
const out=process.argv[3]??'output/staad-p7-p114';
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,k)=>a.map(x=>x*k);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const close=(a,b,tol=1e-7)=>assert(norm(sub(a,b))<tol);
const nodes=[],members=[],lookup=new Map();
function node(xy){
  const key=xy.map(x=>x.toFixed(7)).join(',');
  if(!lookup.has(key)){
    const id=mesh.nodes.length+nodes.length+1;
    lookup.set(key,id);nodes.push({id,xyzMm:[...xy,old.trialDatum.beamCentroidZmm]});
  }
  return lookup.get(key);
}
for(let edge=0;edge<axis.axisMm.length;edge++){
  const a=axis.axisMm[edge],b=axis.axisMm[(edge+1)%axis.axisMm.length];
  const d=sub(b,a),length=norm(d),cuts=[0,1];
  for(const s of axis.supports){
    const t=dot(sub(s.xyMm,a),d)/dot(d,d);
    if(t>=0&&t<=1&&norm(sub(s.xyMm,add(a,mul(d,t))))<1e-6)cuts.push(t);
  }
  const ts=[...new Set(cuts)].sort((x,y)=>x-y);
  for(let k=0;k<ts.length-1;k++){
    const n=Math.ceil((ts[k+1]-ts[k])*length/250);
    for(let j=0;j<n;j++){
      const t0=ts[k]+(ts[k+1]-ts[k])*j/n,t1=ts[k]+(ts[k+1]-ts[k])*(j+1)/n;
      const p=add(a,mul(d,t0)),q=add(a,mul(d,t1));
      members.push({id:mesh.elements.length+members.length+1,edge:edge+1,nodes:[node(p),node(q)],lengthMm:norm(sub(q,p)),widthMm:250,depthMm:400});
    }
  }
}
const byId=new Map(nodes.map(n=>[n.id,n.xyzMm]));
const seats=old.seatCandidates.map(seat=>({
  sourceNode:seat.sourceNode,part:seat.part,kind:seat.kind,
  actualLoadDistribution:null,DOF:null,stiffness:null,capacity:null,
  candidates:seat.candidates.map(c=>{
    const p=[...c.xy,old.trialDatum.beamCentroidZmm];
    const m=members.find(m=>{
      if(m.edge!==c.edge)return false;
      const a=byId.get(m.nodes[0]),d=sub(byId.get(m.nodes[1]),a),t=dot(sub(p,a),d)/dot(d,d);
      return t>=-1e-7&&t<=1+1e-7&&norm(sub(p,add(a,mul(d,t))))<1e-6;
    });
    assert(m,'Every projected seat must lie on a beam');
    const a=byId.get(m.nodes[0]),b=byId.get(m.nodes[1]);
    const t=Math.max(0,Math.min(1,dot(sub(p,a),sub(b,a))/dot(sub(b,a),sub(b,a))));
    const weights=[1-t,t];close(add(mul(a,weights[0]),mul(b,weights[1])),p);
    return {edge:c.edge,projectedXyzMm:p,beamMember:m.id,beamNodes:m.nodes,geometricWeights:weights,offsetSourceMinusProjectionMm:sub(mesh.nodes[seat.sourceNode-1].xyzMm,p)};
  })
}));
const supports=axis.supports.map(s=>{
  const n=nodes.find(n=>norm(sub(n.xyzMm.slice(0,2),s.xyMm))<1e-6);assert(n);
  return {...s,node:n.id,DOF:null,stiffness:null};
});
const degrees=new Map(nodes.map(n=>[n.id,0]));
for(const m of members)for(const id of m.nodes)degrees.set(id,degrees.get(id)+1);
assert([...degrees.values()].every(d=>d===2));assert.equal(supports.length,6);
assert(Math.abs(members.reduce((s,m)=>s+m.lengthMm,0)-17000)<1e-6);
assert(members.every(m=>m.lengthMm>=200&&m.lengthMm<=250.000001));
// Independent equilibrium exercises. All positions converted to metres.
// This preserves resultants; it does NOT establish elastic compatibility or capacity.
let tested=0,maxForceError=0,maxMomentError=0;
for(const seat of seats)for(const c of seat.candidates){
  const x=mul(mesh.nodes[seat.sourceNode-1].xyzMm,.001);
  const r=mul(c.offsetSourceMinusProjectionMm,.001);
  for(const [F,M] of [ [[1,0,0],[0,0,0]],[[0,1,0],[0,0,0]],[[0,0,1],[0,0,0]],[[2,-3,5],[7,11,-13]] ]){
    const shiftedMoment=add(M,cross(r,F));
    let sumF=[0,0,0],sumM=[0,0,0];
    c.beamNodes.forEach((id,i)=>{
      const f=mul(F,c.geometricWeights[i]),m=mul(shiftedMoment,c.geometricWeights[i]);
      sumF=add(sumF,f);sumM=add(sumM,add(m,cross(mul(byId.get(id),.001),f)));
    });
    const forceError=norm(sub(sumF,F)),momentError=norm(sub(sumM,add(M,cross(x,F))));
    maxForceError=Math.max(maxForceError,forceError);maxMomentError=Math.max(maxMomentError,momentError);
    assert(forceError<1e-9&&momentError<1e-9);tested++;
  }
}
fs.mkdirSync(out,{recursive:true});
const data={...old,status:'REGULAR_BEAM_MESH_WITH_GEOMETRIC_SEAT_MAPPING_NOT_COUPLED',previousRevision:input,beamNodes:nodes,beamMembers:members,supports,seatCandidates:seats,
  limits:[...old.limits,'Geometric weights and equilibrium tests are NOT beam bending shape functions or a shell-beam stiffness coupling.','Forces/moments used in tests are artificial unit cases, not product analysis results.']};
fs.writeFileSync(`${out}/beam-joint-map.json`,JSON.stringify(data,null,2)+'\n');
const lines=['STAAD SPACE','* GEOMETRY ONLY - NO INTERFACE STIFFNESS OR ANALYSIS','UNIT METER KN','JOINT COORDINATES',...[...mesh.nodes,...nodes].map(n=>`${n.id} ${n.xyzMm[0]/1000} ${n.xyzMm[2]/1000} ${n.xyzMm[1]/1000}`),'MEMBER INCIDENCES',...members.map(m=>`${m.id} ${m.nodes.join(' ')}`),'ELEMENT INCIDENCES SHELL',...mesh.elements.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),'MEMBER PROPERTY',...members.map(m=>`${m.id} PRIS YD 0.4 ZD 0.25`),'ELEMENT PROPERTY',...mesh.elements.map(e=>`${e.id} THICKNESS ${e.thicknessMm/1000}`),'FINISH'];
fs.writeFileSync(`${out}/PM-I-C1-BEAM-SHELL-GEOMETRY.STD`,lines.join('\n')+'\n');
const report={status:'PASS_GEOMETRY_AND_RESULTANT_MAPPING_ONLY',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),previousBeamMembers:old.beamMembers.length,previousShortestMm:Math.min(...old.beamMembers.map(m=>m.lengthMm)),beamMembers:members.length,beamNodes:nodes.length,minMemberLengthMm:Math.min(...members.map(m=>m.lengthMm)),maxMemberLengthMm:Math.max(...members.map(m=>m.lengthMm)),supportCount:supports.length,seatCount:seats.length,artificialEquilibriumCases:tested,maxForceErrorKN:maxForceError,maxMomentErrorKNm:maxMomentError,productAnalysed:false};
fs.writeFileSync(`${out}/verification.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
