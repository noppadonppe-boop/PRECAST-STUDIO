# รับแบบ BIM บนเว็บ

หน้า G0 ของ shared workspace มีตัวรับ IFC / RVT แทนโมเดลตัวอย่างเดิม

## IFC
1. กดนำเข้า IFC เลือกไฟล์ไม่เกิน 100 MB
2. ตัวอ่าน web-ifc ทำงานใน Web Worker (จำกัดเวลา 2 นาทีและ geometry 256 MB)
3. แสดง schema, จำนวน IfcElement, GlobalId ซ้ำ/ขาด, หน่วย SI ที่พบ, ชั้นอาคาร และ geometry จริง
4. ดู 3D / แปลน หมุน ซูม คลิกหรือเลือกชิ้นงานเพื่อดูชื่อ ชนิด และ GlobalId
5. ใน shared mode อัปโหลดต้นฉบับลง Storage และบันทึก SHA-256/Revision ลงทะเบียน Firebase
6. เปิดโมเดลเดิมจากทะเบียนได้โดยผู้อัปโหลด ระบบตรวจ SHA-256 ก่อนอ่านใหม่

### เลือกชิ้นส่วนและคุณสมบัติ
- คลิกโมเดลหรือปุ่มรายการชิ้นงานด้านล่าง สีส้มแสดงชิ้นที่เลือก และแผงคุณสมบัติด้านขวาเปลี่ยนตาม
- ค้นหาชื่อ ชนิด Express ID หรือ GlobalId; รายการแสดงสูงสุด 200 รายการต่อคำค้นเพื่อไม่ให้หน้าจอหนัก
- ปุ่ม 3D / Plan, ย่อ/ขยาย/พอดีหน้าจอ, ซ่อน/แสดงคุณสมบัติ และเฉพาะชิ้นที่เลือก
- การเลือกคงมุมกล้องเดิม; การลากหมุนไม่เปลี่ยนชิ้นงานที่เลือก
- ขนาดที่รายงานเป็นกรอบครอบตามแกนโมเดล (mm) ไม่ใช่ค่าความหนา/ขนาดผลิตที่รับรอง ข้อมูล IFC อ่านอย่างเดียว
- รายการเลือกและ raycast กรองเฉพาะพรีคาสท์ที่มี geometry; ประตู หน้าต่าง ช่องเปิด และงานประกอบไม่สามารถเลือกได้

### ตัวกรองพรีคาสท์
- อ่าน property sets ทั้ง instance และ type: `IsPrecast` / `Precast` เป็น true หรือ `ConstructionMethod`, `ProductionMethod`, `FabricationMethod`, `CastingMethod` ระบุ Precast
- จำกัดประเภทโครงสร้าง เช่น ผนัง พื้น คาน เสา บันได ฐานราก; Proxy ต้องมีข้อมูลยืนยันพรีคาสท์ ไม่ใช้ชื่อวัสดุคอนกรีตหรือชื่อไฟล์เป็นหลักฐานยืนยัน
- false, cast-in-situ หรือข้อมูลขัดแย้งถูกตัดออก
- ผนัง/พื้น ฯลฯ ที่ไม่มีข้อมูลยืนยันอยู่ในรายการรอยืนยัน ผู้ใช้ยืนยันทีละชิ้นได้และถอนการยืนยันได้ ใช้เฉพาะการเปิดโมเดลครั้งนี้ ไม่บันทึกเป็นผลอนุมัติหรือส่งต่อ FEM
- ต้องระบุคุณสมบัติใน Revit/IFC เพื่อคงการจัดประเภทเมื่อเปิดใหม่
- เปิดส่วนอื่นจาง ๆ เป็นแบบอ้างอิงได้ แต่ raycast และรายการยังเลือกได้เฉพาะพรีคาสท์
- หากไม่มีชิ้นที่ยืนยันเป็นพรีคาสท์ แสดงโมเดลต้นฉบับเต็มความชัดโดยอัตโนมัติและป้องกันการซ่อนทั้งหมด หมุน/ซูมได้ทันที แต่ยังไม่เปลี่ยนเป็นชิ้นงานสำหรับคำนวณ; regression ทดสอบภาพไม่ว่างก่อนยืนยันรายการ
- เมาส์ซ้ายลากหมุน ขวาลากเลื่อน ล้อเมาส์ซูม; browser regression ตรวจการเปลี่ยนภาพที่เรนเดอร์จริงและไม่เลื่อนหน้าแทนซูม
- การจัดประเภทนี้ยังไม่ยืนยัน analytical model, materials, supports, mesh หรือ design checks สำหรับ FEM/Precast design

หาก Storage หรือการบันทึกทะเบียนล้มเหลว หน้าจอแจ้งว่ายังไม่ยืนยันการบันทึก โมเดลที่แสดงเป็น local preview เท่านั้น ไม่แสดงความสำเร็จแทนข้อผิดพลาด

