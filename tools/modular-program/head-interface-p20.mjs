import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {root} from './build-r02.mjs';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
export function model(){const roof=read('output/node-roof-p14/register.json'),r=roof.nodes[0].roofs[0],under=r.minMm[2],top=under+r.dimensionsMm[2],allowance=20,floor=175;
 return {revision:'P20',visibility:'INTERNAL_TEAM',scope:'VERTICAL_DIMENSION_STACK_NOT_MEMBER_OR_BEARING_DESIGN',programmeStage:2,datum:{floorTopZ:floor,roofUndersideZ:under,roofTopZ:top,wallTopZ:2655},interfaceAllowanceProposalMm:allowance,interfaceAllowanceApproved:false,
 cases:[100,200].map(depth=>({id:`HEAD_SPACE_${depth}_ALLOWANCE_20`,headDepthSpaceMm:depth,headTopZ:under-allowance,headBottomZ:under-allowance-depth,heightBeforeFinishesMm:under-allowance-depth-floor,previousZeroAllowanceHeightMm:under-depth-floor,finishedClearHeightMm:null,selected:false,memberSection:null,material:null,massKg:null})),
 interfaces:[{id:'IF-NR-HEAD',between:['NR_UNDERSIDE','HEAD_TOP'],gapProposalMm:20,physicalJoint:null,bearingLengthMm:null,note:'SPACE_ONLY_NOT_EMPTY_LOAD_PATH_OR_SPECIFIED_BEARING_PAD'},{id:'IF-HEAD-WALL',between:['HEAD_END','SHARED_WALL_EDGE'],gapProposalMm:null,physicalJoint:null,bearingLengthMm:null,note:'CONNECTION_AND_RECEIVING_ZONE_TO_DESIGN'},{id:'IF-HEAD-P2',between:['TWO_HEADS','CORNER_SUPPORT_SPACE'],gapProposalMm:null,physicalJoint:null,bearingLengthMm:null,note:'COLUMN_TOP_AND_HEAD_INTERSECTION_GEOMETRY_NOT_UPDATED'},{id:'IF-ROOF-WEATHER',between:['WING_ROOF','NODE_ROOF'],gapProposalMm:null,physicalJoint:null,bearingLengthMm:null,note:'FLASHING_MOVEMENT_INSULATION_DRAINAGE_PENDING'}],
 finishedClearHeightFormula:'heightBeforeFinishes - floorFinishThickness - belowHeadLiningOrServices',finishThicknessMm:null,geometryDependenciesToReviseIfSelected:['P16_COLUMN_TOP','P17_RECEIVING_ZONE_HEIGHT','P18_P19_COLUMN_SPACE_HEIGHT','HEAD_END_JOINT','NR_SUPPORT'],engineeringApproved:false,productionReleased:false};
}
export function checklist(){const rows=[
 ['ฐานกริดและความหนาพัฒนา','knowledge/modular-program-r02/decisions.json'],
 ['TS-C ซีกทึบและมิติหน้าตัด','output/tsc-master-p02/geometry.json'],
 ['TS-C ซีกช่องหน้าต่าง ภาพและมวล','output/typical-review-p05/register.json'],
 ['TS-C พื้นและแผงปลาย ภาพและมวล','output/typical-review-p05/register.json'],
 ['TS-A ซีกทึบ/หน้าต่าง ภาพและมวล','output/abd-typicals-p08/register.json'],
 ['TS-B ซีกทึบ/หน้าต่าง ภาพและมวล','output/abd-typicals-p08/register.json'],
 ['TS-D ซีกทึบ/หน้าต่าง ภาพและมวล','output/abd-typicals-p08/register.json'],
 ['A/B/D พื้นและแผงปลาย ภาพและมวล','output/abd-floor-ends-p09/register.json'],
 ['แผนแบ่งช่วงและตำแหน่งโหนด L/U','output/lu-node-p11/register.json'],
 ['พื้นโหนด ภาพ มิติและมวล','output/node-floor-p12/register.json'],
 ['ผนังโหนด ภาพ มิติและมวล','output/node-wall-p13/register.json'],
 ['แผ่นหลังคาโหนด ภาพ มิติและมวล ไม่รวมระบายน้ำ','output/node-roof-p14/register.json'],
 ['ขอบผนังร่วม พื้นเว้าและฉบับสะท้อน','output/node-mirror-p19/register.json'],
 ['บัญชีTypical/ภาพ/มวลรวมลิงก์','output/node-mirror-p19/typical-index.json'],
 ['รูปประสานระดับหัวกรอบ/รอยต่อและผลต่อช่องสูง','output/head-interface-p20/register.json'],
 ['เรขาคณิตชุดปิดช่อง/กันน้ำ/แนวระบายน้ำโหนด',null],
 ['ชิ้นปิดเหนือแผงปลาย A/B/C/D',null],
 ['ตารางชุดช่องเปิดและTypicalสำหรับ4การใช้งาน',null],
 ['ตรวจประสานรวมTypicalปัจจุบันและรายการข้อขัดแย้ง',null],
 ['สรุปค่าที่เลือก/ข้อยกเว้นและแพ็กเกจส่งต่อขั้น3',null]];
 const items=rows.map(([title,evidence],i)=>({id:`P2-${String(i+1).padStart(2,'0')}`,title,weightPercent:5,status:evidence?'DONE':'PENDING',acceptanceScope:'DEVELOPMENT_DELIVERABLE_NOT_ENGINEERING_APPROVAL',evidence}));
 return {revision:'P20',methodRevision:'P20_EQUAL_CHECKPOINTS_V1',stage:2,totalStages:8,previousBaselinePercent:70,completed:items.filter(i=>i.status==='DONE').length,total:items.length,percent:items.filter(i=>i.status==='DONE').length/items.length*100,items,overallProjectPercent:null,productionReadinessPercent:null};
}
const tx=(x,y,t,n=20,c='#25485c')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${t}</text>`;
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#587b8a"/>`;
export function board(m){let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1220"><rect width="1600" height="1220" fill="#f5f8fa"/><g font-family="Tahoma,Arial,sans-serif">${tx(45,55,'N90 / HEAD–ROOF VERTICAL INTERFACE · P20',30)}${tx(45,100,'ขั้น2/8 · รูปตัดระดับขยายเฉพาะส่วนบน / ความกว้างเป็นภาพสัญลักษณ์ ไม่ใช่ขนาดสมาชิก',21)}`;
 for(const [i,c] of m.cases.entries()){const x=80+i*780,k=.7,z=v=>650-(v-2200)*k;
 s+=tx(x,170,`พื้นที่หัวกรอบลึก${c.headDepthSpaceMm} + รอยต่อเสนอ20`,23);
 s+=rect(x,z(2850),440,175*k,'#cbdfe7')+rect(x,z(2675),440,20*k,'#f6e5c4')+rect(x,z(c.headTopZ),440,c.headDepthSpaceMm*k,'#d3bd9b');
 s+=tx(x+460,z(2850)+8,'2850',18)+tx(x+460,z(2675)+4,'2675',18)+tx(x+460,z(2655)+25,'2655',18)+tx(x+460,z(c.headBottomZ)+15,String(c.headBottomZ),18);
 s+=tx(x+25,z(2770),'NR01 หนา175',22)+tx(x+25,z(c.headTopZ-c.headDepthSpaceMm/2)+5,'พื้นที่หัวกรอบ ไม่ใช่หน้าตัดเลือกแล้ว',18);
 s+=tx(x,720,`ช่องสูงก่อนตกแต่ง = ${c.headBottomZ} − 175 = ${c.heightBeforeFinishesMm}`,22)+tx(x,765,`P16เดิม ${c.previousZeroAllowanceHeightMm} → ลด20เมื่อเผื่อรอยต่อ`,20)+tx(x,807,'Z0ใต้พื้น / Z175บนพื้น / finished height ยังไม่ทราบ',19);
 }
 ['แถบ20มม.เป็นพื้นที่ประสานรอยต่อ ยังไม่เลือกวัสดุรองรับ/เกราต์/เพลต/ระยะbearing','ห้ามตีความว่าเว้นช่องอากาศ20แล้วถ่ายแรงได้ หรือเลือกหัวกรอบ100เพียงเพื่อเพิ่มความสูง','หากเลือกกรณีนี้ ต้องแก้ยอดพื้นที่เสาP2และบริเวณรับหัวกรอบให้สอดคล้อง ไม่ใช้พิกัดP16เดิมทันที','ความสูงใช้จริงต้องหักพื้นตกแต่ง ฝ้า/งานระบบ และตรวจตามการใช้งาน; ยังไม่รับรองผ่านข้อกำหนด','งานต่อ: ชุดปิดรอยต่อภายนอก ระบายน้ำ และชิ้นปิดเหนือแผงปลาย ไม่เพิ่มTypicalหล่อในรอบนี้'].forEach((t,i)=>s+=tx(65,886+i*49,t,20,i<3?'#a45e2e':'#25485c'));
 return s+tx(65,1178,'ไม่มีการรันโครงสร้าง / ไม่มีการเลือกหน้าตัด วัสดุ หูยก หรืออนุมัติผลิต',21,'#a45e2e')+'</g></svg>';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const out=path.join(root,'output/head-interface-p20');fs.mkdirSync(out,{recursive:true});const m=model(),c=checklist(),svg=board(m),req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 fs.writeFileSync(path.join(out,'HEAD-ROOF-P20.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,'HEAD-ROOF-P20.png'));
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(m,null,2));fs.writeFileSync(path.join(out,'stage2-checklist.json'),JSON.stringify(c,null,2));
 fs.writeFileSync(path.join(out,'PROGRESS.md'),['# ขั้น2/8 — Typical Master: 75%','','15/20รายการตรวจรับข้อเสนอพัฒนาแบบ รายการละ5%; ก่อนรอบนี้14/20=70%','ไม่ใช่เปอร์เซ็นต์ความปลอดภัย ความพร้อมผลิต หรือเวลางาน ไม่ใช้35Typicalเป็นตัวหาร','','| รายการ | งาน | สถานะ | หลักฐาน |','|---|---|---|---|',...c.items.map(i=>`| ${i.id} | ${i.title} | ${i.status} | ${i.evidence?`[เปิด](../../${i.evidence})`:'—'} |`),'','[รูปประสานหัวกรอบ–หลังคา](HEAD-ROOF-P20.png)',''].join('\n'));
 const files=['HEAD-ROOF-P20.svg','HEAD-ROOF-P20.png','register.json','stage2-checklist.json','PROGRESS.md'],hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({dependencies:['tools/modular-program/head-interface-p20.mjs','output/node-roof-p14/register.json','knowledge/modular-program-r02/PROGRESS_METHOD.md'].map(p=>({path:p,sha256:hash(p)})),files:files.map(f=>({file:f,sha256:hash('output/head-interface-p20/'+f)}))},null,2));console.log(JSON.stringify({heights:m.cases.map(c=>c.heightBeforeFinishesMm),progress:c.percent}));}
