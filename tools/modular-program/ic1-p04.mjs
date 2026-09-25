import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {model as previous} from './ic1-p03.mjs';
export function model(){
 const base=previous();
 const endPanels=[{id:'I-C1-END-FRONT',type:'EP-D01',x:[170,2830],y:[7.5,157.5],z:[175,2500],thicknessMm:150,opening:{x:[1000,2000],z:[175,2275]},bearing:'UNRESOLVED'}, {id:'I-C1-END-REAR',type:'EP-S01',x:[170,2830],y:[5842.5,5992.5],z:[175,2500],thicknessMm:150,opening:null,bearing:'UNRESOLVED'}];
 const furniture=[{id:'DESK-1',kind:'desk',x:[250,850],y:[1800,3000],heightMm:750},{id:'DESK-2',kind:'desk',x:[250,850],y:[3300,4500],heightMm:750},{id:'CHAIR-ZONE-1',kind:'chair_use_zone',x:[850,1450],y:[1950,2850]},{id:'CHAIR-ZONE-2',kind:'chair_use_zone',x:[850,1450],y:[3450,4350]},{id:'STORAGE',kind:'cabinet',x:[2450,2800],y:[4700,5500],heightMm:1800}];
 return {...base,id:'PM-I-C1-GEOMETRY-P04',status:'ARCHITECTURAL_COORDINATION_PROPOSAL',endPanels,furniture,circulation:{x:[1450,2550],y:[1800,4500],widthMm:1100,entryZone:{x:[900,2200],y:[250,1600]}},upperEndInfill:{status:'RESERVED_PROFILE_NOT_DESIGNED',bottomZ:2500,topFlatZ:2830,innerProfileRadiusMm:230,material:null},door:{openingWidthMm:1000,openingHeightMm:2100,clearPassageMm:null,operation:'TBD_NO_SWING_OR_SLIDER_CLEARANCE_VALIDATED'},assumptions:['TWO_WORKSTATIONS','NO_INTERNAL_TOILET_EXTERNAL_FACILITY_TO_CONFIRM','FURNITURE_NOT_PRODUCT_FAMILIES','NO_CODE_COMPLIANCE_CLAIM'],pending:['UPPER_END_INFILL_DETAIL','DOOR_FRAME_OPERATION_AND_CLEAR_PASSAGE','EXTERIOR_ACCESS_LEVEL_AND_LANDING','TOILET_AND_SERVICES_CONFIRMATION','JOINT_SYSTEM_AND_TOLERANCES','INDEPENDENT_END_PANEL_BEARINGS','DRAINAGE_AND_FINISHES','STRUCTURAL_AND_HANDLING_CHECKS']};
}
const t=(x,y,s,size=19,c='#294459')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}">${s}</text>`;
const r=(x,y,w,h,fill='#d7e5ed',dash=false)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#638091" stroke-width="1.2" ${dash?'stroke-dasharray="6 4"':''}/>`;
export function board(m){let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1320"><rect width="1600" height="1320" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">`;
 s+=t(45,55,'I-C1 / OFFICE + END PANELS',32)+t(45,90,'P04 · สำนักงาน2ที่นั่ง · ชุดปิดปลายและประตูเสนอ · กรอบ 3000×6000×3000 mm',21);
 s+=r(40,115,1520,52,'#fff0d8')+t(58,148,'แบบเพื่อทบทวน — ไม่อนุมัติผลิต/ก่อสร้าง — ยังไม่ตรวจข้อกฎหมายหรือโครงสร้าง',22,'#935915');
 s+=t(60,214,'01 / แปลนใช้งานและแนวแบ่งชิ้น',23);
 const px=95,py=300,k=.13,plan=(x,y)=>[px+y*k,py+x*k];
 const box=(x,y,fill,dash=false)=>r(...plan(x[0],y[0]),(y[1]-y[0])*k,(x[1]-x[0])*k,fill,dash);
 s+=box([0,3000],[0,6000],'#eef2f6',true);
 for(const p of m.pieces){if(p.segmentTypeId==='TS-C-F15')s+=box(p.x,p.y,'#f8fafc');else{const side=p.id.endsWith('LH')?[0,150]:[2850,3000];s+=box(side,p.y,'#88bbc9');if(p.opening)s+=box(side,p.opening.y,'#d9f2fb');}}
 for(const e of m.endPanels){s+=box(e.x,e.y,'#a1c5b4');if(e.opening)s+=box(e.opening.x,e.y,'#f5f7fa');}
 s+=box(m.circulation.x,m.circulation.y,'#e3efde',true);
 for(const f of m.furniture){s+=box(f.x,f.y,f.kind==='desk'?'#dbbc91':f.kind==='cabinet'?'#b4bccb':'#e9dfd1',f.kind==='chair_use_zone');const [x,y]=plan((f.x[0]+f.x[1])/2,(f.y[0]+f.y[1])/2);s+=t(x-25,y+5,f.id==='STORAGE'?'ตู้':f.kind==='desk'?f.id:'เก้าอี้',15);}
 s+=t(430,py+260,'ทางเดินเสนอ 1100',19)+t(360,py-45,'6000 / 4×1500',20)+t(883,py+220,'3000',18);
 s+=t(55,py+185,'เข้า',18)+t(100,py+440,'แผงปิดปลายอยู่ภายในกรอบ6000 ไม่บวกความหนาออกนอกกริด',17);
 s+=t(1000,214,'02 / ขนาดและข้อจำกัด',23);
 ['โต๊ะ1200×600 จำนวน2ตัว','สูงโต๊ะเสนอ750จากพื้นโครงสร้าง','ธรณีหน้าต่างสูง900: ต่างกัน150','ระยะใช้งานเก้าอี้แยกจากทางเดิน','ตู้ลึก350 อยู่ช่วงท้ายB4','ช่องประตูคอนกรีต1000×2100','ขนาดผ่านสุทธิ/วิธีเปิดยังไม่เลือก','ไม่ใส่ห้องน้ำภายในในข้อเสนอนี้','พื้นที่หน้าประตูภายนอกยังไม่ออกแบบ'].forEach((v,i)=>s+=t(1000,262+i*39,v,18));
 s+=t(60,800,'03 / ชุดปิดปลายด้านหน้า',23);
 const ex=120,ey=1155,q=.105;
 const eb=(x,z,fill,dash=false)=>r(ex+x[0]*q,ey-z[1]*q,(x[1]-x[0])*q,(z[1]-z[0])*q,fill,dash);
 s+=eb([0,3000],[0,3000],'none',true)+eb([170,2830],[175,2500],'#b6d2c3')+eb([1000,2000],[175,2275],'#f5f7fa')+eb([400,2600],[2500,2830],'#e6f1f6',true);
 s+=t(ex+92,ey-80,'1000',18)+t(ex+103,ey-45,'D01',18)+t(100,1190,'EP-D01 / t150 (เสนอ)',18);
 s+=t(565,820,'แผงปิดปลายเสนอ 2660×2325×150',22);
 ['ด้านหน้า EP-D01 มีช่องประตู / ด้านหลัง EP-S01 ทึบ','ขอบข้างเหลือ830ต่อด้าน / เหนือช่องประตู225','แถบเหนือZ2500: สำรองชุดเติมตามโค้ง ยังไม่กำหนดวัสดุ','กรอบประตู วิธีเปิด จุดยึด และฐานรองแผงยังต้องพัฒนา','แผงหลักเดิม12 + แผงปิดปลายเสนอ2 = 14แผง','ยังไม่รวมชุดเติมเหนือแผง ฐาน รอยต่อ และอุปกรณ์','ภาพไม่ได้แสดงว่าชุดเติมหรือรอยต่อมีความสามารถรับแรง','ผังนี้ยังไม่ใช่แบบครบพร้อมใช้งาน/ผลิต'].forEach((v,i)=>s+=t(565,861+i*37,v,18));
 s+=r(40,1230,1520,55,'#e4ebf2')+t(58,1264,'P04 เก็บแยกจากP03 · เฟอร์นิเจอร์/ประตู/แผงปลายเป็นข้อเสนอ · ไม่มีการรัน FEM หรือสร้าง RVT/STD',19);
 return s+'</g></svg>';}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/ic1-layout-p04');fs.mkdirSync(out,{recursive:true});const m=model();fs.writeFileSync(path.join(out,'assembly.json'),JSON.stringify(m,null,2)+'\n');const svg=board(m);fs.writeFileSync(path.join(out,'I-C1-P04.svg'),svg);
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}await sharp(Buffer.from(svg)).png().toFile(path.join(out,'I-C1-P04.png'));
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({id:m.id,status:m.status,engineeringApproved:false,productionReleased:false,visibility:'INTERNAL_TEAM',dependencies:['knowledge/modular-program-r02/decisions.json','tools/modular-program/tsc-master-p02.mjs','tools/modular-program/ic1-p03.mjs','tools/modular-program/ic1-p04.mjs'].map(p=>({path:p,sha256:hash(path.join(root,p))})),files:['assembly.json','I-C1-P04.svg','I-C1-P04.png'].map(p=>({file:p,sha256:hash(path.join(out,p))}))},null,2));console.log(out);
}
