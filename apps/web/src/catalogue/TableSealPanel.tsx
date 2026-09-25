import {Board,Download,type Artifact} from './CurrentCatalogue';
export function TableSealPanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet"><h3>P95 — ร่องและซีลแม่แบบโต๊ะ</h3>
  <p>ร่องฐานและรอยต่อหัวท้ายอยู่นอกช่องคอนกรีต แยกยาง 12 ชิ้นเป็น 5 ชุดติดตั้ง มีรูปตัด รายละเอียดมุม และลำดับเปิดแบบ 44 ช่วง ไม่เปลี่ยนมิติ Typical และคงภาพเดิมไว้</p>
  <p className="cat-notice">ตรวจเฉพาะรูปทรงและช่องว่าง nominal ยังไม่ผ่านการทดสอบวัสดุ แรงปิด การกันรั่ว หรือระบบพยุงยก ไม่ใช่แบบอนุมัติผลิต</p>
  {files.filter(a=>a.filename.endsWith('.png')).map(a=><Board key={a.id} artifact={a} alt={typicalId+' P95 ร่องซีลและลำดับเปิดแบบ'}/>)}
  <div className="p37-actions">{files.map(a=><Download key={a.id} artifact={a} label={'ดาวน์โหลด P95 '+a.filename}/>)}</div>
 </section>;
}
