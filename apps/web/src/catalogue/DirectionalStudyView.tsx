import type { DirectionalStudy } from './model';
import { DownloadButton } from './Downloads';
export function DirectionalStudyView({study}:{study:DirectionalStudy}){
  return <section className="cat-detail"><span className="cat-eyebrow">STEP 2N / DIAGNOSTIC ONLY</span><h1>แยกทิศความต่างของความเค้น</h1>
    {study.status==='STALE'&&<p role="alert">ข้อมูล Step 2N เป็น STALE ต้องประมวลผลใหม่</p>}
    <p>อ่านผลเดิม KPT / M1 ที่490พิกัด ไม่มี FEM run ใหม่ · คงเกณฑ์เดิม · ไม่ใช่การอนุมัติผลิต</p>
    <ul>{study.findings.map(f=><li key={f}>{f}</li>)}</ul>
    <p>ทิศของความต่างไม่ใช่ข้อพิสูจน์สาเหตุ ต้องแยกตรวจ mesh บริเวณฐาน แนวยาว และความหนาก่อนเลือกวิธีปรับ ผลเฉพาะจุดยังผ่านครบเพียง1/4กลุ่ม</p>
    {study.drawings.map(d=><figure key={d.id}><a href={d.artifact.url} target="_blank" rel="noreferrer"><img style={{width:'100%',height:'auto'}} src={d.artifact.url} alt={d.title}/></a><figcaption>{d.title} <DownloadButton artifact={d.artifact}/></figcaption></figure>)}
  </section>;
}
