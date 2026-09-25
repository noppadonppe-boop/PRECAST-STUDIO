# P101 — แผนดำเนินงานขั้นที่ 6: Revit 2026 ครบ 48 แบบ

วันที่จัดทำ: 18 กันยายน 2026  
สถานะ: `STAGE6_PLAN_COMPLETE_AWAITING_EXECUTION_AUTHORIZATION`  
ฐานอ้างอิงล่าสุด: P35 Typical 44 รายการ, P36 ผลิตภัณฑ์ 48 แบบ, P100 ปิดขั้นที่ 5

## 1. เป้าหมายและขอบเขต

ขั้นที่ 6 จะสร้างโมเดล BIM ของผลิตภัณฑ์ I/L/U ครบ 48 รหัสด้วย Autodesk Revit 2026 โดยใช้มิติและบัญชีชิ้นส่วนจาก P36 เป็นฐาน และใช้ Typical P35/P100 เพื่อรักษา Tag และความสัมพันธ์ของ Segment

งานส่งมอบเป็น **แบบพัฒนาและประสานงาน BIM** ไม่ใช่แบบคำนวณโครงสร้าง แบบผลิตแม่แบบ หรือแบบอนุมัติก่อสร้าง ค่าความหนาและรูปทรงที่ใช้ยังอยู่ภายใต้ `engineeringApproved=false` และ `productionReleased=false`

งาน Production Engineering ที่แยกออกจากขั้นที่ 5 ยังคงแยกจากขั้นนี้:

- `PE-01` รายละเอียดตัด/รู/เกลียว/เชื่อม/ซีล/BOM ระดับผลิต
- `PE-02` ตรวจรับกำลังจุดต่อ ค้ำ ฐาน พุก และเสถียรภาพ
- `PE-03` ระบบยกแม่แบบ/พลิก/Rigging/แรงลงพื้นส่วนที่ยังไม่ปิด

ขั้นที่ 6 จะแสดงได้เฉพาะตำแหน่งอ้างอิง ช่องสำรอง แนวเหล็กและโซนยกเชิงประสานงานตาม Knowledge เดิม โดยไม่ระบุว่าผ่านกำลัง

## 2. แนวทางสร้างโมเดลที่เลือก

ใช้แนวทาง **Hybrid Native Revit**:

1. Segment มาตรฐานที่ใช้ซ้ำสร้างเป็น Shared/Loadable Family และ Family Type พร้อม Shared Parameters
2. ผนัง พื้น หลังคา ห้อง Views, Sheets, Dimensions และ Schedules ใช้องค์ประกอบ Revit จริงเมื่อรูปทรงรองรับ
3. รูปทรงโหนด/ชิ้นเปลี่ยนระดับที่ซับซ้อนและยังไม่เหมาะกับ Family เต็มรูปแบบ อนุญาตให้ใช้ categorized DirectShape ที่ผูก `SegmentTag`, `GeometryRevisionId` และสถานะข้อจำกัดครบถ้วน
4. ไม่สร้าง 48 แบบด้วยการเขียนรูปซ้ำด้วยมือ แต่ใช้ตัวสร้างโมเดลอ่าน P36 `model.json` แล้วประกอบจากคลัง Segment เดียวกัน
5. DirectShape ทุกชิ้นต้องถูกระบุใน QA และ README; ห้ามอ้างว่าแก้พารามิเตอร์ได้เหมือน Family

ตัวอย่าง Cafe, Senior Home และ Modular Office ใช้เป็นต้นแบบ **รูปแบบแพ็กเกจ การสร้าง Sheet และ Native QA เท่านั้น** ไม่คัดลอกมิติ วัสดุ รายละเอียด หรือ geometry มาใช้กับผลิตภัณฑ์ชุดนี้

## 3. มาตรฐานข้อมูล BIM

### 3.1 Shared Parameters ขั้นต่ำ

- `PM_ProductId`
- `PM_PlanType` = I/L/U
- `PM_ProfileFamily` = A/B/C/D
- `PM_UseGroup` = 1/2/3/4
- `PM_SegmentTag`
- `PM_SegmentRevision`
- `PM_GeometryRevisionId`
- `PM_InstanceId`
- `PM_ModuleId`
- `PM_Package` = MOD/ARC/SITE
- `PM_ConcreteVolumeM3`
- `PM_ConcreteMassKg`
- `PM_Status`
- `PM_EngineeringApproved`
- `PM_ProductionReleased`
- `PM_LiftingZoneStatus`
- `PM_SourcePath`

