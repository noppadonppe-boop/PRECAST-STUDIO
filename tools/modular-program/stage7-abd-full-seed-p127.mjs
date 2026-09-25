import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const root='output/staad-p7-p127';fs.mkdirSync(root,{recursive:true});const index=JSON.parse(fs.readFileSync('output/staad-p7-p126/index.json')),outputs=[];
function stations(a,b,extras=[]){const cuts=[...new Set([a,...extras.filter(v=>v>a&&v<b),b])].sort((a,b)=>a-b);return cuts.flatMap((v,i)=>{if(!i)return [v];const lo=cuts[i-1],n=Math.ceil((v-lo)/150);return Array.from({length:n},(_,j)=>lo+(v-lo)*(j+1)/n);});}
for(const p of index.results){const inputPath=p.folder+'/shell-mesh.json',inputBytes=fs.readFileSync(inputPath),mesh=JSON.parse(inputBytes),srcBytes=fs.readFileSync(mesh.sourcePath),s=JSON.parse(srcBytes);assert.equal(crypto.createHash('sha256').update(srcBytes).digest('hex'),mesh.sourceSha256);
 const {nodes,elements,parts}=mesh;
 for(const piece of s.instances.filter(p=>p.kind!=='SHELL')){
  const startN=nodes.length,startE=elements.length,lo=piece.boundsMm.min,hi=piece.boundsMm.max;
  if(piece.kind==='FLOOR'){
   const t=hi[2]-lo[2];assert.equal(t,175);const xs=stations(lo[0],hi[0]),ys=stations(lo[1],hi[1],s.openings.flatMap(o=>o.cornersMm.map(c=>c[1]))),map=new Map();
   function node(v){const key=v.join(',');if(!map.has(key)){map.set(key,nodes.length+1);nodes.push({id:nodes.length+1,part:piece.id,xyzMm:v});}return map.get(key);}
   for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const z=(lo[2]+hi[2])/2,f=[[xs[i],ys[j],z],[xs[i+1],ys[j],z],[xs[i+1],ys[j+1],z],[xs[i],ys[j+1],z]];elements.push({id:elements.length+1,part:piece.id,nodeIds:f.map(node),areaMm2:(xs[i+1]-xs[i])*(ys[j+1]-ys[j]),thicknessMm:t});}
   const vol=elements.slice(startE).reduce((v,e)=>v+e.areaMm2*e.thicknessMm/1e9,0),src=piece.concreteMassKg/2400;assert(Math.abs(vol/src-1)<1e-8);parts.push({id:piece.id,kind:piece.kind,nodes:nodes.length-startN,elements:elements.length-startE,midsurfaceVolumeM3:vol,sourceVolumeM3:src,relativeVolumeError:vol/src-1});
  }else{assert.equal(piece.kind,'END');assert.equal(hi[1]-lo[1],150);parts.push({id:piece.id,kind:'END',status:'PENDING_CONSTRAINED_TRIANGULATION',sourceVolumeM3:piece.concreteMassKg/2400});}
 }
 assert.equal(parts.length,14);mesh.status='PREMESH_ENDS_PENDING_NOT_ANALYTICAL_MODEL';mesh.predecessor={path:inputPath,sha256:crypto.createHash('sha256').update(inputBytes).digest('hex')};mesh.excludedParts=[];mesh.missing=['End triangulation pending in this seed','Compatible inter-part joint mapping','Beam/seat/support connectivity','Materials loads analysis and RC'];
 const folder=root+'/'+s.displayCode;fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/seed.json',JSON.stringify(mesh,null,2)+'\n');outputs.push({productId:s.id,folder});
}
fs.writeFileSync(root+'/seed-index.json',JSON.stringify({outputs},null,2)+'\n');console.log(JSON.stringify({seeds:outputs.length}));
