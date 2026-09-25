import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2h-r00');
const r=JSON.parse(await readFile(resolve(out,'quadratic_bay_followup.json'),'utf8'));
const sharp=createRequire(import.meta.url)(process.env.PM_SHARP_PATH||'sharp');
const ink='#19313d',muted='#536974',teal='#166a77',orange='#a64a1b',blue='#315fa2';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const txt=(x,y,s,size=23,c=ink,w=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" font-weight="${w}">${esc(s)}</text>`;
const line=(x,y,X,Y,c='#d7e0e5',w=1,arr=false)=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${arr?'marker-end="url(#arr)"':''}/>`;
const f=(v,d=3)=>Math.abs(v)<1e-7?'≈0':v.toFixed(d),pct=v=>f(v*100)+'%';
const doc=(title,sub,body,H=1490)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${H}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><rect width="1800" height="${H}" fill="white"/><g font-family="Tahoma,Segoe UI,sans-serif"><rect width="1800" height="12" fill="${teal}"/>${txt(60,68,title,34,ink,700)}${txt(60,113,sub,23,muted)}${line(60,145,1740,145)}${body}${line(60,H-95,1740,H-95)}${txt(60,H-55,'S2H-R00 / QUADRATIC BAY / NOT FOR DESIGN OR CONSTRUCTION',24,orange,700)}${txt(60,H-22,'เป็นผล linear-uncracked / F-R limit เท่านั้น ไม่รับรองรอยต่อจริง ความหนาผลิต หรือกำลังโครงสร้าง',22,muted)}</g></svg>`;
const full=r.runs.find(s=>s.pattern==='FULL'&&s.mesh==='H4'),R=.4,t=.175,LL=r.basis.roof_LL_kgf_m2*r.basis.gravity_m_s2/1000*3*1.5;
const xy=(x,z)=>[140+210*x,970-210*z];
function half(rad){const v=[[R-rad,t],[R-rad,2.6]];for(let i=1;i<=32;i++){const a=Math.PI*i/64;v.push([R-rad*Math.cos(a),2.6+rad*Math.sin(a)]);}v.push([1.5,2.6+rad]);return v;}
const whole=rad=>{const a=half(rad);return [...a,...a.slice(0,-1).reverse().map(([x,z])=>[3-x,z])];};
const polygon=[...whole(R),...whole(R-t).reverse()].map(p=>xy(...p).join(',')).join(' ');
let a=txt(65,205,'FULL / H4 / t175 / กว้าง 3.00 × สูง 3.00 ม. รวมพื้น / bay 1.50 ม.',27,ink,700);
a+=txt(65,251,'SW สองซีก + Roof LL เต็มพื้นที่ฉายแนวราบ; ไม่มีตัวประกอบโหลด',23,muted);
a+=`<polygon points="${polygon}" fill="#e5eff2" stroke="${teal}" stroke-width="3"/>`;
a+=line(...xy(1.5,2.825),...xy(1.5,3),orange,3)+txt(460,402,'crown ต่อเนื่อง',21,orange);
for(const x of [.15,.6,1.05,1.5,1.95,2.4,2.85])a+=line(...xy(x,3.27),...xy(x,3.02),teal,2,true);
a+=txt(180,290,'qLL = 0.49033 kN/m² ↓',23,teal,700);
for(const [x,z] of [[.0875,1.4],[2.9125,1.4],[.95,2.9125],[2.05,2.9125]])a+=line(...xy(x,z+.2),...xy(x,z-.16),orange,2,true);
a+=txt(250,568,`น้ำหนักตัว = ${f(-full.total_load_6[2]-LL)} kN`,24,orange);
a+=txt(250,615,`LL รวม = ${f(LL)} kN`,24,teal);
a+=txt(250,662,`แรงลงรวม = ${f(-full.total_load_6[2])} kN`,24,ink,700);
a+=txt(250,720,'พื้นแยก / ไม่ถ่ายแรงลงพื้น',23,muted);
a+=`<rect x="140" y="940" width="630" height="30" fill="none" stroke="${muted}" stroke-width="2" stroke-dasharray="8 6"/>`;
for(const [h,x] of [['LH',t/2],['RH',3-t/2]]){
  a+=line(...xy(x,-.13),...xy(x,t),blue,3,true);
  a+=line(...xy(x+(h==='LH'?-.35:.35),t),...xy(x,t),blue,3,true);
  const tx=h==='LH'?75:545,v=full.base[h];a+=txt(tx,1040,`${h}: Rz=${f(v[2])} kN`,23,blue,700)+txt(tx,1083,`Rx=${f(v[0])} kN`,23,blue)+txt(tx,1126,`My=${f(v[4])} kN·m`,23,blue);
}
a+=line(95,875,185,875,ink,2,true)+txt(194,884,'+X',22)+line(95,875,95,787,ink,2,true)+txt(68,775,'+Z',22);
a+=txt(940,310,'แรงผ่านแนวตัดของซีก LH',28,ink,700);
const xs=[940,1180,1360,1540];['แนวตัด','Fx (kN)','Fz (kN)','My (kN·m)'].forEach((s,i)=>a+=txt(xs[i],365,s,21,muted));
full.cuts.forEach((c,i)=>[c.id,f(c.cut_on_lower_LH_6[0]),f(c.cut_on_lower_LH_6[2]),f(c.cut_on_lower_LH_6[4])].forEach((s,j)=>a+=txt(xs[j],414+i*52,s,23)));
['แรงบนส่วนล่างของ LH; คู่แรงอีกด้านตรงข้าม','My อ้างอิงกึ่งกลางแนวตัดแต่ละตำแหน่ง','ไม่ใช่แรงต่อเมตรหรือแรงต่อ bolt','ΣF=0 / ΣM=0 ตรวจจากแรง 3D ครบ6องค์ประกอบ',`สมดุลรวม relative = ${full.equilibrium_relative.toExponential(2)}`,'Y ตามยาว bay 1.50 ม.; ขอบ Y ทั้งสองอิสระ'].forEach((s,i)=>a+=txt(940,780+i*47,s,22,i===2?orange:muted));
a+=txt(65,1210,'ฐาน: Ux=Uz=0 ทั้งหน้า; Uy=0 เพียง datum กึ่งกลางฐานแต่ละด้าน ไม่ใช่ plane strain',23,ink,700);
a+=txt(65,1259,'crown: shared nodes ทั้งความหนา → bonded limit; ไม่ได้ออกแบบอุปกรณ์ยึดหรือทดสอบรอยต่อ',23,muted);
a+=txt(65,1310,'รูปตัดตามสัดส่วน; พื้นเส้นประใช้บอกระดับเท่านั้น • น้ำหนักตัวใช้ consistent body load ไม่แบ่งแรงเท่ากันทุก node',22,muted);
const first=doc('TS-C / FBD ของ quadratic-solid เต็มโมดูล','กรณีศึกษาเดียวกับ Step 2D แต่ใช้ 20-node และการกระจายโหลดสอดคล้องกับ element',a);
const profiles=[];
for(const mesh of ['H1','H2','H3','H4']){const raw=JSON.parse(await readFile(resolve(out,`QSB-T175-FR-FULL-${mesh}.json`),'utf8'));profiles.push({mesh,points:raw.samples.filter(s=>s.hand==='LH'&&s.station==='C45'&&s.y_m===.75)});}
let b=txt(65,199,'FULL / t175 · ตัวอย่าง profile LH / C45° / Y=.75 ม.',26,ink,700);
b+=txt(65,244,'ค่าจาก displacement gradient ณ พิกัดจริง ไม่ extrapolate ถึงผิว; ไม่มีคำตอบ exact สำหรับโมดูลนี้',23,muted);
const colors=['#96a8b0','#5589a4',blue,teal];
for(const [j,k] of [0,2].entries()){
  const X=120+j*850,Y=322,W=680,H=285;const all=profiles.flatMap(p=>p.points.map(s=>s.mean_kPa[k]));const lo=Math.floor(Math.min(...all)/10)*10,hi=Math.ceil(Math.max(0,...all)/10)*10;
  const xx=v=>X+v*W,yy=v=>Y+H-(v-lo)/(hi-lo)*H;
  b+=txt(X,Y-25,j?'σnn ตามความหนา (kPa)':'σss ตามแนวโค้ง (kPa)',26,ink,700);
  for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;b+=line(X,yy(v),X+W,yy(v))+txt(X-67,yy(v)+7,v.toFixed(1),19,muted);}
  for(const v of [0,.25,.5,.75,1])b+=txt(xx(v)-12,Y+H+33,v.toFixed(2),19,muted);
  b+=txt(X+185,Y+H+68,'f = ระยะจากผิวใน / t',21,muted);
  for(const [i,p] of profiles.entries()){b+=`<polyline points="${p.points.map(s=>[xx(s.fraction),yy(s.mean_kPa[k])].join(',')).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="3"/>`;for(const s of p.points)b+=`<circle cx="${xx(s.fraction)}" cy="${yy(s.mean_kPa[k])}" r="4" fill="${colors[i]}"/>`;}
}
profiles.forEach((p,i)=>b+=line(220+i*360,705,265+i*360,705,colors[i],3)+txt(280+i*360,712,p.mesh,23));
b+=txt(65,783,'H3 → H4 / FULL: แรงรวมเริ่มนิ่ง แต่ความเค้นเฉพาะที่ยังไม่ครบเกณฑ์',27,ink,700);
const qa=r.global_comparisons.find(c=>c.pattern==='FULL');b+=txt(65,830,`Δ |u|max ${pct(qa.displacement_change)} / ฐาน ${pct(qa.reaction_change)} / แนวตัด ${pct(qa.cut_change)} / พลังงาน ${pct(qa.energy_change)}`,23,muted);
const groups=r.local_comparisons.find(c=>c.pattern==='FULL').groups,names=['ภายในทั่วไป','ขอบด้านข้าง','ใกล้ฐาน 50 มม.','ใกล้ crown 50 มม.'];
const tx=[75,425,780,1160,1490];['บริเวณ','Max point change','Max RMS change','Max spread','ผล6องค์ประกอบ'].forEach((s,i)=>b+=txt(tx[i],894,s,22,muted));
groups.forEach((g,i)=>[names[i],pct(Math.max(...g.fields.map(f=>f.max_point_change))),pct(Math.max(...g.fields.map(f=>f.rms_change))),pct(Math.max(...g.fields.map(f=>f.max_spread_relative))),g.all_six_targets_met?'ครบเฉพาะที่ตรวจ':'ยังไม่ครบ'].forEach((v,j)=>b+=txt(tx[j],946+i*54,v,23,j===4?orange:ink)));
b+=txt(65,1180,'เกณฑ์เดิม 5% ทั้ง point/RMS/spread; หารด้วยค่าอ้างอิงอย่างน้อย10kPa ไม่ใช่อัตราการใช้กำลังวัสดุ',23,muted);
const baseNN=groups.find(g=>g.group==='base_probe').fields.find(f=>f.component==='nn');
b+=txt(65,1228,`FULL ใกล้ฐาน: σnn เปลี่ยนสูงสุด ${f(baseNN.difference_kPa)} kPa (${pct(baseNN.max_point_change)} เมื่อเทียบฐานอ้างอิง10kPa)`,23,orange);
b+=txt(65,1276,'ยังต้องตรวจ mesh เฉพาะบริเวณและ support/edge sensitivity; ห้ามตีความการโก่งน้อยว่าโครงสร้างปลอดภัยแล้ว',22,orange);
b+=txt(65,1330,`รวม ${r.runs.length} runs / 490 พิกัดต่อชุด / local groups เข้าเกณฑ์ ${r.local_comparisons.flatMap(c=>c.groups).filter(g=>g.all_six_targets_met).length}/8 · เก็บผล H2→H3 เดิมไว้`,23,ink,700);
const second=doc('TS-C / ความเค้น 20-node และการตรวจความละเอียด','แสดงผลที่ยังไม่ผ่านร่วมกับผลที่ผ่าน ไม่สรุปจากกราฟเฉลี่ยหรือสมดุลแรงเพียงอย่างเดียว',b);
const boards=[['TS-C-QBAY-FBD-S2H-R00','โมดูล 20-node: FBD และแรงผ่านแนวตัด',first],['TS-C-QBAY-QA-S2H-R00','โมดูล 20-node: ความเค้นและผลตรวจ H3–H4',second]];
for(const [id,,svg] of boards){await writeFile(resolve(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,id+'.png'));}
const deps={...r.dependency_hashes};for(const p of ['output/tsc-step2h-r00/quadratic_bay_followup.json','tools/tsc-study/render_quadratic_bay.mjs'])deps[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
await writeFile(resolve(out,'web_summary.json'),JSON.stringify({...r,dependency_hashes:deps,drawings:boards.map(([id,title])=>({id,title,file:id+'.png'}))},null,2));
console.log(boards.map(b=>b[0]).join('\n'));
