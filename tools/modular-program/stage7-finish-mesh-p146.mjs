import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const paths={map:'output/staad-p7-p145/floor-load-map.json',mesh:'output/staad-p7-p121/study-spec.json',std:'output/staad-p7-p121/PM-I-C1-RIGID-REFERENCE.STD'};
const p=read(paths.map).products.find(p=>p.productId==='PM-I-C1'),s=read(paths.mesh);
assert.equal(hash(p.sourceGeometry.path),p.sourceGeometry.sha256);
const nodes=new Map(s.nodes.map(n=>[n.id,n])),loads=new Map(),cells=[];
function rect(points){
  const x0=Math.min(...points.map(p=>p[0])),x1=Math.max(...points.map(p=>p[0]));
  const y0=Math.min(...points.map(p=>p[1])),y1=Math.max(...points.map(p=>p[1]));
  assert.equal(points.length,4);assert.ok(x1>x0&&y1>y0);
  const corners=points.map(([x,y])=>{assert.ok((Math.abs(x-x0)<1e-7||Math.abs(x-x1)<1e-7)&&(Math.abs(y-y0)<1e-7||Math.abs(y-y1)<1e-7));return `${x},${y}`;});
  assert.equal(new Set(corners).size,4);return {x0,x1,y0,y1};
}
function integral(lo,hi,a,b,upper){const length=hi-lo,mid=(lo+hi)/2;return length*(upper?(mid-a)/(b-a):(b-mid)/(b-a));}
function weights(r,c,xy){return xy.map(([x,y])=>integral(c.x0,c.x1,r.x0,r.x1,Math.abs(x-r.x1)<1e-7)*integral(c.y0,c.y1,r.y0,r.y1,Math.abs(y-r.y1)<1e-7)/1e6);}
assert.deepEqual(weights({x0:0,x1:1000,y0:0,y1:1000},{x0:0,x1:1000,y0:0,y1:1000},[[0,0],[1000,0],[1000,1000],[0,1000]]),[.25,.25,.25,.25]);
const half=weights({x0:0,x1:1000,y0:0,y1:1000},{x0:0,x1:500,y0:0,y1:1000},[[0,0],[1000,0],[1000,1000],[0,1000]]);
assert.deepEqual(half,[.1875,.0625,.0625,.1875]);
for(const patch of p.patches){
  const f=rect(patch.polygonXYmm);let area=0;
  for(const e of s.elements.filter(e=>e.part===patch.sourceConcreteInstance)){
    const xyz=e.nodeIds.map(id=>nodes.get(id).xyzMm);assert.ok(xyz.every(v=>Math.abs(v[2]-87.5)<1e-7));
    const r=rect(xyz),c={x0:Math.max(r.x0,f.x0),x1:Math.min(r.x1,f.x1),y0:Math.max(r.y0,f.y0),y1:Math.min(r.y1,f.y1)};
    if(c.x1<=c.x0||c.y1<=c.y0)continue;
    const a=(c.x1-c.x0)*(c.y1-c.y0)/1e6,w=weights(r,c,xyz);
    assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-a)<1e-10);
    const mx=w.reduce((v,q,i)=>v+q*xyz[i][0]/1000,0),my=w.reduce((v,q,i)=>v+q*xyz[i][1]/1000,0);
    assert.ok(Math.abs(mx-a*(c.x0+c.x1)/2000)<1e-9);
    assert.ok(Math.abs(my-a*(c.y0+c.y1)/2000)<1e-9);
    e.nodeIds.forEach((id,i)=>loads.set(id,(loads.get(id)??0)+w[i]));area+=a;
    cells.push({plateId:e.id,part:e.part,loadedAreaM2:a,intersectionMm:c,nodeIds:e.nodeIds,unitDownwardNodalKN:w});
  }
  assert.ok(Math.abs(area-patch.areaM2)<1e-8,`Unmapped or duplicate area ${patch.sourceConcreteInstance}`);
}
const expected={FyKN:-p.mappedAreaM2,MxKNm:p.patches.reduce((v,p)=>v-p.unitStudyMomentAboutXKNm,0),MzKNm:p.patches.reduce((v,p)=>v-p.unitStudyMomentAboutYKNm,0)};
const actual={FyKN:0,MxKNm:0,MzKNm:0};
const nodal=[...loads].map(([nodeId,f])=>{const v=nodes.get(nodeId).xyzMm;actual.FyKN-=f;actual.MxKNm+=f*v[1]/1000;actual.MzKNm-=f*v[0]/1000;return {nodeId,FyKN:-f};});
for(const k in actual)assert.ok(Math.abs(actual[k]-expected[k])<1e-8,k);
const transfer=process.argv.includes('--control-transfer');
const out=transfer?'output/staad-p7-p146-control-forces':'output/staad-p7-p146';fs.mkdirSync(out,{recursive:true});
const controls=new Map();for(const c of s.constraints)for(const id of c.dependents){assert.ok(!controls.has(id));controls.set(id,c.control);}
const applied=new Map();
for(const n of nodal){
  const target=transfer?(controls.get(n.nodeId)??n.nodeId):n.nodeId;
  const a=nodes.get(n.nodeId).xyzMm,b=nodes.get(target).xyzMm;
  const v=applied.get(target)??{nodeId:target,FyKN:0,MxKNm:0,MzKNm:0};
  v.FyKN+=n.FyKN;v.MxKNm-=n.FyKN*(a[1]-b[1])/1000;v.MzKNm+=n.FyKN*(a[0]-b[0])/1000;applied.set(target,v);
}
const transferred={FyKN:0,MxKNm:0,MzKNm:0};for(const a of applied.values()){
  const b=nodes.get(a.nodeId).xyzMm;transferred.FyKN+=a.FyKN;transferred.MxKNm+=a.MxKNm-a.FyKN*b[1]/1000;transferred.MzKNm+=a.MzKNm+a.FyKN*b[0]/1000;
}
for(const k in transferred)assert.ok(Math.abs(transferred[k]-expected[k])<1e-8);
const report={revision:'P146',productId:p.productId,status:'UNIT_FINISH_LOAD_MAPPING_ON_RIGID_REFERENCE_NOT_DESIGN',sources:Object.entries(paths).map(([role,path])=>({role,path,sha256:hash(path)})),
  method:'Exact bilinear translational nodal weights integrated over rectangular patch/plate intersections; force and first moments conserved. No claim of equivalence to native plate pressure bending interpolation.',
  sourceAxis:'X/Y plan Z up',staadAxis:'X/Y up/Z plan',unitStudyPressureKNm2:1,actualFinishPressureKNm2:null,
  mappedFloorParts:p.patches.length,loadedPlates:cells.length,loadedNodes:nodal.length,expectedAppliedResultant:expected,mappedAppliedResultant:actual,cells,nodal,
  controlTransfer:transfer,appliedCommands:[...applied.values()],transferredResultant:transferred,
  nativeRunVerified:false,engineeringApproved:false};
