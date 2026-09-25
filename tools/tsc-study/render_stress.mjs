import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2e-r00');
const r=JSON.parse(await readFile(resolve(out,'stress_results.json'),'utf8'));
const sharp=createRequire(import.meta.url)(process.env.PM_SHARP_PATH||'sharp');
const colors=['#8799a1','#315fa2','#166a77'],ink='#19313d',muted='#526872',orange='#a94e19';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=22,c=ink,w=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" font-weight="${w}">${esc(s)}</text>`;
const line=(x,y,X,Y,c='#d7e0e5',w=1)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}"/>`;
const f=(n,d=2)=>(Math.abs(n)<.5*10**-d?0:n).toFixed(d),pct=n=>f(n*100,1)+'%';
const doc=(title,sub,b,H=1300)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${H}"><rect width="1800" height="${H}" fill="white"/><g font-family="Tahoma,Segoe UI,sans-serif"><rect width="1800" height="12" fill="#166a77"/>${text(60,68,title,34,ink,700)}${text(60,113,sub,23,muted)}${line(60,145,1740,145)}${b}${line(60,H-95,1740,H-95)}${text(60,H-56,'S2E-R00 / LOCAL STRESS DIAGNOSTIC / NOT FOR DESIGN OR CONSTRUCTION',24,orange,700)}${text(60,H-23,'ค่าศึกษาคอนกรีตเชิงเส้นไม่ร้าว • ไม่ใช่ capacity check / ไม่เลือกความหนา เหล็ก หรือจุดต่อผลิต',21,muted)}</g></svg>`;
const profiles=r.runs.filter(s=>s.pattern==='FULL').map(s=>({mesh:s.mesh,points:s.samples.filter(p=>p.hand==='LH'&&p.station==='C45'&&p.y_m===.75)}));
let a=text(65,198,'NC320 / t175 มม. / F-R limit / SW + roof LL เต็มหลังคา / tension เป็นบวก',25,ink,700);
a+=text(65,244,'เส้นเชื่อมเฉพาะจุดที่สุ่มตรวจ ไม่ใช่ผิว stress ต่อเนื่อง; ขีดแนวตั้ง = ช่วงค่าจากแต่ละ element ที่ติดจุดเดียวกันของ D3',22,muted);
for(const [j,k] of [0,2,4].entries()){
  const X=100+j*570,Y=315,W=465,H=370;
  const vals=profiles.flatMap(s=>s.points.flatMap(p=>[p.mean_kPa[k],p.min_kPa[k],p.max_kPa[k]]));
  const lo=Math.floor(Math.min(0,...vals)/20)*20,hi=Math.ceil(Math.max(0,...vals)/20)*20;
  const xx=v=>X+v*W,yy=v=>Y+H-(v-lo)/(hi-lo)*H;
  a+=text(X,Y-20,['σss ตามแนวหน้าตัด','σnn ตั้งฉากความหนา','τsn เฉือนตามหน้าตัด'][j],25,ink,700);
  for(let tick=0;tick<=4;tick++){const v=lo+(hi-lo)*tick/4;a+=line(X,yy(v),X+W,yy(v))+text(X-60,yy(v)+8,f(v,0),20,muted);}
  a+=line(X,yy(0),X+W,yy(0),'#8aa0aa',2);
  for(const x of [0,.25,.5,.75,1])a+=text(xx(x)-10,Y+H+36,f(x,2),19,muted);
  a+=text(X,Y+H+75,'f = ระยะจากผิวใน / t  (จุดตรวจ 0.10–0.90)',20,muted);
  for(const [i,s] of profiles.entries()){
    a+=`<polyline fill="none" stroke="${colors[i]}" stroke-width="3" points="${s.points.map(p=>[xx(p.fraction),yy(p.mean_kPa[k])].join(',')).join(' ')}"/>`;
    for(const p of s.points){
      if(i===2){a+=line(xx(p.fraction),yy(p.min_kPa[k]),xx(p.fraction),yy(p.max_kPa[k]),colors[i],2);for(const v of [p.min_kPa[k],p.max_kPa[k]])a+=line(xx(p.fraction)-7,yy(v),xx(p.fraction)+7,yy(v),colors[i],2);}
      a+=`<circle cx="${xx(p.fraction)}" cy="${yy(p.mean_kPa[k])}" r="4" fill="${colors[i]}"/>`;
    }
  }
  a+=text(X+10,Y+22,'kPa',21,muted);
}
profiles.forEach((p,i)=>a+=line(540+i*230,820,590+i*230,820,colors[i],4)+text(605+i*230,828,p.mesh,23,colors[i],700));
a+=text(70,892,'ตัวอย่าง D3 — ค่าเฉลี่ย ณ จุด ไม่ใช่แรงที่นำไปออกแบบเหล็กได้',26,ink,700);
const tx=[85,300,630,960,1260];['f','σss (kPa)','σnn (kPa)','τsn (kPa)','ช่วง τsn ของ D3'].forEach((s,i)=>a+=text(tx[i],939,s,22,muted));
profiles[2].points.forEach((p,i)=>[f(p.fraction,2),f(p.mean_kPa[0]),f(p.mean_kPa[2]),f(p.mean_kPa[4]),`${f(p.min_kPa[4])} ถึง ${f(p.max_kPa[4])}`].forEach((s,j)=>a+=text(tx[j],986+i*42,s,23)));
a+=text(75,1195,'ช่วงค่าจากด้านติดกันคือรอยแบ่ง mesh ภายในเนื้อคอนกรีต ไม่ใช่รอยต่อระหว่างชิ้น precast',21,muted);
a+=text(75,1235,'ไม่มีการ extrapolate ถึงผิวคอนกรีต: จุดแรกและสุดท้ายอยู่ลึกจากผิว 17.5 มม. • ยังไม่รวมรอยต่อจริง/ร้าว/ลม/ยกประกอบ',22,orange);
const profileBoard=doc('TS-C / ความเค้นผ่านความหนา ณ พิกัดเดียวกัน','ตัวอย่างคงที่ FULL / ซีก LH / มุม C45 / Y=0.75 ม. • เทียบ D1–D3 และแสดงค่าต่างระหว่าง element',a,1370);

