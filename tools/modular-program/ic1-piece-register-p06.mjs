import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {root} from './build-r02.mjs';
import {model} from './ic1-p04.mjs';

const typicalPath='output/typical-review-p05/register.json';
export function build(typicals=JSON.parse(fs.readFileSync(path.join(root,typicalPath))),assembly=model()){
 const rows=[...assembly.pieces,...assembly.endPanels].map((p,i)=>{
  const typicalId=p.segmentTypeId?`${p.segmentTypeId}-${p.proposedVariant}-P05`:`TS-C-${p.type}-P05`;
  const typical=typicals.records.find(t=>t.id===typicalId);
  if(!typical)throw Error(`Missing Typical ${typicalId}`);
  const a=typical.geometry;
  if(p.y[1]-p.y[0]!==a.length)throw Error(`Length mismatch ${p.id}`);
  if(p.thicknessMm!==a.thickness)throw Error(`Thickness mismatch ${p.id}`);
  if(p.x&&p.x[1]-p.x[0]!==a.width)throw Error(`Width mismatch ${p.id}`);
  if(p.z&&p.z[1]-p.z[0]!==a.height)throw Error(`Height mismatch ${p.id}`);
  if(Boolean(p.opening)!==Boolean(a.opening))throw Error(`Opening mismatch ${p.id}`);
  const isHalf=a.kind==='HALF';
  if(p.opening){
   const sourceWidth=isHalf?p.opening.y[1]-p.opening.y[0]:p.opening.x[1]-p.opening.x[0];
   const targetWidth=isHalf?a.opening.localY[1]-a.opening.localY[0]:a.opening.x[1]-a.opening.x[0];
   if(sourceWidth!==targetWidth||p.opening.z[1]-p.opening.z[0]!==a.opening.z[1]-a.opening.z[0])throw Error(`Opening size mismatch ${p.id}`);
   if(isHalf&&(p.opening.y[0]-p.y[0]!==a.opening.localY[0]||p.opening.z[0]!==a.opening.z[0]))throw Error(`Opening position mismatch ${p.id}`);
   if(!isHalf&&(p.opening.x[0]-p.x[0]!==a.opening.x[0]||p.opening.z[0]-p.z[0]!==a.opening.z[0]))throw Error(`Opening position mismatch ${p.id}`);
  }
  const x=p.x??(a.side==='LH'?[0,1490]:[1510,3000]);
  const z=p.z??[175,3000];
  return {number:i+1,instanceId:p.id,typicalId,kind:a.kind,side:a.side??null,variant:p.proposedVariant??p.type,
   boundingBoxMm:{x,y:p.y,z},localOriginMm:[x[0],p.y[0],z[0]],rotationZDeg:0,
   typicalImage:`../typical-review-p05/${typicalId}.png`,
   netVolumeM3:a.mass.netVolumeM3,concreteMassKg:a.mass.concreteMassKg,densityKgM3:a.mass.densityKgM3,
   massStatus:a.mass.status,liftingDesignMassKg:null,releasedForLifting:false};
 });
 const groups=typicals.records.map(t=>{const r=rows.filter(p=>p.typicalId===t.id);return {typicalId:t.id,quantity:r.length,netVolumeM3:r.reduce((s,p)=>s+p.netVolumeM3,0),concreteMassKg:r.reduce((s,p)=>s+p.concreteMassKg,0)};});
 return {id:'PM-I-C1-PIECE-REGISTER-P06',productId:'PM-I-C1',geometryRevision:assembly.id,
  status:'PROPOSED_CORE_PIECES_NOT_COMPLETE_PRODUCTION_BOM',visibility:'INTERNAL_TEAM',units:{geometry:'mm',mass:'kg',volume:'m3'},
  instances:rows,groups,total:{pieceCount:rows.length,netVolumeM3:rows.reduce((s,p)=>s+p.netVolumeM3,0),concreteMassKg:rows.reduce((s,p)=>s+p.concreteMassKg,0)},
  excluded:['REBAR','LIFTING_INSERTS','CONNECTION_STEEL','UPPER_END_INFILL','SUPPORTS_AND_FOUNDATIONS','JOINT_MATERIALS','FINISHES','DOORS_GLAZING','FURNITURE_SERVICES'],
  engineeringApproved:false,productionReleased:false,wholeBuildingMassKg:null,wholeModuleLiftingApproved:false};
}

