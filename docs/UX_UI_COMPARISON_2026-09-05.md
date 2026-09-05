# ผลตรวจ UX/UI เทียบแบบที่นำเสนอ — 5 กันยายน 2026

ผลประเมิน: **ตรงบางส่วน แต่ยังไม่ผ่านการตรวจรับความสอดคล้องกับ UX/UI ต้นแบบ** โดยเฉพาะพื้นที่ทำงานวิศวกรรม การนำทางภายในโครงการ และ interaction ของ Portfolio

## ขอบเขตและหลักฐาน

- เปิดแอปจริงที่ `http://localhost:5173/` ตรวจ Portfolio, Project Overview, G0, G2 และ G6 ของ Rama IX Modular Residence
- หน้าเว็บระบุ `Local fixture mode` ข้อค้นพบจากหน้าจอจึงเป็นผลของโหมดนี้ ไม่ใช่ผลทดสอบ Firebase Staging
- เปิด `ux-precast-web-app.html` ผ่าน local dev server ตรวจพื้นที่ Panelization, BOQ และ Team ในต้นแบบ โดยไม่มีการบันทึกสิทธิ์หรือข้อมูลโครงการ
- อ่าน `knowledge/UX_UI_KNOWLEDGE.md` และ `knowledge/BUILD_STARTER_GUIDE.md` ซึ่งระบุชัดว่าให้ใช้ HTML ต้นแบบเป็น visual reference และมี responsive inspector
- อ่านโค้ด AppShell, Portfolio, StageWorkspace, routes และ style tokens; HEAD ขณะตรวจคือ `65ea287` มีงานอื่นกำลังแก้ working tree จึงเป็นผลตรวจ ณ เวลานี้
- ไม่แก้โค้ดแอป ไม่เปลี่ยนโหมด ไม่รันการอนุมัติหรือ Release และไม่ได้ทดสอบ engineering calculations, security enforcement หรือ mobile accessibility ครบวงจร

## ตารางเปรียบเทียบ

| ประเด็น | แบบเดิม/ข้อกำหนด | สิ่งที่พบปัจจุบัน | ผล |
| --- | --- | --- | --- |
| Visual identity | PRECAST STUDIO, accent สีส้ม `#f26a2e`, sidebar เทาเข้ม | PRECAST ENGINEERING, accent เขียว `#0b7a68`, sidebar เขียวเข้ม | เปลี่ยนจากต้นแบบ แม้ยังอยู่ในแนว industrial UI |
| ภาษา | หัวข้อและขั้นตอนหลักภาษาไทยร่วมกับศัพท์วิศวกรรมอังกฤษ | หน้าหลักและข้อความ workflow เป็นอังกฤษเกือบทั้งหมด | ต่างจากประสบการณ์เดิม |
| Portfolio | รายการโครงการ, gate, revision, ผู้รับผิดชอบ, due date, issue | มีโครงสร้างข้อมูลและการเปิดโครงการ | ตรงบางส่วน |
| ค้นหา/กรอง | ค้นหาโครงการและกรองสถานะ/ผู้รับผิดชอบ | พิมพ์ Rayong แล้วยังมีทั้งสามโครงการ; search/select ไม่มี handler กรองในโค้ด; ไม่มี assignee filter | ไม่ผ่าน interaction |
| KPI | ต้องสอดคล้อง gate จริงและนำไปสู่งานได้ | Critical issues = 7 และ Ready for release = 3 กำหนดตายตัว; issue ในแถวที่แสดงรวมเป็น 5; workload อ้าง fixture | เสี่ยงให้ผู้ใช้ตีความสถานะผิด |
| Project navigation | ขั้นตอนงานมีชื่อและสถานะอยู่ใน rail; ข้อกำหนดมี 10 ขั้นตอนธุรกิจ | Overview มี G0–G7; หน้าขั้นตอนมีลิงก์ G0–G7 ท้ายการ์ด ส่วน sidebar ยังคงเป็นองค์กรและรายชื่อโครงการ | Gate model มีแล้ว แต่การนำทางไม่เหมือนแบบ |
| Revision context | เห็น Source/Design Basis/Model/Calculation | มีแถบ revision ในหน้าโครงการและขั้นตอนที่ตรวจ | ตรงในระดับโครงสร้าง; ไม่ยืนยันความถูกต้องของข้อมูล live |
| Panelization | โมเดลเป็นพื้นที่หลัก มี 3D/Plan toolbar และ inspector ของชิ้นงานที่เลือก | G2 ใน fixture แสดงเพียงคำอธิบาย; โค้ด emulator มีปุ่ม panel แบบ CSS และ register สรุปโมเดล | ยังไม่เทียบเท่า workspace ที่นำเสนอ |
| BIM/Report/Drawing | Upload/preview, report page preview, drawing/export center | G0/G6 ใน fixture แสดงคำอธิบาย; โค้ดเพิ่มเติมถูกจำกัดให้ emulator และต้องมี artifact/context | โหมดปัจจุบันไม่แสดง workflow เต็ม |
| Libraries/Settings | มีพื้นที่จัดการ library และ settings | Route ยังเป็น Placeholder | ยังไม่ครบ |
| ข้อความหน้าจอ | ชื่อกิจกรรมและสถานะที่ผู้ใช้ใช้ตัดสินใจ | มีชื่ออย่าง M2 controlled workflow, M3 controlled workflow, M7 documentation controls | แสดง milestone การพัฒนาปะปนกับงานของผู้ใช้ |

