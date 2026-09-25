import type { PilotStudy, ReactionCoefficient } from './model';
import { DownloadButton } from './Downloads';

function coefficientText(value: ReactionCoefficient | undefined) {
  if (!value) return 'ข้อมูลไม่ครบ';
  const { gamma_coefficient: a, LL_constant: b } = value;
  if (Math.abs(a) < 1e-10) return b.toFixed(6);
  return `${a.toFixed(6)} γ ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(6)}`;
}

export function EngineeringStudy({ study }: { study: PilotStudy }) {
  return <section className="cat-detail"><div className="cat-detail-heading"><div><span className="cat-eyebrow">ENGINEERING PILOT / {study.revision}</span><h1>Step 2A · TS-C</h1><p>รูปทรงฐานศึกษา · Free-body diagram · ตำแหน่งและหน้าที่ของจุดต่อ</p></div><span className="cat-badge">{study.status}</span></div>
    <aside className="cat-notice legacy"><strong>{study.status === 'STALE' ? 'ข้อมูลต้นทางเปลี่ยน — ต้องสร้างผลใหม่ก่อนใช้อ้างอิง' : 'เริ่มเตรียมการวิเคราะห์แล้ว · ยังไม่ใช่ผล FEM'}</strong><p>ผู้ใช้ยืนยันขนาดและเริ่มจากชิ้นทึบ ความหนา วัสดุ และจุดต่อจริงยังไม่เลือก สมการสามบานพับเป็นกรณีทดสอบสมดุล ไม่ใช่การรับรองความปลอดภัย</p></aside>
    <div className="cat-table-scroll"><table className="cat-table"><caption>ศึกษาความหนาร่วมผนัง–หลังคา–พื้น · ไม่หักผิวตกแต่ง / ไม่ใช่ขนาดอนุมัติผลิต</caption><thead><tr><th>t = t_f (มม.)</th><th>ปริมาตรต่อซีก (ม³)</th><th>ปริมาตรพื้น (ม³)</th><th>กว้างภายใน (ม.)</th><th>สูงใต้ช่วงราบ (ม.)</th><th>t / R_m</th></tr></thead><tbody>{study.cases.map(c => <tr key={c.t_m}><th scope="row">{(c.t_m*1000).toFixed(0)}</th><td>{c.half_volume_m3.toFixed(4)}</td><td>{c.floor_volume_m3.toFixed(4)}</td><td>{c.clear_width_m.toFixed(3)}</td><td>{c.clear_flat_height_m.toFixed(3)}</td><td>{c.thickness_curvature_ratio.toFixed(3)}</td></tr>)}</tbody></table></div>
    <p className="cat-note">ปริมาตรคำนวณจากรูปทรงทึบ น้ำหนักจริงยังไม่ระบุเพราะความหนาแน่นยังไม่เลือก มุมโค้งต้องตรวจความเหมาะสมของ shell formulation และเทียบ solid บริเวณเฉพาะ</p>
    <section className="cat-pending"><h2>Reaction benchmark · ไม่ใช่ผลของจุดต่อจริง</h2><p>เฉพาะแบบจำลองสามบานพับ 2D: ฐานยึด X/Z ปล่อยโมเมนต์ และ crown ปล่อยโมเมนต์ ใช้ self-weight ทั้งสองซีกและ roof LL ลงแนวดิ่งบนพื้นที่ฉายราบ ไม่รวมพื้น/ผิวตกแต่ง/ลม/ขั้นตอนยก</p><p>γ คือหน่วยน้ำหนักคอนกรีต (kN/m³) ยังไม่เลือก · ทุกแรงในตารางมีหน่วย kN · H = แรงฐานซ้ายทิศ +X และฐานขวาทิศ −X · Cz คือแรง crown บน LH ทิศ +Z</p>
      <div className="cat-table-scroll"><table className="cat-table"><caption>แรง = สัมประสิทธิ์ × γ + ส่วนของ roof LL · ไม่ได้คูณ load factors</caption><thead><tr><th>t (มม.)</th><th>รูปแบบ roof LL</th><th>R_Lz ↑</th><th>R_Rz ↑</th><th>H</th><th>Cz (LH)</th></tr></thead><tbody>{study.cases.flatMap(c => Object.entries(c.reaction_coefficients).map(([pattern, r]) => <tr key={`${c.t_m}-${pattern}`}><th scope="row">{(c.t_m*1000).toFixed(0)}</th><td>{pattern === 'SYMMETRIC_FULL' ? 'เต็มหลังคา' : 'ครึ่งซ้าย'}</td>{['RLz_kN','RRz_kN','RLx_kN','crown_on_LH_Cz_kN'].map(key => <td key={key}>{coefficientText(r[key])}</td>)}</tr>))}</tbody></table></div>
      <p>crown shear เป็นศูนย์เฉพาะกรณีสมมาตรนี้ ห้ามใช้ผลดังกล่าวตัดการรับแรงเฉือนของจุดต่อ ต้องเลือก support/joint stiffness และตรวจเสถียรภาพ 3D ก่อนวิเคราะห์ชิ้นงานจริง</p>
    </section>
    {study.drawings.map(d => <section className="cat-study-drawing" key={d.id}><div className="cat-status-heading"><h2>{d.title}</h2><DownloadButton artifact={d.artifact}/></div><a className="cat-full-board" href={d.artifact.url} target="_blank" rel="noreferrer"><img src={d.artifact.url} loading="lazy" alt={d.title}/></a><p className="cat-note">{d.id} · เปิดภาพเพื่อดูเต็มความละเอียด</p></section>)}
    <section className="cat-pending"><h2>ก่อนรัน plate / shell ของชิ้นงานจริง</h2><p>ต้องกำหนดวัสดุและ E / ν / ความหนาแน่น, เส้นทางแรงลงฐานหรือผ่านพื้น, ความแข็งและการสัมผัสของจุดต่อ, โหลด/combination และวิธีตรวจแบบจำลอง</p><p>ยังไม่มีแรงภายใน shell N/M/Q, การโก่ง/ร้าว, ผลออกแบบเหล็ก หรือขนาดและจำนวนอุปกรณ์จุดต่อที่อนุมัติ</p></section>
    <details className="cat-source"><summary>แหล่งอ้างอิงและความเชื่อมโยง</summary><p>เอกสารต่อไปนี้ใช้ประกอบหลักการ ไม่ใช่การตรวจผ่านมาตรฐานออกแบบโครงการ</p><ul>{study.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul><p>Input SHA-256: <code>{study.input_hash}</code></p></details>
  </section>;
}
