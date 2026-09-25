import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
for(const family of ['F2660','NF02']){
 const r=JSON.parse(fs.readFileSync(`output/floor-demand-p48/${family}.json`)),[L,W,H]=r.cavityMm,c=r.cases[0],s=Math.min(1050/L,500/W),ox=180,oy=240;
 const text=(x,y,t,size=24)=>`<text x="${x}" y="${y}" font-size="${size}">${t}</text>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1280"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#ad7624"/></marker></defs><rect width="1600" height="1280" fill="white"/><g fill="#10274c" font-family="Arial">`;
 svg+=text(40,55,`P48 | ${family} — FLOOR MOULD LOAD PATH`,36)+text(40,100,`Cavity ${L} x ${W} x ${H} mm | STATIC CAST | Study supports, not installed footing details`,23);
 svg+=text(40,160,'A | PLAN — 4 SUPPORT LOCATIONS; 13 TRANSVERSE RIBS',26);
 svg+=`<rect x="${ox}" y="${oy}" width="${L*s}" height="${W*s}" fill="#edf1f4" stroke="#10274c" stroke-width="3"/>`;
 for(const rib of c.ribs)svg+=`<line x1="${ox+rib.xMm*s}" y1="${oy}" x2="${ox+rib.xMm*s}" y2="${oy+W*s}" stroke="#68839c" stroke-width="5"/>`;
 for(const rail of c.rails)svg+=`<line x1="${ox}" y1="${oy+rail.yMm*s}" x2="${ox+L*s}" y2="${oy+rail.yMm*s}" stroke="#173e65" stroke-width="10"/>`;
 for(const p of c.pads){const x=ox+p.xMm*s,y=oy+p.yMm*s;svg+=`<rect x="${x-12}" y="${y-12}" width="24" height="24" fill="#d89933"/>`+text(x-60,y+(p.yMm?45:-28),`${(p.verticalN/1000).toFixed(3)} kN`,21);}
 svg+=text(ox+300,oy+W*s/2,`q concrete = ${c.concretePressureKPa.toFixed(3)} kPa`,25);
 svg+=text(ox+300,oy+W*s/2+40,`Steel model = ${r.steelKg.toFixed(1)} kg`,25);
 svg+=text(1280,285,'+X right',21)+text(1280,320,'+Y down',21)+text(1280,355,'+Z out of page',21)+text(1280,390,'Rz upward',21);
 const y=930;svg+=text(40,855,'B | LOAD TRANSFER — PIN/ROLLER BEAM IDEALIZATION',26);
 const boxes=[['Skin 6 mm',100],['RHS ribs',470],['RHS rails',840],['4 supports',1210]];
 for(const [label,x]of boxes){svg+=`<rect x="${x}" y="${y}" width="250" height="65" rx="5" fill="#eef2f5" stroke="#244c70"/>`+text(x+25,y+40,label,24);if(x<1200)svg+=`<line x1="${x+260}" y1="${y+32}" x2="${x+355}" y2="${y+32}" stroke="#ad7624" stroke-width="3" marker-end="url(#arrow)"/>`;}
 svg+=text(40,1060,`Sum vertical reactions = ${(c.totalVerticalN/1000).toFixed(3)} kN | Rail-only elastic deflection max ${Math.max(...c.rails.map(x=>x.maxAbsDeflectionMm)).toFixed(3)} mm`,25);
 svg+=text(40,1105,'Steel masses mapped statically to rails; local connections and combined surface deflection not checked.',22);
 svg+=text(40,1150,'Lock forces are tributary allocations, NOT bolt reactions. Casting, lifting and transport are separate cases.',22);
 svg+=text(40,1230,'DEMAND STUDY ONLY — NO CODE CAPACITY PASS / NO PRODUCTION RELEASE',25)+'</g></svg>';
 fs.writeFileSync(`output/floor-demand-p48/${family}-FBD.svg`,svg);
 await sharp(Buffer.from(svg)).png().toFile(`output/floor-demand-p48/${family}-FBD.png`);
}
