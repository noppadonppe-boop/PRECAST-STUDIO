import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
for(const family of ['F2660','NF02']){
 const dir=`output/floor-lock-p47/${family}`,m=JSON.parse(fs.readFileSync(`${dir}/model.json`)),[L,W,H]=m.cavityMm,s=.38,x0=130,y0=250;
 const X=x=>x0+s*x,Y=y=>y0+s*y;
 const text=(x,y,t,size=21)=>`<text x="${x}" y="${y}" font-size="${size}">${t}</text>`;
 const line=(a,b)=>`<path d="M${a.join(',')}L${b.join(',')}" stroke="#24456a" stroke-width="1.5"/>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1150"><rect width="1800" height="1150" fill="white"/><g fill="#10274c" font-family="Arial">${text(35,55,`P47 | ${family} — LOCK COORDINATES / mm`,34)}${text(35,105,'Shown plan: cavity origin upper-left; +X right, +Y down; Z=0 at casting bed surface')}`;
 svg+=`<rect x="${X(-120)}" y="${Y(-120)}" width="${(L+240)*s}" height="${(W+240)*s}" fill="#e7edf3" stroke="#25496a"/><rect x="${X(0)}" y="${Y(0)}" width="${L*s}" height="${W*s}" fill="white" stroke="#25496a"/>`;
 for(const c of m.lockSchedule){svg+=`<circle cx="${X(c.x)}" cy="${Y(c.y)}" r="5" fill="#bf862e"/>`+text(X(c.x)+9,Y(c.y)-10,c.id,16);}
 svg+=line([X(0),Y(-180)],[X(L),Y(-180)])+text(X(L/2)-80,Y(-195),`L = ${L}`)+line([X(-180),Y(0)],[X(-180),Y(W)])+text(35,Y(W/2),`${W}`,18);
 svg+=text(1320,195,'Tag / parent / X / Y',22);
 m.lockSchedule.forEach((c,i)=>svg+=text(1290,240+38*i,`${c.id} ${c.parent} ${c.x.toFixed(2)} / ${c.y.toFixed(2)}`,18));
 ['Z: foot 0..12; bed -6..0; doubler -20..-6 mm','Hole: nominal diameter18; proposed bolt M16','Head/nut are simplified envelopes, not catalogue dimensions','No preload, torque, grade, weld capacity or lifting approval','Geometric sharing only: confirm inserts / tolerances before reuse'].forEach((t,i)=>svg+=text(60,875+i*43,t,22));
 svg+=text(35,1120,'DEVELOPMENT GEOMETRY — DO NOT DRILL OR FABRICATE FROM THIS REVIEW SHEET',22)+'</g></svg>';
 fs.writeFileSync(`${dir}/02-LOCK-PLAN.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${dir}/02-LOCK-PLAN.png`);
}
