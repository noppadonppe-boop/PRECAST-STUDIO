import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {root} from './build-r02.mjs';
export function piece(kind){
 if(!['NF01','NF02'].includes(kind))throw Error('Unknown type');
 const w=2797.5,l=kind==='NF01'?1485:1297.5,t=175,v=w*l*t/1e9;
 return {id:`TS-N90-${kind}-P12`,kind,dimensionsMm:[w,l,t],geometryStatus:'RECTANGULAR_FLOOR_PROPOSAL_NOT_FROZEN',mass:{netVolumeM3:v,densityKgM3:2400,concreteMassKg:v*2400,liftingDesignMassKg:null,excluded:['STEEL','INSERTS','POCKETS_NOT_DEFINED','FINISHES','SUPPORTS']},concreteOnlyCentroidMm:[w/2,l/2,t/2],liftingPlan:{status:'STUDY_TOP_FACE_AROUND_CG_NO_ANCHOR_LAYOUT',stages:['DEM','ROT','ERECT'],anchorCoordinatesMm:null,quantity:null,releasedForLifting:false},bearingLengthMm:null,supportGeometry:null,engineeringApproved:false,productionReleased:false};
}
export function model(){const records=['NF01','NF02'].map(piece);return {revision:'P12',visibility:'INTERNAL_TEAM',records,
 assumptions:{closedWallThicknessMm:175,wallFloorGapMm:20,openEdgeInsetMm:7.5,betweenFloorGapMm:15,datumZ:[0,175],basis:'COORDINATION_PROPOSAL_NOT_NEW_USER_APPROVAL'},
 placements:[{nodeId:'L-N01',originMm:[0,3000],openFace:'E'},{nodeId:'U-N01',originMm:[0,3000],openFace:'E'},{nodeId:'U-N02',originMm:[6000,3000],openFace:'W'}].map(n=>({...n,pieces:records.map((r,i)=>({typicalId:r.id,localMinMm:[n.openFace==='E'?195:7.5,i===0?7.5:1507.5,0],dimensionsMm:r.dimensionsMm}))})),
 interface:{previousCrossGapMm:177.5,proposedCrossGapMm:3007.5-2992.5,southGapMm:7.5+7.5,remainingEndOffsetMm:195-170,northEndOffsetMm:2830-2805,status:'MAIN_EDGE_GAP_REDUCED_CORNER_RETURNS_AND_SUPPORTS_UNRESOLVED'},
 alternatives:[{id:'ENLARGED_RECTANGULAR_PAIR',status:'DEVELOPED_GEOMETRY_CANDIDATE',risk:'NEW_WIDTH_AND_SHORT_NORTH_PANEL_SUPPORTS_PENDING'},{id:'KEEP_F15_WITH_SUPPORTED_INFILL',status:'NOT_DEVELOPED',risk:'MORE_PIECES_BEARINGS_AND_LIFTING_TO_DESIGN_NO_STEEL_PATCH_ASSUMED'}],
 nodeFloorConcreteSubtotalKg:records.reduce((s,r)=>s+r.mass.concreteMassKg,0),wholeNodeMassKg:null,fullBuildingMassKg:null,engineeringApproved:false,productionReleased:false};}
