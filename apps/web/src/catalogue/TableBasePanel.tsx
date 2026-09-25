import {Board,Download,type Artifact} from './CurrentCatalogue';
export function TableBasePanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet"><h3>P97 — ฐานรองจุดล็อกและฐานเปล่าขณะยก</h3>
  <p>เพิ่มแก้มรองใต้แผ่นโบลต์ลงรางหลักและคานกล่องหัวท้าย มีชิ้นใหม่/ทดแทน 52 ชิ้นต่อโต๊ะ พร้อมพิกัดแนวเชื่อม มวลและจุดศูนย์ถ่วง ไม่เปลี่ยนช่องหล่อ</p>
  <p className="cat-notice">จุดรับฐานในภาพไม่ใช่หูยก ผลแรงเป็นกรณีศึกษาฐานเปล่าและแรงดันเฉพาะส่วน ระยะคลอนโบลต์ แรงงัด ความแข็งของฐานจริง และอุปกรณ์ยกยังต้องปิด ไม่ใช่การอนุมัติผลิตหรือยก</p>
  {files.filter(a=>a.filename.endsWith('.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P97 ฐานรองจุดล็อก'}/>)}
  <div className="p37-actions">{files.map(a=><Download key={a.id} artifact={a} label={'ดาวน์โหลด P97 '+a.filename}/>)}</div>
 </section>;
}
