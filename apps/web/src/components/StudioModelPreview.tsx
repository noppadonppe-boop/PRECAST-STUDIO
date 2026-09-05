import { useState } from 'react';

export interface PreviewPanel { id: string; label: string; width: number; height: number; thickness: number; openingWidth: number; openingHeight: number }
export const previewPanels: PreviewPanel[] = [
  { id: 'P-W01', label: 'ผนังโมดูล A', width: 3600, height: 2800, thickness: 100, openingWidth: 1200, openingHeight: 1200 },
  { id: 'P-W03', label: 'ผนังโมดูล B', width: 5800, height: 2800, thickness: 100, openingWidth: 1800, openingHeight: 1500 },
];
export function panelVolume(panel: PreviewPanel) { return (panel.width * panel.height - panel.openingWidth * panel.openingHeight) * panel.thickness / 1e9; }

export function StudioModelPreview({ panels, selectedId, onSelect, overlay = 'panel' }: { panels: PreviewPanel[]; selectedId: string; onSelect: (id: string) => void; overlay?: string }) {
  const [view, setView] = useState('3d');
  const [zoom, setZoom] = useState(1);
  const [joints, setJoints] = useState(true);
  const selected = panels.find((panel) => panel.id === selectedId) ?? panels[0]!;
  return <section className="studio-viewer" aria-label="โมเดลตัวอย่างพรีคาสท์">
    <div className="studio-viewer-toolbar"><span className="studio-tool-label">เลือกชิ้นงาน</span><button type="button" aria-pressed={joints} onClick={() => setJoints(!joints)}>รอยต่อ</button><div className="studio-segment" aria-label="มุมมองโมเดล">{['3d', 'plan'].map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item === '3d' ? '3D' : 'Plan'}</button>)}</div></div>
    <div className="studio-model-canvas">
      <svg viewBox="0 0 720 510" role="img" aria-label={`${view === '3d' ? 'ภาพสามมิติประกอบ' : 'ผัง'} โมเดลตัวอย่าง เลือก ${selected.id}`}>
        <g transform={`translate(360 255) scale(${zoom}) translate(-360 -255)`}>
          {view === '3d' ? <>
            <polygon points="115,330 340,225 615,350 390,455" fill="#e6e9ed" stroke="#8895a3" strokeWidth="1.5" />
            {panels.map((panel, index) => {
              const left = index === 0;
              const transform = left ? 'matrix(0.80 -0.38 0 0.80 115 145)' : 'matrix(0.98 0.45 0 0.80 340 38)';
              const ow = panel.openingWidth / panel.width * 280; const oh = panel.openingHeight / panel.height * 230;
              return <g key={panel.id} transform={transform} className="studio-svg-panel" role="button" tabIndex={0} aria-label={`เลือกชิ้นงาน ${panel.id}`} aria-pressed={selectedId === panel.id} onClick={() => onSelect(panel.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(panel.id); } }}>
                <path d={`M0 0H280V230H0Z M${(280 - ow) / 2} ${(230 - oh) / 2}h${ow}v${oh}h-${ow}Z`} fillRule="evenodd" fill={selectedId === panel.id ? '#e7bba6' : '#c9d1da'} stroke={selectedId === panel.id ? '#d96935' : '#8492a0'} strokeWidth="2" />
                <text x="140" y="205" textAnchor="middle">{panel.id}</text>
              </g>;
            })}
            {joints && <g stroke="#ed6d32" strokeWidth="3" strokeDasharray="6 4"><line x1="340" y1="38" x2="340" y2="248" /><circle cx="340" cy="38" r="4" fill="#ed6d32" /><circle cx="340" cy="248" r="4" fill="#ed6d32" /></g>}
            <text x="351" y="63">J01 · Module joint</text><text x="340" y="476">โมเดลประกอบสองผนัง</text>
          </> : <>
            <rect x="130" y="100" width="460" height="300" fill="#e6e9ed" stroke="#a1adba" />
            {panels.map((panel, index) => <g key={panel.id} className="studio-svg-panel" role="button" tabIndex={0} aria-label={`เลือกชิ้นงาน ${panel.id}`} aria-pressed={selectedId === panel.id} onClick={() => onSelect(panel.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(panel.id); } }}><rect x={index === 0 ? 115 : 130} y="85" width={index === 0 ? 15 : 460} height={index === 0 ? 315 : 15} fill={selectedId === panel.id ? '#f26a2e' : '#8b9aaa'} /><text x={index === 0 ? 50 : 325} y={index === 0 ? 250 : 65}>{panel.id}</text></g>)}
            <text x="210" y="435">ผังประกอบ · ไม่ใช้วัดระยะจากภาพ</text>
          </>}
          {overlay === 'loads' && <g stroke="#427bac" strokeWidth="3">{[240, 360, 480].map((x) => <g key={x}><line x1={x} y1="18" x2={x} y2="85" /><path d={`M${x - 7} 74L${x} 85L${x + 7} 74`} fill="none" /></g>)}</g>}
        </g>
      </svg>
      <div className="studio-canvas-caption">เลือก {selected.id} · {selected.label}</div>
      <div className="studio-zoom"><button type="button" aria-label="ย่อโมเดล" disabled={zoom <= .6} onClick={() => setZoom(Math.max(.6, zoom - .2))}>−</button><button type="button" aria-label="พอดีหน้าจอ" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button type="button" aria-label="ขยายโมเดล" disabled={zoom >= 1.8} onClick={() => setZoom(Math.min(1.8, zoom + .2))}>＋</button></div>
    </div>
    <div className="studio-object-strip" aria-label="รายการชิ้นงาน">{panels.map((panel) => <button type="button" key={panel.id} aria-pressed={selectedId === panel.id} onClick={() => onSelect(panel.id)}>{panel.id}<span>{panel.width.toLocaleString()} × {panel.height.toLocaleString()} mm</span></button>)}</div>
  </section>;
}
