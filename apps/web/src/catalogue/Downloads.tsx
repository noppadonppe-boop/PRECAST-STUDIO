import { useState } from 'react';
import { families, uses, type Artifact, type CatalogueData } from './model';

export function DownloadButton({ artifact, label = 'ดาวน์โหลดภาพ PNG' }: { artifact: Artifact; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setBusy(true); setError('');
    try {
      // Always re-request the protected original; never turn a public URL into a download link.
      const response = await fetch(artifact.url, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'สิทธิ์หรือเซสชันหมดอายุ กรุณาเข้าคลังใหม่' : 'ดาวน์โหลดไม่สำเร็จ กรุณาลองอีกครั้ง');
      if (!response.headers.get('content-type')?.startsWith('image/png')) throw new Error('ไฟล์ที่ได้รับไม่ใช่ภาพ PNG จึงไม่บันทึกไฟล์');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${artifact.id}.png`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'ดาวน์โหลดไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  return <span className="cat-download"><button className="cat-primary" disabled={busy} onClick={() => void download()} aria-label={`${label} ${artifact.id}`}>{busy ? 'กำลังเตรียมไฟล์…' : `↓ ${label}`}</button>{error && <span role="alert">{error}</span>}</span>;
}

export function Downloads({ data }: { data: CatalogueData }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const images = [
    ...data.products.map(p => ({ id: p.display_code, kind: 'building', name: `${uses.find(u => u.id === p.use)?.th} / ${families[p.family].th}`, badge: p.image_badge, artifact: p.artifact })),
    ...data.typical.map(t => ({ id: t.id, kind: 'typical', name: `Typical Segment / ${families[t.family].th}`, badge: 'CONCEPT / NOT FOR CONSTRUCTION', artifact: t.artifact })),
    ...(data.pilotStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'ENGINEERING DRAFT / NOT FEM', artifact: d.artifact })),
    ...(data.shellStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'SHELL STUDY / QA INCOMPLETE / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.diagnosticStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'DIAGNOSTIC ONLY / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.bayStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'SOLID BAY / PARTIAL QA / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.stressStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'LOCAL STRESS / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.benchmarkStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'COUPON BENCHMARK / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.curvedStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'CURVED COUPON / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.quadraticBayStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'QUADRATIC BAY / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.localMeshStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'LOCAL MESH / TRACTION / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.gravityCouponStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'GRAVITY COUPON / NOT MODULE DESIGN', artifact: d.artifact })),
    ...(data.profileThicknessStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'PROFILE/THICKNESS STUDY / NOT DESIGN', artifact: d.artifact })),
    ...(data.combinedMeshStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'COMBINED MESH / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.baseProfileStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'BASE PROFILE / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.directionalStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'DIRECTIONAL DIAGNOSTIC / NOT FOR DESIGN', artifact: d.artifact })),
    ...(data.arcCrownStudy?.drawings ?? []).map(d => ({ id: d.id, kind: 'engineering', name: d.title, badge: 'ARC/CROWN STUDY / NOT FOR DESIGN', artifact: d.artifact })),
  ].filter(item => (!kind || item.kind === kind) && `${item.id} ${item.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="cat-detail"><div className="cat-detail-heading"><div><span className="cat-eyebrow">ORIGINAL IMAGE LIBRARY</span><h1>ดาวน์โหลดภาพ</h1><p>ภาพต้นฉบับเต็มแผ่น ไม่ย่อหรือครอป · บันทึกชื่อไฟล์ตาม Artifact tag และ revision</p></div></div>
    <div className="cat-tools"><label className="cat-search"><input aria-label="ค้นหาภาพดาวน์โหลด" placeholder="ค้นหารหัสหรือชื่อภาพ เช่น TS-B, I-C1" value={query} onChange={e => setQuery(e.target.value)}/></label><label>ประเภท<select aria-label="ประเภทภาพดาวน์โหลด" value={kind} onChange={e => setKind(e.target.value)}><option value="">ภาพทั้งหมด</option><option value="building">ภาพอาคาร</option><option value="typical">Typical Segment</option>{(data.pilotStudy || data.shellStudy || data.diagnosticStudy || data.bayStudy || data.stressStudy || data.benchmarkStudy || data.curvedStudy || data.quadraticBayStudy || data.localMeshStudy || data.gravityCouponStudy || data.profileThicknessStudy || data.combinedMeshStudy || data.arcCrownStudy || data.directionalStudy || data.baseProfileStudy) && <option value="engineering">วิศวกรรม Step 2A–2O</option>}</select></label></div>
    <p className="cat-note">พบ {images.length} ภาพที่ได้รับสิทธิ์ · ดาวน์โหลดเพื่อใช้อ้างอิงภายใน ไม่ใช่การอนุมัติผลิตหรืออนุญาตเผยแพร่สาธารณะ</p>
    <div className="cat-download-list">{images.map(item => <article key={item.artifact.id}><a href={item.artifact.url} target="_blank" rel="noreferrer"><img loading="lazy" src={item.artifact.url} alt={`ภาพต้นฉบับ ${item.id}`}/></a><div><h2>{item.id}</h2><p>{item.name}</p><span className="cat-badge">{item.badge}</span><small>PNG · {(item.artifact.bytes / 1024 / 1024).toFixed(2)} MB · {item.artifact.id}.png</small></div><DownloadButton artifact={item.artifact}/></article>)}</div>
    {!images.length && <p className="cat-state">ไม่พบภาพตามเงื่อนไขนี้</p>}
  </section>;
}
