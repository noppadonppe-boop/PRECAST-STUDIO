import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {model as node31} from './node-level-p31.mjs';import {outerZ} from './node-roof-p14.mjs';
export const waterZ=y=>2810+.02*(2992.5-y);
export const capDrop=100*Math.sqrt(1+.02**2);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
// Closed hexahedra, with planar upper/lower faces. Actual support design is deliberately absent.
export function prism(tag,kind,x,y,w,l,b0,b1,t0,t1,normalThicknessMm){
 const z=Math.min(b0,b1),h0=t0-b0,h1=t1-b1,h=(h0+h1)/2;
 if(Math.min(h0,h1)<=0)throw Error('Nonpositive concrete depth');
 const v=w*l*h/1e9,ty=(t1-t0)/l,by=(b1-b0)/l;
 const cy=l/2+(ty-by)*l*l/(12*h);
 const cz=(((t0+t1)/2)**2+ty*ty*l*l/12-((b0+b1)/2)**2-by*by*l*l/12)/(2*h)-z;
 return {id:`TS-N90-${tag}-P33`,kind,units:'mm',originMm:[x,y,z],dimensionsMm:[w,l,Math.max(t0,t1)-z],normalThicknessMm,
  localVerticesMm:[[0,0,b0-z],[w,0,b0-z],[w,l,b1-z],[0,l,b1-z],[0,0,t0-z],[w,0,t0-z],[w,l,t1-z],[0,l,t1-z]],
  faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],
  globalLevelsMm:{bottomAtStart:b0,bottomAtEnd:b1,topAtStart:t0,topAtEnd:t1},
  mass:{netVolumeM3:v,densityKgM3:2400,concreteMassKg:v*2400,method:'EXACT_RECTANGULAR_PLAN_TIMES_MEAN_LINEAR_DEPTH',liftingDesignMassKg:null,excluded:['REBAR','INSERTS','JOINT_MATERIALS','FINISHES']},
  concreteOnlyCentroidLocalMm:[w/2,cy,cz],
  liftingPlan:{status:'CONCEPT_ZONES_ONLY',stages:['DEM','ROT','ERECT'],studyZone:kind==='FASCIA'?'SOLID_FACE_ABOUT_CG; EDGE_DISTANCE_AND_SHALLOW_DEPTH_REVIEW_REQUIRED':'TOP_FACE_ABOUT_CG; SLENDER_STRIP_HANDLING_REVIEW_REQUIRED',anchorCoordinatesMm:null,quantity:null,releasedForLifting:false},
  supportGeometry:null,reinforcement:null,engineeringApproved:false,productionReleased:false,status:'DEVELOPMENT_PROPOSAL_NOT_FABRICATION'};
}
export function records(){
 const caps=[['CS1',7.5,7.5,1485,315],['CS2',1507.5,7.5,1155,315],['CC',2677.5,7.5,315,315],['CE1',2677.5,337.5,315,1485],['CE2',2677.5,1837.5,315,1155]].map(([tag,x,y,w,l])=>prism(tag,'CAP',x,y,w,l,waterZ(y)+20,waterZ(y+l)+20,waterZ(y)+20+capDrop,waterZ(y+l)+20+capDrop,100));
 const fascias=[['FS1',7.5,7.5,1485,100],['FS2',1507.5,7.5,1370,100],['FE1',2892.5,7.5,100,1485],['FE2',2892.5,1507.5,100,1485]].map(([tag,x,y,w,l])=>prism(tag,'FASCIA',x,y,w,l,2625,2625,waterZ(y),waterZ(y+l),100));
 const roofs=[['NR-S',7.5,127.5,2865,1365],['NR-N',7.5,1507.5,2865,1485]].map(([tag,x,y,w,l])=>prism(tag,'NODE_ROOF',x,y,w,l,2625,2625,2800,2800,175));
 return [...caps,...fascias,...roofs];
}
export const verticesWorld=r=>r.localVerticesMm.map(p=>p.map((n,i)=>n+r.originMm[i]));
export function bounds(r){const p=verticesWorld(r);return {min:[0,1,2].map(i=>Math.min(...p.map(q=>q[i]))),max:[0,1,2].map(i=>Math.max(...p.map(q=>q[i])))};}
export function collisions(rs){const hits=[];for(let a=0;a<rs.length;a++)for(let b=a+1;b<rs.length;b++){const x=bounds(rs[a]),y=bounds(rs[b]),overlap=[0,1,2].map(i=>Math.min(x.max[i],y.max[i])-Math.max(x.min[i],y.min[i]));if(overlap.every(v=>v>1e-6))hits.push({a:rs[a].id,b:rs[b].id,boxOverlapMm:overlap});}return hits;}
export function exactCollisions(rs){const hits=[];for(const candidate of collisions(rs)){const a=rs.find(r=>r.id===candidate.a),b=rs.find(r=>r.id===candidate.b);let lo=Math.max(a.originMm[1],b.originMm[1]),hi=Math.min(a.originMm[1]+a.dimensionsMm[1],b.originMm[1]+b.dimensionsMm[1]);
 const plane=(r,top)=>{const z=r.globalLevelsMm,start=top?z.topAtStart:z.bottomAtStart,end=top?z.topAtEnd:z.bottomAtEnd;const k=(end-start)/r.dimensionsMm[1];return [start-k*r.originMm[1],k];};
 for(const [u,v] of [[plane(a,true),plane(b,false)],[plane(b,true),plane(a,false)]]){const c=u[0]-v[0],k=u[1]-v[1];if(Math.abs(k)<1e-12){if(c<=1e-6)hi=lo;}else{const crossing=(1e-6-c)/k;if(k>0)lo=Math.max(lo,crossing);else hi=Math.min(hi,crossing);}}
 if(hi-lo>1e-6)hits.push({...candidate,actualOverlapY:[lo,hi]});}return hits;}
