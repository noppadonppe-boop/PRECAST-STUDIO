import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2c-r00');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const r=await read(resolve(out,'diagnostic_results.json'));
const sharp=createRequire(import.meta.url)(process.env.PM_SHARP_PATH||'sharp');
const C={ink:'#19313d',muted:'#526872',teal:'#166a77',orange:'#ac5119',blue:'#315fa2',gray:'#d7e0e5'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=22,color=C.ink,weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
const line=(x,y,X,Y,c=C.gray,w=1,dash='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" stroke-dasharray="${dash}"/>`;
const poly=(pts,fill='none',stroke=C.teal,w=1)=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const f=(n,d=2)=>Number(n).toFixed(d),pct=n=>`${f(n*100)}%`;
const doc=(title,sub,body,H=1280)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${H}"><rect width="1800" height="${H}" fill="white"/><g font-family="Tahoma,Segoe UI,sans-serif"><rect width="1800" height="12" fill="${C.teal}"/>${text(60,66,title,34,C.ink,700)}${text(60,111,sub,22,C.muted)}${line(60,140,1740,140)}${body}${line(60,H-95,1740,H-95)}${text(60,H-56,'S2C-R00 / DIAGNOSTIC ONLY / NOT FOR DESIGN OR CONSTRUCTION',24,C.orange,700)}${text(60,H-23,'ยังไม่เลือกความหนา เหล็ก หรือจุดต่อ • ไม่ใช่การตรวจ solid ของ bay ทั้งชิ้น • ไม่มีการอนุมัติผลิต',21,C.muted)}</g></svg>`;
const base=r.coupon_comparisons.filter(c=>c.nu===.2);
const sample=await read(resolve(out,'SOLID-T175-NU20-C1.json'));
const project=([x,y,z])=>[130+820*x+120*y,645-760*z-70*y];
let a=text(60,190,'01 / ชิ้นทดสอบมุมโค้ง 90°',27,C.ink,700);
for(const e of sample.elements){const [i,k,j]=e.indices;const faces=[];if(j===0)faces.push([0,1,2,3]);if(k===3)faces.push([3,2,6,7]);if(i===15)faces.push([1,2,6,5]);for(const face of faces)a+=poly(face.map(n=>project(sample.nodes[e.nodes[n]])),'#e2eff0',C.teal,.65);}
a+=text(70,704,'รูปแสดง t=175 มม. / mesh C1',21,C.muted)+text(70,745,'R ภายนอก 0.40 ม. / กว้างตาม Y 1.50 ม.',22);
a+=text(70,786,'Uy=0 ทุกจุด → plane strain ตามแนว Y',22,C.orange);
a+=text(70,827,'ปลาย θ=0: Uz=0; datum Ux เพียงหนึ่งจุด',21)+text(70,868,'ปลาย θ=90°: โมเมนต์ทดสอบ 1 kN·m/m',22);
a+=text(70,909,'ไม่มี self-weight / LL / รอยต่อจริงในชิ้นทดสอบ',21,C.orange);
a+=text(800,190,'02 / ความเค้นตามความหนา · t=175 มม.',27,C.ink,700);
const profile=base[1].exact_stress_profile;
const x0=900,y0=645,W=750,H=370,xmin=-260,xmax=210;
const chart=(sig,rad)=>[x0+(sig-xmin)/(xmax-xmin)*W,y0-(rad-.225)/.175*H];
for(const tick of [-250,-125,0,125,200]){const x=chart(tick,.225)[0];a+=line(x,y0-H,x,y0,C.gray)+text(x-25,y0+34,tick,20,C.muted);}
for(const rad of [.225,.27,.31,.355,.4]){const y=chart(0,rad)[1];a+=line(x0,y,x0+W,y,C.gray)+text(x0-75,y+7,f(rad,3),20,C.muted);}
a+=text(803,245,'r (m)',20,C.muted)+text(1430,715,'σθθ (kPa)',22,C.muted);
const path=(key,color,dash='')=>`<polyline points="${profile.map(p=>chart(p[key],p.radius_m).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/>`;
a+=path('tt_kPa',C.teal)+path('linear_tt_kPa',C.orange,'9 6');
const fine=r.coupon_runs.find(v=>v.id==='SOLID-T175-NU20-C3');
for(const p of fine.stress_samples.filter((_,i)=>i%4===0)){const [x,y]=chart(p.stress_rr_tt_yy_rt_kPa[1],p.radius_m);a+=`<circle cx="${x}" cy="${y}" r="3" fill="${C.blue}"/>`;}
a+=text(840,760,'เส้นทึบ: elasticity solution / จุด: solid C3 Gauss',21,C.teal);
a+=text(840,800,'เส้นประ: สูตรหน้าตัดตรง 12M(r−Rm)/t³',21,C.orange);
a+=text(840,840,'ทฤษฎีมี σrr ภายในความหนา; ผิว r=ri,ro เป็นอิสระ',21);
a+=text(840,884,'ความเค้นนี้เกิดจากโมเมนต์ทดสอบ ไม่ใช่แรงออกแบบอาคาร',21,C.orange);
a+=text(70,977,'03 / ผลเทียบ · ν=0.20 · C3 (solid 2,048 / shell 128 elements)',26,C.ink,700);
const xs=[85,355,730,1070,1435];['t (mm)','solid vs exact: energy','shell vs solid: energy','ผิวใน / 6M/t²','ผิวนอก / 6M/t²'].forEach((s,i)=>a+=text(xs[i],1031,s,21,C.muted));
base.forEach((c,i)=>[f(c.t_m*1000,0),pct(c.solid_exact_energy_error),pct(c.shell_vs_solid_energy_difference),f(c.inner_stress_to_straight_nominal,3),f(c.outer_stress_to_straight_nominal,3)].forEach((s,k)=>a+=text(xs[k],1078+i*45,s,24)));
a+=text(70,1246,'ความแข็งใกล้กันไม่ได้แปลว่าความเค้นกระจายเหมือนกัน; ตัวคูณข้างต้นห้ามนำไปคูณแรง Step 2B เพื่อออกแบบ',22,C.orange,700);
const coupon=doc('TS-C / Solid–shell curved coupon','3D brick ภายใต้ข้อบังคับ plane strain • exact elasticity benchmark • ไม่ใช่แบบจำลองโมดูลทั้งชิ้น',a,1380);

let b=text(60,189,'01 / จุดตรวจเดิมบนหน้าตัดและช่วง Y เดิมทุก mesh',27,C.ink,700);
const X=x=>95+x*220,Z=z=>865-z*180;
const pts=[];pts.push([X(.0875),Z(.175)],[X(.0875),Z(2.6)]);
for(let i=0;i<=32;i++){const theta=Math.PI-i*Math.PI/64;pts.push([X(.4+.3125*Math.cos(theta)),Z(2.6+.3125*Math.sin(theta))]);}pts.push([X(1.5),Z(2.9125)]);
b+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${C.teal}" stroke-width="5"/>`;
const stations=[[.0875,1.5,'W: Z=1.50'],...[22.5,45,67.5].map(d=>[.4+.3125*Math.cos(Math.PI-d*Math.PI/180),2.6+.3125*Math.sin(Math.PI-d*Math.PI/180),`C: ${d}°`]),[.8,2.9125,'R: X=0.80']];
stations.reverse().forEach(([x,z,label],i)=>{b+=`<circle cx="${X(x)}" cy="${Z(z)}" r="7" fill="${C.orange}"/>`;const yy=415+i*63;b+=line(X(x),Z(z),465,yy-6,C.gray)+text(475,yy,label,20);});
b+=text(80,907,'Y จุดตรวจ = 0.375 / 0.750 / 1.125 ม.',21);
b+=text(80,944,'อินทิเกรตแต่ละองค์ประกอบ Y=0.30–1.20 ม.',21);
b+=text(760,189,'02 / การเปลี่ยนค่า M3 → M4 · 175 มม. / FULL',27,C.ink,700);
const cols=[780,940,1160,1400,1590];['ผล','P-H จุด','F-R จุด','P-H รวม','F-R รวม'].forEach((s,i)=>b+=text(cols[i],246,s,22,C.muted));
Object.keys(r.fixed_stations.comparisons[0].max_point_changes).forEach((key,i)=>{const p=r.fixed_stations.comparisons[0],q=r.fixed_stations.comparisons[1];b+=text(cols[0],301+i*51,key,24,C.ink,700);[p.max_point_changes[key],q.max_point_changes[key],p.max_integral_changes[key],q.max_integral_changes[key]].forEach((v,j)=>b+=text(cols[j+1],301+i*51,pct(v),24,v>.05?C.orange:C.ink));});
b+=text(780,755,'เป้าหมาย diagnostic ≤5%; floor normalization =0.1',21,C.muted);
b+=text(780,799,'ยังไม่ครบเกณฑ์ทั้งสองกรณี; ไม่เปลี่ยนเกณฑ์ peak เดิม',23,C.orange,700);
b+=text(780,845,'Qy ที่จุดตรวจเหล่านี้นิ่งขึ้น แต่ Nyy/Myy ยังเปลี่ยน',21);
b+=text(780,886,'ผลรวม Nsy/Msy/Qy ใกล้ศูนย์จากสมมาตร',21,C.muted);
b+=text(780,923,'การหักล้างนี้ไม่ได้รับรองว่าแรงเฉพาะที่ผ่าน',21,C.orange);
b+=text(70,1010,'03 / วิธีอ่านและข้อจำกัด',27,C.ink,700);
const notes=['ฟื้นค่าจาก 4 Gauss points ภายใน element; บนรอยแบ่งใช้ค่าเฉลี่ยสองด้าน ไม่ทำ smoothing ข้ามแผง',
'กำหนดตำแหน่งด้วยพารามิเตอร์หน้าตัดจริง; ผิวแบนย่อยและ local axes ยังเปลี่ยนเมื่อ mesh ละเอียดขึ้น',
'ค่าจุด = ค่าสูงสุดของการเปลี่ยนที่ 5×3 จุด; ค่ารวม = สูงสุดที่ 5 สถานี ไม่ใช่แรงรวม global หรือแรงต่อ bolt',
'ยังต้องแยกผลของ facet/การฟื้นค่า และตรวจ full-bay solid/free-edge ก่อนเลือกความหนาหรือรอยต่อ'];
notes.forEach((s,i)=>b+=text(80,1060+i*41,s,22,i===3?C.orange:C.ink));
const fixed=doc('TS-C / ตรวจแรงที่ตำแหน่งเดิม','อ่านผล Step 2B เดิม 6 runs • ไม่รันซ้ำหรือแก้ผลย้อนหลัง • คง QA INCOMPLETE ของชุดเดิม',b,1330);
const boards=[['TS-C-COUPON-S2C-R00','มุมโค้ง solid–shell และความเค้นตามความหนา',coupon],['TS-C-STATIONS-S2C-R00','การตรวจแรงที่ตำแหน่งเดิมและสถานะ convergence',fixed]];
for(const [id,,svg] of boards){await writeFile(resolve(out,`${id}.svg`),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,`${id}.png`));}
const hashes={...r.dependency_hashes};
for(const p of ['output/tsc-step2c-r00/diagnostic_results.json','tools/tsc-study/render_diagnostics.mjs'])hashes[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
const summary={id:r.id,revision:r.revision,status:r.status,dependency_hashes:hashes,raw_source_hashes:r.raw_source_hashes,run_count:r.coupon_runs.length,
  basis:r.basis,brick_patch:r.brick_patch,fixed_stations:r.fixed_stations,coupon_comparisons:r.coupon_comparisons.map(({exact_stress_profile,...c})=>c),
  max_equilibrium_relative:Math.max(...r.coupon_runs.map(c=>c.global_equilibrium_relative)),full_bay_solid_validation:r.full_bay_solid_validation,
  drawings:boards.map(([id,title])=>({id,title,file:`${id}.png`})),engineering_approval:false,manufacturing_release:false};
await writeFile(resolve(out,'web_summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({boards:boards.map(([id])=>id),coupon_runs:r.coupon_runs.length}));
