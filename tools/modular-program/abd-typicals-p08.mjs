import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {area,family as prior} from './abd-master-p07.mjs';

// Coordination proposal, not a capacity design. Original P07 stays immutable.
export function profile(code,steps=4096){
 if(!['A','B','D'].includes(code))throw Error('Unsupported family');
 let points,parameters,innerJunctionZ,outerJunctionZ=2700,wallSlope=0,wallHorizontalThickness=150;
 if(code==='A'){
  const slope=.2,drop=150*Math.sqrt(1+slope*slope),zi=x=>2700+slope*x-drop;
  points=[[0,175],[0,2700],[1490,2998],[1490,zi(1490)],[150,zi(150)],[150,175]];
  innerJunctionZ=zi(150);parameters={eaveZ:2700,nominalRidgeZ:3000,riseMm:300,slope,angleDeg:Math.atan(slope)*180/Math.PI,innerVerticalDropMm:drop};
 }else if(code==='B'){
  const R=3900,r=3750,zc=-900,z=(x,rad)=>zc+Math.sqrt(rad*rad-(x-1500)**2);
  const arc=(a,b,rad)=>Array.from({length:steps+1},(_,i)=>{const x=a+(b-a)*i/steps;return[x,z(x,rad)];});
  points=[[0,175],...arc(0,1490,R),...arc(1490,150,r),[150,175]];
  innerJunctionZ=z(150,r);parameters={springZ:2700,nominalCrownZ:3000,riseMm:300,outerRadiusMm:R,innerRadiusMm:r,centerMm:[1500,zc],shoulder:'KINK_NOT_TANGENT'};
 }else{
  const p=prior('D');points=p.lh;parameters=p.params;innerJunctionZ=2850;outerJunctionZ=3000;wallSlope=p.params.wallSlopeDxDz;wallHorizontalThickness=p.params.horizontalWallThickness;
 }
 return {family:code,points,parameters,innerJunctionZ,outerJunctionZ,wallSlope,wallHorizontalThickness,
  clearHeightAtWallRoofJunctionMm:innerJunctionZ-175,maxConcreteZ:Math.max(...points.map(p=>p[1])),
  sectionAreaMm2:area(points),source:'ASSISTANT_PROPOSAL_NOT_USER_APPROVED'};
}