const groupNames={regular_interior:'ภายใน',side_edge:'ใกล้ขอบ Y',base_probe:'เหนือฐาน 50 มม.',crown_probe:'ห่าง crown 50 มม.'};
let b=text(65,197,'490 จุด / กรณี × 6 ชุดผลเดิม = 2,940 จุด; ไม่มีการรัน FEM ใหม่',27,ink,700);
b+=text(65,243,'ตรวจทั้ง LH/RH × 7 สถานี × 7 ตำแหน่ง Y × 5 ระดับความหนา; ฐาน/แนว crown/ขอบ Y แยกจากกลุ่มภายใน',23,muted);
b+=text(65,294,'เกณฑ์ diagnostic 5% ต่อองค์ประกอบทั้ง6ตัว: point change + RMS + ช่วงค่าด้านติดกัน ไม่ใช่เกณฑ์ วสท.',23,orange);
const xs=[70,210,590,850,1130,1440];['LL','บริเวณ','Δ จุดสูงสุด','Δ จริง (kPa)','RMS สูงสุด','ช่วงด้านติดกัน'].forEach((s,i)=>b+=text(xs[i],362,s,23,muted));
let row=0;
for(const c of r.comparisons)for(const g of c.groups){
  const worst=g.fields.reduce((a,b)=>a.max_point_change>b.max_point_change?a:b),maxRms=Math.max(...g.fields.map(f=>f.rms_change)),spread=Math.max(...g.fields.map(f=>f.max_spread_relative));
  const vals=[c.pattern,groupNames[g.group],`${worst.component} ${pct(worst.max_point_change)}`,f(worst.difference_kPa),pct(maxRms),pct(spread)];
  vals.forEach((s,i)=>b+=text(xs[i],425+row*69,s,24));b+=line(70,445+row*69,1730,445+row*69);row++;
}
b+=text(70,1030,'ยังไม่มีกลุ่มใดใน8กลุ่มที่เข้าเกณฑ์ครบ6องค์ประกอบ — ไม่แก้เกณฑ์เดิมเพื่อให้ผ่าน',27,orange,700);
b+=text(70,1085,'เปอร์เซ็นต์ใช้ max(|ค่าละเอียด|,10 kPa) เป็นตัวหาร; ค่าที่ใกล้ศูนย์อาจมีเปอร์เซ็นต์สูง ต้องอ่าน Δ จริงร่วมด้วย',23,muted);
b+=text(70,1131,'คำนวณจาก displacement gradient + elastic law; ตรวจย้อนกับ Gauss stress เดิมทุกจุดแล้วตรงกัน',23);
b+=text(70,1177,'แรงรวมลู่เข้า ≠ ความเค้นเฉพาะที่ลู่เข้า • ยังไม่ใช่ข้อสรุปว่ากำลังของชิ้นส่วนผ่านหรือไม่ผ่าน',23,orange);
const qaBoard=doc('TS-C / ความไวของความเค้นต่อ mesh และรอยแบ่ง element','D2 → D3 / t175 มม. / F-R limit • คงค่าแรงรวม Step 2D และเกณฑ์เดิม Step 2B ไว้ ไม่ยกระดับสถานะออกแบบ',b,1330);
const boards=[['TS-C-STRESS-PROFILE-S2E-R00','ความเค้นผ่านความหนาและช่วงค่าด้านติดกัน',profileBoard],['TS-C-STRESS-QA-S2E-R00','ความไวต่อ mesh แยกบริเวณภายในและขอบ',qaBoard]];
for(const [id,,svg] of boards){await writeFile(resolve(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,id+'.png'));}
const hashes={...r.dependency_hashes};for(const p of ['output/tsc-step2e-r00/stress_results.json','tools/tsc-study/render_stress.mjs'])hashes[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
const summary={id:r.id,revision:r.revision,status:r.status,basis:r.basis,dependency_hashes:hashes,raw_source_hashes:r.raw_source_hashes,comparisons:r.comparisons,
  runs:r.runs.map(s=>({id:s.id,mesh:s.mesh,pattern:s.pattern,sample_count:s.sample_count,gauss_points_checked:s.gauss_points_checked,gauss_reproduction_max_error_kPa:s.gauss_reproduction_max_error_kPa,profile:s.samples.filter(p=>p.hand==='LH'&&p.station==='C45'&&p.y_m===.75).map(({sides,...p})=>p)})),
  engineering_approval:false,manufacturing_release:false,whole_model_local_stress_convergence:r.whole_model_local_stress_convergence,
  drawings:boards.map(([id,title])=>({id,title,file:id+'.png'}))};
await writeFile(resolve(out,'web_summary.json'),JSON.stringify(summary,null,2));console.log(boards.map(b=>b[0]).join('\n'));
