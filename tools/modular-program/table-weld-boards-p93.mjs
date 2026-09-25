import fs from 'node:fs';
import {createRequire} from 'node:module';
import {families,out,read,sha,makeCandidate,rectangularWeld} from './table-weld-p93.mjs';
import {rect,drilled,tube,render} from './prism-tools-p54.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const text=(x,y,s,size=22,fill='#173458')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${s}</text>`;
const image=(data,x,y,w,h)=>`<image href="${data}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
function detail(){
 const parts=[{cells:[rect(-80,80,0,6,0,175)],color:'#bbc7d2'},
 {cells:tube(0,[-80,6,60],[80,56,110],4),color:'#1e4b72'},
 {cells:drilled(rect(-40,40,6,110,0,12),0,80),color:'#325d83'},
 {cells:[rect(-3,3,16,50,12,60)],color:'#1e4b72'}];
 for(const w of [rectangularWeld(12),rectangularWeld(60,true)])for(const faces of w.solids)parts.push({faces,color:'#e9aa36'});
 return render(parts,800,520);
}
const localDetail=detail(),assets=[];
for(const family of families){
 const r=read(`${out}/${family}.json`),candidate=makeCandidate(family),[L,W,H]=r.cavityMm;
 const overview=render([...candidate.parts.filter(p=>/^M0/.test(p.id)).map(p=>({faces:p.solids.flat(),color:p.id==='M00'?'#55738d':'#234f76'})),...candidate.welds.map(w=>({faces:w.nominalSolids.flat(),color:'#d99b28'}))],830,440);
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1800"><rect width="1800" height="1800" fill="white"/><g font-family="Arial">`;
 s+=text(36,52,`P93 | TABLE MOULD WELD DETAIL — ${family}`,36)+text(36,93,`Cavity ${L} x ${W} x ${H} mm | 12 lock stations | source Typical unchanged`,23);
 s+=`<rect x="24" y="120" width="850" height="580" rx="8" fill="#f7f9fc" stroke="#b9c6d4"/><rect x="894" y="120" width="882" height="580" rx="8" fill="#f7f9fc" stroke="#b9c6d4"/>`;
 s+=text(42,158,'A | CANDIDATE ASSEMBLY',26)+image(overview,34,170,825,440)+text(42,637,'Navy: original steel / amber: proposed weld envelope',20)+text(42,669,'Fasteners omitted in view; unchanged in model. Frame welds excluded.',18);
 s+=text(914,158,'B | LOCAL LOCK DETAIL — CLIPPED TANGENT VIEW',24)+image(localDetail,920,167,820,480)+text(914,677,'Skin / RHS shown only over160mm. No physical cut specified.',19);
 s+=`<rect x="24" y="720" width="850" height="580" rx="8" fill="#fff" stroke="#b9c6d4"/><rect x="894" y="720" width="882" height="580" rx="8" fill="#fff" stroke="#b9c6d4"/>`;
 s+=text(42,760,'C | LOCAL SECTION — u OUTWARD / z UP',25);
 const k=2.0,X=u=>100+u*k,Y=z=>1190-z*k;
 const box=(u,z,w,h,fill)=>`<rect x="${X(u)}" y="${Y(z+h)}" width="${w*k}" height="${h*k}" fill="${fill}" stroke="#173458"/>`;
 s+=box(0,0,6,175,'#c9d4df')+box(6,60,50,50,'#2a5378')+box(10,64,42,42,'white')+box(16,12,34,48,'#87a0b6')+box(6,0,65,12,'#87a0b6')+box(89,0,21,12,'#87a0b6');
 s+=`<line x1="${X(80)}" y1="${Y(-8)}" x2="${X(80)}" y2="${Y(38)}" stroke="#ba8a27" stroke-dasharray="5 4"/>`;
 for(const z of [12,60])for(const u of [16,50])s+=`<circle cx="${X(u)}" cy="${Y(z)}" r="5" fill="#dfa52e"/>`;
 s+=text(380,832,'Skin t6; cavity on u &lt; 0 side',20)+text(380,872,'RHS50 x 50 x 4, u6–56 / z60–110',20)+text(380,912,'WR: all-round root, a3 at z60',20)+text(380,952,'Web34 x 48 x 6, u16–50 / z12–60',20)+text(380,992,'WF: all-round root, a3 at z12',20)+text(380,1032,'Foot104 x 80 x 12; hole18 at u80',20)+text(380,1072,'Web-to-skin gap10mm (not a weld)',20)+text(380,1112,'a3 = throat3; equal-leg4.243mm',20);
 s+=text(60,1253,'WR / WF are closed80mm roots around6 x34mm web footprint.',20)+text(60,1280,'No structural credit for short foot-to-skin beads. Not to scale.',19);
 s+=text(914,760,'D | LOCK LOCATIONS — CASTING XY DATUM',24);
 const ps=Math.min(760/(L+240),385/(W+240)),px=944+(760-(L+240)*ps)/2,py=1200,x=v=>px+(v+120)*ps,y=v=>py-(v+120)*ps;
 s+=`<rect x="${x(-120)}" y="${y(W+120)}" width="${(L+240)*ps}" height="${(W+240)*ps}" fill="#e6edf4" stroke="#305475"/><rect x="${x(0)}" y="${y(W)}" width="${L*ps}" height="${W*ps}" fill="white" stroke="#7290a7" stroke-dasharray="7 4"/>`;
 for(const p of candidate.sourceModel.lockSchedule){const stagger=(L+240)*ps<400&&['M01','M02'].includes(p.parent)&&Math.floor((Number(p.id.slice(2))-1)/2)%2===1?20:0;s+=`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="5" fill="#d79721"/>`+text(x(p.x)+7,y(p.y)-8-stagger,p.id,15);}
 s+=text(914,1247,'Source bolt/hole locations retained; coordinates in JSON/CSV.',19)+text(914,1277,`${r.sourceSetups.length} setup slot(s) mapped to this size; not a physical tool count.`,19);
 s+=text(36,1350,'E | PRESSURE-ONLY WELD METAL CHECK / INSPECTION POINTS',25);
 s+=text(44,1393,`Max WR/WF ratio ${r.summary.maxStationWeldRatio.toFixed(4)} | max skin/RHS seam ratio ${r.summary.maxSkinSeamRatio.toFixed(4)}`,24);
 s+=text(44,1432,'a3, proposed fu360MPa / beta0.8 / gamma1.25. Ideal support cases; multipliers1 and1.5.',21);
 s+=text(44,1471,'Ratio below1 is NOT bracket, bolt, RHS-wall, fatigue, lifting or complete-mould approval.',21);
 s+=text(44,1515,'1  Check web trim and10mm gap; do not move hole or cavity face.',21);
 s+=text(44,1551,'2  Inspect continuous WR/WF throat including corners; gauge before access is obstructed.',21);
 s+=text(44,1587,'3  Long skin/RHS seams:6mm end deduction. Joint-end termination/WPS review remains.',21);
 s+=text(44,1623,'4  Confirm actual RHS corner profile, distortion, material certificates and weld procedure.',21);
 s+=text(44,1659,`Nominal minimum new-weld clearance ${r.geometry.nominalClearance.webToSkinBeadMm.toFixed(3)}mm; tolerance stack NOT included.`,21);
 s+=`<line x1="30" y1="1700" x2="1770" y2="1700" stroke="#173458"/>`+text(36,1739,'STAGE 5 / 8 — DEVELOPMENT CANDIDATE. NOT FOR FABRICATION, CASTING OR LIFTING.',23)+text(36,1774,'P47/P51 source models preserved. This board is source-coordinate geometry, not an AI illustration.',19)+'</g></svg>';
 fs.writeFileSync(`${out}/${family}-board.svg`,s);await sharp(Buffer.from(s)).png().toFile(`${out}/${family}-board.png`);
 const header='station,x_mm,y_mm,parent,role,support_k_N_per_mm,pressure_multiplier,reaction_N,throat_mm,effective_length_mm,max_resultant_stress_MPa,conditional_ratio';
 const rows=r.cases.map(c=>{const p=candidate.sourceModel.lockSchedule.find(p=>p.id===c.station);return[c.station,p.x,p.y,c.panel,c.role,c.supportK??'rigid',c.pressureMultiplier,c.pressureReactionN,c.throatMm,c.result.effectiveLengthMm,c.result.worst.stressResultantMPa,c.ratio].join(',');});
 fs.writeFileSync(`${out}/${family}-checks.csv`,[header,...rows].join('\n')+'\n');
 assets.push({family,files:['json','svg','png','csv'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':ext==='csv'?'-checks':'-board'}.${ext}`;return{path,sha256:sha(path)};})});
}
fs.writeFileSync(`${out}/assets.json`,JSON.stringify({revision:'P93',records:assets,commonFiles:[{path:`${out}/DETAIL_TH.md`,sha256:sha(`${out}/DETAIL_TH.md`)}],pins:['tools/modular-program/table-weld-p93.mjs','tools/modular-program/weld-group-p93.mjs','tools/modular-program/table-weld-boards-p93.mjs','tools/modular-program/cap-geometry-p55.mjs','tools/modular-program/prism-tools-p54.mjs',`${out}/register.json`].map(path=>({path,sha256:sha(path)})),stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/index.html`, `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>P93 แม่แบบโต๊ะ — แนวเชื่อมเสนอ</title><style>body{font:18px system-ui;background:#f4f7fa;color:#173458;margin:32px auto;max-width:1200px;padding:0 24px}img{width:100%;background:white}a{color:#154e85}section{margin:40px 0}p{line-height:1.65}</style><h1>P93 — แนวเชื่อมจุดล็อกแม่แบบโต๊ะ</h1><p>6ขนาด / 9setup / 72สถานี. ภาพพิกัดจริงและผลคำนวณรอยเชื่อมเฉพาะแรงดัน ไม่ใช่การอนุมัติแม่แบบทั้งชุด. คงTypicalเดิมและเหล็กยกคอนกรีตแบบไม่มีขนาดตามP52.</p><p><a href="DETAIL_TH.md">รายละเอียดและรายการตรวจภาษาไทย</a></p>${families.map(f=>`<section><h2>${f}</h2><a href="${f}-board.png"><img src="${f}-board.png" alt="${f} รายละเอียดแนวเชื่อมแม่แบบโต๊ะ"></a><p><a download href="${f}-board.png">PNG</a> · <a download href="${f}-board.svg">SVG</a> · <a download href="${f}.json">JSON</a> · <a download href="${f}-checks.csv">ตารางคำนวณ CSV</a></p></section>`).join('')}<p>ขั้น5/8ยังไม่ครบ8หมวดP40. ไม่เริ่มขั้น6. ไม่รับรองผลิต เท หรือยก</p></html>`);
console.log('P93: six model-coordinate boards and CSV files generated');
