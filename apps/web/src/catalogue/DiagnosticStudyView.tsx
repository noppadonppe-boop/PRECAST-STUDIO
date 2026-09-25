import { DownloadButton } from './Downloads';
import type { DiagnosticStudy } from './model';
const pct=(v:number|undefined)=>v===undefined?'—':`${(v*100).toFixed(2)}%`;
export function DiagnosticStudyView({study}:{study:DiagnosticStudy}) {
  const rows=study.coupon_comparisons.filter(c=>c.nu===.2);
  return <section className="cat-detail">
    <div className="cat-detail-heading"><div><span className="cat-eyebrow">STEP 2C / MODEL DIAGNOSTICS</span><h1>มุมโค้งและแรงเฉพาะที่</h1><p>ชิ้นทดสอบ solid–shell {study.run_count} runs และตรวจตำแหน่งเดิมจาก Step 2B · {study.revision}</p></div><span className="cat-badge">ยังไม่พร้อมออกแบบ</span></div>
    {study.status==='STALE'&&<p className="cat-notice legacy" role="alert">ข้อมูลต้นทางเปลี่ยนแล้ว — ผลชุดนี้ STALE ต้องวิเคราะห์ใหม่ก่อนอ้างอิง</p>}
    <section className="cat-pending"><h2>สิ่งที่สรุปได้ในรอบนี้</h2><p>ชิ้นทดสอบมุมโค้งที่ควบคุมการยืดตัวตามความยาวให้เป็นศูนย์ (plane strain) ให้ผลความแข็งใกล้กัน แต่การกระจายความเค้นตามความหนาต่างจากสูตรหน้าตัดตรง ไม่ใช่การตรวจ solid ของโมดูลทั้งชิ้น</p><p>แรงเฉพาะที่ของ Step 2B ยังไม่ครบเกณฑ์ความละเอียดตาข่าย จึงยังไม่เลือกความหนา เหล็ก หรือจุดต่อ และไม่เปลี่ยนสถานะอนุมัติของแบบใด</p></section>
    <h2>ความโค้งมีผลต่อความเค้นอย่างไร</h2>
    <p>โมเมนต์ทดสอบ 1 kN·m/m · R ภายนอก 0.40 ม. · ν=0.20 · ไม่มี self-weight หรือ LL ในชิ้นทดสอบนี้</p>
    <div className="cat-table-scroll"><table className="cat-table"><caption>ผลชิ้นทดสอบ C3 · ตัวคูณเป็นผลทฤษฎีเฉพาะ pure bending ไม่ใช่ตัวคูณออกแบบ</caption><thead><tr><th>หนา (มม.)</th><th>Solid ต่างจากทฤษฎี<br/>พลังงาน</th><th>Shell ต่างจาก solid<br/>พลังงาน</th><th>|ความเค้นผิวใน| / (6M/t²)</th></tr></thead><tbody>{rows.map(c=><tr key={c.t_m}><th>{Math.round(c.t_m*1000)}</th><td>{pct(c.solid_exact_energy_error)}</td><td>{pct(c.shell_vs_solid_energy_difference)}</td><td>{c.inner_stress_to_straight_nominal.toFixed(3)}</td></tr>)}</tbody></table></div>
    <p className="cat-note">ความแข็งใกล้กันไม่ได้รับรองความเค้นเฉพาะที่ ใช้ค่าตารางนี้คูณแรง Step 2B เพื่อออกแบบเหล็กไม่ได้; ยังต้องตรวจ solid แบบขอบอิสระและแรงจริงของ bay</p>
    <h2>ตรวจแรงที่ตำแหน่งเดิม · M3 → M4</h2>
    <p>175 มม. / LL เต็มหลังคา / ซีก LH · 5 สถานี × 3 ตำแหน่ง Y · เกณฑ์ diagnostic 5% คงเดิม</p>
    <div className="cat-table-scroll"><table className="cat-table"><caption>การเปลี่ยนค่าสูงสุดในจุดที่เลือก ใช้ตัวหารขั้นต่ำ 0.1; ไม่ใช่แรงสูงสุดทั้งโมเดล</caption><thead><tr><th>องค์ประกอบ</th>{study.fixed_stations.comparisons.map(c=><th key={c.joint}>{c.joint}</th>)}</tr></thead><tbody>{Object.keys(study.fixed_stations.comparisons[0]?.max_point_changes??{}).map(key=><tr key={key}><th>{key}</th>{study.fixed_stations.comparisons.map(c=><td key={c.joint}>{pct(c.max_point_changes[key])}{Number(c.max_point_changes[key])>.05?' · เกินเกณฑ์':''}</td>)}</tr>)}</tbody></table></div>
    <p className="cat-note">Qy ที่จุดตรวจเหล่านี้นิ่งขึ้น แต่บางองค์ประกอบยังเปลี่ยน ต้องแยกผลของผิวแบนย่อยและการฟื้นค่าจาก Gauss points ต่อ ไม่สรุปว่าสาเหตุเป็นเพียงตำแหน่ง peak ที่เลื่อน</p>
    <h2>ภาพสรุปและดาวน์โหลด</h2>
    {study.drawings.map(d=><section className="cat-study-drawing" key={d.id}><div className="cat-status-heading"><h3>{d.title}</h3><DownloadButton artifact={d.artifact}/></div><a className="cat-full-board" href={d.artifact.url} target="_blank" rel="noreferrer"><img src={d.artifact.url} alt={d.title} loading="lazy"/></a></section>)}
    <details className="cat-source"><summary>วิธีตรวจและแหล่งอ้างอิง</summary><p>stdBrick 3D ภายใต้ข้อบังคับ plane strain เทียบ ShellMITC4; ตรวจ affine patch, สมดุล, Jacobian, 3 ระดับ mesh และคำตอบ elasticity แยกจากข้อกำหนด วสท. การตรวจนี้ไม่ครอบคลุมร้าว แรงด้านข้าง การยก รอยต่อจริง หรือกำลังรับแรง</p><ul>{study.basis.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul></details>
  </section>;
}
