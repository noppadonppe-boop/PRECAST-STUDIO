# M9 — Firebase Staging, Pilot Validation and Production Readiness

Status: Approved planned milestone

Baseline date: 2026-09-05
Predecessor: M8 must be completed, committed, and handed off before M9 starts

## 1. Objective

M9 เปลี่ยนระบบจากการทดสอบด้วย Local Emulator และ deterministic fixtures ไปสู่สภาพแวดล้อม Firebase Staging ที่ใกล้เคียงการใช้งานจริง จากนั้นนำโครงการ Pilot ที่ไม่กระทบงานผลิตจริงมาทดสอบ Workflow, Security, Engineering Evidence, BOQ, Calculation Report, Shop Drawing, DXF/Revit interoperability และ Release Control ตั้งแต่ G0 ถึง G7

M9 เป็น **Milestone การทดสอบและเตรียมพร้อมใช้งานจริง** ไม่ใช่ Gate ใหม่ ดังนั้น Gate baseline ยังคงเป็น `G0–G7` จำนวน 8 Gate ไม่ใช่ `G1–G9`

## 2. Environment progression

```text
Local Emulator
→ Firebase Staging
→ Controlled Pilot / UAT
→ Production-readiness approval
→ Firebase Production (separate approval and deployment)
```

- Local Emulator ใช้สำหรับ automated tests, fixtures และ negative-path tests
- Staging ต้องเป็น Firebase/GCP project แยกจาก Production
- Pilot เริ่มด้วยข้อมูลจริงที่ลดความเสี่ยงหรือข้อมูลสำเนาที่ลบข้อมูลอ่อนไหวแล้ว
- ห้ามนำข้อมูล Pilot ไป Production โดยอัตโนมัติ
- ห้ามเชื่อม Production หรือ Release to Factory จนกว่าจะผ่าน M9 exit criteria และได้รับอนุมัติจาก Product Owner/ผู้มีอำนาจ

## 3. Entry criteria

เริ่ม M9 ได้เมื่อ:

- M8 เสร็จ, commit แล้ว, working tree สะอาด และมี `docs/M8_HANDOFF.md`
- lint, typecheck, unit, emulator และ E2E tests ผ่าน
- Schema, Security Rules, Functions และ seed/migration strategy ระบุ version ชัดเจน
- Known limitations ของ analysis, design checks, lifting, reinforcement และ exporters ถูกระบุโดยไม่เปลี่ยน `NOT_CHECKED` เป็น `PASS`
- Workflow M0–M8 ใช้งานกับ local fixtures ได้ครบตาม scope
- ระบุผู้รับบท BIM Coordinator, Engineer, Independent Checker, QS/Estimator, Detailer และ Production Manager สำหรับ Pilot โดยใช้บัญชีแยกกัน

หาก engineering method ที่จำเป็นยังไม่ผ่าน verification ให้ทำ Technical Rehearsal และทดสอบพฤติกรรม `BLOCKED/NOT_CHECKED` ได้ แต่ห้ามอ้างว่า Pilot ผ่าน G4–G7

## 4. When Firebase configuration is required

ยังไม่ต้องส่ง Firebase configuration ระหว่าง M8 การเชื่อม Firebase จริงเริ่มที่ **M9.1 — Staging Provisioning** หลัง M8 ถูก commit และ handoff แล้ว

ค่าที่ใช้กับ Vite client:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

แนวทางจัดการ:

- Codex สร้างหรือยืนยัน `.env.example` ที่มี placeholder เท่านั้น
- Product Owner/ผู้ดูแลระบบใส่ Firebase Web App config ของ **Staging** ใน `.env.local` หรือ environment variables ของระบบ deploy
- `.env.local` ต้องอยู่ใน `.gitignore` และห้าม commit
- Firebase Web config เป็น identifier ฝั่ง client ไม่ใช่สิทธิ์เข้าถึงข้อมูล แต่ API restriction, Authentication, Firestore/Storage Rules และ App Check ยังเป็นข้อบังคับ
- Production config ต้องใช้ Firebase project คนละตัวและส่งมอบเฉพาะตอน Production deployment ได้รับอนุมัติ

ข้อมูลที่ **ห้ามส่งในแชดและห้าม commit**:

- Service Account JSON
- private key หรือ signing key
- refresh token
- CI/CD deploy token
- third-party API secret หรือ solver license

