import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {out,start,finish,tx,renderFaces,cylinder} from './mould-hardware-p41.mjs';
const model=JSON.parse(fs.readFileSync(out+'/model.json'));
const source=JSON.parse(fs.readFileSync('output/stage5-moulds-p38/MF-C-H15-LH-W01-P05-P38/setup.json'));
const E=200000,pressure=.037125,H=1485;
function solve(A,b){const m=A.map((r,i)=>[...r,b[i]]),n=b.length;for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;[m[k],m[p]]=[m[p],m[k]];assert.ok(Math.abs(m[k][k])>1e-10,'singular beam');const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const d=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=d*m[k][j];}}return m.map(r=>r[n]);}
// Linear elastic continuous Euler-Bernoulli beam, exact uniform-load equivalent nodal forces.
export function beam(length,supports,I,q){const x=[...new Set([0,...supports,length])].sort((a,b)=>a-b),n=2*x.length,K=Array.from({length:n},()=>Array(n).fill(0)),F=Array(n).fill(0),elements=[];
 for(let i=0;i<x.length-1;i++){const L=x[i+1]-x[i],c=E*I/L**3,k=[[12,6*L,-12,6*L],[6*L,4*L*L,-6*L,2*L*L],[-12,-6*L,12,-6*L],[6*L,2*L*L,-6*L,4*L*L]].map(r=>r.map(v=>v*c)),f=[q*L/2,q*L*L/12,q*L/2,-q*L*L/12],ids=[2*i,2*i+1,2*i+2,2*i+3];ids.forEach((a,j)=>{F[a]+=f[j];ids.forEach((b,l)=>K[a][b]+=k[j][l]);});elements.push({L,k,f,ids});}
 const fixed=supports.map(p=>2*x.indexOf(p)),free=Array.from({length:n},(_,i)=>i).filter(i=>!fixed.includes(i)),u=Array(n).fill(0),sol=solve(free.map(a=>free.map(b=>K[a][b])),free.map(a=>F[a]));free.forEach((a,i)=>u[a]=sol[i]);const R=K.map((r,i)=>r.reduce((s,v,j)=>s+v*u[j],0)-F[i]);let maxMoment=0,maxDeflection=0;
 for(const e of elements){const d=e.ids.map(i=>u[i]),end=e.k.map((r,i)=>r.reduce((s,v,j)=>s+v*d[j],0)-e.f[i]);for(let j=0;j<=100;j++){const a=j/100,t=a*e.L,N=[1-3*a*a+2*a**3,e.L*(a-2*a*a+a**3),3*a*a-2*a**3,e.L*(-a*a+a**3)],v=N.reduce((s,n,i)=>s+n*d[i],0)+q*t*t*(e.L-t)**2/(24*E*I);maxMoment=Math.max(maxMoment,Math.abs(-end[1]+end[0]*t+q*t*t/2));maxDeflection=Math.max(maxDeflection,Math.abs(v));}}
 const reactions=supports.map(p=>({xMm:p,forceN:-R[2*x.indexOf(p)]}));assert.ok(Math.abs(reactions.reduce((s,r)=>s+r.forceN,0)-q*length)<1e-5);
 return {lengthMm:length,supportsMm:supports,lineLoadNmm:q,reactions,maxMomentNmm:maxMoment,maxDeflectionMm:maxDeflection,status:'ELASTIC_RIGID_SUPPORT_MODEL_NOT_FULL_MOULD'};
}
const bench=beam(1000,[0,1000],1e6,1);assert.ok(Math.abs(bench.maxMomentNmm-125000)<.01);assert.ok(Math.abs(bench.maxDeflectionMm-5*1000**4/(384*E*1e6))<1e-8);
const straight=[['M01',2425,[200,700,1200,1700,2200],12],['M04',2425,[200,700,1200,1850],20],['M03',1090,[200,650,1000],12],['M06',1090,[500,900],25]];
const ribs=straight.map(([id,L,s,t])=>{const b=beam(L,s,t*100**3/12,pressure*240);return {id,sectionMm:[100,t],...b,stressMPa:b.maxMomentNmm/(t*100**2/6),effectiveStationWidthsMm:b.reactions.map(r=>r.forceN/(pressure*240))};});
const stationDemand=[];for(const st of model.stations){const r=ribs.find(r=>r.id===st.parent),index=model.stations.filter(s=>s.parent===st.parent).findIndex(s=>s.id===st.id),width=r?r.effectiveStationWidthsMm[index]:st.parent==='M02'?400*Math.SQRT2:st.parent==='M05'?250*Math.SQRT2:162,F=pressure*width*H/1000,M=F*H/2/1000,run=st.runMm/1000,boltLever=st.parent==='M05'?.18:run,horizontal=F*.7425/1.2,axial=horizontal*Math.hypot(st.runMm,1100)/st.runMm,uplift=M/boltLever;
 stationDemand.push({id:st.id,parent:st.parent,effectiveWidthMm:width,horizontalServiceKN:F,overturningServiceKNm:M,idealBraceAxialKN:axial,idealBraceVerticalKN:horizontal*1100/st.runMm,baseCoupleTensionKN:uplift,perBoltTensionKN:Math.abs(uplift)/2,perBoltShearKN:Math.abs(F)/4,boltNetTensileStressMPa:Math.abs(uplift)*1000/2/353,footPlateMm:st.footPlateMm,footStripStressMPa:Math.abs(uplift)*1000/2*40/(120*st.footPlateMm**2/6),note:'service idealised demands; prying/weld/floor interaction and whole-frame stiffness not resolved'});}