### 3.2 พิกัดและหน่วย

- หน่วยหลัก: มิลลิเมตร
- Datum ความสูง: ใต้พื้นถึงผิวโครงสร้างหลังคาสูงสุด
- กริดผลิตภัณฑ์: 1,500 มม.
- Origin และทิศ +Y ต้องตรงกับ P36; ไม่ตีความเป็นทิศเหนือของ Site
- ความสูงรวมเป้าหมายไม่เกิน 3,000 มม. ตามข้อมูล P36/P35 ที่ล็อกไว้

### 3.3 ระดับรายละเอียด

- ระดับแบบ: Development / Coordination BIM
- รูปทรงคอนกรีต ช่องเปิด Joint Gap และ Tag ต้องตรวจได้
- Fit-out เป็น Concept Geometry ตามกลุ่มใช้งาน ไม่ใช่ Full MEP หรือ Interior Construction Model
- เหล็กเสริมแสดงเป็นแนวคิด/พื้นที่สำรองเท่านั้น ไม่มีขนาดและจำนวนเหล็กจนกว่าจะผ่านขั้นที่ 7–8

## 4. โครงสร้างไฟล์และการตั้งชื่อ

โฟลเดอร์เป้าหมาย:

`deliverables/PM_Revit_48_P6/<ProductId>/`

ตัวอย่างรหัสนำร่อง `PM-I-C1`:

- `PM-I-C1_R2026_P01.rvt`
- `PM-I-C1_A1_Drawings_P01.pdf`
- `PM-I-C1_3D_Exterior_P01.png`
- `PM-I-C1_3D_Segments_P01.png`
- `PM-I-C1_Plan_P01.png`
- `PM-I-C1_Section_P01.png`
- `PM-I-C1_SegmentSchedule_P01.csv`
- `PM-I-C1_QA_P01.json`
- `README_TH.md`
- `PM-I-C1_R2026_P01.zip`

ไฟล์ส่วนกลาง:

- Revit 2026 project template สำหรับ 48 ผลิตภัณฑ์
- Shared Parameter file
- PPE Engineering A1 title block
- Typical Segment Family Library/Type Catalogue
- Build/export scripts, schema และ validation report

ไฟล์สำรองอัตโนมัติ `.0001.rvt` เป็นต้นไม่ถือเป็นหนึ่งใน 48 ไฟล์ส่งมอบ

## 5. ชุด Sheet ขั้นต่ำต่อผลิตภัณฑ์

PDF A1 หนึ่งชุดต่อรหัส มีอย่างน้อย 7 แผ่น:

1. `A001` ปก สถานะ Revision และข้อจำกัด
2. `A101` Floor/Segment Layout พร้อมมิติหลัก
3. `A102` Roof/Segment Layout และแนวรอยต่อ
4. `A201` รูปด้านหลัก
5. `A301` รูปตัดและระดับใช้งาน
6. `A401` 3D/Exploded Segment Coordination
7. `A601` Segment Schedule, ปริมาตร, น้ำหนัก และสถานะไฟล์

ภาพ PNG ต้องส่งออกจาก View/Sheet ของโมเดล Revit จริง ไม่ใช้ภาพสร้างใหม่แทนหลักฐานโมเดล

## 6. ลำดับดำเนินงาน 10 Checkpoints

| ลำดับ | งาน | น้ำหนักความก้าวหน้า | เกณฑ์ผ่าน |
|---:|---|---:|---|
| 6.1 | Freeze input manifest | 5% | ครบ 48 Product ID, P36 hash, P35 Typical mapping และ release blocks |
| 6.2 | BIM standard/template | 10% | Shared Parameters, naming, materials placeholder, levels/grids, title block และ sheet templates ผ่านตรวจ |
| 6.3 | Typical Segment library | 15% | Tag/Type ที่ใช้งานจริงครบตาม Typical index; ระบุ Family/DirectShape strategy และ dependency |
| 6.4 | Generator + validator | 10% | อ่าน P36 model.json, สร้าง model/schedule/QA ได้ซ้ำและตรวจ schema ผ่าน |
| 6.5 | Pilot `PM-I-C1` | 10% | RVT เปิดด้วย Revit 2026, geometry/schedule/sheets/export ผ่านทุกข้อ |
| 6.6 | กลุ่ม Type I 16 แบบ | 10% | 16/16 package ผ่าน Native QA |
| 6.7 | กลุ่ม Type L 16 แบบ | 12.5% | 16/16 package ผ่าน Native QA และผนังขอบร่วม/โหนดตรง P36 |
| 6.8 | กลุ่ม Type U 16 แบบ | 12.5% | 16/16 package ผ่าน Native QA และผนังขอบร่วม/โหนดตรง P36 |
| 6.9 | Batch native QA + archive | 10% | 48/48 เปิด–บันทึก–ส่งออกจริง, hash/ZIP/manifest ครบ |
| 6.10 | Website integration + closure | 5% | เว็บลงทะเบียนไฟล์/สถานะครบ 48 แบบ, ลิงก์ผ่าน และจัดทำ Stage 6 closure |

