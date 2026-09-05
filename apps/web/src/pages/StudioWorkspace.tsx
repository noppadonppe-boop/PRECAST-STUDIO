import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { EmptyState, StatusBadge, Surface } from '@precast/ui';
import { useAuth } from '../auth/AuthContext';
import { useProjectDirectory } from '../data/useProjectDirectory';
import { stageFor, stageHref, studioStages } from '../data/studioNavigation';
import { StageWorkspace } from './StageWorkspace';
import { StudioModelPreview, panelVolume, previewPanels, type PreviewPanel } from '../components/StudioModelPreview';
import { useSharedDocument } from '../data/useSharedDocument';
import { SharedMenuEditor } from '../components/SharedMenuEditor';

const sections = ['ปกและการควบคุมเอกสาร', 'ขอบเขตและข้อจำกัด', 'มาตรฐานและเกณฑ์ออกแบบ', 'วัสดุ', 'แรงและชุดน้ำหนัก', 'แบบจำลองและสมมติฐาน', 'การตรวจสอบโมเดลและสมดุล', 'ผลการวิเคราะห์', 'ชิ้นงานและเหล็กเสริม', 'รอยต่อ Anchor และ Bearing', 'การยก ขนส่ง และติดตั้ง', 'ข้อสรุปและประเด็นค้าง', 'ภาคผนวก'];
const fmt = (value: number, digits = 2) => value.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function StudioWorkspace() {
  const { projectId, gateId } = useParams();
  const { mode } = useAuth();
  // Preserve the existing controlled workflow and authorization in emulator mode.
  return mode !== 'emulator' ? <PreviewWorkspace key={projectId} gateId={gateId ?? 'g0'} /> : <div className="studio-controlled"><StageWorkspace key={projectId} /></div>;
}

