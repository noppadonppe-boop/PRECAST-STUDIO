import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const out=process.argv[2]??'output/staad-p7-p110', longitudinalMax=Number(process.argv[3]??250);assert(longitudinalMax>0);fs.mkdirSync(out,{recursive:true});
const compatibleInterfaces=process.argv.includes('--compatible-interfaces');
const raw=fs.readFileSync('output/stage3-designs-p36/I-C1/model.json'),m=JSON.parse(raw),nodes=[],elements=[],parts=[];
const vec=(a,b)=>a.map((x,k)=>x-b[k]);const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const area=f=>{let v=[0,0,0];for(let i=1;i<f.length-1;i++){let c=cross(vec(f[i],f[0]),vec(f[i+1],f[0]));v=v.map((x,k)=>x+c[k]/2);}return Math.hypot(...v);};
function split(values,max=250){const v=[...new Set(values)].sort((a,b)=>a-b),o=[v[0]];for(let i=1;i<v.length;i++){const n=Math.ceil((v[i]-v[i-1])/max);for(let j=1;j<=n;j++)o.push(v[i-1]+(v[i]-v[i-1])*j/n);}return o;}
function clip(p,k,t,ge){const out=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],u=ge?a[k]>=t:a[k]<=t,v=ge?b[k]>=t:b[k]<=t;if(u)out.push(a);if(u!==v){const f=(t-a[k])/(b[k]-a[k]);out.push(a.map((x,j)=>x+f*(b[j]-x)));}}return out;}
for(const piece of m.instances){
 const startNode=nodes.length,startEl=elements.length,map=new Map();
 const node=p=>{const key=p.map(x=>x.toFixed(6)).join(',');if(!map.has(key)){map.set(key,nodes.length+1);nodes.push({id:nodes.length+1,part:piece.id,xyzMm:p});}return map.get(key);};
 const add=f=>{const clean=f.filter((p,i)=>i===0||Math.hypot(...vec(p,f[i-1]))>1e-6);if(clean.length>2&&Math.hypot(...vec(clean[0],clean.at(-1)))<1e-6)clean.pop();if(clean.length<3||area(clean)<1e-5)return;
  if(clean.length>4){for(let j=1;j<clean.length-1;j++)add([clean[0],clean[j],clean[j+1]]);return;}
  elements.push({id:elements.length+1,part:piece.id,nodeIds:clean.map(node),areaMm2:area(clean),thicknessMm:piece.kind==='FLOOR'?175:150});};
 const [lo,hi]=[piece.boundsMm.min,piece.boundsMm.max];
 const sharedOpeningY=m.openings.filter(o=>m.instances.find(p=>p.id===o.instanceId)?.kind==='SHELL').flatMap(o=>o.cornersMm.map(p=>p[1])).filter(y=>y>lo[1]&&y<hi[1]);
 if(piece.kind==='SHELL'){
  assert.equal(m.family,'C');assert.equal(piece.axis,'Y');const rh=piece.side==='RH',op=m.openings.find(o=>o.instanceId===piece.id);
  const wall=split([175,...((op||compatibleInterfaces)?[1075,2275]:[]),2600]).map(z=>[75,z]);
  const arc=Array.from({length:32},(_,k)=>{const a=Math.PI-(k+1)*Math.PI/64;return [400+325*Math.cos(a),2600+325*Math.sin(a)];});
  const roof=split([400,1490]).slice(1).map(x=>[x,2925]);const profile=[...wall,...arc,...roof];
  const ys=split([lo[1],...(compatibleInterfaces?sharedOpeningY:(op?[op.cornersMm[0][1],op.cornersMm[1][1]]:[])),hi[1]],longitudinalMax);
  for(let s=0;s<profile.length-1;s++)for(let j=0;j<ys.length-1;j++){
   const a=profile[s],b=profile[s+1],z=(a[1]+b[1])/2,y=(ys[j]+ys[j+1])/2;
   if(op&&z>1075&&z<2275&&y>op.cornersMm[0][1]&&y<op.cornersMm[1][1]&&a[0]===75&&b[0]===75)continue;
   let f=[[a[0],ys[j],a[1]],[a[0],ys[j+1],a[1]],[b[0],ys[j+1],b[1]],[b[0],ys[j],b[1]]];
   if(rh)f=f.map(p=>[3000-p[0],p[1],p[2]]).reverse();add(f);
  }
 }else if(piece.kind==='FLOOR'){
  const xs=split([lo[0],hi[0]]),ys=compatibleInterfaces?split([lo[1],...sharedOpeningY,hi[1]],longitudinalMax):split([lo[1],hi[1]]);for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++)add([[xs[i],ys[j],87.5],[xs[i+1],ys[j],87.5],[xs[i+1],ys[j+1],87.5],[xs[i],ys[j+1],87.5]]);
 }else if(piece.kind==='END'){
  const caps=piece.facesMm.filter(f=>f.every(p=>Math.abs(p[1]-lo[1])<1e-6));assert(caps.length);
  const xs=split([lo[0],1000,2000,hi[0]]),zs=split([lo[2],2285,hi[2]]);
  for(const face of caps)for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
   let p=face.map(v=>[v[0],v[2]]);for(const[k,t,g]of[[0,xs[i],true],[0,xs[i+1],false],[1,zs[j],true],[1,zs[j+1],false]]){if(!p.length)break;p=clip(p,k,t,g);}if(p.length)add(p.map(v=>[v[0],(lo[1]+hi[1])/2,v[1]]));
  }
 }else throw Error('Unsupported '+piece.kind);
 const es=elements.slice(startEl),volume=es.reduce((s,e)=>s+e.areaMm2*e.thicknessMm/1e9,0),sourceVolume=piece.concreteMassKg/2400;
 assert(es.length>0);assert(Math.abs(volume/sourceVolume-1)<.002,`${piece.id} volume mismatch ${volume/sourceVolume}`);
 parts.push({id:piece.id,kind:piece.kind,elements:es.length,nodes:nodes.length-startNode,midsurfaceVolumeM3:volume,sourceVolumeM3:sourceVolume,relativeVolumeError:volume/sourceVolume-1});
}
assert.equal(parts.length,14);
for(const e of elements){assert.equal(new Set(e.nodeIds).size,e.nodeIds.length);assert(e.nodeIds.every(id=>nodes[id-1].part===e.part));}
const data={id:m.id,status:'GEOMETRY_ONLY_NOT_RUNNABLE_DESIGN',compatibleInterfaces,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),coordinateSystem:'source X/Y plan Z vertical; STD X/Yvertical/Zplan with orientation reflection',nodes,elements,parts,missing:['beam-seat analytical connection','joint DOF/stiffness','support constraints','material density E nu','loads combinations and code design'],engineeringApproved:false};
fs.writeFileSync(`${out}/pilot-mesh.json`,JSON.stringify(data,null,2)+'\n');
const lines=['STAAD SPACE','* GEOMETRY ONLY - NO ANALYSIS NO SUPPORTS NO DESIGN','UNIT METER KN','JOINT COORDINATES',...nodes.map(n=>`${n.id} ${n.xyzMm[0]/1000} ${n.xyzMm[2]/1000} ${n.xyzMm[1]/1000}`),'ELEMENT INCIDENCES SHELL',...elements.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),'ELEMENT PROPERTY',...elements.map(e=>`${e.id} THICKNESS ${e.thicknessMm/1000}`),'FINISH'];
fs.writeFileSync(`${out}/PM-I-C1-GEOMETRY-ONLY.STD`,lines.join('\n')+'\n');
console.log(JSON.stringify({parts:parts.length,nodes:nodes.length,elements:elements.length,maxVolumeError:Math.max(...parts.map(p=>Math.abs(p.relativeVolumeError))),status:data.status}));