export function board(m){
 const t=(x,y,s,n=19,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
 const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#7390a0"/>`;
 const fmt=n=>Math.round(n).toLocaleString('en-US');
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1550"><rect width="1600" height="1550" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">';
 s+=t(45,56,'I-C1 / PIECE MAP + CONCRETE MASS',31)+t(45,96,'P06 · จับคู่14ชิ้นกับ7 Typical · กรอบ3000×6000×3000 mm',21);
 s+=rect(40,120,1520,55,'#fff0d8')+t(60,155,'บัญชีชิ้นส่วนหลักเพื่อพัฒนาแบบ — ไม่ใช่BOMครบหลัง / ไม่ใช่แผนยกทั้งโมดูล',22,'#96551b');
 s+=t(60,220,'01 / แปลนระบุตำแหน่งชิ้น — ซีกหลังคาแสดงที่แนวผนัง',22);
 const px=105,py=285,k=.12;
 s+=rect(px,py,6000*k,3000*k,'#fff');
 for(const p of m.instances){
  let {x,y}=p.boundingBoxMm;
  if(p.kind==='HALF')x=p.side==='LH'?[0,150]:[2850,3000];
  const color=p.kind==='FLOOR'?'#e8eef3':p.kind==='END'?'#b6d2c3':p.variant==='W01'?'#7fbfce':'#a3becb';
  s+=rect(px+y[0]*k,py+x[0]*k,(y[1]-y[0])*k,(x[1]-x[0])*k,color);
  if(p.kind==='HALF')s+=t(px+(y[0]+y[1])/2*k-12,py+(p.side==='LH'?-18:3000*k+35),String(p.number),22);
  else if(p.kind==='FLOOR')s+=t(px+(y[0]+y[1])/2*k-13,py+190,String(p.number),23);
  else s+=t(p.number===13?px-45:px+745,py+190,String(p.number),22);
 }
 s+=t(410,735,'6000 = 4 × 1500',21)+t(60,775,'หมายเลขตรงกับบัญชีด้านล่าง · ไม่ใช่ลำดับติดตั้งหรือหมายเลขหูยก',19);
 s+=t(985,235,'02 / รวมเฉพาะ14ชิ้นนี้',23);
 s+=t(985,292,`${m.total.netVolumeM3.toFixed(4)} m³`,35)+t(985,345,`${fmt(m.total.concreteMassKg)} kg`,35)+t(985,391,`ประมาณ ${(m.total.concreteMassKg/1000).toFixed(2)} ตัน`,25);
 ['คอนกรีตทดลอง2400 kg/m³','หักช่องประตูและหน้าต่างแล้ว','ยังไม่รวมเหล็ก อุปกรณ์ฝัง ฐาน','ชุดเติมปลาย งานตกแต่ง และระบบ','ไม่ใช่น้ำหนักอาคารสำเร็จ','ห้ามใช้เลือกเครนหรือระบบยก'].forEach((v,i)=>s+=t(985,450+i*38,v,19));
 s+=t(60,839,'03 / บัญชีชิ้นส่วน — ค่ามวลปัดแสดงเป็น kg; ผลรวมใช้ค่าก่อนปัด',21);
 s+=rect(50,861,1500,42,'#dce7ef');
 [t(65,890,'No.'),t(135,890,'Instance tag'),t(420,890,'Typical tag (revision P05)'),t(905,890,'Y เริ่ม–สิ้นสุด mm'),t(1210,890,'m³'),t(1390,890,'kg')].forEach(v=>s+=v);
 for(const [i,p] of m.instances.entries()){
  const y=932+i*32;
  if(i%2===0)s+=`<rect x="50" y="${y-23}" width="1500" height="31" fill="#eaf0f5"/>`;
  s+=t(65,y,p.number,17)+t(135,y,p.instanceId,17)+t(420,y,p.typicalId.replace('-P05',''),17)+t(905,y,p.boundingBoxMm.y.join(' – '),17)+t(1210,y,p.netVolumeM3.toFixed(4),17)+t(1390,y,fmt(p.concreteMassKg),17);
 }
 s+=t(60,1423,'ขนาดชิ้น/ช่องเปิด/รัศมี: ดูแผ่น Typical P05 ที่เชื่อมกับแต่ละ tag',19);
 s+=rect(40,1460,1520,55,'#fff0d8')+t(60,1495,'ไม่มีการรันโครงสร้าง · จุดรองรับและหูยกยังไม่อนุมัติ · ตัวเลขนี้ไม่รับรองการยกอาคารทั้งหลัง',20,'#96551b');
 return s+'</g></svg>';
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const m=build(),out=path.join(root,'output/ic1-piece-register-p06');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(m,null,2)+'\n');
 const svg=board(m);fs.writeFileSync(path.join(out,'I-C1-PIECES-P06.svg'),svg);
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 await sharp(Buffer.from(svg)).png().toFile(path.join(out,'I-C1-PIECES-P06.png'));
 const md=['# I-C1 — บัญชีชิ้นงาน P06','', 'ข้อเสนอ14ชิ้นหลัก ไม่ใช่BOMครบหลัง ไม่อนุมัติยกหรือผลิต','', '| ชิ้น | Typical / ภาพ3Dและ2D | มวลคอนกรีต kg |','|---|---|---:|',...m.instances.map(p=>`| ${p.instanceId} | [${p.typicalId}](${p.typicalImage}) | ${p.concreteMassKg.toFixed(1)} |`),'',`รวมคอนกรีตสุทธิ ${m.total.netVolumeM3.toFixed(6)} m³ / ${m.total.concreteMassKg.toFixed(1)} kg ที่2400kg/m³`,'','ไม่รวมเหล็ก อุปกรณ์ฝัง จุดต่อ ฐาน ชุดเติมเหนือแผงปลาย ประตู กระจก วัสดุตกแต่ง เฟอร์นิเจอร์และระบบประกอบ','', 'หมายเลขชิ้นไม่ใช่ลำดับติดตั้งหรือพิกัดหูยก; ขั้นตอนประกอบ/ค้ำยันยังต้องออกแบบ',''];
 fs.writeFileSync(path.join(out,'README.md'),md.join('\n'));
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({id:m.id,visibility:'INTERNAL_TEAM',dependencies:[typicalPath,'tools/modular-program/ic1-p03.mjs','tools/modular-program/ic1-p04.mjs','tools/modular-program/ic1-piece-register-p06.mjs'].map(p=>({path:p,sha256:hash(p)})),files:['register.json','README.md','I-C1-PIECES-P06.svg','I-C1-PIECES-P06.png'].map(p=>({file:p,sha256:hash(`output/ic1-piece-register-p06/${p}`)})),engineeringApproved:false,productionReleased:false},null,2));
 console.log(JSON.stringify(m.total));
}
