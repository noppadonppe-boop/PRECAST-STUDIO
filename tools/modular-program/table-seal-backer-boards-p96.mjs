import fs from 'node:fs';
import {createRequire} from 'node:module';
import {families,out} from './table-seal-backer-p96.mjs';
import {build as sealed} from './table-seal-p95.mjs';
import {read,sha} from './table-weld-p93.mjs';
import {render} from './prism-tools-p54.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const text=(x,y,t,size=22)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#143959">${t}</text>`;
const img=(url,x,y,w,h)=>`<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const underside=f=>f.map(face=>face.map(([x,y,z])=>[x,-y,-z]));
const assets=[];
for(const family of families){
 const r=read(`${out}/${family}.json`),c=sealed(family),[L,W,H]=r.cavityMm;
 const bed=c.parts.find(p=>p.id==='M00').solids.filter(f=>Math.min(...f.flat().map(v=>v[2]))>=-106-.001);
 const assembly=render([...bed.map(f=>({faces:underside(f),color:Math.min(...f.flat().map(v=>v[2]))>=-6.001?'#b8c5d0':'#315f84',hideEdges:true})),...r.bars.map(b=>({faces:underside(b.faces),color:'#d99a24'}))],850,500);
 const single=render([{faces:r.bars[0].faces,color:'#315f84'},...r.welds.filter(w=>w.bar===r.bars[0].tag).map(w=>({faces:w.faces,color:'#d99a24'}))],850,315);
 const unsupported=r.stripChecks.unsupportedGrooveStrip,b=r.stripChecks.supportedBacker;
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1800"><rect width="1800" height="1800" fill="white"/><g font-family="Arial">';
 s+=text(32,52,`P96 | SEAL SUPPORT INFILLS — ${family}`,38)+text(32,95,`Cavity unchanged ${L} x ${W} x ${H} mm | support beneath the P95 recessed seal`,23);
 for(const [x,y,w,h]of [[24,125,855,635],[900,125,876,635],[24,785,855,580],[900,785,876,580]])s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f6f8fb" stroke="#bccbd7" rx="8"/>`;
 s+=text(42,167,'A | UNDERSIDE / INFILLS BETWEEN RIBS',25)+img(assembly,30,181,843,492)+text(42,708,'Longitudinal lower rails hidden in this view only.',20)+text(42,741,'Nominal final geometry audit includes rails, pads and locks.',20);
 s+=text(918,167,'B | ONE REAL CUT PIECE + WELD ROUTES',25)+img(single,911,193,855,315);
 s+=text(929,546,`Cut ${b.spanMm.toFixed(3)} x60 x6 mm; ${r.barCount} pieces / tool`,24)+text(929,590,'WT: top seams stop10mm before each rib face.',21)+text(929,630,'WE: end seams on rib flats, z = -60 to -20mm.',21)+text(929,670,'Nominal throat3mm; fit-up/WPS remain to be qualified.',20)+text(929,716,'Not a rail inserted through closed RHS tubes.',21);
 s+=text(42,828,'C | TRANSVERSE SECTION AT MID-BAY',25);
 const X=y=>160+(y+8)*5,Y=z=>950-z*5;
 const bedPoly=[[-20,-6],[16,-6],[16,0],[-1.3,0],[-1.3,-1.1],[-4.7,-1.1],[-4.7,0],[-20,0]];
 s+=`<polygon points="${bedPoly.map(([y,z])=>`${X(y)},${Y(z)}`).join(' ')}" fill="#b8c5d0" stroke="#315f84"/><rect x="${X(-6)}" y="${Y(-6)}" width="30" height="300" fill="#315f84"/><rect x="${X(-4.5)}" y="${Y(0)}" width="15" height="5.5" fill="#d99a24"/><rect x="${X(-6)}" y="${Y(18)}" width="30" height="90" fill="#6c8ba4"/>`;
 s+=text(465,915,'Shutter shown cropped at18mm',20)+text(465,953,'Bed6 / groove remaining4.9',21)+text(465,991,'Seal width3, centre y=-3',21)+text(465,1029,'Infill y=-6…0 / z=-66…-6',21)+text(465,1067,'Infill depth60; thickness6',21)+text(465,1122,'N side mirrored about y=W/2',20)+text(42,1328,'Datum z=0 is the concrete underside. All dimensions mm.',20);
 s+=text(918,828,'D | LOAD CASE / MODEL LIMITS',25)+text(928,883,'Trial seal pressure cap:0.10MPa, not supplier approval.',20)+text(928,926,`Total base-loop force at cap: ${(r.operatingCandidate.baseSealForceN/1000).toFixed(3)}kN`,22)+text(928,969,`Local infill line load: ${r.operatingCandidate.lineLoadNmm.toFixed(4)}N/mm`,22)+text(928,1012,`Infill elastic stress: ${b.stressMPa.toFixed(3)}MPa`,22)+text(928,1055,`Infill deflection: ${b.deflectionMm.toFixed(6)}mm (ideal ends)`,22)+text(928,1098,`End reaction: ${b.reactionPerEndN.toFixed(2)}N / end`,22)+text(928,1141,`Added bars: ${r.addedSteelKg.toFixed(3)}kg; weld model: ${r.nominalWeldMetalKg.toFixed(3)}kg`,21)+text(928,1184,`Unbacked isolated4.9mm strip: ${unsupported.deflectionMm.toFixed(3)}mm`,20)+text(928,1227,'Strip result is not actual2D plate or seal deformation.',20)+text(928,1270,'Rib/weld/local-wall and whole-frame response remain open.',19)+text(928,1325,'Mass additions are not a finished lifting mass.',20);
 s+=text(35,1412,'E | FABRICATION ORDER / NO RETROFIT THROUGH INSTALLED LOCK PADS',26);
 const lines=['1  Set bed skin and ribs. Fit infills before bolt backing plates and removable hardware.',
 '2  Keep underside accessible before lower rails. Weld/inspect WT and WE, then finish the frame.',
 '3  Inspect cavity flatness, groove depth, seal fit and bolt-hole coordinates after welding.',
 '4  Infill insertion checked in the defined fabrication state; installed-tool obstruction is recorded.',
 '5  Full44-step nominal demould path rechecked with infills and weld envelopes fixed to M00.'];
 lines.forEach((t,i)=>s+=text(44,1458+i*43,t,21));
 s+=`<line x1="30" y1="1690" x2="1770" y2="1690" stroke="#143959"/>`+text(35,1730,'NAVY: steel | SILVER: bed | AMBER: new infill or weld highlight, as labelled',22)+text(35,1772,'STAGE5 /8 — DEVELOPMENT CANDIDATE. NOT RELEASED FOR FABRICATION OR LIFTING.',22)+'</g></svg>';
 fs.writeFileSync(`${out}/${family}-board.svg`,s);await sharp(Buffer.from(s)).png().toFile(`${out}/${family}-board.png`);
 fs.writeFileSync(`${out}/${family}-parts.csv`,['tag,parent,quantity,length_mm,depth_mm,thickness_mm,nominal_steel_kg',...r.bars.map(b=>[b.tag,b.parent,b.quantity,...b.finishedDimensionsMm,b.properties.volumeMm3*7850/1e9].join(','))].join('\n')+'\n');
 assets.push({family,files:['json','svg','png','csv'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`;return {path,sha256:sha(path)};})});
}
fs.writeFileSync(`${out}/boards.json`,JSON.stringify({revision:'P96',records:assets,status:'VISUAL_QA_PENDING',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
console.log('P96 six boards generated for visual review');
