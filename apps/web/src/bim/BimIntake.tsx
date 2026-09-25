import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { SharedMenuEditor } from '../components/SharedMenuEditor';
import { watchSharedCollection } from '../data/sharedRepository';
import { loadBimSource, storeBimSource, type BimRevision } from './bimRepository';
import { readIfc } from './readIfc';
import { sha256, validateBimFile, type BimModel } from './types';
import './bim.css';
const BimViewer = lazy(() => import('./BimViewer').then((module) => ({ default: module.BimViewer })));

export function BimIntake({ projectId }: { projectId: string }) {
  const { mode } = useAuth();
  const [sources, setSources] = useState<BimRevision[]>([]);
  const [model, setModel] = useState<BimModel | null>(null);
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    if (mode !== 'shared') return;
    return watchSharedCollection<BimRevision>('intake', (rows) => {
      setSources(rows.filter((row) => row.data?.kind === 'bim-source' && row.data.projectId === projectId).map((row) => row.data).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (reason) => setHistoryError(reason.message));
  }, [mode, projectId]);
  useEffect(() => () => { operation.current?.abort(); }, []);
  async function importFile(file: File) {
    if (busy) return;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(''); setMessage('กำลังตรวจไฟล์…'); setModel(null); setName('');
    try {
      const kind = validateBimFile(file);
      const bytes = await file.arrayBuffer();
      const hash = await sha256(bytes);
      if (kind === 'rvt' && (bytes.byteLength < 8 || !new Uint8Array(bytes).subarray(0, 8).every((value, index) => value === [208, 207, 17, 224, 161, 177, 26, 225][index]))) throw new Error('ไฟล์ไม่มีส่วนหัวของ Revit ที่รองรับ กรุณาเลือกไฟล์ RVT ต้นฉบับ');
      if (controller.signal.aborted) return;
      setMessage(kind === 'ifc' ? 'กำลังอ่านเรขาคณิตและตรวจข้อมูล IFC…' : 'เตรียมต้นฉบับ Revit · ต้องส่งออก IFC ด้วย Revit ในเครื่อง');
      const parsed = kind === 'ifc' ? await readIfc(bytes, controller.signal) : null;
      if (controller.signal.aborted) return;
      setModel(parsed); setName(file.name);
      if (mode !== 'shared') { setMessage('แสดงตัวอย่างจากไฟล์ในเครื่องแล้ว · โหมดนี้ไม่บันทึกไฟล์บน Firebase'); return; }
      setMessage('กำลังอัปโหลดต้นฉบับ…');
      const revision = await storeBimSource(projectId, file, hash, parsed, kind === 'ifc' ? parent || null : null, (value) => setMessage(`กำลังอัปโหลด ${value}%`));
      if (kind === 'rvt') setParent(revision.id);
      setMessage(kind === 'rvt' ? 'บันทึกต้นฉบับ RVT แล้ว · เปิดไฟล์นี้ใน Revit ส่งออก IFC และนำ IFC กลับมาแนบด้านล่าง' : `บันทึก ${revision.id} แล้ว · แสดงเรขาคณิตจาก IFC จริง · ยังไม่ผ่านการอนุมัติวิศวกรรม`);
    } catch (reason) {
      if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'นำเข้าไม่สำเร็จ'); setMessage('ยังไม่ยืนยันการบันทึกไฟล์และทะเบียนบนระบบ หากมีโมเดลแสดงอยู่จะเป็นเพียงตัวอย่างในเครื่อง'); }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function reopen(source: BimRevision) {
    if (busy) return;
    const controller = new AbortController(); operation.current = controller;
    setBusy(true); setError(''); setModel(null); setName(''); setMessage('กำลังโหลดและตรวจ SHA-256 ของต้นฉบับ…');
    try {
      const bytes = await loadBimSource(source);
      if (await sha256(bytes) !== source.sha256) throw new Error('SHA-256 ไม่ตรงกับทะเบียน หยุดเปิดโมเดล');
      if (controller.signal.aborted) return;
      const parsed = await readIfc(bytes, controller.signal);
      if (controller.signal.aborted) return;
      setModel(parsed); setName(source.fileName); setMessage(`เปิด ${source.id} แล้ว · ตรวจ SHA-256 ตรงกัน`);
    } catch (reason) { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'โหลดไม่สำเร็จ'); setMessage('เปิดไฟล์ไม่สำเร็จ'); } }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="bim-intake">
    <header><p className="eyebrow">G0 · BIM SOURCE INTAKE</p><h1>รับแบบ BIM และตรวจ Revision</h1><p>นำเข้า IFC เพื่อดูโมเดลจริง หรือแนบต้นฉบับ Revit แล้วส่งออก IFC ด้วย Revit ในเครื่อง</p></header>
    <section className="surface bim-card"><h2>1. เลือกไฟล์แบบ</h2>
      <div className="bim-upload-options"><label className="bim-file">นำเข้า IFC เพื่ออ่านโมเดล<input aria-label="นำเข้า IFC" type="file" accept=".ifc" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file); }} /><small>อ่านชิ้นงานและเรขาคณิต · รองรับ IFC2X3 / IFC4 ตามตัวอ่าน</small></label>
      <label className="bim-file">แนบต้นฉบับ Revit (.rvt)<input aria-label="แนบต้นฉบับ Revit" type="file" accept=".rvt" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file); }} /><small>เก็บต้นฉบับ · รอ IFC จาก Revit ในเครื่องก่อนแสดงโมเดล</small></label></div>
      <p>ไฟล์ละไม่เกิน 100 MB · ไฟล์ต้นฉบับเก็บใน Storage กลาง และผู้ใช้ที่เชื่อมต่อ Firebase เปิดซ้ำได้ ทะเบียนไฟล์ใช้ร่วมกันในพื้นที่นี้</p>
      <label className="form-field">IFC นี้ส่งออกจากต้นฉบับ Revit ใด<select aria-label="ต้นฉบับ Revit ของ IFC" value={parent} disabled={busy} onChange={(event) => setParent(event.target.value)}><option value="">นำเข้า IFC อิสระ</option>{sources.filter((source) => source.fileType === 'rvt').map((source) => <option key={source.id} value={source.id}>{source.fileName} · {source.id}</option>)}</select></label>
      {parent && <p>เลือก IFC ที่ส่งออกจาก RVT รุ่นนี้เท่านั้น ระบบบันทึกความสัมพันธ์ตามที่คุณเลือก ยังไม่ได้ตรวจเทียบเนื้อหาภายใน RVT</p>}
      <details><summary>วิธีส่งออกจาก Revit ในเครื่อง</summary><ol><li>เปิดไฟล์ RVT ต้นฉบับใน Revit รุ่นที่รองรับไฟล์นั้น</li><li>ใช้ File → Export → IFC หรือปุ่ม Export BIM for Web ในชุด pyRevit ของโครงการ</li><li>ส่งออกโมเดลและตรวจหน่วย ชั้นอาคาร และชิ้นงานที่ต้องการ</li><li>กลับมาหน้านี้ เลือกต้นฉบับ Revit แล้วกดนำเข้า IFC</li></ol><p>หน้าเว็บไม่สั่งเปิด Revit หรือแปลง RVT อัตโนมัติ</p><a href="/revit/PrecastBimExport.zip" download>ดาวน์โหลดปุ่มส่งออกสำหรับ pyRevit</a></details>
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </section>
    {model && <section className="surface bim-card"><h2>2. ตรวจโมเดล · {name}</h2><div className="bim-facts"><span>Schema <b>{model.schema}</b></span><span>ชิ้นงาน <b>{model.elements.length}</b></span><span>GlobalId ซ้ำ <b>{model.duplicateGuids}</b></span><span>ไม่มี GlobalId <b>{model.missingGuids}</b></span><span>สามเหลี่ยม <b>{model.triangleCount.toLocaleString()}</b></span><span>หน่วยในต้นฉบับ <b>{model.lengthUnits.join(', ') || 'ต้องตรวจ'}</b></span></div><p>ชั้นอาคาร: {model.levels.join(', ') || 'ไม่พบ'}</p><ul>{model.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><Suspense fallback={<p>กำลังโหลดตัวแสดง 3D…</p>}><BimViewer key={name} model={model} /></Suspense></section>}
    <section className="surface bim-card"><h2>ทะเบียนไฟล์และ Revision</h2>{historyError && <p role="alert">{historyError}</p>}{!sources.length ? <p>ยังไม่มีไฟล์ที่บันทึกในโครงการนี้</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>ไฟล์ / Revision</th><th>สถานะ</th><th>ต้นฉบับ / ความถูกต้องของไฟล์</th><th>เปิด</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id}><td>{source.fileName}<br /><small>{source.id}<br />{new Date(source.createdAt).toLocaleString('th-TH')}</small></td><td>{source.fileType === 'rvt' ? (sources.some((item) => item.parentRvtId === source.id) ? 'มี IFC แนบแล้ว' : 'รอ IFC จาก Revit') : 'อ่านเรขาคณิตแล้ว · ร่าง'}</td><td>{source.parentRvtId && <p>RVT: {source.parentRvtId}</p>}<details><summary>SHA-256</summary><code className="bim-hash">{source.sha256}</code></details></td><td>{source.fileType === 'ifc' && <button className="button button--secondary" disabled={busy} onClick={() => void reopen(source)}>เปิดโมเดล</button>}</td></tr>)}</tbody></table></div>}</section>
    {mode === 'shared' && <SharedMenuEditor category="intake" id={`${projectId}-notes`} title="บันทึกและข้อมูลอ้างอิงการรับแบบ" />}
    <p className="bim-limit">ผลนี้เป็นการอ่านและตรวจเบื้องต้นในเบราว์เซอร์ ยังไม่ใช่ผลสแกนความปลอดภัยหรือการอนุมัติ G0 และยังไม่ส่ง geometry ไปแทนโมเดลออกแบบ / FEM / BOQ อัตโนมัติ</p>
  </div>;
}
