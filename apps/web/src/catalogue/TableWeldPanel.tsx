import {Board,Download,type Artifact} from './CurrentCatalogue';
export function TableWeldPanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet"><h3>P93 — แนวเชื่อมจุดล็อกแม่แบบโต๊ะ</h3>
  <p>รายละเอียดทางเลือกสำหรับผิว–RHS–แผ่นค้ำ–เท้า ปรับแผ่นค้ำให้มีพื้นที่เชื่อมรอบ ไม่เปลี่ยนช่องหล่อหรือรูโบลต์ ภาพเดิมและโมเดล P47/P51 ยังคงเป็นประวัติ</p>
  <p className="cat-notice">ผลนี้ตรวจเนื้อรอยเชื่อมเฉพาะกรณีแรงดันตามแบบจำลองรองรับที่สมมติ ไม่ใช่ความแข็งจริงของขา ไม่ครอบคลุมจุดต่อทั้งชุด ความล้า ระบบยก หรือรอยเชื่อมโครงฐาน และยังไม่อนุมัติผลิต</p>
  {files.filter(a=>a.filename.endsWith('.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P93 แนวเชื่อมแม่แบบโต๊ะ'}/>)}
  <div className="p37-actions">{files.map(a=><Download key={a.id} artifact={a} label={'ดาวน์โหลด P93 '+a.filename}/>)}</div>
 </section>;
}