## Revit ในเครื่อง
1. แนบ `.rvt` เป็นต้นฉบับ สถานะรอ IFC (ตรวจส่วนหัวเบื้องต้น ไม่ได้เปิด/ตรวจเนื้อหา RVT)
2. เปิดต้นฉบับนั้นด้วย Revit รุ่นที่รองรับ และส่งออกผ่าน File > Export > IFC
3. หรือใช้ pyRevit: ดาวน์โหลด `/revit/PrecastBimExport.zip` จากหน้าเว็บ แตกไฟล์และเพิ่มโฟลเดอร์แม่ของ `PrecastBimExport.extension` ใน pyRevit extension search paths แล้ว Reload
4. ปุ่ม `Precast BIM > Export > Export BIM for Web` ส่งออก active project เป็น IFC2x3 ลงโฟลเดอร์ที่เลือก ชื่อมี timestamp ไม่บันทึกหรือแก้ต้นฉบับ RVT
5. หากมี unsaved edits ต้องบันทึก RVT สำเนาที่ตรงกันแยกต่างหากก่อนแนบต้นฉบับ
6. กลับหน้าเว็บ เลือก RVT รุ่นที่ตรงกัน แล้วนำเข้า IFC ระบบเก็บ parentRvtId ตามผู้ใช้ยืนยัน ไม่ได้อ้างว่าตรวจพิสูจน์ว่า IFC มาจาก RVT นั้น

ไม่มีการเรียก Revit จากเบราว์เซอร์หรือแปลง RVT อัตโนมัติ และไม่มีการส่งไฟล์ไป Autodesk APS

## ขอบเขตและการเปิดใช้
- การอ่านในเบราว์เซอร์ไม่ใช่ malware scan หรือผลตรวจที่มีอำนาจอนุมัติ ไม่มีการเปลี่ยน G0 เป็น accepted/clean หรือข้าม controlled workflow
- ยังไม่แทนโมเดล FEM/BOQ downstream อัตโนมัติ
- หน่วยที่รายงานคือ SI unit declarations ที่พบ ไม่ใช่การรับรอง unit assignment ทั้งโครงการ พิกัดและ geometry completeness ต้องตรวจกับต้นฉบับ
- ไฟล์เป็น private original ของผู้อัปโหลด ส่วนทะเบียนยังใช้ shared access เดิม หาก anonymous identity ถูกล้าง ผู้นั้นจะเปิดต้นฉบับเดิมไม่ได้ ต้องใช้บัญชีถาวรสำหรับงานต่อเนื่อง
- Deploy hosting build พร้อม `firebase/shared.firebase.json` สำหรับ shared Firestore/Storage rules ใน Firebase project ของ shared workspace เท่านั้น ห้ามใช้ shared rules แทน controlled production rules
- ต้องมี Storage bucket และ web config ที่ถูกต้อง รวมถึง CORS สำหรับ origin ของเว็บเพื่อเปิดไฟล์ด้วย Firebase getBytes
- pyRevit exporter ต้องตรวจใช้งานกับ Revit จริงก่อนยืนยัน native integration; unit/browser tests ไม่แทนการทดสอบ Revit

อ้างอิง: https://thatopen.github.io/engine_web-ifc/docs/classes/web-ifc.IfcAPI.html

## ผลตรวจ 2026-09-07
- เผยแพร่ Hosting ที่ https://precast-studio.web.app และ Storage rules ใน bucket ใหม่ `precast-studio.firebasestorage.app` ภูมิภาค asia-southeast1 แล้ว; ไม่ได้เปลี่ยน Firestore rules เดิม
- ทดสอบ web-ifc กับ `Precast_Module_Test.ifc` ในเครื่อง: IFC2X3, 17 IfcElements (รวมช่องเปิดและ proxy), ผนัง 4 พื้น 1, 3,780 triangles, ไม่พบ GlobalId ซ้ำ/ขาด, หน่วย MILLIMETRE, ชั้น L1/L2
- Browser ทดสอบไฟล์จริงในเครื่อง: Worker/WASM, 3D/แปลน, เลือกชิ้นงาน, desktop/mobile ผ่าน
- Storage Emulator: อัปโหลด IFC/RVT, อ่านเฉพาะเจ้าของ, ปฏิเสธอ่านข้ามผู้ใช้/ไม่ลงชื่อเข้าใช้, ปฏิเสธเขียนทับ/เปลี่ยนสถานะ ผ่าน
- เว็บจริง: ใช้ `e2e/fixtures/synthetic-bim.ifc` ที่สร้างใหม่ ไม่มีข้อมูลลูกค้า ทดสอบอัปโหลด บันทึกทะเบียน รีเฟรช เปิดใหม่ ตรวจ SHA-256 และแสดง geometry ผ่าน
- ลบเฉพาะไฟล์สังเคราะห์และทะเบียน/โครงการ QA หลังตรวจเรียบร้อย เก็บ audit entries และหลักฐานใน `output/bim-intake`
- ไม่ได้อัปโหลด RVT/IFC ภายในโครงการเพื่อทดสอบบนคลาวด์ และยังไม่ได้รันปุ่ม pyRevit กับ Revit จริง
