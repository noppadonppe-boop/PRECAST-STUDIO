import { Download, Board, type Artifact } from './CurrentCatalogue';
export type RevitPackage={status:string;softwareVersion:string;revision?:string;files:(Artifact & {kind:string})[]};
export function RevitDelivery({delivery,architectural=false}:{delivery?:RevitPackage|null|undefined;architectural?:boolean}) {
  if(!delivery?.files.length)return <p>{architectural?'ARC ขั้นที่ 6.1':'Revit ขั้นที่ 6'}: ยังไม่มีชุดส่งมอบที่เปิดให้ดาวน์โหลด</p>;
  const hero=delivery.files.find(f=>f.kind==='PNG_3D_EXTERIOR');
  return <section className="cat-notice"><h2>{architectural?'ARC ขั้น 6.1 · สถาปัตยกรรมและตกแต่ง':'STR ขั้น 6 · โครงสร้างพรีคาส'} · Revit {delivery.softwareVersion}</h2><p>สถานะชุดส่งมอบ: {delivery.status} · แบบพัฒนาและประสานงาน {delivery.revision}</p>
    {architectural&&<p>ARC แยกไฟล์และ Link โครงสร้างเดิม · ดาวน์โหลด ZIP แล้วแตกทั้งชุดเพื่อรักษา References · Spec ไม่ผูกยี่ห้อและตำแหน่งแอร์/ไฟฟ้า/สุขาภิบาลเบื้องต้น ไม่ใช่แบบก่อสร้างอนุมัติ</p>}
    <div className="p37-actions">{delivery.files.filter(f=>!f.kind.startsWith('PNG')).map(f=><Download key={f.id} artifact={f} label={`${f.kind} · ${(f.bytes/1048576).toFixed(1)} MB`}/>)}</div>
    {hero&&<Board artifact={hero} alt="ภาพส่งออกจากโมเดล Revit"/>}
    <div className="p37-actions">{delivery.files.filter(f=>f.kind.startsWith('PNG')).map(f=><Download key={f.id} artifact={f} label={f.kind.replace('PNG_','ภาพ ')}/>)}</div>
  </section>;
}
