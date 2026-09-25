import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';
export function geometry(){
 const decisions=JSON.parse(fs.readFileSync(path.join(root,'knowledge/modular-program-r02/decisions.json'),'utf8'));
 const w=decisions.geometry.external_width_target_mm,h=decisions.geometry.external_height_target_mm,r=decisions.geometry.c_external_radius_mm,t=decisions.thickness.wall_roof,f=decisions.thickness.floor;
 const arc=(radius,reverse=false)=>Array.from({length:33},(_,i)=>{const a=Math.PI-(reverse?32-i:i)*Math.PI/64;return [r+radius*Math.cos(a),h-r+radius*Math.sin(a)];});
 const lh=[[0,f],[0,h-r],...arc(r).slice(1),[w/2,h],[w/2,h-t],[r,h-t],...arc(r-t,true).slice(1),[t,f]];
 return {id:'TS-C-MASTER-P02',programmeRevision:'R02',units:'mm',status:'NOMINAL_GEOMETRY_DEVELOPMENT_ONLY',width:w,height:h,bayGrid:1500,wallRoofThickness:t,floorThickness:f,outerRadius:r,innerRadius:r-t,clearWidth:w-2*t,clearHeightAtFlatRoof:h-t-f,wallFootZ:f,wallFootBasis:'PROPOSED_DATUM_NOT_SUPPORT_DETAIL',lh,rh:lh.map(([x,z])=>[w-x,z]),floorEnvelope:{x:[t,w-t],z:[0,f],basis:'INTERIOR_SPACE_RESERVATION_ONLY_NOT_FLOOR_CAST_SIZE'},unknowns:{crownGap:null,bayGap:null,bearingClearance:null,castLength:null,floorCastWidth:null,finishThickness:null,drainageSlope:null},engineeringApproved:false,productionReleased:false};
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const txt=(x,y,s,size=19,color='#294459')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(s)}</text>`;
const line=(a,b,c='#708899',dash='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="1.5" ${dash?'stroke-dasharray="6 5"':''}/>`;
const poly=(points,fill,stroke='#38546a')=>`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
export function drawing(g){
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1320" viewBox="0 0 1600 1320"><rect width="1600" height="1320" fill="#f5f7fa"/><g font-family="Tahoma,Arial,sans-serif">`;
 s+=txt(48,54,'TS-C / TYPICAL MASTER',32)+txt(48,90,'P02 · หน้าตัดและการแบ่งชิ้นตั้งต้น · หน่วยมิลลิเมตร · รูปตามพิกัด ไม่ใช่ภาพ AI',20);
 s+='<rect x="40" y="110" width="1520" height="52" rx="8" fill="#fff0d8"/>'+txt(58,144,'เพื่อพัฒนาแบบเท่านั้น — ไม่อนุมัติผลิต/ก่อสร้าง — ระยะรอยต่อและขนาดหล่อยังไม่สรุป',23,'#925412');
 s+=txt(65,207,'01 / หน้าตัดประกอบ — nominal envelope',22);
 const p=([x,z])=>[130+x*.155,730-z*.155];
 s+=poly(g.lh.map(p),'#74b4ce')+poly(g.rh.map(p),'#99c9bb');
 const fp=[[150,0],[2850,0],[2850,175],[150,175]].map(p);
 s+=`<polygon points="${fp.map(a=>a.join(',')).join(' ')}" fill="#e0e7ee" stroke="#718394" stroke-dasharray="5 4"/>`;
 s+=line(p([1500,0]),p([1500,3100]),'#a45949',true);
 s+=line([130,247],[595,247])+line([130,240],[130,260])+line([595,240],[595,260])+txt(335,236,'3000',18);
 s+=line([92,265],[92,730])+line([83,265],[103,265])+line([83,730],[103,730])+txt(48,497,'3000',16);
 s+=line(p([150,1200]),p([2850,1200]))+txt(275,532,'2700 ภายในช่วงตรง',18);
 s+=txt(220,403,'2675 ใต้หลังคาราบ',20)+txt(234,432,'ก่อนงานตกแต่ง',18);
 s+=txt(150,317,'R400 / R250',17)+txt(363,294,'t150',17);
 s+=txt(150,761,'พื้น t175 · ความกว้างหล่อยังไม่สรุป',18);
 s+=txt(150,790,'เส้นกลาง: ตำแหน่งแบ่งซีก ไม่ใช่รายละเอียดรอยต่อ',16);
 s+=txt(795,207,'02 / ภาพแยกซีก — แสดงการแบ่งชิ้น',22);
 const iso=(x,y,z)=>[960+x*.13+y*.09,756+x*.025-y*.065-z*.13];
 function extrusion(points,offset,color){
   const a=points.map(([x,z])=>iso(x+offset,0,z+180)),b=points.map(([x,z])=>iso(x+offset,1500,z+180));
   let v=poly(b,'#d9e4eb');
   for(let i=0;i<a.length;i++){const j=(i+1)%a.length;v+=poly([a[i],b[i],b[j],a[j]],color);}
   return v+poly(a,color);
 }
 s+=extrusion(g.rh,240,'#a6d3c3')+extrusion(g.lh,-240,'#88bed3');
 s+=poly([[150,0,0],[2850,0,0],[2850,1500,0],[150,1500,0]].map(a=>iso(...a)),'#dfe6ed');
 s+=txt(803,350,'LH',20)+txt(1438,435,'RH',20);
 s+=txt(814,811,'ระยะเลื่อนในภาพเพื่ออ่านชิ้น ไม่ใช่ระยะติดตั้ง',18);
 s+=txt(814,840,'พื้นแสดงพื้นที่สำรอง ไม่ใช่ขนาดหล่อ/แนวรองรับ',18);
 s+=txt(65,866,'03 / แปลนกริดหนึ่งช่วง',22);
 const px=140,py=912,scale=.13;
 s+=`<rect x="${px}" y="${py}" width="390" height="195" fill="#eaf1f6" stroke="#637f94" stroke-dasharray="7 4"/>`;
 s+=line([px+195,py],[px+195,py+195],'#ad675b',true);
 s+=txt(px+54,py+90,'LH',20)+txt(px+274,py+90,'RH',20);
 s+=txt(px+157,py-12,'3000',18)+txt(px+407,py+100,'1500',18);
 s+=txt(140,1135,'กริด Y = 1500 ≠ ความยาวชิ้นหล่อ',18);
 s+=txt(690,900,'รายการชิ้นตั้งต้น',23);
 ['TS-C-H15-LH · ผนัง–หลังคาซ้าย · t150','TS-C-H15-RH · ผนัง–หลังคาขวา · t150','TS-C-F15 · พื้นแยก · t175','R400 ภายนอก / R250 ภายใน: หนาตามแนวตั้งฉาก 150'].forEach((v,i)=>s+=txt(690,940+i*35,v,19));
 s+=txt(690,1096,'ค้าง: ช่องเปิด / gap / tolerance / จุดรองรับ / การระบายน้ำ',18,'#925412');
 s+=txt(690,1128,'เท้าผนัง Z175 เป็นระดับเสนอ ไม่ใช่ถ่ายแรงลงพื้น',18,'#925412');
 s+='<rect x="40" y="1175" width="1520" height="110" rx="8" fill="#e4ebf2"/>';
 s+=txt(60,1207,'TS-C-MASTER-P02 · R02 · ผนัง–หลังคา150 / พื้น175 · ไม่รวมผิวตกแต่ง',20);
 s+=txt(60,1238,'ภาพ 3D ใช้ความยาวกริดเพื่ออธิบายเท่านั้น ยังไม่สร้าง RVT / STD หรือแบบแม่แบบผลิต',18);
 s+=txt(60,1267,'รอยต่อจริง ฐานแยก LP-A และความปลอดภัยระหว่างยก/ประกอบ ต้องพัฒนาต่อ',18);
 return s+'</g></svg>';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/tsc-master-p02');fs.mkdirSync(out,{recursive:true});const g=geometry(),svg=drawing(g);
 fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(g,null,2)+'\n');fs.writeFileSync(path.join(out,'TS-C-MASTER-P02.svg'),svg);
 const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 await sharp(Buffer.from(svg)).png().toFile(path.join(out,'TS-C-MASTER-P02.png'));
 const files=['geometry.json','TS-C-MASTER-P02.svg','TS-C-MASTER-P02.png'];
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({id:g.id,visibility:'INTERNAL_TEAM',status:g.status,engineeringApproved:false,productionReleased:false,dependencies:['knowledge/modular-program-r02/decisions.json','tools/modular-program/tsc-master-p02.mjs'].map(p=>({path:p,sha256:hash(path.join(root,p))})),files:files.map(p=>({file:p,sha256:hash(path.join(out,p))}))},null,2));
 console.log(out);
}
