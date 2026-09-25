import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {geometry} from './tsc-master-p02.mjs';
export function model(){
 const g=geometry(),gap=15,edge=gap/2;
 const proposals={authority:'ASSISTANT_DESIGN_PROPOSAL_NOT_USER_APPROVED',bayGapMm:gap,endAllowanceMm:edge,crownGapMm:20,floorSideClearanceMm:20,window:{widthMm:900,heightMm:1200,sillAboveStructuralFloorMm:900,finishOffsetMm:null}};
 const pieces=[];
 for(let bay=0;bay<4;bay++){
   const y0=bay*1500+edge,y1=(bay+1)*1500-edge,win=bay===1||bay===2;
   for(const side of ['LH','RH'])pieces.push({id:`I-C1-B${bay+1}-${side}`,segmentTypeId:`TS-C-H15-${side}`,proposedVariant:win?'W01':'S00',y:[y0,y1],thicknessMm:150,crownEdgeX:side==='LH'?1490:1510,opening:win?{y:[bay*1500+300,bay*1500+1200],z:[1075,2275],throughWall:true}:null});
   pieces.push({id:`I-C1-B${bay+1}-F`,segmentTypeId:'TS-C-F15',proposedVariant:'F01',x:[170,2830],y:[y0,y1],z:[0,175],thicknessMm:175,bearing:'UNRESOLVED_NOT_A_SPANNING_DESIGN'});
 }
 return {id:'PM-I-C1-GEOMETRY-P03',programmeRevision:'R02',units:'mm',status:'PROPOSED_DIMENSIONAL_COORDINATION',envelope:{widthMm:g.width,lengthMm:6000,heightMm:g.height},proposals,pieces,derived:{castLengthMm:1485,floorProposedWidthMm:2660,windowSideLigamentMm:292.5,windowHeadToCurveTangentMm:325,longitudinalBudgetMm:4*1485+3*15+2*7.5},pending:['END_PANELS_AND_ENTRANCE','FURNITURE_AND_SERVICES','JOINT_SYSTEM_AND_TOLERANCES','FLOOR_AND_WALL_INDEPENDENT_BEARINGS','DRAINAGE_AND_FINISHES','STRUCTURAL_AND_HANDLING_CHECKS'],engineeringApproved:false,productionReleased:false};
}
const text=(x,y,t,size=19,color='#294459')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${t}</text>`;
const rect=(x,y,w,h,fill='#d5e6ef',dash=false)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#527589" stroke-width="1.4" ${dash?'stroke-dasharray="6 5"':''}/>`;
export function board(m){
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1280"><rect width="1600" height="1280" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">`;
 s+=text(45,55,'I-C1 / ASSEMBLY COORDINATION',32)+text(45,90,'P03 · 4 ช่วง × 1500 · กรอบ 3000 × 6000 × 3000 · หน่วย mm',21);
 s+=rect(40,115,1520,54,'#fff0d8')+text(58,150,'ข้อเสนอรอยต่อและช่องเปิดเพื่อทบทวน — ไม่อนุมัติผลิต / ยังไม่ตรวจโครงสร้าง',23,'#945612');
 s+=text(65,216,'01 / แปลนแบ่งชิ้น (ยังไม่รวมแผงปิดหัว–ท้าย)',23);
 const px=115,py=280,k=.125;
 s+=rect(px,py,750,375,'none',true);
 for(let bay=0;bay<4;bay++){
  const f=m.pieces.find(p=>p.id===`I-C1-B${bay+1}-F`);
  s+=rect(px+f.y[0]*k,py+170*k,1485*k,2660*k,'#edf1f5');
  for(const side of ['LH','RH']){
   const p=m.pieces.find(p=>p.id===`I-C1-B${bay+1}-${side}`),wy=py+(side==='LH'?0:2850)*k;
   s+=rect(px+p.y[0]*k,wy,1485*k,150*k,side==='LH'?'#80bdd2':'#a2cbbb');
   if(p.opening)s+=rect(px+p.opening.y[0]*k,wy,900*k,150*k,'#d0f0ff');
  }
  s+=text(px+bay*187.5+65,py-18,`B${bay+1}`,19)+text(px+bay*187.5+48,py+180,`F15 / ${bay+1}`,17);
 }
 s+=text(425,239,'6000 = 4 × 1500',19)+text(875,py+190,'3000',18);
 s+=text(115,698,'เส้นประปลายอาคาร: ยังไม่ออกแบบชุดประตู/ผนังปิดปลาย',18);
 s+=text(1000,217,'02 / ข้อเสนอระยะประกอบ',23);
 ['รอยต่อระหว่างช่วง: 15','หักปลายแต่ละช่วง: 7.5 + 7.5','ความยาวชิ้นเสนอ: 1485','รอยต่อกลางหลังคา: 20','ขอบพื้นห่างผนังใน: ข้างละ20','พื้นกว้างเสนอ: 2660','ขนาดเหล่านี้ยังไม่ใช่ tolerance','วัสดุยาแนว/อุปกรณ์ยึดยังไม่เลือก'].forEach((v,i)=>s+=text(1000,267+i*40,v,19));
 s+=text(1000,613,'ตรวจสายมิติ:',20)+text(1000,650,'4×1485 + 3×15 + 2×7.5',18)+text(1000,682,'= 6000 mm',21);
 s+=text(65,755,'03 / รูปด้านข้าง LH — RH ใช้ตำแหน่งช่องเปิดเดียวกันในข้อเสนอนี้',22);
 const ex=115,ey=1090,q=.105;
 for(let bay=0;bay<4;bay++){
  const p=m.pieces.find(p=>p.id===`I-C1-B${bay+1}-LH`);
  s+=rect(ex+p.y[0]*q,ey-3000*q,1485*q,(3000-175)*q,'#c4dce7');
  if(p.opening)s+=rect(ex+p.opening.y[0]*q,ey-p.opening.z[1]*q,900*q,1200*q,'#e8f9ff');
  s+=text(ex+bay*157.5+40,1125,`${p.proposedVariant}`,17);
 }
 s+=text(795,797,'W01 / ช่องเปิดคอนกรีต 900 × 1200',22);
 ['ใช้ B2/B3 ทั้งซ้ายและขวา รวม4ช่อง','ธรณีช่อง +900 จากบนพื้นโครงสร้าง','Z ช่องเปิด = 1075 ถึง 2275','เนื้อคอนกรีตข้างช่องข้างละ292.5','หัวช่องถึงแนวเริ่มโค้ง = 325','ไม่ใช่ขนาดกรอบหรือช่องกระจกสุทธิ','แผงหลัก: 8ซีก + 4พื้น = 12ชิ้น','ยังไม่รวมแผงปิดปลาย/ฐาน/อุปกรณ์ยึด'].forEach((v,i)=>s+=text(795,835+i*37,v,18));
 s+=rect(40,1170,1520,70,'#e4ebf2')+text(60,1200,'ผนัง–หลังคา150 / พื้น175 คงตาม R02 · ช่องเปิดและรอยต่อเป็นข้อเสนอ P03 เท่านั้น',20)+text(60,1228,'LP-A: ผนังและพื้นรองรับแยก — ไม่มีการกำหนดกำลังรับแรงจากภาพนี้',18);
 return s+'</g></svg>';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dir=path.join(root,'output/ic1-coordination-p03');fs.mkdirSync(dir,{recursive:true});const m=model(),svg=board(m);
 fs.writeFileSync(path.join(dir,'assembly.json'),JSON.stringify(m,null,2)+'\n');fs.writeFileSync(path.join(dir,'I-C1-P03.svg'),svg);
 const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 await sharp(Buffer.from(svg)).png().toFile(path.join(dir,'I-C1-P03.png'));
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({id:m.id,status:m.status,visibility:'INTERNAL_TEAM',engineeringApproved:false,productionReleased:false,dependencies:['knowledge/modular-program-r02/decisions.json','tools/modular-program/tsc-master-p02.mjs','tools/modular-program/ic1-p03.mjs'].map(p=>({path:p,sha256:hash(path.join(root,p))})),files:['assembly.json','I-C1-P03.svg','I-C1-P03.png'].map(p=>({file:p,sha256:hash(path.join(dir,p))}))},null,2));console.log(dir);
}