const txt=(x,y,s,n=19,c='#26465b')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const poly=(p,fill='#d4e5ed',stroke='#57778a')=>`<polygon points="${p.map(a=>a.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
const line=(a,b)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#57778a"/>`;
const dim=(x,y,w,s)=>line([x,y],[x+w,y])+line([x,y-6],[x,y+6])+line([x+w,y-6],[x+w,y+6])+txt(x+w/2-25,y-12,s,17);
const begin=title=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">${txt(50,60,title,30)}${txt(50,103,'P12 · หน่วย mm · ข้อเสนอขนาดเพื่อประสานงาน ไม่อนุมัติผลิตหรือยก',21)}`;
const end=()=>txt(55,1155,'ยังไม่คำนวณโครงสร้าง / ไม่มีระยะรองรับ เหล็กเสริม หรือหูยกที่อนุมัติ / ยังไม่เชื่อมเว็บ',20,'#a65f29')+'</g></svg>';
export function board(r){const [w,l,t]=r.dimensionsMm,k=.18;let s=begin(r.id);
 s+=txt(65,170,'01 / แปลนชิ้นงาน',23)+poly([[110,250],[110+w*k,250],[110+w*k,250+l*k],[110,250+l*k]])+dim(110,220,w*k,String(w));
 s+=line([650,250],[650,250+l*k])+txt(662,250+l*k/2,String(l),18)+txt(170,330,'แผ่นทึบ ไม่มีช่องเปิดหรือ pocket',20);
 s+=txt(65,615,'02 / รูปด้านยาว',23)+poly([[110,660],[110+w*k,660],[110+w*k,660+t*k],[110,660+t*k]])+dim(110,733,w*k,String(w))+txt(650,686,'175',18);
 s+=txt(65,800,'03 / รูปด้านสั้น',23)+poly([[110,845],[110+l*k,845],[110+l*k,845+t*k],[110,845+t*k]])+dim(110,915,l*k,String(l))+txt(130+l*k,868,'175',18);
 const p=([x,y,z])=>[835+x*.19+y*.09,500+x*.035-y*.12-z*.22],b=[[0,0,0],[w,0,0],[w,l,0],[0,l,0]],a=b.map(([x,y])=>[x,y,t]);
 s+=txt(820,170,'04 / 3D จากขนาดเดียวกับ 2D',23)+poly([b[0],b[1],a[1],a[0]].map(p),'#9bb9c7')+poly([b[1],b[2],a[2],a[1]].map(p),'#b7cdd7')+poly(a.map(p),'#d9e7ee');
 s+=txt(820,640,`${w} × ${l} × ${t} mm`,25)+txt(820,685,`${r.mass.netVolumeM3.toFixed(6)} m³ × 2400 kg/m³`,22)+txt(820,735,`≈ ${r.mass.concreteMassKg.toFixed(1)} kg / ชิ้น`,29);
 s+=txt(820,780,'มวลคอนกรีตเท่านั้น ไม่รวมเหล็ก/อุปกรณ์/ตกแต่ง',18)+txt(820,825,'CG คอนกรีตสม่ำเสมอ จากมุมชิ้น local:',18)+txt(820,858,r.concreteOnlyCentroidMm.join(', ')+' mm',20);
 s+=txt(820,909,'หูยก: ศึกษาบนผิวบน กระจายรอบ CG สองทิศ',18,'#a65f29')+txt(820,941,'ไม่ใช่พิกัดหูยก / ไม่กำหนดจำนวนหรือกำลัง',18,'#a65f29')+txt(820,973,'DEM / ROT / ERECT ต้องตรวจแยกกัน',18,'#a65f29');
 s+=txt(65,1040,'มิติรวมครบสำหรับแผ่นสี่เหลี่ยมเสนอ แต่รายละเอียดผลิตยังไม่ครบ: bearing / joint / tolerance / inserts',19);
 return s+end();}
