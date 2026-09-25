import fs from 'node:fs';import assert from 'node:assert/strict';
const out='output/staad-p7-p109';fs.mkdirSync(out,{recursive:true});
const area=p=>Math.abs(p.reduce((s,a,i)=>{let b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2);
function clip(p,k,bound,greater){const q=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ina=greater?a[k]>=bound:a[k]<=bound,inb=greater?b[k]>=bound:b[k]<=bound;if(ina)q.push(a);if(ina!==inb){const t=(bound-a[k])/(b[k]-a[k]);q.push(a.map((x,j)=>x+(b[j]-x)*t));}}return q;}
function rectClip(poly,r){let p=poly;for(const [k,b,g]of[[0,r[0],true],[0,r[2],false],[1,r[1],true],[1,r[3],false]]){if(!p.length)break;p=clip(p,k,b,g);}return p;}
const records=[];
for(const dir of fs.readdirSync('output/stage3-designs-p36')){
 const src=`output/stage3-designs-p36/${dir}/model.json`;if(!fs.existsSync(src))continue;const m=JSON.parse(fs.readFileSync(src));if(!m.id?.startsWith('PM-'))continue;
 const axes=JSON.parse(fs.readFileSync(`output/staad-p7-p108/${m.id}.json`));
 const strips=axes.axisMm.map((a,i)=>{const b=axes.axisMm[(i+1)%axes.axisMm.length];return {edge:i+1,rectMm:[Math.min(a[0],b[0])-125,Math.min(a[1],b[1])-125,Math.max(a[0],b[0])+125,Math.max(a[1],b[1])+125]};});
 const floors=m.instances.filter(i=>i.kind==='FLOOR').map(i=>{
  const bottom=i.facesMm.filter(f=>f.length>=3&&f.every(p=>Math.abs(p[2]-i.boundsMm.min[2])<1e-5)).map(f=>f.map(p=>p.slice(0,2)));assert(bottom.length>0,`No bottom: ${i.id}`);
  const contacts=strips.map(s=>{const patches=bottom.map(p=>rectClip(p,s.rectMm)).filter(p=>p.length>=3&&area(p)>1);return {beamEdge:s.edge,areaMm2:patches.reduce((n,p)=>n+area(p),0),polygonsMm:patches};}).filter(c=>c.areaMm2>1);
  return {id:i.id,typicalId:i.typicalId,bottomElevationMm:i.boundsMm.min[2],thicknessMm:i.boundsMm.max[2]-i.boundsMm.min[2],contacts,contactEdgeCount:contacts.length,capacityVerified:false,loadPathStatus:'REQUIRES_SPAN_JOINT_AND_BEARING_DESIGN'};
 });
 const seats=m.instances.filter(i=>['SHELL','NODE_WALL','END'].includes(i.kind)).map(i=>({id:i.id,kind:i.kind,bottomElevationMm:i.boundsMm.min[2],referenceBeamTopTrialMm:0,verticalDifferenceMm:i.boundsMm.min[2],bearingDetail:null}));
 const record={id:m.id,status:'PLAN_CONTACT_AND_LEVEL_AUDIT_NOT_CAPACITY_CHECK',source:src,axisSource:`output/staad-p7-p108/${m.id}.json`,trialLevel:{floorUndersideMm:0,beamTopMm:0,beamBottomMm:-400,beamCentroidMm:-200,note:'Study coordinates only; actual bearing pad/grout thickness requires coordinated datum.'},floors,seats,limitations:['Overlap polygons are per beam strip and must not be added across overlapping corner strips as unique area.','Contact edge count is not a test of adequate support, stability or plate span.','No automatic rigid link or internal beam is authorized by this audit.','END panels may transfer through floor; a separate tall pedestal is NOT automatically required for every bottom elevation.']};
 fs.writeFileSync(`${out}/${m.id}.json`,JSON.stringify(record,null,2)+'\n');records.push({id:m.id,floors:floors.length,zeroPlanContacts:floors.filter(f=>f.contacts.length===0).map(f=>f.id),singleEdgeContacts:floors.filter(f=>f.contacts.length===1).map(f=>f.id),seatLevelsMm:[...new Set(seats.map(s=>s.bottomElevationMm))]});
}
assert.equal(records.length,48);const index={status:'AUDIT_COMPLETE_NOT_LOADPATH_APPROVED',count:48,records};fs.writeFileSync(`${out}/index.json`,JSON.stringify(index,null,2)+'\n');console.log(JSON.stringify({products:48,floors:records.reduce((s,r)=>s+r.floors,0),zeroContacts:records.flatMap(r=>r.zeroPlanContacts).length,singleEdgeContacts:records.flatMap(r=>r.singleEdgeContacts).length,levels:[...new Set(records.flatMap(r=>r.seatLevelsMm))]},null,2));
