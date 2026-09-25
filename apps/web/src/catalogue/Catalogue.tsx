import { DirectionalStudyView } from './DirectionalStudyView';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { families, filterProducts, uses, type CatalogueData, type Family, type Filters, type Product } from './model';
import './catalogue.css';
import { Compare, ProductDetail, TypicalDetail } from './Details';
import { SignIn } from './SignIn';
import { DownloadButton, Downloads } from './Downloads';
import { EngineeringStudy } from './EngineeringStudy';
import { ShellStudyView } from './ShellStudyView';
import { DiagnosticStudyView } from './DiagnosticStudyView';
import { BayStudyView } from './BayStudyView';
import { StressStudyView } from './StressStudyView';
import { BenchmarkStudyView } from './BenchmarkStudyView';
import { CurvedStudyView } from './CurvedStudyView';
import { QuadraticBayStudyView } from './QuadraticBayStudyView';
import { LocalMeshStudyView } from './LocalMeshStudyView';
import { GravityCouponStudyView } from './GravityCouponStudyView';
import { ProfileThicknessStudyView } from './ProfileThicknessStudyView';
import { JointLibrary } from './JointLibrary';

let exchange: Promise<Response> | undefined;
export function Profile({ family }: { family: Family }) {
  return <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={families[family].path}/><path d="M1 29H39" strokeOpacity=".25"/></svg>;
}
export function Board({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="cat-image-error">โหลดภาพไม่สำเร็จ · เปิดรายละเอียดเพื่อลองใหม่</span>
    : <img loading="lazy" src={product.artifact.url} alt={`ภาพแนวคิด ${product.display_code} — ${families[product.family].th}`} onError={() => setFailed(true)}/>;
}
export function Catalogue({embedded=false}:{embedded?:boolean}={}) {
  const [data, setData] = useState<CatalogueData | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({ use: 0, family: '', plan: '', status: '', query: '' });
  const [view, setView] = useState<'gallery' | 'joints' | 'typical' | 'detail' | 'compare' | 'downloads' | 'engineering' | 'shell' | 'diagnostic' | 'bay' | 'stress' | 'benchmark' | 'curved' | 'quadratic' | 'localmesh' | 'gravity' | 'profile' | 'combined' | 'arc' | 'directional' | 'baseprofile'>('gallery');
  const [selected, setSelected] = useState<Product | null>(null);
  const [typicalFamily, setTypicalFamily] = useState<Family>('C');
  const main = useRef<HTMLElement>(null);
  const [reload, setReload] = useState(0);
  function select(p: Product) { setSelected(p); setView('detail'); }
  useEffect(() => { if(!embedded)main.current?.focus(); }, [view,embedded]);
  useEffect(() => {
    document.title = 'MODULAR / คลังแบบ I · L · U';
    const token = new URLSearchParams(window.location.hash.slice(1)).get('access');
    if (token) {
      history.replaceState(null, '', '/catalogue');
      exchange = fetch('/api/catalogue/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    }
    let active = true;
    void (async () => {
      if (exchange) await exchange;
      const response = await fetch('/api/catalogue/data');
      if (!response.ok) throw new Error('คลังนี้ต้องมีสิทธิ์เข้าถึง กรุณาเปิดจากลิงก์ทดลองของเจ้าของเครื่อง หรือเข้าสู่ระบบทีมที่ตั้งค่าแล้ว');
      const result = await response.json() as CatalogueData;
      if (active) { setSelected(null); setView('gallery'); setData(result); setError(''); }
    })().catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    if (!data) return;
    const check = () => { void fetch('/api/catalogue/data').then(async r => {
      if (!r.ok) { setData(null); setError('เซสชันหมดอายุหรือสิทธิ์เปลี่ยน กรุณาเข้าใหม่'); return; }
      const current = await r.json() as CatalogueData;
      setData(current);
      // Purge any open detail that no longer belongs to the authorized artifact set.
      if (selected && !current.products.some(p => p.product_id === selected.product_id)) { setSelected(null); setView('gallery'); }
    }).catch(() => { setData(null); setError('ติดต่อคลังไม่ได้ กรุณาเชื่อมต่อใหม่'); }); };
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [Boolean(data), selected]);
  const results = data ? filterProducts(data.products, filters) : [];
  return <div className="catalogue">
    <header className="cat-header"><a href="/catalogue" className="cat-brand"><span className="cat-mark">M/</span> MODULAR<span className="cat-brand-sub">PRECAST COLLECTION</span></a><span className="cat-access"><Icon name="shield" size={16}/> {data?.access.mode === 'LOCAL_OWNER_PREVIEW' ? 'ทดลองบนเครื่องนี้ · ยังไม่เปิดทีม' : 'คลังภายในทีม'}{data && <button className="cat-signout" onClick={() => { void fetch('/api/catalogue/session', { method: 'DELETE' }).finally(() => { setData(null); setError('ออกจากคลังแล้ว ลิงก์ทดลองใช้ได้ครั้งเดียว หากต้องการเข้าใหม่ให้เริ่มรอบทดลองใหม่'); }); }}>ออกจากคลัง</button>}</span></header>
    <main className="cat-main" ref={main} tabIndex={-1}>
      {data && <nav className="cat-topnav" aria-label="คลัง">
        <button aria-pressed={view === 'gallery'} onClick={() => setView('gallery')}>คอลเลกชันอาคาร</button>
        <button aria-pressed={view === 'joints'} onClick={() => setView('joints')}>รอยต่อ <span>3 กลุ่ม</span></button>
        <button aria-pressed={view === 'typical'} onClick={() => setView('typical')}>Typical Segment <span>4 ครอบครัว</span></button>
        <button aria-pressed={view === 'downloads'} onClick={() => setView('downloads')}>↓ ดาวน์โหลดภาพ</button>
        {data.pilotStudy && <button aria-pressed={view === 'engineering'} onClick={() => setView('engineering')}>Step 2A · TS-C</button>}
        {data.shellStudy && <button aria-pressed={view === 'shell'} onClick={() => setView('shell')}>Step 2B · Shell</button>}
        {data.diagnosticStudy && <button aria-pressed={view === 'diagnostic'} onClick={() => setView('diagnostic')}>Step 2C · มุมโค้ง</button>}
        {data.bayStudy && <button aria-pressed={view === 'bay'} onClick={() => setView('bay')}>Step 2D · Solid bay</button>}
        {data.stressStudy && <button aria-pressed={view === 'stress'} onClick={() => setView('stress')}>Step 2E · ความเค้น</button>}
        {data.benchmarkStudy && <button aria-pressed={view === 'benchmark'} onClick={() => setView('benchmark')}>Step 2F · ดัด–เฉือน</button>}
        {data.curvedStudy && <button aria-pressed={view === 'curved'} onClick={() => setView('curved')}>Step 2G · โค้ง 20-node</button>}
        {data.quadraticBayStudy && <button aria-pressed={view === 'quadratic'} onClick={() => setView('quadratic')}>Step 2H · โมดูล 20-node</button>}
        {data.localMeshStudy && <button aria-pressed={view === 'localmesh'} onClick={() => setView('localmesh')}>Step 2I · Mesh / แรงหน้าตัด</button>}
        {data.gravityCouponStudy && <button aria-pressed={view === 'gravity'} onClick={() => setView('gravity')}>Step 2J · อ้างอิงแรงเฉือน</button>}
        {data.profileThicknessStudy && <button aria-pressed={view === 'profile'} onClick={() => setView('profile')}>Step 2K · แนวหน้าตัด/ความหนา</button>}
        {data.combinedMeshStudy && <button aria-pressed={view === 'combined'} onClick={() => setView('combined')}>Step 2L · ผลร่วม mesh</button>}
        {data.baseProfileStudy && <button aria-pressed={view === 'baseprofile'} onClick={() => setView('baseprofile')}>Step 2O · ผนังใกล้ฐาน</button>}
        {data.directionalStudy && <button aria-pressed={view === 'directional'} onClick={() => setView('directional')}>Step 2N · ทิศความเค้น</button>}
        {data.arcCrownStudy && <button aria-pressed={view === 'arc'} onClick={() => setView('arc')}>Step 2M · โค้ง/กลางหลังคา</button>}
        {view !== 'gallery' && <button className="cat-back" onClick={() => setView('gallery')}>← กลับไปเลือกแบบ</button>}
      </nav>}
      {(view === 'gallery' || !data) && <>
      <div className="cat-title"><div><span className="cat-eyebrow">DESIGN LIBRARY / 01</span><h1>พื้นที่ต่างกัน ระบบเดียวกัน</h1><p>เลือกการใช้งาน รูปทรง และแปลน เพื่อสำรวจแนวคิดโมดูลาร์คอนกรีต</p></div><div className="cat-total"><strong>{data?.products.length ?? '—'}</strong><span>แบบแนวคิด / I · L · U</span></div></div>
      {error ? <section className="cat-state"><Icon name="shield" size={32}/><h2>คลังแบบส่วนตัว</h2><p role="alert">{error}</p><SignIn onSuccess={() => { exchange = undefined; setReload(n => n + 1); }}/></section> : !data ? <p className="cat-state" role="status">กำลังเปิดคลังแบบที่ได้รับสิทธิ์…</p> : <>
        <nav className="cat-uses" aria-label="กลุ่มการใช้งาน"><button aria-pressed={!filters.use} onClick={() => setFilters({ ...filters, use: 0 })}>ทั้งหมด <small>{data.products.length}</small></button>{uses.map(u => <button key={u.id} aria-pressed={filters.use === u.id} onClick={() => setFilters({ ...filters, use: u.id })}><span>0{u.id} / {u.th}</span><small>{u.en}</small></button>)}</nav>
        <div className="cat-tools"><label className="cat-search"><Icon name="search"/><input aria-label="ค้นหาแบบ" placeholder="ค้นหารหัส ชื่อ หรือรูปทรง…" value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })}/></label><label>แปลน<select value={filters.plan} onChange={e => setFilters({ ...filters, plan: e.target.value })}><option value="">I / L / U ทั้งหมด</option><option value="I">I · 18 ตร.ม.</option><option value="L">L · 27 ตร.ม.</option><option value="U">U · 45 ตร.ม.</option></select></label><label>สถานะ<select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">ทุกสถานะ</option><option value="LEGACY20">ภาพเดิม LEGACY20</option><option value="STD15">แนวคิด STD15 (L/U)</option><option value="NOT_ANALYSED">ยังไม่วิเคราะห์</option></select></label></div>
        <div className="cat-profiles" aria-label="รูปทรง"><button aria-pressed={!filters.family} onClick={() => setFilters({ ...filters, family: '' })}>ทุกรูปทรง</button>{(Object.keys(families) as Family[]).map(f => <button key={f} aria-pressed={filters.family === f} onClick={() => setFilters({ ...filters, family: f })}><Profile family={f}/><span><b>{f}</b> {families[f].th}</span>{f === 'C' && <small>นำร่อง</small>}</button>)}</div>
        <div className="cat-result-line"><h2>คอลเลกชัน <span>{results.length} แบบ</span></h2><span>ภาพ R00 · ทะเบียน R01 · ยังไม่ใช่แบบก่อสร้าง</span></div>
        <section className="cat-grid" aria-label="รายการแบบ">{results.map(p => <article className="cat-card" key={p.product_id}><button className="cat-board" onClick={() => select(p)} aria-label={`ดูรายละเอียด ${p.display_code}`}><Board product={p}/><span className="cat-image-label">ดูแบบและรายละเอียด ↗</span></button><div className="cat-card-body"><div className="cat-card-heading"><h3>{p.display_code}</h3><span>{p.nominal_grid_area_m2} <small>ตร.ม.</small></span></div><p>{uses.find(u => u.id === p.use)?.th} / {families[p.family].th}</p><span className={`cat-badge ${p.type === 'I' ? 'legacy' : ''}`}>{p.type === 'I' ? 'LEGACY20 / NOT STD15 GEOMETRY' : 'CONCEPT · STD15 TARGET'}</span><div className="cat-card-footer"><span>ยังไม่วิเคราะห์</span><small>R00 / {p.typical_family}</small></div><button className="cat-text-button" onClick={() => { setSelected(p); setView('compare'); }}>เปรียบเทียบ I / L / U →</button></div></article>)}</section>
        {!results.length && <div className="cat-state"><h2>ไม่พบแบบตามเงื่อนไขนี้</h2><button onClick={() => setFilters({ use: 0, family: '', plan: '', status: '', query: '' })}>ล้างตัวกรอง</button></div>}
      </>}</>}
      {data && view === 'downloads' && <Downloads data={data}/>}
      {data && view === 'joints' && <JointLibrary/>}
      {data && view === 'diagnostic' && (data.diagnosticStudy?<DiagnosticStudyView study={data.diagnosticStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผลตรวจมุมโค้ง</p>)}
      {data && view === 'bay' && (data.bayStudy?<BayStudyView study={data.bayStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล solid bay</p>)}
      {data && view === 'stress' && (data.stressStudy?<StressStudyView study={data.stressStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผลความเค้น</p>)}
      {data && view === 'benchmark' && (data.benchmarkStudy?<BenchmarkStudyView study={data.benchmarkStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล benchmark</p>)}
      {data && view === 'curved' && (data.curvedStudy?<CurvedStudyView study={data.curvedStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผลชิ้นโค้ง</p>)}
      {data && view === 'quadratic' && (data.quadraticBayStudy?<QuadraticBayStudyView study={data.quadraticBayStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผลโมดูล 20-node</p>)}
      {data && view === 'localmesh' && (data.localMeshStudy?<LocalMeshStudyView study={data.localMeshStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล mesh และแรงหน้าตัด</p>)}
      {data && view === 'gravity' && (data.gravityCouponStudy?<GravityCouponStudyView study={data.gravityCouponStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผลโจทย์อ้างอิงแรงเฉือน</p>)}
      {data && view === 'profile' && (data.profileThicknessStudy?<ProfileThicknessStudyView study={data.profileThicknessStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล Step 2K</p>)}
      {data && view === 'combined' && (data.combinedMeshStudy?<ProfileThicknessStudyView study={data.combinedMeshStudy} combined/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล Step 2L</p>)}
      {data && view === 'baseprofile' && (data.baseProfileStudy?<ProfileThicknessStudyView study={data.baseProfileStudy} focusBase/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล Step 2O</p>)}
      {data && view === 'directional' && (data.directionalStudy?<DirectionalStudyView study={data.directionalStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล Step 2N</p>)}
      {data && view === 'arc' && (data.arcCrownStudy?<ProfileThicknessStudyView study={data.arcCrownStudy} focusArc/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผล Step 2M</p>)}
      {data && view === 'shell' && (data.shellStudy?<ShellStudyView study={data.shellStudy}/>:<p className="cat-state">ไม่มีสิทธิ์อ่านผลศึกษา shell</p>)}
      {data && view === 'engineering' && (data.pilotStudy ? <EngineeringStudy study={data.pilotStudy}/> : <p className="cat-state">ไม่มีสิทธิ์อ่านร่างวิศวกรรมในเซสชันนี้</p>)}
      {data && view === 'detail' && selected && <><DownloadButton artifact={selected.artifact}/><ProductDetail key={selected.product_id} product={selected} data={data} onCompare={() => setView('compare')} onTypical={() => { setTypicalFamily(selected.family); setView('typical'); }}/></>}
      {data && view === 'typical' && data.typical.filter(t => t.family === typicalFamily).map(t => <DownloadButton key={t.id} artifact={t.artifact}/>)}
      {data && view === 'compare' && selected && <Compare selected={selected} data={data} onSelect={select}/>}
      {data && view === 'typical' && <><div className="cat-profiles">{data.typical.map(t => <button key={t.id} aria-pressed={typicalFamily === t.family} onClick={() => setTypicalFamily(t.family)}><Profile family={t.family}/>{t.id} / {families[t.family].th}{t.pilot && <small>นำร่อง</small>}</button>)}</div>{data.typical.filter(t => t.family === typicalFamily).map(t => <TypicalDetail key={t.id} typical={t}/>)}{!data.typical.some(t => t.family === typicalFamily) && <p className="cat-state">Typical ที่เลือกไม่อยู่ในสิทธิ์ปัจจุบัน เลือกครอบครัวที่ได้รับสิทธิ์ด้านบน หรือติดต่อผู้ดูแล</p>}</>}
      <footer className="cat-footer">PRECAST-MODULE <span>CONCEPT ARCHIVE / NOT FOR CONSTRUCTION</span></footer>
    </main>
  </div>;
}
