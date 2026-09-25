import {useState} from 'react';
import {DownloadButton} from './Downloads';
import type {StressStudy} from './model';
const groups:Record<string,string>={regular_interior:'บริเวณภายใน',side_edge:'ใกล้ขอบด้านข้าง Y',base_probe:'เหนือฐาน 50 มม.',crown_probe:'ห่างแนว crown 50 มม.'};
const labels:Record<string,string>={ss:'σss',yy:'σyy',nn:'σnn',sy:'τsy',sn:'τsn',yn:'τyn'};
const f=(n:number|undefined,d=2)=>n===undefined?'—':(Math.abs(n)<.5*10**-d?0:n).toFixed(d);
export function StressStudyView({study}:{study:StressStudy}){
  const [pattern,setPattern]=useState('FULL'),[group,setGroup]=useState('regular_interior');
  const qa=study.comparisons.find(c=>c.pattern===pattern)?.groups.find(g=>g.group===group);
  const run=study.runs.find(r=>r.pattern===pattern&&r.mesh==='D3');
  return <section className="cat-detail">
    <div className="cat-detail-heading"><div><span className="cat-eyebrow">STEP 2E / LOCAL STRESS DIAGNOSTIC</span><h1>ความเค้นเฉพาะที่ยังต้องตรวจต่อ</h1><p>t175 มม. / F-R limit / คอนกรีตเชิงเส้นไม่ร้าว · {study.revision}</p></div><span className="cat-badge">ยังไม่พร้อมออกแบบ</span></div>
    {study.status==='STALE'&&<p role="alert" className="cat-notice legacy">ข้อมูลต้นทางเปลี่ยน — ผล Step 2E เป็น STALE ต้องสร้างใหม่</p>}
    <div className="cat-tools"><label>Roof LL<select aria-label="โหลดความเค้น" value={pattern} onChange={e=>setPattern(e.target.value)}><option value="FULL">เต็มหลังคา</option><option value="LEFT">ครึ่งซ้าย</option></select></label><label>บริเวณตรวจ<select aria-label="บริเวณความเค้น" value={group} onChange={e=>setGroup(e.target.value)}>{Object.entries(groups).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
    <p className="cat-note">ใช้ผล Solid เดิม 6 ชุด ไม่ได้รัน FEM ใหม่ · 490 พิกัดร่วมต่อชุด ทั้ง LH/RH · ตรวจจาก displacement gradient และเทียบ stress ที่ Gauss ทุกจุด · ไม่ extrapolate ถึงผิวคอนกรีต</p>
    <p className="cat-note">รอยแบ่ง element คือรอยแบ่งตาข่ายภายในเนื้อคอนกรีต ไม่ใช่รอยต่อชิ้น precast · ค่าเปลี่ยนระหว่าง mesh ไม่ใช่ค่าความคลาดเคลื่อนเทียบคำตอบจริงที่ทราบแล้ว</p>
    {qa&&<><h2>D2 → D3 · {groups[qa.group]} · {qa.points} จุด</h2><p className="cat-notice legacy">{qa.all_six_targets_met?'เข้าเกณฑ์เฉพาะจุดที่สุ่มตรวจ ไม่ใช่ทั้งโมเดล':'ยังไม่เข้าเกณฑ์ครบทั้ง 6 องค์ประกอบ'} · เป้าหมายเชิงตัวเลข 5% ไม่ใช่เกณฑ์กำลังตามมาตรฐาน</p>
      <div className="cat-table-scroll"><table className="cat-table"><caption>การเปลี่ยนความเค้นและความต่างระหว่าง element; ตัวหาร point/spread = max(|ค่าละเอียด|,10 kPa)</caption><thead><tr><th>องค์ประกอบ</th><th>Δ จุดสูงสุด</th><th>Δ จริง (kPa)</th><th>RMS เปลี่ยน</th><th>ช่วงด้านติดกัน D3</th><th>ผลครบ 3 เกณฑ์</th></tr></thead><tbody>{qa.fields.map(v=><tr key={v.component}><th>{labels[v.component]}</th><td>{f(v.max_point_change*100,1)}%</td><td>{f(v.difference_kPa)}</td><td>{f(v.rms_change*100,1)}%</td><td>{f(v.max_spread_relative*100,1)}%</td><td>{v.targets_met?'เข้าเกณฑ์เฉพาะที่ตรวจ':'ยังไม่ครบ'}</td></tr>)}</tbody></table></div>
      <details><summary>พิกัดที่ค่าเปลี่ยนมากที่สุดและช่วงค่าด้านติดกัน</summary>{qa.fields.map(v=><p key={v.component}><strong>{labels[v.component]}</strong> · {v.worst_point}: D2={f(v.coarse_kPa)} → D3={f(v.fine_kPa)} kPa; จุดช่วงกว้างสุด {v.spread_point}: {f(v.spread_kPa)} kPa</p>)}</details></>}
    {run&&<><h2>ตัวอย่างผ่านความหนา · {pattern} / D3 / LH / C45 / Y=0.75 ม.</h2><p className="cat-note">หน่วย kPa, tension บวก; s ตามหน้าตัดจากฐาน LH ขึ้นข้าม crown ลงฐาน RH, y ตาม bay, n ออกนอกคอนกรีต · f วัดจากผิวในหารความหนา</p><div className="cat-table-scroll"><table className="cat-table"><caption>ค่าเฉลี่ยจากด้านที่ติดจุดเดียวกัน พร้อมช่วง τsn ที่ยังต่างกัน ไม่ใช่ค่าผิวหรือแรงออกแบบ</caption><thead><tr><th>f</th>{['ss','yy','nn','sy','sn','yn'].map(s=><th key={s}>{labels[s]}</th>)}<th>ช่วง τsn</th></tr></thead><tbody>{run.profile.map(p=><tr key={p.key}><th>{f(p.fraction)}</th>{p.mean_kPa.map((v,i)=><td key={i}>{f(v)}</td>)}<td>{f(p.min_kPa[4])} ถึง {f(p.max_kPa[4])}</td></tr>)}</tbody></table></div></>}
    <p className="cat-notice legacy">แรงรวมที่นิ่งใน Step 2D ไม่ได้ยืนยันว่าความเค้นเฉพาะที่นิ่งตาม ต้องตรวจ formulation/การแบ่ง mesh/การใส่โหลดและฐาน ก่อนใช้ผลออกแบบเหล็กหรือจุดต่อ ไม่ได้แปลว่ากำลังของอาคารผ่านหรือไม่ผ่าน</p>
    <h2>ภาพดาวน์โหลด · กราฟตัวอย่างคงที่ FULL</h2>{study.drawings.map(d=><section className="cat-study-drawing" key={d.id}><div className="cat-status-heading"><h3>{d.title}</h3><DownloadButton artifact={d.artifact}/></div><a className="cat-full-board" href={d.artifact.url} target="_blank" rel="noreferrer"><img src={d.artifact.url} alt={d.title} loading="lazy"/></a></section>)}
  </section>;
}