export function assemblyBoard(m){let s=begin('N90 / NODE FLOOR PAIR · P12');const p=([x,y])=>[100+x*.17,750-y*.17];
 s+=txt(60,163,'01 / ตัวอย่างหน้าเปิด S/E — L-N01 และ U-N01',21);
 s+=poly([[0,0],[3000,0],[3000,3000],[0,3000]].map(p),'#f6e5c7');
 s+=poly([[0,0],[175,0],[175,2825],[3000,2825],[3000,3000],[0,3000]].map(p),'#9fb2ba');
 for(const [i,r] of m.records.entries()){const y=i===0?7.5:1507.5,[w,l]=r.dimensionsMm;s+=poly([[195,y],[195+w,y],[195+w,y+l],[195,y+l]].map(p));const q=p([950,y+l/2]);s+=txt(q[0],q[1],r.kind,23);}
 s+=poly([[3007.5,170],[4492.5,170],[4492.5,2830],[3007.5,2830]].map(p),'#dcebdc');
 s+=dim(100,805,510,'กริด 3000')+txt(85,215,'N: ผนัง175 + ช่อง20 =195',18)+txt(80,845,'S: เปิดสู่ปีก / gap15 / ขอบด้านข้างต่าง25',18);
 s+=txt(635,780,'E: gap15',20,'#a65f29');
 const notes=['02 / ระยะประกอบที่ตรวจได้','X: 195 + 2797.5 + 7.5 = 3000','Y: 7.5 + 1485 + 15 + 1297.5 + 195 = 3000','Z: ใต้พื้น0 / ผิวบน175','ช่องขวาง: 3007.5 − 2992.5 = 15','ขอบปีกเดิม170 / ขอบพื้นมุม195 → ต่าง25','ปลายปีก2830 / พื้นมุม2805 → ต่าง25','25 mm เป็นรอยเว้าปลายช่อง ต้องพัฒนา TR','ยังไม่ใช่การปิดช่องเปิดทุกจุดสำเร็จ'];
 notes.forEach((v,i)=>s+=txt(920,180+i*51,v,i===0?23:18,i>=5?'#a65f29':'#26465b'));
 s+=txt(920,690,'U-N02 เปิด S/W: ใช้รูปแผ่นเดิม',21)+txt(920,728,'วาง X=7.5..2805 / ผนังตะวันออก175',18)+txt(920,767,'ไม่มีรูฝัง จึงยังไม่ยืนยันว่าแม่แบบใช้ร่วมได้',18);
 s+=txt(65,930,`พื้นมุม2แผ่นรวม ${m.nodeFloorConcreteSubtotalKg.toFixed(1)} kg — ไม่ใช่น้ำหนักโหนดหรืออาคารทั้งหลัง`,23);
 s+=txt(65,975,'ทางเลือกที่พัฒนา: ขยายแผ่นพื้นเฉพาะโหนด / ทางเลือกคงF15และเพิ่มชิ้นเติมยังไม่ออกแบบ',19);
 s+=txt(65,1017,'แนวรองรับใต้พื้นและกรอบช่องเปิดยังรอกำหนด ไม่สมมติว่าขอบที่ขยายเป็นส่วนยื่นรับแรงได้',19,'#a65f29');
 s+=txt(65,1060,'ความหนาผนังมุม175ทำให้ต้องปรับขอบพื้นจาก170เป็น195 — ไม่ใช้ช่อง20ของช่วงตรงแทนโดยตรง',19);
 return s+end();}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/node-floor-p12');fs.mkdirSync(out,{recursive:true});const m=model(),req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const names=[];for(const [id,svg] of [...m.records.map(r=>[r.id,board(r)]),['N90-FLOOR-ASSEMBLY-P12',assemblyBoard(m)]]){fs.writeFileSync(path.join(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,id+'.png'));names.push(id+'.png',id+'.svg');}
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(m,null,2));names.push('register.json');
 fs.writeFileSync(path.join(out,'README.md'),['# พื้นมุม P12 — ข้อเสนอเรขาคณิต','',...m.records.map(r=>`- [${r.id}](${r.id}.png): ${r.dimensionsMm.join(' × ')} mm; ${r.mass.concreteMassKg.toFixed(1)} kg`),'- [ผังประกอบ](N90-FLOOR-ASSEMBLY-P12.png)','','มี SVG และทะเบียน JSON; คอนกรีตทดลอง2400kg/m³ ไม่ใช่น้ำหนักยก','ช่องขวางลดเป็น15mm เฉพาะช่วงขอบที่ซ้อนกัน; ปลายช่องต่าง25mm ยังต้องประสานTR','ไม่อนุมัติผลิต/ยก ไม่รันโครงสร้าง ไม่ใช่โหนดครบชุด',''].join('\n'));names.push('README.md');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({dependencies:['tools/modular-program/node-floor-p12.mjs','output/lu-node-p11/register.json','knowledge/modular-program-r02/decisions.json'].map(p=>({path:p,sha256:hash(p)})),files:names.map(f=>({file:f,sha256:hash('output/node-floor-p12/'+f)}))},null,2));console.log(JSON.stringify(m.records,null,2));
}
