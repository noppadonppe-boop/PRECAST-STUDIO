import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {raster} from './drawing-raster-p36.mjs';
export const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'output/stage5-moulds-p38');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
export const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>a.map(v=>v/Math.hypot(...a));
const bounds=vs=>({min:[0,1,2].map(i=>Math.min(...vs.map(v=>v[i]))),max:[0,1,2].map(i=>Math.max(...vs.map(v=>v[i])))});
const round=v=>Number(v.toFixed(3));
const key=v=>v.map(round).join(',');
const normal=f=>{const n=f.reduce((sum,v,i)=>add(sum,cross(sub(v,f[0]),sub(f[(i+1)%f.length],f[0]))),[0,0,0]);if(Math.hypot(...n)<1e-6)throw Error('Degenerate face');return unit(n);};
export function volumeCg(faces){let vol=0,m=[0,0,0];for(const f of faces)for(let i=1;i<f.length-1;i++){const a=f[0],b=f[i],c=f[i+1],v=dot(a,cross(b,c))/6;vol+=v;m=m.map((s,j)=>s+v*(a[j]+b[j]+c[j])/4);}return {volumeM3:Math.abs(vol)/1e9,signedVolumeM3:vol/1e9,cgMm:m.map(v=>v/vol)};}
const sources=['output/stage2-review-p35/typical-index.json','output/stage3-designs-p36/catalogue.json'];
const refs=read(sources[0]).entries,cat=read(sources[1]).products;
const models=cat.map(p=>read('output/stage3-designs-p36/'+p.model));
const find=id=>{for(const p of models){const instance=p.instances.find(i=>i.typicalId===id);if(instance)return {p,instance};}throw Error('Missing '+id);};
const colors={BED:'#b9a782','X-':'#5c98b0','X+':'#76b6c5','Y-':'#91b4a0','Y+':'#b2c9a9',BLOCKOUT:'#d99865'};
const guides={SHELL:['วางซีกบนหน้าตัดปลาย ช่วงยาว1,485เป็นแนวตั้งท่าหล่อ','ผิวโค้งใช้ซี่โครง/skinตามprofile; แบ่งแถบถอดออกด้านนอก','แบบสูง1,485: ต้องออกแบบแรงดันเท/ค้ำยันและช่องเข้าทำงาน'],END:['หล่อนอนบนหน้ากว้าง; ผิวบนเปิดแต่งระดับ','ขอบตามprofileบน ไม่ใช้กล่องสี่เหลี่ยมแทนขอบโค้ง/เอียง','D01ใช้blockoutประตูชนขอบ แยกชิ้นถอดด้านในก่อนยก'],FLOOR:['หล่อนอนบนฐานรองรับต่อเนื่องตามขอบจริง','ขอบเว้าโหนดใช้stop-endถอดแยก ห้ามเติมมุมเว้า','ยังไม่กำหนดcamber/เหล็ก/วัสดุรองพื้นหรือระบบยก'],NODE_WALL:['หล่อนอนให้ความหนา175เป็นแนวตั้งท่าหล่อ','แบบข้างถอดออกจากผิวก่อนยก/พลิกชิ้น','การพลิกขึ้นตั้งต้องออกแบบriggingและกำลังคอนกรีต'],CAP:['ท่าหล่อคงลาดต้นทาง ใช้ฐานลาด/ขอบปรับระดับตามพิกัด','ไม่แทนความหนาตั้งฉาก100ด้วยbounding height','ชิ้นเรียวยาวต้องตรวจการโก่ง/ยก/แตกร้าวก่อนเลือกวิธียก'],FASCIA:['หล่อนอนบนหน้ากว้างในท่าศึกษา','ปลายเอียง/บากคงพิกัดจริง ใช้ชิ้นขอบถอดได้','ชิ้นแคบอาจไม่มีระยะฝังพุกเพียงพอ ห้ามเดาตำแหน่ง'],NODE_ROOF:['หล่อนอน หนา175 ตามชิ้นNR-S/NR-Nปัจจุบัน','คงรูปเว้า/ความกว้างแต่ละชิ้น ไม่ใช้NRเดิมแทน','ฐานรอง/ความโก่ง/ช่องพุกและการยกยังรอออกแบบ']};
export function setup(t,index){
 const {p,instance:i}=find(t.id),b=bounds(i.facesMm.flat()),size=sub(b.max,b.min);
 let axes=[[1,0,0],[0,1,0],[0,0,1]];
 if(['SHELL','END'].includes(i.kind))axes=[[1,0,0],[0,0,1],[0,-1,0]];
 else if(['NODE_WALL','FASCIA'].includes(i.kind)){const k=size.indexOf(Math.min(...size));if(k===0)axes=[[0,1,0],[0,0,1],[1,0,0]];if(k===1)axes=[[1,0,0],[0,0,1],[0,-1,0]];}
 const rotated=i.facesMm.map(f=>f.map(v=>axes.map(a=>dot(v,a)))),rb=bounds(rotated.flat()),transform=v=>sub(axes.map(a=>dot(v,a)),rb.min),faces=rotated.map(f=>f.map(v=>sub(v,rb.min))),bb=bounds(faces.flat()),dims=sub(bb.max,bb.min);
 const grossId=t.id.replace('-W01-','-S00-').replace('-D01-','-S01-');
 const gross=find(grossId).instance;
 // Align gross solid to the same installed datum; all source placements must be translation-compatible.
 const gb=bounds(gross.facesMm.flat()),offset=sub(b.min,gb.min);
 let grossFaces=gross.facesMm.map(f=>f.map(v=>transform(add(v,offset))));
 // Historical mirrored shells have reversed winding: normalize before classifying outward normals.
 if(volumeCg(grossFaces).signedVolumeM3<0)grossFaces=grossFaces.map(f=>[...f].reverse());
 const groups=new Map();let maxHeight=dims[2];
 for(const f of grossFaces){const n=normal(f),cz=f.reduce((s,v)=>s+v[2],0)/f.length;
   if(n[2]>.7&&cz>maxHeight/2)continue; // open pour/finish side, never a lid
   const role=n[2]<-.7&&cz<maxHeight/2?'BED':Math.abs(n[0])>=Math.abs(n[1])?(n[0]<0?'X-':'X+'):(n[1]<0?'Y-':'Y+');
   if(!groups.has(role))groups.set(role,[]);groups.get(role).push(f);
 }
 const tooling=[...groups].map(([role,ff],j)=>({id:`M${String(j+1).padStart(2,'0')}`,role,contactEnvelopeFacesMm:ff,color:colors[role],
   suggestedPatchReleaseVectors:ff.map(normal),assembledSkinThicknessMm:null,physicalPanelCount:null,
   note:role==='BED'?'ฐานรองเต็มผิว/ลาดตามพิกัด ไม่ใช่เลือกความหนาฐาน':'กลุ่มผิวแบบตามแนวแบ่ง; แบ่งpatchถอดตามnormal ห้ามถือเป็นแผ่นแข็งชิ้นเดียว'}));
 const openings=p.openings.filter(o=>o.instanceId===i.id).map(o=>{
   let inner;
   if(i.kind==='SHELL'){const dx=(i.side==='LH'?1:-1)*150*Math.sqrt(1+(p.family==='D'?(200/2825)**2:0));inner=o.cornersMm.map(v=>add(v,[dx,0,0]));}
   else {inner=o.cornersMm.map(v=>add(v,[0,150,0]));}
   const vs=[...o.cornersMm,...inner].map(transform);const ff=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].map(f=>f.map(k=>vs[k]));
   return {id:'BO-'+o.type,type:o.type,roughWidthMm:o.roughWidthMm,roughHeightVerticalInstalledMm:o.roughHeightVerticalMm,verticesCastingMm:vs,facesMm:ff,
     split:'COLLAPSIBLE_MULTIPART_NO_LOCKED_ONE_PIECE_CORE',draftAngleDeg:null,clearanceMm:null,fastenerLocations:null};
 });
 const calc=volumeCg(faces),id='MF-'+t.id.slice(3)+'-P38';
 return {id,typicalId:t.id,revision:'P38',stage:5,status:'PLANNING_ONLY_NOT_TOOL_FABRICATION',kind:i.kind,family:p.family,
   units:'mm',source:{productId:p.id,instanceId:i.id,model:'output/stage3-designs-p36/'+p.displayCode+'/model.json',modelSha256:hash(path.join(root,'output/stage3-designs-p36/'+p.displayCode+'/model.json')),typicalSource:t.source,typicalSourceSha256:t.sourceSha256},
   setupNumber:index+1,sourceProfileLabel:p.profileLabel,castingTransform:{basisRows:axes,rotatedOriginMm:rb.min,inverse:'world = transpose(basisRows) * (casting + rotatedOriginMm)'},
   cavity:{facesMm:faces,dimensionsMm:dims,normalThicknessMm:i.normalThicknessMm??i.thicknessMm??null,tessellationToleranceMm:.15,shrinkageAllowanceMm:null,manufacturingToleranceMm:null},
   tooling,openings,mass:{concreteKg:t.concreteMassKg,densityKgM3:2400,netVolumeM3:t.concreteMassKg/2400,meshVolumeM3:calc.volumeM3,concreteGeometricCgCastingMm:calc.cgMm,wholePieceMassKg:null,liftingDesignMassKg:null,mouldMassKg:null},
   orientationNotes:guides[i.kind],lifting:{stages:['DEM','ROT','ERECT'],studyZone:'SOLID_MATERIAL_AROUND_GEOMETRIC_CG_AVOID_OPENINGS_AND_THIN_EDGES; NO_DRILL_COORDINATES',anchorCoordinatesMm:null,quantity:null,anchorSystem:null,concreteStrengthAtLift:null,rigging:null,releasedForLifting:false},
   sequence:['01 ตรวจrevision พิกัดฐาน และtemplateรูปหน้าตัด','02 ประกอบฐาน/ขอบแบบตามM-tags ตรวจระยะและแนวแบ่ง','03 ติดblockoutแบบถอดย่อยถ้ามี; ยังไม่เจาะpocketพุก','04 HOLD: ออกแบบแบบหล่อ/เหล็ก/พุก/ค้ำ/แผนเทและตรวจโดยผู้รับผิดชอบ','05 หลังอนุมัติแล้วจึงเท บ่ม และทดสอบกำลังตามวิธีที่ออกแบบ','06 ก่อนถอด: ปลดblockoutย่อย/แบบข้างออกจากผิว คงฐานรอง','07 HOLD: DEM/ROT/ERECTตามแผนยกที่อนุมัติเท่านั้น'],
   holds:['FORM_PRESSURE_STIFFENERS_TIES_SUPPORTS','SKIN_MATERIAL_THICKNESS_AND_BENDABILITY','COLLAPSE_WITHDRAWAL_CLEARANCE_AND_SWEEP','DRAFT_SHRINKAGE_CAMBER_TOLERANCE','REBAR_COVER_EMBEDS_ANCHORS','LIFT_STRENGTH_RIGGING_TEMPORARY_SUPPORT'],
   usedBy:models.filter(m=>m.instances.some(r=>r.typicalId===t.id)).map(m=>({productId:m.id,quantity:m.instances.filter(r=>r.typicalId===t.id).length})),
   sourceTypicalBoard:{png:t.preview,svg:t.svg},engineeringApproved:false,productionReleased:false};
}
export const setups=()=>refs.map(setup);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const tx=(x,y,s,n=23,c='#214256')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${esc(s)}</text>`;
const line=(a,b,c='#688897')=>`<path d="M${a}L${b}" stroke="${c}" fill="none" stroke-width="1.4"/>`;
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
function start(s,n,title){return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1700" viewBox="0 0 2400 1700"><rect width="2400" height="1700" fill="#f7f9fa"/><g font-family="Tahoma,Arial,sans-serif">${rect(0,0,2400,140,'#173c50')}${tx(40,52,s.id,30,'white')}${tx(40,100,`ขั้น5 / ${n} — ${title}`,25,'#bddde0')}${tx(1970,55,'P38 · PLANNING',25,'white')}${tx(1970,100,'mm / NTS',22,'white')}`;}
const end=()=>rect(30,1585,2340,88,'#fff0d7')+tx(50,1620,'แม่แบบฉบับวางแผนเท่านั้น — ไม่อนุมัติสั่งทำแม่แบบ เทคอนกรีต หรือยก · ไม่ใช่ cutting pattern / CNC',23,'#92552e')+tx(50,1654,'ผิวสีเป็นcontact envelope ไม่มีความหนาแบบ/โครงค้ำ/สลักที่ออกแบบ · ตรวจ HOLD และพิกัดใน setup.json',21,'#92552e')+'</g></svg>';
function iso(faces,box){const proj=([x,y,z])=>[(x-y)*.866,-(x+y)*.34-z],ps=faces.flatMap(f=>f.face.map(proj)),bb={min:[0,1].map(i=>Math.min(...ps.map(p=>p[i]))),max:[0,1].map(i=>Math.max(...ps.map(p=>p[i])))};const size=sub(bb.max,bb.min),k=Math.min(box.w/(size[0]||1),box.h/(size[1]||1));const project=v=>{const q=proj(v);return [(box.w-size[0]*k)/2+(q[0]-bb.min[0])*k,(box.h-size[1]*k)/2+(q[1]-bb.min[1])*k];};return `<image x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" href="${raster(faces,box.w,box.h,project,([x,y,z])=>x+y-z*.68)}"/>`;}
function projection(s,axis,box){const d=s.cavity.dimensionsMm,a=axis[0],b=axis[1],k=Math.min((box.w-130)/d[a],(box.h-130)/d[b]),ox=box.x+75,oy=box.y+box.h-65,map=v=>[ox+v[a]*k,oy-v[b]*k];let svg='';const unique=new Set();for(const f of s.cavity.facesMm)for(let j=0;j<f.length;j++){const p=map(f[j]),q=map(f[(j+1)%f.length]);if(Math.hypot(p[0]-q[0],p[1]-q[1])<.01)continue;const key=[p.join(','),q.join(',')].sort().join('|');if(!unique.has(key)){unique.add(key);svg+=line(p,q);}}
 for(const o of s.openings)for(const f of o.facesMm)svg+=`<polygon points="${f.map(map).map(p=>p.join(',')).join(' ')}" fill="none" stroke="#ca803e" stroke-dasharray="5 4"/>`;
 svg+=line([ox,oy+30],[ox+d[a]*k,oy+30])+tx(ox+d[a]*k/2-30,oy+56,round(d[a]),20);
 svg+=line([ox-30,oy],[ox-30,oy-d[b]*k])+`<text transform="translate(${ox-40},${oy-d[b]*k/2}) rotate(-90)" font-size="20">${round(d[b])}</text>`;
 const cg=map(s.mass.concreteGeometricCgCastingMm);svg+=`<circle cx="${cg[0]}" cy="${cg[1]}" r="8" fill="none" stroke="#ae4b35"/>`+line([cg[0]-12,cg[1]],[cg[0]+12,cg[1]],'#ae4b35')+line([cg[0],cg[1]-12],[cg[0],cg[1]+12],'#ae4b35')+tx(cg[0]+14,cg[1]-12,'CG (not anchor)',17,'#ae4b35');
 return svg+tx(ox,oy+83,`${'XYZ'[a]} / ${'XYZ'[b]} (casting datum)`,18);
}
export function sheet1(s){let svg=start(s,'01/02','ช่องหล่อ / ท่าหล่อเสนอ / พิกัดและมิติ');svg+=tx(50,190,'3D ชิ้นคอนกรีตในท่าหล่อ — ไม่ใช่แม่แบบตัน')+iso(s.cavity.facesMm.map(face=>({face,color:'#adc7cd'})),{x:60,y:225,w:1000,h:640});svg+=tx(1210,190,'แปลน XY ท่าหล่อ / มองลงแกน Z')+projection(s,[0,1],{x:1170,y:230,w:1150,h:640});svg+=tx(50,970,'รูปด้าน XZ')+projection(s,[0,2],{x:30,y:995,w:1090,h:465});svg+=tx(1210,970,'ข้อมูลกำกับช่องหล่อ');let y=1020;
 for(const text of [`Typical: ${s.typicalId}`,`ขอบเขตช่องหล่อ XYZ: ${s.cavity.dimensionsMm.map(round).join(' × ')} mm`,`ความหนาตั้งฉาก: ${s.cavity.normalThicknessMm??'ดูTypicalต้นทาง'} mm`,...s.orientationNotes,`ปริมาตร ${s.mass.netVolumeM3.toFixed(6)} m³ × 2400 = ${s.mass.concreteKg.toFixed(2)} kg`,`CG คอนกรีต (casting): ${s.mass.concreteGeometricCgCastingMm.map(round).join(', ')}`,'CG นี้ไม่ใช่ตำแหน่งพุก / ไม่ใช่CGชิ้นงานสำเร็จ',`ช่องเปิด: ${s.openings.map(o=>o.type+' '+o.roughWidthMm+'×'+o.roughHeightVerticalInstalledMm+' (installed)').join('; ')||'ไม่มี'}`,'ดู00-TYPICALสำหรับรัศมี/ลาด/มิติหน้าตัดเดิม; ดูJSONสำหรับพิกัด']){svg+=tx(1210,y,text,21);y+=41;}
 return svg+end();}