function PreviewWorkspace({ gateId }: { gateId: string }) {
  const { projectId } = useParams();
  const { organizationMembership, mode } = useAuth();
  const { projects } = useProjectDirectory();
  const location = useLocation();
  const stage = stageFor(gateId, new URLSearchParams(location.search).get('view'));
  const project = projects.find((item) => item.id === projectId);
  const panelRecord = useSharedDocument<PreviewPanel[]>('panel', projectId!, previewPanels.map((item) => ({ ...item })));
  const { data: panels, setData: setPanels } = panelRecord;
  const costRecord = useSharedDocument('cost', projectId!, { rate: 3450, waste: 3 });
  const [selectedId, setSelectedId] = useState('P-W03');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [costTab, setCostTab] = useState('quantity');
  const [reportSection, setReportSection] = useState(0);
  const [criteriaTab, setCriteriaTab] = useState('วัสดุ');
  const { rate, waste } = costRecord.data;
  const setRate = (value: number) => costRecord.setData((previous) => ({ ...previous, rate: value }));
  const setWaste = (value: number) => costRecord.setData((previous) => ({ ...previous, waste: value }));
  const [notice, setNotice] = useState('');
  const selected = panels.find((item) => item.id === selectedId) ?? panels[0]!;
  const volume = panels.reduce((sum, item) => sum + panelVolume(item), 0);
  const total = volume * (1 + waste / 100) * rate;
  const base = `/org/${organizationMembership.orgId}/projects/${projectId}`;
  if (!project) return <EmptyState icon="!" title="ไม่พบโครงการที่เข้าถึงได้" detail="กลับไปตรวจรายการโครงการและสิทธิ์ปัจจุบัน" />;
  const next = studioStages[studioStages.findIndex((item) => item.id === stage.id) + 1];
  function updateThickness(value: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 50 || number > 500) { setNotice('ความหนาตัวอย่างต้องอยู่ระหว่าง 50–500 mm'); return; }
    setPanels((items) => items.map((item) => item.id === selectedId ? { ...item, thickness: number } : item));
    setNotice('ปรับตัวอย่างแล้ว · ปริมาตร น้ำหนัก BOQ และ Drawing อัปเดตตามชิ้นงาน');
  }
  const modelView = ['intake', 'panel', 'loads', 'analysis', 'design'].includes(stage.id);
  return <div className="studio-engineering">
    {mode === 'shared' && <><SharedMenuEditor key={stage.id} category={stage.id} id={`${projectId}-notes`} title={`ข้อมูลเมนู · ${stage.label}`} />
      <section className="surface studio-form-surface"><p>ขนาดชิ้นงานและสมมติฐานราคาเป็นแบบร่างเริ่มต้น · บันทึกลง Firebase เมื่อกดปุ่ม</p><div className="dialog-actions">
        <button className="button button--primary" disabled={!panelRecord.loaded || panelRecord.saving || !panelRecord.dirty} onClick={() => void panelRecord.save()}>บันทึกชิ้นงาน</button>
        <button className="button button--primary" disabled={!costRecord.loaded || costRecord.saving || !costRecord.dirty} onClick={() => void costRecord.save()}>บันทึกราคาและสูญเสีย</button>
        <button className="button button--secondary" disabled={panelRecord.saving || costRecord.saving} onClick={() => { panelRecord.reload(); costRecord.reload(); }}>โหลดค่าล่าสุด</button>
      </div><p role="status">{panelRecord.saving || costRecord.saving ? 'กำลังบันทึก Firebase…' : panelRecord.dirty || costRecord.dirty ? 'มีการแก้ไขที่ยังไม่บันทึก' : 'ชิ้นงานและราคา · ไม่มีการแก้ไขค้างบันทึก'}</p>{(panelRecord.error || costRecord.error) && <p role="alert">{panelRecord.error || costRecord.error}</p>}</section></>}
    <div className="studio-page-heading"><div><h1>{stage.title}</h1><p>{stage.id === 'panel' ? 'กำหนดขอบเขต Panel, Joint, Opening และข้อจำกัดการผลิต' : 'ตรวจชิ้นงาน ข้อมูลอ้างอิง และเงื่อนไขก่อนเข้าสู่ขั้นตอนถัดไป'}</p></div><StatusBadge tone="warning">{stage.gate} · ตัวอย่าง UX/UI</StatusBadge></div>
    <Surface className="studio-revisions" ariaLabel="Current revision context"><span>โครงการ <b>{project.code}</b></span><span>Source <b>{project.sourceRevision}</b></span><span>Design Basis <b>{project.designBasisRevision}</b></span><span>Model <b>{project.modelRevision}</b></span></Surface>
    <div className="studio-context-tools"><p className="studio-mode-note">โมเดลตัวอย่าง UX/UI · ไม่ใช่ BIM ที่นำเข้า · ปรับค่าเพื่อทดลองได้</p>
    <button className="studio-inspector-toggle button button--secondary" type="button" aria-expanded={inspectorOpen} aria-controls="studio-inspector" onClick={() => setInspectorOpen(!inspectorOpen)}>{inspectorOpen ? 'ซ่อน' : 'แสดง'}คุณสมบัติ</button></div>
    <div className={`studio-engineering-grid ${inspectorOpen ? '' : 'studio-inspector-hidden'}`}>
      <div className="studio-working-surface">
        {modelView && <StudioModelPreview panels={panels} selectedId={selectedId} onSelect={setSelectedId} overlay={stage.id} />}
        {stage.id === 'criteria' && <Surface className="studio-form-surface"><div className="studio-tabs" aria-label="หมวดเกณฑ์ออกแบบ">{['มาตรฐาน', 'วัสดุ', 'แรงและชุดน้ำหนัก', 'การยกและขนส่ง'].map((item) => <button type="button" key={item} aria-pressed={criteriaTab === item} onClick={() => setCriteriaTab(item)}>{item}</button>)}</div><h2>{criteriaTab}</h2>{criteriaTab === 'วัสดุ' ? <><p>ค่าประกอบหน้าจอจากต้นแบบ · ยังไม่ใช่ Design Basis ที่อนุมัติ</p><dl className="studio-facts"><div><dt>วัสดุ</dt><dd>LC-1200</dd></div><div><dt>ความหนาแน่นตัวอย่าง</dt><dd>1,200 kg/m³</dd></div><div><dt>กำลังอัดตัวอย่าง</dt><dd>18 MPa · ต้องตรวจรับรอง</dd></div></dl></> : <><p>ต้องกำหนดข้อมูลและแหล่งอ้างอิงใน Design Basis ของโครงการก่อนส่งตรวจ</p><ul className="studio-check-list">{(criteriaTab === 'มาตรฐาน' ? ['มาตรฐานออกแบบและปีที่ใช้', 'มาตรฐานน้ำหนักบรรทุก', 'ระบบหน่วยและแหล่งอ้างอิง'] : criteriaTab === 'แรงและชุดน้ำหนัก' ? ['Service / Ultimate combinations', 'น้ำหนักถาวรและน้ำหนักจร', 'ลม แผ่นดินไหว และแรงระหว่างก่อสร้าง'] : ['กำลังคอนกรีตขณะยก', 'Dynamic factor และมุมสลิง', 'ตำแหน่งรองรับระหว่างขนส่ง']).map((item) => <li key={item}>{item}<StatusBadge tone="neutral">ยังไม่กำหนด</StatusBadge></li>)}</ul></>}</Surface>}
        {stage.id === 'cost' && <Surface className="studio-cost"><div className="studio-tabs" aria-label="มุมมองประมาณราคา">{[['quantity', 'Quantity Takeoff'], ['summary', 'Cost Summary'], ['assumptions', 'Assumptions']].map(([id, label]) => <button type="button" key={id} aria-pressed={costTab === id} onClick={() => setCostTab(id!)}>{label}</button>)}</div><div className="studio-document-heading"><h2>BOQ · โมเดลตัวอย่างสองผนัง</h2><p>เลือกแถวเพื่อดูชิ้นงานและแก้สมมติฐานราคา</p></div>{costTab === 'quantity' ? <div className="table-scroll"><table className="data-table"><thead><tr><th>ชิ้นงาน / รายการ</th><th>ปริมาณสุทธิ</th><th>สูญเสีย</th><th>ราคาต่อ m³</th><th>จำนวนเงิน</th></tr></thead><tbody>{panels.map((panel) => <tr key={panel.id} className={selectedId === panel.id ? 'studio-selected-row' : ''}><td><button className="studio-text-button" type="button" onClick={() => setSelectedId(panel.id)}>{panel.id} · คอนกรีต LC-1200</button></td><td>{fmt(panelVolume(panel), 3)} m³</td><td>{waste}%</td><td>{fmt(rate)}</td><td>{fmt(panelVolume(panel) * (1 + waste / 100) * rate)}</td></tr>)}</tbody><tfoot><tr><th colSpan={4}>รวมคอนกรีตตัวอย่าง</th><td>{fmt(total)} THB</td></tr></tfoot></table></div> : costTab === 'summary' ? <div className="studio-cost-summary"><h3>ค่าวัสดุคอนกรีต</h3><strong>{fmt(total)} <small>THB</small></strong><p>ปริมาณสุทธิ {fmt(volume, 3)} m³ · ปริมาณรวมสูญเสีย {fmt(volume * (1 + waste / 100), 3)} m³</p><p>ยังไม่รวมเหล็ก Anchor แม่พิมพ์ ค่าแรง ขนส่ง ติดตั้ง และภาษี จึงยังไม่ใช่ราคาทั้งโครงการ</p></div> : <div className="studio-form-surface"><h3>สมมติฐานและข้อยกเว้น</h3><ul><li>ปริมาตรคำนวณจากขนาดผนัง หักช่องเปิด และคูณความหนา</li><li>ราคา {fmt(rate)} THB/m³ เป็นค่าตัวอย่าง ไม่ใช่ Price Book ที่อนุมัติ</li><li>สูญเสีย {waste}% แสดงแยกจากปริมาณสุทธิ</li><li>ไม่มีผลคำนวณเหล็กเสริม จึงไม่แทนรายการที่ขาดด้วยราคา 0</li></ul></div>}</Surface>}
        {stage.id === 'report' && <Surface className="studio-report-layout"><nav aria-label="สารบัญรายการคำนวณ">{sections.map((title, index) => <button type="button" key={title} aria-current={reportSection === index ? 'page' : undefined} onClick={() => setReportSection(index)}>{index + 1}. {title}</button>)}</nav><article className="studio-paper"><div className="studio-paper-head">PRECAST STUDIO <span>DRAFT · ตัวอย่าง</span></div><p className="eyebrow">CALCULATION REPORT</p><h2>{reportSection + 1}. {sections[reportSection]}</h2><p>{project.name}</p><dl className="studio-facts"><div><dt>Design Basis</dt><dd>{project.designBasisRevision}</dd></div><div><dt>Model</dt><dd>{project.modelRevision}</dd></div><div><dt>ผลตรวจ</dt><dd>NOT CHECKED</dd></div></dl><p>พื้นที่แสดงรายการคำนวณจากผลที่ตรวจสอบแล้ว รายงานตัวอย่างนี้ยังไม่มีผล FEM หรือข้อสรุปออกแบบสำหรับออกเอกสารจริง</p><footer>ร่างประกอบ UX/UI · ห้ามใช้ก่อสร้าง</footer></article></Surface>}
        {stage.id === 'shop' && <Surface className="studio-drawing"><div className="studio-viewer-toolbar"><strong>Shop Drawing Preview</strong><select aria-label="เลือก Drawing" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{panels.map((panel) => <option key={panel.id}>{panel.id}</option>)}</select></div><div className="studio-paper"><div className="studio-paper-head">{selected.id} · PANEL ELEVATION <span>DRAFT</span></div><svg viewBox="0 0 650 420" role="img" aria-label={`รูปด้าน ${selected.id} ความหนา ${selected.thickness} mm`}><rect x="100" y="60" width="450" height={450 * selected.height / selected.width} fill="none" stroke="#344658" strokeWidth="2" /><rect x={325 - 225 * selected.openingWidth / selected.width} y={60 + 225 * (selected.height - selected.openingHeight) / selected.width} width={450 * selected.openingWidth / selected.width} height={450 * selected.openingHeight / selected.width} fill="#eef2f6" stroke="#344658" /><line x1="100" y1="355" x2="550" y2="355" stroke="#344658" /><path d="M100 345v20 M550 345v20" stroke="#344658" /><text x="300" y="380">{selected.width} mm</text><text x="105" y="30">{selected.id} · t = {selected.thickness} mm</text><text x="105" y="410">H = {selected.height} mm · ช่องเปิด {selected.openingWidth} × {selected.openingHeight} mm</text></svg><footer>{project.code} · ภาพตัวอย่างยังไม่ระบุเหล็กเสริม / Anchor · NOT FOR PRODUCTION</footer></div></Surface>}
        {stage.id === 'release' && <Surface className="studio-form-surface"><p className="eyebrow">PRODUCTION PACKAGE</p><h2>ตรวจความพร้อมก่อนส่งผลิต</h2><ul className="studio-check-list">{['Design Checks และเหล็กเสริม', 'Technical approval โดยผู้ตรวจอิสระ', 'Drawing / Report preflight', 'ไฟล์จริงและ SHA-256 manifest', 'Revit import verification'].map((item) => <li key={item}>{item}<StatusBadge tone="warning">NOT CHECKED</StatusBadge></li>)}</ul><p>ยังไม่มีชุดเอกสารที่ออกจริงในโหมดตัวอย่าง</p></Surface>}
      </div>
      <aside className="studio-inspector" id="studio-inspector" aria-label="คุณสมบัติและการตรวจสอบ" hidden={!inspectorOpen}>
        <header><h2>{stage.id === 'cost' ? `${selected.id} · Concrete` : selected.id + ' · ' + selected.label}</h2><p>Precast lightweight concrete · ตัวอย่าง</p></header>
        <div className="studio-inspector-body">
          {stage.id === 'cost' ? <><label>ราคาต่อหน่วยตัวอย่าง · THB/m³<input type="number" min="1" max="100000" value={rate} onChange={(event) => { const value = Number(event.target.value); if (value > 0 && value <= 100000) setRate(value); }} /></label><label>สูญเสีย · %<input type="number" min="0" max="30" step="0.5" value={waste} onChange={(event) => { const value = Number(event.target.value); if (value >= 0 && value <= 30) setWaste(value); }} /></label><dl className="studio-facts"><div><dt>ปริมาณสุทธิ</dt><dd>{fmt(panelVolume(selected), 3)} m³</dd></div><div><dt>รวมสูญเสีย</dt><dd>{fmt(panelVolume(selected) * (1 + waste / 100), 3)} m³</dd></div><div><dt>จำนวนเงิน</dt><dd>{fmt(panelVolume(selected) * (1 + waste / 100) * rate)} THB</dd></div></dl><p className="studio-help">ปรับราคาเพื่อดูผลในตารางได้ทันที · ราคาไม่ได้บันทึกลง Price Book</p><StudioModelPreview panels={panels} selectedId={selectedId} onSelect={setSelectedId} /></> : <>
            <label>ชนิดชิ้นงาน<input readOnly value="ผนังพรีคาสท์" /></label>
            <div className="studio-field-pair"><label>กว้าง · mm<input readOnly value={selected.width.toLocaleString()} /></label><label>สูง · mm<input readOnly value={selected.height.toLocaleString()} /></label></div>
            <label>ความหนาตัวอย่าง · mm<select value={selected.thickness} onChange={(event) => updateThickness(event.target.value)}>{[75, 100, 120, 150, 200].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>วัสดุ<input readOnly value="LC-1200 · 1,200 kg/m³" /></label>
            <dl className="studio-facts"><div><dt>ปริมาตรหักช่องเปิด</dt><dd>{fmt(panelVolume(selected), 3)} m³</dd></div><div><dt>มวลชิ้นงานตัวอย่าง</dt><dd>{fmt(panelVolume(selected) * 1.2)} t</dd></div><div><dt>ช่องเปิด</dt><dd>{selected.openingWidth} × {selected.openingHeight} mm</dd></div></dl>
          </>}
          {['loads', 'analysis', 'design'].includes(stage.id) && <div className="studio-validation-note"><strong>NOT CHECKED</strong><p>{stage.id === 'loads' ? 'ลูกศรเป็นภาพอธิบายทิศทาง ยังไม่ใช่แรงจาก Load case ที่อนุมัติ' : 'ยังไม่มีผล Solver หรือผลออกแบบที่ยืนยันแล้ว จึงยังไม่แสดง Contour หรือผล PASS'}</p></div>}
          {stage.id === 'intake' && <div className="studio-validation-note"><strong>ยังไม่มี BIM ที่นำเข้าในตัวอย่างนี้</strong><p>การอัปโหลดและตรวจ Revision ใช้หน้ารับ BIM ใน Local Emulator / Pilot</p></div>}
          {stage.id === 'shop' && <><label>Export profile<input readOnly value="REVIT-DRAFTING-01" /></label><p className="studio-help">Revit-ready CAD import · 2D DXF + PDF + manifest · ไม่ใช่ Native Revit</p></>}
          <div className="studio-validation-note"><strong>การตรวจและอนุมัติ</strong><p>จุดยก เหล็กเสริม และผลออกแบบยังไม่ผ่านการตรวจ</p></div>
          <button type="button" className="button button--secondary" disabled aria-describedby="studio-approval-reason">{stage.id === 'release' ? 'ส่งผลิต' : stage.id === 'shop' ? 'สร้างชุดส่งออก' : 'ส่งตรวจและอนุมัติ'}</button><small id="studio-approval-reason">ต้องมีข้อมูลจริงและผู้ตรวจตามสิทธิ์ก่อนดำเนินการ</small>
          {next && <Link className="button button--primary studio-next" to={stageHref(base, next)}>ดูขั้นตอนถัดไป · {next.label} →</Link>}
        </div>
      </aside>
    </div>
    <div className="studio-bottom-status" role="status"><span>ชิ้นงานตัวอย่าง <b>{panels.length} ผนัง</b></span><span>ปริมาตรสุทธิรวม <b>{fmt(volume, 3)} m³</b></span><span>เลือก <b>{selected.id}</b></span><span className="warning-text">{notice || 'NOT CHECKED · ยังไม่มีการอนุมัติ'}</span></div>
  </div>;
}
