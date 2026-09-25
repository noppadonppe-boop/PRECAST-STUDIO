import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {root,hash,volumeCg} from './stage5-p38.mjs';
import {raster} from './drawing-raster-p36.mjs';

export const out=path.join(root,'output/concrete-lift-p52');
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function pointInPolygon(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[j],b=poly[i],d=sub(b,a),q=sub(p,a),l=dot(d,d),t=l?dot(q,d)/l:0;
 if(t>=0&&t<=1&&Math.hypot(q[0]-t*d[0],q[1]-t*d[1])<1e-7)return true;
 if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;}
export function verticalMesh(faces){const planes=[];for(const f of faces){let n=[0,0,0];for(let i=1;i<f.length-1;i++){n=cross(sub(f[i],f[0]),sub(f[i+1],f[0]));if(Math.hypot(...n)>1e-7)break;}if(Math.abs(n[2])<1e-8)continue;planes.push({f,n,xy:f.map(v=>v.slice(0,2)),d:dot(n,f[0])});}
 return (x,y)=>{const zz=planes.filter(f=>pointInPolygon([x,y],f.xy)).map(f=>(f.d-f.n[0]*x-f.n[1]*y)/f.n[2]).sort((a,b)=>a-b);const z=zz.filter((v,i)=>i===0||Math.abs(v-zz[i-1])>1e-5);if(z.length%2)return [];return Array.from({length:z.length/2},(_,i)=>[z[i*2],z[i*2+1]]);};}
