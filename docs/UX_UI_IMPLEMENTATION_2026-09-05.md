# PRECAST STUDIO — UX/UI implementation

วันที่: 5 กันยายน 2026

ปรับตาม `ux-precast-web-app.html`, `knowledge/UX_UI_KNOWLEDGE.md` และผลตรวจ `UX_UI_COMPARISON_2026-09-05.md` โดยรักษา workflow/security commands ที่มีอยู่

## สิ่งที่แก้แล้ว

- คืน PRECAST STUDIO, sidebar เทาเข้ม, accent สีส้ม และพื้นหลังเทาอ่อนตามต้นแบบ ปุ่มข้อความขาวใช้ส้มเข้มขึ้นเพื่อให้อ่านชัด
- เมนูองค์กรและสิบขั้นตอนงานภาษาไทย/อังกฤษ พร้อม mapping ไป G0–G7 แยก Loads/Analysis และ Report/Drawing ด้วย URL view
- Project sidebar แสดงชื่อโครงการและ revision; ไม่อนุมานว่า Gate ก่อนหน้าผ่านจากลำดับขั้นตอน
- Portfolio ค้นหาชื่อ/รหัส/ประเภท กรองสถานะและผู้รับผิดชอบร่วมกันได้ พร้อม empty state
- ยกเลิกตัวเลข Critical issues=7 และ Ready for release=3 ที่กำหนดตายตัว ค่า issue รวมมาจากรายการโครงการ ส่วนข้อมูล live ที่ไม่มีแหล่งยืนยันแสดง “—”
- เปลี่ยน metric เป็นจำนวนโครงการที่ Gate ปัจจุบันอนุมัติแล้ว ไม่ใช้คำว่าพร้อมส่งผลิตแทนการตรวจ G7
- Directory ของ AppShell/Portfolio/Overview/StageWorkspace อ่านโครงการจาก membership + repository ใน emulator และใช้ fixture เฉพาะโหมดตัวอย่าง
- ปุ่มเปิดขั้นตอนปัจจุบันทำงาน และการสร้างโครงการรอให้ directory/membership พร้อมก่อนนำทาง
- หน้าตัวอย่างมีโมเดลกลางจอ, เลือกชิ้นงานด้วย pointer/keyboard, 3D/Plan, zoom/fit, ซ่อน/แสดงรอยต่อ และ inspector ปรับความหนาตัวอย่างได้
- การเลือกและความหนาของชิ้นงานตัวอย่างสัมพันธ์กับปริมาตร น้ำหนัก BOQ และ Drawing ระหว่างเปลี่ยนขั้นตอนของโครงการเดียวกัน
- BOQ ตัวอย่างมี Quantity Takeoff / Cost Summary / Assumptions และแก้ราคา/สูญเสียเพื่อดูผลทันที โดยระบุรายการที่ยังไม่รวมและไม่แสดงรายการขาดเป็นศูนย์
- มี report outline 13 หมวด, draft page preview, drawing selector และหน้ารายการเงื่อนไขก่อนส่งผลิต
- G2 emulator เปลี่ยนจากปุ่ม CSS panel เป็น SVG viewer ตาม geometry, offsets และ openings ใน Product Model จริง พร้อม inspector ของชิ้นงานที่เลือก แสดง volume, weight, COG, anchors และ source IDs; ใช้ callback Split/Merge และ backend controls เดิม
- Team มี search/role/status filters และ inspector ของสมาชิกตัวอย่างแบบอ่านอย่างเดียว; เอาปุ่มเชิญ/แก้สิทธิ์ที่ไม่ทำงานออก
- Approval queue มี search และ blocker filter; ยกเลิกแท็บที่ไม่ทำงาน โดยคงการอนุมัติ snapshot เดิม
- เมนูมือถือเปิด–ปิดและปิดหลังเลือกหน้า; ตารางยาวเลื่อนภายในกรอบ; inspector จัดลงด้านล่างเมื่อจอแคบ

## ขอบเขตที่ต้องเข้าใจ

- UI ตัวอย่างแสดงว่าเป็น sample UX model เสมอ ไม่อ้างว่าเป็น IFC ที่ผู้ใช้นำเข้าหรือเป็นผลวิศวกรรมอนุมัติแล้ว
- SVG มุมมองสามมิติเป็นภาพประกอบ/ภาพฉายจากข้อมูลที่รองรับ ไม่ใช่ full BIM orbit viewer หรือ general-purpose FEM solver
- Sample BOQ ครอบคลุมคอนกรีตสองผนัง ไม่ใช่ estimate ครบโครงการ; ไม่ออกเอกสารก่อสร้างจากตัวอย่าง
- ผล FEM, reinforcement, export และ production release ยังต้องมี evidence และ approval ตาม workflow จริง ไม่มีการสร้าง PASS เพื่อให้ตรงรูปต้นแบบ
- Staging sign-in/PilotWorkspace และขั้นตอนจริง Revit/IFC ของ M9 ยังคงเป็นงานแยก ไม่เปลี่ยนเป็น mock โดยงานนี้
- Artifact selection ใน controlled workflow ยังมี default revision IDs จาก milestone เดิม; ไม่ได้อ้างว่าการจัดการ revision/backend ครบ production แล้ว
- Managed team/library/settings authoring ยังไม่ใช่ capability ที่เพิ่มในงาน UI นี้

## การตรวจสอบ

- Web TypeScript: ผ่าน
- ESLint ทั้ง `apps/web/src`: ผ่าน
- Web tests: 20 ผ่าน รวม UX tests 5 รายการและ Product Model viewer test 1 รายการที่เพิ่ม
- Domain/schema/functions unit tests: 48 ผ่าน
- Vite production build: ผ่าน มี warning เดิมประเภท dependency comment annotation และ bundle >500 kB
- ตรวจจริงผ่านเบราว์เซอร์: desktop 1280px, tablet 1024px และ mobile 390px
- ตรวจภาพ Panelization/Inspector, Drawing, BOQ และ navigation; mobile BOQ ไม่มี document overflow (`scrollWidth=375`, viewport=390 รวม scrollbar)
- ทดสอบเมนูมือถือเปิดแล้วเลือก BOQ: เปลี่ยนหน้าและ `aria-expanded=false`
- ไม่ได้รัน Firebase emulator integration / full E2E / Revit import ซ้ำในงานนี้ จึงไม่ถือว่ารายงานนี้เป็น production readiness sign-off

เปิดตรวจ: `http://localhost:5173/org/org-siam/projects/p-rama9/stages/g2?view=panel`