const skin={spanMm:240,tMm:6,pressureKPa:37.125,stressMPa:.75*pressure*240**2/36,deflectionMm:5*pressure*240**4/(32*E*6**3)};
const maxStation=stationDemand.reduce((a,b)=>Math.abs(a.baseCoupleTensionKN)>Math.abs(b.baseCoupleTensionKN)?a:b);
const area=((80**2)-(68**2)),I=(80**4-68**4)/12,braceScreen=stationDemand.map(s=>{const st=model.stations.find(t=>t.id===s.id),L=Math.hypot(st.runMm,1100),euler=Math.PI**2*E*I/L**2/1000;return {id:s.id,axialStressMPa:Math.abs(s.idealBraceAxialKN)*1000/area,eulerPinnedKN:euler,nominalYieldKN:area*235/1000,note:'Euler/yield comparison only; not a code buckling design or weld check'};});
const stock=model.items.reduce((s,i)=>s+i.steelMassUpperBoundKg,0),cg=source.mass.concreteGeometricCgCastingMm;
const anchors=[[75,500,1485],[75,2300,1485],[1000,2750,1485]];
const fractions=solve([[1,1,1],anchors.map(a=>a[0]),anchors.map(a=>a[1])],[1,cg[0],cg[1]]);assert.ok(fractions.every(v=>v>0));
const lift={status:'DEMAND_AND_LAYOUT_STUDY_ONLY',candidateZoneCentresMm:anchors,notDrillingCoordinates:true,concreteOnlyMassKg:source.mass.concreteKg,concreteOnlyCgMm:cg,verticalReactionFractions:fractions,assumedTotalHandlingMassKg:2000,assumedBedAdhesionKPa:3,assumedDynamicFactor:1.3,notManufacturerApproved:true,reinforcementSizes:null,releaseConcreteStrengthMPa:null,anchorProduct:null,rotationDesignComplete:false};
const areaBed=source.mass.meshVolumeM3/1.485,total=(2000*9.80665/1000+3*areaBed)*1.3;lift.assumedLiftForceKN=total;lift.nominalPointVerticalDemandKN=fractions.map(f=>f*total);lift.craneSelection='capacity at actual working radius >= verified gross load incl lifting frame/slings; this model excludes rigging mass';
const result={revision:'P41-R00',skin,ribs,stationDemand,braceScreen,lift,modelSteelStockSumKg:stock,modelSteelWeightKN:stock*9.80665/1000,concreteOnlyWeightKN:source.mass.concreteKg*9.80665/1000,baseAreaM2:3.55*4.9,wholeMouldStrengthVerified:false,connectionStrengthVerified:false,floorVerified:false,codeComplianceClaim:false,limitations:['Continuous ribs assume rigid supports; frame flexibility not coupled','No weld group, local HSS wall, flange prying or repeated-use/fatigue verification','Stock sum includes overlapping welded member intersections and omits weld beads, paint, rigging and floor anchorage; not weighing certificate','Lifting point layout uses concrete-only CG and an assumed 2t handling envelope, not final reinforcement/embeds CG','No positive verification of steel lifting-lug alignment/stability; dedicated lifting fixture still needs design']};
fs.writeFileSync(out+'/engineering-review.json',JSON.stringify(result,null,2));
const n=v=>v.toFixed(2);
fs.writeFileSync(out+'/ENGINEERING-REVIEW.md',`# P41 — แบบแม่แบบพร้อมรายการตรวจที่ทำจริง

## ฐานข้อมูล

คงคอนกรีต150mm ตาม TS-C-H15-LH-W01-P05, ท่าหล่อสูง1485mm, เทจากด้านบนตามผู้ใช้ยืนยัน น้ำหนักคอนกรีตล้วน ${n(source.mass.concreteKg)} kg ไม่รวมเหล็ก/พุก งานเหล็กเสริมแสดงรูปร่างเท่านั้นตามคำตอบล่าสุด ไม่กำหนดขนาด

แรงดันสถิตฐาน 25×1.485=37.125 kPa ใช้กระจายสม่ำเสมอเต็มความสูงเป็น envelope สำหรับ screening นี้ ไม่ครอบคลุม pump/impact/vibration หรือ load combinations ทั้งหมด E200000MPa, nominal steel fy235MPa เป็นกรณีศึกษา ไม่ใช่ใบรับรองวัสดุ

## ผิวแบบและซี่โครง

ผิว6mm ช่วง240mm: stress=${n(skin.stressMPa)}MPa; elastic deflection=${n(skin.deflectionMm)}mm จากแถบรองรับสองด้าน

ซี่โครงตรวจเป็นคานต่อเนื่อง Euler-Bernoulli ตามพิกัดโครงหลังจริง มีช่วงยื่น ไม่หารแรงเท่ากันทุกสถานี Benchmark คานรองรับสองด้านผ่าน M=qL²/8 และ δ=5qL⁴/(384EI); ตรวจผลรวม reaction เท่ากับ applied load

| ชุด | ซี่ลึก×หนา mm | stress MPa | deflection mm | effective widths mm (อาจไม่เท่ากัน) |
|---|---|---:|---:|---|
${ribs.map(r=>`|${r.id}|${r.sectionMm.join('×')}|${n(r.stressMPa)}|${n(r.maxDeflectionMm)}|${r.effectiveStationWidthsMm.map(n).join(', ')}|`).join('\n')}

ผลนี้ยังไม่ใช่การโก่งรวมผิวแม่แบบ ไม่รวม frame flexibility, plate action, curvature torsion, welded connection flexibility หรือ strength combinations

## แรงรายสถานีและจุดล็อก

| สถานี | แรงแนวนอน kN | โมเมนต์ฐาน kNm | ค้ำ axial kN | แรงดึงต่อ M24 kN | stress แถบฐานเท้า MPa |
|---|---:|---:|---:|---:|---:|
${stationDemand.map(s=>`|${s.id}|${n(s.horizontalServiceKN)}|${n(s.overturningServiceKNm)}|${n(s.idealBraceAxialKN)}|${n(s.perBoltTensionKN)}|${n(s.footStripStressMPa)}|`).join('\n')}

แรงค้ำเป็นแบบ idealised pin-triangle ไม่ใช่ผล whole-frame solver; base tension ใช้ moment/ระยะแถวโบลต์ แบ่งแรงดึงสองตัวและแรงเฉือนสี่ตัวเพื่อตรวจตั้งต้น ต้องตรวจ prying และความแข็งของฐานจริง ไม่รายงานว่าจุดต่อผ่านทั้งหมด

สถานีที่ให้แรงคู่ดึงฐานสูงสุด: ${maxStation.id}; ต้องออกแบบ local base plate, stiffener, weld, thread engagement และจุดถ่ายแรงลงฐานต่อจากแรงเหล่านี้ แผ่นฐานเท้าในภาพยังเป็นขนาดพัฒนา ไม่ใช่ขนาดที่อนุมัติแล้ว

## ฐานโรงงาน

มวลรวมชิ้นเหล็กที่จำลองแบบ stock-sum ≈${n(stock)}kg (มีการนับซ้อนที่รอยตัดเชื่อม และยังไม่รวมงานเชื่อม/สี/อุปกรณ์ยก) น้ำหนักร่วมคอนกรีตล้วน ≈${n((stock+source.mass.concreteKg)*9.80665/1000)}kN พื้นที่ฐาน17.395m² ให้ค่าเฉลี่ยเพียง ${n((stock+source.mass.concreteKg)*9.80665/1000/(3.55*4.9))}kPa **ห้ามนำค่าเฉลี่ยนี้ไปแทนแรงกดใต้ซี่/แรงยึดเฉพาะจุด** เพราะมี local uplift และแรงคู่ควบจากแต่ละชุดแบบ

ยังไม่มีความหนา/กำลัง/เหล็กพื้นโรงงาน คำตอบผู้ใช้เรื่องความหนาขั้น2หมายถึง Segment ไม่ใช่พื้นโรงงาน จึงยังอนุมัติฐานรองรับหรือพุกพื้นไม่ได้

## ระบบยกคอนกรีต — รูปแบบและ demand

เสนอศึกษา lifting frame สามจุดที่ให้ขาสลิงแนวดิ่งเหนือ solid zones; จุดในรูปเป็นศูนย์โซนศึกษา ไม่ใช่ตำแหน่งเจาะ/พุกที่เลือกแล้ว คำนวณ reaction จากสมดุลสามจุดกับ CG คอนกรีตล้วน ไม่แบ่งเท่ากัน

สัดส่วนแรงสามจุด: ${fractions.map(v=>n(100*v)+'%').join(' / ')}; sensitivity case มวลรวม2.0t, adhesion3kPa ที่พื้นสัมผัส${n(areaBed)}m², dynamic factor1.3 ให้ demand ${lift.nominalPointVerticalDemandKN.map(n).join(' / ')}kN ต่อจุด ค่า adhesion/dynamic นี้เป็นสมมติฐาน ไม่ใช่ค่าที่ผู้ผลิตยืนยัน ต้องคำนวณใหม่เมื่อเลือกพุก เหล็ก และทราบกำลังคอนกรีตตอนยก

ยังไม่ออกแบบการพลิกชิ้นเป็นท่าติดตั้งหรือเลือกผลิตภัณฑ์พุก เพราะเหล็กเสริมและกำลังยกยังไม่กำหนดโดยเจตนาตามขอบเขตปัจจุบัน หูยกเหล็ก20mm/รู32ในโมเดลเป็นตำแหน่งพัฒนาเท่านั้น ต้องตรวจ CG ขณะยกแต่ละแม่แบบ การเอียงของชิ้น ข้อต่อและรอยเชื่อม ไม่ใช้หูที่แสดงสั่งยก

## สิ่งที่ปิดได้ / ยังปิดไม่ได้

- มีโมเดลชิ้นเหล็กจริงในระดับพัฒนา รู nominal, ตัวจับหน้าต่าง และลำดับปลด ไม่ใช่การสร้างภาพหลอก
- ตรวจ static solids และ continuous translations ตามรายงาน JSON แยก ไม่ขยายผลไปยัง wrench access/rigging/parking หรือกำลังรับแรง
- มีรายการ demand และ elastic screening ข้างต้น แต่ **ยังไม่ครบ strength design ของแม่แบบและระบบยก** โดยเฉพาะ foot plate/weld/prying, ความแข็งแรงรวมและพื้นโรงงาน
- รูปเหล็ก RF01–05 ไม่มีขนาด/spacing/cover/BBS ตามผู้ใช้สั่ง เป็น deliverable รูปทรง ไม่ใช่เหล็กรับแรงที่ผ่านคำนวณ

อ้างขอบเขตแรงดันจาก [PERI](https://apps.peri.com/SLR/index.php?lang=en&norm=csa%2F1000) และเงื่อนไขเลือกอุปกรณ์ยกจาก [HALFEN technical documentation](https://www.halfen.com/en-DE/products/lifting-bracing/hd-socket-lifting-anchors) ไม่อ้างว่าเอกสารเหล่านี้รับรองแบบโครงการ ไม่ได้ทำ code compliance check วสท./AISC
`);
let svg=start('09 | LIFTING LAYOUT STUDY / THREE VERTICAL REACTIONS','รูปแบบระบบยกและทิศแรงเท่านั้น · ยังไม่เลือกพุก/สลิง/ขนาดคานยก · ไม่ใช่แผนยกที่อนุมัติ');const ff=model.concreteFacesMm.map(face=>({face,color:'#c0c3c5'}));anchors.forEach((a,i)=>{ff.push(...cylinder(a,[...a.slice(0,2),2700],7).map(face=>({face,color:'#d09831'})));const b=anchors[(i+1)%3];ff.push(...cylinder([...a.slice(0,2),2700],[...b.slice(0,2),2700],10).map(face=>({face,color:'#326c94'})));ff.push(...cylinder([...a.slice(0,2),2700],[cg[0],cg[1],3550],5).map(face=>({face,color:'#81a0b5'})));});svg+=renderFaces(ff,25,145,1450,1370,true);
['คอนกรีตล้วน '+n(source.mass.concreteKg)+' kg','CG ไม่รวมเหล็ก/พุก/งานฝัง','แนวสามจุดอยู่ในโซนคอนกรีตทึบ','สัดส่วนแรง ≠ 1/3 เท่ากันทุกจุด',...fractions.map((f,i)=>`จุด ${i+1}: ${n(100*f)}% / กรณีศึกษา ${n(lift.nominalPointVerticalDemandKN[i])} kN`),'ตัวเลขจากกรณีสมมติ2t/adhesion/dynamic','เส้นคาน/สลิงใช้แสดงระบบ ไม่ใช่หน้าตัด','ต้องกำหนดกำลังยกและเหล็กก่อนเลือกพุก','การพลิก/ขนส่งยังไม่ผ่านการออกแบบ'].forEach((t,i)=>svg+=tx(1500,220+i*105,t,24,i>6?'#a34927':'#112f50'));
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');fs.writeFileSync(out+'/09-LIFTING-STUDY.svg',svg+finish());await sharp(Buffer.from(svg+finish())).png().toFile(out+'/09-LIFTING-STUDY.png');
console.log(JSON.stringify({skin,ribs:ribs.map(r=>({id:r.id,stress:r.stressMPa,deflection:r.maxDeflectionMm})),maxStation,lift,stockKg:stock}));
function dim(x1,y1,x2,y2,label){return `<path d="M${x1},${y1}L${x2},${y2}" stroke="#173e60" stroke-width="2"/><circle cx="${x1}" cy="${y1}" r="4" fill="#173e60"/><circle cx="${x2}" cy="${y2}" r="4" fill="#173e60"/>`+tx((x1+x2)/2+12,(y1+y2)/2-10,label,21);}
function cut(cell,y){const pts=[];for(const f of cell)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length];if(Math.abs(a[1]-y)<1e-6)pts.push([-a[0],a[2]]);if((a[1]-y)*(b[1]-y)<0){const t=(y-a[1])/(b[1]-a[1]);pts.push([-(a[0]+t*(b[0]-a[0])),a[2]+t*(b[2]-a[2])]);}}const unique=pts.filter((p,i)=>!pts.slice(0,i).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5));if(unique.length<3)return [];const c=unique.reduce((a,p)=>[a[0]+p[0]/unique.length,a[1]+p[1]/unique.length],[0,0]);return unique.sort((a,b)=>Math.atan2(a[1]-c[1],a[0]-c[0])-Math.atan2(b[1]-c[1],b[0]-c[0]));}
let ds=start('10 | DIMENSION REVIEW — PLAN + SECTION','หน่วย mm · รูปตัดจาก solids ของ M01 ที่ Y700 · มิติพัฒนาแม่แบบ ไม่ใช่ Shop Drawing ที่อนุมัติ');ds+=tx(45,170,'A | M01 SECTION / Y=700',28);const project=([n,z])=>[230+n*.7,1300-z*.65];
ds+=`<polygon points="${[[0,0],[-150,0],[-150,1485],[0,1485]].map(project).map(p=>p.join(',')).join(' ')}" fill="#d0d2d4" stroke="#566d80"/>`;
for(const c of model.items.find(p=>p.id==='M01').cells){const p=cut(c,700);if(p.length)ds+=`<polygon points="${p.map(project).map(p=>p.join(',')).join(' ')}" fill="#407ca0" stroke="#23455d" stroke-width=".8"/>`;}
ds+=dim(110,1300,110,334.75,'1485 cavity')+dim(805,1300,805,256.75,'1605 mould')+dim(339.2,1375,689.2,1375,'500 frame run')+dim(900,1235,900,520,'1100 rise')+tx(45,1450,'คอนกรีต150 / ผิวแบบ6 / ซี่100×12 / โครง100×100×6',22)+tx(45,1490,'ฐานเท้า40อยู่นอกแนวตัด; รูยึดและตำแหน่งดูแปลน/โมเดล',22);
ds+=tx(1130,170,'B | BED PLAN / LOCK POSITIONS',28);const plan=([x,y])=>[1300+(x+1100)*.22,1450-(y+1000)*.22];const bp=[[-1100,-1000],[2450,-1000],[2450,3900],[-1100,3900]].map(plan);ds+=`<polygon points="${bp.map(p=>p.join(',')).join(' ')}" fill="#eef2f5" stroke="#183b59" stroke-width="2"/>`;
for(const c of model.concreteCollisionCells.filter(c=>c.z1===1485))ds+=`<polygon points="${c.poly.map(plan).map(p=>p.join(',')).join(' ')}" fill="#b7bdc3" stroke="#6f8797"/>`;
for(const l of model.locks.filter(l=>l.id.startsWith('LK'))){const [x,y]=plan(l.positionMm);ds+=`<circle cx="${x}" cy="${y}" r="3.8" fill="#b98223"/>`;}
ds+=dim(bp[0][0],1510,bp[1][0],1510,'3550 bed')+dim(2190,bp[1][1],2190,bp[2][1],'4900 bed')+tx(1130,230,'จุดสีทอง = LK โบลต์ฐาน72ตำแหน่ง',23)+tx(1130,275,'กรอบช่องหล่อ XY1490×2825; พิกัดครบใน model.json',23)+tx(1130,320,'ฐานเท้า40 / รูØ26; ฐานหล่อ30; รองฐานลึก200',23);
fs.writeFileSync(out+'/10-DIMENSIONS.svg',ds+finish());await sharp(Buffer.from(ds+finish())).png().toFile(out+'/10-DIMENSIONS.png');