export function sheet2(s){let svg=start(s,'02/02','แบ่งผิวแบบ / แนวถอดศึกษา / ลำดับประกอบ');const faces=[];for(const t of s.tooling){const delta=t.role==='BED'?[0,0,-250]:t.role==='X-'?[-450,0,0]:t.role==='X+'?[450,0,0]:t.role==='Y-'?[0,-450,0]:[0,450,0];for(const f of t.contactEnvelopeFacesMm)faces.push({face:f.map(v=>add(v,delta)),color:t.color});}for(const o of s.openings)for(const face of o.facesMm)faces.push({face:face.map(v=>add(v,[0,0,400])),color:colors.BLOCKOUT});
 svg+=tx(45,190,'3D แยกกลุ่มผิวแบบ / ระยะระเบิดภาพไม่ใช่clearanceถอดจริง')+iso(faces,{x:60,y:240,w:1050,h:720});svg+=tx(1220,190,'บัญชีกลุ่มผิวแบบและแนวแบ่งเสนอ');let y=240;for(const t of s.tooling){svg+=rect(1220,y-20,22,22,t.color)+tx(1260,y,`${t.id} · ${t.role} · ${t.contactEnvelopeFacesMm.length} patches`,22);y+=42;}if(s.openings.length){svg+=rect(1220,y-20,22,22,colors.BLOCKOUT)+tx(1260,y,'BO · blockoutถอดเป็นชิ้นย่อย',22);y+=44;}
 for(const l of ['เส้นแบ่งระหว่างกลุ่มสี = แนวpartingสำหรับพัฒนา','ผิวโค้งอาจต้องแบ่งskinเพิ่ม; patchesไม่ใช่จำนวนแผ่นจริง','ถอดแต่ละpatchตามnormalในJSONหลังปลดชิ้นข้างเคียง','ยังไม่ตรวจswept clearance/undercutด้วยtool solids','BEDคงรองรับชิ้นงาน ไม่ใช้ลูกศรเป็นคำสั่งยก','ทดสอบประกอบแห้ง/ตรวจเครื่องมือหลังออกแบบก่อนเท']){svg+=tx(1220,y,l,21);y+=39;}
 svg+=tx(50,1040,'ลำดับประกอบ / ถอด — จุดหยุดตรวจก่อนผลิต');y=1090;for(const l of s.sequence){svg+=tx(50,y,l,21);y+=53;}
 svg+=tx(1220,1040,'รายการรอออกแบบ / หูยก');y=1090;for(const l of ['DEM: ศึกษาผิวทึบรอบCGและแรงติดแบบ','ROT: ท่าหล่อ→ท่าติดตั้ง ต้องออกแบบrigging','ERECT: ระยะขอบ/ช่อง/ชิ้นเรียวต้องตรวจเป็นรายชิ้น','พิกัดพุก จำนวน กำลัง และpocket = รอกำหนด','วัสดุผิวแบบ/ความหนา/ซี่โครง/สลัก = รอกำหนด','draft / shrinkage / tolerance / camber = รอกำหนด','ไม่มีการเลือกความดันเทหรืออัตราเทในชุดนี้',`ใช้อ้างอิง ${s.usedBy.length} แบบ; ดูproduct-mapping.json`]){svg+=tx(1220,y,l,21);y+=46;}
 return svg+end();}
