import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { designCriteriaIssues, emptyDesignCriteria, type DesignCriteria } from '@precast/domain';
import { designCriteriaSchema } from '@precast/schemas';
import { useSharedDocument } from '../data/useSharedDocument';
import { stageFor, stageHref, studioStages } from '../data/studioNavigation';
import { DesignCriteriaEditor } from '../components/DesignCriteriaEditor';
import { PrestressCalculator } from '../components/PrestressCalculator';
import type reference from '../../public/samples/test-module/sample.json';
import './test-module.css';

export type TestModuleSample = typeof reference;
const root = '/samples/test-module';
const fmt = (v: number, digits = 3) => v.toLocaleString('en-US', { maximumFractionDigits: digits });
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="tm-table-scroll"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
function sameCriteria(a: DesignCriteria, b: TestModuleSample['criteria']) {
  if (a.prestressCalculation) return false;
  return Object.entries(b.values).every(([key, value]) => a.values[key as keyof DesignCriteria['values']] === value)
    && b.standards.every((s) => { const candidate = a.standards.find((item) => item.category === s.category); return candidate && Object.entries(s).every(([key, value]) => candidate[key as keyof typeof candidate] === value); });
}
function Model({ sample, selected }: { sample: TestModuleSample; selected: string }) {
  const triangles = sample.model.elements.flatMap((el) => {
    const v = el.verticesM;
    const result = [];
    for (let i = 0; i < el.triangles.length; i += 3) {
      const points = el.triangles.slice(i, i + 3).map((id) => [v[id * 3]!, v[id * 3 + 1]!, v[id * 3 + 2]!]);
      result.push({ id: `${el.id}-${i}`, selected: el.id === selected, floor: el.kind === 'floor', depth: points.reduce((s, p) => s + p[0]! + p[1]! + p[2]! * 0.1, 0), points: points.map((p) => `${(p[0]! - p[1]!) * 70},${(p[0]! + p[1]!) * 32 - p[2]! * 70}`).join(' ') });
    }
    return result;
  }).sort((a, b) => a.depth - b.depth);
  return <svg className="tm-model" viewBox="-440 -370 880 590" role="img" aria-label="โมเดลจาก IFC จริง ผนัง 4 พื้น 1 ช่องเปิด 3"><rect x="-440" y="-370" width="880" height="590" fill="#eef3f6" />{triangles.map((t) => <polygon key={t.id} points={t.points} fill={t.selected ? '#eeb68c' : t.floor ? '#8d9fae' : '#c6d5df'} stroke={t.selected ? '#9d5120' : '#8197a6'} strokeWidth="0.7" />)}<text x="-410" y="180" fill="#344b5c" fontSize="16">IFC geometry · m · TEST ONLY</text></svg>;
}
export function TestModuleWorkspace({ projectId }: { projectId: string }) {
  const { gateId } = useParams();
  const location = useLocation();
  const stage = stageFor(gateId ?? 'g0', new URLSearchParams(location.search).get('view'));
  const record = useSharedDocument<TestModuleSample | null>('intake', `${projectId}-sample`, null);
  const basis = useSharedDocument('criteria', `${projectId}-design-basis`, emptyDesignCriteria());
  const parsed = designCriteriaSchema.safeParse(basis.data);
  if (record.error || basis.error) return <div role="alert">{record.error || basis.error}</div>;
  if (!record.loaded || !basis.loaded) return <p role="status">กำลังโหลด Test Module จาก Firebase…</p>;
  if (!record.data || !parsed.success) return <p role="alert">ข้อมูล Test Module ไม่ครบหรือรูปแบบไม่ถูกต้อง กรุณาตรวจทะเบียนตัวอย่าง</p>;
  return <TestModuleContent sample={record.data} menu={stage.id} criteria={parsed.data} onCriteriaChange={basis.setData} criteriaActions={<><button className="button button--primary" disabled={!basis.dirty || basis.saving} onClick={() => void basis.save()}>บันทึกร่าง Design Basis</button><button className="button button--secondary" disabled={basis.saving} onClick={basis.reload}>โหลดค่าล่าสุด</button><p role="status">{basis.saving ? 'กำลังบันทึก…' : basis.dirty ? 'มีการแก้ไขยังไม่บันทึก' : `บันทึกแล้ว R${basis.revision} · ร่างทดสอบ`}</p></>} />;
}
export function TestModuleContent({ sample, menu, criteria, onCriteriaChange, criteriaActions }: { sample: TestModuleSample; menu: string; criteria: DesignCriteria; onCriteriaChange: (value: DesignCriteria) => void; criteriaActions?: ReactNode }) {
  const [selected, setSelected] = useState('TM-W01');
  const el = sample.model.elements.find((item) => item.id === selected)!;
  const step = sample.stages.find((s) => s.menu === menu)!;
  const stale = !sameCriteria(criteria, sample.criteria);
  const missing = designCriteriaIssues(criteria).length;
  const base = `/org/precast-studio/projects/${sample.id}`;
  return <div className="tm-workspace">
    <header className="tm-heading"><div><p className="eyebrow">RETAINED EXAMPLE · {sample.version}</p><h1>Test Module · {step.title}</h1><p>ลำดับทดสอบ {step.sequence} / G0–G9 · Engineering Gate {step.gate}</p></div><a className="button button--secondary" href={`${root}/Test-Module.zip`} download>ดาวน์โหลดชุดตัวอย่าง</a></header>
    <aside className="tm-notice"><b>TEST ONLY · ห้ามใช้ก่อสร้าง / ส่งผลิต</b><p>เรขาคณิตจาก Revit ผ่าน IFC จริง · วัสดุ แรง รอยต่อ และราคาเป็นสมมติฐานทดสอบ · ผลทางวิศวกรรมยังไม่อนุมัติ</p></aside>
    {stale && <aside role="alert" className="tm-notice"><b>OUT OF DATE</b><p>Design Criteria เปลี่ยนจาก TM-R1 ผล benchmark, BOQ และไฟล์ดาวน์โหลดยังอ้างอิงค่าฐานเดิม ต้องสร้างผลใหม่ก่อนใช้เปรียบเทียบ</p></aside>}
    <nav className="tm-steps" aria-label="ลำดับทดสอบ G0–G9">{studioStages.map((s, i) => <Link key={s.id} aria-current={s.id === menu ? 'step' : undefined} to={stageHref(base, s)}>G{i} · {s.label}</Link>)}</nav>
    <section className="tm-card"><h2>วิธีทดสอบขั้นนี้</h2><p>{step.procedure}</p><p className="tm-muted">หลักฐาน: {step.evidence}</p><p><b>Engineering: {step.engineeringStatus}</b> · <a href={`${root}/TEST_RESULTS.md`} target="_blank" rel="noreferrer">บันทึกผลทดสอบระบบ</a></p></section>
    {['intake', 'panel', 'loads', 'analysis', 'design'].includes(menu) && <section className="tm-card tm-model-grid"><div><Model sample={sample} selected={selected} /><div className="tm-selection">{sample.model.elements.map((e) => <button type="button" key={e.id} aria-pressed={e.id === selected} onClick={() => setSelected(e.id)}>{e.id}</button>)}</div></div><div><h2>{el.id} · {el.kind === 'wall' ? 'ผนัง' : 'พื้น'}</h2><p>{fmt(el.widthM * 1000, 0)} × {fmt(el.heightM * 1000, 0)} × {fmt(el.thicknessM * 1000, 0)} mm</p><p>ปริมาตรสุทธิ {fmt(el.volumeM3)} m³</p><p>มวลทดลอง {fmt(el.volumeM3 * 2400, 1)} kg</p><p>ช่องเปิด {el.openings.length} จุด</p><p className="tm-muted">GUID {el.globalId}<br />Revit ID {el.revitElementId}</p><p>รวม 5 ชิ้น · {fmt(sample.model.totalVolumeM3)} m³ · {fmt(sample.model.totalVolumeM3 * 2400, 1)} kg</p></div></section>}
    {menu === 'intake' && <section className="tm-card"><h2>Source register</h2><Table headers={['รายการ', 'ข้อมูล']} rows={Object.entries(sample.source).map(([key, value]) => [key, value])} /><Table headers={['Geometry QA', 'ผล']} rows={sample.model.checks.map((check) => [check.id, check.passed ? 'PASS · local IFC extraction' : 'FAIL'])} /><p>ใช้ IFC companion ที่มีอยู่ใน Folder; ไม่ได้แก้ RVT หรือรับรอง production scanner / controlled intake</p></section>}
    {menu === 'criteria' && <><section className="tm-card"><h2>TM-DB-001 R1 · ข้อมูลครบสำหรับตัวอย่าง</h2><p>มาตรฐาน 8 หมวด · ช่องข้อมูล 37 รายการ · ช่องที่ต้องเติมเพิ่ม {missing} รายการ</p><p>ค่าตัวเลขทั้งหมดในทะเบียนนี้เป็น TEST ASSUMPTION; มีข้อมูลครบไม่ได้หมายถึงผ่าน Code หรือได้รับอนุมัติ</p></section><DesignCriteriaEditor value={criteria} onChange={onCriteriaChange} actions={criteriaActions} /></>}
    {menu === 'panel' && <section className="tm-card"><h2>บัญชีชิ้นงานจาก IFC</h2><Table headers={['Panel', 'ชนิด', 'ขนาด mm', 'ช่องเปิด', 'สุทธิ m³']} rows={sample.model.elements.map((e) => [e.id, e.kind, `${fmt(e.widthM * 1000, 0)} × ${fmt(e.heightM * 1000, 0)} × ${fmt(e.thicknessM * 1000, 0)}`, e.openings.length, fmt(e.volumeM3)])} /><p>คงขอบเขต element จาก Revit เป็น 5 ชิ้น; joint 20 mm ยังไม่หักจาก source ต้องตรวจ constructability ก่อนผลิต</p></section>}
    {menu === 'loads' && <section className="tm-card"><h2>TM-LD-001 R1 · แรงและจุดรองรับทดสอบ</h2><Table headers={['รายการ', 'สมมติฐาน']} rows={(['deadLoad', 'liveLoad', 'wind', 'seismic', 'serviceCombinations', 'ultimateCombinations', 'loadPath', 'constructionLoads', 'lifting', 'transport', 'storage', 'installation'] as const).map((key) => [key, sample.criteria.values[key]])} /><Table headers={['Panel', 'W kN', 'Sling demand kN', 'Transport vertical kN', 'Horizontal kN']} rows={sample.panels.map((p) => [p.id, fmt(p.weightKn), fmt(p.liftSlingDemandKn), fmt(p.transportVerticalKn), fmt(p.transportHorizontalKn)])} /><p>Demand เท่านั้น · anchor capacity / ตำแหน่งจุดยก NOT_CHECKED</p></section>}
    {menu === 'analysis' && <section className="tm-card"><h2>ผล FE benchmark ที่รันจริง</h2><p>{sample.analysis.method}</p><p>L=3.0 m · b=1.0 m · h=0.3 m · E=28,000 MPa · q={fmt(sample.analysis.serviceLineLoadKnM, 6)} kN/m</p><p>Closed form: 5qL⁴/(384EI) = {fmt(sample.analysis.exactDeflectionMm, 8)} mm; Mmax = {fmt(sample.analysis.exactMomentKnm, 6)} kN·m</p><Table headers={['Elements', 'FE deflection mm', 'Relative error', 'R left kN', 'R right kN', 'Residual kN']} rows={sample.analysis.runs.map((r) => [r.elements, fmt(r.deflectionMm, 8), r.relativeError.toExponential(2), fmt(r.reactionLeftKn, 6), fmt(r.reactionRightKn, 6), r.balanceErrorKn.toExponential(2)])} /><p>เฉพาะ strip benchmark · โมดูลทั้งหลังและผลระยะยาว NOT_CHECKED</p></section>}
    {menu === 'design' && <section className="tm-card"><h2>Trial reinforcement / Design check register</h2><p>{sample.criteria.values.prestress}</p><Table headers={['รายการตรวจ', 'สถานะ']} rows={['กำลังดัดและแรงเฉือน', 'เหล็กรอบช่องเปิด / anchorage / lap', 'รอยร้าว / creep / shrinkage', 'รอยต่อ / bearing / dowel / sleeve', 'ยก / พลิก / ขนส่ง / ค้ำยัน', 'แรงด้านข้างและเสถียรภาพทั้งโมดูล'].map((name) => [name, 'NOT_CHECKED'])} /><p>เหล็กทดลองและ allowance ใน BOQ เป็นข้อมูลตั้งต้นสำหรับทดสอบ ไม่มี BBS ที่ออกแบบรับรองแล้ว</p></section>}
    {menu === 'cost' && <section className="tm-card"><h2>BOQ จากปริมาตร IFC + สมมติฐานราคา</h2><p>{sample.cost.priceBook}</p><Table headers={['รายการ', 'ที่มา', 'ปริมาณ', 'หน่วย', 'ราคา THB', 'จำนวนเงิน THB']} rows={sample.cost.rows.map((r) => [r.item, r.basis, fmt(r.quantity, 5), r.unit, fmt(r.rate, 2), fmt(r.amountThb, 2)])} /><h3>รวมเฉพาะขอบเขตตัวอย่าง {fmt(sample.cost.totalThb, 2)} THB</h3><a href={`${root}/Test-Module-BOQ.csv`} download>ดาวน์โหลด BOQ CSV</a></section>}
    {menu === 'report' && <section className="tm-card"><h2>รายการคำนวณและหลักฐาน TM-R1</h2><p>Source register → Design Basis → load protocol → FE benchmark → lifecycle demand → BOQ → issue register → geometry drawings</p><div className="tm-links"><a href={`${root}/Test-Module-Report.html`} target="_blank" rel="noreferrer">เปิดรายงานฉบับเต็ม / พิมพ์เป็น PDF</a><a href={`${root}/benchmark.json`} download>ผล solver JSON</a><a href={`${root}/manifest.json`} download>SHA-256 manifest</a></div><p>รายงานทดสอบไม่มีลายเซ็นหรือผลอนุมัติทางวิศวกรรม</p></section>}
    {menu === 'shop' && <section className="tm-card"><h2>Geometry drawings · DXF / SVG</h2><label>เลือกชิ้นงาน <select value={selected} onChange={(event) => setSelected(event.target.value)}>{sample.model.elements.map((e) => <option key={e.id}>{e.id}</option>)}</select></label><img className="tm-drawing" src={`${root}/drawings/${selected}.svg`} alt={`แบบ geometry ${selected} หน่วย mm`} /><div className="tm-links"><a href={`${root}/drawings/${selected}.dxf`} download>ดาวน์โหลด {selected} DXF</a><a href={`${root}/drawings/${selected}.svg`} download>ดาวน์โหลด {selected} SVG</a></div><p>แสดง outline/ช่องเปิดตาม IFC ไม่มีรายละเอียดเหล็กและ anchor · Native Revit import NOT_TESTED</p></section>}
    {menu === 'release' && <section className="tm-card"><h2>RELEASE BLOCKED</h2><p>{sample.release.reason}</p><button className="button button--primary" disabled aria-describedby="tm-release-reason">ส่งผลิต</button><p id="tm-release-reason">เก็บเป็นชุดตัวอย่างสำหรับทดสอบเท่านั้น ไม่มี Production Release ที่อนุมัติ</p><a href={`${root}/manifest.json`} download>ตรวจรายการไฟล์และ SHA-256</a></section>}
    {['analysis', 'design', 'report'].includes(menu) && <section className="tm-card"><PrestressCalculator value={criteria} /></section>}
    <section className="tm-card"><h2>ประเด็นที่ต้องตรวจต่อก่อนใช้จริง</h2><Table headers={['ID', 'เรื่อง', 'รายละเอียด', 'สถานะ']} rows={sample.issues.map((i) => [i.id, i.subject, i.detail, i.status])} /></section>
  </div>;
}
