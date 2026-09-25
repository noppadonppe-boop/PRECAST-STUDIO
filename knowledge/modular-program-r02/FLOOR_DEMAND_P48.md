# P48 — วิเคราะห์แรงแม่แบบพื้นต่อจาก P47

ขั้น 5/8: ยังดำเนินการอยู่ ตัวเลขอ้างอิง checklist เดิม 50% ไม่ใช่เปอร์เซ็นต์รับรองแบบผลิต

เพิ่ม [รายงานแรง/สมมติฐาน/ขอบเขต](../../output/floor-demand-p48/README.md) และ FBD ที่สร้างจากข้อมูลคำนวณ ไม่ใช่ภาพ AI:

- [F2660](../../output/floor-demand-p48/F2660-FBD.png) รองรับ Typical พื้น A/B/C/D จำนวน 4 setup
- [NF02](../../output/floor-demand-p48/NF02-FBD.png) อีก 1 setup

ใช้ geometry P47 ไม่เปลี่ยนความหนาหรือมิติ Typical. เพิ่มมวล/CG เหล็กจากเซลล์จริงรวมอุปกรณ์ล็อกในโมเดล, คานผิว/ซี่โครง/ราง, แรงลงฐาน 4 จุด และแรงจัดสรรจุดล็อก 24 จุด. น้ำหนักไม่รวมแนวเชื่อม สี ซีล และอุปกรณ์ที่ยังไม่ได้จำลอง.

กรณีฐานสี่จุดและ surcharge2.5kPa เป็นสมมติฐานศึกษาของผู้ช่วย ไม่ใช่ข้อมูลโรงงานที่ผู้ใช้ยืนยัน. คำนวณสองกรณีต่อขนาด รวม 4 กรณี. สูตรคานผ่าน benchmark และตรวจสมดุลสองแกน; ไม่ใช่การตรวจ code strength, ไม่ใช่ 3D frame/shell และไม่ยืนยันพิกัดยก.

แรงสถิตลงฐานรวม: F2660 24.357kN; NF02 22.648kN. ค่าดังกล่าวใช้ gammaคอนกรีต25kN/m³ ต่างจากมวลคอนกรีตสำหรับทะเบียนที่ใช้2400kg/m³ โดยตั้งใจ. อ่านกรณีศึกษาและข้อจำกัดในรายงานก่อนใช้ค่า.

งานขั้น5ที่ยังต้องปิด: code capacity และ weld/lock load path, เสถียรภาพ/ช่วงประกอบถอด, ระบบยก/พลิก, ฐานรองรับ, tolerance/seal และขยายรายละเอียดแม่แบบที่เหลือ. ยังไม่เริ่มขั้น6 ไม่อัปเกรด engineeringApproved/productionReleased. รูปเดิมในเว็บไซต์ไม่เปลี่ยน.

ทำซ้ำ: `node tools/modular-program/floor-demand-p48.mjs`, `node tools/modular-program/floor-demand-board-p48.mjs`, `node --test tools/modular-program/elastic-beam-p48.test.mjs tools/modular-program/floor-demand-p48.test.mjs`.
