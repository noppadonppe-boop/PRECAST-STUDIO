import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';
import {model as prior,polygonProperties} from './node-notch-p18.mjs';
export const mirrorBox=b=>({...b,min:[3000-b.min[0]-b.size[0],b.min[1],b.min[2]],size:[...b.size]});
export function model(){
 const p=prior(),a=p.records[0],r=structuredClone(a),w=a.dimensionsMm[0];
 r.id='TS-N90-NF01-N02-P19';r.mirrorOf=a.id;r.notch.corner='SW';r.localOriginInNodeMm=[7.5,7.5,0];
 r.polygonXYMm=a.polygonXYMm.map(([x,y])=>[w-x,y]).reverse();
 const g=polygonProperties(r.polygonXYMm);r.concreteOnlyCentroidMm=[...g.centroidMm,87.5];r.mass.netVolumeM3=g.areaMm2*175/1e9;r.mass.concreteMassKg=r.mass.netVolumeM3*2400;
 const walls=[{id:'SIDE1',min:[0,7.5,175],size:[175,1485,2480]},{id:'SIDE2',min:[0,1507.5,175],size:[175,1302.5,2480]},{id:'N1',min:[7.5,2825,175],size:[1485,175,2480]},{id:'N2',min:[1507.5,2825,175],size:[1485,175,2480]}].map(mirrorBox);
 return {revision:'P19',visibility:'INTERNAL_TEAM',programmeStage:2,programmeStageTotal:8,records:[r],
  node:{id:'U-N02',globalOriginMm:[6000,3000,0],openFaces:['S','W'],reflection:'NODE_X_NEW=3000-NODE_X_OLD; PIECE_X_NEW=2797.5-PIECE_X_OLD; REVERSE_POLYGON_WINDING',reflectionIsRigidPlacement:false,insertOrRebarTransform:null,
   columnSpace:mirrorBox(p.pilot.columnSpace),wallZones:p.pilot.wallZones.map(mirrorBox),walls,remainingSolidsInNodeMm:p.pilot.remainingSolidsInNodeMm.map(mirrorBox),nf02:{typicalId:'TS-N90-NF02-P12',min:[7.5,1507.5,0],size:[2797.5,1297.5,175]},clearanceProposalMm:20,clearanceApproved:false},
  floorPairConcreteMassKg:p.floorPairConcreteMassKg,wholeNodeMassKg:null,wholeBuildingMassKg:null,sharedMouldApproved:false,geometryCheckScope:'FLOOR_POLYGON_AND_REFLECTED_WALL_COLUMN_SPACES_ONLY_NOT_WHOLE_ASSEMBLY',engineeringApproved:false,productionReleased:false};
}
const sources=['typical-review-p05','abd-typicals-p08','abd-floor-ends-p09','node-floor-p12','node-wall-p13','node-roof-p14','node-notch-p18'];
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
export function inventory(m=model()){
 const entries=[];
 for(const dir of [...sources,'node-mirror-p19']){const src=`output/${dir}/register.json`,data=dir==='node-mirror-p19'?m:read(src);for(const item of data.records){const g=item.geometry??item,id=item.id;entries.push({id,source:src,sourceRecordId:id,preview:`output/${dir}/${item.file??id+'.png'}`,concreteMassKg:g.mass.concreteMassKg,densityKgM3:g.mass.densityKgM3,
  scope:id==='TS-N90-NF01-P12'?'HISTORICAL_UNNOTCHED_NOT_FOR_WALL_SHARED_PILOT':id==='TS-N90-NF01-N01-P18'?'L_N01_U_N01_COORDINATION':id==='TS-N90-NF01-N02-P19'?'U_N02_COORDINATION':'DEVELOPMENT_CANDIDATE',engineeringApproved:false,productionReleased:false});}}
 return {revision:'P19',visibility:'INTERNAL_TEAM',entries,counts:{documentedTypicalRevisionSheets:entries.length,historicalUnnotchedFloor:1,otherCandidateRevisionSheets:entries.length-1,approvedMoulds:0},countBasis:'TAGS_AND_REVISIONS_NOT_UNIQUE_GEOMETRIES_OR_PHYSICAL_PIECES',
  pending:[{id:'NODE_HEAD_ROOF',next:'DIMENSIONAL_ENVELOPE_HEADROOM_AND_DRAINAGE_COORDINATION',stage:2},{id:'END_UPPER_INFILL',next:'DEFINE_PROFILE_SPECIFIC_CLOSURES_ABOVE_END_PANELS',stage:2},{id:'OPENING_USE_MATRIX',next:'MAP_OFFICE_HOME_CAFE_RESORT_TO_EXISTING_AND_NEW_OPENING_VARIANTS',stage:2},{id:'48_PLACEMENTS',next:'PRODUCT_SPECIFIC_DIMENSIONED_ASSEMBLY_AND_PIECE_REFERENCES',stage:3},{id:'BEARINGS_JOINTS_LIFTING',next:'RESERVE_INTERFACES_NOW_VERIFY_STRUCTURAL_DETAILS_IN_P7_BEFORE_P8_RELEASE',stage:7}],
  wholeProgrammeComplete:false,engineeringApproved:false,productionReleased:false};
}
const tx=(x,y,s,n=20,c='#25485c')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const poly=(p,c='#cbdfe7')=>`<polygon points="${p.map(a=>a.join(',')).join(' ')}" fill="${c}" stroke="#507487" stroke-width="1.5"/>`;
const line=(a,b)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#507487"/>`;
const dh=(x,y,w,label)=>line([x,y],[x+w,y])+line([x,y-6],[x,y+6])+line([x+w,y-6],[x+w,y+6])+tx(x+w/2-28,y-12,label,18);
const begin=t=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="#f5f8fa"/><g font-family="Tahoma,Arial,sans-serif">${tx(45,55,t,30)}${tx(45,99,'ขั้น 2/8 · P19 · หน่วย mm · เพื่อพัฒนา ไม่อนุมัติผลิต บากชิ้นงาน หรือยก',21,'#a45e2e')}`;
const end=()=>tx(50,1160,'รูปทรงสะท้อนไม่ใช่การอนุมัติใช้แม่แบบ/เหล็ก/หูยกร่วมกัน — ยังไม่ผ่านการคำนวณโครงสร้าง',20,'#a45e2e')+'</g></svg>';
export function typicalBoard(m){const r=m.records[0],p=([x,y])=>[100+x*.18,500-y*.18];let s=begin(r.id);
 s+=tx(65,158,'01 / แปลน — เว้ามุม SW',23)+poly(r.polygonXYMm.map(p))+dh(100,200,2797.5*.18,'2797.5');
 s+=line([635,500],[635,232.7])+tx(647,365,'1485',18)+dh(100+212.5*.18,553,2585*.18,'2585');
 s+=tx(100,340,'ผิวบน175 / ใต้พื้น0',20)+tx(65,605,'X: 212.5 + 2585 = 2797.5',20)+tx(65,643,'Y: 212.5 + 1272.5 = 1485',20);
 const iso=([x,y,z])=>[830+x*.19+y*.07,440+x*.04-y*.13-z*.22];s+=tx(810,158,'02 / 3D wireframe จากรูปทรงเดียวกัน',23);
 for(const z of [0,175])s+=poly(r.polygonXYMm.map(([x,y])=>iso([x,y,z])),z?'#d8e8ef':'none');
 for(const [x,y] of r.polygonXYMm)s+=line(iso([x,y,0]),iso([x,y,175]));
 s+=tx(810,605,'03 / มุมเว้า212.5 × 212.5 ทะลุ175',22);
 const d=([x,y])=>[840+x*.6,850-y*.6];s+=poly([[0,212.5],[212.5,212.5],[212.5,0],[300,0],[300,300],[0,300]].map(d));
 s+=dh(840,895,212.5*.6,'212.5')+line([1055,850],[1055,722.5])+tx(1068,790,'212.5',18)+tx(1170,718,'รัศมีมุมเว้า: รอกำหนด',19)+tx(1170,756,'ไม่อนุมัติบากแผ่นเดิม',19,'#a45e2e');
 s+=tx(65,714,'04 / หน้าตัดขอบใต้ / ขอบตะวันตก',22);
 for(const [i,w] of [2585,1272.5].entries()){const y=760+i*130;s+=poly([[100,y],[100+w*.18,y],[100+w*.18,y+31.5],[100,y+31.5]])+dh(100,y+77,w*.18,String(w))+tx(115+w*.18,y+25,'175',18);}
 s+=tx(810,948,`${r.mass.netVolumeM3.toFixed(6)} m³ × 2400 = ${r.mass.concreteMassKg.toFixed(1)} kg`,22)+tx(810,986,`CG local: ${r.concreteOnlyCentroidMm.map(v=>v.toFixed(2)).join(', ')} mm`,19);
 s+=tx(65,1043,'ขอบตรงตรงข้ามเต็ม2797.5 / 1485',19)+tx(65,1080,'bearing / tolerance / inserts ยังไม่กำหนด',19);
 s+=tx(810,1030,'หูยก: ศึกษาผิวบนรอบCG หลบมุมเว้า ไม่มีพิกัดอนุมัติ',18,'#a45e2e')+tx(810,1065,'DEM / ROT / ERECT ตรวจแยก; CGคอนกรีตไม่ใช่CGอนุมัติยก',18)+tx(810,1100,'มวลไม่รวมเหล็ก อุปกรณ์ และตกแต่ง',18);
 return s+end();
}
export function assemblyBoard(m){let s=begin('U-N02 / MIRRORED WALL-SHARED NODE');const p=([x,y])=>[100+x*.17,750-y*.17],r=m.records[0];
 const box=(b,c)=>{const [x,y]=b.min,[w,l]=b.size;return poly([[x,y],[x+w,y],[x+w,y+l],[x,y+l]].map(p),c);};
 s+=tx(65,165,'01 / โหนดเปิด S/W — X/Y เป็นพิกัดlocalโหนด',22);
 for(const b of m.node.walls)s+=box(b,'#aabfcb');s+=box(m.node.nf02,'#cbdfe7');s+=poly(r.polygonXYMm.map(([x,y])=>p([x+7.5,y+7.5])));
 for(const b of m.node.wallZones)s+=box(b,'#72b2a3');s+=box(m.node.columnSpace,'#efa98b');
 s+=tx(245,375,'NF02 / P12',22)+tx(245,620,'NF01 / N02-P19',22)+dh(100,805,510,'กริด3000');
 s+=tx(65,866,'พื้นที่P2: X0..200 / Y0..200',20)+tx(65,906,'ขอบพื้นเว้าX220,Y220 → clearanceเสนอ20',20)+tx(65,946,'กริดโลกโหนด: X6000..9000,Y3000..6000',20);
 const notes=['02 / ตรวจการสะท้อน','พิกัดโหนด: Xใหม่ = 3000 − Xเดิม','พิกัดชิ้น: Xใหม่ = 2797.5 − Xเดิม','ย้อนลำดับจุดpolygonเพื่อคงทิศผิว','มุมชิ้นใหม่localโหนด = 7.5,7.5,0','มุมชิ้นในอาคาร = 6007.5,3007.5,0','NF02: X7.5..2805,Y1507.5..2805','พื้นที่ขอบผนังร่วมอยู่ในผนังเดิม','พื้นคู่รวม '+m.floorPairConcreteMassKg.toFixed(1)+' kg','เป็นมวลเฉพาะพื้น ไม่ใช่น้ำหนักโหนดครบ'];
 notes.forEach((v,i)=>s+=tx(800,165+i*50,v,i===0?24:20));
 s+=tx(800,733,'03 / ขอบเขตผลตรวจ',24);
 ['ตรวจpolygon ปริมาตร CG และพื้นที่หลบเสา','ตรวจพื้นไม่ซ้อนผนัง/พื้นอีกแผ่น','ไม่ใช่การตรวจhead/roof/ฐาน/เหล็ก/จุดต่อ','ไม่สะท้อนพิกัดหูยกหรือเหล็กโดยอัตโนมัติ','NF01-N01 และ N02 แยกtagไว้ก่อน'].forEach((v,i)=>s+=tx(800,780+i*43,v,20));
 s+=tx(65,1050,'WALL_SHARED ยืนยันแล้วเฉพาะแนวทางพัฒนา / พื้นที่เสา200×200และช่อง20ยังเป็นข้อเสนอ',21,'#a45e2e');
 return s+end();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/node-mirror-p19');fs.mkdirSync(out,{recursive:true});const m=model(),inv=inventory(m),req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const files=[];for(const [id,svg] of [[m.records[0].id,typicalBoard(m)],['U-N02-WALL-SHARED-P19',assemblyBoard(m)]]){fs.writeFileSync(path.join(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,id+'.png'));files.push(id+'.svg',id+'.png');}
 for(const [name,v] of [['register.json',m],['typical-index.json',inv]]){fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2));files.push(name);}
 const rows=inv.entries.map(e=>`| [${e.id}](../../${e.preview}) | ${e.concreteMassKg.toFixed(1)} | ${e.scope} |`);
 fs.writeFileSync(path.join(out,'TYPICAL_INDEX.md'),['# บัญชี Typical P19 — ขั้น2/8','','35แผ่นรายtag/revision รวมพื้นเดิมไม่เว้า1รายการ ไม่ใช่35แม่แบบหรือรายการผลิตครบ','มวลคอนกรีตทดลอง2400kg/m³ ไม่รวมน้ำหนักเหล็ก/inserts/ตกแต่ง ไม่ใช่น้ำหนักยก','','| Typical / ภาพ | kg | ขอบเขต |','|---|---:|---|',...rows,'','## รายการค้างก่อนขยาย48แบบ','','- ประสานหัวกรอบ/หลังคาโหนดและความสูงใช้สอย รวมการระบายน้ำ','- ชิ้นปิดเหนือแผงปลายตามรูปทรงA/B/C/D','- ตารางช่องเปิดให้เหมาะกับสำนักงาน/บ้าน/คาเฟ่/รีสอร์ต','- ระบุพื้นที่รอยต่อและการรองรับเพื่อประสานงาน; คำนวณเหล็ก/จุดต่อ/ยกในP7','- ไม่ถือว่าชิ้นทรงเดียวกันใช้เหล็ก/แม่แบบร่วมได้ จนตรวจรายละเอียด','','RVT/STDใหม่0; เว็บR02ยังไม่เชื่อม; ไม่อนุมัติผลิตหรือยก',''].join('\n'));files.push('TYPICAL_INDEX.md');
 fs.writeFileSync(path.join(out,'README.md'),'# P19 — U-N02 สะท้อน\n\n[Typical 3D/2D](TS-N90-NF01-N02-P19.png) · [ผังประสาน](U-N02-WALL-SHARED-P19.png) · [บัญชีTypical](TYPICAL_INDEX.md)\n\nเฉพาะgeometryประสานงาน ไม่อนุมัติแม่แบบ เหล็ก หูยก หรือรับแรง ใช้P18เป็นต้นทางและเก็บประวัติเดิม\n');files.push('README.md');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({dependencies:['tools/modular-program/node-mirror-p19.mjs','tools/modular-program/node-notch-p18.mjs',...sources.map(d=>`output/${d}/register.json`)].map(p=>({path:p,sha256:hash(p)})),files:files.map(f=>({file:f,sha256:hash('output/node-mirror-p19/'+f)}))},null,2));console.log(JSON.stringify({count:inv.counts,mass:m.records[0].mass.concreteMassKg,cg:m.records[0].concreteOnlyCentroidMm}));
}
