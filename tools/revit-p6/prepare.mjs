import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(), out=path.join(root,'output/revit-p6');
fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const index=read('output/stage2-review-p35/typical-index.json');
const cat=read('output/stage3-designs-p36/catalogue.json');
const library={}, models=[], dependencies=[];
const average=pts=>[0,1,2].map(k=>pts.reduce((s,p)=>s+p[k],0)/pts.length);
const sub=(a,b)=>a.map((v,k)=>v-b[k]);
const round=v=>Math.round(v*1e6)/1e6;
function prisms(faces,origin){
 const result=[];
 for(let i=0;i<faces.length;){
  const f=faces[i], n=f.length, other=faces[i+1];
  if(!other || other.length!==n || i+n+2>faces.length)throw Error('Invalid prism decomposition at '+i);
  let profile=f, opposite=other;
  const congruent=(p,q)=>{const d=sub(average(q),average(p));return p.every((r,j)=>{const edge=sub(p[(j+1)%p.length],r);return Math.abs(edge.reduce((s,v,k)=>s+v*d[k],0))<.001*Math.hypot(...edge)*Math.hypot(...d) && q.some(s=>Math.hypot(...sub(sub(s,r),d))<.001);});};
  if(!congruent(profile,opposite)){
   const chunk=faces.slice(i,i+n+2);let found=false;
   for(let a=0;a<chunk.length&&!found;a++)for(let b=a+1;b<chunk.length&&!found;b++)if(chunk[a].length===chunk[b].length && congruent(chunk[a],chunk[b])){profile=chunk[a];opposite=chunk[b];found=true;}
   if(!found)throw Error('Non-extrudable solid');
  }
  const delta=sub(average(opposite),average(profile));
  const len=Math.hypot(...delta);
  if(len<.5)throw Error('Invalid prism depth');
  result.push({profile:profile.map(p=>sub(p,origin).map(round)),direction:delta.map(v=>v/len),depth:round(len)});
  i+=n+2;
 }
 return result;
}
for(const item of cat.products){
 const pth='output/stage3-designs-p36/'+item.displayCode+'/model.json';
 const bytes=fs.readFileSync(path.join(root,pth)), m=JSON.parse(bytes);
 dependencies.push({path:pth,sha256:hash(bytes)});
 const instances=m.instances.map(i=>{
  if(!index.entries.some(t=>t.id===i.typicalId))throw Error('Unknown typical '+i.typicalId);
  const pr=prisms(i.facesMm,i.boundsMm.min);
  const key=i.typicalId+'-'+hash(JSON.stringify(pr)).slice(0,8);
  if(!library[key])library[key]={key,typicalId:i.typicalId,kind:i.kind,prisms:pr,source:i.source,sourceSha256:i.sourceSha256,expectedVolumeM3:i.concreteMassKg/2400,bounds:sub(i.boundsMm.max,i.boundsMm.min),nativeFloor:i.kind==='FLOOR'};
  return {...Object.fromEntries(Object.entries(i).filter(([k])=>!['facesMm','planCutPolygonsMm'].includes(k))),familyKey:key};
 });
 models.push({...m,instances,sourcePath:pth,sourceSha256:hash(bytes)});
}
models.sort((a,b)=>a.id==='PM-I-C1'?-1:b.id==='PM-I-C1'?1:a.id.localeCompare(b.id));
const used=new Set(Object.values(library).map(l=>l.typicalId));
const missing=index.entries.filter(t=>!used.has(t.id));
if(missing.length)throw Error('Unrepresented typicals '+missing.map(t=>t.id));
const manifest={revision:'P102',stage:6,sourceRevision:'P36',status:'INPUT_VERIFIED',productCount:models.length,instanceCount:models.reduce((s,m)=>s+m.instances.length,0),typicalCount:used.size,geometryVariantCount:Object.keys(library).length,dependencies,engineeringApproved:false,productionReleased:false};
fs.writeFileSync(path.join(out,'input.json'),JSON.stringify({manifest,library:Object.values(library),models}));
fs.writeFileSync(path.join(out,'input-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({...manifest,dependencies:dependencies.length},null,2));
