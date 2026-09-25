import type { JointGroupId } from './joints';
import './joint-diagram.css';

function ArrowDefs() {
  return <defs><marker id="joint-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" className="diagram-arrow-head" /></marker></defs>;
}

function Callout({ x1, y1, x2, y2, label, sublabel }: { x1: number; y1: number; x2: number; y2: number; label: string; sublabel?: string }) {
  return <g className="diagram-callout"><path d={`M${x1} ${y1}L${x2 - 12} ${y2}`} /><circle cx={x1} cy={y1} r="4" /><text x={x2} y={y2}>{label}</text>{sublabel && <text x={x2} y={y2 + 18} className="diagram-subtext">{sublabel}</text>}</g>;
}

function StandardBayDiagram() {
  return <svg viewBox="0 0 760 360" role="img" aria-label="ภาพสเกมาติก J-S แผงคอนกรีตต่อกันด้วย Plate Bolt Shear key Grout และ Seal">
    <title>J-S Standard Bay Joint</title><desc>แผงคอนกรีตสองแผงมีช่องรอยต่อกลาง มี shear key, closure grout, plate bolt และ seal</desc><ArrowDefs />
    <rect x="70" y="48" width="170" height="238" rx="4" className="diagram-concrete" /><rect x="310" y="48" width="170" height="238" rx="4" className="diagram-concrete" />
    <rect x="240" y="48" width="70" height="238" className="diagram-gap" /><rect x="255" y="72" width="40" height="190" className="diagram-grout" />
    <path d="M240 120h18v22h44v-22h18M240 208h18v22h44v-22h18" className="diagram-shear-key" />
    <rect x="192" y="128" width="196" height="15" rx="3" className="diagram-connector" /><circle cx="222" cy="135.5" r="8" className="diagram-steel" /><circle cx="358" cy="135.5" r="8" className="diagram-steel" />
    <rect x="198" y="255" width="184" height="10" rx="3" className="diagram-seal" />
    <text x="115" y="170" className="diagram-panel-label">แผง A</text><text x="355" y="170" className="diagram-panel-label">แผง B</text><text x="263" y="35" className="diagram-dimension">Joint gap</text>
    <line x1="155" y1="22" x2="155" y2="45" className="diagram-force" markerEnd="url(#joint-arrow)" /><text x="143" y="18" className="diagram-force-label">N</text><line x1="500" y1="180" x2="535" y2="180" className="diagram-force" markerEnd="url(#joint-arrow)" /><text x="540" y="185" className="diagram-force-label">V / T</text>
    <Callout x1={275} y1={102} x2={535} y2={75} label="Closure grout" sublabel="เติมเต็มช่องรอยต่อ" /><Callout x1={388} y1={135} x2={535} y2={135} label="Plate / Bolt" sublabel="Connector ถ่ายแรงข้ามรอยต่อ" /><Callout x1={276} y1={217} x2={535} y2={205} label="Shear key" sublabel="ลิ้นรับแรงเฉือน" /><Callout x1={288} y1={260} x2={535} y2={270} label="Seal" sublabel="กันน้ำ / ปิดผิว" />
    <text x="70" y="325" className="diagram-caption">รอยต่อช่วงตรง · Bearing + Shear key + Connector</text>
  </svg>;
}

function NodeDiagram() {
  return <svg viewBox="0 0 760 360" role="img" aria-label="ภาพสเกมาติก J-N Node Joint มีชิ้นส่วนรอบโหนด เหล็กฝัง Grout และ Closure">
    <title>J-N Node Joint</title><desc>ชิ้นส่วน precast สี่ด้านรวมกันที่โหนดกลาง มี closure grout, embedded steel และ connector หลายทิศทาง</desc><ArrowDefs />
    <path d="M78 82h230v58h58V82h230v206H366v-58h-58v58H78Z" className="diagram-concrete" /><path d="M78 82h230v58h58V82h230v206H366v-58h-58v58H78Z" className="diagram-concrete-light" />
    <rect x="296" y="130" width="64" height="112" rx="5" className="diagram-grout" /><rect x="305" y="145" width="46" height="12" rx="3" className="diagram-connector" /><rect x="305" y="215" width="46" height="12" rx="3" className="diagram-connector" />
    <line x1="328" y1="130" x2="328" y2="242" className="diagram-steel-line" /><line x1="296" y1="186" x2="360" y2="186" className="diagram-steel-line" /><circle cx="328" cy="186" r="12" className="diagram-node-ring" />
    <rect x="294" y="102" width="68" height="9" rx="3" className="diagram-seal" />
    <text x="173" y="115" className="diagram-panel-label">ชิ้นส่วนรอบโหนด</text><text x="306" y="182" className="diagram-panel-label diagram-node-label">N90 / TR</text>
    <line x1="328" y1="38" x2="328" y2="72" className="diagram-force" markerEnd="url(#joint-arrow)" /><text x="316" y="32" className="diagram-force-label">N</text><path d="M160 260c-35-36-20-78 20-94" className="diagram-moment" markerEnd="url(#joint-arrow)" /><text x="115" y="280" className="diagram-force-label">M / V</text>
    <Callout x1={328} y1={160} x2={525} y2={92} label="Embedded steel" sublabel="เหล็กฝัง / เหล็กต่อเนื่อง" /><Callout x1={352} y1={190} x2={525} y2={155} label="Closure grout" sublabel="จุดรวมแรงหลายทิศทาง" /><Callout x1={355} y1={220} x2={525} y2={220} label="Connector" sublabel="ต้องจัดตำแหน่งไม่ชนเหล็ก" /><Callout x1={328} y1={106} x2={525} y2={285} label="Seal / ปิดผิว" />
    <text x="78" y="325" className="diagram-caption">รอยต่อโหนด · ตรวจ N–V–M และความแข็งของ node แบบ 3D</text>
  </svg>;
}

