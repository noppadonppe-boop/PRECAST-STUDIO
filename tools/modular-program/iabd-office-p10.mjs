import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {typical,profile} from './abd-typicals-p08.mjs';import {piece,innerWallX,roofInnerZ,panelLeft} from './abd-floor-ends-p09.mjs';import {model as officeC} from './ic1-p04.mjs';
export function source(family,kind,side=null,variant=null){return kind==='HALF'?typical(family,side,variant):piece(family,kind);}
export const overlap=(a,b)=>a.x[0]<b.x[1]&&b.x[0]<a.x[1]&&a.y[0]<b.y[1]&&b.y[0]<a.y[1];
export function furnitureClearance(family,f){const z=175+(f.heightMm??900),w=innerWallX(family,z);return {wallLeftMm:f.x[0]-w,wallRightMm:3000-w-f.x[1],roofMm:Math.min(roofInnerZ(family,f.x[0]),roofInnerZ(family,f.x[1]))-z};}
export function model(family){
 if(!['A','B','D'].includes(family))throw Error('Unsupported family');
 const name=`I-${family}1`,instances=[];
 function add(id,kind,y0,side=null,variant=null){
  const s=source(family,kind,side,variant),length=s.castLengthMm??s.extrusionYmm,pts=s.profileXZ??s.outlineXZ;
  instances.push({number:instances.length+1,id,typicalId:s.id,kind,side,variant,translationMm:[0,y0,0],rotationZDeg:0,
   boundsMm:{x:[Math.min(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[0]))],y:[y0,y0+length],z:[Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[1]))]},
   opening:s.opening?{y:s.opening.localY.map(y=>y+y0),z:s.opening.globalZ}:kind==='D01'?{x:[1000,2000],z:[175,2275]}:null,
   mass:s.mass,typicalImage:`../${kind==='HALF'?'abd-typicals-p08':'abd-floor-ends-p09'}/${s.id}.png`,engineeringApproved:false,releasedForLifting:false});
 }
 for(let b=0;b<4;b++){const y=b*1500+7.5,v=b===1||b===2?'W01':'S00';for(const side of ['LH','RH'])add(`${name}-B${b+1}-${side}`,'HALF',y,side,v);add(`${name}-B${b+1}-F`,'F01',y);}
 add(`${name}-END-FRONT`,'D01',7.5);add(`${name}-END-REAR`,'S01',5842.5);
 const c=officeC(),furniture=structuredClone(c.furniture);const modifications=[];
 if(family==='D'){const f=furniture.find(v=>v.id==='STORAGE');const before=furnitureClearance(family,f);f.x=[2350,2700];modifications.push({id:f.id,reason:'INCLINED_WALL_COLLISION_AT_TOP',oldX:[2450,2800],newX:f.x,beforeClearanceMm:before,afterClearanceMm:furnitureClearance(family,f)});}
 const clearances=furniture.map(f=>({id:f.id,...furnitureClearance(family,f)}));
 return {id:`PM-${name}-P10`,productId:`PM-${name}`,family,programmeRevision:'R02',status:'ARCHITECTURAL_AND_PIECE_COORDINATION_PROPOSAL',visibility:'INTERNAL_TEAM',
  envelopeMm:{width:3000,length:6000,nominalHeight:3000},bayGridMm:1500,instances,furniture,furnitureClearances:clearances,modifications,circulation:structuredClone(c.circulation),
  planCutZ:1200,door:structuredClone(c.door),assumptions:c.assumptions,
  totals:{corePieceCount:instances.length,netConcreteVolumeM3:instances.reduce((s,p)=>s+p.mass.netVolumeM3,0),coreConcreteMassKg:instances.reduce((s,p)=>s+p.mass.concreteMassKg,0),wholeBuildingMassKg:null},
  upperEndInfill:{status:'NOT_DESIGNED',material:null,massKg:null},pending:[...c.pending,'HEADROOM_AFTER_FINISHES','LIFTING_AND_TEMPORARY_BRACING'],
  engineeringApproved:false,productionReleased:false,wholeModuleLiftingApproved:false};
}
const t=(x,y,s,n=18,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const rect=(x,y,w,h,c,dash=false)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#688496" ${dash?'stroke-dasharray="6 4"':''}/>`;
const poly=(pts,fill='none',stroke='#688496')=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/>`;
const line=(a,b,c='#688496')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}"/>`;
const start=(title,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${h}"><rect width="1600" height="${h}" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">`+t(45,55,title,31);
const end='</g></svg>';
export function planBoard(m){
 const name=m.productId.replace('PM-','');let s=start(`${name} / OFFICE COORDINATION · P10`,1400);
 s+=t(45,94,'สำนักงานเสนอ2ที่นั่ง · 3000×6000×3000 mm · Typical P08/P09 · หน่วย mm',21)+rect(40,115,1520,55,'#fff0d8')+t(60,151,'แบบพัฒนา ไม่อนุมัติผลิต/ก่อสร้าง — ยังไม่ปิดชุดเติมเหนือแผงปลายและยังไม่ออกแบบฐาน',22,'#96551b');
 s+=t(60,217,`01 / แปลนตัดที่ Z${m.planCutZ} + เฟอร์นิเจอร์ฉายจากด้านบน`,22);
 const px=105,py=300,k=.125,plan=(x,y)=>[px+y*k,py+x*k];const box=(x,y,c,dash=false)=>rect(...plan(x[0],y[0]),(y[1]-y[0])*k,(x[1]-x[0])*k,c,dash);
 s+=box([0,3000],[0,6000],'#edf2f6',true);
 const ip=innerWallX(m.family,m.planCutZ),op=ip-profile(m.family).wallHorizontalThickness;
 for(const p of [...m.instances].sort((a,b)=>(a.kind==='F01'?0:1)-(b.kind==='F01'?0:1))){if(p.kind==='F01')s+=box(p.boundsMm.x,p.boundsMm.y,'#fafcfe');else if(p.kind==='HALF'){
  const x=p.side==='LH'?[op,ip]:[3000-ip,3000-op];s+=box(x,p.boundsMm.y,'#89b6c7');if(p.opening)s+=box(x,p.opening.y,'#d5f2f7');
 }else{s+=box([panelLeft(m.family,m.planCutZ),3000-panelLeft(m.family,m.planCutZ)],p.boundsMm.y,'#afd0bd');if(p.kind==='D01')s+=box([1000,2000],p.boundsMm.y,'#f5f7fa');}}
 s+=box(m.circulation.x,m.circulation.y,'#e6efdd',true);
 for(const f of m.furniture){s+=box(f.x,f.y,f.kind==='desk'?'#dcbc95':f.kind==='cabinet'?'#b9c1d0':'#eee0ce',f.kind==='chair_use_zone');const [x,y]=plan((f.x[0]+f.x[1])/2,(f.y[0]+f.y[1])/2);s+=t(x-26,y+5,f.kind==='desk'?f.id:f.kind==='cabinet'?'STORAGE':'CHAIR',14);}
 for(let b=0;b<4;b++)s+=t(px+b*187.5+62,py-24,`B${b+1}`,19);
 s+=t(430,252,'6000 = 4×1500',20)+t(875,500,'3000',18)+t(55,492,'เข้า',17)+t(437,605,'ทางเดิน1100',18);
 s+=t(100,717,'เส้นประ: กรอบนอกอ้างอิง / หน้าต่าง B2-B3 สองด้าน รวม4ช่อง',18)+t(100,750,'ไม่ใส่ห้องน้ำภายใน: ต้องยืนยันบริการภายนอก/ระบบประกอบ',18,'#96551b');
 s+=t(985,219,'02 / ตรวจผังตามความสูงชิ้น',22);
 const note=[`คอนกรีตหลัก14ชิ้น ≈ ${(m.totals.coreConcreteMassKg/1000).toFixed(2)} ตัน`,'โต๊ะ1200×600 สูง750 จำนวน2ตัว','ช่วงทางเดินตรงเสนอ1100','ช่องประตูคอนกรีต1000×2100','กรอบ/บาน/ช่องผ่านจริงยังไม่เลือก',m.family==='D'?'D: เลื่อนตู้เข้าด้านใน100mm':'ตู้ลึก350 สูง1800: คงตำแหน่งเดิม',m.family==='D'?'ระยะตู้ถึงผนังที่ยอด ≈22.2mm':'ไม่ตรวจงานระบบและความหนาผิวตกแต่ง'];
 note.forEach((v,i)=>s+=t(985,267+i*43,v,18));
 s+=t(985,625,'ไม่ใช่น้ำหนักอาคารสำเร็จ',20,'#96551b')+t(985,660,'ไม่อนุมัติยกทั้งโมดูล',20,'#96551b');
 s+=t(65,820,'03 / รูปด้านหน้า + ช่องเติมเหนือแผง',22);
 const q=([x,z])=>[105+x*.13,1255-z*.13],pr=profile(m.family,64),ep=piece(m.family,'D01');
 s+=poly(pr.points.map(q),'#d3e3ec')+poly(pr.points.map(([x,z])=>q([3000-x,z])),'#d3e3ec')+poly(ep.outlineXZ.map(q),'#afd0bd');
 s+=t(105,1300,'พื้น/แผง Z175 เป็นdatum ไม่ใช่รายละเอียดbearing',16);
 s+=t(705,820,'04 / รูปด้านข้าง — ตำแหน่งช่องเปิด',22);
 const sx=735,sy=1230,sc=.11,actualTop=profile(m.family).maxConcreteZ;for(let b=0;b<4;b++){
  s+=rect(sx+(b*1500+7.5)*sc,sy-(actualTop-175)*sc,1485*sc,(actualTop-175)*sc,'#d3e3ec');
  if(b===1||b===2)s+=rect(sx+(b*1500+300)*sc,sy-(2275-175)*sc,900*sc,1200*sc,'#e5f6fa');
 }
 s+=t(740,1271,'ช่อง900×1200 สูงธรณี900เหนือพื้นโครงสร้าง',18)+t(740,1303,'ภาพฉาย: ยอดA/Bจริงต่ำกว่าZ3000เล็กน้อยเพราะgapกลาง',16);
 s+=rect(40,1340,1520,42,'#fff0d8')+t(60,1368,'ยังค้าง: ชุดเติมเหนือแผง / joint / ฐาน / บานประตู / ระบายน้ำ / เหล็ก / การยกและค้ำยัน',19,'#96551b');return s+end;
}
export function scheduleBoard(m){
 const name=m.productId.replace('PM-','');let s=start(`${name} / 3D + PIECE REGISTER · P10`,1500);
 s+=t(45,95,'ชิ้นส่วนหลัก14ชิ้น · หมายเลขไม่ใช่ลำดับยก/ติดตั้ง · น้ำหนักคอนกรีตที่2400kg/m³',20);
 s+=rect(40,116,1520,50,'#fff0d8')+t(60,149,'wireframeจากพิกัดจริง ไม่มีhidden-line removal — ไม่แสดงอุปกรณ์ที่ยังไม่ออกแบบ',21,'#96551b');
 const iso=([x,y,z])=>[140+y*.13+x*.08,650-y*.025+x*.045-z*.115];
 for(const p of [...m.instances].reverse()){
  const src=p.kind==='HALF'?typical(m.family,p.side,p.variant,32):piece(m.family,p.kind),pts=src.profileXZ??src.outlineXZ;
  const color=p.kind==='F01'?'#93a3ad':p.kind==='HALF'?'#6e95a7':'#568c72';
  const a=pts.map(([x,z])=>iso([x,p.boundsMm.y[0],z])),b=pts.map(([x,z])=>iso([x,p.boundsMm.y[1],z]));s+=poly(a,'none',color)+poly(b,'none',color);
  for(const i of [0,1,Math.floor(pts.length/2),pts.length-1])s+=line(a[i],b[i],color);
  if(src.opening)s+=poly(src.opening.outerFaceCornersMm.map(([x,y,z])=>iso([x,y+p.translationMm[1],z])),'none','#07858e');
 }
 s+=t(1210,250,'คอนกรีตหลัก',21)+t(1210,294,`${m.totals.netConcreteVolumeM3.toFixed(3)} m³`,27)+t(1210,342,`${(m.totals.coreConcreteMassKg/1000).toFixed(2)} ตัน`,30);
 s+=t(1210,392,'ไม่รวมเหล็ก/อุปกรณ์',17)+t(1210,423,'ฐาน ชุดเติม และตกแต่ง',17);
 s+=t(60,800,'บัญชีชิ้นรายinstance · ภาพTypicalรายชิ้นเชื่อมในREADME',20)+rect(50,825,1500,40,'#dce7ef');
 s+=t(65,852,'No.')+t(130,852,'Instance tag')+t(430,852,'Typical tag')+t(960,852,'Y เริ่ม–สิ้นสุด mm')+t(1230,852,'m³')+t(1410,852,'kg');
 for(const [i,p] of m.instances.entries()){const y=896+i*32;if(i%2===0)s+=rect(50,y-22,1500,30,'#eaf0f5');s+=t(65,y,p.number,16)+t(130,y,p.id,17)+t(430,y,p.typicalId,17)+t(960,y,p.boundsMm.y.join('–'),16)+t(1230,y,p.mass.netVolumeM3.toFixed(4),17)+t(1410,y,Math.round(p.mass.concreteMassKg).toLocaleString('en-US'),17);}
 s+=t(60,1374,'ผลรวมใช้ค่าก่อนปัด · อาคารยังไม่ครบชุดกันฝน · ไม่มีการรับรองการยกทั้งหลัง',19,'#96551b');
 s+=rect(40,1415,1520,50,'#fff0d8')+t(60,1447,'14ชิ้น/หลังไม่รวมชุดเติมเหนือปลาย ฐาน จุดต่อ ผิวตกแต่ง ประตู/กระจก และระบบประกอบ',20,'#96551b');return s+end;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/iabd-office-p10');fs.mkdirSync(out,{recursive:true});const records=['A','B','D'].map(model);
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const files=[];for(const m of records){const n=m.productId.replace('PM-','');for(const [suffix,svg] of [['PLAN',planBoard(m)],['PIECES',scheduleBoard(m)]]){const f=`${n}-${suffix}-P10`;fs.writeFileSync(path.join(out,f+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,f+'.png'));files.push(f+'.svg',f+'.png');}
  const md=[`# ${n} — ผังและบัญชีชิ้น P10`,'','ข้อเสนอพัฒนา ไม่อนุมัติผลิต/ยก ไม่ใช่BOMครบอาคาร','',`[ผัง](${n}-PLAN-P10.png) / [3Dและบัญชี](${n}-PIECES-P10.png)`,'','| ชิ้น | Typical | มวลคอนกรีต kg |','|---|---|---:|',...m.instances.map(p=>`| ${p.id} | [${p.typicalId}](${p.typicalImage}) | ${p.mass.concreteMassKg.toFixed(1)} |`),'',`รวม ${m.totals.netConcreteVolumeM3.toFixed(6)} m³ / ${m.totals.coreConcreteMassKg.toFixed(1)} kg เฉพาะคอนกรีต14ชิ้น`,'','ไม่รวมเหล็ก อุปกรณ์ฝัง ฐาน ชุดเติมปลาย วัสดุตกแต่ง ประตู/กระจก และระบบประกอบ',''];fs.writeFileSync(path.join(out,n+'.md'),md.join('\n'));files.push(n+'.md');
 }
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify({revision:'P10',records,visibility:'INTERNAL_TEAM',engineeringApproved:false,productionReleased:false},null,2));files.push('register.json');
 const index=['# สำนักงานแปลน I — A/B/D P10','','| แบบ | แปลน | 3D/บัญชี | คอนกรีตหลัก ตัน |','|---|---|---|---:|',...records.map(m=>{const n=m.productId.replace('PM-','');return`| [${n}](${n}.md) | [เปิดภาพ](${n}-PLAN-P10.png) | [เปิดภาพ](${n}-PIECES-P10.png) | ${(m.totals.coreConcreteMassKg/1000).toFixed(3)} |`;}),'','I-C1 P06เดิม: คอนกรีตหลัก25.994ตัน ไม่ได้แก้ในชุดนี้','', 'Dเลื่อนตู้จากX2450–2800เป็น2350–2700เพื่อหลบผนังเอียงที่ยอดตู้ ไม่ใช่ตรวจผ่านการใช้งาน/กฎหมายทั้งหมด','', 'ยังไม่รวมชิ้นส่วนที่ค้าง ไม่อนุมัติยกทั้งโมดูล ไม่เชื่อมเว็บ/RVT/STDในรอบนี้',''];fs.writeFileSync(path.join(out,'README.md'),index.join('\n'));files.push('README.md');
 const thumbs=await Promise.all(records.flatMap(m=>['PLAN','PIECES'].map(s=>sharp(path.join(out,`${m.productId.replace('PM-','')}-${s}-P10.png`)).resize({width:480,height:450,fit:'contain',background:'#fff'}).toBuffer())));
 await sharp({create:{width:960,height:1350,channels:3,background:'#fff'}}).composite(thumbs.map((input,i)=>({input,left:i%2*480,top:Math.floor(i/2)*450}))).png().toFile(path.join(out,'CONTACT-P10.png'));files.push('CONTACT-P10.png');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({visibility:'INTERNAL_TEAM',dependencies:['tools/modular-program/iabd-office-p10.mjs','tools/modular-program/ic1-p04.mjs','tools/modular-program/abd-typicals-p08.mjs','tools/modular-program/abd-floor-ends-p09.mjs','output/abd-typicals-p08/register.json','output/abd-floor-ends-p09/register.json'].map(p=>({path:p,sha256:hash(p)})),files:files.map(f=>({file:f,sha256:hash('output/iabd-office-p10/'+f)}))},null,2));console.log(JSON.stringify(records.map(m=>({id:m.id,totals:m.totals,modifications:m.modifications})),null,2));
}
