import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {raster} from './drawing-raster-p36.mjs';
import {root,out,hash,volumeCg} from './stage5-p38.mjs';
const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const reg=JSON.parse(fs.readFileSync(path.join(out,'register.json')));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,n=24,c='#112c4b')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${esc(s)}</text>`;
const box=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="white" stroke="#9caec2"/>`;
// Fixed orthographic camera. Geometry is never resized along individual model axes.
// All panels use this same rotation and uniform pixel scale, fitted to their viewport.
const project=([x,y,z])=>[(x-y)/Math.sqrt(2),(x+y)/Math.sqrt(6)-z*Math.sqrt(2/3)];
const depth=([x,y,z])=>-(x+y+z)/Math.sqrt(3);
function view(faces,x,y,w,h){if(!faces.length)return text(x+20,y+50,'ไม่มี geometry ที่กำหนด');const ps=faces.flatMap(f=>f.face.map(project)),mi=[0,1].map(k=>Math.min(...ps.map(p=>p[k]))),ma=[0,1].map(k=>Math.max(...ps.map(p=>p[k]))),scale=Math.min((w-30)/(ma[0]-mi[0]||1),(h-30)/(ma[1]-mi[1]||1));const map=v=>project(v).map((q,k)=>(q-mi[k])*scale+([w,h][k]-(ma[k]-mi[k])*scale)/2);return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${raster(faces,w,h,map,depth)}"/>`;}
function plan(s,x,y,w,h){const [dx,dy]=s.cavity.dimensionsMm,k=Math.min((w-100)/dx,(h-100)/dy),ox=x+50,oy=y+h-50;let r='';const seen=new Set();for(const f of s.cavity.facesMm)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],key=[a.slice(0,2).join(','),b.slice(0,2).join(',')].sort().join('|');if(seen.has(key))continue;seen.add(key);r+=`<path d="M${ox+a[0]*k},${oy-a[1]*k}L${ox+b[0]*k},${oy-b[1]*k}" stroke="#224f72" stroke-width="1.2" fill="none"/>`;}
return r+text(ox,oy+30,`X = ${dx.toFixed(2)} mm`,20)+text(ox,y+22,`Y = ${dy.toFixed(2)} mm · XY projection`,20);}
const audit=[];
for(const row of reg.setups){const file=path.join(out,row.id,'setup.json'),s=JSON.parse(fs.readFileSync(file));const concrete=s.cavity.facesMm.map(face=>({face,color:'#b7bec4'})),surfaces=s.tooling.flatMap(t=>t.contactEnvelopeFacesMm.map(face=>({face,color:t.role==='BED'?'#728396':'#386894'}))),voids=s.openings.flatMap(o=>o.facesMm.map(face=>({face,color:'#d89735'})));
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1700" viewBox="0 0 2400 1700"><rect width="2400" height="1700" fill="white"/><g font-family="Tahoma,Arial,sans-serif">`;
svg+=text(35,58,s.typicalId,36)+text(35,104,'MOULD GEOMETRY REVIEW | P38-R1 — MODEL-DERIVED, NOT AI GENERATED',27);
svg+=text(35,144,'ตรวจรูปทรงจากโมเดลเดิม • ไม่เติมโครงค้ำ แคลมป์ เหล็กเสริม หรือพุกยกที่ยังไม่ได้ออกแบบ',24);
svg+=box(25,175,1310,735)+box(1350,175,1025,735);
svg+=text(45,213,'1 | ผิวสัมผัสช่องหล่อในตำแหน่งประกอบ (ไม่มีความหนาเครื่องมือ)',23);
svg+=view([...surfaces,...voids],45,235,1270,580)+text(45,855,'ฟ้า = ผิวแบบรอบนอก / เหลือง = ปริมาตรเว้นช่องเปิด ไม่ใช่เครื่องมือจริง',22);
svg+=text(1370,213,'2 | ชิ้นคอนกรีตจริงตามโมเดล ในท่าหล่อเสนอ',23)+view(concrete,1370,235,985,580);
svg+=text(1370,855,`XYZ ${s.cavity.dimensionsMm.map(n=>n.toFixed(2)).join(' × ')} mm`,21);
svg+=text(1370,888,`คอนกรีต ${s.mass.concreteKg.toFixed(2)} kg · ความหนา ${s.cavity.normalThicknessMm??'ดู 00-TYPICAL'} mm`,20);
svg+=box(25,930,730,610)+box(770,930,730,610)+box(1515,930,860,610);
svg+=text(45,970,'A | ฉายแปลน XY จากพิกัดเดียวกัน',25)+plan(s,45,990,690,485);
svg+=text(790,970,'B | ปริมาตรช่องเปิด / ชิ้นทึบ',25);
if(voids.length){svg+=view(voids,790,1005,690,350)+text(790,1400,'สีเหลือง = ปริมาตรที่ต้องเว้น ไม่ใช่กลไกบล็อกถอด',21);s.openings.forEach((o,i)=>{svg+=text(790,1440+i*32,`${o.type} · ${o.roughWidthMm} × ${o.roughHeightVerticalInstalledMm} mm (installed)`,20);});svg+=text(790,1510,'จำนวนชิ้นบล็อก / แนวถอด / ระยะหลวม: ยังไม่กำหนด',20);}
else{svg+=view(concrete,790,1005,690,355)+text(790,1410,'ชิ้นงานนี้ไม่มีช่องเปิดในโมเดล — ไม่เพิ่มช่องเอง',21)+text(790,1450,'รูปทรง ขอบเว้า และความลาดคงตามต้นทาง',21);}
svg+=text(1535,970,'C | ASSEMBLY / DEMOULDING — HOLD',25);
['รูปทรงคอนกรีตและช่องเปิด: มีพิกัดอ้างอิง','ผิวสัมผัสแบบ: มี geometry แต่ไม่ใช่ solid เครื่องมือ','การแบ่งแผ่นแบบจริง / จุดยึด / ค้ำยัน: ยังไม่มีแบบ','กลไกบล็อกช่องเปิดและลำดับปลด: ยังไม่ผ่านตรวจ','เส้นทางถอดและ swept collision: ยังไม่คำนวณ','เสถียรภาพระหว่างถอด / ยก / พลิก: ยังไม่ออกแบบ','จึงไม่วาดลำดับถอดเป็นภาพสำเร็จที่อาจทำไม่ได้จริง','ไม่ใช้ภาพ exploded เดิมเป็นเส้นทางเคลื่อนที่','ขั้นถัดไปในงานแม่แบบ: สร้าง tool solids และตรวจชน'].forEach((s,i)=>{svg+=text(1535,1025+i*49,s,21);});
svg+=text(35,1590,'GEOMETRY ONLY — NOT A VERIFIED MOULD ASSEMBLY OR DEMOULDING PROCEDURE',27,'#9c452c');
svg+=text(35,1632,'ฉายคงที่ ไม่บิดสัดส่วน • เส้นแบ่ง mesh ไม่ใช่รอยต่อชิ้นงาน • มิติอ้างอิง 00/01 และ setup.json • ไม่อนุมัติผลิต',23);
svg+=text(35,1670,`Source: ${s.source.model} | ${s.source.instanceId}`,19)+'</g></svg>';
const name=path.join(out,row.id,'03-GEOMETRY-REVIEW');fs.writeFileSync(name+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(name+'.png');
const model=JSON.parse(fs.readFileSync(path.join(root,s.source.model))),instance=model.instances.find(i=>i.id===s.source.instanceId);let maxError=0;for(let f=0;f<s.cavity.facesMm.length;f++)for(let v=0;v<s.cavity.facesMm[f].length;v++){const c=s.cavity.facesMm[f][v],a=s.castingTransform.basisRows,o=s.castingTransform.rotatedOriginMm;const world=[0,1,2].map(j=>[0,1,2].reduce((sum,k)=>sum+a[k][j]*(c[k]+o[k]),0));world.forEach((n,k)=>maxError=Math.max(maxError,Math.abs(n-instance.facesMm[f][v][k])));}
if(maxError>1e-8)throw Error('Geometry differs: '+s.id);
audit.push({setupId:s.id,sourceSetupSha256:hash(file),imageSha256:hash(name+'.png'),svgSha256:hash(name+'.svg'),inverseCoordinateMaxErrorMm:maxError,concreteFaceCount:concrete.length,openingCount:s.openings.length,meshMassDifferenceKg:Math.abs(volumeCg(s.cavity.facesMm).volumeM3*2400-s.mass.concreteKg),geometryDataCheck:'PASS',physicalToolSolids:false,demouldingVerified:false,visualReview:'PENDING'});
console.log(s.id);}
fs.writeFileSync(path.join(out,'geometry-review-p38r1.json'),JSON.stringify({revision:'P38-R1',scope:'GEOMETRY_CORRECTION_NOT_PHYSICAL_MOULD_VALIDATION',setupCount:audit.length,projection:'fixed orthographic orthonormal camera; uniform scale',generativeImagesWithdrawn:true,records:audit},null,2));
