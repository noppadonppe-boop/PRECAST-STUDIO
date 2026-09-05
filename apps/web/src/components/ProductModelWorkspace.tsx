import { useState } from 'react';
import type { ProductModelPayload } from '@precast/domain';

/** Renders normalized Product Model geometry; never substitutes the UX sample for live evidence. */
export function ProductModelWorkspace({ model, selectedIds, onSelect }: { model: ProductModelPayload; selectedIds: string[]; onSelect: (id: string) => void }) {
  const [view, setView] = useState('3d');
  const [zoom, setZoom] = useState(1);
  const panel = model.panels.find((item) => item.id === selectedIds.at(-1));
  const minX = Math.min(0, ...model.panels.map((item) => item.geometry.offsetM));
  const width = Math.max(1, ...model.panels.map((item) => item.geometry.offsetM + item.geometry.widthM)) - minX;
  const height = Math.max(1, ...model.panels.map((item) => item.geometry.heightM));
  const scale = Math.min(540 / width, 290 / height);
  return <div className="studio-engineering-grid studio-product-model">
    <section className="studio-viewer" aria-label="Product Model viewer"><div className="studio-viewer-toolbar"><strong>เลือกชิ้นงาน · {selectedIds.length} selected</strong><div className="studio-segment">{[['3d', '3D'], ['elevation', 'รูปด้าน'], ['plan', 'Plan']].map(([id, name]) => <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id!)}>{name}</button>)}</div></div>
      <div className="studio-model-canvas"><svg viewBox="0 0 720 510" role="img" aria-label={`${view} · Product Model · ${model.panels.length} ชิ้นงาน`}>
        <g transform={`translate(360 250) scale(${zoom}) translate(-360 -250)`}><g transform={view === '3d' ? 'matrix(0.92 -0.17 0.15 0.92 5 90)' : undefined}>
          {model.panels.map((item) => {
            const x = 80 + (item.geometry.offsetM - minX) * scale; const w = item.geometry.widthM * scale;
            const h = view === 'plan' ? item.geometry.thicknessM * scale : item.geometry.heightM * scale;
            const y = 350 - h; const selected = selectedIds.includes(item.id);
            const openingPath = view === 'plan' ? '' : item.openings.map((opening) => `M${x + opening.xM * scale} ${350 - (opening.yM + opening.heightM) * scale}h${opening.widthM * scale}v${opening.heightM * scale}h-${opening.widthM * scale}Z`).join(' ');
            return <g key={item.id} className="studio-svg-panel" role="button" tabIndex={0} aria-label={`เลือก ${item.mark}`} aria-pressed={selected} onClick={() => onSelect(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item.id); } }}>
              <path d={`M${x} ${y}h${w}v${h}h-${w}Z ${openingPath}`} fillRule="evenodd" fill={selected ? '#e7bba6' : '#c9d1da'} stroke={selected ? '#c94d18' : '#718399'} strokeWidth="1.5" />
              <text x={x + w / 2} y="380" textAnchor="middle">{item.mark}</text><text x={x + w / 2} y="400" textAnchor="middle">{item.geometry.widthM.toFixed(3)} m</text>
            </g>;
          })}
        </g></g>
      </svg><div className="studio-canvas-caption">{model.coordinateSystem} · {model.units}</div><div className="studio-zoom"><button type="button" disabled={zoom <= .6} aria-label="ย่อโมเดล" onClick={() => setZoom(Math.max(.6, zoom - .2))}>−</button><button type="button" aria-label="พอดีหน้าจอ" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button type="button" disabled={zoom >= 1.8} aria-label="ขยายโมเดล" onClick={() => setZoom(Math.min(1.8, zoom + .2))}>＋</button></div></div>
      <div className="studio-object-strip">{model.panels.map((item) => <button key={item.id} type="button" aria-pressed={selectedIds.includes(item.id)} onClick={() => onSelect(item.id)}>{item.mark}<span>{item.geometry.widthM} × {item.geometry.heightM} m</span></button>)}</div>
    </section>
    <aside className="studio-inspector" aria-label="คุณสมบัติ Product Model"><header><h2>{panel?.mark ?? 'เลือกชิ้นงานในโมเดล'}</h2><p>{panel ? `${panel.type} · ${panel.materialId}` : 'เลือกได้สูงสุดสองชิ้นเพื่อ Split / Merge'}</p></header><div className="studio-inspector-body">{panel ? <dl className="studio-facts"><div><dt>กว้าง × สูง</dt><dd>{panel.geometry.widthM} × {panel.geometry.heightM} m</dd></div><div><dt>ความหนา</dt><dd>{panel.geometry.thicknessM * 1000} mm</dd></div><div><dt>ปริมาตร</dt><dd>{panel.volumeM3.toFixed(3)} m³</dd></div><div><dt>น้ำหนัก</dt><dd>{panel.weightKn.toFixed(2)} kN</dd></div><div><dt>COG · m</dt><dd>{[panel.cogM.x, panel.cogM.y, panel.cogM.z].map((value) => value.toFixed(3)).join(', ')}</dd></div><div><dt>ช่องเปิด / Anchor</dt><dd>{panel.openings.length} / {model.anchors.filter((item) => item.panelId === panel.id).length}</dd></div><div><dt>Source object IDs</dt><dd className="studio-source-ids">{panel.sourceObjectIds.join(', ')}</dd></div></dl> : <p className="studio-help">โมเดล {model.panels.length} ชิ้น · {model.joints.length} รอยต่อ · {model.supports.length} จุดรองรับ</p>}<p className="studio-help">รูปแสดงตาม geometry และ offset ใน Product Model ไม่ใช่ผล FEM หรือการรับรองแบบ</p></div></aside>
  </div>;
}
