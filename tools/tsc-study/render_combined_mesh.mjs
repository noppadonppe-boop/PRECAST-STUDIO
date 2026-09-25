import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.PM_SHARP_PATH||'sharp'),root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/tsc-step2l-r00');
const r=JSON.parse(await readFile(resolve(out,'combined_mesh_results.json'),'utf8')),runs=[...r.reference_runs,...r.runs];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),txt=(x,y,s,n=23,c='#243e50')=>`<text x="${x}" y="${y}" font-size="${n}" fill="${c}">${esc(s)}</text>`,pct=v=>v<.00001?'<0.001%':(100*v).toFixed(3)+'%';
const local=r.local_comparisons.map(c=>({pair:c.pair,groups:c.groups.map(g=>({group:g.group,point:Math.max(...g.fields.map(v=>v.max_point_change)),spread:Math.max(...g.fields.map(v=>v.max_spread_relative)),met:g.all_six_targets_met}))}));
let body=txt(60,70,'TS-C / ผลร่วมของ profile + thickness mesh',34)+txt(60,115,'Step 2L · FULL · t175 · NC320 trial · F-R · bonded crown · Y16',23);
body+=`<rect x="45" y="145" width="1510" height="60" rx="9" fill="#fff0db"/>`+txt(65,185,'กรณีศึกษาทางตัวเลขเท่านั้น — ยังไม่อนุมัติความหนา เหล็ก จุดต่อ หรือผลิต',24,'#9c4f0c');
const boxes=[['H4','profile เดิม / t6',70,240],['KP','profile ละเอียด / t6',820,240],['KT','profile เดิม / t8',70,365],['KPT · ใหม่','profile ละเอียด / t8',820,365]];
for(const [name,desc,x,y] of boxes){body+=`<rect x="${x}" y="${y}" width="660" height="100" rx="12" fill="${name.startsWith('KPT')?'#d9efec':'#e7edf2'}"/>`+txt(x+20,y+35,name,27)+txt(x+20,y+75,desc,23);}
body+=txt(70,515,'t6/t8 = จำนวนชั้น mesh; ความหนาคอนกรีตคง 175 มม. / ไม่ใช่การเลือกวัสดุผลิต',22);
['Mesh','Elements','|u|max mm','Crown lower Fz kN','Crown pair kN','Cutsครบ/6'].forEach((s,i)=>body+=txt([70,260,490,740,1110,1390][i],580,s,21));
runs.forEach((v,i)=>{const tr=r.traction_runs.find(t=>t.mesh===v.mesh),c=tr.cuts.find(c=>c.id==='CROWN');[v.mesh,v.elements,v.max_displacement_mm.toFixed(7),c.traces.lower.order6.resultant_6[2].toFixed(7),c.trace_pair_sum_6[2].toFixed(7),tr.cuts.filter(c=>c.targets_met).length+'/6'].forEach((s,j)=>body+=txt([70,260,490,740,1110,1390][j],635+i*48,s,23));});
body+=txt(70,865,'Local stress / 490 พิกัดเดิม / point-RMS-spread ≤5% ทุกองค์ประกอบ',26);
let y=915;for(const c of local){body+=txt(70,y,c.pair.join(' → '),25,'#087c7c');y+=40;for(const g of c.groups){body+=txt(95,y,`${g.group}: point ${pct(g.point)} / spread ${pct(g.spread)} / ${g.met?'ครบเฉพาะคู่':'ยังไม่ครบ'}`,23);y+=39;}y+=20;}
body+=txt(70,1385,'แรงผ่านหน้าตัด: F=∫σn dA; moments รอบ origin เดียวกัน; ไม่เฉลี่ยสอง traces เพื่อให้ผ่าน',22);
body+=txt(70,1430,'ตัวหารอย่างน้อย .1kN/.1kN·m และ10kPa — ค่าเปอร์เซ็นต์ไม่ใช่อัตราการใช้กำลัง',22);
body+=txt(70,1485,'ยังไม่เพิ่ม interior-arc/base/Y พร้อมกัน; ไม่ใช่หลักฐาน convergence ทั้งโมเดล',24,'#9c4f0c');
body+=txt(70,1530,'ไม่มี cracking / jointจริง / wind / uplift / handling / openings / code strength checks',22);
const id='TS-C-COMBINED-QA-S2L-R00',svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600"><rect width="1600" height="1600" fill="#f4f6f8"/><g font-family="Tahoma,Arial,sans-serif">${body}</g></svg>`;
await writeFile(resolve(out,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(resolve(out,id+'.png'));
const deps={...r.dependency_hashes};for(const p of ['output/tsc-step2l-r00/combined_mesh_results.json','tools/tsc-study/render_combined_mesh.mjs'])deps[p]=createHash('sha256').update(await readFile(resolve(root,p))).digest('hex');
const traction=r.traction_runs.map(v=>({...v,cuts:v.cuts.map(c=>({...c,traces:Object.fromEntries(Object.entries(c.traces).map(([s,t])=>[s,{...t,order4:{resultant_6:t.order4.resultant_6},order6:{resultant_6:t.order6.resultant_6}}]))}))}));
await writeFile(resolve(out,'web_summary.json'),JSON.stringify({id:r.id,revision:r.revision,status:r.status,runs,local,traction,dependency_hashes:deps,raw_output_hashes:r.raw_output_hashes,engineering_approval:false,manufacturing_release:false,drawings:[{id,title:'ผลร่วม mesh แนวหน้าตัดและความหนา',file:id+'.png'}]},null,2));console.log(id);
