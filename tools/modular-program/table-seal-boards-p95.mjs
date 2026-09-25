import fs from 'node:fs';
import {createRequire} from 'node:module';
import {families,out,build} from './table-seal-p95.mjs';
import {read,sha} from './table-weld-p93.mjs';
import {clip} from './convex-clip-p95.mjs';
import {render} from './prism-tools-p54.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const txt=(x,y,t,size=21,color='#143959')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${t}</text>`;
const im=(url,x,y,w,h)=>`<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const crop=f=>{let p=f;for(const [n,d]of [[[1,0,0],12],[[-1,0,0],8],[[0,1,0],12],[[0,-1,0],8],[[0,0,1],14],[[0,0,-1],6]]){if(!p.length)break;p=clip(p,n,d);}return p;};
function detail(c){
 const draw=[];for(const p of c.parts.filter(p=>['M00','M01','M03'].includes(p.id)))for(const f of p.solids){let faces=crop(f);if(!faces.length)continue;if(p.id==='M03')faces=faces.map(face=>face.map(([x,y,z])=>[x-5,y,z+2]));draw.push({faces,color:p.id==='M00'?'#b5c3cf':'#315f84',hideEdges:true});}
 for(const s of c.seals.filter(s=>['M00','M01','M03'].includes(s.owner)))for(const f of s.solids){let faces=crop(f);if(!faces.length)continue;if(s.owner==='M03')faces=faces.map(face=>face.map(([x,y,z])=>[x-5,y,z+2]));draw.push({faces,color:'#e4a42b',hideEdges:true});}
 return render(draw,860,470);
}
const assets=[];
for(const family of families){
 const r=read(`${out}/${family}.json`),c=build(family),[L,W,H]=r.cavityMm,local=detail(c);
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1800"><rect width="1800" height="1800" fill="white"/><g font-family="Arial">`;
 s+=txt(32,53,`P95 | TABLE MOULD SEALS — ${family}`,38)+txt(32,96,`Concrete cavity unchanged: ${L} x ${W} x ${H} mm | recessed base loop +4 end-joint strips`,23);
 for(const [x,y,w,h]of [[24,122,850,575],[896,122,880,575],[24,720,850,560],[896,720,880,560]])s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f6f8fb" stroke="#b7c5d2" rx="8"/>`;
 s+=txt(40,165,'A | SEAL ROUTES / CASTING PLAN',26);
 const sc=Math.min(745/(L+240),385/(W+240)),px=69+(745-(L+240)*sc)/2,py=625,X=x=>px+(x+120)*sc,Y=y=>py-(y+120)*sc;
 s+=`<rect x="${X(-120)}" y="${Y(W+120)}" width="${(L+240)*sc}" height="${(W+240)*sc}" fill="#aabbc9" stroke="#173b59"/><rect x="${X(0)}" y="${Y(W)}" width="${L*sc}" height="${W*sc}" fill="white" stroke="#193f62"/>`;
 s+=`<rect x="${X(-3)}" y="${Y(W+3)}" width="${(L+6)*sc}" height="${(W+6)*sc}" rx="${3*sc}" fill="none" stroke="#d99522" stroke-width="5"/>`;
 for(const p of c.sourceCandidate.sourceModel.lockSchedule)s+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="#254964"/>`;
 for(const [x,y,t]of [[0,-3,'03-S'],[L,-3,'04-S'],[0,W+3,'03-N'],[L,W+3,'04-N']])s+=`<circle cx="${X(x)}" cy="${Y(y)}" r="7" fill="#d99522"/>`+txt(X(x)+10,Y(y)-12,t,19);
 s+=txt(X(L/2)-110,655,`${L} mm cavity length`,20)+txt(42,684,'Amber routes highlighted; actual seal width is3mm, not line weight.',18);
 s+=txt(912,165,'B | SOUTH-WEST JOINT / OPENING DETAIL',25)+im(local,910,180,850,445)+txt(914,650,'End panel displaced5mm outward +2mm up; side stays in place.',19)+txt(914,678,'Local28 x20 x20mm window only. Cropping is not a physical cut.',18);
 s+=txt(42,764,'C | STRAIGHT BASE JOINT / LOCAL SECTION',24);
 const u=x=>95+x*24,z=y=>1040-y*24;
 const poly=[[0,-6],[12,-6],[12,0],[4.7,0],[4.7,-1.1],[1.3,-1.1],[1.3,0],[0,0]];
 s+=`<polygon points="${poly.map(([x,y])=>`${u(x)},${z(y)}`).join(' ')}" fill="#b5c3cf" stroke="#173c5e"/><rect x="${u(0)}" y="${z(8)}" width="144" height="192" fill="#315f84" stroke="#173c5e"/><rect x="${u(1.5)}" y="${z(0)}" width="72" height="26.4" fill="#e4a42b"/>`;
 s+=txt(440,838,'Shutter skin t6 on metal stops',21)+txt(440,880,'Groove3.4 wide x1.1 deep',21)+txt(440,922,'Loop centre3mm outside cavity',21)+txt(440,964,'Seal3 wide;2 free /1.1 installed',21)+txt(440,1006,'Remaining bed thickness4.9',21)+txt(440,1048,'No seal inside concrete outline',21)+txt(42,1217,'Base skin t6. Local section cropped at8mm above bed.',20)+txt(42,1250,'Free thickness includes adhesive; compound still requires qualification.',18);
 s+=txt(914,764,'D | CUT PIECES / CORNER / T-JUNCTION',24);
 const cx=1050,cy=950,k=28,path=(rad,a,b)=>`M${cx+rad*k*Math.cos(a)},${cy-rad*k*Math.sin(a)} A${rad*k},${rad*k} 0 0 0 ${cx+rad*k*Math.cos(b)},${cy-rad*k*Math.sin(b)}`;
 s+=`<path d="${path(4.5,Math.PI,Math.PI*1.5)} L${cx},${cy+1.5*k} A${1.5*k},${1.5*k} 0 0 1 ${cx-1.5*k},${cy} Z" fill="#e4a42b" stroke="#173c5e"/>`;
 s+=txt(918,1106,'Corner die-cut:Ri1.5 /Ro4.5',20)+txt(1240,842,'SB-S1/S2: L x3 x2 —2pcs',22)+txt(1240,885,'SB-S3/S4: W x3 x2 —2pcs',22)+txt(1240,928,'SB-C1…C4:quarter rings —4pcs',22)+txt(1240,971,'Vertical strips:175 x3 x2 —4pcs',22)+txt(1240,1014,'Bottom5mm tapers3 →2mm',22)+txt(1240,1057,'12 cut pieces →5 assemblies',22);
 s+=txt(914,1162,'8 bonded base-loop splices +4 T-joints:inspect and leak-test.',20)+txt(914,1205,'Groove Ri1.3 /Ro4.7; radius3 toolpath is a true arc.',20)+txt(914,1248,'Drawing cells approximate arcs; do not CNC-cut tessellated facets.',18);
 s+=txt(36,1330,'E | FIT / ASSEMBLY / CONTROLLED RELEASE',27);
 s+=txt(44,1374,`Geometric compression range ${(100*r.compression.minRatio).toFixed(2)}–${(100*r.compression.maxRatio).toFixed(2)}% for the proposed dimensional stack.`,22);
 s+=txt(44,1417,`Steel removed ${(r.materialChanges.reduce((a,p)=>a+p.removedSteelKg,0)).toFixed(3)}kg per tool. Not a finished lifting mass.`,22);
 s+=txt(44,1460,'1  Machine and deburr glands. Fit and bond12 cut pieces into the loop and4 end strips.',21);
 s+=txt(44,1503,'2  Assemble metal stops and locks; check compression, compound/release-agent compatibility and leakage.',21);
 s+=txt(44,1546,'3  With independent support engaged, remove fasteners; release end panels before long sides.',21);
 s+=txt(44,1589,'4  Initial motion:5mm outward +2mm up; then295mm outward. Nominal44-stage clearance check.',21);
 s+=txt(44,1632,'Rubber contact during initial release is intentional; geometry checks do not prove friction or leak performance.',20);
 s+=`<line x1="30" y1="1680" x2="1770" y2="1680" stroke="#173c5e"/>`+txt(35,1722,'NAVY: steel | SILVER: bed | AMBER: replaceable seals | all dimensions mm',23)+txt(35,1765,'STAGE5 /8 — DEVELOPMENT DETAIL. NO FABRICATION, CASTING OR LIFTING RELEASE.',23)+'</g></svg>';
 fs.writeFileSync(`${out}/${family}-board.svg`,s);await sharp(Buffer.from(s)).png().toFile(`${out}/${family}-board.png`);
 assets.push({family,files:['json','svg','png'].map(ext=>{const path=`${out}/${family}${ext==='json'?'':'-board'}.${ext}`;return {path,sha256:sha(path)};})});
}
fs.writeFileSync(`${out}/boards.json`,JSON.stringify({revision:'P95',records:assets,status:'VISUAL_QA_PENDING',stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
console.log('P95 six draft geometry boards generated; not yet a released catalogue supplement');
