import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {profile} from './abd-typicals-p08.mjs';import {area} from './abd-master-p07.mjs';

export const panelLeft=(family,z)=>family==='D'?171+(z-175)*165/2325:170;
export function innerWallX(family,z){const p=profile(family);return p.wallSlope*(z-175)+p.wallHorizontalThickness;}
export function roofInnerZ(family,x){const p=profile(family);if(family==='A')return 2700+.2*Math.min(x,3000-x)-p.parameters.innerVerticalDropMm;if(family==='B')return -900+Math.sqrt(3750**2-(x-1500)**2);return 2850;}

export function piece(family,kind){
 if(!['A','B','D'].includes(family)||!['F01','D01','S01'].includes(kind))throw Error('Unsupported piece');
 const floor=kind==='F01',door=kind==='D01',left0=panelLeft(family,175),left1=panelLeft(family,2500);
 let outline=floor?[[170,0],[170,175],[2830,175],[2830,0]]:[[left0,175],[left1,2500],[3000-left1,2500],[3000-left0,175]];
 const grossArea=area(outline);
 if(door)outline.push([2000,175],[2000,2275],[1000,2275],[1000,175]);
 const extrusion=floor?1485:150,netArea=area(outline),gross=grossArea*extrusion/1e9,net=netArea*extrusion/1e9;
 const shapeKey=floor?'F-2660-1485-175':`${family==='D'?'EP-TRAP-2658-2328':'EP-RECT-2660'}-2325-150-${kind}`;
 const fit=floor?{nominalHorizontalSideGapAtFloorTopMm:170-innerWallX(family,175),bearingLengthMm:null}: {
  horizontalSideGapMm:[175,2500].map(z=>panelLeft(family,z)-innerWallX(family,z)),
  minimumVerticalRoofGapAtPanelTopMm:roofInnerZ(family,left1)-2500,
  baseJointGapMm:null,bearingLengthMm:null,baseDatumZ:175,baseContactWithFloor:'COINCIDENT_DATUM_NOT_BEARING_DESIGN'};
 return {id:`TS-${family}-${floor?'F15-F01':`EP-${kind}`}-P09`,family,kind,shapeKey,
  geometrySource:`TS-${family}-PROFILE-P08`,status:'COORDINATION_PROPOSAL_NOT_FOR_PRODUCTION',visibility:'INTERNAL_TEAM',units:'mm',
  outlineXZ:outline,extrusionYmm:extrusion,normalThicknessMm:floor?175:150,
  dimensions:{bottomWidthMm:floor?2660:3000-2*left0,topWidthMm:floor?2660:3000-2*left1,heightMm:floor?175:2325,sideInsetMm:floor?0:left1-left0,
   doorWidthMm:door?1000:null,doorHeightMm:door?2100:null,headerMm:door?225:null,minDoorPierWidthMm:door?1000-panelLeft(family,2275):null},
  mass:{grossVolumeM3:gross,voidVolumeM3:gross-net,netVolumeM3:net,densityKgM3:2400,concreteMassKg:net*2400,liftingDesignMassKg:null,
   status:'CONCRETE_ONLY_ESTIMATE_NOT_FOR_LIFTING',excluded:['REBAR','INSERTS','CONNECTIONS','FINISHES','DOOR_FRAME','UPPER_END_INFILL']},
  fit,upperEndInfill:floor?null:{bottomZ:2500,geometryStatus:'SPACE_ONLY_NOT_A_DESIGNED_PIECE',material:null,massKg:null,supports:null},
  liftingPlan:{status:'STUDY_ZONE_TEXT_ONLY',anchorCoordinatesMm:null,quantity:null,cgMm:null,releasedForLifting:false},
  mouldSharing:'GEOMETRY_CANDIDATE_ONLY_INSERTS_REBAR_AND_TOLERANCES_UNRESOLVED',engineeringApproved:false,productionReleased:false};
}
export const catalogue=()=>['A','B','D'].flatMap(c=>['F01','D01','S01'].map(k=>piece(c,k)));
const t=(x,y,s,n=18,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const line=(a,b,c='#708a9c')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="1.2"/>`;
const poly=(pts,fill='none',stroke='#55768b')=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`;
const dim=(x,y,w,label)=>line([x,y],[x+w,y])+line([x,y-7],[x,y+7])+line([x+w,y-7],[x+w,y+7])+t(x+w/2-24,y-10,label,16);
export function board(m){
 const floor=m.kind==='F01',door=m.kind==='D01',d=m.dimensions,xmin=Math.min(...m.outlineXZ.map(p=>p[0])),zmin=floor?0:175;
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1450"><rect width="1600" height="1450" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">';
 s+=t(45,55,m.id,31)+t(45,95,'P09 · พื้นร่วมและแผงปิดปลาย · ข้อมูลสอดคล้องหน้าตัดP08 · หน่วย mm',20);
 s+='<rect x="40" y="116" width="1520" height="55" fill="#fff0d8"/>'+t(60,151,'ข้อเสนอเพื่อประสานงาน — ไม่อนุมัติผลิต/ยก — ระยะรองรับและจุดยึดยังไม่ออกแบบ',22,'#96551b');
 s+=t(65,215,floor?'01 / แปลนพื้น':'01 / รูปด้านแผงปิดปลาย',22)+t(820,215,'02 / 3D wireframe รายชิ้น',22);
 const k=.16,p=([x,z])=>[130+(x-xmin)*k,700-(z-zmin)*k];
 if(floor){s+=poly([[130,380],[130+2660*k,380],[130+2660*k,380+1485*k],[130,380+1485*k]],'#dce7ef')+dim(130,650,2660*k,'2660')+t(580,510,'1485',18)+t(230,470,'พื้นหนา175',23);}
 else{
  s+=poly(m.outlineXZ.map(p),'#b7d4c5')+dim(130,745,d.bottomWidthMm*k,String(d.bottomWidthMm))+t(65,520,'2325',17);
  s+=line([105,700-2325*k],[105,700]);
  if(m.family==='D')s+=dim(130+d.sideInsetMm*k,295,d.topWidthMm*k,String(d.topWidthMm));
  if(door)s+=dim(130+(1000-xmin)*k,720,1000*k,'1000')+t(290,520,'2100',20)+t(620,350,'หัว225',18);
  s+=t(130,789,door?'ช่องประตูคอนกรีต1000×2100 ไม่ใช่ช่องผ่านสุทธิ':'แผงทึบ ไม่มีช่องเปิด',17);
 }
 const iso=([x,y,z])=>[885+(x-xmin)*.16+y*.10,720+(x-xmin)*.025-y*.09-(z-zmin)*.16];
 const aa=m.outlineXZ.map(([x,z])=>iso([x,0,z])),bb=m.outlineXZ.map(([x,z])=>iso([x,m.extrusionYmm,z]));s+=poly(aa)+poly(bb);
 for(let i=0;i<aa.length;i++)s+=line(aa[i],bb[i]);
 s+=t(850,792,floor?'พื้น2660×1485×175 / ไม่มีการกำหนดช่วงรองรับ':'แผงหนา150 / ขอบช่องและผิวหน้า–หลังแสดงด้วยเส้น',18);
 s+=t(65,860,floor?'03 / หน้าตัดขวาง + ช่องข้างพื้น':'03 / แผงปลายในหน้าตัดอาคาร',22);
 const q=([x,z])=>[115+x*.145,1310-z*.145];const pr=profile(m.family,64);
 if(floor){
  const zz=1120;s+=poly([[115,zz],[115+2660*.16,zz],[115+2660*.16,zz+175*.16],[115,zz+175*.16]],'#dce7ef')+dim(115,zz+65,2660*.16,'2660')+t(560,zz+20,'175',18);
  s+=t(110,1000,`ช่องข้างพื้นเสนอ ${m.fit.nominalHorizontalSideGapAtFloorTopMm.toFixed(3)} ต่อด้าน`,19)+t(110,1040,'วัดแนวราบที่Z175 ไม่ใช่bearing length',18)+t(110,1250,'ผนังและพื้นใช้แนวรองรับแยก LP-A',18);
 }else{
  s+=poly(pr.points.map(q),'#d5e4eb')+poly(pr.points.map(([x,z])=>q([3000-x,z])),'#d5e4eb')+poly(m.outlineXZ.map(q),'#b7d4c5');
  s+=t(165,925,'พื้นที่เหนือแผง: ชุดเติมยังไม่ออกแบบ',16,'#96551b')+t(105,1340,'แผงเริ่มZ175 เสมอพื้น: ยังไม่สรุปรายละเอียดรองรับ',16);
 }
 s+=t(760,860,'04 / มิติ น้ำหนัก และข้อคงค้าง',22);
 const info=floor?['ขนาดร่วมกับพื้น TS-C P05',`ขนาด2660×1485×175 / gapช่วง15`,m.family==='D'?'D: ช่องข้าง19.625 ไม่ใช่20พอดี':'A/B: ช่องข้าง20ต่อด้าน','รูปทรงร่วมไม่ยืนยันแม่แบบ/เหล็กใช้ร่วมได้']: [
  `กว้างล่าง${d.bottomWidthMm} / บน${d.topWidthMm} / สูง2325`,
  m.family==='D'?'ขอบบนหุบ165ต่อข้าง / หนา150':'แผงสี่เหลี่ยมร่วมรูปทรงกับ TS-C P05',
  door?`เนื้อข้างช่องต่ำสุด${d.minDoorPierWidthMm.toFixed(1)} / หัว225`:'แผงทึบ: ไม่หักปริมาตรช่องเปิด',
  `ช่องถึงใต้หลังคาที่ขอบบนต่ำสุด ${m.fit.minimumVerticalRoofGapAtPanelTopMm.toFixed(1)}`];
 info.forEach((v,i)=>s+=t(760,905+i*33,v,18));
 s+=t(760,1068,`${m.mass.netVolumeM3.toFixed(4)} m³ ≈ ${Math.round(m.mass.concreteMassKg).toLocaleString('en-US')} kg`,24)+t(760,1104,'ฐาน2400kg/m³ ไม่รวมเหล็ก/อุปกรณ์/ผิวตกแต่ง',18);
 s+=t(760,1150,'หูยก: โซนศึกษาเท่านั้น ไม่มีพิกัดที่อนุมัติ',18,'#96551b');
 s+=t(760,1182,floor?'ศึกษาโซนบนแผ่นรอบCGสองทิศ ไม่กำหนดจำนวนหู':door?'หัวแผงเหนือประตู225ยังไม่พิสูจน์ว่าฝังanchorได้':'ศึกษาเนื้อทึบช่วงบน ตรวจระยะขอบและความลึกฝัง',17,'#96551b');
 s+=t(760,1214,'แยกDEM/ROT/ERECT และค้ำยันชั่วคราว',17,'#96551b')+t(760,1253,'ค้าง: bearing / joint / tolerance / pocket / เหล็ก',17)+t(760,1286,'ไม่ใช่BOMครบหลัง ไม่อนุมัติเลือกเครนตามน้ำหนักนี้',17);
 s+='<rect x="40" y="1380" width="1520" height="45" fill="#fff0d8"/>'+t(60,1409,'ตรวจรูปทรงไม่ชนในแบบเสนอเท่านั้น ไม่ตรวจแรง และไม่รับรองความสามารถรับแรงของแผงหรือจุดต่อ',19,'#96551b');
 return s+'</g></svg>';
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/abd-floor-ends-p09');fs.mkdirSync(out,{recursive:true});const records=catalogue();
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 for(const m of records){const svg=board(m);fs.writeFileSync(path.join(out,m.id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,m.id+'.png'));}
 const reg={revision:'P09',records,uniqueGeometryCount:new Set(records.map(m=>m.shapeKey)).size,visibility:'INTERNAL_TEAM',engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(reg,null,2));
 const md=['# A/B/D — พื้นและแผงปิดปลาย P09','', '9รายการตามครอบครัว มี5รูปทรงไม่ซ้ำ ไม่ได้หมายถึง9แบบหล่อใหม่','', '| Typical / ภาพ3D+2D | ปริมาตร m³ | มวลคอนกรีต kg |','|---|---:|---:|',...records.map(m=>`| [${m.id}](${m.id}.png) | ${m.mass.netVolumeM3.toFixed(6)} | ${m.mass.concreteMassKg.toFixed(1)} |`),'', 'ใช้2400kg/m³ ไม่รวมเหล็ก อุปกรณ์และตกแต่ง ไม่ใช่น้ำหนักอนุมัติยก','', 'รูปทรงพื้นและแผงสี่เหลี่ยมเป็นการเสนอใช้ร่วมกับC ไม่ยืนยันว่าแม่แบบและเหล็กใช้ร่วมได้','', 'ยังไม่รวมชุดเติมเหนือแผงปลาย ไม่มีแบบbearing/joint/anchorที่อนุมัติ',''];fs.writeFileSync(path.join(out,'README.md'),md.join('\n'));
 const thumbs=await Promise.all(records.map(m=>sharp(path.join(out,m.id+'.png')).resize(480,435).toBuffer()));
 await sharp({create:{width:1440,height:1305,channels:3,background:'#fff'}}).composite(thumbs.map((input,i)=>({input,left:i%3*480,top:Math.floor(i/3)*435}))).png().toFile(path.join(out,'CONTACT-P09.png'));
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({visibility:'INTERNAL_TEAM',dependencies:['tools/modular-program/abd-floor-ends-p09.mjs','tools/modular-program/abd-typicals-p08.mjs','tools/modular-program/abd-master-p07.mjs','output/abd-typicals-p08/register.json','output/typical-review-p05/register.json','knowledge/modular-program-r02/decisions.json'].map(p=>({path:p,sha256:hash(p)})),files:['register.json','README.md','CONTACT-P09.png',...records.flatMap(m=>[m.id+'.svg',m.id+'.png'])].map(f=>({file:f,sha256:hash('output/abd-floor-ends-p09/'+f)}))},null,2));
 console.log(JSON.stringify(records.map(m=>({id:m.id,kg:m.mass.concreteMassKg,fit:m.fit})),null,2));
}
