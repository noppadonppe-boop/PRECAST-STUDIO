import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { buildStudy } from './compute.mjs';

const root = resolve(import.meta.dirname, '../..');
const study = await buildStudy(root);
const c = study.cases.find(v => v.t_m === study.basis.geometry.illustration_thickness_m);
const out = resolve(root, 'output/tsc-step2a-r00');
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url);
const sharp = require(process.env.PM_SHARP_PATH || 'sharp');
const C = { ink: '#19313d', muted: '#526872', teal: '#166a77', load: '#b35d20', joint: '#315fa2', pale: '#e1edf0', gray: '#d7e0e5' };
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const f = (n, d=3) => Number(n).toFixed(d);
const text = (x,y,s,size=23,color=C.ink,weight=400) => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
const line = (x1,y1,x2,y2,color=C.ink,width=2,dash='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const rect = (x,y,w,h,fill='none',stroke=C.gray) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
const arrow = (x1,y1,x2,y2,key='joint') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C[key]}" stroke-width="3" marker-end="url(#${key})"/>`;
const moment = (x,y,positive,label) => `<path d="M${x-18} ${y+15} A24 24 0 1 ${positive?1:0} ${x+18} ${y+15}" fill="none" stroke="${C.joint}" stroke-width="2.5" marker-end="url(#joint)"/>${text(x-24,y+(positive?52:85),label,20,C.joint)}`;
function doc(title,subtitle,body,height=1180) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${height}" viewBox="0 0 1600 ${height}" role="img"><title>${esc(title)}</title><desc>${esc(subtitle)}</desc><defs>${['load','joint','teal'].map(k=>`<marker id="${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${C[k]}"/></marker>`).join('')}</defs><rect width="1600" height="${height}" fill="white"/><g font-family="Tahoma, Segoe UI, sans-serif">${rect(0,0,1600,12,C.teal,C.teal)}${text(60,67,title,34,C.ink,700)}${text(60,108,subtitle,21,C.muted)}${line(60,135,1540,135,C.gray)}${body}${line(60,height-95,1540,height-95,C.gray)}${text(60,height-57,'S2A-R00 / DRAFT PRE-ANALYSIS / NOT FOR CONSTRUCTION',22,C.load,700)}${text(60,height-24,'รูปจากพิกัดและสมการ • ไม่ใช่ผล FEM หรือการรับรองความปลอดภัย • หน่วยเรขาคณิต: เมตร',18,C.muted)}</g></svg>`;
}
function outline(c,hand='LH') {
  const B=c.width_m,H=c.height_m,R=c.outer_radius_m,t=c.t_m,tf=c.floor_t_m;
  const pts=[[0,tf],[0,H-R]];
  for(let i=0;i<=64;i++){const a=Math.PI-i*Math.PI/128;pts.push([R+R*Math.cos(a),H-R+R*Math.sin(a)]);}
  pts.push([B/2,H],[B/2,H-t],[R,H-t]);
  for(let i=0;i<=64;i++){const a=Math.PI/2+i*Math.PI/128;pts.push([R+(R-t)*Math.cos(a),H-R+(R-t)*Math.sin(a)]);}
  pts.push([t,tf]);
  return hand==='RH'?pts.map(([x,z])=>[B-x,z]):pts;
}
function poly(points, map, fill=C.pale, stroke=C.ink) {
  return `<polygon points="${points.map(p=>map(p).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
}
function section(c,ox,base,s,which='both',floor=true) {
  const map=([x,z])=>[ox+s*x,base-s*z];
  return (which!=='RH'?poly(outline(c),map):'')+(which!=='LH'?poly(outline(c,'RH'),map,'#e8edf5'):'')+(floor?poly([[0,0],[3,0],[3,c.floor_t_m],[0,c.floor_t_m]],map,'#e7e9eb'):'');
}
const circ = (x,y,r=6,color=C.joint) => `<circle cx="${x}" cy="${y}" r="${r}" fill="white" stroke="${color}" stroke-width="2"/>`;

let g='';
g+=text(70,185,'01 / รูปตัดตั้งฉาก X–Z',27,C.ink,700);
g+=section(c,180,795,180);
g+=line(180,855,720,855,C.muted)+line(180,817,180,870,C.muted)+line(720,817,720,870,C.muted)+text(365,891,'B = 3.000',23);
g+=line(110,255,110,795,C.muted)+line(100,255,160,255,C.muted)+line(100,795,160,795,C.muted)+rect(65,574,115,34,'white','none')+text(75,600,'H = 3.000',22);
g+=text(220,756,`พื้น t_f = ${f(c.floor_t_m*1000,0)} mm (ตัวอย่าง)`,22);
g+=line(185,329,120,284,C.muted)+line(120,284,70,284,C.muted)+text(78,230,'R_outer = 0.400',22);
g+=line(450,259,515,207,C.joint)+text(510,198,'JO-CR / แนวแบ่งซีก',21,C.joint);
g+=line(450,305,450,714,C.muted,1.5,'6 5')+text(474,520,`H_clear = ${f(c.clear_flat_height_m)}`,22);
g+=line(214,695,689,695,C.muted,1.5,'6 5')+text(328,682,`B_clear = ${f(c.clear_width_m)}`,22);
g+=text(180,925,'Z = 0 ที่ใต้พื้น; ผิวบนพื้น Z = t_f',22,C.muted);
g+=text(180,960,'ความสูงใช้งานยังไม่หักผิวตกแต่งและงานระบบ',21,C.muted);
g+=text(910,185,'02 / แปลนหนึ่งช่วง X–Y',27,C.ink,700);
g+=rect(940,250,480,240,'#f0f5f7',C.ink)+line(1180,250,1180,490,C.joint,3,'10 7');
g+=text(974,356,'LH',28,C.teal,700)+text(1290,356,'RH',28,C.joint,700)+text(1035,405,'F15 แยกอยู่ด้านล่าง',22);
g+=text(941,531,'X = 0 → 3.000',22)+text(944,571,'Y = 0 → 1.500; หนึ่ง bay ไม่ใช่ 3×3 ม.',22);
g+=text(910,636,'03 / ชุดความหนาที่เสนอศึกษา',27,C.ink,700);
g+=text(910,682,'t = t_f (mm)',21)+text(1160,682,'B_clear',21)+text(1350,682,'H_clear',21);
study.cases.forEach((v,i)=>{const y=731+i*48;g+=text(930,y,f(v.t_m*1000,0),24)+text(1160,y,f(v.clear_width_m),24)+text(1350,y,f(v.clear_flat_height_m),24);});
g+=text(910,913,'ความหนายังไม่เลือก: 175 mm ใช้วาดภาพเท่านั้น',21,C.load);
g+=text(910,952,'S00 ทึบ • joint gap / ความลาดระบายน้ำยัง TBD',21,C.load);
const geometry=doc('TS-C / รูปทรงฐานศึกษาและระดับอ้างอิง','ผู้ใช้ยืนยันกรอบ 3.00 × 3.00 ม. รวมพื้น • ช่วง 1.50 ม. • มุมโค้งภายนอก R0.40 ม.',g);

let b='';
b+=text(70,181,'A / แยกซีก LH',28,C.ink,700)+text(850,181,'B / แยกซีก RH',28,C.ink,700);
const s=120,base=600,oxL=170,oxR=910,zc=base-s*(3-c.t_m/2),zb=base-s*c.floor_t_m;
b+=section(c,oxL,base,s,'LH',false)+section(c,oxR,base,s,'RH',false);
b+=arrow(oxL+90,190,oxL+90,238,'load')+text(oxL+5,222,'P_L ↓',21,C.load);
b+=arrow(oxL+s*c.half_centroid_m[0],380,oxL+s*c.half_centroid_m[0],445,'load')+text(oxL+62,421,'W_L',22,C.load);
b+=arrow(oxL+180,zc,oxL+248,zc)+text(oxL+212,zc-18,'C_x',21,C.joint);
b+=arrow(oxL+180,zc,oxL+180,zc-66)+text(oxL+191,zc-63,'C_z',21,C.joint);
b+=moment(oxL+277,zc+60,true,'C_My');
b+=arrow(oxL+s*c.t_m/2,zb+66,oxL+s*c.t_m/2,zb,'teal')+text(oxL-92,zb+47,'B_Lz',21,C.teal);
b+=arrow(oxL+s*c.t_m/2,zb,oxL+s*c.t_m/2+64,zb,'teal')+text(oxL+32,zb-15,'B_Lx',21,C.teal)+moment(oxL-38,zb-63,true,'M_Ly');
b+=arrow(oxR+270,190,oxR+270,238,'load')+text(oxR+307,222,'P_R ↓',21,C.load);
b+=arrow(oxR+s*(3-c.half_centroid_m[0]),380,oxR+s*(3-c.half_centroid_m[0]),445,'load')+text(oxR+202,421,'W_R',22,C.load);
b+=arrow(oxR+180,zc,oxR+112,zc)+text(oxR+85,zc-18,'−C_x',21,C.joint);
b+=arrow(oxR+180,zc,oxR+180,zc+66)+text(oxR+190,zc+76,'−C_z',21,C.joint)+moment(oxR+74,zc+97,false,'−C_My');
b+=arrow(oxR+s*(3-c.t_m/2),zb+66,oxR+s*(3-c.t_m/2),zb,'teal')+text(oxR+378,zb+47,'B_Rz',21,C.teal);
b+=arrow(oxR+s*(3-c.t_m/2),zb,oxR+s*(3-c.t_m/2)+64,zb,'teal')+text(oxR+382,zb-15,'B_Rx',21,C.teal)+moment(oxR+484,zb-115,true,'M_Ry');
b+=text(70,698,'เครื่องหมายลูกศรคือแกนบวกของตัวแปร ไม่ได้แปลว่าแรงจริงต้องเป็นบวกทุกตัว',23,C.muted);
b+=text(70,739,'ΣFx = 0, ΣFz = 0, ΣMy = 0; แรงและโมเมนต์ที่ crown เป็นคู่เท่ากันตรงข้าม',23,C.joint);
b+=line(70,777,1530,777,C.gray);
b+=text(70,826,'C / LH + RH รวมกัน (ไม่รวมพื้น)',27,C.ink,700);
b+=text(70,857,'รูป C วาดผลลัพธ์โหลดสมมาตรเท่านั้น',19,C.muted);
b+=section(c,170,1205,95,'both',false);
b+=arrow(310,864,310,916,'load')+text(410,896,'P_L + P_R',21,C.load);
b+=arrow(312,1025,312,1082,'load')+text(355,1050,'W_L + W_R',21,C.load);
b+=arrow(178,1270,178,1189,'teal')+text(78,1265,'B_Lz',22,C.teal);
b+=arrow(447,1270,447,1189,'teal')+text(470,1265,'B_Rz',22,C.teal);
b+=arrow(178,1189,248,1189,'teal')+text(197,1171,'B_Lx',19,C.teal);
b+=arrow(447,1189,517,1189,'teal')+text(478,1171,'B_Rx',19,C.teal);
b+=moment(116,1125,true,'M_Ly')+moment(553,1090,true,'M_Ry');
b+=text(70,1320,'แรง crown หักล้าง: ไม่ใส่เป็นโหลดภายนอกซ้ำ',21,C.muted);
b+=text(850,826,'D / แผ่นพื้น F15 แยก',27,C.ink,700);
b+=rect(930,1060,450,30,'#e7e9eb',C.ink);
for(let i=0;i<6;i++)b+=arrow(956+i*76,956,956+i*76,1046,'load');
b+=text(947,923,'q_F ↓ + น้ำหนักพื้น W_F ↓',23,C.load);
b+=arrow(962,1170,962,1095,'teal')+arrow(1348,1170,1348,1095,'teal');
b+=text(862,1208,'R_F : แรงรองรับรวม; ตำแหน่งจริงยัง TBD',22,C.teal);
b+=text(850,1252,'LP-A: พื้นไม่รับน้ำหนักเปลือก',22);
b+=text(850,1292,'LP-B: เพิ่ม −B_L/R และ −M_L/R จากฐานผนัง',21);
b+=text(850,1332,'ต้องเลือก load path ก่อนคำนวณพื้น',22,C.load);
const fbd=doc('TS-C / Free-body diagrams และแรงคู่ที่ interface','ภาพฉาย X–Z เชิงสัญลักษณ์ • +My = dz·Fx − dx·Fz ตาม right-hand rule • ยังไม่กำหนด stiffness จุดต่อ',b,1470);

let j='';
j+=text(70,183,'01 / ตำแหน่ง interface หนึ่งช่วง',27,C.ink,700);
const iso=([x,y,z])=>[155+x*170+y*90,825-z*170-y*62];
for(const hand of ['LH','RH']) {
  const pts=outline(c,hand);
  j+=poly(pts.map(([x,z])=>[x,1.5,z]),iso,'#f3f6f8',C.gray);
  j+=poly(pts.map(([x,z])=>[x,0,z]),iso,hand==='LH'?C.pale:'#e8edf5');
  for(const [x,z] of [[hand==='LH'?0:3,c.floor_t_m],[1.5,3],[hand==='LH'?0:3,2.6]]){const a=iso([x,0,z]),b=iso([x,1.5,z]);j+=line(...a,...b,C.muted,1.5);}
}
j+=poly([[0,0,0],[3,0,0],[3,1.5,0],[0,1.5,0]],iso,'#e9edef',C.ink);
for(const x of [c.t_m/2,3-c.t_m/2]){const a=iso([x,0,c.floor_t_m]),b=iso([x,1.5,c.floor_t_m]);j+=line(...a,...b,C.teal,4);}
const crown0=iso([1.5,0,3-c.t_m/2]),crown1=iso([1.5,1.5,3-c.t_m/2]);j+=line(...crown0,...crown1,C.joint,5);
j+=line(crown1[0],crown1[1],775,235,C.joint)+text(595,221,'JO-CR-C / crown',22,C.joint);
j+=line(155,450,70,363,C.muted)+text(70,338,'JO-BY / rim ที่ Y=0,L',21);
const bs=iso([3-c.t_m/2,.4,c.floor_t_m]);j+=line(...bs,790,781,C.teal)+text(589,820,'JO-BS-L/R',22,C.teal);
j+=text(70,890,'JO-FF: ปลายแผ่นพื้นที่ Y=0,L',22)+text(70,930,'JO-ND / NI: ยังไม่อยู่ใน single bay; ใช้กับ L/U ภายหลัง',21);
j+=text(70,970,'JO-LF / TB: ตำแหน่งยกและค้ำชั่วคราวยังไม่ออกแบบ',21,C.load);
j+=text(910,183,'02 / แนวคิดจุดต่อกลางหลังคา',26,C.ink,700);
j+=rect(950,280,205,65,C.pale,C.ink)+rect(1175,280,205,65,'#e8edf5',C.ink);
j+=rect(1155,286,20,53,'#ddd5c6',C.muted)+line(1030,312,1300,312,C.joint,5);
j+=circ(1135,312,8)+circ(1193,312,8);
j+=text(918,395,'bearing / grout + shear transfer',23)+text(918,435,'tie หรือ coupler ที่ออกแบบรับแรงดึง',23);
j+=text(918,475,'ถ้าต้องถ่ายโมเมนต์ ต้องออกแบบคู่แรงและระยะแขน',21);
j+=text(918,515,'sealant กันน้ำ ไม่ใช่ตัวรับแรงโครงสร้าง',21,C.load);
j+=text(910,603,'03 / แนวคิดฐานผนัง–พื้น/ฐานรอง',26,C.ink,700);
j+=rect(1060,670,65,133,C.pale,C.ink)+rect(1002,810,210,18,'#c7c8c6',C.ink)+rect(964,837,305,63,'#e7e9eb',C.ink);
j+=line(1148,750,1148,880,C.joint,4)+line(1100,751,1148,751,C.joint,4);
j+=text(1300,767,'hold-down',20,C.joint)+line(1170,790,1286,764,C.joint);
j+=text(918,948,'bearing + shear restraint + uplift restraint ตามแรง',21);
j+=text(918,988,'ขนาด จำนวน bolt / coupler / anchor = TBD',21,C.load);
j+=text(70,1034,'รูปจุดต่อเป็น topology เท่านั้น ไม่ใช่ shop detail / ห้ามถอดจำนวนอุปกรณ์จากรูป',23,C.load,700);
const joints=doc('TS-C / Joint locations และแนวคิดการถ่ายแรง','ทุก interface ต้องระบุ 6 DOF, stiffness/contact และแรงที่ต้องถ่าย ก่อนเลือกอุปกรณ์ • ยังไม่อนุมัติใช้ผลิต',j,1190);

const boards=[['TS-C-GEOMETRY-S2A-R00','รูปตัด แปลน และระดับ',geometry],['TS-C-FBD-S2A-R00','FBD และคู่แรงระหว่างชิ้น',fbd],['TS-C-JOINT-S2A-R00','ตำแหน่งและแนวคิดจุดต่อ',joints]];
for(const [id,,svg] of boards){await writeFile(resolve(out,`${id}.svg`),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,`${id}.png`));}
const jointsData=JSON.parse(await readFile(resolve(root,'knowledge/modular-tsc-step2a/joint_register.json'),'utf8'));
const dependency_hashes={};
for(const path of ['knowledge/modular-tsc-step2a/study_basis.json','knowledge/modular-tsc-step2a/joint_register.json','tools/tsc-study/compute.mjs','tools/tsc-study/render.mjs']) dependency_hashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
await writeFile(resolve(out,'study_results.json'),JSON.stringify({...study,dependency_hashes,joints:jointsData,drawings:boards.map(([id,title])=>({id,title,file:`${id}.png`,vector_file:`${id}.svg`,status:'DRAFT_PRE_ANALYSIS'}))},null,2)+'\n');
console.log(JSON.stringify({status:'GENERATED_DRAFT_NOT_FEM',drawings:boards.map(([id])=>id),cases:study.cases.map(v=>({t_mm:v.t_m*1000,V_half_m3:v.half_volume_m3,V_floor_m3:v.floor_volume_m3,clear_width_m:v.clear_width_m,clear_flat_height_m:v.clear_flat_height_m}))},null,2));
