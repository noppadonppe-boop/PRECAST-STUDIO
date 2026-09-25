import {Board,Download,type Artifact} from './CurrentCatalogue';

export function CastingLiftPanel({files,typicalId}:{files:Artifact[];typicalId:string}){
 if(!files.length)return null;
 return <section className="p37-sheet">
  <h3>P91 — แผนยกครอบในท่าหล่อ P56</h3>
  <p>ปรับตำแหน่งยกและแนวเหล็กให้ตรงท่าหล่อปัจจุบันแล้ว น้ำหนักและรูปทรง Typical คงเดิม ไม่ใช้พิกัด P52 เดิมตรง ๆ</p>
  <p>แนวเหล็กไม่ระบุขนาด สมมติกำลังคอนกรีตเพียงพอเพื่อพัฒนาตามที่ตกลง คำนวณสมดุลแรงยกอิสระแนวดิ่งใหม่จาก CG ไม่แบ่งแรงเท่ากันทุกขา</p>
  <Board artifact={files.find(f=>f.filename.endsWith('.png'))??null} alt={typicalId+' แผนยกในท่าหล่อ P56 — P91'}/>
  <div className="p37-actions">{files.map(f=><Download key={f.id} artifact={f} label={'ดาวน์โหลด P91 '+f.filename}/>)}</div>
  <p className="cat-notice legacy">เส้นคานยกเป็นผัง ไม่ใช่หน้าตัดคานหรืออุปกรณ์ที่ตรวจแล้ว โซนยกไม่ใช่พิกัดเจาะพุก ตรวจทางถอนจากฐานเฉพาะ300มม.หลังปลดแบบหมด ไม่ครอบคลุมแรงดูดติด การพลิก หรือยกแม่แบบเหล็ก</p>
 </section>;
}