fs.writeFileSync(out+'/finish-mesh-map.json',JSON.stringify(report,null,2)+'\n');
const prefix=fs.readFileSync(paths.std,'utf8').split('LOAD 1 LOADTYPE Dead')[0].replace('JOB NAME FULL I C1 RIGID REFERENCE NOT DESIGN','JOB NAME UNIT FINISH MAP RIGID REFERENCE NOT DESIGN');
const lines=['LOAD 1 LOADTYPE Dead TITLE UNIT FINISH ONLY NOT DESIGN','JOINT LOAD',...[...applied.values()].flatMap(n=>[`${n.nodeId} FY ${n.FyKN.toFixed(12)}`,`${n.nodeId} MX ${n.MxKNm.toFixed(12)} MZ ${n.MzKNm.toFixed(12)}`]),'PERFORM ANALYSIS PRINT STATICS CHECK','UNIT METER NEWTON','PRINT SUPPORT REACTION','PRINT MEMBER FORCES GLOBAL ALL','PRINT ELEMENT FORCES ALL','FINISH'];
fs.writeFileSync(out+'/PM-I-C1-UNIT-FINISH.STD',prefix+lines.join('\n')+'\n');
fs.writeFileSync(out+'/study-spec.json',JSON.stringify({...s,status:report.status,unitFinishStudy:report,weightKN:null},null,2)+'\n');
console.log(JSON.stringify({...report,cells:undefined,nodal:undefined,appliedCommands:undefined},null,2));
