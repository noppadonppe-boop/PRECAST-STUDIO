import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {profileTools} from './abd-roof-frame-p65.mjs';import {tube,properties,cellFaces} from './prism-tools-p54.mjs';import {collide} from './abd-base-lock-p66.mjs';import {swept} from './cap-geometry-p55.mjs';
export function probe(key,edgeDistance=50,{reuseNearEdge=false,extendWallWalers=false,innerWallDistance=null}={}){
 const base=JSON.parse(fs.readFileSync(`output/abd-base-lock-p66/${key}.json`)),lh=JSON.parse(fs.readFileSync(`output/abd-base-lock-p66/${key.replace('-RH-','-LH-')}.json`)),web=JSON.parse(fs.readFileSync(`output/abd-roof-web-p71/${key}.json`)),seam=JSON.parse(fs.readFileSync(`output/seam-hardware-p74/${key}.json`)),s=key.startsWith('D')?200/2825:0,L=Math.hypot(1,s),xy=([u,v])=>[(u+s*v)/L,(-s*u+v)/L],ribs=[],reused=[];
 for(const owner of ['M01','M02','M03','M04']){
  const part=lh.parts.find(p=>p.tag===owner),wall=['M01','M03'].includes(owner);let length,origin=0,make;
  if(wall){const v=part.contactEdgesMm.flat().map(([x,y])=>(s*x+y)/L);origin=Math.min(...v);length=Math.max(...v)-origin;const u=owner==='M01'?-106:156;make=t=>tube(2,[u,t+origin-25,30],[u+100,t+origin+25,1485],5).map(c=>({...c,poly:c.poly.map(xy)}));}
  else {const profile=profileTools(part.contactEdgesMm);length=profile.length;const band=profile.band;make=t=>[...band(6,11,t-25,t+25,30,1485),...band(101,106,t-25,t+25,30,1485),...band(11,101,t-25,t-20,30,1485),...band(11,101,t+20,t+25,30,1485)];}
  const existing=(wall?lh.wallFrameStock:lh.roofFrameStock).filter(p=>p.owner===owner&&p.role.includes(wall?'RHS100':'PROFILE_BOX')).map(p=>(wall?(p.localMinMm[1]+p.localMaxMm[1])/2:p.dimensions.profileStationMm)-origin);
  const push=(tag,cells,extra={})=>{if(key.includes('-RH-'))cells=cells.map(c=>({...c,poly:c.poly.map(([x,y])=>[1490-x,y]).reverse()}));ribs.push({tag,owner,...extra,cells,properties:properties(cells)});};
  const distance=owner==='M03'&&innerWallDistance!==null?innerWallDistance:edgeDistance;
  for(const [i,t]of [distance,length-distance].entries()){
   const near=existing.filter(v=>(i===0?v:length-v)<=edgeDistance+50+1e-7);
   if(reuseNearEdge&&near.length){reused.push({owner,end:i===0?'START':'END',existingStationsMm:near});continue;}
   push(`${owner}-EDGE-${i+1}`,make(t),{stationMm:t,lengthMm:length});
   if(wall&&extendWallWalers&&i===1){for(const w of lh.wallFrameStock.filter(p=>p.owner===owner&&p.role==='SHS100_WALER'&&Math.abs(p.localMaxMm[1]-(origin+length-250))<.001)){
    const lo=[...w.localMinMm],hi=[...w.localMaxMm];lo[1]=hi[1];hi[1]=origin+length-distance+25;
    if(hi[1]>lo[1])push(`${w.tag}-EXT`,tube(1,lo,hi,5).map(c=>({...c,poly:c.poly.map(xy)})),{role:'WALER_EXTENSION',parentStock:w.tag,localMinMm:lo,localMaxMm:hi,spliceDesignVerified:false});
   }}
  }
 }
 const hits=[];for(const p of ribs){if(collide(p.cells,base.concrete.cells))hits.push([p.tag,'CONCRETE']);for(const q of [...base.parts,...seam.plates,...seam.hardware])if(collide(p.cells,q.cells))hits.push([p.tag,q.tag]);for(const q of web.stock)if(p.cells.some(c=>q.solids.some(f=>swept(cellFaces(c),f))))hits.push([p.tag,q.tag]);}
 for(let i=0;i<ribs.length;i++)for(let j=0;j<i;j++)if(collide(ribs[i].cells,ribs[j].cells))hits.push([ribs[i].tag,ribs[j].tag]);
 return {revision:'P78-PROBE',key,edgeDistanceMm:edgeDistance,innerWallDistance,reuseNearEdge,extendWallWalers,reused,ribs,staticHits:hits,status:hits.length?'INTERFERENCE_REQUIRES_REVISION':'STATIC_CLEAR_ONLY_NO_MOTION_OR_CAPACITY_DESIGN',engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const key=process.argv[2]??'A-LH-S00',d=Number(process.argv[3]??50),m=probe(key,d);fs.mkdirSync('output/abd-edge-rib-probe-p78',{recursive:true});fs.writeFileSync(`output/abd-edge-rib-probe-p78/${key}-e${d}.json`,JSON.stringify(m,null,2));console.log({key,d,hits:m.staticHits});}
