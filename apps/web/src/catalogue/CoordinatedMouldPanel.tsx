import {Board,Download,type Artifact} from './CurrentCatalogue';
export function CoordinatedMouldPanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet" id="mould-p99">
  <h3>P99 — แบบรวมแม่แบบปัจจุบัน</h3>
  <p>รวมชิ้นส่วนที่ออกแบบไว้เป็นโมเดลเดียวต่อ setup พร้อมภาพประกอบครบ ภาพแยกประกอบ ภาพ 3D ชุดย่อย บัญชี Tag และลำดับถอด ภาพเดิม P43 ยังคงไว้ด้านบน</p>
  <p className="cat-notice">ตรวจรูปทรงคอนกรีตเทียบต้นทางแล้ว 44/44 ชุด ขั้นที่ 5 ปิด 100% ตามขอบเขตแม่แบบฉบับวางแผน P100 ไม่ใช่อนุมัติผลิต มิติ XYZ ในบัญชีเป็นกรอบชุดย่อย ไม่ใช่มิติตัดเหล็ก; น้ำหนัก stock ไม่ใช่พิกัดยก งานผลิต/ตรวจแรง/ยกแม่แบบที่เหลืออยู่ใน Production Engineering</p>
  {files.filter(a=>a.filename.endsWith('-board.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P99 ประกอบและถอด'}/>)}
  {files.some(a=>a.filename.endsWith('-parts.png'))&&<details><summary>ภาพ 3D แยกชุดย่อยและมิติ XYZ</summary>{files.filter(a=>a.filename.endsWith('-parts.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P99 ชุดย่อย'}/>)}</details>}
  <div className="p37-actions">{files.map(a=><Download key={a.id} artifact={a} label={(a.id.endsWith('-CURRENT-8')?'ดาวน์โหลดผลเทียบรูปทรง P98 ':'ดาวน์โหลด P99 ')+a.filename}/>)}</div>
 </section>;
}