หมายเหตุ: จำนวนขั้นตอนธุรกิจไม่จำเป็นต้องเท่าจำนวน Gate — ไม่ควรเพิ่ม Gate เพื่อให้เท่ากับ 10 ขั้นตอน แต่ควรทำเมนูกิจกรรมให้เข้าใจง่ายและแสดง mapping ไป G0–G7 อย่างชัดเจน

## สาเหตุที่แยกได้จากหลักฐาน

1. **โหมดที่เปิดอยู่:** `StageWorkspace.tsx:62` ไม่โหลด artifact เมื่อไม่ใช่ emulator และส่วนงาน G0–G7 มีเงื่อนไข `mode === 'emulator'` จึงเหลือการ์ดอธิบายท้ายหน้า (`:284`) ใน fixture mode
2. **งาน UI ยังไม่ครบแบบ:** แม้ดู branch emulator ในโค้ด G2 (`:198–210`) ก็ยังเป็น panel buttons/register ไม่ใช่ viewer พร้อม inspector แบบต้นฉบับ การเปลี่ยนโหมดอย่างเดียวจึงไม่ทำให้หน้าตาตรงทั้งหมด
3. **ข้อมูลจำลองยังอยู่ในส่วนกลาง:** `Portfolio.tsx:74–85` มี metrics ตายตัวและ controls ที่ไม่เชื่อม state; `AppShell.tsx` ยังอ้างรายการโครงการจาก fixture
4. **เส้นทางโครงการจริงยังมีช่องว่าง:** StageWorkspace หา project จาก fixture (`:48`) และคืน null ถ้าหาไม่เจอ (`:109`); เป็นความเสี่ยงจาก static inspection ไม่ใช่ผลทดลองสร้างโครงการใหม่
5. `docs/M9_HANDOFF.md` ระบุเองว่า dynamic cloud artifact selection และ full Staging workflow UI ยังต้องพัฒนาก่อน live Pilot walkthrough

## ลำดับแก้ไขและเกณฑ์ตรวจรับที่เสนอ

| ลำดับ | งาน | เกณฑ์ตรวจรับ |
| --- | --- | --- |
| 1 | แก้ข้อมูลและ controls ใน Portfolio | Search/filter เปลี่ยนรายการจริง; KPI คำนวณจาก records ชุดเดียวกับตารางและเงื่อนไข Gate; ระบุ demo/unavailable ชัดเจน |
| 2 | ทำให้ทุกโหมดแสดงขอบเขตความสามารถชัด | ไม่มีการ์ดว่างที่ดูเหมือนหน้าพร้อมใช้งาน; บอกเหตุผลและขั้นตอนถัดไปเมื่อยังไม่มีข้อมูลหรือไม่มีสิทธิ์; โครงการใหม่เปิดตาม ID จริงได้ |
| 3 | คืน Project workspace ตามต้นแบบ | Stage rail มีชื่อกิจกรรมและสถานะ; revision context คงอยู่; viewer อยู่กลาง; inspector เปลี่ยนตามชิ้นงาน; status/job summary มีตำแหน่งชัด |
| 4 | เชื่อมการเลือกโมเดลกับงานแต่ละหน้า | เลือก panel แล้ว properties/BOQ/drawing เชื่อมชิ้นงานเดียวกัน; ทดสอบ BIM → panel → BOQ → drawing โดยไม่ใช้สถานะผ่านสมมติ |
| 5 | ปรับ visual identity และข้อความ | ใช้ baseline ต้นแบบสีส้ม/ไทย–อังกฤษ เว้นแต่มีการตัดสินใจเปลี่ยนแบบที่บันทึกไว้; ใช้ชื่อกิจกรรมแทนชื่อ M ในหน้าผู้ใช้ |
| 6 | ตรวจรับ UX แยกจาก build/tests | เปรียบเทียบภาพที่ desktop 1280px ขึ้นไปและ tablet review; ตรวจ keyboard/focus, empty/loading/error และ disabled reason; ไม่ถือว่า build ผ่านเท่ากับ UI ตรงแบบ |

ข้อสรุปสำหรับการตัดสินใจ: มีฐาน Portfolio, Gate และ Revision แล้ว แต่ยังมีช่องว่างทั้งด้านหน้าตาและการใช้งาน การปิด milestone ด้านระบบไม่ใช่หลักฐานว่า UX/UI ตรงต้นแบบแล้ว
