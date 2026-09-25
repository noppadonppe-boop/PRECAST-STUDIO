# เว็บไซต์คลังภายใน — ข้อกำหนด Step1 R01

## ขอบเขต

เว็บไซต์แคตตาล็อกที่มีภาพเป็นหลัก แยกการใช้งาน4กลุ่ม × รูปทรง4ครอบครัว × แปลน3ชนิด รวม48ช่องรายการ
ใช้ [product_matrix.json](product_matrix.json) เป็นทะเบียนช่องรายการตั้งต้น ไม่ใช่production BOM
TS-A/B/C/Dเป็นคลังกลางร่วมกัน; แยกชนิดย่อย/ช่องเปิด/ความหนา/เหล็ก/จุดต่อด้วยreference ไม่คัดลอกข้อมูลtechnicalซ้ำ48ชุด

## UX เป้าหมาย

- หน้าแรก4กลุ่มใหญ่พร้อมภาพ; filterกลุ่ม/รูปทรง/แปลน/สถานะ; ค้นTagและชื่อไทย/อังกฤษ
- การ์ดแสดงcode,ภาพ,พื้นที่ตามกรอบโมดูล,สถานะconcept/analysis/design, revision
- หน้ารายละเอียดมี tabs: Overview / Drawings / Segments / Engineering / Fabrication / BIM / History
- เปิดภาพเต็มความละเอียดและดูรูปแปลน–รูปตัดโดยไม่ตัดขอบข้อมูล; thumbnailไม่ใช่แหล่งมิติ
- เปรียบเทียบI/L/Uภายในfamily/useเดียวกันได้; legendสถานะต้องเด่นกว่าเพียงสี
- พื้นหลังเรียบ อ่านง่าย ภาพใหญ่ ลำดับเนื้อหาชัด และรองรับคีย์บอร์ด/จอขนาดต่างกัน
- ช่องที่ยังไม่มีผลจริงแสดงNOT_STARTED ไม่สร้างตัวเลข/heatmapจำลองให้ดูเหมือนมีผลแล้ว

## ภาพ Type I และการย้ายมาตรฐาน

48ช่องรายการไม่เท่ากับ48แบบผลิตพร้อมแล้ว
ภาพIเดิมช่วง2ม.สามารถใช้เป็นภาพconceptอ้างอิงชั่วคราวโดยติดbadge LEGACY20 / NOT STD15 GEOMETRY
ห้ามเปลี่ยนcaptionภาพเดิมให้บอกว่าช่วง1.5ม. หรือแสดงในช่องproduction previewโดยไม่เตือน
สร้างrevisionภาพ/CADมาตรฐานI-STD15ใหม่ในงานที่ได้รับมอบหมายภายหลัง เก็บlegacyไว้ในHistory
L/UมีภาพR00บนฐานช่วง1.5ม. แต่ยังเป็นconceptและมีIMAGE_QA; ไม่ถือเป็นshop drawing
product_idเป็นช่องรายการถาวร ส่วนimage/artifact/design revisionแยกกัน จึงไม่ต้องสร้าง96สินค้าเมื่อมีรุ่นเก่า/ใหม่

## สิทธิ์และการเปิดสาธารณะ

รอบแรก INTERNAL_TEAM; public_catalog_enabled=false
ใช้โครงสร้างแอปและ [Role/Permissionเดิม](../ROLE_PERMISSION_KNOWLEDGE.md) เป็นบริบท ไม่เปลี่ยนแอป/roleโดยไม่ตรวจของจริง
การloginอย่างเดียวไม่พอ ต้องตรวจสิทธิ์org/project/artifactที่backendและfile storageตามงาน
ภาพและไฟล์privateต้องไม่อยู่ในstatic public folder หรือpublic download URL; การซ่อนปุ่มไม่ใช่security
source code PDF,รายงานคำนวณ,analysis model,แบบผลิต,ราคาและข้อมูลภายในไม่ถูกส่งไปanonymous client
อนาคต public catalogueต้องมีpublication recordต่อartifact,สิทธิ์เผยแพร่,ผู้อนุมัติและpreview whitelist; ไม่ใช้switchที่เผยทั้งfolder
ชื่อไฟล์ “อนุญาติแล้ว” หมายถึงผู้ใช้อนุญาตให้ใช้ในงานนี้ ไม่ใช่หลักฐานสิทธิ์เผยแพร่มาตรฐานบนเว็บ
ก่อนdeploy/เปิดบริการหรือเพิ่มการแชร์ภายนอกต้องมีคำสั่งในขอบเขตนั้น ไม่ถือว่าการยืนยันแผนเป็นคำสั่งpublish

## ข้อมูลเชื่อมโยง

BuildingVariant → AssemblyRecipe → SegmentType/Instance → JointInterface → AnalysisRun → DesignCheck → Shop/Mould/ErectionDrawings → RevitArtifact
เอกสารทุกชนิดมีid,revision,status,source_hash,input_hash,created_by,reviewed_by,visibility,dependenciesตามความเหมาะสม
อนุมัติและreleaseเป็นสิทธิ์มนุษย์ตามworkflow ไม่ใช่AI/systemWorker
ไฟล์เก่าที่inputเปลี่ยนต้องติดSTALE; อย่าแสดงเพียงผลผ่านล่าสุดที่ไม่ตรงrevisionปัจจุบัน

## Acceptance Step1

R01 product_matrixเป็นinitial snapshot ไม่ใช่สถานะสดของเว็บ ให้importเป็นseedแล้วสร้างlive artifact/status recordsที่อ้างอิงrevision โดยไม่แก้ภาพหรือสถานะR01ย้อนหลัง

ข้อสังเกตจากโค้ดในโครงการ ณ16กันยายน2026: `apps/web/src/auth/AuthContext.tsx` มีanonymous sign-inในshared mode, `apps/web/src/permissions/guards.tsx` มีshared-mode membership bypass และ `firebase/shared.firestore.rules` ใช้signedInเป็นเงื่อนไขอ่านข้อมูลร่วม จึงห้ามถือว่าshared modeปัจจุบันเป็นinternal-team authorizationที่พร้อมใช้ ต้องออกแบบ/ทดสอบขอบเขตprivate catalogueก่อนเชื่อมไฟล์จริง ข้อนี้เป็นการตรวจโค้ดlocal ไม่ได้พิสูจน์ว่าproductionกำลังใช้configurationดังกล่าว และยังไม่ได้แก้โค้ดหรือrulesในงานR01

- 48ช่องไม่ซ้ำ:12ต่อการใช้งาน,16ต่อแปลน,12ต่อfamily; ค้น/กรองได้ครบ
- Typical4ครอบครัวเข้าถึงได้จากทุกกลุ่มโดยreference
- รูป/Tag/ประวัติIตรงทะเบียน; placeholderวิศวกรรมไม่อ้างผลที่ยังไม่ทำ
- ทดสอบanonymous,ผู้ใช้ไม่มีสมาชิกโครงการ,สิทธิ์หมดอายุ และdirect file request ต้องไม่อ่านprivate artifactsได้
- รูปโหลดได้และสัดส่วนไม่บิด; มีloading/error/empty stateและแหล่งข้อมูล
- อัปเดตหลังStep2/3/4/5ตามผลจริง ไม่ยกระดับสถานะด้วยการuploadอย่างเดียว
