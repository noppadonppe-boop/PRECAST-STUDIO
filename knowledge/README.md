# Precast Engineering Web App — Knowledge Base

เอกสารชุดนี้เป็น Source of Truth สำหรับออกแบบและพัฒนา Web App ระบบวิศวกรรมพรีคาสท์แบบหลายโครงการ โดยใช้ Vite + React + TypeScript และ Firebase เป็นแกนข้อมูลและ Workflow

## เอกสารหลัก

1. [PRECAST_WEB_APP_KNOWLEDGE.md](./PRECAST_WEB_APP_KNOWLEDGE.md) — Product scope, system architecture, domain model, Firebase model, calculation workflow, security และ document lifecycle
2. [UX_UI_KNOWLEDGE.md](./UX_UI_KNOWLEDGE.md) — Information architecture, user journeys, screen specification, components, interaction states และ UX acceptance criteria
3. [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — โครงสร้างโค้ด แผนพัฒนา MVP งานแต่ละเฟส การทดสอบ และ Definition of Done
4. [BOQ_ESTIMATE_KNOWLEDGE.md](./BOQ_ESTIMATE_KNOWLEDGE.md) — Quantity takeoff, price book, preliminary estimate, cost revision, report/export และ UX ของโมดูลประมาณราคา
5. [ROLE_PERMISSION_KNOWLEDGE.md](./ROLE_PERMISSION_KNOWLEDGE.md) — Role Matrix v1 ที่อนุมัติแล้ว, Separation of Duties, Firebase membership model, approval commands, permission guards และ audit requirements
6. [BUILD_STARTER_GUIDE.md](./BUILD_STARTER_GUIDE.md) — วิธีแบ่งแชด Product/Architecture กับ coding task, ลำดับสร้างแอป, M0 scope, Definition of Done และ prompt พร้อมใช้เริ่มพัฒนา
7. [REVIT_DXF_INTEROP_KNOWLEDGE.md](./REVIT_DXF_INTEROP_KNOWLEDGE.md) — ข้อกำหนด DXF สำหรับ Revit Drafting View, Export Profile, Layer/Entity policy, preflight, manifest และแนวทาง Native Revit adapter

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