Cloud Functions/Cloud Run บน Google Cloud ให้ใช้ runtime service account และ Application Default Credentials ตามหลัก least privilege ไม่ดาวน์โหลด private key หากไม่จำเป็น หากมี server secret ให้เก็บใน managed secret storage และให้ผู้ดูแลตั้งค่าผ่าน console/CLI ที่เครื่องของตน

## 5. M9 work packages

### M9.0 — Closeout and readiness review

- อ่าน `docs/M8_HANDOFF.md` และตรวจ clean working tree
- รัน baseline test suite ซ้ำ
- จัดทำ known-limitations register และ Pilot risk register
- ยืนยันว่า M9 ไม่แก้ engineering assumption เพื่อทำให้ Gate ผ่านโดยเทียม

### M9.1 — Firebase Staging provisioning

- ผูก Firebase project alias `staging` โดยไม่เปลี่ยน production alias
- ตั้งค่า Authentication provider และ authorized domains
- Deploy Firestore indexes, Firestore Rules, Storage Rules และ Functions ไป Staging แบบ explicit target
- ตั้ง App Check สำหรับ Web และกำหนด debug workflow แยกจาก enforcement จริง
- ตั้ง IAM แบบ least privilege, budgets/alerts, logs, monitoring, backup และ retention
- สร้าง smoke test ยืนยันว่า client ไม่เผลอเชื่อม Production

### M9.2 — Pilot organization, users and data

- สร้าง Pilot organization/project และบัญชีผู้ใช้แยกตาม Role Matrix v1
- Import Design Criteria, code editions, unit policy และ Price Book revision ที่อนุมัติสำหรับ Pilot
- Upload source IFC/PDF/DWG เฉพาะชุดที่อนุญาต พร้อม checksum และ source revision
- สร้าง test-data inventory และ cleanup/retention owner

### M9.3 — Controlled G0–G7 walkthrough

| Gate | Pilot evidence | Responsible roles |
|---|---|---|
| G0 | BIM/source intake accepted, file/hash/revision recorded | BIM Coordinator |
| G1 | Design Basis and criteria approved/locked | Engineer + Checker |
| G2 | Product/analytical model frozen with traceable assumptions | Engineer |
| G3 | Analysis verified: equilibrium, mesh/convergence and benchmark evidence | Engineer + Checker |
| G4 | Design, reinforcement, connection, lifting and transport checks approved | Engineer + Checker |
| G5 | BOQ and preliminary estimate reviewed against the same model revision | Engineer + QS/Estimator |
| G6 | Calculation report and Shop Drawing preflight passed; PDF/A, DXF and manifest match | Detailer + Checker |
| G7 | Controlled release package approved by an authorized distinct actor | Production Manager / Release authority |

สำหรับ Pilot รอบแรก G7 อาจจบที่ test release queue หรือ dry-run package โดยยังไม่ส่งเข้าการผลิตจริง ทั้งนี้ต้องติดป้าย `PILOT / NOT FOR PRODUCTION` ชัดเจน เว้นแต่มีการอนุมัติ Release to Production แยกต่างหาก

### M9.4 — Negative, revision and interoperability tests

- ปฏิเสธ cross-organization access และ expired/suspended membership
- ปฏิเสธ self-approval และผู้ใช้ที่ไม่มี capability
- แก้ source/design criteria แล้วตรวจ downstream invalidation และ re-run
- ทดสอบ stale snapshot, failed preflight, missing/expired rate และ job retry/cancel
- Export `REVIT-DRAFTING-01` แล้ว import เข้า Revit Drafting View จริง
- ตรวจ units, scale, origin/extents, layer mapping, text/font, dimensions, linework และ sibling PDF/A
- ตรวจ checksum/manifest, duplicate command idempotency และ immutable released package
- ตรวจ download/audit trail และ cleanup/retention behavior

### M9.5 — UAT and production-readiness decision

- สรุป defect ตาม severity และปิด Critical/High ที่กระทบ security, engineering safety หรือ document integrity
- ให้ผู้ใช้แต่ละบทบาทลงนาม UAT ตามหน้าที่ของตน
- สรุป performance, cost/budget, monitoring, incident response, backup/restore และ support owner
- จัดทำ go-live/rollback plan และ Production deployment checklist
- สร้าง `docs/M9_HANDOFF.md` พร้อม test counts, evidence links, known limitations และ recommendation

## 6. Mandatory Pilot scenarios

