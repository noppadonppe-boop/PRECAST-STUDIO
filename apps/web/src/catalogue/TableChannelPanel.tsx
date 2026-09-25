import {Board,Download,type Artifact} from './CurrentCatalogue';
export function TableChannelPanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet"><h3>P94 — รางประกอบหลังแบบโต๊ะ</h3>
  <p>เปลี่ยนรายละเอียดมุมกล่องสมมติเป็นรางจากแผ่นเหล็ก 3 ชิ้น มีภาพแยกประกอบ พิกัดรอยเชื่อม และหน้าตัดคำนวณใหม่ ไม่เปลี่ยนช่องหล่อหรือรูล็อก ภาพ P43 และทางเลือก P93 คงเป็นประวัติ</p>
  <p className="cat-notice">คำนวณใหม่เฉพาะกรณีแรงดันและจุดรองรับสมมติ ผลการโก่งยังไม่ใช่ tolerance ที่ยอมรับ งานจุดต่อทั้งชุด ซีล ฐาน และระบบยกถูกโอนไป Production Engineering หลังปิดขอบเขต P100 ไม่ใช่แบบอนุมัติผลิต</p>
  {files.filter(a=>a.filename.endsWith('.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P94 รางประกอบจากแผ่นเหล็ก'}/>)}
  <div className="p37-actions">{files.map(a=><Download key={a.id} artifact={a} label={'ดาวน์โหลด P94 '+a.filename}/>)}</div>
 </section>;
}