export function profileInterfaces(){return ['A','B','C','D'].flatMap(f=>['S','E'].map(face=>({family:f,face,mainConcreteUnchanged:true,nominalFaceGapMm:15,
   samples:Array.from({length:601},(_,i)=>{const q=i*5,z=q>1490&&q<1510?null:outerZ(f,q);return {q,wingOuterZ:z,nodeCapTopZ:waterZ(face==='S'?7.5:q)+20+capDrop,levelDifferenceMm:z===null?null:waterZ(face==='S'?7.5:q)+20+capDrop-z};}),
   jointStatus:'BUTT_INTERFACE_SPACE_NO_APPROVED_SEAL_OR_STRUCTURAL_CONNECTION',
   specialZones:[{type:'CROWN',qMm:[1490,1510],detail:'CONTINUITY_REQUIRED_ACROSS_EXISTING_CROWN_JOINT'},...(f==='D'?[{type:'INCLINED_SHOULDER',qMm:[0,200],detail:'FOLLOW_WALL_END_NOT_FLAT_ROOF'},{type:'INCLINED_SHOULDER',qMm:[2800,3000],detail:'FOLLOW_WALL_END_NOT_FLAT_ROOF'}]:[])]})))};
export function model(){const rs=records(),base=node31();return {revision:'P33',visibility:'INTERNAL_TEAM',scope:'NODE_SIDE_CONCRETE_CAP_AND_FASCIA_DEVELOPMENT; NOT_WATERPROOFING_OR_SUPPORT_APPROVAL',
  strategy:'NODE_SIDE_BUTT_CONNECTION_NO_OVERLAY_ON_MAIN_3000_ROOF',records:rs,
  nodes:base.nodes.map(n=>({nodeId:n.nodeId,originMm:n.originMm,reflection:n.openFace==='W'?'X_NEW=3000-X_OLD':'NONE',placements:rs.map(r=>({id:`${n.nodeId}-${r.id}`,typicalId:r.id,verticesNodeMm:verticesWorld(r).map(([x,y,z])=>[n.openFace==='W'?3000-x:x,y,z]),faces:r.faces.map(f=>n.openFace==='W'?[...f].reverse():f)}))})),
  scopeChanges:{mainProfilesChanged:false,typeIChanged:false,nodeLevelChangedFromP31:false,oldNR01ReplacedBy:['TS-N90-NR-S-P33','TS-N90-NR-N-P33'],roofEdgeSetbackMm:120,roofEdgeSetbackReason:'100_FASCIA_AND20_HORIZONTAL_SEPARATION',capOverlapOntoMainRoofMm:0},
  dimensions:{nodeGridMm:3000,capStripWidthMm:315,capNormalThicknessMm:100,capVerticalThicknessMm:capDrop,fasciaThicknessMm:100,fasciaBaseZ:2625,nodeRoofTopZ:2800,proposedGradient:.02,gradientBasis:'GEOMETRY_STUDY_NOT_CODE_OR_PRODUCT_MINIMUM'},
  interfaces:profileInterfaces(),
  jointSpaces:[{id:'J-WING',widthMm:15,location:'MAIN_END_Y=-7.5_TO_NODE_FACE_Y=7.5; SIDE_ROTATED',purpose:'PROFILE_FOLLOWING_WEATHER_JOINT',seal:null,attachment:null},
   {id:'J-CAP',widthMm:15,location:'CAP_DIVISION_LINES_IN_PLAN',purpose:'CONTINUOUS_MOVEMENT_AND_WEATHER_JOINT',seal:null,attachment:null},
   {id:'J-FASCIA',widthMm:15,location:'FASCIA_DIVISION_LINES_IN_PLAN',purpose:'CLOSURE_MOVEMENT_JOINT',seal:null,attachment:null},
   {id:'J-CAP-FASCIA',verticalSpaceMm:20,location:'WATER_Z_TO_WATER_Z+20',purpose:'SUPPORT_AND_WEATHER_SEAL_SPACE_NOT_EMPTY_APPROVED_LOAD_PATH',seal:null,attachment:null},
   {id:'J-NR-FASCIA',widthMm:20,location:'S:107.5_TO127.5; E:2872.5_TO2892.5',purpose:'EDGE_AND_CAVITY_CLOSURE_SPACE',seal:null,attachment:null}],
  drainage:{capFallDirection:'N',capSInnerDripLineMm:[[7.5,322.5,waterZ(322.5)+20+capDrop],[2992.5,322.5,waterZ(322.5)+20+capDrop]],nodeLowWeatherZ:2810,capNorthTopZ:waterZ(2992.5)+20+capDrop,
   outletDirection:'N_EXTERNAL',gutterReservation:{minMm:[7.5,3000,2650],sizeMm:[2985,200,300],basis:'SPACE_ONLY_COLLECTS_NODE_LOW_EDGE_AND_HIGHER_CAP_EDGE'},
   endClosureStatus:'WEST_CAP_END_AND_NORTH_DRIP_CAVITY_DETAIL_PENDING',pipeDiameterMm:null,rainfall:null,capacity:null,waterproofingApproved:false},
  mass:{capsKg:rs.filter(r=>r.kind==='CAP').reduce((s,r)=>s+r.mass.concreteMassKg,0),fasciasKg:rs.filter(r=>r.kind==='FASCIA').reduce((s,r)=>s+r.mass.concreteMassKg,0),nodeRoofKg:rs.filter(r=>r.kind==='NODE_ROOF').reduce((s,r)=>s+r.mass.concreteMassKg,0),wholeNodeMassKg:null},
  checks:{newSolidAabbCandidates:collisions(rs),newSolidExactIntersections:exactCollisions(rs),maxConcreteZ:Math.max(...rs.flatMap(verticesWorld).map(p=>p[2])),basis:'EXACT_LINEAR_PRISM_PAIR_CHECK_NOT_COMPLETE_ASSEMBLY_OR_LEAK_TEST'},
  pending:['PROFILE_JOINT_CROWN_AND_D_SHOULDER_CLOSURE_DETAIL','WEST_END_AND_NORTH_DRIP_CAVITY_DETAIL','CAP_AND_FASCIA_SUPPORT_SPACE_REVIEW','CONSOLIDATED_TYPICAL_QA'],engineeringApproved:false,productionReleased:false};}
