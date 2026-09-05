import { useEffect, useState } from 'react';
import { SharedMenuEditor } from '../components/SharedMenuEditor';
import { watchSharedCollection, type SharedCategory } from '../data/sharedRepository';

export function SharedMenuPage({ category, title }: { category: SharedCategory; title: string }) {
  const [events, setEvents] = useState<Array<{ id: string; updatedAt: string; updatedBy: string; data: { category: string; documentId: string; action: string } }>>([]);
  const [error, setError] = useState('');
  useEffect(() => category === 'audit' ? watchSharedCollection<{ category: string; documentId: string; action: string }>('audit', setEvents, (reason) => setError(reason.message)) : undefined, [category]);
  return <><div className="page-heading"><h1>{title}</h1></div>{category === 'audit' ? <section className="surface"><p role="alert">{error}</p><table className="data-table"><thead><tr><th>เวลา</th><th>หมวดเมนู</th><th>รายการ</th><th>การดำเนินการ</th><th>ผู้ดำเนินการ</th></tr></thead><tbody>{events.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item) => <tr key={item.id}><td>{item.updatedAt}</td><td>{item.data.category}</td><td>{item.data.documentId}</td><td>{item.data.action}</td><td>{item.updatedBy}</td></tr>)}</tbody></table></section> : <><SharedMenuEditor key={category} category={category} id="workspace" title={title} />{category === 'team' && <p>พื้นที่ร่วมเปิดให้ผู้ใช้ที่ลงชื่อเข้าใช้ รวมถึง anonymous · บันทึกนี้เป็นข้อมูลทีม ไม่เปลี่ยนสิทธิ์ Firebase</p>}{category === 'review' && <p>บันทึกนี้เป็นรายละเอียดงานรอตรวจ ยังไม่ถือเป็นการอนุมัติทางวิศวกรรม</p>}</>}</>;
}
