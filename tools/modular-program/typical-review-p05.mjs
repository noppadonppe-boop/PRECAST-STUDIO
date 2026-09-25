import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {root} from './build-r02.mjs';import {geometry} from './tsc-master-p02.mjs';import {model as office} from './ic1-p04.mjs';
import {estimateMass} from './typical-mass.mjs';
const out=path.join(root,'output/typical-review-p05');fs.mkdirSync(out,{recursive:true});
const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const g=geometry(),o=office(),L=1485;
const types=[];
for(const side of ['LH','RH'])for(const variant of ['S00','W01']){
 const profile=(side==='LH'?g.lh:g.rh).map(([x,z])=>[side==='LH'?Math.min(x,1490):Math.max(x,1510),z]);
 types.push({id:`TS-C-H15-${side}-${variant}-P05`,kind:'HALF',side,variant,profile,length:L,width:1490,height:2825,thickness:150,opening:variant==='W01'?{localY:[292.5,1192.5],z:[1075,2275]}:null});
}
types.push({id:'TS-C-F15-F01-P05',kind:'FLOOR',profile:[[0,0],[2660,0],[2660,175],[0,175]],length:L,width:2660,height:175,thickness:175,opening:null});
for(const e of o.endPanels)types.push({id:`TS-C-${e.type}-P05`,kind:'END',profile:[[0,0],[2660,0],[2660,2325],[0,2325]],length:150,width:2660,height:2325,thickness:150,opening:e.opening?{x:[830,1830],z:[0,2100]}:null});
const text=(x,y,s,n=19,c='#294459')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${s}</text>`;
const line=(a,b,c='#57778b',d=false)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="1.4" ${d?'stroke-dasharray="5 4"':''}/>`;
const polygon=(pts,fill='none',color='#57778b')=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${color}" stroke-width="1.3"/>`;
const dim=(x,y,w,label)=>line([x,y],[x+w,y])+line([x,y-7],[x,y+7])+line([x+w,y-7],[x+w,y+7])+text(x+w/2-30,y-10,label,17);
const records=[];
for(const a of types){
 a.mass=estimateMass(a);
 const xmin=Math.min(...a.profile.map(p=>p[0])),zmin=Math.min(...a.profile.map(p=>p[1]));const local=a.profile.map(([x,z])=>[x-xmin,z-zmin]);
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1400"><rect width="1600" height="1400" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">`;
 s+=text(45,55,a.id,31)+text(45,93,'TYPICAL REVIEW / P05 · รูป2Dและ3Dจากพิกัดเดียวกัน · หน่วย mm',21);
 s+=`<rect x="40" y="115" width="1520" height="55" fill="#fff0d8"/>`+text(58,151,'ข้อเสนอพัฒนาแบบ — ไม่ใช่แบบหล่อ/แบบยก — มิติรอยต่อจากP03ยังรอทบทวน',22,'#96551b');
 s+=text(65,213,'01 / หน้าตัดหรือรูปด้านหลัก',22)+text(835,213,'02 / 3D wireframe — ดูรูปทรงและช่องเปิด',22);
 const k=Math.min(.15,480/a.width),p=([x,z])=>[130+x*k,710-z*k];
 s+=polygon(local.map(p),'#c4dce8');
 if(a.kind==='END'&&a.opening)s+=polygon([[830,0],[1830,0],[1830,2100],[830,2100]].map(p),'#f5f7fa');
 s+=dim(130,750,a.width*k,`${a.width}`);
 s+=line([92,710],[92,710-a.height*k])+line([83,710],[101,710])+line([83,710-a.height*k],[101,710-a.height*k])+text(45,710-a.height*k/2,`${a.height}`,17);
 if(a.kind==='HALF')s+=text(160,265,'Ro400 / Ri250 / t150',18)+text(160,800,'ความหนาวัดตั้งฉากผิว / ไม่ใช่แนวดิ่งที่ส่วนโค้ง',17);
 else if(a.kind==='FLOOR')s+=text(130,665,'t175',18);
 else if(a.opening)s+=text(180,620,'ช่อง1000×2100',18);
 const iso=([x,y,z])=>[960+x*.13+y*.09,720+x*.022-y*.065-z*.13];
 const front=local.map(([x,z])=>iso([x,0,z])),back=local.map(([x,z])=>iso([x,a.length,z]));
 s+=polygon(back)+polygon(front);
 // Show selected generator lines, not a misleading solid surface across openings.
 for(const i of [0,1,Math.floor(local.length/2),local.length-1])s+=line(front[i],back[i]);
 if(a.kind==='HALF'&&a.opening){const x=a.side==='LH'?0:a.width;const pts=[[x,292.5,900],[x,1192.5,900],[x,1192.5,2100],[x,292.5,2100]];s+=polygon(pts.map(iso),'none','#158998');}
 if(a.kind==='END'&&a.opening)for(const y of [0,150])s+=polygon([[830,y,0],[1830,y,0],[1830,y,2100],[830,y,2100]].map(iso),'none','#158998');
 s+=text(855,787,`ความยาวตามแกนชิ้น ${a.length} / ความหนา ${a.thickness}`,19);
 s+=text(65,852,'03 / รูปด้านตามยาว หรือแปลน',22);
 const sx=130,sy=935,scale=.1;
 if(a.kind==='HALF'){
   // This side view has its own equal X/Z scale; height = 2825.
   const sk=.105,bottom=sy+300,top=bottom-2825*sk;
   s+=polygon([[sx,top],[sx+L*sk,top],[sx+L*sk,bottom],[sx,bottom]],'#c4dce8');
   s+=dim(sx,top-23,L*sk,`${L}`);
   if(a.opening)s+=polygon([[sx+292.5*sk,bottom-900*sk],[sx+1192.5*sk,bottom-900*sk],[sx+1192.5*sk,bottom-2100*sk],[sx+292.5*sk,bottom-2100*sk]],'#f5f7fa');
   s+=text(320,sy+80,a.opening?'W01 900×1200':'S00 ทึบ',19);
   if(a.opening)s+=text(320,sy+115,'ข้าง292.5 / ล่าง900',17)+text(320,sy+150,'หัวช่องถึงเริ่มโค้ง325',17);
 }else {s+=polygon([[sx,sy],[sx+a.length*scale,sy],[sx+a.length*scale,sy+a.width*scale],[sx,sy+a.width*scale]],'#e4edf3');s+=dim(sx,sy-23,a.length*scale,`${a.length}`);s+=text(350,sy+90,`${a.width} × ${a.length}`,18);}
 s+=text(720,868,'04 / บัญชีมิติและจุดยก',22);
 const details=a.kind==='HALF'?[`กรอบซีก X${a.width} × Z${a.height}; ยาว${L}`,'ช่วงผนังตรง2425 / หลังคาราบ1090','โค้งศูนย์ร่วมRo400,Ri250 / ความหนา150','กลางหลังคาเว้น20: ซีกละ10จากแนวกลาง',a.opening?'W01: 900×1200; ธรณีZ1075จากใต้พื้น':'S00: ไม่มีช่องเปิด']:a.kind==='FLOOR'?['พื้นเสนอ2660×1485×175','ช่องข้างผนัง20ต่อด้าน; ระยะรองรับยังไม่กำหนด','รอยต่อระหว่างช่วง15 / ปลายกริด7.5ต่อข้าง']:['แผงเสนอ2660×2325×150',a.opening?'ช่อง1000×2100 / ข้าง830 / เหนือ225':'แผงทึบ ไม่มีช่องเปิด','ชุดเติมเหนือแผงแยก: ยังไม่ออกแบบ'];
 details.forEach((v,i)=>s+=text(720,908+i*31,v,18));
 s+=text(720,1080,`คอนกรีตสุทธิ ${a.mass.netVolumeM3.toFixed(4)} m³ ≈ ${Math.round(a.mass.concreteMassKg).toLocaleString('en-US')} kg`,21);
 const yy=1120;s+=text(720,yy,'หูยก: โซนศึกษาเท่านั้น ไม่มีพิกัดติดตั้ง',20,'#96551b');
 const zoneText=a.kind==='HALF'?'โซนเนื้อทึบฝั่งผนัง/หลังคา จัดระบบแขวนคร่อมCG':a.kind==='FLOOR'?'โซนกระจายบนหน้าแผ่นรอบCGทั้งสองทิศ':'โซนบนเหนือเนื้อทึบข้างช่อง หลีกเลี่ยงแถบเหนือประตู';
 s+=text(720,yy+34,zoneText,17)+text(720,yy+68,'DEM/ROT/ERECT แยกขั้น · ห้ามยกตามภาพ',18,'#96551b');
 s+=text(720,yy+103,'น้ำหนักใช้2400kg/m³ ไม่รวมเหล็ก/อุปกรณ์/ผิวตกแต่ง',17)+text(720,yy+134,'ไม่ใช่น้ำหนักออกแบบยก; tolerance/ฐานยังไม่ครบ',17);
 s+=`<rect x="40" y="1320" width="1520" height="50" fill="#e4ebf2"/>`+text(60,1352,'3D เป็นรูปเส้น ไม่มีhidden-line removal • มิติระบุเฉพาะเรขาคณิตที่กำหนดแล้ว ไม่รับรองพร้อมผลิต',19);
 s+='</g></svg>';fs.writeFileSync(path.join(out,a.id+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(path.join(out,a.id+'.png'));records.push({id:a.id,file:a.id+'.png',geometry:a,status:'DIMENSION_REVIEW_NOT_FABRICATION',releasedForLifting:false});
}
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(path.join(out,'register.json'),JSON.stringify({records,dependencies:['knowledge/modular-program-r02/decisions.json','tools/modular-program/tsc-master-p02.mjs','tools/modular-program/ic1-p03.mjs','tools/modular-program/ic1-p04.mjs','tools/modular-program/typical-review-p05.mjs','tools/modular-program/typical-mass.mjs'].map(p=>({path:p,sha256:hash(path.join(root,p))})),files:records.map(r=>({file:r.file,sha256:hash(path.join(out,r.file))})),engineeringApproved:false,productionReleased:false},null,2));console.log(`${records.length} Typical review sheets generated.`);