const tx=(x,y,t,n=20,c='#263f52')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${t}</text>`;
const pg=(p,c='#c0dbe4')=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" fill="${c}" stroke="#476a7d" stroke-width="1.3"/>`;
const line=(a,b,c='#476a7d')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="1.5"/>`;
function dim(x,y,w,t){return line([x,y],[x+w,y])+line([x,y-6],[x,y+6])+line([x+w,y-6],[x+w,y+6])+tx(x+w/2-20,y-10,t,17);}
const start=t=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="#f4f7fa"/><g font-family="Tahoma,Arial,sans-serif">${tx(50,55,t,30)}${tx(50,100,'P33 · ขั้น2/8 · mm · รูปทรงพัฒนา ไม่อนุมัติผลิตหรือยก',21,'#9c602e')}`;
export function board(r){let s=start(r.id);const [w,l,h]=r.dimensionsMm,k=Math.min(600/w,270/l,.32),v=r.localVerticesMm;
 s+=tx(65,162,'01 / แปลน',23)+pg([[0,0],[w,0],[w,l],[0,l]].map(([x,y])=>[95+x*k,210+y*k]))+dim(95,210+l*k+38,w*k,w.toFixed(1))+tx(110+w*k,240+l*k/2,l.toFixed(1),18);
 s+=tx(65,600,'02 / รูปตัดตาม Y — สเกลตั้งขยาย',23);const p=([x,y,z])=>[100+y*Math.min(.35,560/l),900-z*.75];s+=pg([v[0],v[3],v[7],v[4]].map(p))+dim(100,950,l*Math.min(.35,560/l),l.toFixed(1));
 s+=tx(65,1008,`ระดับท้องต้น/ปลาย: ${r.globalLevelsMm.bottomAtStart.toFixed(2)} / ${r.globalLevelsMm.bottomAtEnd.toFixed(2)}`,18)+tx(65,1040,`ระดับบนต้น/ปลาย: ${r.globalLevelsMm.topAtStart.toFixed(2)} / ${r.globalLevelsMm.topAtEnd.toFixed(2)}`,18);
 s+=tx(830,162,'03 / 3D จาก vertices เดียวกับ2D',23);const iso=([x,y,z])=>[850+x*Math.min(.18,440/w)+y*Math.min(.12,160/l),500+x*.015-y*Math.min(.07,80/l)-z*.65];
 for(const [i,face] of [r.faces[3],r.faces[2],r.faces[1]].entries())s+=pg(face.map(j=>iso(v[j])),['#7fa6ba','#aacbd9','#d3e6eb'][i]);
 const notes=[`ประเภท ${r.kind} / ความหนากำหนด ${r.normalThicknessMm} mm`,`ขนาดกรอบ XYZ: ${w.toFixed(1)} × ${l.toFixed(1)} × ${h.toFixed(2)}`,`กรอบสูงไม่ใช่ความหนาตั้งฉากผิวของแผ่นลาด`,`V = ${r.mass.netVolumeM3.toFixed(6)} m³`,`มวลคอนกรีต ≈ ${r.mass.concreteMassKg.toFixed(2)} kg`,`ฐานทดลอง2400 kg/m³ ไม่รวมเหล็ก/อุปกรณ์`,`CG local: ${r.concreteOnlyCentroidLocalMm.map(n=>n.toFixed(2)).join(', ')}`];notes.forEach((t,i)=>s+=tx(830,620+i*42,t,i===4?25:19));
 s+=tx(830,953,'หูยก: ศึกษาโซนเนื้อทึบรอบ CG',19,'#9c602e')+tx(830,985,'DEM / ROT / ERECT ต้องตรวจแยก',19,'#9c602e')+tx(830,1017,'ยังไม่มีพิกัด กำลังหูยก หรือเหล็กที่อนุมัติ',19,'#9c602e');
 return s+tx(55,1138,'joint / bearing / support / tolerance / seal / reinforcement ยังต้องออกแบบ ไม่ใช้ภาพนี้สั่งผลิต',20,'#9c602e')+'</g></svg>';
}
export function assemblyBoard(m){let s=start('N90 / NODE-SIDE CONCRETE COVER KIT');const p=([x,y])=>[100+x*.18,760-y*.18];s+=tx(65,160,'แปลนโหนด L-N01 / U-N01 — ยอดครอบไม่เกิน3000',22);
 for(const r of [...m.records].reverse()){const [x,y]=r.originMm,[w,l]=r.dimensionsMm;s+=pg([[x,y],[x+w,y],[x+w,y+l],[x,y+l]].map(p),r.kind==='CAP'?'#9dd0d2':r.kind==='FASCIA'?'#e6be89':'#dde6ed');const t=p([x+w/2,y+l/2]);if(r.kind!=='FASCIA')s+=tx(t[0]-25,t[1],r.id.split('-').slice(2,-1).join('-'),15);}
 s+=dim(100,810,540,'3000')+tx(80,866,'ชิ้นฟ้า: ครอบ / ส้ม: แผงปิด / เทา: NRขอบใหม่',18)+tx(80,906,'U-N02 สะท้อนX→3000−X; ตำแหน่ง insert ไม่อนุมัติ',18);
 const notes=['แนวคิดรอยต่อชน ไม่ครอบทับยอดหลังคาหลัก','ครอบหนา100 ตั้งฉาก / ลาดศึกษา2%ไปN','ครอบมุมCCเป็นชิ้นเดียว ไม่วางสองแผ่นซ้อน','แผงปิดหนา100; ฐานZ2625 / บนตามผิวลาด','NRเว้นขอบ120: แผง100 + ช่องข้าง20','NRใหม่175หนาเท่าเดิม; ไม่เลื่อนหลังคาหลัก',`ยอดครอบสูงสุด ${m.checks.maxConcreteZ.toFixed(2)} mm`,`ครอบรวม ${m.mass.capsKg.toFixed(1)} kg / โหนด`,`แผงปิดรวม ${m.mass.fasciasKg.toFixed(1)} kg / โหนด`,`NRใหม่รวม ${m.mass.nodeRoofKg.toFixed(1)} kg / โหนด`];notes.forEach((t,i)=>s+=tx(805,185+i*52,t,20));
 s+=tx(805,795,'ยังค้าง: ปิดช่องปลาย/สัน/ไหล่D และรองรับ',20,'#9c602e')+tx(805,840,'ช่อง20ไม่ใช่การรับรองว่าแผ่นลอยรับแรงได้',20,'#9c602e');
 s+=tx(65,1020,'ทุกชิ้นอยู่ฝั่งโหนด: ไม่เปลี่ยน Type I หรือซีกผนัง–หลังคาหลัก A/B/C/D',21)+tx(65,1062,'รอยต่อ15/20เป็นมิติพัฒนา ไม่ใช่สเปกวัสดุยาแนวหรือกำลังจุดต่อ',20,'#9c602e');return s+'</g></svg>';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/node-cover-p33');fs.mkdirSync(out,{recursive:true});const m=model(),req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const files=[];for(const [id,svg] of [...m.records.map(r=>[r.id,board(r)]),['N90-COVER-ASSEMBLY-P33',assemblyBoard(m)]]){fs.writeFileSync(path.join(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,id+'.png'));files.push(id+'.svg',id+'.png');}
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(m,null,2));files.push('register.json');
 const c=read('output/node-level-p31/stage2-checklist.json');c.revision='P33';c.items.find(i=>i.id==='P2-16').partialEvidence.push('output/node-cover-p33/register.json');fs.writeFileSync(path.join(out,'stage2-checklist.json'),JSON.stringify(c,null,2));files.push('stage2-checklist.json');
 fs.writeFileSync(path.join(out,'README.md'),['# P33 — ชุดครอบคอนกรีตฝั่งโหนด','', '[ผังประกอบ](N90-COVER-ASSEMBLY-P33.png)','','ขั้น2/8 ยัง85% เป็นชุดพัฒนา ไม่ใช่แบบผลิตหรือรับรองกันรั่ว','',...m.records.map(r=>`- [${r.id}](${r.id}.png): ${r.mass.concreteMassKg.toFixed(2)} kg`),'','NR-S/NR-N แทนNR01เดิมในกรณีนี้ ต้องตรวจระบบรองรับใหม่ ไม่เพิ่มสองชุดซ้อนกัน',''].join('\n'));files.push('README.md');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({dependencies:['tools/modular-program/node-cover-p33.mjs','tools/modular-program/node-level-p31.mjs','tools/modular-program/node-roof-p14.mjs'].map(p=>({path:p,sha256:hash(p)})),files:files.map(f=>({file:f,sha256:hash('output/node-cover-p33/'+f)}))},null,2));console.log(JSON.stringify({records:m.records.length,mass:m.mass,checks:m.checks}));
}