เมื่อได้รับอนุญาตเริ่มขั้นที่ 6 จะทำต่อเนื่องผ่าน Pilot และทั้ง 48 แบบจน 100% โดยไม่หยุดขออนุมัติทุก batch เว้นแต่พบความขัดแย้งของ geometry ที่เปลี่ยนผลลัพธ์อย่างมีนัยสำคัญ

## 7. เกณฑ์ตรวจรับ 100%

ขั้นที่ 6 ปิดได้เมื่อผ่านครบทั้งหมด:

- มี RVT หลักไม่ซ้ำ 48 ไฟล์ ตรงรหัส I/L/U × A/B/C/D × กลุ่ม 1–4
- เปิด บันทึก และส่งออกด้วย Autodesk Revit 2026 จริงครบ 48/48
- ไม่มี Missing Link/Family ที่ทำให้โมเดลเปิดหรือส่งออกไม่ได้
- Segment instance count, Tag, ช่องเปิด และ Product ID ตรง P36 ทุกแบบ
- มิติหลักคลาดจาก P36 ไม่เกิน 1 มม.; ปริมาตร/น้ำหนักต่างไม่เกิน 1% หรือมี Exception ที่อธิบายได้ใน QA
- PDF A1, PNG จากโมเดลจริง, CSV Schedule, QA JSON, README และ ZIP ครบ 48 ชุด
- Revit warning ที่มีผลต่อ geometry ต้องเป็นศูนย์; warning อื่นต้องบันทึกและไม่ทำให้ส่งออกผิด
- Hash, ขนาดไฟล์, Revit version, Geometry Revision และ dependencies อยู่ใน manifest
- เว็บไซต์แสดงสถานะไฟล์และดาวน์โหลดครบ โดยยัง Local-first และไม่ต้องมี Firebase
- ทุกไฟล์แสดง `engineeringApproved=false` และ `productionReleased=false`
- ไม่สร้างหรืออ้างผล STAAD/RC Design ในขั้นนี้

## 8. การควบคุมเวลาและความเสี่ยง

วิธีลดเวลาและข้อผิดพลาด:

- สร้าง Family/Type ครั้งเดียว แล้ว reuse ในทุกผลิตภัณฑ์
- สร้าง 48 โมเดลจาก manifest เดียว ไม่คัดลอกและแก้ด้วยมือ
- ตรวจ Pilot I-C1 ให้ผ่านทั้งสายงานก่อน batch 47 แบบที่เหลือ
- รัน QA เป็นกลุ่ม I, L, U และบันทึก failure รายไฟล์เพื่อ rerun เฉพาะรายการ
- ส่งออก PDF/PNG/CSV/QA จาก Revit ในรอบเดียวต่อผลิตภัณฑ์

ความเสี่ยงหลักคือ geometry โค้ง/โหนดที่ Family ปรับไม่ได้, API export/print, annotation overlap และ file size การแก้ให้ใช้ DirectShape เฉพาะจุด, deterministic view crop, sheet layout template และตรวจไฟล์จริงทุก batch

## 9. สถานะหลังการวางแผน

- ขั้นที่ 5/8: ปิด 100% ตาม P100
- แผนขั้นที่ 6: จัดทำครบ 100%
- การผลิตผลงานขั้นที่ 6: 0% / ยังไม่เริ่ม
- ขั้นที่ 7 STAAD/วสท.: ยังไม่เริ่มและไม่อยู่ในอำนาจของแผนนี้

คำสั่งเริ่มที่แนะนำ: **“อนุมัติเริ่มขั้นที่ 6 ตาม P101 ให้ดำเนินการจน 100%”**
