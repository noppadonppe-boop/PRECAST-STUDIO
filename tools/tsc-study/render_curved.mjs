import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2g-r00');
const r=JSON.parse(await readFile(resolve(out,'curved_results.json'),'utf8'));
const sharp=createRequire(import.meta.url)(process.env.PM_SHARP_PATH||'sharp');
const ink='#19313d',muted='#536974',teal='#166a77',orange='#a64a1b',blue='#315fa2';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=23,c=ink,w=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" font-weight="${w}">${esc(s)}</text>`;
const line=(x,y,X,Y,c='#d7e0e5',w=1,arr=false)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${arr?'marker-end="url(#arr)"':''}/>`;
const f=(v,d=3)=>Math.abs(v)<1e-7?'≈0':Math.abs(v)<.001?v.toExponential(2):v.toFixed(d),pct=v=>f(v*100)+'%';
const doc=(title,sub,body,H=1370)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${H}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><rect width="1800" height="${H}" fill="white"/><g font-family="Tahoma,Segoe UI,sans-serif"><rect width="1800" height="12" fill="${teal}"/>${text(60,68,title,34,ink,700)}${text(60,113,sub,23,muted)}${line(60,145,1740,145)}${body}${line(60,H-95,1740,H-95)}${text(60,H-56,'S2G-R00 / CURVED COUPON / NOT FOR DESIGN OR CONSTRUCTION',24,orange,700)}${text(60,H-23,'ผ่านเฉพาะกรณีศึกษา ไม่รับรอง full TS-C bay หรืออนุมัติความหนา เหล็ก จุดต่อ และการผลิต',22,muted)}</g></svg>`;
let a=text(65,199,'ชิ้นโค้ง 90° / R ภายนอก 0.40 ม. / t150–200 มม. / b=1.50 ม.',27,ink,700);
a+=text(65,246,'E=28,321.787MPa / ν=.20 + ν=0 control / ไม่มี self-weight หรือ roof LL ใน coupon นี้',23,muted);
const coord=(rad,th)=>[230+rad*1000*Math.cos(th),770-rad*1000*Math.sin(th)];
const points=(rad)=>Array.from({length:65},(_,i)=>coord(rad,Math.PI*i/128));
const polygon=[...points(.4),...points(.225).reverse()].map(v=>v.join(',')).join(' ');
a+=`<polygon points="${polygon}" fill="#e4eef2" stroke="${teal}" stroke-width="3"/>`;
for(let i=0;i<=8;i++){const th=Math.PI*i/16;const p=coord(.225,th),q=coord(.4,th);a+=line(...p,...q,'#aabfc7');}
a+=line(230,770,710,770,muted,2,true)+text(722,778,'+X',22,muted)+line(230,770,230,312,muted,2,true)+text(193,309,'+Z',22,muted);
a+=line(220,370,160,370,teal,3,true)+line(160,545,220,545,teal,3,true);
a+=text(70,335,'My = −1.50 kNm',23,teal,700);
a+=line(630,798,630,850,blue,3,true)+line(455,850,455,798,blue,3,true);
a+=text(270,902,'Reaction My = +1.50 kNm',24,blue,700);
a+=text(275,946,'แรงรวมที่ปลาย = 0 / ΣF=0, ΣM=0',23,muted);
a+=text(830,345,'BC และการใส่แรง',28,ink,700);
const notes=['Uy=0 ทุก node → plane strain ไม่ใช่ขอบข้างอิสระ','θ=0: Uz=0 ทั้งหน้า; Ux datum หนึ่งจุดที่ Rm,Y=.75','ผิวรัศมีอิสระ; ไม่ใช้ฐาน rigid clamp','θ=90: traction จาก exact Airy σtt','m=1 kNm/m × b=1.50m → My=−1.50 kNm','แรงทดสอบนี้ไม่ใช่แรงออกแบบรอยต่อจริง'];
notes.forEach((s,i)=>a+=text(830,397+i*48,s,23,i===5?orange:ink));
a+=text(830,737,'แยก formulation ออกจาก geometry',27,ink,700);
['H8-CHORD: element8-node + ผิวคอร์ดตรง','H20-CHORD: element20-node + geometryคอร์ดเดิม','H20-CURVED: midsideบนวงกลม → quadratic arc','G1 / G2 / G3: 8×2×2 / 16×4×2 / 32×8×2','จำนวน node/DOF ต่างกัน ไม่ใช่เทียบต้นทุนเท่ากัน'].forEach((s,i)=>a+=text(830,788+i*45,s,23,muted));
a+=text(65,1044,'รูปตัดแสดง t175 และแนวแบ่งมุม G1 เป็นตัวอย่างตำแหน่ง ไม่ใช่ mesh ทุกกรณี',23,muted);
a+=text(65,1100,'ตรวจ 30 กรณี + 2 affine patches; 45พิกัดกายภาพร่วมต่อชุด เก็บค่าจากทุกด้านของ element',25,ink,700);
a+=text(65,1150,'ตรวจ strain energy, displacement, 6 stress components, equilibrium, Jacobian และ geometry error',23);
a+=text(65,1200,'ผลผ่าน coupon ยังไม่ครอบคลุมแรงโน้มถ่วง ช่องเปิด รอยต่อจริง ร้าว ลม หรือการยกประกอบ',24,orange);
const first=doc('TS-C / Quadratic solid ที่มุมโค้ง','FBD และเงื่อนไขขอบเขต • ภาพจาก geometry/สมการ ไม่ใช่ภาพจำลองผลด้วย AI',a);
const profiles=r.profiles.filter(p=>p.t_m===.175&&p.nu===.2);const colors=['#899da6',blue,teal];
let b=text(65,198,'ตัวอย่างคงที่ t175 / ν=.20 / G3 / θ=45° / Y=.75 ม. / tension บวก',26,ink,700);
b+=text(65,243,'เส้นเชื่อมค่าตรวจ f=.10–.90; ไม่ extrapolateถึงผิว • exactเป็นคำตอบ Airy ไม่ใช่สูตรคานตรง',23,muted);
for(const [j,k] of [0,1].entries()){
  const X=120+j*850,Y=330,W=680,H=300;
  const all=profiles.flatMap(p=>p.points.flatMap(s=>[s.mean_kPa[k],s.exact_kPa[k]]));const lo=Math.floor(Math.min(...all)/10)*10,hi=Math.ceil(Math.max(0,...all)/10)*10;
  const xx=v=>X+v*W,yy=v=>Y+H-(v-lo)/(hi-lo)*H;
  b+=text(X,Y-27,j===0?'σtt ตามแนวโค้ง (kPa)':'σrr ตามแนวรัศมี (kPa)',26,ink,700);
  for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;b+=line(X,yy(v),X+W,yy(v))+text(X-67,yy(v)+7,v.toFixed(1),19,muted);}
  for(const v of [0,.25,.5,.75,1])b+=text(xx(v)-14,Y+H+32,v.toFixed(2),19,muted);
  b+=text(X+185,Y+H+65,'f = ระยะจากผิวใน / t',21,muted);
  for(const [i,p] of profiles.entries()){
    b+=`<polyline points="${p.points.map(s=>[xx(s.fraction),yy(s.mean_kPa[k])].join(',')).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="3"/>`;
    for(const s of p.points)b+=`<circle cx="${xx(s.fraction)}" cy="${yy(s.mean_kPa[k])}" r="4" fill="${colors[i]}"/>`;
  }
  b+=`<polyline points="${profiles[0].points.map(s=>[xx(s.fraction),yy(s.exact_kPa[k])].join(',')).join(' ')}" fill="none" stroke="${orange}" stroke-width="2" stroke-dasharray="8 5"/>`;
}
['H8-CHORD','H20-CHORD','H20-CURVED','EXACT'].forEach((s,i)=>b+=line(170+i*395,711,215+i*395,711,[...colors,orange][i],3)+text(230+i*395,718,s,23));
b+=text(65,786,'เกณฑ์ครบที่ G3 / H20-CURVED / ν=.20 — ไม่ใช่การเลือกความหนาผลิต',26,ink,700);
const xs=[75,300,635,1020,1410];['t (mm)','Energy error','Max point error*','One-sided spread*','ผลcoupon'].forEach((s,i)=>b+=text(xs[i],837,s,23,muted));
r.runs.filter(s=>s.model==='H20-CURVED'&&s.nu===.2&&s.mesh==='G3').forEach((s,i)=>{[String(s.t_m*1000),pct(s.energy_error_relative),pct(Math.max(...s.fixed_max_point_relative)),pct(Math.max(...s.fixed_spread_relative)),s.accuracy_targets_met?'ครบเฉพาะที่ตรวจ':'ยังไม่ครบ'].forEach((v,j)=>b+=text(xs[j],890+i*57,v,24));});
b+=text(65,1070,'*ค่ามากสุดใน6องค์ประกอบ/45จุด; point/spread หาร max(|exact|,10kPa) ไม่ใช่ capacity ratio',23,muted);
b+=text(65,1114,'ค่าเฉลี่ยอาจหักล้าง shear จากด้านติดกันได้ จึงตรวจ spread และ Gauss RMS พร้อมกัน ไม่ดูเส้นกราฟอย่างเดียว',22,muted);
b+=text(65,1158,'20-node ผ่าน finest-group 7/7 (รวม chordและν=0); 8-node ยังไม่ครบ3/3 — ไม่แก้เกณฑ์ให้ผ่าน',23,orange);
b+=text(65,1210,'ขั้นต่อไป: TS-C bay revisionใหม่ / quadratic solid / gravity / ขอบข้างอิสระ / ตำแหน่งตรวจเดิม',24,ink,700);
const second=doc('TS-C / ความเค้นชิ้นโค้งเทียบ exact elasticity','แยกความถูกต้องของผลรวม กับความเค้นเฉพาะที่ และค่าที่ต่างกันข้ามรอยแบ่ง mesh',b);
const boards=[['TS-C-CURVED-FBD-S2G-R00','ชิ้นโค้ง: FBD เงื่อนไขขอบเขตและชนิด geometry',first],['TS-C-CURVED-QA-S2G-R00','ชิ้นโค้ง: profile ความเค้นและผลตรวจ G3',second]];
for(const [id,,svg] of boards){await writeFile(resolve(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,id+'.png'));}
const hashes={...r.dependency_hashes};for(const p of ['output/tsc-step2g-r00/curved_results.json','tools/tsc-study/render_curved.mjs'])hashes[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
await writeFile(resolve(out,'web_summary.json'),JSON.stringify({...r,dependency_hashes:hashes,drawings:boards.map(([id,title])=>({id,title,file:id+'.png'}))},null,2));console.log(boards.map(b=>b[0]).join('\n'));
