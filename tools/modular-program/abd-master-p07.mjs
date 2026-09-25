import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {root} from './build-r02.mjs';
export const area=p=>Math.abs(p.reduce((s,[x,z],i)=>{const b=p[(i+1)%p.length];return s+x*b[1]-b[0]*z;},0))/2;
export function family(code,steps=4096){
 const t=150,f=175,end=1490,L=1485;let p,notes,params,clearAtEdge,innerFoot=150;
 if(code==='A'){
  const slope=.3,drop=t*Math.sqrt(1+slope*slope),innerZ=x=>2550+slope*x-drop;
  p=[[0,f],[0,2550],[end,2550+slope*end],[end,innerZ(end)],[150,innerZ(150)],[150,f]];
  clearAtEdge=innerZ(150)-f;params={eaveZ:2550,nominalRidgeZ:3000,rise:450,slope,angleDeg:Math.atan(slope)*180/Math.PI,innerVerticalDrop:drop};
  notes=['ชายคานอก Z2550 / สันอ้างอิง Z3000','ยกจั่ว450 / วิ่งแนวราบ1500 / slope30%','ความชัน16.70° / t150ตั้งฉากหลังคา','ใต้หลังคา: Z = 2550 + 0.3X − 156.605','มุมผนัง–หลังคาหักมุม ยังไม่ออกแบบจุดต่อ'];
 }else if(code==='B'){
  const R=2725,ri=2575,zc=275;const z=(x,r)=>zc+Math.sqrt(r*r-(x-1500)**2);
  const arc=(x0,x1,r)=>Array.from({length:steps+1},(_,i)=>{const x=x0+(x1-x0)*i/steps;return[x,z(x,r)];});
  p=[[0,f],...arc(0,end,R),...arc(end,150,ri),[150,f]];
  clearAtEdge=z(150,ri)-f;params={springZ:2550,nominalCrownZ:3000,rise:450,outerRadius:R,innerRadius:ri,center:[1500,zc],innerWallJunctionZ:z(150,ri)};
  notes=['จุดเริ่มโค้งนอก Z2550 / ยอดอ้างอิง3000','โค้งวงกลมยก450 / Ro2725 / Ri2575','ศูนย์โค้ง X1500,Z275 / t150แนวรัศมี','วงกลมต่อผนังเป็นมุม ไม่ใช่สัมผัสเรียบ','ต้องทบทวนไหล่โค้ง/รูปลักษณ์ก่อนล็อกแบบ'];
 }else if(code==='D'){
  const k=200/(3000-f),dx=t*Math.sqrt(1+k*k);innerFoot=dx;
  const innerX=z=>k*(z-f)+dx;
  p=[[0,f],[200,3000],[end,3000],[end,2850],[innerX(2850),2850],[innerX(f),f]];
  clearAtEdge=2675;params={topOuterWidth:2600,sideInset:200,wallSlopeDxDz:k,wallTiltDeg:Math.atan(k)*180/Math.PI,horizontalWallThickness:dx,innerRoofJunctionX:innerX(2850),clearWidthAtRoof:3000-2*innerX(2850)};
  notes=['ฐานนอก3000 / ด้านบนนอก2600','ผนังหุบข้างละ200 ในความสูง2825','ผนังเอียง4.05°จากดิ่ง / t150ตั้งฉากผนัง',`หนาแนวราบ${dx.toFixed(3)} ไม่ใช่150`,`ช่องกว้างใต้หลังคา${params.clearWidthAtRoof.toFixed(1)}`];
 }else throw Error('Unsupported family');
 const sectionAreaMm2=area(p),volume=sectionAreaMm2*L/1e9;
 return {id:`TS-${code}-MASTER-P07`,family:code,status:'ASSISTANT_GEOMETRY_PROPOSAL_NOT_USER_APPROVED',visibility:'INTERNAL_TEAM',units:'mm',externalWidth:3000,nominalExternalHeight:3000,floorTopZ:f,thicknessNormalMm:t,castLengthMm:L,bayGridMm:1500,crownGapMm:20,bayGapMm:15,endAllowanceMm:7.5,params,notes,clearHeightAtWallRoofJunctionMm:clearAtEdge,clearWidthAtFloorTopMm:3000-2*innerFoot,floorWidthWith20mmSideClearance:3000-2*innerFoot-40,lh:p,rh:p.map(([x,z])=>[3000-x,z]),mass:{sectionAreaMm2,netVolumeM3:volume,densityKgM3:2400,concreteMassKg:volume*2400,method:code==='B'?'SAMPLED_CIRCULAR_BOUNDARIES_SHOELACE':'EXACT_POLYGON_SHOELACE',arcSteps:code==='B'?steps:null,liftingDesignMassKg:null,excluded:['REBAR','INSERTS','JOINTS','FINISHES'],status:'SOLID_HALF_ONLY_ESTIMATE_NOT_FOR_LIFTING'},opening:null,openingStatus:'NOT_DESIGNED',liftingPlan:{status:'STUDY_REQUIRED_NOT_TRANSFERRED_FROM_C',anchorCoordinatesMm:null,quantity:null,releasedForLifting:false},engineeringApproved:false,productionReleased:false};
}
const tx=(x,y,s,n=19,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const line=(a,b,c='#71889a')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}"/>`;
const poly=(p,c='none')=>`<polygon points="${p.map(v=>v.join(',')).join(' ')}" fill="${c}" stroke="#57758b" stroke-width="1.2"/>`;
const dim=(x,y,w,s)=>line([x,y],[x+w,y])+line([x,y-6],[x,y+6])+line([x+w,y-6],[x+w,y+6])+tx(x+w/2-30,y-10,s,17);
export function board(m){
 const display=family(m.family,64);let s='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1400"><rect width="1600" height="1400" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">';
 s+=tx(45,55,`${m.id} / SOLID HALF PAIR`,30)+tx(45,94,'P07 · ข้อเสนอรูปทรงใหม่ · หน่วย mm · ไม่ใช่ขั้นวิเคราะห์โครงสร้าง P7',20);
 s+='<rect x="40" y="116" width="1520" height="55" fill="#fff0d8"/>'+tx(60,151,'เพื่อทบทวนเท่านั้น — ไม่อนุมัติผลิต — ช่องเปิด/จุดต่อ/หูยกยังไม่ออกแบบ',23,'#96551b');
 s+=tx(60,215,'01 / หน้าตัดประกอบ + มิติหลัก',22)+tx(810,215,'02 / 3D ซีกซ้าย–ขวา / wireframe',22);
 const p=([x,z])=>[135+x*.16,750-z*.16];s+=poly(display.lh.map(p),'#a3cadc')+poly(display.rh.map(p),'#b3d5c8');
 const floorStart=(3000-m.floorWidthWith20mmSideClearance)/2;
 s+=poly([[floorStart,0],[3000-floorStart,0],[3000-floorStart,175],[floorStart,175]].map(p),'#e1e7ed');
 s+=dim(135,798,480,'3000')+line([95,270],[95,750])+tx(40,510,'3000*',17)+tx(160,842,'พื้นt175แสดงขอบเขตเสนอ ไม่ใช่รายละเอียดรองรับ',17)+tx(100,873,'* ระดับยอดอ้างอิงก่อนตัดเว้นรอยต่อกลาง20',16);
 s+=line(p([1500,0]),p([1500,3070]),'#b68569')+tx(290,253,'กลางหลังคาเว้น20',17);
 const iso=(x,y,z)=>[925+x*.125+y*.09,748+x*.021-y*.06-z*.125];
 for(const [pts,off] of [[display.rh,190],[display.lh,-190]]){
  const a=pts.map(([x,z])=>iso(x+off,0,z)),b=pts.map(([x,z])=>iso(x+off,1485,z));s+=poly(a)+poly(b);
  for(const i of [0,1,Math.floor(pts.length/2),pts.length-1])s+=line(a[i],b[i]);
 }
 s+=tx(845,815,'เลื่อนซีกเพื่ออ่านภาพ ไม่ใช่ระยะติดตั้ง',18)+tx(845,849,'ซีก LH / RH ทึบ — ยังไม่มีช่องหน้าต่าง',18);
 s+=tx(60,909,'03 / แปลนหนึ่งช่วง',22);
 s+=poly([[100,985],[520,985],[520,1193],[100,1193]],'#e7edf3')+line([310,985],[310,1193]);
 s+=dim(100,958,420,'3000')+tx(535,1090,'1485',18)+tx(190,1075,'LH',21)+tx(393,1075,'RH',21)+tx(90,1230,'กริด1500 / ชิ้น1485 / gapระหว่างช่วง15',17);
 s+=tx(710,909,'04 / ฐานรูปทรงและน้ำหนักต่อซีก',22);
 m.notes.forEach((v,i)=>s+=tx(710,947+i*30,v,18));
 s+=tx(90,1262,`สูงภายในที่จุดต่อผนัง–หลังคา ${m.clearHeightAtWallRoofJunctionMm.toFixed(1)}`,16);
 s+=tx(710,1114,`${m.mass.netVolumeM3.toFixed(4)} m³ ≈ ${Math.round(m.mass.concreteMassKg).toLocaleString('en-US')} kg / ซีกทึบ`,24);
 s+=tx(710,1150,'ใช้2400kg/m³ ไม่รวมเหล็ก/อุปกรณ์/ผิวตกแต่ง',18)+tx(710,1184,'หูยก: ศึกษาบริเวณทึบฝั่งผนังและหลังคาคร่อมCG',17)+tx(710,1215,'DEM/ROT/ERECT แยกตรวจ ไม่มีพิกัด/จำนวนที่อนุมัติ',17)+tx(710,1246,'มุมต่อ ความคลาดเคลื่อน ฐาน และระบายน้ำยังค้าง',17);
 s+='<rect x="40" y="1300" width="1520" height="60" fill="#fff0d8"/>'+tx(60,1337,'น้ำหนักเป็นคอนกรีตซีกทึบเท่านั้น ไม่รับรองความหนาหรือความสามารถยก/รับแรงของชิ้น',21,'#96551b');
 return s+'</g></svg>';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/abd-master-p07');fs.mkdirSync(out,{recursive:true});const records=['A','B','D'].map(c=>family(c));
 const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 for(const m of records){const svg=board(m);fs.writeFileSync(path.join(out,m.id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,m.id+'.png'));}
 const bFine=family('B',8192);const convergenceKg=Math.abs(bFine.mass.concreteMassKg-records[1].mass.concreteMassKg);
 const reg={records,curvedMassRefinementDifferenceKg:convergenceKg,comparisonC:{source:'output/typical-review-p05/register.json',solidHalfMassKg:2152.037007798979},engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(reg,null,2));
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({visibility:'INTERNAL_TEAM',dependencies:['tools/modular-program/abd-master-p07.mjs','knowledge/modular-program-r02/decisions.json','output/typical-review-p05/register.json'].map(p=>({path:p,sha256:hash(p)})),files:['register.json',...records.flatMap(m=>[m.id+'.svg',m.id+'.png'])].map(f=>({file:f,sha256:hash('output/abd-master-p07/'+f)}))},null,2));
 console.log(JSON.stringify(records.map(m=>({family:m.family,massKg:m.mass.concreteMassKg,clearHeight:m.clearHeightAtWallRoofJunctionMm,floorWidth:m.floorWidthWith20mmSideClearance})),null,2));console.log('B mass refinement delta kg:',convergenceKg);
}
