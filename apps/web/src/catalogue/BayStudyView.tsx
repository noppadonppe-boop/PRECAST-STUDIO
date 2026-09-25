import {useState} from 'react';
import {DownloadButton} from './Downloads';
import type {BayStudy} from './model';
const f=(n:number|undefined,d=3)=>n===undefined?'—':(Math.abs(n)<.5*10**-d?0:n).toFixed(d);
export function BayStudyView({study}:{study:BayStudy}){
  const [pattern,setPattern]=useState('FULL');
  const run=study.solid_runs.filter(r=>r.pattern===pattern).at(-1),qa=study.comparisons.find(c=>c.pattern===pattern);
  return <section className="cat-detail">
    <div className="cat-detail-heading"><div><span className="cat-eyebrow">STEP 2D / FREE-SIDED SOLID BAY</span><h1>แรงผ่านหน้าตัดและ Solid หนึ่งโมดูล</h1><p>175 มม. / ฐานยึดการหมุน / crown ต่อเนื่อง / LP-A · {study.revision}</p></div><span className="cat-badge">ศึกษาเฉพาะกรณี · ไม่ใช่แบบผลิต</span></div>
    {study.status==='STALE'&&<p className="cat-notice legacy" role="alert">ข้อมูลต้นทางเปลี่ยน — ผล Step 2D เป็น STALE ต้องสร้างใหม่</p>}
    <div className="cat-tools"><label>Roof LL<select aria-label="โหลด solid bay" value={pattern} onChange={e=>setPattern(e.target.value)}><option value="FULL">เต็มหลังคา</option><option value="LEFT">ครึ่งซ้าย</option></select></label></div>
    <p className="cat-note">ทั้งสองกรณีมีน้ำหนักตัวเองเต็มชิ้น · ขอบ Y=0/1.50 ม. อิสระ · floor ไม่อยู่ในโมเดล · ไม่มี prestress เฉพาะการศึกษา · จุดต่อจริงยังไม่เลือก</p>
    {run&&<><h2>{run.id}</h2><p>{run.elements.toLocaleString()} solid elements · |u|max={f(run.max_displacement_mm,4)} มม. · crown Uz={f(run.crown_mid_uz_mm,4)} มม.</p>
      <div className="cat-table-scroll"><table className="cat-table"><caption>แรงฐานรวมต่อ bay; My อ้างอิงกึ่งกลางฐานแต่ละด้าน</caption><thead><tr><th>ฐาน</th><th>Fx (kN)</th><th>Fz (kN)</th><th>My (kN·m)</th></tr></thead><tbody>{Object.entries(run.base).map(([h,v])=><tr key={h}><th>{h}</th><td>{f(v[0])}</td><td>{f(v[2])}</td><td>{f(v[4])}</td></tr>)}</tbody></table></div>
      <h2>แรงบนส่วนล่างของซีก LH เมื่อแยกตามหน้าตัด</h2><div className="cat-table-scroll"><table className="cat-table"><caption>แรงรวม global axes; My อ้างอิงกึ่งกลางแนวตัดแต่ละตำแหน่ง ไม่ใช่แรงต่อเมตรหรือแรงต่อ bolt</caption><thead><tr><th>แนวตัด</th><th>Fx (kN)</th><th>Fz (kN)</th><th>My (kN·m)</th></tr></thead><tbody>{run.cuts.map(c=><tr key={c.id}><th>{c.id}</th><td>{f(c.cut_on_lower_LH_6[0])}</td><td>{f(c.cut_on_lower_LH_6[2])}</td><td>{f(c.cut_on_lower_LH_6[4])}</td></tr>)}</tbody></table></div></>}
    {qa&&<section className="cat-pending"><h2>ตรวจความละเอียด {qa.solid_last_pair.join(' → ')}</h2><p>การเคลื่อนตัวเปลี่ยน {f(qa.displacement_change*100,2)}% · แรงฐาน {f(qa.reaction_change*100,2)}% · แรงผ่านหน้าตัด {f(qa.cut_change*100,2)}%</p><p>{qa.global_mesh_targets_met?'เข้าเกณฑ์ตัวเลขเฉพาะผลรวมที่ตรวจ':'ยังไม่ครบเกณฑ์ตัวเลขของผลรวมที่ตรวจ'} — ไม่ใช่การรับรอง local-stress convergence</p><p>crown Uz ต่างจาก shell {qa.shell_reference}: {f(qa.solid_vs_shell_crown_uz_relative*100,2)}%; เงื่อนไขรองรับแบบหน้า solid และเส้น shell ไม่เหมือนกันเฉพาะที่ จึงยังไม่สรุปว่าแบบจำลองเทียบเท่ากัน</p></section>}
    <p className="cat-notice legacy">ตรวจสมดุลของแรงรวมแล้ว แต่ยังไม่พร้อมเลือกเหล็กหรือจุดต่อ ต้องตรวจความเค้นตามความหนา การลู่เข้าของค่าเฉพาะที่ ความแข็งของรอยต่อจริง และโหลดอื่นก่อน Step 3</p>
    <h2>ภาพดาวน์โหลด · ภาพอ้างอิงคงที่; ตัวอย่าง FBD ใช้ FULL</h2>{study.drawings.map(d=><section className="cat-study-drawing" key={d.id}><div className="cat-status-heading"><h3>{d.title}</h3><DownloadButton artifact={d.artifact}/></div><a className="cat-full-board" href={d.artifact.url} target="_blank" rel="noreferrer"><img src={d.artifact.url} alt={d.title} loading="lazy"/></a></section>)}
  </section>;
}