function BaseDiagram() {
  return <svg viewBox="0 0 760 360" role="img" aria-label="ภาพสเกมาติก J-B รอยต่อฐาน มีผนัง Leveling grout Precast shoe Anchor และฐานราก">
    <title>J-B Base Joint</title><desc>ผนังคอนกรีตวางบน leveling grout และ precast shoe ยึดลงฐานรากด้วย anchor หรือ dowel</desc><ArrowDefs />
    <rect x="88" y="282" width="420" height="42" rx="3" className="diagram-foundation" /><rect x="160" y="254" width="276" height="28" rx="3" className="diagram-grout" /><rect x="190" y="48" width="218" height="206" rx="4" className="diagram-concrete" />
    <rect x="205" y="238" width="48" height="28" rx="3" className="diagram-connector" /><rect x="355" y="238" width="48" height="28" rx="3" className="diagram-connector" /><line x1="229" y1="226" x2="229" y2="302" className="diagram-steel-line" /><line x1="379" y1="226" x2="379" y2="302" className="diagram-steel-line" /><circle cx="229" cy="298" r="8" className="diagram-steel" /><circle cx="379" cy="298" r="8" className="diagram-steel" />
    <rect x="177" y="266" width="244" height="9" rx="3" className="diagram-seal" />
    <text x="265" y="155" className="diagram-panel-label">ผนัง / โมดูล</text><text x="260" y="276" className="diagram-dimension">Leveling grout</text><text x="254" y="313" className="diagram-panel-label diagram-foundation-label">ฐานราก</text>
    <line x1="300" y1="18" x2="300" y2="43" className="diagram-force" markerEnd="url(#joint-arrow)" /><text x="288" y="16" className="diagram-force-label">N</text><line x1="145" y1="160" x2="180" y2="160" className="diagram-force" markerEnd="url(#joint-arrow)" /><text x="112" y="165" className="diagram-force-label">V</text><path d="M470 110c42 32 44 80 4 111" className="diagram-moment" markerEnd="url(#joint-arrow)" /><text x="492" y="100" className="diagram-force-label">M / Uplift</text>
    <Callout x1={408} y1={250} x2={535} y2={82} label="Precast shoe" sublabel="Bearing / ปรับตั้งระดับ" /><Callout x1={379} y1={298} x2={535} y2={160} label="Anchor / Dowel" sublabel="ตรวจระยะขอบและ breakout" /><Callout x1={435} y1={268} x2={535} y2={230} label="Seal / Grout" sublabel="ปิดงานหลังตั้งและปรับระดับ" />
    <text x="88" y="343" className="diagram-caption">รอยต่อฐาน · Bearing + Leveling grout + Hold-down</text>
  </svg>;
}

export function JointConnectionDiagram({ groupId, title }: { groupId: JointGroupId; title: string }) {
  return <section className="cat-connection-diagram" aria-label={`ภาพสเกมาติก Connection ${groupId}`}>
    <div className="cat-connection-diagram-header"><div><h3>ภาพสเกมาติก Connection · {groupId}</h3><p>{title} · แสดงชิ้นส่วนและเส้นทางถ่ายแรงเพื่อช่วยเลือกแนวทาง</p></div><span>NOT TO SCALE</span></div>
    {groupId === 'J-S' ? <StandardBayDiagram /> : groupId === 'J-N' ? <NodeDiagram /> : <BaseDiagram />}
  </section>;
}
