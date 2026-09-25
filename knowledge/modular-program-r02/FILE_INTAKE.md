# ภาคผนวก R02-A01 — Revit 48 + STAAD 48 ในเว็บไซต์

## ขอบเขต STAAD ปัจจุบันตาม P150

สถานะปัจจุบัน: starter packages และ STD สร้างจริงครบ 48/48, static preflight ผ่าน 48/48 และลงทะเบียนใน STD slots/หน้า Engineering แล้ว ที่เก็บ private local คือ `%LOCALAPPDATA%/Precast-Module/private/staad-starter-p150` เว็บให้ดาวน์โหลดตามสิทธิ์เดิมแต่ไม่ execute ไฟล์

ผู้ใช้กำหนดให้ STD ขั้นนี้เป็น **library-ready starter files** ครบ48แบบ ไม่ใช่ผลวิเคราะห์ที่ต้องรันผ่านก่อนรับเข้า library แต่ละ package ต้องมี geometry, loads, combinations/envelopes, analysis/output commands, RC design commandsหรือhandoffตามrouteที่รองรับ และทะเบียน assumptions/source/hash ผู้รับผิดชอบวิศวกรรมจะดึงไปตรวจ แก้ รัน และอนุมัติภายหลัง

เมื่อผ่าน static preflight ให้ใช้ `AVAILABLE / LIBRARY_READY_STARTER / NOT_RUN_BY_CURRENT_SCOPE / ENGINEER_REVIEW_REQUIRED`; ห้ามใช้ `VALIDATED`, `ANALYSED`, `CHECKED` หรือ `APPROVED` จนมีหลักฐานจากขั้น engineer จริง การไม่มี ANL ไม่ใช่ไฟล์หายในขอบเขต P150 แต่ STD ที่ไม่มี package metadata/ข้อจำกัดยังไม่ผ่าน intake ดู [P150](STAGE7_STARTER_LIBRARY_P150.md)

ผู้ใช้ยืนยันให้ทั้ง Revit และ STAAD ของทุกสินค้าเป็นส่วนหนึ่งของเว็บ และให้ดำเนินลำดับเดิมต่อ ไม่เร่งรัน solver ก่อน P7

## ขอบเขตที่ต้องส่งมอบ

- 48 product IDs เดิม แต่ละรายการมี BIM tab สำหรับ RVT และ Engineering tab สำหรับ STD/ผลวิเคราะห์/รายการคำนวณ
- RVT หลัก 48 ไฟล์ใน P6; STAAD .std หลัก 48 ไฟล์ใน P7 มี geometry/loads/supports/design commands ตามรุ่นที่รองรับจริง
- โมเดลต้นแบบอาจใช้ซ้ำได้ แต่แต่ละ product ต้องมีไฟล์และที่มาของ loads/openings/supports ที่ตรงกัน ไม่คัดลอกผลแล้วอ้างว่ารัน 48 แบบ
- การลงทะเบียนไม่เท่ากับเปิดสำเร็จ การเปิดสำเร็จไม่เท่ากับวิเคราะห์ผ่าน และวิเคราะห์ผ่านไม่เท่ากับ approved
- slot ที่ยังไม่มีไฟล์ใช้ artifactId=null และ NOT_CREATED; ห้ามสร้างลิงก์ดาวน์โหลดปลอมหรือใช้ RVT ร้านกาแฟเดิมแทนสินค้าใหม่

## Intake / revision / download

