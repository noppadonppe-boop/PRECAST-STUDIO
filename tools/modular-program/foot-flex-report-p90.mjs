import fs from 'node:fs';import {createRequire} from 'node:module';import {read,sha,dir,compare} from './foot-flex-audit-p90.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const preview=process.argv.includes('--preview'),destination=preview?dir+'/preview':dir;
fs.mkdirSync(destination,{recursive:true});
const previewKey=process.argv.find(s=>s.startsWith('--key='))?.slice(6)??'A-LH-W01';
if(!/^[ABD]-(LH|RH)-W01$/.test(previewKey))throw Error('Unsupported preview key');
const previewRows=()=>['M01-F1','M01-F2','M03-F1','M03-F2'].map(foot=>{const id=previewKey+'-'+foot,extra=previewKey.startsWith('D')||foot!=='M01-F2',r=compare(id,extra?10:20,extra?7.5:10),old=read(`output/foot-flex-p86/${id}-h${previewKey.startsWith('D')?7.5:10}.json`);r.P86Reference={maximumTensionKN:Math.max(...old.boltForces.map(b=>b.tensionN))/1000};return r;});
const a=preview?{rows:previewRows()}:read(dir+'/audit.json'),n=(v,d=3)=>v.toFixed(d),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const txt=(x,y,s,z=21)=>`<text x="${x}" y="${y}" font-size="${z}">${esc(s)}</text>`;
const color=t=>{const c=t<.5?[[23,49,81],[235,238,241],t*2]:[[235,238,241],[205,143,35],t*2-1];return '#'+c[0].map((v,i)=>Math.round(v+(c[1][i]-v)*c[2]).toString(16).padStart(2,'0')).join('');};
const records=[];
for(const key of [...new Set(a.rows.map(r=>r.key))]){
 const rows=a.rows.filter(r=>r.key===key);let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1500"><rect width="1800" height="1500" fill="white"/><g fill="#132f53" font-family="Arial,sans-serif">`;
 svg+=txt(32,52,`${key} | P89 CANDIDATE FOOT DEMAND — P90`,36)+txt(32,94,'Source-model plots | 350 × 200 × 30 mm | nominal Ø22 bores | ideal rigid Ø37 washer patches',24)+txt(32,128,'Local plate axes: u right / v up / +w away from bed. Pressure only; not a whole-mould or capacity check.',23);
 rows.forEach((row,i)=>{
  const x=25+(i%2)*887,y=155+Math.floor(i/2)*560,w=860,h=535;
  const r=read(`${dir}/${row.fineFile}`),nodes=new Map(r.nodes.map(v=>[v.tag,v])),range=r.maxUpwardDisplacementMm-r.minDisplacementMm;
  const project=p=>[x+22+(p[0]+175)*1.25,y+73+(100-p[1])*1.25];
  svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#b6c2ce"/>`+txt(x+18,y+36,`${row.foot} | VERTICAL DISPLACEMENT / BOLT TENSION`,24);
  for(const c of r.cells){const ns=c.ids.map(i=>nodes.get(i)),v=ns.reduce((s,p)=>s+p.displacementMm[2],0)/4;svg+=`<polygon points="${ns.map(p=>project(p.xyzMm).join(',')).join(' ')}" fill="${color((v-r.minDisplacementMm)/range)}"/>`;}
  for(const [j,b] of r.bolts.entries()){const [xx,yy]=project(b.xy);svg+=`<circle cx="${xx}" cy="${yy}" r="23.125" fill="none" stroke="#a96c0c" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${xx}" cy="${yy}" r="12" fill="white" stroke="#132f53"/><text x="${xx}" y="${yy+5}" font-size="14" text-anchor="middle">${j+1}</text>`;}
  svg+=txt(x+490,y+91,'Bolt',20)+txt(x+590,y+91,'T (kN)',20);
  row.boltForcesKN.forEach((v,j)=>{svg+=txt(x+490,y+132+j*40,`B${j+1}`)+txt(x+590,y+132+j*40,n(v));});
  svg+=txt(x+490,y+309,`Max up ${n(row.maxUpwardDisplacementMm,4)} mm`,20);
  for(let j=0;j<100;j++)svg+=`<rect x="${x+22+j*4.35}" y="${y+348}" width="4.6" height="14" fill="${color(j/99)}"/>`;
  svg+=txt(x+22,y+388,`${n(row.minDisplacementMm,4)} down`,18)+txt(x+285,y+388,`${n(row.maxUpwardDisplacementMm,4)} up (mm)`,18);
  svg+=txt(x+20,y+425,`Mesh ${row.coarseMeshTargetMm} → ${row.fineMeshTargetMm} mm | ΔT ${n(row.boltRefinementRelative*100)}% | Δw ${n(row.displacementRefinementRelative*100)}%`,20);
  svg+=txt(x+20,y+462,`Prior accepted P86 → P90: T ${n(row.P86Reference.maximumTensionKN)} → ${n(row.maximumTensionKN)} kN`,20);
  svg+=txt(x+20,y+499,`Refinement: ${row.refinementAccepted?'ACCEPTED ≤2% for T / w':'NOT ACCEPTED'} | |ΣF| ${Math.hypot(...r.forceResidualN).toExponential(1)} N`,20);
 });
 svg+=txt(34,1280,'P86 comparison uses each revision\'s accepted mesh; matched-mesh comparisons are in JSON. Not a pure radius-effect comparison.',18);
 svg+=txt(34,1305,'Shading = cell-mean displacement, extrema = nodal values. Each panel has its own scale. NOT a stress plot.',22);
 svg+=txt(34,1345,'E200000 MPa · contact kc1000 N/mm³ · bolt As245 mm² · assumed elastic length50 mm · no preload credit',21);
 svg+=txt(34,1385,'P83 one-way wall reactions; no feedback to wall. Washer bending, thread, weld, gravity and handling remain separate.',21);
 svg+=`<rect x="25" y="1410" width="1750" height="65" fill="#fff0d7"/>`+txt(43,1451,'STAGE 5/8 IN PROGRESS — analysis study, NOT engineering approval or production release.',25)+'</g></svg>';
 fs.writeFileSync(`${destination}/${key}-board.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${destination}/${key}-board.png`);
 if(preview)continue;
 const sensitivity=key==='D-RH-W01'?a.sensitivity:[];
 const summary={revision:'P90',key,rows,sensitivity,criteria:a.criteria,verifiedConnectionCapacityN:null,notes:['P89 candidate geometry not promoted to released production design','Leff40/60 pilot sensitivity does not bound all24 groups','P86/P88 historical checks are not automatically current P89 connection checks'],stageComplete:false,engineeringApproved:false,productionReleased:false};
 fs.writeFileSync(`${dir}/${key}-summary.json`,JSON.stringify(summary,null,2));
 const cols=['id','effectiveBoltLengthMm','maximumTensionKN','maxUpwardDisplacementMm','boltRefinementRelative','displacementRefinementRelative','refinementAccepted'];
 fs.writeFileSync(`${dir}/${key}-summary.csv`,cols.join(',')+'\n'+[...rows,...sensitivity].map(r=>cols.map(c=>r[c]).join(',')).join('\n')+'\n');
 const files=[`${key}-board.png`,`${key}-board.svg`,`${key}-summary.json`,`${key}-summary.csv`,...[...rows,...sensitivity].flatMap(r=>[...(r.initialFile?[r.initialFile]:[]),r.coarseFile,r.fineFile])].map(f=>({path:`${dir}/${f}`,sha256:sha(`${dir}/${f}`)}));
 records.push({key,files});
}
if(!preview){
const percent=a.refinementAcceptedGroups/24*100;
fs.writeFileSync(dir+'/index.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P90 แรงขาฐานแม่แบบ</title><style>body{font:17px Tahoma,Arial;line-height:1.8;max-width:1450px;margin:auto;padding:22px;color:#132f53}img{max-width:100%}summary{cursor:pointer;font-weight:bold}details{margin:20px 0}a{color:#17568b}.note{padding:18px;background:#fff0d7}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ccc;text-align:left}</style><h1>ขั้น5/8 · P90 ตรวจแรงขาฐานสำหรับแบบทางเลือก P89</h1><p class="note">งานย่อยผ่านเกณฑ์ mesh ${a.refinementAcceptedGroups}/24 กลุ่ม (${n(percent,1)}%) · วิเคราะห์จริง64กรณี ไม่ใช้ผลสะท้อนแทนการรัน<br>ขั้น5ทั้งหมด: ยังไม่ครบ100% · ไม่ใช่กำลังรับได้หรืออนุมัติผลิต</p><p>ปรับแหวนจากรัศมี20เป็น18.5มม.ตามแบบทางเลือกP89 ตรวจขาM01/M03ของA/B/Dรุ่นW01เท่านั้น ไม่ขยายผลไปยังS00หรือชิ้นส่วนอื่น ใช้แรงดันคอนกรีตจากผลผนังP83ส่งต่อทางเดียว จึงยังไม่ใช่แบบจำลองรวมผนัง–ฐาน</p><p>ผล64กรณีประกอบด้วย24กลุ่ม×2ระดับmesh เพิ่ม7.5มม.ให้A/Bที่ไม่ผ่านเกณฑ์เดิม12กลุ่ม และกรณีความแข็งสลักของจุดนำร่อง Leff40/60 อีก4กรณี ทั้งหมดเป็นกรณีศึกษา ค่าความยาวยืดตัวไม่ใช่ความยาวสินค้า60มม.และไม่ใช่toleranceโบลต์</p><p><a href="audit.json" download>ผลตรวจและแหล่งข้อมูล JSON</a> · <a href="summary.csv" download>ตาราง CSV</a> · <a href="benchmarks.json" download>ผล benchmark</a> · <a href="../stage5-closure-p90/index.html">บัญชีงานค้าง44ชุด</a></p><h2>ความไวต่อความแข็งสลัก — D-RH-W01 / M03-F2 เท่านั้น</h2><table><tr><th>Leff สมมติ (มม.)</th><th>T สูงสุด (kN)</th><th>ยกตัว (มม.)</th><th>Mesh สองตัวชี้วัด</th></tr>${[a.sensitivity[0],a.rows.find(r=>r.id==='D-RH-W01-M03-F2'),a.sensitivity[1]].map(r=>`<tr><td>${r.effectiveBoltLengthMm}</td><td>${n(r.maximumTensionKN)}</td><td>${n(r.maxUpwardDisplacementMm,4)}</td><td>${r.refinementAccepted?'ผ่านเกณฑ์':'ยังไม่ผ่าน'}</td></tr>`).join('')}</table><p>เป็นเพียงความไวของจุดนำร่อง ไม่ใช่ขอบเขตแรงสูงสุดสำหรับทุกจุดหรือผลรับรองความแข็งเกลียว/ฐานจริง</p>${records.map(r=>`<details><summary>${r.key} — สี่กลุ่มขาฐาน</summary><img src="${r.key}-board.png" alt="ผลโมเดลขาฐาน ${r.key}"><p>${r.files.map(f=>`<a href="${f.path.split('/').at(-1)}" download>${f.path.split('/').at(-1)}</a>`).join(' · ')}</p></details>`).join('')}<h2>ขอบเขตที่ยังต้องปิดต่อ</h2><p>แหวนในโมเดลเป็นแผ่นแข็งเกร็งเชิงจลนศาสตร์ ไม่ใช่การตรวจดัดแหวนจริง ไม่ใช้ค่าstressเฉพาะจุดลงแรงออกแบบรอยเชื่อม ยังต้องตรวจเกลียว/แหวน/รอยเชื่อม การรวมแรง การรองรับและเสถียรภาพขณะถอด/ยก. P52คงแนวเหล็กคอนกรีตไม่ระบุขนาดและสมมติกำลังเพียงพอเพื่อพัฒนา ไม่ถือว่าอุปกรณ์ยกหรือพื้นโรงงานผ่านแล้ว</p><p>ตรวจสมดุลแรง/โมเมนต์ สปริงฝ่ายเดียว เงื่อนไขrigid-link และbenchmarkแผ่นยืดหยุ่น. เอกสารวิธี: <a href="https://openseespydoc.readthedocs.io/en/latest/src/ShellMITC4.html">OpenSees ShellMITC4</a> · <a href="https://openseespydoc.readthedocs.io/en/latest/src/ENT.html">ENT</a> · <a href="https://opensees.github.io/OpenSeesDocumentation/user/manual/model/mp_constraint/rigidLink.html">Rigid link</a>. Runtime3.8.0. ภาพทั้งหมดสร้างจากผลโมเดล ไม่ใช่ภาพAI</p></html>`);
fs.writeFileSync(dir+'/register.json',JSON.stringify({revision:'P90',records,reportGeneratorSha256:sha('tools/modular-program/foot-flex-report-p90.mjs'),auditSha256:sha(dir+'/audit.json'),stageComplete:false},null,2));
console.log({boards:records.length,files:records.reduce((s,r)=>s+r.files.length,0)});
}else console.log({previewBoards:1,source:'Actual completed '+previewKey+' native results only',path:destination+'/'+previewKey+'-board.png'});
