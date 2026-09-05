import { useSharedDocument } from '../data/useSharedDocument';
import type { SharedCategory } from '../data/sharedRepository';

export function SharedMenuEditor({ category, id, title }: { category: SharedCategory; id: string; title: string }) {
  const record = useSharedDocument(category, id, { notes: '' });
  return <section className="surface studio-form-surface"><h2>{title}</h2><p>บันทึกข้อมูลร่วมของเมนูนี้ · ผู้ใช้ทุกคนเห็นข้อมูลชุดเดียวกัน</p>
    <label className="form-field">รายละเอียด / ข้อมูลอ้างอิง<textarea rows={5} value={record.data.notes} disabled={!record.loaded || record.saving} onChange={(event) => record.setData({ notes: event.target.value })} /></label>
    <div className="dialog-actions"><button className="button button--primary" disabled={!record.loaded || record.saving || !record.dirty} onClick={() => void record.save()}>{record.saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูลเมนู'}</button><button className="button button--secondary" disabled={!record.loaded || record.saving} onClick={record.reload}>โหลดข้อมูลล่าสุด</button></div>
    <p role={record.error ? 'alert' : 'status'}>{record.error || (!record.loaded ? 'กำลังอ่าน Firebase…' : record.dirty ? 'มีการแก้ไขที่ยังไม่บันทึก' : `อ่านจาก Firebase แล้ว · Revision ${record.revision}`)}</p>
  </section>;
}