export function typical(code,side,variant,steps=4096){
 if(!['LH','RH'].includes(side)||!['S00','W01'].includes(variant))throw Error('Invalid variant');
 const p=profile(code,steps),y0=292.5,y1=1192.5,z0=1075,z1=2275;
 const mapX=x=>side==='LH'?x:3000-x;
 const face=inner=>[[y0,z0],[y1,z0],[y1,z1],[y0,z1]].map(([y,z])=>[mapX(p.wallSlope*(z-175)+(inner?p.wallHorizontalThickness:0)),y,z]);
 const opening=variant==='W01'?{id:'W01',widthAlongYMm:900,heightVerticalMm:1200,localY:[y0,y1],globalZ:[z0,z1],sillAboveStructuralFloorMm:900,
  sideLigamentsMm:[y0,1485-y1],verticalHeadToInnerJunctionMm:p.innerJunctionZ-z1,
  outerFaceCornersMm:face(false),innerFaceCornersMm:face(true),cutDirection:'GLOBAL_X_THROUGH_WALL',
  heightAlongWallFaceMm:1200*Math.sqrt(1+p.wallSlope**2),frameStatus:'NOT_DESIGNED_NOT_NET_GLAZING_SIZE'}:null;
 const gross=p.sectionAreaMm2*1485/1e9,voidV=opening?900*1200*p.wallHorizontalThickness/1e9:0;
 const pts=p.points.map(([x,z])=>[mapX(x),z]);
 return {id:`TS-${code}-H15-${side}-${variant}-P08`,family:code,side,variant,geometryRevision:`TS-${code}-PROFILE-P08`,
  status:'DIMENSIONAL_PROPOSAL_NOT_FABRICATION',visibility:'INTERNAL_TEAM',units:'mm',castLengthMm:1485,bayGridMm:1500,crownGapMm:20,normalThicknessMm:150,
  boundsMm:{x:side==='LH'?[0,1490]:[1510,3000],y:[0,1485],z:[175,p.maxConcreteZ]},profileXZ:pts,parameters:p.parameters,
  innerWallRoofJunctionZ:p.innerJunctionZ,outerWallRoofJunctionZ:p.outerJunctionZ,clearHeightAtWallRoofJunctionMm:p.clearHeightAtWallRoofJunctionMm,
  wallHorizontalThicknessMm:p.wallHorizontalThickness,wallSlopeDxDz:p.wallSlope,opening,
  mass:{grossVolumeM3:gross,voidVolumeM3:voidV,netVolumeM3:gross-voidV,densityKgM3:2400,concreteMassKg:(gross-voidV)*2400,
   method:code==='B'?'SAMPLED_ARC_POLYGON_MINUS_HORIZONTAL_WINDOW_CUT':'POLYGON_MINUS_HORIZONTAL_WINDOW_CUT',arcSteps:code==='B'?steps:null,
   excluded:['REBAR','INSERTS','JOINT_HARDWARE','FINISHES','GLAZING'],liftingDesignMassKg:null,status:'CONCRETE_ONLY_ESTIMATE_NOT_FOR_LIFTING'},
  liftingPlan:{status:'STUDY_ZONES_TEXT_ONLY',stages:['DEM','ROT','ERECT'],anchorCoordinatesMm:null,quantity:null,cgMm:null,releasedForLifting:false},
  dimensionReview:{status:'DEFINED_GEOMETRY_CHECKED_DETAIL_DIMENSIONS_PENDING',pending:['ANCHORS_POCKETS','CONNECTIONS','BEARINGS','TOLERANCES','WINDOW_FRAMES','REINFORCEMENT','DRAINAGE']},engineeringApproved:false,productionReleased:false};
}
export const catalogue=()=>['A','B','D'].flatMap(c=>['LH','RH'].flatMap(s=>['S00','W01'].map(v=>typical(c,s,v))));
const text=(x,y,s,n=18,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const line=(a,b,c='#728d9d')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="1.3"/>`;
const poly=(p,fill='none',stroke='#55768b')=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`;
const hd=(x,y,w,label)=>line([x,y],[x+w,y])+line([x,y-6],[x,y+6])+line([x+w,y-6],[x+w,y+6])+text(x+w/2-25,y-9,label,16);
const vd=(x,y,h,label)=>line([x,y],[x,y+h])+line([x-6,y],[x+6,y])+line([x-6,y+h],[x+6,y+h])+text(x-54,y+h/2,label,16);
export function board(m){
 const d=typical(m.family,m.side,m.variant,64),xmin=m.boundsMm.x[0],zmin=175,h=m.boundsMm.z[1]-175;
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1500"><rect width="1600" height="1500" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">';
 s+=text(45,55,m.id,31)+text(45,94,'TYPICAL P08 · ซีกทึบ/ช่องหน้าต่าง · หน่วย mm · geometry proposal',20);
 s+='<rect x="40" y="114" width="1520" height="55" fill="#fff0d8"/>'+text(60,150,'ข้อเสนอเพื่อพัฒนาแบบ — ไม่อนุมัติผลิต/ยก — A/B เปลี่ยนชายคาจากP07',22,'#96551b');
 s+=text(65,212,'01 / หน้าตัดปลายชิ้น (นอกแนวหน้าต่าง)',22)+text(830,212,'02 / 3D wireframe จาก geometry เดียวกัน',22);
 const p=([x,z])=>[140+(x-xmin)*.155,725-(z-zmin)*.155];s+=poly(d.profileXZ.map(p),'#c2dce7');
 s+=hd(140,770,1490*.155,'1490')+vd(99,725-h*.155,h*.155,h.toFixed(1));
 s+=text(415,310,'t150 ตั้งฉากผิว',18)+text(415,345,`ระดับเท้า Z175`,18)+text(415,380,`ยอดชิ้น Z${m.boundsMm.z[1].toFixed(2)}`,18);
 if(m.family==='A')s+=text(415,426,'ชายคา Z2700',18)+text(415,461,'ลาด20% / 11.31°',18);
 if(m.family==='B')s+=text(415,426,'Ro3900 / Ri3750',18)+text(415,461,'ศูนย์ X1500,Z−900',18)+text(415,496,'ต่อผนังแบบหักมุม',18);
 if(m.family==='D')s+=text(415,426,'ผนังเอียง4.05°',18)+text(415,461,'หุบข้างละ200',18)+text(415,496,'บนกว้าง2600',18);
 const iso=([x,y,z])=>[900+(x-xmin)*.155+y*.13,728+(x-xmin)*.022-y*.062-(z-zmin)*.145];
 const a=d.profileXZ.map(([x,z])=>iso([x,0,z])),b=d.profileXZ.map(([x,z])=>iso([x,1485,z]));s+=poly(a)+poly(b);
 for(const i of [0,1,Math.floor(a.length/2),a.length-1])s+=line(a[i],b[i]);
 if(m.opening){const o=m.opening;s+=poly(o.outerFaceCornersMm.map(iso),'none','#07868d')+poly(o.innerFaceCornersMm.map(iso),'none','#07868d');for(let i=0;i<4;i++)s+=line(iso(o.outerFaceCornersMm[i]),iso(o.innerFaceCornersMm[i]),'#07868d');}
 s+=text(845,782,'ยาวชิ้น1485 / ไม่มีhidden-line removal',18)+text(845,814,m.opening?'เส้นเขียว: ขอบช่องคอนกรีต ไม่ใช่กรอบหน้าต่าง':'S00: ชิ้นทึบ ไม่มีช่องเปิด',18);
 s+=text(65,873,'03 / รูปด้านตามยาว (ฉายแกน Y–Z)',22);
 const k=.105,xx=140,bottom=1265,top=bottom-h*k;
 s+=poly([[xx,top],[xx+1485*k,top],[xx+1485*k,bottom],[xx,bottom]],'#c2dce7')+hd(xx,top-23,1485*k,'1485');
 const j=bottom-(m.outerWallRoofJunctionZ-175)*k;s+=line([xx,j],[xx+1485*k,j],'#9a704e')+text(325,j+5,'แนวต่อผนังนอก',16);
 if(m.opening){const q=([y,z])=>[xx+y*k,bottom-(z-175)*k];s+=poly([[292.5,1075],[1192.5,1075],[1192.5,2275],[292.5,2275]].map(q),'#f5f7fa','#07868d');
  s+=hd(xx+292.5*k,bottom-900*k+25,900*k,'900')+vd(110,bottom-2100*k,1200*k,'1200');
  s+=text(325,1122,'ข้าง292.5ทั้งสองด้าน',17)+text(325,1154,'ธรณีสูง900จากบนพื้น',17)+text(325,1186,'Zช่อง1075–2275',17);
 }
 s+=text(75,1310,m.family==='D'?'D: 1200เป็นความสูงดิ่ง ไม่ใช่ระยะตามผนังเอียง':'มิติรูปด้านเป็นระยะฉาย ไม่ใช่มิติตามผิวหลังคา',17);
 s+=text(730,873,'04 / ข้อมูลชิ้นและมวลคอนกรีต',22);
 const notes=[`สูงใช้งานที่มุมใน ${m.clearHeightAtWallRoofJunctionMm.toFixed(1)} ก่อนตกแต่ง`,
  m.opening?`เนื้อเหนือช่องถึงมุมใน (ดิ่ง) ${m.opening.verticalHeadToInnerJunctionMm.toFixed(1)}`:'ซีกทึบ: ไม่หักช่องเปิด',
  m.family==='D'?`หนาแนวราบ ${m.wallHorizontalThicknessMm.toFixed(3)} / ตั้งฉาก150`:'ผนังตรง150 / หลังคาหนา150ตั้งฉากผิว',
  m.opening?`หักช่อง ${m.mass.voidVolumeM3.toFixed(6)} m³`:'ปริมาตรตามหน้าตัด × ความยาว1485',
  `คอนกรีตสุทธิ ${m.mass.netVolumeM3.toFixed(4)} m³`,
  `ประมาณ ${Math.round(m.mass.concreteMassKg).toLocaleString('en-US')} kg / ชิ้น`];
 notes.forEach((n,i)=>s+=text(730,914+i*35,n,i===5?24:19));
 s+=text(730,1150,'ฐาน2400kg/m³ ไม่รวมเหล็ก อุปกรณ์ฝัง และผิวตกแต่ง',18);
 s+=text(730,1190,'หูยก: ศึกษาเนื้อทึบฝั่งผนัง/หลังคาคร่อมCG',18,'#96551b')+text(730,1223,'ไม่ใช้มุมช่องหรือแถบแคบเป็นจุดยกโดยอัตโนมัติ',18,'#96551b')+text(730,1256,'DEM/ROT/ERECT แยกตรวจ; ไม่มีพิกัดยกที่อนุมัติ',18,'#96551b');
 s+='<rect x="40" y="1370" width="1520" height="85" fill="#fff0d8"/>'+text(60,1404,'มิติรายละเอียดที่ยังค้าง: pocket / joint / bearing / tolerance / กรอบหน้าต่าง / ระบายน้ำ',20,'#96551b')+text(60,1434,'ตรวจเรขาคณิตเท่านั้น ไม่รับรองเหล็ก ความหนา ความสูงตามกฎหมาย หรือความปลอดภัยการยก',19,'#96551b');
 return s+'</g></svg>';
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/abd-typicals-p08');fs.mkdirSync(out,{recursive:true});const records=catalogue();
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 for(const m of records){const svg=board(m);fs.writeFileSync(path.join(out,m.id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,m.id+'.png'));}
 const convergenceKg=Math.abs(typical('B','LH','S00',8192).mass.concreteMassKg-typical('B','LH','S00').mass.concreteMassKg);
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify({revision:'P08',records,curvedMassRefinementDifferenceKg:convergenceKg,visibility:'INTERNAL_TEAM',engineeringApproved:false,productionReleased:false},null,2));
 const md=['# Typical A/B/D — P08','', 'ข้อเสนอ A/Bชายคาสูง2700 และ Dผนังเอียง; ไม่อนุมัติผลิตหรือยก','', '| Typical / ภาพ | คอนกรีตสุทธิ m³ | มวล kg |','|---|---:|---:|',...records.map(m=>`| [${m.id}](${m.id}.png) | ${m.mass.netVolumeM3.toFixed(6)} | ${m.mass.concreteMassKg.toFixed(1)} |`),'', 'ทุกภาพมีSVGชื่อเดียวกัน ข้อมูลพิกัดอยู่ register.json','', 'ความหนาแน่นทดลอง2400kg/m³ ไม่รวมเหล็ก/อุปกรณ์/ตกแต่ง ไม่ใช่น้ำหนักเลือกเครน','', 'A/BปรับจากP07; Dหน้าต่างสูงดิ่ง1200 แต่สูงตามผิวเอียงประมาณ1203mm กรอบหน้าต่างและกันน้ำยังไม่ออกแบบ','', 'ช่องเปิดและรูปทรงเป็นข้อเสนอ Bยังมีมุมหักตรงผนัง ไม่ใช่เส้นโค้งสัมผัสเรียบ',''];fs.writeFileSync(path.join(out,'README.md'),md.join('\n'));
 // Small contact sheet for visual audit, not a substitute for the full-resolution drawings.
 const thumbs=await Promise.all(records.map(m=>sharp(path.join(out,m.id+'.png')).resize(400,375).toBuffer()));
 await sharp({create:{width:1600,height:1125,channels:3,background:'#fff'}}).composite(thumbs.map((input,i)=>({input,left:i%4*400,top:Math.floor(i/4)*375}))).png().toFile(path.join(out,'CONTACT-P08.png'));
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');const prefix='output/abd-typicals-p08/';
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({visibility:'INTERNAL_TEAM',dependencies:['tools/modular-program/abd-typicals-p08.mjs','tools/modular-program/abd-master-p07.mjs','knowledge/modular-program-r02/decisions.json'].map(p=>({path:p,sha256:hash(p)})),files:['register.json','README.md','CONTACT-P08.png',...records.flatMap(m=>[m.id+'.svg',m.id+'.png'])].map(f=>({file:f,sha256:hash(prefix+f)}))},null,2));
 console.log(JSON.stringify(records.filter(m=>m.side==='LH').map(m=>({id:m.id,mass:m.mass.concreteMassKg,clear:m.clearHeightAtWallRoofJunctionMm,head:m.opening?.verticalHeadToInnerJunctionMm})),null,2));
}
