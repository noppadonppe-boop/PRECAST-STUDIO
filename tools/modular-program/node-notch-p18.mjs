import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';
import {piece as floor} from './node-floor-p12.mjs';
import {model as layout} from './portal-layout-p17.mjs';

export function polygonProperties(p){
 let twice=0,cx=0,cy=0;
 p.forEach(([x,y],i)=>{const [u,v]=p[(i+1)%p.length],q=x*v-u*y;twice+=q;cx+=(x+u)*q;cy+=(y+v)*q;});
 return {areaMm2:twice/2,centroidMm:[cx/(3*twice),cy/(3*twice)]};
}
export function model(){
 const original=floor('NF01'),[w,l,t]=original.dimensionsMm,clearance=20,n=212.5;
 const polygon=[[0,0],[w-n,0],[w-n,n],[w,n],[w,l],[0,l]],props=polygonProperties(polygon);
 const net=props.areaMm2*t/1e9,gross=w*l*t/1e9,choice=JSON.parse(fs.readFileSync(path.join(root,'knowledge/modular-program-r02/decision-p18.json')));
 const r={id:'TS-N90-NF01-N01-P18',supersedesForPilot:original.id,dimensionsMm:[w,l,t],polygonXYMm:polygon,localOriginInNodeMm:[195,7.5,0],notch:{corner:'SE',sizeMm:[n,n,t],innerCornerRadiusMm:null,status:'SQUARE_COORDINATION_ENVELOPE_NOT_FINAL_REENTRANT_CORNER_DETAIL'},
  geometryStatus:'NOTCHED_FLOOR_COORDINATION_PROPOSAL',mass:{grossVolumeM3:gross,voidVolumeM3:gross-net,netVolumeM3:net,densityKgM3:2400,densityStatus:'TRIAL_NOT_PRODUCTION_MATERIAL',concreteMassKg:net*2400,reductionFromP12Kg:(gross-net)*2400,liftingDesignMassKg:null,excluded:original.mass.excluded},
  concreteOnlyCentroidMm:[...props.centroidMm,t/2],liftingPlan:{status:'TOP_FACE_STUDY_ZONES_ONLY_AVOID_NOTCH_AND_REENTRANT_CORNER',stages:['DEM','ROT','ERECT'],cgMm:null,anchorCoordinatesMm:null,quantity:null,anchorSystem:null,ratedCapacity:null,releasedForLifting:false},
  dimensionReview:{overallAndNotch:'CHECKED_GEOMETRY_ONLY',pending:['CORNER_RADIUS','REBAR','BEARING','TOLERANCE','JOINT','INSERTS']},supportGeometry:null,bearingLengthMm:null,engineeringApproved:false,productionReleased:false};
 return {revision:'P18',visibility:'INTERNAL_TEAM',programmeStage:2,programmeStageTotal:8,decision:choice,records:[r],
  pilot:{nodes:['L-N01','U-N01'],openFaces:['S','E'],otherNode:'U-N02_MIRRORED_REVISION_PENDING',columnSpace:layout().options[0].additionalColumnSpaces[0],clearanceProposalMm:clearance,clearanceApproved:false,remainingSolidsInNodeMm:[{min:[195,7.5,0],size:[2585,1485,t]},{min:[2780,220,0],size:[n,1272.5,t]}],wallZones:layout().options[0].zones,wallGeometryChanged:false},
  floorPairConcreteMassKg:r.mass.concreteMassKg+floor('NF02').mass.concreteMassKg,wholeNodeMassKg:null,wholeBuildingMassKg:null,
  pending:['MIRRORED_NODE','WALL_EDGE_REINFORCEMENT_AND_BASE','HEAD_AND_NR_BEARING','NOTCH_CORNER_DETAIL','FLOOR_SUPPORT','WEATHER_JOINTS','LIFTING_DESIGN'],engineeringApproved:false,productionReleased:false};
}
const tx=(x,y,s,n=20,c='#25485c')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const poly=(p,c='#cbdfe7')=>`<polygon points="${p.map(a=>a.join(',')).join(' ')}" fill="${c}" stroke="#507487" stroke-width="1.5"/>`;
const line=(a,b,c='#507487')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="1.5"/>`;
const dh=(x,y,w,label)=>line([x,y],[x+w,y])+line([x,y-7],[x,y+7])+line([x+w,y-7],[x+w,y+7])+tx(x+w/2-30,y-12,label,18);
const dv=(x,y,h,label)=>line([x,y],[x,y+h])+line([x-7,y],[x+7,y])+line([x-7,y+h],[x+7,y+h])+tx(x+12,y+h/2+6,label,18);
const begin=title=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1250"><rect width="1600" height="1250" fill="#f5f8fa"/><g font-family="Tahoma,Arial,sans-serif">${tx(45,55,title,30)}${tx(45,98,'ขั้น 2/8 · P18 · หน่วย mm · ข้อเสนอประสานงาน ไม่อนุมัติผลิต บากหน้างาน หรือยก',21,'#a45e2e')}`;
const end=()=>tx(50,1208,'ยังไม่คำนวณโครงสร้าง / มวลคอนกรีตทดลอง ไม่ใช่น้ำหนักยก / รอยต่อและเหล็กยังไม่ออกแบบ',20,'#a45e2e')+'</g></svg>';
export function typicalBoard(m){const r=m.records[0],[w,l,t]=r.dimensionsMm;let s=begin(r.id);
 const p=([x,y])=>[90+x*.18,515-y*.18];
 s+=tx(65,155,'01 / แปลน — มุมเว้า SE',24)+poly(r.polygonXYMm.map(p))+dh(90,208,w*.18,'2797.5')+dv(620,515-l*.18,l*.18,'1485');
 s+=tx(125,365,'ผิวบน Z=175 / ใต้พื้น Z=0',20)+dh(90,570,2585*.18,'2585')+tx(65,625,'โซ่ X: 2585 + 212.5 = 2797.5',20)+tx(65,658,'โซ่ Y: 212.5 + 1272.5 = 1485',20);
 s+=line(p([2585,212.5]),[720,530])+tx(570,555,'มุมเว้า ดูรูปขยาย',18);
 s+=tx(65,724,'02 / หน้าตัดตามแนวขอบใต้ + ตะวันออก',22);
 s+=poly([[90,770],[90+2585*.18,770],[90+2585*.18,801.5],[90,801.5]])+dh(90,846,2585*.18,'2585')+dv(580,770,31.5,'175');
 s+=poly([[90,910],[90+1272.5*.18,910],[90+1272.5*.18,941.5],[90,941.5]])+dh(90,990,1272.5*.18,'1272.5')+dv(350,910,31.5,'175');
 s+=tx(65,1045,'ขอบตรงตรงข้ามยาวเต็ม 2797.5 / 1485',19)+tx(65,1080,'หน้าตัดเนื้อแผ่นหนาสม่ำเสมอ 175',19)+tx(65,1120,'รัศมีมุมเว้า / bearing / pocket: รอออกแบบ',19,'#a45e2e');
 const iso=([x,y,z])=>[830+x*.19+y*.07,445+x*.04-y*.13-z*.22];
 s+=tx(810,155,'03 / 3D wireframe — geometry เดียวกัน',23);
 for(const z of [0,t]){const pts=r.polygonXYMm.map(([x,y])=>iso([x,y,z]));s+=poly(pts,z?'#d8e8ef':'none');}
 for(const [x,y] of r.polygonXYMm)s+=line(iso([x,y,0]),iso([x,y,t]));
 s+=tx(810,550,'04 / ขยายมุมเว้า — เจตนาให้หล่อเป็นรูปนี้',22);
 const d=([x,y])=>[865+(x-2520)*.65,805-y*.65];
 s+=poly([[2520,0],[2585,0],[2585,212.5],[2797.5,212.5],[2797.5,300],[2520,300]].map(d));
 s+=dh(d([2585,0])[0],855,212.5*.65,'212.5')+dv(1100,805-212.5*.65,212.5*.65,'212.5');
 s+=tx(1180,655,'เว้าทะลุ175',20)+tx(1180,690,'รัศมียังไม่เลือก',19)+tx(1180,727,'ไม่ใช่แบบตัดแผ่นเดิม',18,'#a45e2e');
 s+=tx(810,915,`${r.mass.netVolumeM3.toFixed(6)} m³ × 2400 = ${r.mass.concreteMassKg.toFixed(1)} kg`,23);
 s+=tx(810,952,`ลดจาก P12 ${r.mass.reductionFromP12Kg.toFixed(1)} kg / ไม่รวมเหล็กและอุปกรณ์`,19);
 s+=tx(810,990,`CG local คอนกรีต: ${r.concreteOnlyCentroidMm.map(v=>v.toFixed(2)).join(', ')}`,19);
 s+=tx(810,1035,'หูยก: ศึกษาผิวบนรอบ CG หลบมุมเว้า',20,'#a45e2e')+tx(810,1070,'ไม่มีพิกัด/จำนวนที่อนุมัติ; DEM / ROT / ERECT ตรวจแยก',18)+tx(810,1105,'CG นี้ไม่รวมเหล็ก/อุปกรณ์ ไม่ใช่ CG อนุมัติยก',18);
 return s+end();
}
export function assemblyBoard(m){let s=begin('N90 / WALL-SHARED · NF01 NOTCH COORDINATION');const r=m.records[0],p=([x,y])=>[95+x*.18,780-y*.18];
 s+=tx(65,165,'01 / โหนดเปิด S/E — L-N01 และ U-N01',23);
 s+=poly([[0,0],[3000,0],[3000,3000],[0,3000]].map(p),'#f6ecd9');
 for(const [x,y,w,l] of [[0,7.5,175,1485],[0,1507.5,175,1302.5],[7.5,2825,1485,175],[1507.5,2825,1485,175]])s+=poly([[x,y],[x+w,y],[x+w,y+l],[x,y+l]].map(p),'#aabfcb');
 s+=poly(r.polygonXYMm.map(([x,y])=>p([x+195,y+7.5])));
 s+=poly([[195,1507.5],[2992.5,1507.5],[2992.5,2805],[195,2805]].map(p));
 for(const b of m.pilot.wallZones){const [x,y]=b.min,[w,l]=b.size;s+=poly([[x,y],[x+w,y],[x+w,y+l],[x,y+l]].map(p),'#72b2a3');}
 s+=poly([[2800,0],[3000,0],[3000,200],[2800,200]].map(p),'#efa98b');
 s+=tx(250,390,'NF02 / P12 คงรูปเดิม',20)+tx(250,660,'NF01 / N01-P18',21)+dh(95,830,540,'กริด3000');
 s+=tx(65,900,'เขียวเข้ม: ขอบผนังร่วมในผนังเดิม ไม่บวกมวลซ้ำ',20)+tx(65,938,'ส้ม: พื้นที่ P2 สมมติ200×200 ไม่ใช่ขนาดเสาที่ออกแบบ',20);
 const notes=['02 / ระยะหลบพื้นที่มุม P2','พื้นที่ P2: X2800..3000 / Y0..200','ขอบพื้นเว้า: X2780 / Y220','ช่องว่างเสนอ: 2800−2780 = 20','ช่องว่างเสนอ: 220−200 = 20','มุมชิ้นเดิม: X2992.5 / Y7.5','ขนาดเว้า: 2992.5−2780 = 212.5','ขนาดเว้า: 220−7.5 = 212.5','เป็น clearance เสนอ ไม่ใช่ tolerance ที่อนุมัติ','NF01 + NF02 = '+m.floorPairConcreteMassKg.toFixed(1)+' kg','เฉพาะพื้นสองแผ่น ไม่ใช่โหนดครบชุด'];
 notes.forEach((v,i)=>s+=tx(810,170+i*49,v,i===0?24:20));
 s+=tx(810,758,'03 / งานต่อเนื่องที่ยังคงค้าง',24);
 ['U-N02 ต้องทำฉบับสะท้อนและตรวจตำแหน่งใหม่','ขอบผนังร่วมต้องออกแบบเหล็ก/ฐาน/จุดต่อ','หัวกรอบ–หลังคาและช่องใช้สอยยังไม่สรุป','การรองรับพื้น มุมเว้า รอยต่อกันน้ำ และแผนยก','พื้นที่เสาจริงเปลี่ยน → ต้องปรับรูปเว้าใหม่'].forEach((v,i)=>s+=tx(810,807+i*43,v,20));
 s+=tx(65,1070,'เลือกแล้ว: WALL_SHARED เฉพาะแนวทางพัฒนา — ไม่ได้ยืนยันว่าผนัง175รับแรงกรอบได้',22,'#a45e2e');
 s+=tx(65,1120,'คง P12–P17 เป็นประวัติ / ฉบับนี้ยังไม่แทนแบบประกอบทุกโหนดหรือทั้ง48สินค้า',21);
 return s+end();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/node-notch-p18');fs.mkdirSync(out,{recursive:true});const m=model(),req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const files=[];for(const [id,svg] of [[m.records[0].id,typicalBoard(m)],['N90-WALL-SHARED-P18',assemblyBoard(m)]]){fs.writeFileSync(path.join(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,id+'.png'));files.push(id+'.svg',id+'.png');}
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(m,null,2));files.push('register.json');
 fs.writeFileSync(path.join(out,'README.md'),['# P18 — ขั้น2/8 ขอบผนังร่วมและพื้นเว้ามุม','','- [Typical 3D/2D](TS-N90-NF01-N01-P18.png)','- [ผังประสาน](N90-WALL-SHARED-P18.png)','','ผู้ใช้เลือก WALL_SHARED เฉพาะแนวทางพัฒนา; พื้นเว้า212.5×212.5×175และclearance20เป็นข้อเสนอ','คอนกรีตทดลอง2400kg/m³ มวลNF01 '+m.records[0].mass.concreteMassKg.toFixed(3)+'kg ไม่ใช่มวลยก','ทดแทนNF01เฉพาะการศึกษาL-N01/U-N01; U-N02สะท้อนยังรอตรวจ','เก็บP12เดิม ไม่อนุมัติบากชิ้นเดิมหรือผลิต ไม่มีโครงสร้าง/หูยกผ่านตรวจ',''].join('\n'));files.push('README.md');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({dependencies:['tools/modular-program/node-notch-p18.mjs','tools/modular-program/node-floor-p12.mjs','tools/modular-program/portal-layout-p17.mjs','knowledge/modular-program-r02/decision-p18.json','output/portal-layout-p17/register.json'].map(p=>({path:p,sha256:hash(p)})),files:files.map(f=>({file:f,sha256:hash('output/node-notch-p18/'+f)}))},null,2));console.log(JSON.stringify(m.records[0],null,2));
}