export function fractions(p,cg){const [a,b,c]=p,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-6)return null;const f1=((b[1]-c[1])*(cg[0]-c[0])+(c[0]-b[0])*(cg[1]-c[1]))/den,f2=((c[1]-a[1])*(cg[0]-c[0])+(a[0]-c[0])*(cg[1]-c[1]))/den;return [f1,f2,1-f1-f2];}
export function inSolid(ray,p){return ray(p[0],p[1]).some(([a,b])=>p[2]>a+1e-5&&p[2]<b-1e-5);}
export function build(s,source){
 const dims=s.cavity.dimensionsMm,cg=s.mass.concreteGeometricCgCastingMm,ray=verticalMesh(s.cavity.facesMm),r=Math.min(45,s.cavity.normalThicknessMm*.3),raw=[];
 // Candidate clearance is a geometric sampling radius, NOT a manufacturer's edge distance.
 for(let ix=0;ix<41;ix++)for(let iy=0;iy<41;iy++){
  const x=dims[0]*(ix+.5)/41,y=dims[1]*(iy+.5)/41,segments=ray(x,y);if(!segments.length)continue;
  const [bot,z]=segments.at(-1);if(z-bot<50)continue;
  const probes=Array.from({length:16},(_,i)=>[x+r*Math.cos(i*Math.PI/8),y+r*Math.sin(i*Math.PI/8)]);
  if(!probes.every(([u,v])=>ray(u,v).some(([b,t])=>z-25>b&&z-25<t)))continue;
  raw.push([x,y,z]);
 }
 assert.ok(raw.length>=3,`No solid candidate zones ${s.id}`);
 // Spatially distribute a finite candidate subset; no claim of an optimal engineering layout.
 const candidates=[raw.reduce((a,b)=>Math.hypot(...sub(a,cg))<Math.hypot(...sub(b,cg))?a:b)];
 while(candidates.length<Math.min(64,raw.length)){
  let best=null,score=-1;for(const p of raw){if(candidates.includes(p))continue;const d=Math.min(...candidates.map(q=>((q[0]-p[0])/dims[0])**2+((q[1]-p[1])/dims[1])**2));if(d>score){score=d;best=p;}}candidates.push(best);
 }
 let chosen=null,score=-1;
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)for(let k=j+1;k<candidates.length;k++){
  const points=[candidates[i],candidates[j],candidates[k]],f=fractions(points,cg);if(!f||Math.min(...f)<.12)continue;
  const area=Math.abs((points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[1][1]-points[0][1])*(points[2][0]-points[0][0]))/2;
  const quality=area*(.2+Math.min(...f));if(quality>score){score=quality;chosen={points,fractions:f,triangleAreaMm2:area};}
 }
 assert.ok(chosen,`No positive three-point system ${s.id}`);
 const bars=[];for(const [i,p]of chosen.points.entries())for(const axis of [0,1]){
  const top=ray(p[0],p[1]).at(-1),depth=Math.min(160,(top[1]-top[0])*.45),w=r*.55;
  const a=[...p],b=[...p],c=[...p],d=[...p];a[axis]-=w;b[axis]-=w;c[axis]+=w;d[axis]+=w;
  a[2]-=20;d[2]-=20;b[2]-=depth;c[2]-=depth;
  const points=[a,b,c,d];let checked=0;for(let k=0;k<3;k++){const n=Math.ceil(Math.hypot(...sub(points[k+1],points[k]))/5);for(let j=0;j<=n;j++){const t=j/n,q=points[k].map((v,l)=>v+(points[k+1][l]-v)*t);assert.ok(inSolid(ray,q),`Bar route outside source ${s.id}`);checked++;}}
  bars.push({id:`RF-L${i+1}-${axis?'Y':'X'}`,role:'LOCAL_U_ROUTE_SYMBOL_NOT_BENDING_SCHEDULE',pointsMm:points,diameterMm:null,spacingMm:null,bendRadiusMm:null,developmentLengthMm:null,coverMm:null,sampleIntervalMaxMm:5,checkedPointCount:checked});
 }
 const mass=s.mass.concreteKg,weight=mass*9.80665/1000;
 const scenarios=[{id:'G-CONCRETE',totalKN:weight,additionalMassFraction:0,dynamicFactor:1},{id:'SENS-10-130',totalKN:weight*1.1*1.3,additionalMassFraction:.1,dynamicFactor:1.3}].map(c=>({...c,verticalDemandKN:chosen.fractions.map(f=>f*c.totalKN),forceResidualKN:chosen.fractions.reduce((a,f)=>a+f*c.totalKN,0)-c.totalKN,momentResidualKNmm:[0,1].map(k=>chosen.points.reduce((a,p,i)=>a+p[k]*chosen.fractions[i]*c.totalKN,0)-cg[k]*c.totalKN)}));
 const frameZ=dims[2]+Math.max(400,Math.max(...dims.slice(0,2))*.3);
 return {revision:'P52',id:s.id,typicalId:s.typicalId,kind:s.kind,source:{path:source,sha256:hash(path.join(root,source))},decision:'knowledge/modular-program-r02/decision-lifting-p52.json',usedBy:s.usedBy,status:'DEVELOPMENT_LAYOUT_WITH_ASSUMED_CONCRETE_CAPACITY',units:{length:'mm',mass:'kg',force:'kN'},castingDimensionsMm:dims,concreteOnlyMassKg:mass,concreteOnlyCgMm:cg,meshVolumeM3:volumeCg(s.cavity.facesMm).volumeM3,assumedConcreteLiftingCapacity:'SUFFICIENT_FOR_DEVELOPMENT_ONLY',verifiedConcreteCapacityKN:null,anchorProduct:null,anchorCapacityKN:null,notDrillingCoordinates:true,candidateZoneCentresMm:chosen.points,reactionFractions:chosen.fractions,triangleAreaMm2:chosen.triangleAreaMm2,zoneSampleRadiusMm:r,zoneRadiusIsNotRequiredEdgeDistance:true,reinforcementRoutes:bars,scenarios,rigging:{system:'THREE_VERTICAL_DROPS_FROM_PURPOSE_DESIGNED_LIFTING_FRAME',frameNodePositionsMm:chosen.points.map(p=>[p[0],p[1],frameZ]),masterHookProjectionMm:cg.slice(0,2),frameAndSlingsSelfWeightKg:null,frameSections:null,capacityVerified:false},applicableState:'FREE_SUSPENSION_IN_CASTING_ORIENTATION_AFTER_ALL_MOULD_CONTACT_RELEASED',excluded:['adhesion / suction / breakaway','rotation / tilting / erection','actual reinforcement and embed mass or shifted CG','steel mould lifting','anchor product edge distance / embedment / cage development length','crane / rigging / frame self-weight and capacity'],geometricQa:'Candidate ring at z-25 sampled at 16 angles; rebar centreline sampled <=5mm. Not tolerance/cover or full swept-volume verification.',engineeringApproved:false,productionReleased:false};
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const tx=(x,y,t,size=22,color='#102e50')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(t)}</text>`;
const num=v=>v.toFixed(1);
export function board(s,m){
 const W=2200,H=1550,project=([x,y,z])=>[(x-y)*.866,-(x+y)*.34-z],all=[...s.cavity.facesMm.flat(),...m.rigging.frameNodePositionsMm],p=all.map(project),min=[0,1].map(k=>Math.min(...p.map(v=>v[k]))),max=[0,1].map(k=>Math.max(...p.map(v=>v[k]))),scale=Math.min(1070/(max[0]-min[0]),900/(max[1]-min[1])),map=v=>project(v).map((x,k)=>(x-min[k])*scale+[70,200][k]);
 const faceImg=raster(s.cavity.facesMm.map(face=>({face,color:'#bfc2c3'})),1170,1160,map,([x,y,z])=>x+y-z*.68);
 const pathLine=(pts,color,width=3,dash='')=>`<polyline points="${pts.map(map).map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
 let v=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="white"/><g font-family="Tahoma,Arial,sans-serif">`;
 v+=tx(35,55,'P52 | CONCRETE LIFTING & REBAR ROUTES',40)+tx(35,99,m.id,28)+tx(35,140,'แนวเหล็กไม่ระบุขนาด · สมมติกำลังคอนกรีตเพียงพอเพื่อพัฒนาแบบ · ท่าหล่อเดิม',22);
 v+=`<image x="0" y="0" width="1170" height="1160" href="${faceImg}"/>`;
 m.candidateZoneCentresMm.forEach((a,i)=>{v+=pathLine([a,m.rigging.frameNodePositionsMm[i]],'#c08b29',4);const p=map(a);v+=`<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="#d09b32"/>`+tx(p[0]+12,p[1]-10,'L'+(i+1),22);});
 v+=pathLine([...m.rigging.frameNodePositionsMm,m.rigging.frameNodePositionsMm[0]],'#19466c',8);
 const cg=map(m.concreteOnlyCgMm);v+=`<circle cx="${cg[0]}" cy="${cg[1]}" r="10" fill="white" stroke="#8a3030" stroke-width="3"/>`+tx(cg[0]+15,cg[1]+7,'CG',22,'#8a3030');
 for(const b of m.reinforcementRoutes)v+=pathLine(b.pointsMm,'#bf751b',2,'5 3');
 v+=tx(45,1135,'แนว U เส้นประ = X-ray แสดงเหล็กภายในเชิงสัญลักษณ์ ไม่ใช่เหล็กที่มองเห็นภายนอก',19);
 v+=tx(45,1170,'3D จากผิวคอนกรีตต้นทาง / เส้นสีน้ำเงิน = ระบบคานยกเชิงผัง ไม่ใช่ขนาดเหล็ก',20);
 v+=tx(1220,215,'A | น้ำหนักและแรงยกแนวดิ่ง',29)+tx(1220,260,`คอนกรีตล้วน ${num(m.concreteOnlyMassKg)} kg`,25)+tx(1220,301,`CG = ${m.concreteOnlyCgMm.map(num).join(', ')} mm`,22);
 v+=tx(1220,345,'จุด    X / Y / Z (mm)                 G (kN)',21);
 m.candidateZoneCentresMm.forEach((a,i)=>v+=tx(1220,390+i*43,`L${i+1}   ${a.map(num).join(' / ')}     ${m.scenarios[0].verticalDemandKN[i].toFixed(2)}`,21));
 v+=tx(1220,544,'จุดเป็นโซนศึกษา ไม่ใช่พิกัดเจาะติดตั้งพุก',23,'#9b6120')+tx(1220,590,'สัดส่วนแรง: '+m.reactionFractions.map(v=>num(v*100)+'%').join(' / '),22);
 v+=tx(1220,645,'B | แนวเหล็กเฉพาะจุดยก — รูปทรงเท่านั้น',27);
 // Enlarged local schematic deliberately dimensionless; not a manufacturer cage.
 v+=`<rect x="1230" y="680" width="450" height="290" rx="8" fill="#f0f2f3" stroke="#9cabba"/><path d="M1320 725 V900 Q1320 935 1355 935 H1515 Q1550 935 1550 900 V725" fill="none" stroke="#b98123" stroke-width="9"/><path d="M1435 700 V850" stroke="#173f61" stroke-width="6" stroke-dasharray="10 6"/>`;
 v+=tx(1710,735,'RF-Lx-X / Y',23)+tx(1710,780,'แนว U สองทิศ',22)+tx(1710,825,'ไม่ใช่ BBS / จำนวนจริง',21)+tx(1710,870,'ไม่กำหนด Ø / spacing',21)+tx(1710,915,'ระยะฝัง/ดัด: ยังไม่กำหนด',21);
 v+=tx(1220,1010,'เส้นทางพิกัดเชิงสัญลักษณ์อยู่ใน JSON รายชิ้น',22)+tx(1220,1053,'ตรวจจุดตัวอย่างตามแนวในเนื้อคอนกรีต ไม่ใช่ตรวจ cover',21);
 v+=tx(45,1240,'C | ขอบเขตกรณีศึกษา',28)+tx(45,1285,'ยกแนวดิ่งหลังปลดแบบและแรงยึดติดหมดแล้ว · ไม่ครอบคลุมดึงให้หลุดแบบ พลิกชิ้น หรือยกตั้ง',23);
 v+=tx(45,1330,`Sensitivity: มวลเพิ่ม10% ณ CG เดิม ×1.30 → ${m.scenarios[1].verticalDemandKN.map(v=>v.toFixed(2)).join(' / ')} kN (ไม่ใช่ตัวคูณโค้ด/พิกัดอุปกรณ์)`,22);
 v+=`<rect x="25" y="1390" width="2150" height="125" fill="#fff0d7"/>`+tx(45,1434,'DEVELOPMENT ONLY — ไม่อนุมัติยกจริง / ไม่ใช่การตรวจผ่านพุก สลิง คานยก หรือเครน',26,'#8b492c')+tx(45,1480,'คง Typical เดิม · ไม่มีการเติมขนาดเหล็กเสริม · ยังต้องประสานรายละเอียดระบบพุกและเหล็กจริงก่อนใช้งาน',23,'#8b492c');
 return v+'</g></svg>';
}
export async function generate(){fs.mkdirSync(out,{recursive:true});const reg=JSON.parse(fs.readFileSync(path.join(root,'output/stage5-moulds-p38/register.json'))),records=[],sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
 for(const r of reg.setups){const source=`output/stage5-moulds-p38/${r.folder}/setup.json`,s=JSON.parse(fs.readFileSync(path.join(root,source))),m=build(s,source),svg=board(s,m);fs.writeFileSync(path.join(out,r.id+'.json'),JSON.stringify(m,null,2));fs.writeFileSync(path.join(out,r.id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,r.id+'.png'));records.push({id:r.id,typicalId:r.typicalId,kind:r.kind,concreteKg:m.concreteOnlyMassKg,source,sourceSha256:m.source.sha256,files:['png','svg','json'].map(ext=>({path:`output/concrete-lift-p52/${r.id}.${ext}`,sha256:hash(path.join(out,r.id+'.'+ext))}))});console.log(r.id);}
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify({revision:'P52',stage:5,scope:'44 concrete free-suspension development layouts, not complete Stage 5',decisionSha256:hash(path.join(root,'knowledge/modular-program-r02/decision-lifting-p52.json')),generatorSha256:hash(fileURLToPath(import.meta.url)),records,engineeringApproved:false,productionReleased:false},null,2));
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="th"><meta charset="utf-8"><title>P52 Concrete lifting development</title><style>body{font:16px Tahoma;background:#f4f6f8;color:#123552;margin:30px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}article{background:white;padding:15px}img{width:100%}a{color:#164e85}</style><h1>ขั้น 5 — โซนยกและแนวเหล็กคอนกรีต 44 ชิ้น</h1><p>สมมติกำลังคอนกรีตเพียงพอเพื่อพัฒนาแบบตามผู้ใช้ ไม่ใช่แบบยกจริงหรือขั้น5ครบ100%</p><main>${records.map(r=>`<article><h3>${r.id}</h3><a href="${r.id}.png"><img loading="lazy" src="${r.id}.png"></a><p><a download href="${r.id}.png">PNG</a> · <a download href="${r.id}.svg">SVG</a> · <a download href="${r.id}.json">ข้อมูล/แรง/แนวเหล็ก</a></p></article>`).join('')}</main></html>`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await generate();
