import { useState } from 'react';
import type { ShellStudy } from './model';
import { DownloadButton } from './Downloads';

export function ShellStudyView({study}:{study:ShellStudy}) {
  const [thickness,setThickness]=useState(.175);
  const [joint,setJoint]=useState('P-H');
  const [pattern,setPattern]=useState('FULL');
  const run=study.runs.find(r=>r.t_m===thickness&&r.joint===joint&&r.pattern===pattern);
  const check=study.convergence.find(r=>r.t_m===thickness&&r.joint===joint&&r.pattern===pattern);
  const mass=study.mass_cases.find(r=>r.t_m===thickness);
  const n=(v:number|undefined,d=3)=>v===undefined?'—':v.toFixed(d);
  return <section className="cat-detail">
    <div className="cat-detail-heading"><div><span className="cat-eyebrow">SHELL SENSITIVITY / {study.revision}</span><h1>Step 2B · TS-C</h1><p>เปรียบเทียบความหนาและความแข็งจุดต่อ · {study.run_count} กรณีตาข่าย/โหลด · OpenSees {study.solver.version}</p></div></div>
    <aside className="cat-notice legacy"><strong>{study.status==='STALE'?'ข้อมูลต้นทางเปลี่ยน — ผลนี้ต้องสร้างใหม่':'คำนวณ shell แล้ว แต่ QA ยังไม่ครบ — ห้ามใช้เลือกเหล็กหรือผลิต'}</strong><p>แรงภายในบางองค์ประกอบยังไม่ผ่านการตรวจเพิ่มความละเอียดตาข่าย และยังไม่ได้เทียบ solid ที่มุมโค้ง การเคลื่อนตัวน้อยไม่ได้แปลว่าโครงสร้างผ่านกำลังหรือการแตกร้าว</p></aside>
    <div className="cat-tools">
      <label>ความหนาศึกษา<select aria-label="ความหนา shell" value={thickness} onChange={e=>setThickness(Number(e.target.value))}>{study.mass_cases.map(c=><option key={c.t_m} value={c.t_m}>{c.t_m*1000} มม.</option>)}</select></label>
      <label>จุดต่อ<select aria-label="กรณีจุดต่อ shell" value={joint} onChange={e=>setJoint(e.target.value)}><option value="P-H">P-H · ฐานหมุน / crown หมุน</option><option value="P-R">P-R · ฐานหมุน / crown ต่อเนื่อง</option><option value="F-H">F-H · ฐานยึด / crown หมุน</option><option value="F-R">F-R · ฐานยึด / crown ต่อเนื่อง</option></select></label>
      <label>Roof LL<select aria-label="รูปแบบโหลด shell" value={pattern} onChange={e=>setPattern(e.target.value)}><option value="FULL">เต็มหลังคา</option><option value="LEFT">ครึ่งซ้าย</option></select></label>
    </div>
    <p className="cat-note">LP-A: เปลือกลงฐานโดยตรง พื้นแยก · fc′ {study.basis.material.fc_ksc} ksc · ρ {study.basis.material.density_kg_m3} kg/m³ / ν {study.basis.material.nu} เป็นสมมติฐาน · E {n(run?.E_MPa,1)} MPa · หน้าตัดไม่ร้าว ไม่มี prestress เฉพาะรอบศึกษา</p>
    {run&&<>
      <h2>{run.id} · ผลรวมต่อ bay 1.50 ม.</h2>
      <div className="cat-table-scroll"><table className="cat-table"><caption>แรงฐานและ crown · global axes · ไม่ใช่แรงต่อ bolt</caption><thead><tr><th>ตำแหน่ง</th><th>Fx (kN)</th><th>Fz (kN)</th><th>My (kN·m)</th></tr></thead><tbody>{[['ฐาน LH',run.base.LH],['ฐาน RH',run.base.RH],['crown บน LH',run.crown_on_half.LH]] .map(([label,values])=>{const v=values as number[];return <tr key={label as string}><th>{label as string}</th><td>{n(v[0])}</td><td>{n(v[2])}</td><td>{n(v[4])}</td></tr>;})}</tbody></table></div>
      <p>|u|max = {n(run.max_displacement_mm,4)} มม. · มวลซีกละ {n(mass?.half_mass_kg,0)} kg / พื้น {n(mass?.floor_mass_kg,0)} kg / รวม {n(mass?.total_mass_kg,0)} kg ไม่รวมเหล็กและงานตกแต่ง</p>
      <details className="cat-source"><summary>แรงภายใน 8 องค์ประกอบ · raw Gauss extrema / ยังไม่พร้อมออกแบบ</summary><p>แกน s จากฐานซ้ายตามหน้าตัดผ่าน crown ไปฐานขวา, y ตามความยาว, normal ออกนอก; N บวกเป็นแรงดึง M/Q ใช้เครื่องหมาย solver ค่า min/max ต่างช่องอาจเกิดคนละจุด ไม่ใช่คู่แรงสำหรับออกแบบ</p><div className="cat-table-scroll"><table className="cat-table"><thead><tr><th>ผล</th><th>หน่วย</th><th>min</th><th>max</th></tr></thead><tbody>{Object.entries(run.all_gauss_extrema).map(([key,v])=><tr key={key}><th>{key}</th><td>{key.startsWith('M')?'kN·m/m':'kN/m'}</td><td>{n(v.min)}</td><td>{n(v.max)}</td></tr>)}</tbody></table></div></details>
    </>}
    {check&&<section className="cat-pending"><h2>สถานะตาข่าย {check.last_pair.join(' → ')}</h2><p>การเคลื่อนตัวเปลี่ยน {(check.displacement_change*100).toFixed(2)}% · แรง/โมเมนต์ฐานเปลี่ยนสูงสุด {(check.reaction_change*100).toFixed(2)}% ตามเกณฑ์ normalization ของชุดศึกษา</p><p><strong>{check.interior_targets_met?'แรงภายในครบเกณฑ์เฉพาะการตรวจตาข่ายนี้':'แรงภายในยังไม่ครบเกณฑ์ 5%'}</strong> · องค์ประกอบที่ยังเกินเกณฑ์: {Object.entries(check.interior_resultant_changes).filter(([,v])=>v>.05).map(([k,v])=>`${k} ${(v*100).toFixed(1)}%`).join(', ')||'ไม่มี'}</p><p>ตารางผลด้านบนใช้ M3 เพื่อเปรียบเทียบทุกกรณีสม่ำเสมอ; M4 เป็นการตรวจเพิ่มเฉพาะ 175 มม. P-H/F-R โหลดเต็ม เกณฑ์นี้เป็น numerical QA ไม่ใช่เกณฑ์ผ่าน วสท.</p></section>}
    <h2>ภาพดาวน์โหลด · ภาพอ้างอิงคงที่ ไม่เปลี่ยนตามตัวเลือกด้านบน</h2>
    {study.drawings.map(d=><section className="cat-study-drawing" key={d.id}><div className="cat-status-heading"><h3>{d.title}</h3><DownloadButton artifact={d.artifact}/></div><a className="cat-full-board" href={d.artifact.url} target="_blank" rel="noreferrer"><img src={d.artifact.url} alt={d.title} loading="lazy"/></a></section>)}
    <details className="cat-source"><summary>แหล่งอ้างอิงและข้อจำกัด</summary><ul>{study.sources.map(s=><li key={s.title}>{s.url?<a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>:s.title}</li>)}</ul><p>ยังไม่รวมลม แรงยก แผ่นดินไหว การยกประกอบ อายุคอนกรีต ร้าว/คืบ การทรุดฐาน ช่องเปิดและรอยต่อจริง ไม่ยกระดับสถานะ 48 แบบเดิมหรืออนุมัติผลิตจากชุดศึกษานี้</p></details>
  </section>;
}
