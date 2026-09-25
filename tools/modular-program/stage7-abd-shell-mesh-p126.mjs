import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const out='output/staad-p7-p126';fs.mkdirSync(out,{recursive:true});const registerPath='output/abd-typicals-p08/register.json',regBytes=fs.readFileSync(registerPath),reg=JSON.parse(regBytes);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[];
function split(a,b,max=200){let n=Math.ceil((b-a)/max);return Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const family of ['A','B','D'])for(let use=1;use<=4;use++){
 const code=`I-${family}${use}`,sourcePath=`output/stage3-designs-p36/${code}/model.json`,raw=fs.readFileSync(sourcePath),s=JSON.parse(raw),base=reg.records.find(r=>r.family===family&&r.side==='LH'&&r.variant==='S00');assert(base);
 let wallX,zJ,xJ,roofZ;
 if(family==='A'){wallX=z=>75;xJ=75;roofZ=x=>2700+.2*x-base.parameters.innerVerticalDropMm/2;zJ=roofZ(xJ);}
 else if(family==='B'){wallX=z=>75;xJ=75;const [cx,cz]=base.parameters.centerMm,R=(base.parameters.outerRadiusMm+base.parameters.innerRadiusMm)/2;roofZ=x=>cz+Math.sqrt(R*R-(x-cx)**2);zJ=roofZ(xJ);}
 else{const k=base.parameters.wallSlopeDxDz;wallX=z=>k*(z-175)+base.parameters.horizontalWallThickness/2;zJ=2925;xJ=wallX(zJ);roofZ=x=>2925;}
 const nodes=[],elements=[],parts=[];
 for(const piece of s.instances.filter(p=>p.kind==='SHELL')){
  assert.equal(piece.axis,'Y');assert.equal(piece.sourceSha256,hash(regBytes));assert.equal(piece.normalThicknessMm,150);
  const op=s.openings.find(o=>o.instanceId===piece.id),allOps=s.openings.filter(o=>s.instances.find(p=>p.id===o.instanceId)?.kind==='SHELL');
  const zs=[175,...new Set(allOps.flatMap(o=>o.cornersMm.map(p=>p[2])))].filter(z=>z<zJ);zs.push(zJ);zs.sort((a,b)=>a-b);
  const wall=zs.flatMap((z,i)=>i?split(zs[i-1],z).slice(1).map(z=>[wallX(z),z]):[[wallX(z),z]]),roof=split(xJ,1490,family==='B'?35:200).slice(1).map(x=>[x,roofZ(x)]),profile=[...wall,...roof];
  const lo=piece.boundsMm.min[1],hi=piece.boundsMm.max[1],breaks=[...new Set([lo,...allOps.flatMap(o=>o.cornersMm.map(p=>p[1])).filter(y=>y>lo&&y<hi),hi])].sort((a,b)=>a-b),ys=breaks.flatMap((y,i)=>i?split(breaks[i-1],y,125).slice(1):[y]);
  const ids=new Map(),startN=nodes.length,startE=elements.length;function node(p){const k=p.map(v=>v.toFixed(6)).join(',');if(!ids.has(k)){ids.set(k,nodes.length+1);nodes.push({id:nodes.length+1,part:piece.id,xyzMm:p});}return ids.get(k);}
  const bounds=op?{y0:Math.min(...op.cornersMm.map(p=>p[1])),y1:Math.max(...op.cornersMm.map(p=>p[1])),z0:Math.min(...op.cornersMm.map(p=>p[2])),z1:Math.max(...op.cornersMm.map(p=>p[2]))}:null;
  for(let i=0;i<profile.length-1;i++)for(let j=0;j<ys.length-1;j++){const a=profile[i],b=profile[i+1],z=(a[1]+b[1])/2,y=(ys[j]+ys[j+1])/2;if(bounds&&i<wall.length-1&&y>bounds.y0&&y<bounds.y1&&z>bounds.z0&&z<bounds.z1)continue;let f=[[a[0],ys[j],a[1]],[a[0],ys[j+1],a[1]],[b[0],ys[j+1],b[1]],[b[0],ys[j],b[1]]];if(piece.side==='RH')f=f.map(p=>[3000-p[0],p[1],p[2]]).reverse();const area=Math.hypot(...cross(sub(f[1],f[0]),sub(f[3],f[0])));elements.push({id:elements.length+1,part:piece.id,nodeIds:f.map(node),areaMm2:area,thicknessMm:150});}
  const volume=elements.slice(startE).reduce((v,e)=>v+e.areaMm2*e.thicknessMm/1e9,0),sourceVolume=piece.concreteMassKg/2400,error=volume/sourceVolume-1;assert(Math.abs(error)<.002,`${piece.id}: ${error}`);parts.push({id:piece.id,kind:'SHELL',nodes:nodes.length-startN,elements:elements.length-startE,midsurfaceVolumeM3:volume,sourceVolumeM3:sourceVolume,relativeVolumeError:error});
 }
 assert.equal(parts.length,8);const folder=out+'/'+code;fs.mkdirSync(folder,{recursive:true});const mesh={id:s.id,sourcePath,sourceSha256:hash(raw),profileSourcePath:registerPath,profileSourceSha256:hash(regBytes),status:'SHELL_GEOMETRY_ONLY_NOT_FULL_BUILDING_NOT_RUNNABLE',nodes,elements,parts,excludedParts:s.instances.filter(p=>p.kind!=='SHELL').map(p=>({id:p.id,kind:p.kind})),engineeringApproved:false};fs.writeFileSync(folder+'/shell-mesh.json',JSON.stringify(mesh,null,2)+'\n');
 fs.writeFileSync(folder+'/'+s.id+'-SHELL-GEOMETRY.STD',['STAAD SPACE','* GEOMETRY ONLY NO SUPPORTS LOADS OR ANALYSIS','UNIT METER KN','JOINT COORDINATES',...nodes.map(n=>`${n.id} ${n.xyzMm[0]/1000} ${n.xyzMm[2]/1000} ${n.xyzMm[1]/1000}`),'ELEMENT INCIDENCES SHELL',...elements.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),'ELEMENT PROPERTY',...elements.map(e=>`${e.id} THICKNESS 0.15`),'FINISH',''].join('\n'));
 results.push({productId:s.id,folder,parts:8,nodes:nodes.length,elements:elements.length,maxVolumeError:Math.max(...parts.map(p=>Math.abs(p.relativeVolumeError)))});
}
fs.writeFileSync(out+'/index.json',JSON.stringify({revision:'P126',status:'12_TYPE_I_ABD_SHELL_MESHES_NOT_FULL_BUILDINGS',results,fullAnalyticalProductsCompleted:0,engineeringApproved:false},null,2)+'\n');console.log(JSON.stringify(results,null,2));
