import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2d-r00');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const r=await read(resolve(out,'bay_results.json')),mesh=await read(resolve(out,'SOLID-T175-FR-FULL-D1.json'));
const sharp=createRequire(import.meta.url)(process.env.PM_SHARP_PATH||'sharp');
const C={ink:'#19313d',muted:'#526872',teal:'#166a77',orange:'#ac5119',blue:'#315fa2',gray:'#d7e0e5'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const txt=(x,y,s,size=22,color=C.ink,weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
const line=(x,y,X,Y,c=C.gray,w=1)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}"/>`;
const poly=(pts,fill='none',stroke=C.teal,w=1)=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const f=(v,d=3)=>(Math.abs(v)<.5*10**-d?0:v).toFixed(d),pct=v=>f(v*100,2)+'%';
const doc=(title,sub,body,H=1250)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${H}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="${C.orange}"/></marker></defs><rect width="1800" height="${H}" fill="white"/><g font-family="Tahoma,Segoe UI,sans-serif"><rect width="1800" height="12" fill="${C.teal}"/>${txt(60,65,title,34,C.ink,700)}${txt(60,111,sub,22,C.muted)}${line(60,141,1740,141)}${body}${line(60,H-94,1740,H-94)}${txt(60,H-55,'S2D-R00 / PARTIAL NUMERICAL QA / NOT FOR DESIGN OR CONSTRUCTION',24,C.orange,700)}${txt(60,H-22,'ไม่เลือกความหนา เหล็ก หรืออุปกรณ์ยึด • ยังไม่ตรวจความเค้นเฉพาะที่ครบ / ร้าว / ลม / ยกประกอบ',21,C.muted)}</g></svg>`;
const iso=([x,y,z])=>[110+160*x+88*y,805-160*z-62*y];
let a=txt(60,188,'01 / Solid bay — ขอบ Y อิสระ',27,C.ink,700);
const faces=[];
for(const e of mesh.elements){
  const p=e.nodes.map(n=>mesh.nodes[n]);
  if(p[0][1]===0)faces.push({p:[p[0],p[1],p[5],p[4]],fill:'#dae7ea'});
  const v=p[4]; const outer=Math.abs(v[0])<1e-8||Math.abs(v[0]-3)<1e-8||Math.abs(v[2]-3)<1e-8||Math.abs(Math.hypot(v[0]-(v[0]<1.5?.4:2.6),v[2]-2.6)-.4)<1e-8;
  if(outer)faces.push({p:[p[4],p[5],p[6],p[7]],fill:'#eaf3f4'});
}
faces.sort((a,b)=>b.p.reduce((s,p)=>s+p[1],0)-a.p.reduce((s,p)=>s+p[1],0));
for(const face of faces)a+=poly(face.p.map(iso),face.fill,C.teal,.6);
for(const x of [.0875,2.9125])a+=line(...iso([x,0,.175]),...iso([x,1.5,.175]),C.orange,6);
a+=txt(75,862,'รูปใช้ D1 เพื่ออ่านง่าย; ผลละเอียดสุด D3 = 34,200 bricks',21,C.muted);
a+=txt(75,904,'3.00 × 3.00 ม. รวมพื้น / bay 1.50 ม. / t=175 มม.',22);
a+=txt(900,188,'02 / ขอบเขตเปรียบเทียบ',27,C.ink,700);
['NC320 / E 28,321.8 MPa / ν 0.20 / ρ 2400 kg/m³',
'LP-A: ผนัง–หลังคาลงฐานตรง; ไม่มีพื้นในโมเดล',
'ฐานแต่ละหน้าตัดยึด Ux/Uz; Uy ยึดที่กึ่งกลาง1จุด',
'Crown รวมโหนดทั้งหน้า: bonded limit ไม่ใช่boltจริง',
'ด้าน Y=0 และ1.50ม. อิสระ ไม่บังคับ plane strain',
'FULL = SW+LLเต็ม / LEFT = SW+LLครึ่งซ้าย',
'โหลด physical exact; stiffnessใช้ผิวโค้งแบบfacet',
'ไม่ถือว่า face BC ของ solid เท่ากับ line BC ของ shell'].forEach((s,i)=>a+=txt(900,246+i*48,s,22,i===7?C.orange:C.ink));
a+=txt(900,683,'03 / ผลละเอียดสุด D3',27,C.ink,700);
const fine=r.solid_runs.filter(s=>s.mesh==='D3');
fine.forEach((s,i)=>{a+=txt(920,740+i*122,`${s.pattern}  |u|max=${f(s.max_displacement_mm,4)} mm`,25,C.teal,700);a+=txt(920,781+i*122,`ฐาน LH: Fx=${f(s.base.LH[0])}, Fz=${f(s.base.LH[2])} kN`,22);});
a+=txt(70,985,'04 / Mesh D2 → D3: ค่าเปลี่ยนตาม normalization ของชุดศึกษา',27,C.ink,700);
const xs=[85,380,780,1130];['LL','|u|max','ฐาน Fx/Fz/My','หน้าตัด Fx/Fz/My'].forEach((s,i)=>a+=txt(xs[i],1040,s,23,C.muted));
r.comparisons.forEach((c,i)=>[c.pattern,pct(c.displacement_change),pct(c.reaction_change),pct(c.cut_change)].forEach((s,j)=>a+=txt(xs[j],1092+i*48,s,25)));
a+=txt(80,1204,'ผลรวมแรงกับสมดุลตรวจแล้ว แต่ยังไม่พิสูจน์ local-stress convergence หรือเสถียรภาพและกำลังทั้งอาคาร',22,C.orange);
const solid=doc('TS-C / Solid ทั้ง bay และการเปรียบเทียบตาข่าย','ศึกษาความหนา175มม. / F-R limit / FULL และ LEFT / ไม่ใช่ความหนาหรือจุดต่อที่อนุมัติ',a,1335);

const selected=fine.find(s=>s.pattern==='FULL'),cut=selected.cuts.find(c=>c.id==='C45');
let b=txt(60,188,'01 / FBD ส่วนซ้ายจากฐานถึง C45',27,C.ink,700);
const px=x=>260+x*250,pz=z=>860-z*200;
const outline=[[.0875,.175],[.0875,2.6]];for(let i=0;i<=16;i++){const theta=Math.PI-i*Math.PI/64;outline.push([.4+.3125*Math.cos(theta),2.6+.3125*Math.sin(theta)]);}
b+=`<polyline points="${outline.map(([x,z])=>[px(x),pz(z)].join(',')).join(' ')}" fill="none" stroke="${C.teal}" stroke-width="7"/>`;
const arrow=(x,y,X,Y)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${C.orange}" stroke-width="3" marker-end="url(#arrow)"/>`;
const [cx,,cz]=cut.origin_m;
b+=arrow(px(cx)+100,pz(cz),px(cx)+10,pz(cz))+arrow(px(cx),pz(cz)-80,px(cx),pz(cz)-5);
b+=txt(400,287,`C45: Fx=${f(cut.cut_on_lower_LH_6[0])} kN`,21,C.orange);
b+=txt(400,329,`Fz=${f(cut.cut_on_lower_LH_6[2])} kN`,21,C.orange)+txt(400,371,`My=${f(cut.cut_on_lower_LH_6[4])} kN·m`,21,C.orange);
const P=cut.physical_load_about_cut_6,xP=cx+P[4]/(-P[2]);
b+=arrow(px(xP),490,px(xP),620)+txt(390,560,`SW+LL = ${f(-P[2])} kN`,21);
b+=txt(390,603,`แนวแรงรวม X=${f(xP,4)} ม.`,20,C.muted);
b+=arrow(px(.0875),890,px(.0875),830)+arrow(px(.0875)-90,825,px(.0875)-6,825);
b+=txt(100,940,`ฐาน: Fx=${f(selected.base.LH[0])}, Fz=${f(selected.base.LH[2])} kN`,22);
b+=txt(100,980,`My ที่ฐาน=${f(selected.base.LH[4])} kN·m; โมเมนต์ในตารางย้ายมาที่ C45`,20,C.muted);
b+=txt(100,1030,'แกน global: +X → / +Z ↑ / +My ตามเข็มนาฬิกาในรูป',20,C.muted);
b+=txt(850,188,'02 / แรงทั้งหมดอ้างอิงจุด C45 เดียวกัน',27,C.ink,700);
const tx=[860,1110,1320,1530];['รายการ','Fx (kN)','Fz (kN)','My (kN·m)'].forEach((s,i)=>b+=txt(tx[i],247,s,22,C.muted));
[['ฐาน R',cut.base_about_cut_6],['โหลด P',cut.physical_load_about_cut_6],['หน้าตัด C',cut.cut_on_lower_LH_6],['R+P+C',cut.fbd_residual_6]].forEach(([name,v],i)=>[name,f(v[0]),f(v[2]),f(v[4])].forEach((s,j)=>b+=txt(tx[j],307+i*65,s,24)));
b+=txt(860,610,'ตรวจจาก element resisting forces และโหลดที่แบ่งให้ชิ้นนั้น',21);
b+=txt(860,653,'รวม r×F / nodal moment ครบ; หักโหลดบนแนวตัดไม่ให้ซ้ำ',21);
b+=txt(860,696,'รายงานครบ6องค์ประกอบ; รูปแสดง3ตัวหลักในระนาบ XZ',21,C.muted);
b+=txt(850,770,'03 / แรง cut บนชิ้นล่าง · D3 / FULL',27,C.ink,700);
selected.cuts.forEach((c,i)=>b+=txt(860,824+i*43,`${c.id.padEnd(8)}  Fx ${f(c.cut_on_lower_LH_6[0])}  Fz ${f(c.cut_on_lower_LH_6[2])}  My ${f(c.cut_on_lower_LH_6[4])}`,22));
b+=txt(70,1124,'ผลรวมแรงผ่านหน้าตัดเป็นแรงต่อ bay (kN, kN·m) ไม่ใช่ shell force ต่อเมตรและไม่ใช่แรงต่อ bolt',23,C.orange,700);
b+=txt(70,1167,'FBD ปิดสมดุลไม่ได้รับรองการกระจายความเค้น รอยร้าว หรือกำลังของเหล็ก/จุดต่อ ต้องตรวจต่อแยกกัน',22,C.orange);
const fbd=doc('TS-C / Section-cut force และสมดุลของชิ้นส่วนย่อย','ตัวอย่าง Solid D3 / FULL / ซีก LH ตัดผ่านมุม45° • แรงรวม6องค์ประกอบจากผลคำนวณจริง',b,1290);
const boards=[['TS-C-SOLID-BAY-S2D-R00','Solid หนึ่ง bay และผลตรวจ mesh',solid],['TS-C-CUT-FBD-S2D-R00','แรงผ่านหน้าตัดและ FBD ชิ้นส่วนย่อย',fbd]];
for(const [id,,svg] of boards){await writeFile(resolve(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,id+'.png'));}
const hashes={...r.dependency_hashes};for(const p of ['output/tsc-step2d-r00/bay_results.json','tools/tsc-study/render_bay.mjs'])hashes[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
const summary={id:r.id,revision:r.revision,status:r.status,basis:r.basis,dependency_hashes:hashes,solid_runs:r.solid_runs,shell_audits:r.shell_audits.map(a=>({id:a.id,joint:a.joint,mesh:a.mesh,cuts:a.cuts})),comparisons:r.comparisons,local_stress_convergence:r.local_stress_convergence,engineering_approval:false,manufacturing_release:false,drawings:boards.map(([id,title])=>({id,title,file:id+'.png'}))};
await writeFile(resolve(out,'web_summary.json'),JSON.stringify(summary,null,2));console.log(boards.map(b=>b[0]).join('\n'));
