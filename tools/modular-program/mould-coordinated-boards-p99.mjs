import fs from 'node:fs';
import {createRequire} from 'node:module';
import {read,sha} from './table-weld-p93.mjs';
import {render} from './prism-tools-p54.mjs';
import {out} from './mould-consolidation-p99.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(x,y,s,size=24)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#112d50">${esc(s)}</text>`;
const img=(src,x,y,w,h)=>`<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
function shot(parts,w,h,offsets=new Map()){
 return render(parts.flatMap(p=>p.solids.map(f=>({faces:f.map(face=>face.map(v=>add(v,offsets.get(p.tag)??[0,0,0]))),color:p.material?.startsWith('SEAL')?'#393c3f':/FASTENER|LK|BOLT|NUT|WASHER/i.test(p.role+' '+p.tag)?'#cb902e':p.tag==='M00'?'#234769':/^W|BOX|OPENING/i.test(p.role+' '+p.tag)?'#bd8938':'#648299',hideEdges:true}))),w,h);
}
function plan(m,x,y,w,h){
 const pts=m.concrete.faces.flat(),lo=[0,1].map(i=>Math.min(...pts.map(p=>p[i]))),hi=[0,1].map(i=>Math.max(...pts.map(p=>p[i]))),s=Math.min((w-120)/(hi[0]-lo[0]),(h-100)/(hi[1]-lo[1])),ox=x+60+(w-120-(hi[0]-lo[0])*s)/2,oy=y+40;
 const map=p=>[ox+(p[0]-lo[0])*s,oy+(hi[1]-p[1])*s];
 const edges=new Map();for(const f of m.concrete.faces)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],p=map(a),q=map(b);if(Math.hypot(p[0]-q[0],p[1]-q[1])<.01)continue;const key=[a.slice(0,2).map(x=>x.toFixed(5)).join(','),b.slice(0,2).map(x=>x.toFixed(5)).join(',')].sort().join('|');edges.set(key,`<path d="M${p}L${q}" stroke="#59758a" fill="none" stroke-width="1.2"/>`);}
 let svg=[...edges.values()].join('');svg+=text(ox,oy+(hi[1]-lo[1])*s+35,`X ${m.concrete.dimensionsXYZmm[0].toFixed(2)} mm`,20)+`<text x="${ox-22}" y="${oy+30}" transform="rotate(-90 ${ox-22} ${oy+30})" font-size="20" text-anchor="end" fill="#112d50">Y ${m.concrete.dimensionsXYZmm[1].toFixed(2)} mm</text>`;return svg;
}
const reg=read(`${out}/register.json`),boards=[];
for(const r of reg.records){
 const m=read(r.model),major=m.parts.filter(p=>/^[MCW]\d\d$/.test(p.tag)),offsets=new Map();
 for(const p of major){if(p.tag==='M00')continue;const steps=m.motions.filter(s=>s.tags.includes(p.tag));offsets.set(p.tag,steps.reduce((v,s)=>add(v,s.deltaMm),[0,0,0]));}
 const assembly=shot([...m.parts,...m.seals],1200,560),casting=render([{faces:m.concrete.faces,color:'#b9bec4',hideEdges:true}],750,410),exploded=shot(major,1120,480,offsets);
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="1650"><rect width="2200" height="1650" fill="white"/><g font-family="Arial">';
 svg+=text(30,53,`P99 | ${m.typicalId} — COORDINATED MOULD`,35)+text(30,98,`Current source ${m.sourceGeometryRevision} | Frozen nominal geometry / mm | Assembly, concrete and component register`,24);
 for(const [x,y,w,h]of [[25,125,1270,635],[1310,125,865,635],[25,780,1270,675],[1310,780,865,675]])svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#f7f9fb" stroke="#bac8d5"/>`;
 svg+=text(45,165,'A | ASSEMBLED STEEL MOULD / MODELLED HARDWARE',26)+img(assembly,50,185,1200,550);
 svg+=text(1330,165,'B | MATCHED CONCRETE IN CASTING POSE',25)+img(casting,1360,185,750,410);
 svg+=text(1335,630,`XYZ ${m.concrete.dimensionsXYZmm.map(n=>n.toFixed(2)).join(' x ')} mm`,22)+text(1335,675,`Normal concrete thickness ${m.concrete.normalThicknessMm??'see source'} mm`,23)+text(1335,720,`Concrete only ${m.concrete.nominalKg.toFixed(2)} kg / no rebar or inserts`,22);
 svg+=text(45,825,'C | MAIN PARTS SEPARATED ALONG RECORDED VECTORS',25)+img(exploded,80,845,1120,460)+text(45,1345,'Loose fasteners and seals omitted in C only; included in A and registers.',22)+text(45,1386,'Offsets show the sum of recorded translations, not simultaneous stripping.',22)+text(45,1427,'Support / crane / parked-part paths are not proved by this separated view.',22);
 svg+=text(1330,825,'D | CASTING XY PROJECTION / SOURCE DATUM',25)+plan(m,1320,850,835,370);
 const tags=major.map(p=>p.tag).join(' / ');svg+=text(1330,1253,tags,19)+text(1330,1295,`${m.parts.length} subassembly / hardware objects; not cut pieces`,22)+text(1330,1336,`${m.motions.length} recorded translation legs; full sequence in CSV`,22)+text(1330,1377,'All component XYZ envelopes and tags in components.csv',22)+text(1330,1418,'Envelope dimensions are NOT cutting or hole dimensions.',22);
 svg+=text(32,1500,'Navy / blue-grey: modelled steel | Amber: removable hardware / box-out | Grey: concrete | Dark: modelled seals',24)+text(32,1548,'Geometry P98: compared with Typical-linked source. Earlier illustrations stay available; this view does not replace a strength check.',22)+text(32,1602,'STAGE 5/8 — COORDINATED DEVELOPMENT DRAFT. NOT RELEASED FOR FABRICATION, CASTING OR LIFTING.',24)+'</g></svg>';
 fs.writeFileSync(`${out}/${m.id}-board.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${out}/${m.id}-board.png`);
 const atlasHeight=200+Math.ceil(major.length/3)*450;
 let atlas=`<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="${atlasHeight}"><rect width="2200" height="${atlasHeight}" fill="white"/><g font-family="Arial">`+text(30,50,`P99 | ${m.typicalId} — MAIN SUBASSEMBLIES`,34)+text(30,92,'Same frozen solids as assembly | Views individually fitted, not a common scale | XYZ envelope is not a cutting dimension',23);
 for(const [i,p]of major.entries()){
  const x=25+(i%3)*730,y=120+Math.floor(i/3)*450;
  atlas+=`<rect x="${x}" y="${y}" width="710" height="435" rx="6" fill="#f7f9fb" stroke="#bac8d5"/>`+text(x+15,y+32,p.tag,28)+img(shot([p],665,280),x+20,y+44,665,280)+text(x+15,y+355,`XYZ ${p.dimensionsXYZmm.map(n=>n.toFixed(2)).join(' x ')} mm`,21)+text(x+15,y+393,`Nominal stock ${p.nominalStockMassKg.toFixed(2)} kg / not WLL`,21);
 }
 atlas+=text(30,atlasHeight-24,'DEVELOPMENT ONLY — Loose fasteners / seals are listed separately in the register. Not fabrication or lifting release.',24)+'</g></svg>';
 fs.writeFileSync(`${out}/${m.id}-parts.svg`,atlas);await sharp(Buffer.from(atlas)).png().toFile(`${out}/${m.id}-parts.png`);
 const files=[{path:r.model,sha256:sha(r.model)},...['board.png','board.svg','components.csv','sequence.csv','parts.png','parts.svg'].map(n=>{const path=`${out}/${m.id}-${n}`;return {path,sha256:sha(path)};}),{path:`output/casting-equivalence-p98/${m.id}.json`,sha256:sha(`output/casting-equivalence-p98/${m.id}.json`)}];boards.push({id:m.id,typicalId:m.typicalId,files});
 const headers='<tr><th>Tag</th><th>Role</th><th>XYZ envelope mm</th><th>Nominal stock kg</th></tr>';
 const rows=[...m.parts,...m.seals].map(p=>`<tr><td>${esc(p.tag)}</td><td>${esc(p.role)}</td><td>${p.dimensionsXYZmm.map(n=>n.toFixed(2)).join(' × ')}</td><td>${p.nominalStockMassKg===null?'วัสดุซีลยังไม่เลือก':p.nominalStockMassKg.toFixed(3)}</td></tr>`).join('');
 fs.writeFileSync(`${out}/${m.id}.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(m.typicalId)} P99</title><style>body{max-width:1400px;margin:24px auto;padding:0 20px;font:17px Tahoma,Arial;color:#123456;line-height:1.7}img{width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bdcbd4;padding:7px;text-align:left}.note{background:#fff1db;padding:16px}a{color:#075c90}</style><a href="index.html">← สารบัญ</a><h1>${esc(m.typicalId)}</h1><p class="note">แบบรวมจากข้อมูลปัจจุบัน ไม่ใช่แบบอนุมัติผลิต — มิติในตารางเป็นกรอบXYZ ไม่ใช่มิติตัดเหล็ก. น้ำหนักเป็นผลรวมstockบางส่วนซ้อนกัน ไม่ใช่น้ำหนักยกที่รับรอง</p><img src="${m.id}-board.png" alt="${esc(m.typicalId)} แบบรวม"><p>${['board.png','board.svg','components.csv','sequence.csv'].map(n=>`<a download href="${m.id}-${n}">${n}</a>`).join(' · ')} · <a download href="${m.id}.json">โมเดลรวมJSON</a></p><h2>บัญชีชุดย่อยและอุปกรณ์</h2><table>${headers}${rows}</table><h2>แผนตรวจ</h2><ol>${m.qaPlan.map(q=>`<li>${esc(q.stage)} — ${esc(q.instruction)}<br>${esc(q.criterion)}</li>`).join('')}</ol><h2>ข้อค้างที่ต้องปิดก่อนผลิต</h2><ul>${m.remainingDesign.map(n=>`<li>${esc(typeof n==='string'?n:JSON.stringify(n))}</li>`).join('')}</ul></html>`);
 console.log(m.id,'board');
}
fs.writeFileSync(`${out}/assets.json`,JSON.stringify({revision:'P99',records:boards,pins:[`${out}/register.json`,'tools/modular-program/mould-consolidation-p99.mjs','tools/modular-program/mould-coordinated-boards-p99.mjs'].map(path=>({path,sha256:sha(path)})),stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ขั้น5 / ชุดแบบรวม44แม่แบบ</title><style>body{max-width:1300px;margin:30px auto;font:18px Tahoma,Arial;padding:0 24px;line-height:1.8;color:#123456}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #bbcbd7;padding:8px;text-align:left}a{color:#17629d}</style><h1>ขั้น5/8 — แบบรวมปัจจุบัน44ชุด</h1><p>44setup ไม่ใช่จำนวนแม่แบบที่ต้องซื้อ. รวมรูปทรงเหล็ก/อุปกรณ์ที่ออกแบบไว้กับคอนกรีตต้นทาง ไม่เพิ่มแบบใหม่หรือเปลี่ยนมิติ. ยังไม่ปิดขั้น5ทั้งหมดและไม่อนุมัติผลิต. ภาพต้นฉบับในเว็บไซต์คงเดิม</p><table><tr><th>Typical</th><th>กลุ่ม</th><th>ชุดย่อย/อุปกรณ์</th><th>ดูแบบและข้อมูล</th></tr>${reg.records.map(r=>`<tr><td>${esc(r.typicalId)}</td><td>${esc(r.kind)}</td><td>${r.components}</td><td><a href="${r.id}.html">ภาพ / บัญชี / ลำดับ / แผนตรวจ</a></td></tr>`).join('')}</table><p><a href="register.json" download>ทะเบียนรวม JSON</a></p></html>`);
