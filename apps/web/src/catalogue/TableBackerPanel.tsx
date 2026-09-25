import {Board,Download,type Artifact} from './CurrentCatalogue';
export function TableBackerPanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet"><h3>P96 — แถบรองซีลใต้โต๊ะ</h3>
  <p>เพิ่มแถบเหล็กตั้ง 6×60 มม. ระหว่างซี่โครงใต้แนวซีล แยกชิ้นตัดและแนวเชื่อมจริง ไม่สอดทะลุเหล็กกล่อง ต้องใส่ก่อนแผ่นรองโบลต์และอุปกรณ์ล็อก ช่องหล่อเดิมไม่เปลี่ยน</p>
  <p className="cat-notice">ผลเฉพาะกรณีแรงกดซีลทดลอง 0.10 MPa และคานรองรับอุดมคติ ไม่ใช่ผลวัสดุจริงหรือกำลังของฐานทั้งชุด ระบบยกและการอนุมัติผลิตยังไม่ปิด</p>
  {files.filter(a=>a.filename.endsWith('.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P96 แถบรองซีลใต้โต๊ะ'}/>)}
  <div className="p37-actions">{files.map(a=><Download key={a.id} artifact={a} label={'ดาวน์โหลด P96 '+a.filename}/>)}</div>
 </section>;
}