1. Happy path ครบ G0–G7 ด้วย Revision ชุดเดียวกัน
2. Architectural source revision เปลี่ยนหลัง G3 แล้ว G3–G7 กลับเป็น stale/blocked
3. Design Criteria revision เปลี่ยนแล้ว analysis/design/report/drawing/estimate ถูก invalidate ตาม dependency
4. Engineer ผู้สร้างงานพยายาม self-approve แล้วระบบปฏิเสธและบันทึก audit
5. User คนละ organization พยายามอ่าน metadata/file แล้ว Rules ปฏิเสธ
6. G4 มี `NOT_CHECKED` แล้ว G6/G7 ถูกบล็อก
7. Price Book หมดอายุหรือไม่มี rate แล้ว estimate แสดง exception โดยไม่สร้างตัวเลขหลอก
8. DXF import ใน Revit Drafting View ผ่าน visual and dimensional QA เทียบ sibling PDF/A
9. Export/release retry ด้วย idempotency key เดิมไม่สร้าง package ซ้ำ
10. Released package ไม่ถูก overwrite; การแก้ไขต้องออก revision ใหม่หรือ supersede

## 7. Evidence package

- Pilot project ID, organization ID และ participant-role list
- Source hashes และ revision chain
- Gate approvals พร้อม actor, timestamp, snapshot ID และ comments
- Analysis/design benchmark and verification record
- BOQ/estimate reconciliation
- Calculation Report, Shop Drawing PDF/A, DXF และ JSON manifest
- Revit import QA checklist และ screenshots
- Security/rules/emulator/E2E test reports
- Monitoring, backup/restore and incident-response evidence
- Defect register, UAT sign-off และ production-readiness decision

## 8. Exit criteria

M9 ผ่านเมื่อ:

- Firebase Staging เชื่อมต่อและ deploy แบบแยกจาก Production
- Pilot ที่มีข้อมูลและผู้ใช้ตัวแทนจริงผ่าน workflow G0–G7 หรือบันทึก Gate ที่บล็อกอย่างถูกต้องโดยไม่ bypass
- Security Rules, backend authorization, Separation of Duties และ audit trail ผ่าน positive/negative tests
- Calculation/BOQ/report/drawing/export ทุกชุดอ้าง immutable upstream revisions เดียวกัน
- `REVIT-DRAFTING-01` ผ่านการ import และ QA ใน Revit Drafting View
- ไม่มี Critical/High defect ที่ยังเปิดและกระทบ safety, tenant isolation, authorization หรือ released-document integrity
- UAT, go-live/rollback, monitoring, backup/restore และ owner ถูกอนุมัติ
- มี `docs/M9_HANDOFF.md` และ working tree สะอาด

M9 completion ยังไม่เท่ากับการอนุมัติ Production deployment; การเชื่อม Firebase Production และใช้งานกับโครงการผลิตจริงต้องเป็น Product Owner checkpoint แยกต่างหาก

## 9. Prompt to run M9 after M8

ใช้ prompt นี้ใน Coding Task เดิมหลัง M8 เสร็จและ commit แล้ว:

> ดำเนินการ M9 — Firebase Staging, Pilot Validation and Production Readiness โดยอ่าน `knowledge/README.md`, `knowledge/M9_PILOT_PRODUCTION_READINESS.md` และ `docs/M8_HANDOFF.md` ก่อน ตรวจว่า M8 commit แล้วและ working tree สะอาด หากไม่สะอาดให้หยุดและรายงาน ห้ามเชื่อม Production และห้ามขอหรือแสดง Service Account JSON/private key ให้เตรียม `.env.example`, Firebase project aliases และ documented operator steps สำหรับ Staging ใช้ Firebase Web config ผ่าน local/deployment environment เท่านั้น จากนั้น implement และทดสอบ Staging-safe configuration, App Check/IAM/security readiness, Pilot seed/migration controls, G0–G7 pilot checklist/evidence model, negative/revision/invalidation tests, `REVIT-DRAFTING-01` Revit import QA record และ production-readiness report โดยห้าม bypass `NOT_CHECKED`, self-approval หรือ release controls รัน lint, typecheck, unit, emulator, E2E และ production build แก้จนผ่าน แล้วจัดทำ `docs/M9_HANDOFF.md` สรุปผลทดสอบ หลักฐาน known limitations และสิ่งที่ยังต้องให้ Product Owner อนุมัติก่อนเชื่อม Production

หากยังไม่มี Firebase Staging config ให้ Codex ทำส่วนที่ไม่ต้องใช้ credential ต่อได้ และรายงาน checkpoint ที่รอ operator setup โดยไม่ขอ secret ในแชด