1. ขั้น local: ลงทะเบียนไฟล์จากราก output/deliverables ที่อนุญาตโดยผู้ดูแล ไม่รับ arbitrary path จาก browser
2. ขั้นเว็บ: authenticated upload ลง staging/quarantine ตรวจสิทธิ์ ชนิดไฟล์ ขนาด hash และเนื้อหาตามตัวอ่านที่ใช้ได้ ไม่เชื่อนามสกุลอย่างเดียว
3. ระบุ productId, productRevisionId, geometryRevisionId, fileRevision, softwareVersion และผู้จัดทำ; RVT/STD ต้องชี้ geometry เดียวกันหรือแสดง STALE
4. เก็บ immutable artifact + content hash; การเปลี่ยนไฟล์สร้าง revision ใหม่และเก็บประวัติ ไม่เขียนทับ issued file
5. ดาวน์โหลดผ่าน artifact ID ที่ backend ตรวจสิทธิ์ทุกครั้ง; Engineering จำกัด capability แยกจาก BIM; ไม่เก็บไฟล์ส่วนตัวใน public/
6. ส่งผล QA/ภาพ/PDF/ผลโปรแกรมกลับมาเป็น linked artifacts; แสดง missing/failed/stale/not checked ตามจริง

ไฟล์ RVT ไม่ใช่ browser 3D โดยตรง: viewer ใช้ derivative ที่ตรวจว่า geometry/revision ตรง เช่น IFC/mesh + object mapping; ดาวน์โหลด RVT ต้นฉบับยังได้แยกกัน
ไฟล์ STD อาจมี text preview ที่ escape ข้อความและจำกัดขนาด แต่เว็บไม่ execute input ที่อัปโหลดอัตโนมัติ
การรัน Revit/STAAD ต้องผ่าน native application ที่มีสิทธิ์ใช้งาน; ระบบคิวรันบน server เป็นงานต่างหาก ไม่ถือว่าอนุมัติในขั้น intake

## Data contract เพิ่มเติม

plannedFileSlots: id, productId, productRevisionId, kind(RVT/STD), dueStage, artifactId, intakeStatus, nativeValidationStatus, visibility
Artifact เมื่อมีจริงเพิ่ม fileRevision, storageKey, sha256, bytes, mimeType, softwareVersion, geometryRevisionId, dependencies, createdBy, validationReportId
product, slot, artifact และ native run แยก entity; 96 slots ไม่ใช่ 96 files ที่เสร็จแล้ว
ข้อมูลเมทาดาทายัง local-first; binary ในพื้นที่ส่วนตัว; ไม่มี Firebase/Cloud หรือ upload endpoint ใหม่ในรอบกำหนดสัญญานี้

## Acceptance ก่อนเปิดใช้งานจริง

P102 ขั้นที่ 6: มี RVT เปิดตรวจจริงครบ 48 แบบแล้วใน `deliverables/PM_Revit_48_P6/` ทะเบียนที่เว็บใช้คือ `output/revit-p6/delivery-manifest.json` (P36 geometry + SHA-256 + version 2026 + 10 artifacts ต่อแบบ) ซึ่ง overlay สถานะ RVT slots เดิมเป็น AVAILABLE / VALIDATED_REVIT_2026 โดยไม่เปลี่ยนประวัติ A01

P150 ขั้นที่ 7: STD slots ทั้ง 48 รายการ overlay เป็น `AVAILABLE / LIBRARY_READY_STARTER / NOT_RUN_BY_CURRENT_SCOPE / NOT_RUN / REQUIRED_BEFORE_RUN` จาก private library เท่านั้น ไม่แก้ทะเบียนประวัติ A01 ให้ดูเหมือนสร้างไฟล์มาตั้งแต่ต้น และไม่เปลี่ยน `engineeringApproved=false` หรือ `productionReleased=false`

- หน้าแต่ละสินค้าเห็นสถานะและดาวน์โหลดเฉพาะไฟล์ที่มีจริงครบสิทธิ์
- ตรวจ 48 RVT slots + 48 STD slots ไม่มี product ซ้ำ/ขาด
- ตรวจ extension/content mismatch, corrupt file, missing dependency, unauthorized direct URL, revision conflict และ stale geometry
- เปิด RVT ใน Revit และ STD ใน STAAD รุ่นเป้าหมายจริงก่อนระบุ native validated
- ทดสอบเว็บด้วยบัญชีที่มี/ไม่มีสิทธิ์ และตรวจว่าไม่มีข้อมูลวิศวกรรมหลุดจาก metadata/preview
