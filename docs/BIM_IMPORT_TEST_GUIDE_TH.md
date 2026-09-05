# คู่มือทดสอบนำ BIM จาก Revit เข้า Precast Engineering App

## 1. ไฟล์ตัวอย่างที่จัดเตรียมแล้ว

- `Precast_Module_Test.rvt` — ต้นฉบับแก้ไขได้ใน Autodesk Revit 2026.4
- `Precast_Module_Test.ifc` — ไฟล์แลกเปลี่ยนสำหรับอัปโหลดเข้าแอป
- `Precast_Module_Test.manifest.json` — ขนาดไฟล์ ค่า SHA-256 ขนาดโมเดล และจำนวน IFC entities ที่คาดหวัง

แอปปัจจุบันรับเฉพาะ `.ifc` และ `.pdf` ขนาดไม่เกิน 100 MB จึงต้องอัปโหลดไฟล์ IFC ไม่ใช่ RVT

## 2. ขอบเขตของโมเดลทดสอบ

โมเดลเป็นห้อง precast แบบเปิดด้านบน 1 ชั้น ใช้ทดสอบ geometry และ openings โดยมี:

- ขนาดภายใน 5,800 × 2,800 × 3,000 มม.
- ผนัง Generic 200 มม. จำนวน 4 ชิ้น
- พื้น Generic 300 มม. พื้นที่ 19.840 ตร.ม. ปริมาตร 5.952 ลบ.ม.
- ประตู 750 × 2,000 มม. จำนวน 1 บาน
- หน้าต่าง 600 × 900 มม. จำนวน 2 บาน ระดับธรณี 900 มม.

ไฟล์ IFC ส่งออกเป็น `IFC2X3 CoordinationView_V2.0` หน่วยมิลลิเมตร จาก Revit โดยตรง ผลตรวจข้อความ STEP พบ IFCWALL 4, IFCSLAB 1, IFCDOOR 1, IFCWINDOW 2 และ IFCOPENINGELEMENT 3 รายการ

## 3. เริ่มแอปในโหมด emulator

ใช้ PowerShell สามหน้าต่างจากโฟลเดอร์รากของ repository

หน้าต่างที่ 1:

```powershell
pnpm emulators
```

รอจนแสดง `All emulators ready!` แล้วในหน้าต่างที่ 2 รัน:

```powershell
pnpm emulators:seed
```

หน้าต่างที่ 3:

```powershell
$env:VITE_DATA_MODE='emulator'
pnpm dev
```

เปิด URL สำหรับ BIM Coordinator โดยตรง:

```text
http://localhost:5173/org/org-siam/projects/p-rama9/stages/g0?as=bim
```

บัญชี emulator ถูกเลือกจาก query string และไม่ใช้ credential ของระบบ production

## 4. ขั้นตอนอัปโหลด IFC

1. ตรวจว่าหัวหน้า workspace แสดง `G0` และส่วน `CONTROLLED BIM INTAKE`
2. กด `Upload IFC / PDF`
3. เลือก `Precast_Module_Test.ifc`
4. ตรวจ progress จนถึง `Upload 100% · quarantine enforced`
5. ตรวจว่าหัวข้อ revision เปลี่ยนจาก fixture `SRC-R02` เป็น revision ใหม่รูปแบบ `SRC-YYYY-MM-DD-XXXX`
6. ตรวจสถานะเบื้องต้นว่าเป็น `draft` / `quarantined` และมี blocker `Malware scan and BIM validation pending`

โค้ด intake ได้รับการปรับให้รองรับกรณี Windows/เบราว์เซอร์ส่ง MIME ของ `.ifc` เป็นค่าว่างหรือ `application/octet-stream` โดย normalize เป็น `application/x-step` เฉพาะเมื่อชื่อนามสกุลเป็น `.ifc` เท่านั้น การตรวจนามสกุล ขนาด และ Storage Rules ยังทำงานเหมือนเดิม

## 5. สิ่งที่ทดสอบได้ในเวอร์ชันนี้

ผลทดสอบจริงล่าสุด 2026-09-05: browser E2E อัปโหลดไฟล์ IFC ชุดนี้ผ่านหน้าเว็บใน local emulator สำเร็จ สร้าง revision ใหม่ คง quarantine และปฏิเสธการอ่าน binary ด้วย HTTP 403 ปุ่ม Submit ถูกปิด และ object/duplicate counts แสดง NOT CHECKED ดู [บันทึกผลจริง](pilot/BIM_INTAKE_QA.md) ผลนี้ยังไม่ใช่ Staging acceptance หรือผล parse geometry จากไฟล์จริง

| ระดับทดสอบ | ผลที่คาดหวัง |
| --- | --- |
| File acceptance | รับ `.ifc` ที่ชื่อถูกต้องและขนาดไม่เกิน 100 MB |
| Upload | อัปโหลดแบบ resumable ไปยัง project-scoped staging path |
| Security metadata | บันทึก uploader, organization, project และ `scanState=quarantined` |
| Read protection | ไฟล์ใน quarantine ถูกห้ามอ่านตาม Storage Rules |
| Revision UI | workspace ติดตาม revision ที่เพิ่งอัปโหลดแทนการค้างที่ fixture เดิม |
| Source integrity | เทียบ SHA-256 กับ manifest: `46012F90F9C7B056E0C5C25CFEB5037C8D18C35A2764F23C694166E6ED19AA77` |

## 6. ข้อจำกัดสำคัญของแอปปัจจุบัน

