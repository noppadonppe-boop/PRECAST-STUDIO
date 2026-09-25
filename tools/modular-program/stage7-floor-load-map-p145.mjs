import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function props(p){
  let s=0,x=0,y=0;
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=a[0]*b[1]-b[0]*a[1];s+=c;x+=(a[0]+b[0])*c;y+=(a[1]+b[1])*c;}
  return {areaM2:Math.abs(s)/2e6,centroidMm:Math.abs(s)>1e-8?[x/(3*s),y/(3*s)]:null,signed:s};
}
function ccw(p){return props(p).signed<0?[...p].reverse():p;}
function convex(p){p=ccw(p);return p.every((a,i)=>cross(a,p[(i+1)%p.length],p[(i+2)%p.length])>=-1e-6);}
function triangles(poly){
  const p=ccw(poly).map(v=>[...v]),out=[];
  for(let i=p.length-1;i>=0;i--)if(Math.abs(cross(p[(i+p.length-1)%p.length],p[i],p[(i+1)%p.length]))<1e-7)p.splice(i,1);
  while(p.length>3){
    let found=false;
    for(let i=0;i<p.length;i++){
      const ai=(i+p.length-1)%p.length,ci=(i+1)%p.length,a=p[ai],b=p[i],c=p[ci];
      if(cross(a,b,c)<=1e-7)continue;
      if(p.some((v,j)=>j!==ai&&j!==i&&j!==ci&&cross(a,b,v)>=-1e-7&&cross(b,c,v)>=-1e-7&&cross(c,a,v)>=-1e-7))continue;
      out.push([a,b,c]);p.splice(i,1);found=true;break;
    }
    assert.ok(found,'Cannot triangulate polygon: inspect source');
  }
  out.push(p);
  assert.ok(Math.abs(out.reduce((s,t)=>s+props(t).areaM2,0)-props(poly).areaM2)<1e-8);
  return out;
}
function intersectionArea(a,b){return triangles(a).reduce((s,ta)=>s+triangles(b).reduce((v,tb)=>v+props(clip(ta,tb)).areaM2,0),0);}
function clip(subject,boundary){
  assert.ok(convex(boundary),'Nonconvex clipping boundary requires different algorithm');
  let out=subject;
  boundary=ccw(boundary);
  for(let i=0;i<boundary.length;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length],input=out;out=[];
    for(let j=0;j<input.length;j++){
      const p=input[j],q=input[(j+1)%input.length],dp=cross(a,b,p),dq=cross(a,b,q),ip=dp>=-1e-7,iq=dq>=-1e-7;
      if(ip)out.push(p);
      if(ip!==iq){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
    }
  }
  return out;
}
const square=[[0,0],[1000,0],[1000,1000],[0,1000]];
assert.deepEqual(props(square).centroidMm,[500,500]);
assert.equal(props(clip(square,[...square].reverse())).areaM2,1);
assert.equal(props(clip(square,square.map(([x,y])=>[x+500,y]))).areaM2,.5);
assert.equal(props(clip(square,square.map(([x,y])=>[x+2000,y]))).areaM2,0);
assert.equal(convex([[0,0],[1000,0],[500,200],[1000,1000],[0,1000]]),false);
const concave=[[0,0],[2000,0],[2000,1000],[1000,1000],[1000,2000],[0,2000]];
assert.equal(intersectionArea(concave,concave),3);
assert.equal(intersectionArea(concave,[[1500,1500],[2000,1500],[2000,2000],[1500,2000]]),0);
const inputPath='output/staad-p7-p144/arc-load-intake.json',input=read(inputPath);
const products=[];
for(const p of input.products){
  assert.equal(hash(p.arcManifest.manifestPath),p.arcManifest.manifestSha256);
  const ledgerPath=`output/staad-p7-p123/${p.productId}.json`,ledger=read(ledgerPath);
  assert.equal(hash(ledger.source),ledger.sourceSha256);
  assert.equal(hash(p.sourceCoordination.path),p.sourceCoordination.sha256);
  const model=read(ledger.source);
  let floors=p.floorGeometry,pilotSource=null;
  if(!floors){
    assert.equal(p.productId,'PM-I-B3');
    const file='tools/revit-p61/build_pilot.py',src=fs.readFileSync(file,'utf8');
    assert.ok(src.includes('[(160,1485),(1515,2985),(3015,4485),(4515,5840)]'));
    assert.ok(src.includes('rect(170,a,2660,b-a)'));
    pilotSource={path:file,sha256:hash(file),method:'RECOVERED_BUILD_RECIPE_CHECKED_AGAINST_NATIVE_TOTAL_AREA_NOT_NATIVE_POLYGON_REEXPORT'};
    floors=[[160,1485],[1515,2985],[3015,4485],[4515,5840]].map(([a,b],i)=>({
      sourceConcreteInstance:`PM-I-B3-I-S0${i+1}-F`,polygonXYmm:[[170,a],[2830,a],[2830,b],[170,b]],finishTopMm:185,studyThicknessMm:10
    }));
  }
  const patches=[];
  for(const f of floors){
    const solid=model.instances.find(i=>i.id===f.sourceConcreteInstance);assert.ok(solid,`${p.productId} missing ${f.sourceConcreteInstance}`);
    const z=Math.max(...solid.facesMm.flat().map(v=>v[2]));
    const top=solid.facesMm.filter(face=>face.every(v=>Math.abs(v[2]-z)<1e-6));
    assert.equal(top.length,1,`${solid.id}: requires multi-face top handling`);
    const boundary=top[0].map(v=>v.slice(0,2));
    const a=props(f.polygonXYmm),intersection={areaM2:intersectionArea(f.polygonXYmm,boundary)};
    assert.ok(a.areaM2>0);
    assert.ok(Math.abs(a.areaM2-intersection.areaM2)<1e-8,`${solid.id}: finish overhang`);
    assert.ok(Math.abs(f.finishTopMm-f.studyThicknessMm-z)<1e-6,`${solid.id}: vertical gap`);
    patches.push({sourceConcreteInstance:solid.id,typicalId:solid.typicalId,polygonXYmm:f.polygonXYmm,
      concreteTopMm:z,finishUndersideMm:f.finishTopMm-f.studyThicknessMm,areaM2:a.areaM2,centroidXYmm:a.centroidMm,
      mappedAreaM2:intersection.areaM2,unitPressureKNm2:1,unitStudyDownwardForceKN:a.areaM2,
      unitStudyMomentAboutXKNm:-a.areaM2*a.centroidMm[1]/1000,
      unitStudyMomentAboutYKNm:a.areaM2*a.centroidMm[0]/1000,
      finalFinishPressureKNm2:null,finalDeadLoadKN:null,staadPlateIds:null});
  }
  for(let i=0;i<patches.length;i++)for(let j=i+1;j<patches.length;j++)
    assert.ok(intersectionArea(patches[i].polygonXYmm,patches[j].polygonXYmm)<1e-8,`${p.productId}: finish patches overlap`);
  const area=patches.reduce((s,f)=>s+f.areaM2,0);
  assert.ok(Math.abs(area-p.nativeFinishAreaM2)<1e-6,`${p.productId}: native area differs`);
  const force=patches.reduce((s,f)=>s+f.unitStudyDownwardForceKN,0);
  assert.ok(Math.abs(force-area)<1e-9);
  assert.ok(patches.every(f=>f.finalFinishPressureKNm2===null&&f.finalDeadLoadKN===null&&f.staadPlateIds===null));
  products.push({productId:p.productId,sourceGeometry:{path:ledger.source,sha256:hash(ledger.source)},pilotSource,
    nativeAreaM2:p.nativeFinishAreaM2,mappedAreaM2:area,patches,
    route:'FINISH_TO_CONCRETE_TOP_ONLY_NOT_FLOOR_TO_BEAM_OR_FOUNDATION_REACTIONS',
    finalLoadCaseReady:false});
}
assert.equal(products.length,48);
const report={revision:'P145',status:'GEOMETRIC_FLOOR_FINISH_MAPPING_NOT_STRUCTURAL_ANALYSIS',
  source:{path:inputPath,sha256:hash(inputPath)},coordinateSystem:'SOURCE_GEOMETRY_XY_PLAN_Z_UP_MM; moments use r cross (0,0,-F), not STAAD axis assignment',
  productCount:products.length,patchCount:products.reduce((s,p)=>s+p.patches.length,0),
  checks:['ear triangulation and convex triangle clipping including concave top faces','finish footprint fully supported geometrically','vertical face contact','no finish patch overlap','native total area comparison','unit force and moment coefficients'],
  limitations:['Unit pressure is a mathematical coefficient, not an adopted finish load.','Recipe-to-solid mapping does not establish bearing capacity, joint stiffness, or mesh load mapping.','Furniture and MEP support positions and actual weights remain separate unresolved inputs.','Pilot polygons reconstructed from build source; native total area cross-check only.'],
  engineeringApproved:false,productionReleased:false,products};
fs.mkdirSync('output/staad-p7-p145',{recursive:true});
fs.writeFileSync('output/staad-p7-p145/floor-load-map.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,products:undefined},null,2));
