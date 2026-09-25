# ขั้น6.1 — ชุดส่งมอบ P104

ไฟล์ครบ48แบบ (I-B3ตัวอย่างP103 +47แบบP104) วันที่18กันยายน2026
ปิดขั้น6.1ครบ100% ตามขอบเขตต้นแบบสถาปัตย์ รอผู้ใช้ตรวจรับชุดขยาย47แบบ ไม่ใช่อนุมัติวิศวกรรมหรือผลิต

## ผลตรวจที่เสร็จแล้ว

- 47ชุดใหม่: Native Revit2026 save/reopen, placement/solid coordination และ relative Link relocation ผ่านตาม QA รายแบบ
- คอนกรีตต้นทางคงเดิมและ hash ของ RVT/STR ตรงกับ native audit
- ตรวจภาพทุกแบบ: 7แผ่นPDFและ4ภาพ native; รายการ visual approval ผูกกับ hash ของไฟล์
- ZIP ทั้ง48ตรวจเปิดและ hash สมาชิกไฟล์ตรงกับ manifest; ผลที่ `output/revit-p61-batch/delivery-closure-audit.json`
- เว็บแสดง48ARCแยกจาก48STRและภาพเดิม ไม่แทนที่คลังโครงสร้าง
- ทดสอบเว็บพอร์ตจริง5186 ผ่าน: I-B3/L-C2/U-D3 เปิดแท็บARC ดูภาพและดาวน์โหลด ZIP; ตรวจมือถือไม่มี overflow
- ผลเว็บ `output/revit-p61-batch/web-live-review/browser-audit.json`
- HTTP regression session97796 จบexit0 ผ่าน9/9: ทุกไฟล์ดาวน์โหลดตรวจbytes/hash/MIME, ACL/anonymous/revocation และ stale-source fail-closed; ผล `output/revit-p61-batch/http-regression-audit.json`
- รายงานปิดขั้น `output/revit-p61-batch/acceptance.json`; หยุดรอผู้ใช้ตรวจ ไม่เริ่มขั้น7

## การส่งต่อ

[บัญชีดาวน์โหลด48แบบ](../../deliverables/ARC_48_DELIVERY_INDEX.md)

แตก ZIP ทั้งชุดก่อนเปิด ARC RVT2026; คง References/Families และ Baseline
งานระบบเป็นตำแหน่งตั้งต้นและSpecไม่ผูกยี่ห้อ ยังไม่ออกแบบกำลังระบบ/จุดยึด/ฐานระเบียง/รูเจาะคอนกรีต
Familiesแก้ extrusionได้แต่ไม่ fully parametric ทุกขนาด; มิติ/CSVเป็นsnapshot ต้องตรวจหลังแก้
รอยต่อมุมทรงDยังคงตามโครงสร้างต้นทาง ไม่ถือว่าปิดรอยต่อกันน้ำหรือรับรองการผลิตแล้ว

engineeringApproved=false; productionReleased=false; ขั้น7ยังไม่อนุมัติเริ่ม
