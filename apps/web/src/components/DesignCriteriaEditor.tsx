import { useState, type ReactNode } from 'react';
import { applyThaiPrecastPreset, criteriaFields, criteriaGroups, designCriteriaIssues, designEngineSupport, standardLabels, type CriteriaGroup, type DesignCriteria, type StandardReference } from '@precast/domain';
import { StatusBadge, Surface } from '@precast/ui';
import { PrestressCalculator } from './PrestressCalculator';

const statusLabels: Record<string, string> = { draft: 'ร่าง — รอตรวจรับรอง', submitted: 'ส่งตรวจแล้ว', approved: 'อนุมัติ Design Basis แล้ว', returned: 'ส่งกลับแก้ไข', superseded: 'ถูกแทนที่ด้วย Revision ใหม่' };
export function DesignCriteriaEditor({ value, onChange, disabled = false, status = 'draft', actions }: { value: DesignCriteria; onChange: (value: DesignCriteria) => void; disabled?: boolean; status?: string; actions?: ReactNode }) {
  const [tab, setTab] = useState<CriteriaGroup>('มาตรฐาน');
  const [notice, setNotice] = useState('');
  const issues = designCriteriaIssues(value);
  function updateStandard(index: number, key: keyof StandardReference, text: string) {
    onChange({ ...value, standards: value.standards.map((item, i) => i === index ? { ...item, [key]: text } : item) });
  }
  return <Surface className="criteria-editor" ariaLabel="ทะเบียนเกณฑ์ออกแบบ">
    <header className="criteria-heading"><div><p className="eyebrow">PROJECT DESIGN BASIS</p><h2>เกณฑ์ออกแบบพรีคาสท์</h2><p>กำหนดมาตรฐานรายเรื่องและหลักฐานของโครงการก่อนส่งตรวจ</p></div><StatusBadge tone={status === 'approved' ? 'success' : 'warning'}>{statusLabels[status] ?? status}</StatusBadge></header>
    <div className="criteria-readiness"><div><strong>{issues.length ? `ต้องกำหนดเพิ่มเติม ${issues.length} รายการ` : 'ข้อมูลครบสำหรับส่งตรวจ'}</strong><p>ความครบถ้วนของข้อมูลยังไม่ใช่ผลตรวจผ่านทางวิศวกรรม</p></div><button type="button" className="button button--secondary" onClick={() => setTab('ตรวจความพร้อม')}>ดูรายการที่ต้องตรวจ</button></div>
    <div className="studio-tabs" aria-label="หมวดเกณฑ์ออกแบบ">{criteriaGroups.map((group) => <button type="button" key={group} aria-pressed={tab === group} onClick={() => setTab(group)}>{group}</button>)}</div>
    <div className="criteria-content">
      {tab === 'มาตรฐาน' && <div className="criteria-preset"><div><strong>ชุดแนะนำ · โครงการไทย / ACI 2025</strong><p>ข้อกำหนดไทย + ACI 318-25 + ACI/PCI 319-25 + วสท. และ PCI เป็นมาตรฐานเสริม เติมเฉพาะรายการว่าง และให้วิศวกรตรวจความสอดคล้องรายโครงการ</p></div><button className="button button--primary" type="button" disabled={disabled} onClick={() => { onChange(applyThaiPrecastPreset(value)); setNotice('เพิ่มชุดแนะนำเป็นร่างแล้ว — ต้องเลือกมาตรฐานแรง ปี ฉบับแก้ไข และข้ออ้างอิงของโครงการ'); }}>ใช้ชุดมาตรฐานแนะนำสำหรับโครงการไทย</button></div>}
      {notice && <p role="status">{notice}</p>}
      {tab === 'หน่วยและแหล่งอ้างอิง' && <><h3>ระบบหน่วย SI</h3><div className="table-scroll"><table className="data-table"><thead><tr><th>ข้อมูล</th><th>หน่วย</th><th>การแปลงที่ต้องใช้</th></tr></thead><tbody>{[
        ['แรง / โมเมนต์', 'kN / kN·m', '1 kN = 1,000 N'], ['มิติแบบจำลอง / รายละเอียดเหล็ก', 'm / mm', '1 m = 1,000 mm'], ['หน่วยแรง / โมดูลัส', 'MPa', '1 MPa = 1 N/mm² = 1,000 kN/m²'], ['น้ำหนักกระจายบนพื้นที่', 'kN/m²', 'แยกจากหน่วยแรง MPa'], ['ความหนาแน่นมวล', 'kg/m³', 'ไม่ใช่น้ำหนักต่อปริมาตร'], ['น้ำหนักต่อปริมาตร', 'kN/m³', 'ρ × 9.80665 / 1,000'],
      ].map(([label, unit, conversion]) => <tr key={label}><td>{label}</td><td>{unit}</td><td>{conversion}</td></tr>)}</tbody></table></div><p>ทุกค่าที่นำเข้าต้องมีหน่วย; ไม่ตีความ kg เป็นแรงโดยอัตโนมัติ</p></>}
      {tab === 'พรีคาสท์และการติดตั้ง' && <p className="criteria-help">ครอบคลุมถอดแบบ → ยกและพลิก → กองเก็บ → ขนส่ง → ติดตั้งและค้ำยัน → ใช้งานถาวร ระบุเหตุผลและหลักฐานสำหรับรายการที่ไม่เกี่ยวข้อง</p>}
      {tab === 'วัสดุ' && <p className="criteria-help">ระบุวัสดุจริงและผลทดสอบ โดยเฉพาะคอนกรีตเบา ต้องตรวจชนิดและขอบเขตมาตรฐานก่อนใช้สมการ; ค่าตัวอย่าง LC-1200 ไม่ถูกนำมาเป็นเกณฑ์รับรองโดยอัตโนมัติ</p>}
      {tab === 'พรีคาสท์และการติดตั้ง' && <PrestressCalculator value={value} onChange={onChange} disabled={disabled} />}
      <fieldset disabled={disabled} className="criteria-fields"><legend className="sr-only">{tab}</legend>
        <div className="criteria-field-grid">{criteriaFields.filter((field) => field.group === tab).map((field) => <label className="form-field" key={field.key}>{field.label}{'min' in field ? <input aria-label={field.label} type="number" min={field.min} max={field.max} step="any" value={value.values[field.key]} onChange={(event) => onChange({ ...value, values: { ...value.values, [field.key]: event.target.value } })} /> : <textarea aria-label={field.label} rows={2} maxLength={4000} value={value.values[field.key]} onChange={(event) => onChange({ ...value, values: { ...value.values, [field.key]: event.target.value } })} />}{field.hint && <small>{field.hint}</small>}</label>)}</div>
        {tab === 'มาตรฐาน' && <div className="criteria-standards">{value.standards.map((item, index) => <section className="criteria-standard" key={item.category} aria-label={standardLabels[item.category]}><div className="criteria-standard-title"><h3>{standardLabels[item.category]}</h3><StatusBadge tone={item.applicability === 'notApplicable' ? 'neutral' : item.code && item.edition ? 'info' : 'warning'}>{item.applicability === 'notApplicable' ? 'ไม่ใช้ — ต้องมีเหตุผล' : item.code && item.edition ? 'ระบุแล้ว — รอตรวจ' : 'ยังไม่กำหนด'}</StatusBadge></div>
          <div className="criteria-field-grid"><label className="form-field">การใช้กับโครงการ<select value={item.applicability} onChange={(event) => updateStandard(index, 'applicability', event.target.value)}><option value="required">ใช้กับโครงการ</option>{!['regulatory', 'concrete', 'precast', 'loading'].includes(item.category) && <option value="notApplicable">ไม่ใช้ — ระบุเหตุผล</option>}</select></label>
          {item.applicability === 'notApplicable' ? <label className="form-field">เหตุผลและหลักฐาน<textarea rows={2} maxLength={4000} value={item.reason} onChange={(event) => updateStandard(index, 'reason', event.target.value)} /></label> : <>{([
            ['code', 'รหัส / ชื่อมาตรฐาน', 500], ['edition', 'ปี / Edition', 80], ['amendment', 'ฉบับแก้ไข / Errata (ถ้าไม่มีให้ระบุ)', 500], ['scope', 'ขอบเขตที่นำมาใช้', 4000], ['source', 'เอกสารอ้างอิง / URL', 4000], ['clause', 'บท / ข้อ / หน้าอ้างอิง', 4000],
          ] as const).map(([key, label, maxLength]) => <label className="form-field" key={key}>{label}<input maxLength={maxLength} value={item[key]} onChange={(event) => updateStandard(index, key, event.target.value)} /></label>)}</>}</div>
          {/^https:\/\/\S+$/.test(item.source) && <a href={item.source} target="_blank" rel="noreferrer">เปิดเอกสารอ้างอิง ↗</a>}
        </section>)}</div>}
      </fieldset>
      {tab === 'ตรวจความพร้อม' && <><h3>รายการก่อนส่งตรวจ Design Basis</h3><p>มาตรฐาน → ร่าง → ส่งตรวจ → อนุมัติโดยผู้ตรวจตามสิทธิ์ การแก้ไขฉบับที่อนุมัติแล้วต้องสร้าง Revision ใหม่และตรวจผลที่เกี่ยวข้องใหม่</p>{issues.length ? <ul className="criteria-issues">{issues.map((issue, index) => <li key={index}><button type="button" onClick={() => setTab(issue.group)}>{issue.message} →</button></li>)}</ul> : <p>ข้อมูลครบสำหรับส่งตรวจโดยวิศวกร — ยังไม่ใช่การรับรองความถูกต้องของค่าและเอกสาร</p>}</>}
      <div className="criteria-engine"><StatusBadge tone="warning">{designEngineSupport.label}</StatusBadge><p>{designEngineSupport.detail}</p></div>
    </div>
    {actions && <footer className="criteria-actions">{actions}</footer>}
  </Surface>;
}
