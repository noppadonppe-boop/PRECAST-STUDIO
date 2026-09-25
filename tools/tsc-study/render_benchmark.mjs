import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2f-r00');
const r=JSON.parse(await readFile(resolve(out,'benchmark_results.json'),'utf8'));
const sharp=createRequire(import.meta.url)(process.env.PM_SHARP_PATH||'sharp');
const ink='#19313d',muted='#536974',teal='#166a77',orange='#a64a1b',blue='#315fa2';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=23,c=ink,w=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" font-weight="${w}">${esc(s)}</text>`;
const line=(x,y,X,Y,c='#d7e0e5',w=1,arrow=false)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${arrow?'marker-end="url(#arr)"':''}/>`;
const rect=(x,y,w,h,fill='#f0f5f7')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>`;
const f=(n,d=3)=>Math.abs(n)<1e-7?'≈0':n.toFixed(d);
const pct=n=>(Math.abs(n*100)<.001&&Math.abs(n*100)>=1e-7?(n*100).toExponential(2):f(n*100,3))+'%';
const doc=(title,sub,body,H=1360)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${H}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><rect width="1800" height="${H}" fill="white"/><g font-family="Tahoma,Segoe UI,sans-serif"><rect width="1800" height="12" fill="${teal}"/>${text(60,68,title,34,ink,700)}${text(60,113,sub,23,muted)}${line(60,145,1740,145)}${body}${line(60,H-95,1740,H-95)}${text(60,H-56,'S2F-R00 / STRAIGHT COUPON BENCHMARK / NOT FOR DESIGN OR CONSTRUCTION',24,orange,700)}${text(60,H-23,'ยังไม่รับรอง curved TS-C bay • ไม่เลือกความหนา เหล็ก จุดต่อ หรือปล่อยผลิต',22,muted)}</g></svg>`;
let a=text(65,198,'ชิ้นตรง L=1.50 ม. / b=0.25 ม. / t=0.175 ม. / E=28,321.787 MPa / ν=0.20',26,ink,700);
a+=text(65,245,'Uy=0 ทุก node; ที่ x=0 ใส่ ux/uz ตาม exact solution รวม warping — ไม่ใช่ฐานยึดแน่นแบบแข็ง',24,orange);
a+=text(65,287,'ไม่มี self-weight • ผิวบน–ล่างอิสระ • รูปขยายความหนาเพื่ออ่านแรง ไม่ใช่สัดส่วนงานผลิต',22,muted);
for(const [i,c] of ['M','V'].entries()){
  const Y=375+i*370;
  a+=text(65,Y,c==='M'?'01 / ดัดล้วน M=1 kNm':'02 / ดัด + เฉือน V=1 kN',28,ink,700);
  a+=rect(230,Y+50,720,92)+line(230,Y+50,230,Y+142,blue,5)+line(250,Y+96,1040,Y+96,muted,1,true);
  a+=text(1048,Y+105,'+x',22,muted)+line(585,Y+66,585,Y+5,muted,2,true)+text(598,Y+12,'+z',22,muted);
  a+=line(224,Y+64,184,Y+64,blue,3,true)+line(184,Y+130,224,Y+130,blue,3,true);
  a+=text(225,Y+190,'x=0',22,muted)+text(850,Y+190,'x=L=1.50m',22,muted);
  if(c==='M'){
    a+=line(950,Y+63,1020,Y+63,teal,3,true)+line(1020,Y+130,950,Y+130,teal,3,true);
    a+=text(1090,Y+70,'ปลาย: +My = 1 kNm',25,teal,700)+text(1090,Y+113,'Fx=Fz=0; σxx=M z/I',24);
    a+=text(70,Y+240,'Reaction รอบฐานกลางหน้าตัด: My = −1 kNm; แรงรวม = 0',23,blue);
    a+=text(1090,Y+170,'σzz=τxz=0 (exact)',24)+text(1090,Y+216,'σyy=νσxx; Uy=0',24);
  }else{
    a+=line(974,Y+42,974,Y+155,teal,3,true)+line(160,Y+155,160,Y+42,blue,3,true);
    a+=text(1090,Y+70,'ปลาย: Fz = −1 kN',25,teal,700)+text(1090,Y+113,'τxz = V(z²−c²)/(2I)',24);
    a+=text(70,Y+240,'Reaction รอบฐานกลางหน้าตัด: Rz=+1 kN, My=−1.50 kNm',23,blue);
    a+=text(1090,Y+170,'σxx=V(L−x)z/I',24)+text(1090,Y+216,'τxz=0 ที่ผิว z=±c',24);
  }
}
a+=line(65,1050,1735,1050)+text(65,1100,'ตรวจ ΣF=0, ΣM=0 พร้อม compatibility / constitutive law และ work–energy',26,ink,700);
a+=text(65,1150,'FBD ใช้ resultant แทน traction; ใน FEM integrate traction ด้วย shape functions ไม่ใช่แบ่งแรงให้ node เท่ากัน',23,muted);
a+=text(65,1197,'กรณี exact มีสนามไม่เปลี่ยนตาม y; การผ่าน coupon นี้ยังไม่ตรวจมุมโค้ง รอยต่อ ช่องเปิด หรือขอบข้างอิสระ',23,orange);
const first=doc('TS-C / ทดสอบ element ด้วยคำตอบ elasticity ที่ทราบ','FBD + เงื่อนไขขอบเขตที่ตรวจย้อนกลับได้ • กรณีศึกษาแยกจากโมดูลจริง',a);
let b=text(65,198,'24 benchmark runs + 4 load-mapping runs / 8-node เทียบ 20-node / Q1–Q6',26,ink,700);
b+=text(65,244,'ตารางนี้เป็นกรณี V / consistent traction / error เทียบ exact field ไม่ใช่กำลังรับแรง',24,muted);
const xs=[70,240,400,710,1030,1370];['Mesh nx×nz','Δx/Δz','8-node: uz','20-node: uz','8-node: τxz RMS','20-node: τxz RMS'].forEach((s,i)=>b+=text(xs[i],307,s,22,muted));
for(const [i,m] of r.basis.meshes.entries()){
  const rows=r.runs.filter(v=>v.case==='V'&&v.mesh===m.id&&v.mapping==='consistent'),[s,q]=rows;
  const vals=[`${m.id}  ${m.nx}×${m.nz}`,f(s.aspect_x_over_z,2),pct(s.tip_error_relative),pct(q.tip_error_relative),pct(s.stress_rms_relative[5]),pct(q.stress_rms_relative[5])];
  if(i%2===0)b+=rect(60,330+i*68,1680,62);
  vals.forEach((v,k)=>b+=text(xs[k],370+i*68,v,24,k>3?orange:ink));
}
b+=text(65,800,'Q6: การโก่งตัว 8-node คลาดเคลื่อน ≈1.35% แต่ความเค้นเฉือนยังคลาดเคลื่อนมาก',27,orange,700);
b+=text(65,848,'20-node Q6: τxz RMS error ≈0.77%; ผ่านเป้าหมายครบเฉพาะ coupon นี้ ไม่รับรอง full bay',24,teal,700);
const c=r.mapping_comparisons.find(c=>c.formulation==='20NodeBrick'&&c.mesh==='Q6');
b+=line(65,885,1735,885)+text(65,934,'แรงรวมเท่ากัน ≠ การกระจายแรงเท่ากัน',28,ink,700);
b+=text(65,980,`20-node Q6: แบ่งแรงเท่ากันทุก end node → tip เปลี่ยน ${pct(c.tip_difference_relative)}`,24);
b+=text(65,1026,`แต่ τxz ใกล้ปลายต่าง RMS ${f(c.regions[0].rms_difference_kPa[5])} kPa; กลางช่วงต่าง ${f(c.regions[1].rms_difference_kPa[5],6)} kPa`,24);
b+=text(65,1072,'นี่เป็น load sensitivity คนละ boundary condition ไม่ให้คะแนน exact error; ny convergence ยังไม่ตรวจ',22,muted);
b+=text(65,1130,'เกณฑ์: |error uz|/|exact|≤2%, energy≤2%, RMS stressทั้ง6≤5% / ไม่ใช่เกณฑ์ วสท.',23,muted);
b+=text(65,1174,'RMS ที่ Gauss points ถ่วงด้วยปริมาตร; ตัวหาร max(RMS exact,10kPa) / ไม่ใช่ peak หรือ capacity ratio',22,muted);
b+=text(65,1218,'ขั้นต่อไป: ทดสอบ quadratic solid ที่มุมโค้งก่อนนำไปทำ TS-C bay revision ใหม่',24,orange,700);
const second=doc('TS-C / ผลเปรียบเทียบ element และการใส่โหลด','ค่าการโก่งตัวใกล้คำตอบอ้างอิง ไม่ได้รับประกันความถูกต้องของความเค้นเฉพาะที่',b,1370);
const boards=[['TS-C-BENCHMARK-FBD-S2F-R00','FBD และคำตอบอ้างอิงของชิ้นตรง',first],['TS-C-BENCHMARK-QA-S2F-R00','ผลเทียบ 8-node / 20-node และการกระจายแรง',second]];
for(const [id,,svg] of boards){await writeFile(resolve(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,id+'.png'));}
const hashes={...r.dependency_hashes};for(const p of ['output/tsc-step2f-r00/benchmark_results.json','tools/tsc-study/render_benchmark.mjs'])hashes[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
await writeFile(resolve(out,'web_summary.json'),JSON.stringify({...r,dependency_hashes:hashes,drawings:boards.map(([id,title])=>({id,title,file:id+'.png'}))},null,2));
console.log(boards.map(v=>v[0]).join('\n'));
