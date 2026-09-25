# Precast Engineering Web App — Knowledge Base

เอกสารชุดนี้เป็น Source of Truth สำหรับออกแบบและพัฒนา Web App ระบบวิศวกรรมพรีคาสท์แบบหลายโครงการ โดยใช้ Vite + React + TypeScript และ Firebase เป็นแกนข้อมูลและ Workflow

## เอกสารหลัก

แผน Modular ปัจจุบัน: [R02 — Local-first / Revit ก่อน STAAD](./modular-program-r02/README.md) · [โครงสร้างข้อมูล](./modular-program-r02/DATA_MODEL.md) · [current index](./modular-program-current.json)
R01 และผลวิเคราะห์เดิมเป็นประวัติ; R02 พักการคำนวณและใช้ความหนาพัฒนาแบบที่ผู้ใช้ยืนยัน ยังไม่อนุมัติผลิต

1. [PRECAST_WEB_APP_KNOWLEDGE.md](./PRECAST_WEB_APP_KNOWLEDGE.md) — Product scope, system architecture, domain model, Firebase model, calculation workflow, security และ document lifecycle
2. [UX_UI_KNOWLEDGE.md](./UX_UI_KNOWLEDGE.md) — Information architecture, user journeys, screen specification, components, interaction states และ UX acceptance criteria
3. [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — โครงสร้างโค้ด แผนพัฒนา MVP งานแต่ละเฟส การทดสอบ และ Definition of Done
4. [BOQ_ESTIMATE_KNOWLEDGE.md](./BOQ_ESTIMATE_KNOWLEDGE.md) — Quantity takeoff, price book, preliminary estimate, cost revision, report/export และ UX ของโมดูลประมาณราคา
5. [ROLE_PERMISSION_KNOWLEDGE.md](./ROLE_PERMISSION_KNOWLEDGE.md) — Role Matrix v1 ที่อนุมัติแล้ว, Separation of Duties, Firebase membership model, approval commands, permission guards และ audit requirements
6. [BUILD_STARTER_GUIDE.md](./BUILD_STARTER_GUIDE.md) — วิธีแบ่งแชด Product/Architecture กับ coding task, ลำดับสร้างแอป, M0 scope, Definition of Done และ prompt พร้อมใช้เริ่มพัฒนา
7. [REVIT_DXF_INTEROP_KNOWLEDGE.md](./REVIT_DXF_INTEROP_KNOWLEDGE.md) — ข้อกำหนด DXF สำหรับ Revit Drafting View, Export Profile, Layer/Entity policy, preflight, manifest และแนวทาง Native Revit adapter
8. [M9_PILOT_PRODUCTION_READINESS.md](./M9_PILOT_PRODUCTION_READINESS.md) — แผน M9 สำหรับ Firebase Staging, Pilot G0–G7, UAT, Revit import QA และ Production-readiness checkpoint

## Knowledge ผลิตภัณฑ์โมดูลและ Segment

- [TS-C Step 2O — เพิ่ม mesh ผนังใกล้ฐาน](./modular-tsc-step2o/README.md) — NBหนึ่งrun; cuttraction6/6, local3/4เฉพาะคู่M1→NB; ฐานยังไม่ผ่านและไม่ปิดarc convergence

- [TS-C Step 2N — แยกทิศความต่างความเค้น](./modular-tsc-step2n/README.md) — ตรวจผลเดิม490จุด ระบุjumpฐานข้ามชั้นความหนา ไม่ใช่หลักฐานสาเหตุหรือFEM runใหม่; วางแผนrefinementแยกทิศ

- [TS-C Step 2M — ส่วนโค้งและกลางหลังคา](./modular-tsc-step2m/README.md) — M1ผ่านtraction6/6cuts แต่localpairgroups1/4 ยังไม่ยืนยันความเค้นทั้งโมเดลหรืออนุมัติผลิต

- [TS-C Step 2J — โจทย์อ้างอิงแรงเฉือนจากน้ำหนักตัว](./modular-tsc-step2j/README.md) — 9coupons/27cuts เทียบexact elasticity; แยกผลmeshความยาวและความหนา ชุดละเอียดผ่านเฉพาะcoupon ไม่อนุมัติTS-Cทั้งโมดูล
- [TS-C Step 2K — Full bay แยก profile/thickness](./modular-tsc-step2k/README.md) — 2runsใหม่เทียบH4; ตรวจแนวตัดตามพิกัดจริง แรงcrownดีขึ้นเมื่อเพิ่มprofileแต่ยังไม่ผ่านครบ ไม่อนุมัติผลิต
- [TS-C Step 2L — ผลร่วม profile/thickness](./modular-tsc-step2l/README.md) — KPTเพิ่มหนึ่งrun; cuttraction2/6และlocalpairgroups2/8 ยังไม่ยืนยันความเค้นทั้งโมเดล
- [TS-C Step 2I — mesh เฉพาะบริเวณและ stress-traction](./modular-tsc-step2i/README.md) — เพิ่ม3runs FULL, ตรวจแรงความเค้น11runs/66cuts; ฐานและขอบยังไวต่อmesh, ไม่รับรองlocal stressหรืออนุมัติผลิต
- [TS-C Step 2H — quadratic-solid เต็มโมดูล](./modular-tsc-step2h/README.md) — 8 runs / H1–H4 / 490พิกัดต่อชุด; ผลรวมเข้าเกณฑ์ที่ตรวจ แต่ local stress ยังไม่ครบ0/8กลุ่ม ไม่ใช้เลือกเหล็กหรือจุดต่อ
- [TS-C Step 2G — ตรวจชิ้นโค้งด้วย 20-node](./modular-tsc-step2g/README.md) — 30 runs แยกผล element/geometry เทียบ exact elasticity; กลุ่ม 20-node ที่ mesh ละเอียดสุดครบเกณฑ์เฉพาะ coupon ไม่ใช่การรับรอง TS-C เต็มโมดูลหรือเลือกความหนาผลิต
- [TS-C Step 2F — benchmark ดัด/เฉือนและ load mapping](./modular-tsc-step2f/README.md) — ชิ้นตรง28runs เทียบ8/20-nodeกับ exact elasticity; quadratic ให้ผลดีขึ้นเฉพาะcoupon ยังไม่รับรองcurved/fullbay
- [TS-C Step 2E — ความเค้นที่พิกัดกายภาพร่วม](./modular-tsc-step2e/README.md) — postprocess solidเดิม6ชุด, 2,940จุด; วิธีอ่านผลตรงกับGaussเดิม แต่local stressยังไม่เข้าเกณฑ์ครบ ไม่เริ่มออกแบบเหล็ก/จุดต่อ
- [TS-C Step 2D — Section-cut/FBD และ Solid ทั้ง bay](./modular-tsc-step2d/README.md) — 6solidcases + 6shellaudits, 72subbodyFBD; ผ่านเกณฑ์ตัวเลขของแรงรวมที่ตรวจ แต่ local stress และจุดต่อจริงยังไม่พร้อมออกแบบ
- [TS-C Step 2C — มุมโค้งและ fixed-station diagnostic](./modular-tsc-step2c/README.md) — ชิ้นทดสอบ solid/shell36runs + อ่านshellเดิม6runs; ไม่ใช่full-bay solid validation และยังไม่พร้อมออกแบบ
- [TS-C Step 2B — ผล shell sensitivity / QA ยังไม่ครบ](./modular-tsc-step2b/README.md) — NC320 ไม่ใส่ prestress เฉพาะการศึกษา, LP-A, 74 mesh/load runs; มีผล N/M/Q จริงแต่ยังไม่ผ่าน convergence ทุกองค์ประกอบและยังไม่ตรวจ solid จึงไม่ใช้ปล่อยผลิต
- [Catalogue WEB-16 — คลังภาพและดาวน์โหลด](./modular-web-step1/README.md) — 48 แบบ, Typical 4 ครอบครัว, engineering 28 ภาพ; local preview เท่านั้น ยังไม่เปิดบริการทีม/สาธารณะ
- [TS-C Step 2A — ฐานศึกษา/FBD/Joint register](./modular-tsc-step2a/README.md) — 3×3 ม. รวมพื้น, R0.40, ช่วง1.50ม., S00 ทึบ; benchmark สมดุลแบบมีเงื่อนไข ยังไม่ใช่ FEM หรือแบบผลิต
- [Modular Programme R01 — แผนที่ผู้ใช้ยืนยัน](./modular-program-r01/README.md) — มาตรฐาน1.50ม.ร่วม I/L/U, ความหนาเป้าหมาย150–200มม.พร้อมข้อยกเว้นรายชิ้น, เว็บภายใน, TS-Cนำร่อง และ วสท.011008-21; อนุมัติแผนเท่านั้น ยังไม่อนุมัติวิศวกรรม/ผลิต
- [Modular I/L/U — Segment Knowledge R00](./modular-segments-r00/KNOWLEDGE_TH.md) — ทะเบียน Type I/L/U รวม 48 แนวคิด, บัญชี Typical Segment/Tag และกรอบพัฒนาแม่แบบ; เป็นข้อเสนอแนวคิด ยังไม่อนุมัติผลิต

## กติกาการใช้ Knowledge Base

- เอกสารนี้กำหนดพฤติกรรมของผลิตภัณฑ์ แต่ไม่แทน Design Basis หรือการรับรองของวิศวกรผู้รับผิดชอบ
- Calculation Run, Drawing Revision และ Production Release ต้องตรวจสอบย้อนกลับถึงข้อมูลต้นทางและ Design Basis revision ได้เสมอ
- ข้อมูล FEM mesh, IFC, DXF, PDF และไฟล์ผลลัพธ์ขนาดใหญ่เก็บใน Cloud Storage; Firestore เก็บ metadata, workflow, indexes และผลสรุป
- ผลคำนวณที่มีผลต่อความปลอดภัยต้องมาจาก backend calculation service ที่ผ่านการตรวจสอบ ไม่ใช้ค่าที่คำนวณใน browser เป็น authoritative result
- ค่า default ทุกค่าต้องแสดงแหล่งที่มา หน่วย Revision และผู้อนุมัติ
- AI ใช้ช่วยจัดหมวด แนะนำ ตรวจความครบถ้วน และร่างเอกสารได้ แต่ไม่มีสิทธิ์ Approved หรือ Release to Production
- Role Matrix v1 เป็น baseline ของ MVP; การเพิ่มสิทธิ์ใหม่ต้องอัปเดต capability matrix, Security Rules, backend authorization และ test matrix พร้อมกัน
- Shop Drawing ต้องมี `REVIT-DRAFTING-01` เป็น mandatory interoperability profile พร้อม DXF, PDF/A, manifest และ preflight ตาม Knowledge ที่อนุมัติ

## Product statement

> แพลตฟอร์มกลางที่รับแบบสถาปัตย์ ช่วยวิศวกรกำหนดชิ้นงานพรีคาสท์ สร้าง analytical model วิเคราะห์และออกแบบ ถอดปริมาณและประมาณราคาเบื้องต้น ตรวจทาน ออก calculation report และสร้าง shop drawing/production package แบบควบคุม revision สำหรับหลายโครงการ

## Technology baseline

- Frontend: Vite, React, TypeScript
- Client SDK: Firebase modular Web SDK
- Authentication: Firebase Authentication
- Metadata/workflow: Cloud Firestore
- File artifacts: Cloud Storage for Firebase
- Command/API orchestration: Cloud Functions for Firebase 2nd gen
- Heavy/native calculation and CAD export: containerized Cloud Run service or Cloud Run Job
- Local development: Firebase Local Emulator Suite
- Hosting: Firebase Hosting for the SPA

Firebase recommends the modular JavaScript SDK for production bundlers because it supports tree-shaking: <https://firebase.google.com/docs/web/setup>
