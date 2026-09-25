import { useState, type ChangeEvent } from 'react';
import { useSharedDocument } from '../data/useSharedDocument';
import { uploadSharedFile, type SharedAttachment, type SharedCategory } from '../data/sharedRepository';

interface SharedMenuData {
  notes: string;
  attachments?: SharedAttachment[];
}

export function SharedMenuEditor({ category, id, title }: { category: SharedCategory; id: string; title: string }) {
  const record = useSharedDocument<SharedMenuData>(category, id, { notes: '', attachments: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !record.loaded || uploading) return;
    setUploading(true); setUploadStatus('กำลังอัปโหลด 0%'); setUploadError('');
    try {
      const attachment = await uploadSharedFile({ category, documentId: id, file, onProgress: (percent) => setUploadStatus(`กำลังอัปโหลด ${percent}%`) });
      const next = { ...record.data, attachments: [...(record.data.attachments ?? []), attachment] };
      record.setData(next);
      await record.save(next);
      setUploadStatus(`อัปโหลด ${file.name} และบันทึกข้อมูลแล้ว`);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'อัปโหลดไฟล์ไม่สำเร็จ');
      setUploadStatus('');
    } finally { setUploading(false); }
  }
  const attachments = record.data.attachments ?? [];
  return <section className="surface studio-form-surface"><h2>{title}</h2><p>บันทึกข้อมูลร่วมของเมนูนี้ · ผู้ใช้ทุกคนเห็นข้อมูลชุดเดียวกัน</p>
    <label className="form-field">รายละเอียด / ข้อมูลอ้างอิง<textarea rows={5} value={record.data.notes ?? ''} disabled={!record.loaded || record.saving} onChange={(event) => record.setData((previous) => ({ ...previous, notes: event.target.value }))} /></label>
    <label className="form-field">แนบไฟล์ของเมนูนี้<input type="file" disabled={!record.loaded || record.saving || uploading} onChange={(event) => void upload(event)} /><small>ไฟล์จะอยู่ใน Storage กลางของ PRECAST MODULE · ไม่แยกตามผู้ใช้ · ขนาดไม่เกิน 100 MB</small></label>
    {attachments.length > 0 && <ul><li><strong>ไฟล์ที่แนบ</strong></li>{attachments.map((attachment) => <li key={attachment.id}><a href={attachment.downloadUrl} target="_blank" rel="noreferrer">{attachment.name}</a> <small>({Math.ceil(attachment.size / 1024)} KB)</small></li>)}</ul>}
    <div className="dialog-actions"><button className="button button--primary" disabled={!record.loaded || record.saving || !record.dirty} onClick={() => void record.save()}>{record.saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูลเมนู'}</button><button className="button button--secondary" disabled={!record.loaded || record.saving || uploading} onClick={record.reload}>โหลดข้อมูลล่าสุด</button></div>
    <p role={record.error || uploadError ? 'alert' : 'status'}>{record.error || uploadError || uploadStatus || (!record.loaded ? 'กำลังอ่าน Firebase…' : record.dirty ? 'มีการแก้ไขที่ยังไม่บันทึก' : `อ่านจาก Firebase แล้ว · Revision ${record.revision}`)}</p>
  </section>;
}
