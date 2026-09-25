import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dir,read,sha} from './connection-disposition-p92.mjs';
const require=createRequire(import.meta.url),sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const r=read(dir+'/register.json'),escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=(n,d=2)=>Number(n).toFixed(d),navy='#10284d',amber='#cf8813',grey='#6e7c8e';
const text=(x,y,s,size=19,color=navy)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${escape(s)}</text>`;
const line=(x,y,X,Y,c=grey,dash='')=>`<path d="M${x},${y} L${X},${Y}" fill="none" stroke="${c}" stroke-width="1.4" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const rect=(x,y,w,h,fill='#fff',stroke='#bac5d1')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}"/>`;
function plan(g,x,y){
 const scale=1.06,X=u=>x+(u+175)*scale,Y=v=>y+(100-v)*scale;
 let v=text(x,y-50,g.foot.slice(0,3)+' | FOOT PLAN (F1 shown)',21)+text(x,y-22,`350 x 200 x 30 | pitch ${g.geometry.normalPitchMm} x 140 mm`,18);
 v+=rect(x,y,350*scale,200*scale,'#e8edf3',navy);
 for(const b of g.bolts){v+=`<circle cx="${X(b.xyMm[0])}" cy="${Y(b.xyMm[1])}" r="${18.5*scale}" fill="#e9c475" stroke="${amber}"/><circle cx="${X(b.xyMm[0])}" cy="${Y(b.xyMm[1])}" r="${11*scale}" fill="#fff" stroke="${navy}"/>`;
  v+=text(X(b.xyMm[0])-12,Y(b.xyMm[1])+(b.xyMm[1]>0?45:-28),b.tag.slice(-2),16);
 }
 v+=text(x,y+240,'Silver: foot | Amber: washer OD37 | White: bore22',14)+text(x,y+264,'Local +u right / +v up. Canonical wall axes.',15);
 v+=line(x+130,y+294,x+210,y+294,navy)+text(x+216,y+300,'+u',16)+line(x+130,y+294,x+130,y+274,navy)+text(x+107,y+277,'+v',16);
 return v;
}
function section(x,y){
 // True nominal stack in mm, orthographic enlargement; not a helical thread rendering.
 const s=3.5,X=u=>x+120+u*s,Y=z=>y+190-z*s;
 let v=text(x,y-50,'SECTION | P89 NOMINAL STACK',21)+text(x,y-21,'One M20 x 2.5 x 60 screw; head envelope',17);
 v+=rect(X(-34),Y(30),68*s,30*s,'#dce3ec',navy)+rect(X(-34),Y(0),68*s,30*s,'#334c70',navy);
 v+=rect(X(-11),Y(30),22*s,30*s,'white','none')+rect(X(-10),Y(0),20*s,30*s,'#fff','none');
 v+=rect(X(-18.5),Y(33),37*s,3*s,'#e9c475',amber)+rect(X(-10),Y(33),20*s,60*s,'#b2bac6',navy)+rect(X(-15),Y(45.5),30*s,12.5*s,'#7d8b9d',navy);
 v+=line(X(0),Y(52),X(0),Y(-35),grey,'5 4');
 for(const [z,label]of [[45.5,'Head top +45.5'],[33,'Underhead +33'],[0,'Bed top 0'],[-27,'Tip -27'],[-30,'Bed underside -30']]){
  const yy=Y(z),dy=z===-27?-3:z===-30?19:0;v+=line(X(36),yy,X(47),yy+dy)+text(X(48),yy+dy+5,label,14);
 }
 v+=text(x,y+332,'Foot30 + washer3 + insertion27 = screw60',17)+text(x,y+358,'Bed30 - insertion27 = nominal tip recess3',17);
 v+=text(x,y+385,'Thread drawn as major-diameter envelope only.',15)+text(x,y+408,'Do not use OD20 as tap-drill diameter.',15);
 return v;
}
function board(key){
 const gs=r.groups.filter(g=>g.key===key&&g.studyKind==='BASELINE_24_GROUPS'),pilot=r.groups.filter(g=>g.key===key&&g.studyKind!=='BASELINE_24_GROUPS');assert.equal(gs.length,4);
 // Use one plan per owner only when F1/F2 genuinely share the local hole pattern.
 for(const owner of ['M01','M03']){
  const a=gs.find(g=>g.foot===owner+'-F1'),b=gs.find(g=>g.foot===owner+'-F2');
  a.bolts.forEach((v,i)=>v.xyMm.forEach((q,j)=>assert.ok(Math.abs(q-b.bolts[i].xyMm[j])<1e-5)));
 }
 let v=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1670" viewBox="0 0 1800 1670"><rect width="1800" height="1670" fill="white"/><g font-family="Arial, sans-serif">`;
 v+=text(40,57,`P92 | CONNECTION DETAIL - ${key}`,37)+text(40,94,'P90 demand + P85 shear | P89 candidate | STAGE 5 / 8 - NOT COMPLETE',22);
 v+=rect(35,117,1730,532,'#f7f9fc');v+=plan(gs.find(g=>g.foot==='M01-F1'),62,214)+plan(gs.find(g=>g.foot==='M03-F1'),520,214)+section(1025,214);
 v+=text(52,577,'Nominal geometry only. Source Typical / concrete geometry unchanged.',18);
 v+=text(52,609,'No S00, roof-foot or full-mould result reuse.',18);
 v+=text(40,688,'A | MATCHED BOLT DEMANDS - Leff50 BASELINE',24)+text(40,720,'T and V: nominal pressure only (kN). Ratio: max of tension / shear / interaction at pressure multiplier1.5.',18);
 const xs=[50,235,405,555,727,934,1190,1430];
 v+=rect(35,739,1730,39,navy,navy);
 ['Foot','Bolt','T [kN]','V [kN]','Ratio*','q avg [MPa]','Washer margin [mm]','Scope'].forEach((s,i)=>v+=text(xs[i],765,s,17,'#fff'));
 let y=804;
 for(const g of gs)for(const b of g.bolts){
  if((y-804)/31%2===0)v+=rect(35,y-23,1730,31,'#f2f5f9','none');
  [g.foot,b.tag.slice(-2),fmt(b.tensionN/1000,3),fmt(b.shearMagnitudeN/1000,3),fmt(b.componentCases[2].ratio,4),fmt(b.washer.pressureOnlyAverageMPa,2),fmt(b.washer.nominalWasherEdgeMarginMm,1),'Static component'].forEach((s,i)=>v+=text(xs[i],y,s,18));y+=31;
 }
 v+=text(40,1320,'* Trial bolt8.8 / As245 / gammaM2=1.25. Ratio below1 is NOT a complete-connection capacity check.',18);
 v+=text(40,1350,'q avg = T / nominal annulus(OD37, bore22). No preload, peak contact or washer bending included.',18);
 if(pilot.length){v+=text(40,1392,'Pilot only: '+pilot.map(g=>`Leff${g.effectiveBoltLengthMm}: maxT ${fmt(Math.max(...g.bolts.map(b=>b.tensionN))/1000,3)}kN, max ratio1.5 ${fmt(Math.max(...g.bolts.map(b=>b.componentCases[2].ratio)),4)}`).join(' | '),17);}
 else v+=text(40,1392,'No Leff40/60 study for this setup. D-RH pilot sensitivities are not a bound for other setups.',18);
 v+=rect(35,1420,1730,186,'#fff5e0','#d4a746');
 v+=text(53,1454,'B | DEVELOPMENT DISPOSITION',22)+text(53,1488,'Keep candidate M20x60 / ISO7089-200HV21x37x3. Inspect insertion26-28 and actual full threads.',19);
 v+=text(53,1520,'Reuse / torque / anti-loosening / bed / welds / handling remain open. No reusable-service qualification.',19);
 v+=text(53,1552,'Pitch250/240: resolve exposure/compression conditions. Washer category compatibility is not rigidity approval.',18);
 v+=text(53,1584,'Source: JRC96658-2015 pp85-91; BSI ISO7089 scope; Bossard/Wurth references in linked JSON.',17);
 v+=line(35,1630,1765,1630,navy)+text(40,1657,'DEVELOPMENT / CALCULATION REVIEW ONLY - NOT FOR FABRICATION, CASTING OR LIFTING',19);
 return v+'</g></svg>';
}
const files=[];
for(const key of [...new Set(r.groups.map(g=>g.key))]){
 const svg=board(key),base=dir+'/'+key+'-board';fs.writeFileSync(base+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(base+'.png');
 for(const p of [dir+'/'+key+'.json',base+'.svg',base+'.png'])files.push({key,path:p,sha256:sha(p),bytes:fs.statSync(p).size});
}
fs.writeFileSync(dir+'/assets.json',JSON.stringify({revision:'P92',sourceRegisterSha256:sha(dir+'/register.json'),generatorSha256:sha('tools/modular-program/connection-boards-p92.mjs'),files,engineeringApproved:false,productionReleased:false,stageComplete:false},null,2));
const cards=[...new Set(r.groups.map(g=>g.key))].map(key=>`<section><h2>${key}</h2><p><a download href="${key}-board.png">PNG</a> · <a download href="${key}-board.svg">SVG</a> · <a download href="${key}.json">JSON</a></p><img src="${key}-board.png" alt="Model-based connection detail ${key}"></section>`).join('');
fs.writeFileSync(dir+'/index.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P92 - จุดยึดขาผนัง</title><style>body{font:17px/1.65 Arial,sans-serif;max-width:1250px;margin:32px auto;padding:0 22px;color:${navy};background:#f5f7fa}h1{font-size:30px}section{background:white;border:1px solid #c4ceda;padding:20px;margin:24px 0;border-radius:10px}img{width:100%;height:auto}a{color:#17559b}aside{background:#fff2d2;padding:18px;border-radius:8px}li{margin:10px 0}code{word-break:break-word}</style><h1>P92 — จุดยึดขาผนังและข้อกำหนดตรวจรับ</h1><aside>ขั้น5/8 ยังไม่ครบ100%. งานย่อยจับคู่แรงครบ24/24กลุ่ม (96ตำแหน่ง) + ความไว2กรณีนำร่อง. ไม่ใช่แบบรับรองให้ผลิต เท หรือยก</aside><p>แรง P90 จับคู่กับ P85 ที่โบลต์ตำแหน่งเดียวกัน และตรวจแรง/โมเมนต์จาก P83 ที่จุดอ้างอิงเดียวกันแล้ว ไม่รันFEเพิ่ม ไม่เปลี่ยนมิติTypical ไม่แก้รูปหลักเดิม</p><p>ผลตัวโบลต์สถิตมีอัตราส่วนสูงสุด ${fmt(r.summary.baselineWorst.ratio,4)} (ฐานLeff50) และ ${fmt(r.summary.pilotWorst.ratio,4)} (นำร่องLeff40) ภายใต้ตัวคูณแรงดันทดลอง1.5 ไม่ใช่ผลผ่านจุดต่อทั้งระบบ. รูปไม่แทนแบบเกลียวจริงหรือคู่มือขัน</p><p><a download href="checks.csv">ดาวน์โหลดตาราง312กรณี CSV</a> · <a download href="register.json">ทะเบียน/แหล่งอ้างอิง JSON</a> · <a href="INSPECTION_TH.md">ข้อกำหนดตรวจรับเสนอ</a></p><h2>ข้อสรุปและงานที่ยังต้องปิด</h2><ul>${r.dispositions.map(d=>`<li><strong>${escape(d.id)} — ${escape(d.status)}</strong><br>${escape(d.decision)}</li>`).join('')}</ul>${cards}<h2>แหล่งอ้างอิง</h2><ul>${r.sources.map(s=>`<li><a href="${escape(s.url)}">${escape(s.id??s.title)}</a></li>`).join('')}</ul><p>คง P52: เหล็กยกคอนกรีตแสดงแนวโดยไม่ระบุขนาด สมมติกำลังคอนกรีตพอเฉพาะการพัฒนา ไม่อนุมานพิกัดคานยก สลิง รอยเชื่อม หรือพื้นโรงงาน</p></html>`);
console.log({boards:6,assets:files.length,output:dir});