export async function build(){fs.mkdirSync(out,{recursive:true});const req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}const ss=setups();
 for(const s of ss){const dir=path.join(out,s.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'setup.json'),JSON.stringify(s,null,2));for(const [name,fn] of [['01-CAVITY',sheet1],['02-TOOLING',sheet2]]){const svg=fn(s);fs.writeFileSync(path.join(dir,name+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(dir,name+'.png'));}for(const ext of ['png','svg'])fs.copyFileSync(path.join(root,s.sourceTypicalBoard[ext]),path.join(dir,'00-TYPICAL.'+ext));console.log(s.id);}
 const products=models.map(p=>({productId:p.id,displayCode:p.displayCode,pieceCount:p.instances.length,setups:p.bom.map(b=>({setupId:ss.find(s=>s.typicalId===b.typicalId).id,...b})),productionQuantity:null,toolSetsToPurchase:null}));
 const reuse=ss.filter(s=>/-W01-|-D01-/.test(s.typicalId)).map(s=>({setupId:s.id,relatedSolidSetup:ss.find(t=>t.typicalId===s.typicalId.replace('-W01-','-S00-').replace('-D01-','-S01-')).id,status:'CANDIDATE_SHARED_BASE_AND_PROFILE_WITH_REMOVABLE_BLOCKOUT',interchangeabilityApproved:false}));
 const write=(p,x)=>fs.writeFileSync(path.join(out,p),JSON.stringify(x,null,2));write('register.json',{revision:'P38',stage:5,status:'GENERATED_PENDING_QA',setupCount:ss.length,physicalMouldCount:null,setups:ss.map(s=>({id:s.id,typicalId:s.typicalId,kind:s.kind,concreteKg:s.mass.concreteKg,dimensionsMm:s.cavity.dimensionsMm,usedBy:s.usedBy,folder:s.id})),reuseCandidates:reuse,engineeringApproved:false,productionReleased:false});write('product-mapping.json',{revision:'P38',products});
 const deps=[...sources,...cat.map(p=>'output/stage3-designs-p36/'+p.model),...new Set(refs.map(t=>t.source))];write('dependencies.json',{revision:'P38',sources:deps.map(p=>({path:p,sha256:hash(path.join(root,p))}))});
 for(const kind of [...new Set(ss.map(s=>s.kind))])for(const name of ['01-CAVITY','02-TOOLING']){const subset=ss.filter(s=>s.kind===kind);for(let k=0;k<subset.length;k+=8){const group=subset.slice(k,k+8),thumbs=await Promise.all(group.map(s=>sharp(path.join(out,s.id,name+'.png')).resize(800,567).toBuffer()));await sharp({create:{width:3200,height:1134,channels:3,background:'#fff'}}).composite(thumbs.map((input,i)=>({input,left:(i%4)*800,top:Math.floor(i/4)*567}))).png().toFile(path.join(out,`CONTACT-${kind}-${name}-${k/8+1}.png`));}}
 fs.writeFileSync(path.join(out,'README.md'),['# ขั้น5/8 — P38 แม่แบบฉบับวางแผน','','44setupตาม44Typical ไม่ใช่44แม่แบบที่ต้องสั่งซื้อ ไม่มีการอนุมัติผลิต/เท/ยก','แต่ละsetup: 00Typicalต้นทาง + 01ช่องหล่อ + 02ผิวแบบ/ประกอบ เป็นPNG/SVG และsetup.json','SVGประกอบด้วยภาพraster3Dและเส้น2D ไม่ใช่CAD solid/CNC/DXF/Revit-ready','','| Setup | Typical | kg คอนกรีต | แบบ |','|---|---|---:|---|',...ss.map(s=>`| ${s.id} | ${s.typicalId} | ${s.mass.concreteKg.toFixed(2)} | [ช่องหล่อ](${s.id}/01-CAVITY.png) · [แบ่งแบบ](${s.id}/02-TOOLING.png) · [Typical](${s.id}/00-TYPICAL.png) · [พิกัด/บัญชี](${s.id}/setup.json) |`),'','[บัญชีsetup](register.json) · [เชื่อม48แบบ](product-mapping.json) · [ต้นทาง](dependencies.json)','','ช่องหล่อเป็นnominal geometry ไม่ชดเชยหดตัว/โก่ง/ค่าคลาดเคลื่อน แบบผิวไม่มีความหนา ไม่ใช้ประเมินแรงดัน/กำลังแบบ/น้ำหนักแม่แบบ','ท่าหล่อเป็นข้อเสนอศึกษา: ซีกวางหน้าตัดปลายเพื่อเปิดด้านเท, แผงหล่อนอน, ครอบคงลาดเดิม ต้องยืนยันวิธีเทและเครื่องจักรก่อนออกแบบเครื่องมือ','แนวแบ่งเป็นกลุ่มผิว/patchเสนอ ไม่รับรองtool withdrawalหรือการยกชิ้นจริง ไม่มีพิกัดเจาะพุก/สลัก','ฐานร่วมS00/W01และS01/D01เป็นcandidate ต้องตรวจinterchangeabilityหลังออกแบบ; LH/RHไม่ถูกนับว่าใช้แม่แบบเดียวได้โดยอัตโนมัติ','ดูHOLDในsetup.jsonทุกชิ้น: ต้องออกแบบ/ตรวจแบบหล่อ เหล็ก embed พุก แผนเท กำลังถอด และการยกก่อนผลิต',''].join('\n'));
 return ss;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
