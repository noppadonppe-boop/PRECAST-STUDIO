import { calculatePrestress, emptyPrestressInput, prestressFields, prestressInputIssues, type DesignCriteria } from '@precast/domain';
import './prestress.css';

const fmt = (value: number) => value.toLocaleString('th-TH', { maximumFractionDigits: 4 });
export function PrestressCalculator({ value, onChange, disabled = false }: { value: DesignCriteria; onChange?: (value: DesignCriteria) => void; disabled?: boolean }) {
  const input = value.prestressCalculation;
  const issues = input ? prestressInputIssues(input) : [];
  const result = input && issues.length === 0 ? calculatePrestress(input) : null;
  const readOnly = !onChange;
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), designCriteria: value, input, result }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'prestress-calculation-draft.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="criteria-standard prestress-calculator" aria-label="คำนวณคอนกรีตอัดแรง">
    <h3>คำนวณคอนกรีตอัดแรง · Prestress</h3>
    <p>หน้าตัดสี่เหลี่ยมตัน คานรองรับสองด้าน ลวดตรงเยื้องศูนย์คงที่ แรงอัดสม่ำเสมอตลอดช่วง และน้ำหนักกระจายสม่ำเสมอ ตรวจหน่วยแรงเฉพาะกลางช่วง</p>
    {!readOnly && <label className="prestress-toggle"><span>เปิดใช้การคำนวณ Prestress</span><input type="checkbox" checked={!!input} disabled={disabled} onChange={(event) => {
      const next = { ...value };
      if (event.target.checked) next.prestressCalculation = emptyPrestressInput();
      else delete next.prestressCalculation;
      onChange?.(next);
    }} /></label>}
    {!input ? <p>ยังไม่เปิดใช้ — กำหนดข้อมูลที่ Design Criteria → พรีคาสท์และการติดตั้ง</p> : <>
      {/ไม่อัดแรง|ไม่ใช้.*อัดแรง|non[- ]?prestress/i.test(`${value.values.prestress} ${value.values.concreteType}`) && <p role="alert">ข้อมูลไม่สอดคล้อง: ทะเบียนเดิมระบุไม่อัดแรง ต้องปรับชนิดคอนกรีตและข้อความระบบอัดแรงใน Design Criteria ก่อนส่งตรวจ</p>}
      <p>ค่าชุดนี้บันทึกร่วมกับร่าง Design Basis ด้วยปุ่มบันทึกของหน้าเกณฑ์ออกแบบ ต้องระบุชิ้นงานและชุดน้ำหนักเอง ไม่มีการดึง geometry หรือแรงจาก BIM อัตโนมัติ</p>
      <details open={!readOnly}><summary>ข้อมูลที่ใช้คำนวณและแหล่งอ้างอิง</summary>
      <fieldset disabled={disabled || readOnly} className="criteria-fields"><legend>ข้อมูลอัดแรงและขอบเขตการคำนวณ</legend>
        <div className="criteria-field-grid">
          <label className="form-field">ระบบอัดแรง<select value={input.system} onChange={(event) => onChange?.({ ...value, prestressCalculation: { ...input, system: event.target.value as typeof input.system } })}><option value="pretension">Pre-tension · ดึงก่อนหล่อ</option><option value="posttension">Post-tension · ดึงภายหลัง</option></select></label>
          <label className="form-field">ชิ้นงาน / Revision / ชุดน้ำหนัก<input maxLength={4000} value={input.memberReference} onChange={(event) => onChange?.({ ...value, prestressCalculation: { ...input, memberReference: event.target.value } })} /></label>
          {prestressFields.map((field) => <label key={field.key} className="form-field">{field.label}<input type="number" min={field.min} max={field.max} step={field.key === 'strandCount' ? 1 : 'any'} value={input.values[field.key]} onChange={(event) => onChange?.({ ...value, prestressCalculation: { ...input, values: { ...input.values, [field.key]: event.target.value } } })} /></label>)}
          <label className="form-field">แหล่งอ้างอิงวัสดุ การสูญเสีย และขีดจำกัดหน่วยแรง<textarea rows={3} maxLength={4000} value={input.source} onChange={(event) => onChange?.({ ...value, prestressCalculation: { ...input, source: event.target.value } })} /></label>
        </div>
        <p>น้ำหนักรวมต้องรวมน้ำหนักตัวเองหนึ่งครั้งและรวมตัวคูณของชุดน้ำหนักที่เลือกแล้ว ใส่การสูญเสียเป็น MPa ของลวดแต่ละช่วงเวลา ห้ามนับซ้ำ; ค่าที่ไม่ใช้ให้กรอก 0 ระบบรวมการสูญเสียตามค่าที่กรอก ไม่ได้คำนวณแต่ละสาเหตุจากสภาพแวดล้อมหรือขั้นตอนดึง</p>
        <p>Post-tension ใช้ได้เฉพาะการประมาณแรงคงที่ที่มีหลักฐานรองรับ ยังไม่จำลองแรงตามความยาวจาก friction/seating หรือหักพื้นที่ท่อร้อยลวด</p>
        <label><input type="checkbox" checked={input.assumptionsConfirmed} onChange={(event) => onChange?.({ ...value, prestressCalculation: { ...input, assumptionsConfirmed: event.target.checked } })} /> ยืนยันว่าข้อมูลนี้ใช้กับหน้าตัดสี่เหลี่ยมไม่แตกร้าว ลวดตรง แรงคงที่ รองรับสองด้าน และน้ำหนักสม่ำเสมอ ตามขอบเขตที่ระบุ</label>
      </fieldset>
      </details>
      {issues.length > 0 && <div role="status"><p>ยังคำนวณไม่ได้ — ต้องแก้ไข {issues.length} รายการ</p><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
      {result && <>
        <p><strong>PRELIMINARY_NOT_VERIFIED · ผลเบื้องต้น ยังไม่รับรองตาม Code</strong></p>
        <p>ชิ้นงาน: {input.memberReference} · พื้นที่หน้าตัด {fmt(result.areaMm2)} mm² · I = {fmt(result.inertiaMm4)} mm⁴ · Aps = {fmt(result.strandAreaMm2)} mm²</p>
        <p>แรงดึงเริ่มต้น Pj = {fmt(result.jackingForceKn)} kN · สูญเสียก่อนถ่ายแรง {fmt(result.lossMpa.immediate)} MPa · หลังถ่ายแรง {fmt(result.lossMpa.longTerm)} MPa · รวม {fmt(result.lossPercent)}%</p>
        <div className="table-scroll"><table className="data-table"><caption>ผลกลางช่วง · หน่วยแรงบวก = อัด, ลบ = ดึง · การโก่งบวก = ลง, ลบ = โก่งขึ้น</caption><thead><tr><th>รายการ</th><th>ขณะถ่ายแรง</th><th>ขณะใช้งานหลังสูญเสีย</th></tr></thead><tbody>
          {([
            ['แรงอัดในคอนกรีต · kN', result.transfer.forceKn, result.service.forceKn],
            ['หน่วยแรงลวด · MPa', result.transferStressMpa, result.effectiveStressMpa],
            ['โมเมนต์น้ำหนักบรรทุก · kN·m', result.transfer.momentKnm, result.service.momentKnm],
            ['หน่วยแรงผิวบน · MPa', result.transfer.topMpa, result.service.topMpa],
            ['หน่วยแรงผิวล่าง · MPa', result.transfer.bottomMpa, result.service.bottomMpa],
            ['ขีดจำกัดอัดที่กรอก · MPa', result.transfer.compressionLimitMpa, result.service.compressionLimitMpa],
            ['ขีดจำกัดดึงที่กรอก · MPa', result.transfer.tensionLimitMpa, result.service.tensionLimitMpa],
            ['การโก่งจากน้ำหนัก · mm', result.transfer.gravityDeflectionMm, result.service.gravityDeflectionMm],
            ['การโก่งจากอัดแรง · mm', result.transfer.prestressDeflectionMm, result.service.prestressDeflectionMm],
            ['การโก่งสุทธิแบบ elastic · mm', result.transfer.netElasticDeflectionMm, result.service.netElasticDeflectionMm],
          ] as const).map(([label, transfer, service]) => <tr key={label}><th>{label}</th><td>{fmt(transfer)}</td><td>{fmt(service)}</td></tr>)}
          <tr><th>เทียบขีดจำกัดที่ผู้ใช้กรอก</th>{[result.transfer, result.service].map((stage, index) => <td key={index}>{stage.comparison === 'WITHIN_USER_LIMITS' ? 'อยู่ในขีดจำกัดที่กรอก' : 'เกินขีดจำกัดที่กรอก'}</td>)}</tr>
        </tbody></table></div>
        {(result.transfer.hasTension || result.service.hasTension) && <p role="alert">พบหน่วยแรงดึง ต้องตรวจการแตกร้าวและความเหมาะสมของ uncracked EI ก่อนใช้ผลการโก่งตัว</p>}
        <p>สูตร: Pj = Aps·fpj; Pt = Aps·(fpj−Δfi); P_effective = Aps·(fpj−Δfi−Δfl); σบน = P/A−P·e/S+M/S; σล่าง = P/A+P·e/S−M/S; M = wL²/8; δ = 5wL⁴/(384EI)−P·e·L²/(8EI) โดยใช้ Pt/Eci ขณะถ่ายแรง และ P_effective/Ec ขณะใช้งาน หน่วยภายใน N, mm</p>
        <ul>{result.exclusions.map((text) => <li key={text}>{text}</li>)}</ul>
        <p>อ้างอิงหลักสมดุลหน่วยแรงและการแยกการสูญเสีย: <a href={result.references[0]} target="_blank" rel="noreferrer">FHWA — Flexural stress</a> · <a href={result.references[1]} target="_blank" rel="noreferrer">FHWA — Prestress losses</a> (ไม่ได้ใช้ขีดจำกัด AASHTO ในตัวอย่างเป็นค่า Code ของโครงการ)</p>
        <button type="button" className="button button--secondary" onClick={download}>ดาวน์โหลดรายการคำนวณ Prestress JSON</button>
        <p>ไฟล์ส่งออกเป็นค่าร่างที่แสดงขณะนี้ รวมสมมติฐาน แหล่งอ้างอิง และข้อจำกัด ไม่ใช่ผลอนุมัติหรือสิทธิ์ส่งผลิต</p>
      </>}
    </>}
  </section>;
}
