import {useState} from 'react';
import {DownloadButton} from './Downloads';
import type {BenchmarkStudy} from './model';
const fmt=(n:number,d=3)=>Math.abs(n)<1e-7?'≈0':Math.abs(n)<.001?n.toExponential(2):n.toFixed(d);
const pct=(n:number|null)=>n===null?'ไม่เปรียบเทียบ':fmt(n*100)+'%';
export function BenchmarkStudyView({study}:{study:BenchmarkStudy}){
  const [load,setLoad]=useState('V');
  const runs=study.runs.filter(r=>r.case===load&&r.mapping==='consistent');
  const fields=['σxx','σyy','σzz','τxy','τyz','τxz'];
  return <section className="cat-detail">
    <div className="cat-detail-heading"><div><span className="cat-eyebrow">STEP 2F / ELEMENT BENCHMARK</span><h1>ทดสอบการดัด–เฉือนก่อนกลับไปโมดูลจริง</h1><p>ชิ้นตรง 1.50 × 0.25 × 0.175 ม. · {study.revision}</p></div><span className="cat-badge">ยังไม่รับรองโมดูล</span></div>
    {study.status==='STALE'&&<p role="alert" className="cat-notice legacy">ข้อมูลต้นทางเปลี่ยน — ผล Step 2F เป็น STALE ต้องสร้างใหม่</p>}
    <p className="cat-notice legacy">20-node ให้ผลดีขึ้นในกรณีชิ้นตรงนี้ แต่ยังไม่ตรวจยืนยันมุมโค้งหรือ full TS-C bay และยังไม่เลือกความหนา เหล็ก หรือจุดต่อผลิต</p>
    <div className="cat-tools"><label>กรณีทดสอบ<select aria-label="กรณี benchmark" value={load} onChange={e=>setLoad(e.target.value)}><option value="V">V · ดัดร่วมกับเฉือน</option><option value="M">M · ดัดล้วน</option></select></label></div>
    <p className="cat-note">24 benchmark + 4 load-mapping runs · linear uncracked, ไม่มี self-weight · Uy=0; ฐานใส่ exact displacement รวม warping ไม่ใช่ฐานยึดแน่นแบบแข็ง · mesh partition เท่ากัน แต่ 20-node มี DOF มากกว่า ไม่ใช่การเทียบต้นทุนเท่ากัน</p>
    <div className="cat-table-scroll"><table className="cat-table"><caption>{load} / consistent traction · error เทียบคำตอบ elasticity อิสระ</caption><thead><tr><th>Element / mesh</th><th>nx × nz</th><th>Nodes</th><th>uz ปลาย (มม.)</th><th>Error uz</th><th>Error energy</th><th>Error τxz RMS</th><th>เกณฑ์ครบ</th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><th>{r.formulation} / {r.mesh}</th><td>{r.nx} × {r.nz}</td><td>{r.nodes}</td><td>{r.tip_uz_mm.toFixed(6)}</td><td>{pct(r.tip_error_relative)}</td><td>{pct(r.energy_error_relative)}</td><td>{pct(r.stress_rms_relative?.[5]??null)}</td><td>{r.accuracy_targets_met?'เฉพาะ coupon นี้':'ยังไม่ครบ'}</td></tr>)}</tbody></table></div>
    <p className="cat-note">Exact uz ปลาย = {runs[0]?.exact_tip_uz_mm.toFixed(6)} มม. · เป้าหมาย error uz≤2%, energy≤2%, stress RMS ทั้ง6≤5% · RMS ถ่วงปริมาตรที่ Gauss points / ตัวหาร max(RMS exact,10 kPa) ไม่ใช่ peak หรือ capacity ratio</p>
    <h2>ความเค้นทั้ง 6 องค์ประกอบ · Q6</h2>
    <div className="cat-table-scroll"><table className="cat-table"><caption>RMS error จริง (kPa) ตามด้วยเปอร์เซ็นต์ที่ใช้ตรวจ</caption><thead><tr><th>Element</th>{fields.map(f=><th key={f}>{f}</th>)}</tr></thead><tbody>{runs.filter(r=>r.mesh==='Q6').map(r=><tr key={r.id}><th>{r.formulation}</th>{fields.map((f,i)=><td key={f}>{fmt(r.stress_rms_error_kPa?.[i]??0)} / {pct(r.stress_rms_relative?.[i]??null)}</td>)}</tr>)}</tbody></table></div>
    <p className="cat-note">M มี τxz exact=0; ค่าที่ไม่เป็นศูนย์จึงเป็นความคลาดเคลื่อนของกรณีทดสอบนี้ เปอร์เซ็นต์เทียบฐาน10kPa ไม่ใช่การเกินกำลังรับแรง</p>
    <h2>แรงรวมเท่ากัน แต่การกระจายแรงต่างกัน · V คงที่</h2>
    <p>เปรียบเทียบ consistent traction กับแบ่งแรงเท่ากันทุก end node; เป็นคนละ boundary condition จึงไม่ให้คะแนน exact error โดยเฉพาะ 20-node อาจเกิดสนามเปลี่ยนตาม y แม้ Uy=0 และยังไม่ได้ตรวจ ny convergence</p>
    <div className="cat-table-scroll"><table className="cat-table"><caption>ผลต่างจากวิธีใส่โหลด ไม่ใช่ความคลาดเคลื่อนเทียบคำตอบ exact</caption><thead><tr><th>Element / mesh</th><th>Δ uz</th><th>Δ τxz RMS ใกล้ปลาย (kPa)</th><th>Δ τxz RMS กลางช่วง (kPa)</th></tr></thead><tbody>{study.mapping_comparisons.map(c=><tr key={c.formulation+c.mesh}><th>{c.formulation} / {c.mesh}</th><td>{pct(c.tip_difference_relative)}</td><td>{fmt(c.regions.find(r=>r.region==='near')?.rms_difference_kPa[5]??0)}</td><td>{fmt(c.regions.find(r=>r.region==='far')?.rms_difference_kPa[5]??0,6)}</td></tr>)}</tbody></table></div>
    <p className="cat-note">ใกล้ปลาย x/L≥0.90; กลางช่วง 0.25≤x/L≤0.75 · ยังไม่ใช้ผลนี้เป็น correction factor ของหลังคาหรือจุดต่อ</p>
    <p className="cat-notice legacy">ขั้นถัดไป: ตรวจ quadratic solid ใน curved coupon ก่อนสร้าง TS-C bay revision ใหม่ สถานะ local-stress convergence ของโมดูลเดิมยังเป็น NOT_ESTABLISHED</p>
    <details><summary>แหล่งอ้างอิง formulation และลำดับ Gauss points</summary>{study.basis.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
    <h2>ภาพดาวน์โหลด · FBD และสรุปผล V คงที่</h2>{study.drawings.map(d=><section className="cat-study-drawing" key={d.id}><div className="cat-status-heading"><h3>{d.title}</h3><DownloadButton artifact={d.artifact}/></div><a className="cat-full-board" href={d.artifact.url} target="_blank" rel="noreferrer"><img src={d.artifact.url} alt={d.title} loading="lazy"/></a></section>)}
  </section>;
}
