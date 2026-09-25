import { lazy, Suspense, useState, type ReactNode } from 'react';
import { jointApplicationLabels, jointCatalogLinks, jointGroups, thailandDistributor, type JointApplication, type JointGroupId } from './joints';
import { JointConnectionDiagram } from './JointConnectionDiagram';

const Joint3DViewer = lazy(() => import('./Joint3DViewer').then(module => ({ default: module.Joint3DViewer })));

function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}

export function JointLibrary() {
  const [application, setApplication] = useState<JointApplication | 'all'>('all');
  const [selectedId, setSelectedId] = useState<JointGroupId>('J-S');
  const visibleGroups = application === 'all' ? jointGroups : jointGroups.filter(group => group.applications.includes(application));
  const selected = visibleGroups.find(group => group.id === selectedId) ?? visibleGroups[0] ?? jointGroups[0]!;

  return <section className="cat-joints" aria-label="หมวดรอยต่อ">
    <div className="cat-title">
      <div><span className="cat-eyebrow">CONNECTION LIBRARY / 02</span><h1>หมวดรอยต่อ Precast</h1><p>เลือกกลุ่มรอยต่อเพื่อดูแนวทางถ่ายแรง จุดตรวจ และ Catalog ที่เกี่ยวข้อง</p></div>
      <div className="cat-total"><strong>3</strong><span>กลุ่มมาตรฐานอ้างอิง</span></div>
    </div>

    <div className="cat-notice">
      <strong>ข้อมูลอ้างอิงสำหรับคัดเลือกเบื้องต้น</strong>
      <p>หน้านี้ช่วยจัดกลุ่มและเทียบผลิตภัณฑ์เท่านั้น ยังไม่ใช่รายละเอียดก่อสร้างหรือการอนุมัติใช้งาน ต้องเลือกขนาดและจำนวนจากแรงออกแบบจริง พร้อมให้วิศวกรตรวจสอบรอยต่อ เหล็กเสริม grout ฐานราก และ tolerance ก่อนสั่งผลิต</p>
    </div>

    <nav className="cat-joint-filters" aria-label="กรองกลุ่มรอยต่อ">
      {(['all', 'wall', 'node', 'base'] as const).map(item => <button key={item} type="button" aria-pressed={application === item} onClick={() => setApplication(item)}>{jointApplicationLabels[item]}</button>)}
    </nav>

    <div className="cat-joint-layout">
      <nav className="cat-joint-selector" aria-label="เลือกกลุ่มรอยต่อ">
        {visibleGroups.map(group => <button key={group.id} type="button" className={selected.id === group.id ? 'cat-joint-selector-active' : ''} aria-pressed={selected.id === group.id} onClick={() => setSelectedId(group.id)}>
          <span className="cat-joint-id">{group.id}</span><span><strong>{group.title}</strong><small>{group.subtitle}</small></span><span className="cat-joint-chevron">→</span>
        </button>)}
      </nav>

      <article className="cat-joint-detail">
        <header className="cat-joint-detail-header"><div><span className="cat-eyebrow">{selected.id} / CONNECTION TYPE</span><h2>{selected.title}</h2><p>{selected.subtitle} · {selected.description}</p></div><span className="cat-badge">REFERENCE ONLY</span></header>
        <JointConnectionDiagram groupId={selected.id} title={selected.title} />
        <Suspense fallback={<div className="cat-joint-3d-loading" role="status">กำลังโหลดตัวแสดง 3D…</div>}><Joint3DViewer key={selected.id} groupId={selected.id} title={selected.title} /></Suspense>
        <div className="cat-joint-summary"><div><h3>เส้นทางถ่ายแรงที่ต้องกำหนด</h3><p className="cat-joint-load-path">{selected.loadPath}</p><h3>เหมาะกับ</h3><ul>{selected.applications.map(item => <li key={item}>{jointApplicationLabels[item]}</li>)}</ul></div><aside className="cat-joint-checks"><h3>ข้อมูลที่ต้องใช้คำนวณ</h3><ul>{selected.designInputs.map(item => <li key={item}>{item}</li>)}</ul></aside></div>
        <section className="cat-joint-selection"><h3>แนวทางเลือกผลิตภัณฑ์</h3><ul>{selected.selectionNotes.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="cat-joint-products"><div className="cat-section-heading"><div><h3>ตัวอย่าง Catalog ที่เกี่ยวข้อง</h3><p>กดเปิดเว็บไซต์สินค้า หรือเปิดเอกสาร PDF ทางการในแท็บใหม่</p></div><ExternalLink href={momentPrecastUrl}>รวมผลิตภัณฑ์ Precast</ExternalLink></div><div className="cat-joint-product-grid">{selected.products.map(product => <article key={`${selected.id}-${product.name}`}><div><span className="cat-joint-product-kind">{product.kind}</span><h4>{product.name}</h4><p>{product.note}</p></div><div className="cat-joint-product-links"><ExternalLink href={product.websiteUrl}>เว็บไซต์สินค้า</ExternalLink><ExternalLink href={product.catalogUrl}>Catalog PDF</ExternalLink></div></article>)}</div></section>
      </article>
    </div>

    <div className="cat-joint-resource-grid">
      <section className="cat-joint-resources"><div className="cat-section-heading"><div><span className="cat-eyebrow">REFERENCE LINKS</span><h2>Catalog และเว็บไซต์ที่เกี่ยวข้อง</h2></div></div>{jointCatalogLinks.map(link => <article key={link.title}><div><strong>{link.title}</strong><span>{link.description}</span></div><ExternalLink href={link.url}>{link.kind}</ExternalLink></article>)}</section>
      <aside className="cat-joint-distributor"><span className="cat-eyebrow">THAILAND CONTACT</span><h2>สอบถามราคา / สั่งซื้อ</h2><p className="cat-joint-distributor-name">{thailandDistributor.company}</p><address>{thailandDistributor.address}</address><dl><div><dt>โทร</dt><dd><a href={`tel:${thailandDistributor.phone.replaceAll(' ', '')}`}>{thailandDistributor.phone}</a></dd></div><div><dt>อีเมล</dt><dd><a href={`mailto:${thailandDistributor.email}`}>{thailandDistributor.email}</a></dd></div></dl><div className="cat-joint-contact-links"><ExternalLink href={thailandDistributor.websiteUrl}>เว็บไซต์ตัวแทน</ExternalLink><ExternalLink href={thailandDistributor.sourceUrl}>ตรวจสอบกับผู้ผลิต</ExternalLink></div><p className="cat-note">แนะนำให้ส่งข้อมูลแรงออกแบบ ขนาดแผง ความหนา cover ระยะขอบ และลำดับติดตั้งไปพร้อมกับการขอราคา เพื่อให้ผู้ขายช่วยคัดเลือกรุ่นได้ตรงงาน</p></aside>
    </div>
  </section>;
}

const momentPrecastUrl = 'https://www.moment-solutions.com/products/precast-technologies/';
