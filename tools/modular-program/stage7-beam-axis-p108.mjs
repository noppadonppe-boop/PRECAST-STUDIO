import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const out='output/staad-p7-p108';fs.mkdirSync(out,{recursive:true});const records=[];
const area=p=>p.reduce((s,a,i)=>{let b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2;
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];const sub=(a,b)=>a.map((v,i)=>v-b[i]);
for(const dir of fs.readdirSync('output/stage3-designs-p36')){
 const source=`output/stage3-designs-p36/${dir}/model.json`;if(!fs.existsSync(source))continue;
 const raw=fs.readFileSync(source),m=JSON.parse(raw);if(!m.id?.startsWith('PM-'))continue;
 const footprint=m.footprintMm,sign=Math.sign(area(footprint));assert(sign!==0);
 const edges=footprint.map((a,i)=>{const b=footprint[(i+1)%footprint.length],v=sub(b,a),L=Math.hypot(...v);assert(L>250);assert(v[0]===0||v[1]===0);const inward=[-v[1]/L*sign,v[0]/L*sign];return {a:a.map((x,j)=>x+125*inward[j]),v,inward};});
 const axis=edges.map((cur,i)=>{const prev=edges[(i+edges.length-1)%edges.length];const den=cross(prev.v,cur.v);assert(den!==0);const t=cross(sub(cur.a,prev.a),cur.v)/den;return prev.a.map((x,j)=>x+t*prev.v[j]);});
 assert(Math.sign(area(axis))===sign);assert(Math.abs(area(axis))<Math.abs(area(footprint)));
 const supports=[],spans=[];for(let i=0;i<axis.length;i++){
  const a=axis[i],b=axis[(i+1)%axis.length],L=Math.hypot(...sub(b,a)),n=Math.ceil(L/3000);
  for(let j=0;j<n;j++){supports.push({id:`F${String(supports.length+1).padStart(2,'0')}`,xyMm:a.map((x,k)=>x+(b[k]-x)*j/n),corner:j===0});spans.push({edge:i+1,lengthMm:L/n});}
 }
 assert(spans.every(s=>s.lengthMm<=3000));assert.equal(new Set(supports.map(s=>s.xyMm.join(','))).size,supports.length);
 const record={product:m.id,source,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),status:'PROPOSED_AXIS_NOT_ACCEPTED_NOT_CAPACITY_CHECKED',coordinateSystem:'P36 X/Y plan, Z vertical, mm',beam:{widthMm:250,depthMm:400,insetAxisMm:125,topElevationMm:null},footprintMm:footprint,axisMm:axis,supports,spans,limitations:['Equal subdivision is a positioning proposal, not final footing layout.','Footing capacity, soil, joint DOF, bearing lengths and beam torsion are not verified.','Do not silently substitute this proposal for P105 or change source models.']};
 const floorStudy=m.plan==='I'?m.instances.filter(i=>i.kind==='FLOOR').map(i=>({id:i.id,leftFloorEdgeXmm:i.boundsMm.min[0],rightFloorEdgeXmm:i.boundsMm.max[0],originalBeamInboardFaceXmm:125,originalLeftGapMm:i.boundsMm.min[0]-125,proposedBeamInboardFaceXmm:250,proposedLeftNominalOverlapMm:250-i.boundsMm.min[0],proposedRightNominalOverlapMm:i.boundsMm.max[0]-(3000-250),note:'Plan overlap only. Wall base is at Z175 while floor underside Z0: separate wall seat/pedestal or equivalent verified load path still required; beam top not selected.'})):[];
 record.floorStudy=floorStudy;fs.writeFileSync(`${out}/${m.id}.json`,JSON.stringify(record,null,2)+'\n');records.push({id:m.id,plan:m.plan,supportCount:supports.length,maxSpanMm:Math.max(...spans.map(s=>s.lengthMm)),floorStudyCount:floorStudy.length});
}
assert.equal(records.length,48);fs.writeFileSync(`${out}/index.json`,JSON.stringify({status:'GEOMETRY_PROPOSAL',count:48,records},null,2)+'\n');console.log([...new Set(records.map(r=>`${r.plan}: ${r.supportCount} supports, max ${r.maxSpanMm}mm`))]);