การอัปโหลดสำเร็จยังไม่เท่ากับการนำ geometry เข้า Product Model:

- ยังไม่มี production malware scanner
- ยังไม่มี IFC parser/validation worker ที่อ่าน entities และเขียนผลตรวจที่เชื่อถือได้
- ยังไม่มี IFC/GLB 3D viewer
- ค่า clean scan, object count, duplicate GlobalId และ validation ที่เห็นในข้อมูล seed เป็น deterministic fixture ไม่ใช่ผลจากไฟล์นี้
- revision ที่เพิ่งอัปโหลดจึงต้องอยู่ใน quarantine และยังไม่ควร Submit/Approve/Freeze จน worker เขียน `clean`, validation summary และ immutable snapshot hash

อย่าปรับสถานะใน Firestore ด้วยมือเพื่อให้ผ่าน G0 เพราะจะทำลายหลักฐานและความหมายของ server-authoritative workflow

## 7. ลำดับ G0 ที่ควรเป็นเมื่อมี worker แล้ว

1. BIM Coordinator อัปโหลด IFC
2. scanner ตรวจ malware และเปลี่ยนสถานะจาก quarantine เป็น clean ผ่าน administrative boundary
3. IFC worker อ่าน schema, units, coordinate system, levels, object identity, object count และ duplicate GlobalIds
4. worker สร้าง normalized validation result และ SHA-256 snapshot
5. BIM Coordinator กด `Submit source for review`
6. Structural Engineer คนละคนเปิด Approval Inbox ตรวจ exact snapshot แล้ว approve/return
7. Project Manager ตรวจ critical issues และกด `Freeze Gate G0`
8. source revision กลายเป็น accepted/locked; downstream revisions ต้องผูก source ID และ hash นี้

ทดสอบบทบาทใน emulator ด้วย `?as=bim`, `?as=engineer` และ `?as=pm` โดยต้องใช้คนละ identity เพื่อคง Separation of Duties

## 8. Checklist ตรวจ IFC ก่อนอัปโหลดงานจริง

ใน Revit:

- ใช้โมเดล unit มิลลิเมตรและบันทึก project units ให้ชัดเจน
- ยืนยัน Internal Origin, Project Base Point, Survey Point และ True North ตาม BIM Execution Plan
- ให้ Levels มีชื่อและ elevation ที่ไม่ซ้ำกัน
- ใช้ Revit categories จริง เช่น Wall, Floor, Door, Window แทน Generic Model เมื่อเป็นไปได้
- ตั้ง Mark/Type Mark และ IFC GUID ให้มีเสถียรภาพข้าม revision
- ตรวจว่าประตูและหน้าต่าง host กับผนังและสร้าง opening ถูกต้อง
- เปิด 3D view ตรวจชิ้นส่วนหลุดตำแหน่ง ระดับผิด และ geometry ซ้อน
- ส่งออก Base Quantities, IFC Common Property Sets และ Internal Revit Property Sets
- ปิด `Current view only` ถ้าต้องการโมเดลทั้งหมด
- ตรวจขนาดไฟล์ต่ำกว่า 100 MB และใช้ชื่อ ASCII ที่สื่อ revision

ค่าที่แนะนำสำหรับระบบปัจจุบันคือ IFC2x3 Coordination View 2.0 เพราะเข้ากับ contract และเครื่องมือตรวจที่วางไว้แล้ว หากจะย้ายไป IFC4 Reference View ควรเพิ่ม schema/version tests และประกาศ migration ก่อน

## 9. งานพัฒนาลำดับถัดไป

แนะนำทำตามลำดับนี้:

1. Worker รับ Storage finalize event แต่ไม่อนุญาต client เขียนผล `clean`
2. ตรวจ malware และบันทึก engine/version/signature timestamp
3. ใช้ IfcOpenShell หรือ parser ที่ pin เวอร์ชัน อ่าน IFC2X3/IFC4 และ validate STEP syntax
4. ตรวจหน่วย พิกัด ระดับ duplicate GlobalId bounding box จำนวน object และประเภทหลักเทียบ manifest
5. เก็บ raw IFC แบบ immutable พร้อม SHA-256; เก็บ validation report แยกจาก binary
6. แปลง geometry เป็น GLB/glTF สำหรับ web viewer และ map ทุก mesh กลับไปยัง IFC GlobalId
7. สร้าง neutral Product Model จากผล parse โดยไม่ให้ fixture ปลอมเป็นข้อมูลจริง
8. เพิ่ม browser E2E ที่อัปโหลดไฟล์นี้ ตรวจ quarantine → clean → review → approve → freeze โดยใช้ identity แยกกัน
9. เพิ่ม regression test ว่าประตู 1 หน้าต่าง 2 และ openings 3 ยังอยู่หลัง parse/transform/viewer
10. เพิ่ม privacy step สำหรับลบหรือแทนที่ author metadata จาก IFC ก่อนส่งออกนอกองค์กร หาก BIM Execution Plan กำหนด

## 10. ส่งออกใหม่หลังแก้โมเดล

เปิด `Precast_Module_Test.rvt` แล้วเลือกแท็บ `Precast Module` > `Export Test IFC` เครื่องมือจะส่งออก IFC2x3 ไปทับ `Precast_Module_Test.ifc` ใน repository นี้ จากนั้นต้องสร้าง SHA-256 และอัปเดต manifest ทุกครั้ง ไม่ควรใช้ hash เดิมหลังแก้โมเดล
