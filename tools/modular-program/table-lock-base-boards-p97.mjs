import fs from 'node:fs';
import {createRequire} from 'node:module';
import {families,build,out} from './table-lock-base-p97.mjs';
import {read,sha,axes} from './table-weld-p93.mjs';
import {render} from './prism-tools-p54.mjs';
import {clip} from './convex-clip-p95.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const txt=(x,y,s,size=21)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#123456">${esc(s)}</text>`;
const image=(p,x,y,w,h)=>`<image href="${p}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const flip=f=>f.map(face=>face.map(([x,y,z])=>[x,-y,-z]));
function localDetail(b,station){
 const s=b.c.sourceCandidate.sourceModel.lockSchedule.find(s=>s.id===station),fr=axes(s.parent,b.cavityMm),along=['M01','M02'].includes(s.parent)?s.x:s.y;
 const local=v=>[fr.t[0]*(v[0]-fr.origin[0])+fr.t[1]*(v[1]-fr.origin[1])-along,fr.u[0]*(v[0]-fr.origin[0])+fr.u[1]*(v[1]-fr.origin[1]),v[2]];
 const crop=f=>{let r=f.map(face=>face.map(local));for(const [n,d]of [[[1,0,0],0],[[-1,0,0],65],[[0,1,0],135],[[0,-1,0],45],[[0,0,1],30]])if(r.length)r=clip(r,n,d);return r;};
 const solids=b.c.parts.flatMap(p=>p.solids.map(f=>({faces:crop(f),color:p.id==='M00'?'#52718c':p.id.startsWith('LK')?'#c9932b':'#afbfcb',hideEdges:true}))).filter(p=>p.faces.length);
 return render(solids,530,490);
}
const records=[];
for(const family of families){
 const r=read(`${out}/${family}.json`),b=build(family,{audit:false}),[L,W,H]=r.cavityMm,bed=b.c.parts.find(p=>p.id==='M00');
 const all=render(bed.solids.map(f=>({faces:flip(f),color:Math.max(...f.flat().map(v=>v[2]))>=-6.001?'#b5c3ce':'#406585',hideEdges:true})),1000,430);
 const detailSide=localDetail(b,'LK01'),detailEnd=localDetail(b,'LK09');
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2000"><rect width="1800" height="2000" fill="white"/><g font-family="Arial">';
 s+=txt(30,54,`P97 | TABLE LOCK BASE + BARE-BED STUDY — ${family}`,35)+txt(30,96,`Cavity ${L} x ${W} x ${H} mm unchanged | New under-bed steel, not a new concrete segment`,22);
 for(const [x,y,w,h]of [[24,125,1752,535],[24,680,865,650],[910,680,866,650],[24,1350,865,485],[910,1350,866,485]])s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#f5f8fb" stroke="#b6c4d0"/>`;
 s+=txt(42,168,'A | COMPLETE M00 UNDERSIDE — ALL FIXED STOCK SHOWN',25)+image(all,60,190,1000,430);
 ['LOAD-PATH ADDITIONS','12  PAD90 backing plates','24  PL6 pedestal cheeks','8    PL10 rail shoes','8    PL6 plates for two closed ties','All tied to the original bed geometry.','Pressure forces are assigned net wrenches,','not verified bolt tension or support stiffness.'].forEach((v,i)=>s+=txt(1060,232+i*44,v,i===0?25:21));
 s+=txt(42,638,`Nominal M00 steel ${r.assemblies[0].nominalSteelKg.toFixed(2)}kg; net change +${r.addedNetNominalSteelKg.toFixed(2)}kg. Seals, paint and missing joints excluded.`,20);
 s+=txt(42,724,'B | LONG-SIDE LOCK / HALF SECTION',25)+image(detailSide,37,743,530,490);
 ['UPRIGHT VIEW','PAD90 at z -20…-6','CHEEK depth76','SHOE thickness10','Rail top z -106','Rail bottom z -306','Bolt axis u80','Cheek pair gap56'].forEach((v,i)=>s+=txt(555,800+i*44,v,20));
 s+=txt(43,1240,'PAD90:90x70x14; two cheeks:105x76x6; shoe:90x100x10',20)+txt(43,1277,'Cut view: -65 <= t <= 0; z <= 30. Near cheek omitted by section.',18)+txt(43,1310,'Full geometry, both cheeks and hardware remain in the path audit.',18);
 s+=txt(928,724,'C | END LOCK / CLOSED-BOX TIE',25)+image(detailEnd,925,743,530,490);
 ['UPRIGHT VIEW','PAD90 at z -20…-6','CHEEK depth140','Tie top z -160','Tie bottom z -260','Bolt axis u80','Closed cell64x94','Near half sectioned'].forEach((v,i)=>s+=txt(1450,800+i*44,v,20));
 s+=txt(930,1240,`Two cheeks:70x140x6; tie length ${W-100}mm.`,21)+txt(930,1277,'Tie:2 flanges90x6 +2 walls88x6; depth100 / width90.',20)+txt(930,1310,'Top z=-160; bottom z=-260. External weld access.',19);
 s+=txt(42,1394,'D | BARE-BED CRADLE CONTACTS / PLAN',25);
 const sc=Math.min(600/(L+240),285/(W+240)),X=x=>150+(x+120)*sc,Y=y=>1450+(y+120)*sc;
 s+=`<rect x="${X(-120)}" y="${Y(-120)}" width="${(L+240)*sc}" height="${(W+240)*sc}" fill="#d7e0e8" stroke="#163959"/>`;
 for(const y of [0,W])s+=`<line x1="${X(-100)}" y1="${Y(y)}" x2="${X(L+100)}" y2="${Y(y)}" stroke="#163959" stroke-width="8"/>`;
 for(const [i,p]of r.lifting.reactions.entries()){const left=i%2===0;s+=`<circle cx="${X(p.pointMm[0])}" cy="${Y(p.pointMm[1])}" r="8" fill="#cd9226"/><text x="${X(p.pointMm[0])+(left?-12:12)}" y="${Y(p.pointMm[1])+(i<2?27:-15)}" font-size="17" text-anchor="${left?'end':'start'}" fill="#123456">${(p.forceN/1000).toFixed(3)}kN</text>`;}
 s+=txt(42,1782,`x = ${r.lifting.xSupportsMm.map(x=>x.toFixed(2)).join(' / ')}mm; y=0 / ${W}; z=-306.`,19)+txt(42,1818,'CONTACT LOCATIONS, NOT LIFTING EYES OR A SLING ROUTE.',19);
 s+=txt(928,1394,'E | CHECKS / SCOPE',25);
 const e=[`52 new/replacement cuts +136 weld routes per tool.`,`12 locks:8 side pedestals,4 end pedestals.`,`All44 nominal demould motions remain clear.`,`Closed-cell tie: max local twist ${(Math.max(...r.endTieCases.map(c=>c.torsion.maxAbsRotationRad))*1000).toFixed(3)}mrad.`,`Pressure-height local movement sum ${Math.max(...r.endTieCases.map(c=>c.pressureHeightMovementSumMm)).toFixed(3)}mm.`,`Tie ends idealised: not whole-table casting tolerance.`,`Bare-bed load: mass x1.20 xhandling1.30 (proposed).`,`M16 / hole18 slip, prying and local capacity remain open.`];
 e.forEach((v,i)=>s+=txt(930,1440+i*44,v,20));
 s+=txt(33,1880,'NAVY: supporting steel | SILVER: local contact/foot steel | AMBER: removable locks or labelled contacts',21)+txt(33,1924,'Fabricate with underside access; inspect welds before closing the frame. Preserve groove and hole coordinates.',21)+txt(33,1969,'STAGE5 /8 — DEVELOPMENT DESIGN. NO CONCRETE-LOADED LIFT. NOT RELEASED FOR FABRICATION OR USE.',21)+'</g></svg>';
 fs.writeFileSync(`${out}/${family}-board.svg`,s);await sharp(Buffer.from(s)).png().toFile(`${out}/${family}-board.png`);
 fs.writeFileSync(`${out}/${family}-parts.csv`,['tag,role,station,quantity,length_mm,width_or_depth_mm,thickness_mm,nominal_steel_kg',...r.cuts.map(p=>[p.tag,p.role,p.station??'',1,...p.finishedDimensionsMm,p.nominalSteelKg].join(','))].join('\n')+'\n');
 records.push({family,files:['json','svg','png','csv'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':ext==='csv'?'-parts':'-board'}.${ext}`;return {path,sha256:sha(path)};})});
}
fs.writeFileSync(`${out}/boards.json`,JSON.stringify({revision:'P97',records,status:'VISUAL_REVIEW_PENDING',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
console.log('P97 six model-derived boards generated');
