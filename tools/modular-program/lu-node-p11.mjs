import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {root} from './build-r02.mjs';import {area} from './abd-master-p07.mjs';
const legacyPath='knowledge/modular-segments-r00/placement_grid.json';
const delta={N:[0,3000],S:[0,-3000],E:[3000,0],W:[-3000,0]};
export function transform(axis,origin,[x,y,z=0]){return axis==='Y'?[origin[0]+x,origin[1]+y,z]:[origin[0]+y,origin[1]+3000-x,z];}
export function layout(type){
 if(!['L','U'].includes(type))throw Error('Unsupported plan');const old=JSON.parse(fs.readFileSync(path.join(root,legacyPath)))[type];
 const cells=old.cells.map(c=>({...c,originMm:c.origin.map(v=>v*1000),sizeMm:[3000,3000]}));
 const bays=old.bays.map(b=>{const origin=b.origin.map(v=>v*1000),corners=[[170,7.5],[2830,7.5],[2830,1492.5],[170,1492.5]].map(p=>transform(b.axis,origin,p));
  return {id:b.instance,cell:b.cell,originMm:origin,sizeMm:b.size.map(v=>v*1000),axis:b.axis,
   rotationZDeg:b.axis==='Y'?0:-90,translationMm:b.axis==='Y'?[...origin,0]:[origin[0],origin[1]+3000,0],
   floorReuseTrialCornersMm:corners,typicalVariant:null,openingSchedule:'NOT_SELECTED_FOR_LU',reuseStatus:'STRAIGHT_GEOMETRY_CANDIDATE_INTERFACE_NOT_VERIFIED'};});
 const nodes=cells.filter(c=>c.kind==='node').map(c=>{
  const ports=c.open_faces.map(face=>{const d=delta[face],neighbour=cells.find(n=>n.kind==='straight'&&n.originMm[0]===c.originMm[0]+d[0]&&n.originMm[1]===c.originMm[1]+d[1]);if(!neighbour)throw Error('Missing adjacent straight cell');
   const cross=face==='E'||face==='W';return {id:`${type}-${c.id}-PORT-${face}`,face,adjacentCell:neighbour.id,nominalWidthMm:3000,
    trialFloorEdgeGapMm:cross?177.5:15,normalBayGapMm:15,excessOverBayGapMm:cross?162.5:0,
    floorStatus:cross?'REUSE_FAILS_NEEDS_NODE_FLOOR_OR_SUPPORTED_TRANSITION':'LONGITUDINAL_GAP_ONLY_OTHER_FIT_UNRESOLVED',
    roofTransitionGeometry:null,connectionDetail:null,capacityStatus:'NOT_ANALYSED',massKg:null};});
  const candidates=[...Array.from({length:2},(_,i)=>({id:`${type}-${c.id}-NF15-${i+1}`,role:'NODE_FLOOR',developmentThicknessMm:175})),...Array.from({length:2},(_,i)=>({id:`${type}-${c.id}-NR15-${i+1}`,role:'NODE_ROOF',developmentThicknessMm:175})),...Array.from({length:4},(_,i)=>({id:`${type}-${c.id}-NW15-${i+1}`,role:'NODE_EXTERNAL_WALL',developmentThicknessMm:175}))].map(v=>({...v,status:'PLANNING_SLOT_NOT_CAST_PIECE',castDimensionsMm:null,massKg:null,anchorCoordinatesMm:null,productionReleased:false}));
  return {id:`${type}-${c.id}`,originMm:c.originMm,footprintMm:[3000,3000],openFaces:c.open_faces,closedFaces:['N','E','S','W'].filter(f=>!c.open_faces.includes(f)),ports,candidates,
   roofLevelSelectedMm:null,roofLevelStudies:[{topZ:2700,clearBeforeFinishesMm:2350,basis:'LEGACY_R00_UNAPPROVED'},{topZ:2850,clearBeforeFinishesMm:2500,basis:'ALTERNATIVE_FOR_INTERFACE_STUDY_NOT_SELECTED'}],
   supportFrame:{geometry:null,quantity:null,massKg:null,status:'MUST_BE_DESIGNED'},wholeNodeMassKg:null,engineeringApproved:false};
 });
 return {id:`${type}-TOPOLOGY-P11`,type,polygonMm:old.polygon.map(p=>p.map(v=>v*1000)),nominalAreaM2:area(old.polygon),areaBasis:'EXTERNAL_GRID_NOT_NET_USABLE_AREA',cells,bays,nodes,
  counts:{straightBays:bays.length,straightHalfShellCandidates:bays.length*2,straightFloorCandidates:bays.length,nodeFloorPlanningSlots:nodes.length*2,totalFloorPlanningSlots:bays.length+nodes.length*2,nodeRoofPlanningSlots:nodes.length*2,nodeWallPlanningSlots:nodes.length*4,transitionKitSlots:nodes.length*2},
  fullBuildingMassKg:null,status:'TOPOLOGY_AND_INTERFACE_STUDY_NOT_COMPLETE_ASSEMBLY',visibility:'INTERNAL_TEAM',engineeringApproved:false,productionReleased:false};
}
export function interfaces(){return ['L','U'].flatMap(t=>layout(t).nodes.flatMap(n=>n.ports.flatMap(p=>['A','B','C','D'].map(f=>({id:`IF-${f}-${p.id}-P11`,family:f,nodeId:n.id,portId:p.id,profileRevision:f==='C'?'P05':'P08',floorIssue:p.floorStatus,roofTransitionTag:`TS-${f}-TR-${p.face}-P11-PLANNED`,geometry:null,massKg:null,engineeringApproved:false})))));}
const text=(x,y,s,n=18,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const poly=(p,fill='none',stroke='#6f8b9c',dash=false)=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" ${dash?'stroke-dasharray="7 5"':''}/>`;
const line=(a,b,color='#748c9b',width=1.3)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}"/>`;
const box=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const start=(title,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${h}"><rect width="1600" height="${h}" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">`+text(45,55,title,31);
const end='</g></svg>';
export function planBoard(m){
 let s=start(`${m.type} / NODE + BAY COORDINATION · P11`,1400);s+=text(45,94,`พื้นที่กรอบ ${m.nominalAreaM2} m² · ใช้กริด1500 · หน่วย mm · ยังไม่ใช่แบบประกอบพร้อมผลิต`,20);
 s+=box(40,115,1520,55,'#fff0d8')+text(60,151,'N90 เป็นชุดหลายชิ้น ไม่ใช่ชิ้นหล่อเดียว — พื้นเดิมวางในโหนดยังไม่ต่อเนื่อง',22,'#96551b');
 s+=text(60,217,'01 / ผังแบ่งเซลล์และกริดช่วงตรง',23);
 const k=m.type==='U'?.08:.105,px=110,py=925,p=([x,y])=>[px+x*k,py-y*k];
 for(const c of m.cells){const [x,y]=c.originMm;s+=poly([[x,y],[x+3000,y],[x+3000,y+3000],[x,y+3000]].map(p),c.kind==='node'?'#f6dfb4':'#e4edf4');}
 for(const b of m.bays){s+=poly(b.floorReuseTrialCornersMm.map(([x,y])=>p([x,y])),'#c9dfec');const [x,y]=p([b.originMm[0]+b.sizeMm[0]/2,b.originMm[1]+b.sizeMm[1]/2]);s+=text(x-32,y,b.id,18)+text(x-24,y+25,`axis ${b.axis}`,15);}
 for(const n of m.nodes){const [nx,ny]=n.originMm;
  for(let i=0;i<2;i++)s+=poly([[nx+170,ny+i*1500+7.5],[nx+2830,ny+i*1500+7.5],[nx+2830,ny+i*1500+1492.5],[nx+170,ny+i*1500+1492.5]].map(p),'none','#b58a4c',true);
  const [cx,cy]=p([nx+1500,ny+1500]);s+=text(cx-40,cy,n.id,22,'#935a18')+text(cx-60,cy+30,'NF/NR/NW TBD',15,'#935a18');
  for(const port of n.ports){let a,b;if(port.face==='S'){a=[nx,ny];b=[nx+3000,ny];}else if(port.face==='E'){a=[nx+3000,ny];b=[nx+3000,ny+3000];}else{a=[nx,ny];b=[nx,ny+3000];}s+=line(p(a),p(b),'#ca6b45',5);}
 }
 s+=poly(m.polygonMm.map(p),'none','#405c70');
 s+=text(px+130,py+35,m.type==='U'?'9000 รวม / คอร์ตกลาง3000×3000':'6000 รวม / เว้นมุม3000×3000',19);
 s+=text(px,py+76,'ฟ้า: พื้นตรงทดลอง / ส้ม: พื้นที่โหนด / เส้นเข้ม: PORT',17);
 s+=text(1000,219,'02 / บัญชีระดับกริด ไม่ใช่BOMผลิต',22);
 const c=m.counts;[`${c.straightBays} ช่วงตรง = ${c.straightHalfShellCandidates} ซีกH15`,`${m.nodes.length} ชุดN90 ขนาดกริด3000×3000`,`พื้นตรง${c.straightFloorCandidates} + ช่องพื้นโหนด${c.nodeFloorPlanningSlots}`,`= ${c.totalFloorPlanningSlots} floor slots (ไม่บวกซ้ำ)`,`หลังคาโหนด NR: ${c.nodeRoofPlanningSlots} slots`,`ผนังโหนด NW: ${c.nodeWallPlanningSlots} slots`,`TR: ${c.transitionKitSlots} ชุดต้องพัฒนา`,`ฐาน/กรอบช่องเชื่อม: จำนวนยังไม่กำหนด`].forEach((v,i)=>s+=text(1000,267+i*43,v,19));
 s+=text(1000,665,'ช่องขาด177.5ที่PORTด้านข้าง',21,'#b45831')+text(1000,703,'พื้นNFต้องพัฒนา ไม่ใช้F15แทนทันที',18,'#b45831');
 s+=text(65,1100,'03 / กติกาการนำไปประกอบ',23);
 ['ช่วงตรงหมุนใช้ geometry เดิมได้เป็นตัวเลือก แต่รอยต่อและvariantช่องเปิดต้องเลือกใหม่',
 'แกนX: หมุน−90°โดยไม่mirror LH/RH / ห้ามตัดผนังซีกทึบเพื่อเปิดมุมหน้างาน',
 'พิกัดในภาพเป็นกริดภายนอก ไม่ใช่ขนาดหล่อ พื้นที่สุทธิ หรือตำแหน่งหูยก',
 'ไม่รวมน้ำหนักอาคาร: node/transition/ฐานยังไม่มีgeometryครบ ห้ามใช้สูตรน้ำหนักของIคูณแทน'
 ].forEach((v,i)=>s+=text(65,1143+i*40,v,19));
 s+=box(40,1330,1520,45,'#fff0d8')+text(60,1360,'เพื่อพัฒนาแบบและตรวจinterface — ไม่อนุมัติผลิต ก่อสร้าง หรือยก — ยังไม่รันโครงสร้าง',20,'#96551b');return s+end;
}
export function nodeBoard(){
 let s=start('N90 / INTERFACE STUDY · P11',1450);s+=text(45,95,'กรอบมุม3000×3000 · ตัวอย่างPORT S/E · N90หลายชิ้น ไม่ใช่ซีกตรงตัดมุม',21);
 s+=box(40,115,1520,55,'#fff0d8')+text(60,150,'การตรวจพบช่องว่างไม่ใช่แบบแก้รับแรง — ห้ามปิดช่องด้วยแผ่นเหล็กโดยไม่มีการออกแบบ',22,'#96551b');
 s+=text(60,218,'01 / แปลนพื้นทดลอง: F15เดิมไม่ครบพื้นที่ต่อเลี้ยว',21);
 const p=([x,y])=>[110+x*.15,800-y*.15];
 s+=poly([[0,0],[3000,0],[3000,3000],[0,3000]].map(p),'#f7e7c8');
 for(let b=0;b<2;b++)s+=poly([[170,b*1500+7.5],[2830,b*1500+7.5],[2830,b*1500+1492.5],[170,b*1500+1492.5]].map(p),'#cadfe9');
 s+=poly([[3007.5,170],[4492.5,170],[4492.5,2830],[3007.5,2830]].map(p),'#cadfe9');
 s+=poly([[2830,170],[3007.5,170],[3007.5,2830],[2830,2830]].map(p),'#ecaf9e','#b45935');
 s+=text(235,320,'N90 grid 3000',19)+text(165,545,'NF候補 / ยังไม่ออกแบบ'.replace('候補','เสนอ'),20)+text(620,546,'F15 ปีก',18);
 s+=line(p([2830,3150]),p([3007.5,3150]),'#b45935',2)+text(485,285,'177.5',19,'#b45935');
 s+=text(90,850,'ช่องขาด=170+7.5 ไม่ใช่gap15 / ต้องแก้floor interface',18,'#b45935');
 s+=text(880,218,'02 / 3D กรอบพื้นที่อ้างอิง (ไม่ใช่ชิ้นคอนกรีต)',21);
 const iso=([x,y,z])=>[1000+x*.105+y*.062,775+x*.026-y*.052-z*.12];
 const base=[[0,0,0],[3000,0,0],[3000,3000,0],[0,3000,0]],top=base.map(([x,y])=>[x,y,3000]);
 s+=poly(base.map(iso),'none','#7390a2',true)+poly(top.map(iso),'none','#7390a2',true);for(let i=0;i<4;i++)s+=line(iso(base[i]),iso(top[i]));
 s+=poly(base.map(([x,y])=>iso([x,y,2700])),'none','#c4883e',true)+text(920,343,'Z3000 กรอบอ้างอิง',18)+text(920,379,'Z2700 ระดับเดิมเพื่อเทียบ',18,'#a46e2d');
 s+=text(890,835,'สองหน้าภายนอก: NW / สองหน้าเปิด: TR + กรอบรับ',17);
 s+=text(60,925,'03 / ระดับหลังคาและความสูง',23);
 ['เดิมR00: บนหลังคา2700 − หลังคา175 − พื้น175 = 2350',
 'ทางเลือกศึกษา: 2850 −175 −175 = 2500 (ยังไม่เลือก)',
 'ความสูงก่อนตกแต่ง ไม่รับรองข้อกำหนดใช้สอย',
 'ระดับสูงขึ้นต้องตรวจชนกับหลังคาปีกA/B/C/DและTR',
 'กันน้ำ/ระบายน้ำ/ฉนวนของรอยต่อเปลี่ยนระดับยังค้าง'].forEach((v,i)=>s+=text(65,970+i*38,v,18));
 s+=text(875,925,'04 / รายการแยกพัฒนาต่อ1โหนด',23);
 ['NF15: พื้น2ช่องแผง — ขนาดหล่อใหม่รอกำหนด',
 'NR15: หลังคา2ช่องแผง — หนาพัฒนา175',
 'NW15: ผนัง4ช่องแผง — หนาพัฒนา175',
 'TR: 2interface kits ไม่ใช่2ชิ้นหล่อแน่นอน',
 'กรอบรับ/จุดยึด/หูยก: จำนวนและตำแหน่งยังnull'].forEach((v,i)=>s+=text(880,970+i*38,v,18));
 s+=text(65,1215,'NFคือช่องรายการพัฒนาพื้นโหนด ไม่เพิ่มยอดพื้นซ้ำจากสูตรL6/U10เดิม',20);
 s+=text(65,1255,'จำนวนแผงอาจเปลี่ยนเมื่อออกแบบfloor bridge/portal และรอยต่อจริง ต้องแก้ทะเบียนตามrevision',18);
 s+=box(40,1340,1520,70,'#fff0d8')+text(60,1370,'ไม่ระบุน้ำหนักnodeเพราะยังไม่มีขนาดชิ้นครบ / ไม่มีแบบหูยกหรือความสามารถรับแรงที่อนุมัติ',20,'#96551b')+text(60,1397,'กรอบ3Dเป็นcoordination envelope ไม่ใช่Typicalพร้อมผลิต และไม่แสดงว่าnodeตั้งอยู่ได้เอง',18,'#96551b');return s+end;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/lu-node-p11');fs.mkdirSync(out,{recursive:true});const plans=['L','U'].map(layout),records=interfaces();
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const names=[];for(const [id,svg] of [...plans.map(m=>[m.id,planBoard(m)]),['N90-INTERFACE-P11',nodeBoard()]]){fs.writeFileSync(path.join(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,id+'.png'));names.push(id+'.svg',id+'.png');}
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify({revision:'P11',plans,interfaces:records,visibility:'INTERNAL_TEAM',engineeringApproved:false,productionReleased:false},null,2));names.push('register.json');
 const md=['# L/U — โหนดและinterface P11','','- [L27m²: ผังกริด/โหนด](L-TOPOLOGY-P11.png)','- [U45m²: ผังกริด/โหนด](U-TOPOLOGY-P11.png)','- [N90: ช่องพื้นและระดับหลังคา](N90-INTERFACE-P11.png)','','ภาพทุกแผ่นมีSVGชื่อเดียวกัน; geometryและ24interface requirementsอยู่register.json','','ข้อพบ: ใช้พื้น2660ในnodeโดยไม่แก้จะเหลือช่อง177.5mmที่ด้านE/W ต้องพัฒนาพื้นโหนดหรือชุดต่อที่มีระบบรองรับ ไม่ใช่อุดยาแนว','','หลังคาโหนด2700ในแนวคิดเดิมเหลือclear2350ก่อนตกแต่ง; ระดับ2850เป็นทางเลือกศึกษา ไม่ใช่เลือกแล้ว','','ทั้งหมดเป็นcoordination study ไม่ใช่Typicalหล่อครบ ไม่มีน้ำหนักทั้งอาคาร ไม่อนุมัติผลิต/ยก',''];fs.writeFileSync(path.join(out,'README.md'),md.join('\n'));names.push('README.md');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({visibility:'INTERNAL_TEAM',dependencies:[legacyPath,'knowledge/modular-program-r02/decisions.json','tools/modular-program/lu-node-p11.mjs','tools/modular-program/abd-master-p07.mjs'].map(p=>({path:p,sha256:hash(p)})),files:names.map(f=>({file:f,sha256:hash('output/lu-node-p11/'+f)}))},null,2));console.log(JSON.stringify(plans.map(m=>({type:m.type,area:m.nominalAreaM2,counts:m.counts})),null,2));
}
