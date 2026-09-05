# Web App Build Starter Guide

Status: Ready for implementation  
Baseline date: 2026-09-05  
Stack: Vite + React + TypeScript + Firebase

## 1. Decision: where to continue

แนะนำให้ใช้การทำงานสองระดับ:

1. **แชดปัจจุบันเป็น Product and Architecture thread** สำหรับตัดสินใจ Scope, Engineering workflow, UX/UI, Role Matrix และอัปเดต Knowledge
2. **เปิด Codex task ใหม่ใน Project/Workspace เดิมสำหรับการเขียนโค้ด** เพื่อให้ build logs, dependency installation, tests และ code review ไม่ปะปนกับประวัติการออกแบบผลิตภัณฑ์

การเปิด task ใหม่ไม่ทำให้บริบทสูญหาย เพราะ `knowledge/README.md` และเอกสารที่เชื่อมโยงเป็น Source of Truth ใน Workspace เดียวกัน ทุก coding task ต้องอ่าน Knowledge ก่อนแก้โค้ด

สามารถพัฒนาต่อในแชดนี้ได้เช่นกัน แต่เมื่อเริ่มมี source code, test failures และหลาย milestone แชดจะยาวและตรวจประวัติยากกว่า แนวทางมาตรฐานจึงให้แชดนี้ทำหน้าที่ Product Owner/Architecture และให้ task ใหม่ทำหน้าที่ Implementation

## 2. Current readiness

พร้อมแล้ว:

- Product and technical knowledge
- Engineering workflow G0–G7
- Design Criteria and FEM architecture
- Multi-project information architecture
- BOQ and preliminary estimate requirements
- Shop Drawing, DXF/PDF/report and Production Release requirements
- Approved Role Matrix v1
- Interactive UX/UI prototype

ยังไม่มี:

- `package.json` และ application source
- Git repository baseline
- Firebase dev/staging/prod configuration
- Auth, Firestore, Storage, Functions and emulator code
- Automated tests and CI
- FEM/export worker implementation

ดังนั้นขั้นถัดไปคือ **Phase 0 — Foundation**, ไม่ใช่การเขียน FEM solver หรือ Drawing generator ทันที

## 3. Source-of-Truth reading order

ทุก implementation task ต้องอ่านตามลำดับนี้ก่อนลงมือ:

1. `knowledge/README.md`
2. `knowledge/PRECAST_WEB_APP_KNOWLEDGE.md`
3. `knowledge/ROLE_PERMISSION_KNOWLEDGE.md`
4. `knowledge/UX_UI_KNOWLEDGE.md`
5. `knowledge/BOQ_ESTIMATE_KNOWLEDGE.md`
6. `knowledge/IMPLEMENTATION_PLAN.md`
7. เอกสารนี้ `knowledge/BUILD_STARTER_GUIDE.md`
8. `knowledge/REVIT_DXF_INTEROP_KNOWLEDGE.md`

เมื่อ Code และ Knowledge ขัดกัน ให้หยุดและเสนอ decision ก่อนเปลี่ยน behavior ที่เกี่ยวกับ engineering safety, approval, revision หรือ production release

## 4. Build sequence

### Step 0 — Preserve the approved baseline

- ใช้โฟลเดอร์ปัจจุบันเป็น workspace root
- เริ่ม Git repository และสร้าง initial baseline หลังตรวจว่าไฟล์ใดต้อง ignore
- เพิ่ม `.gitignore`, `.editorconfig`, `.env.example` และ project conventions
- ห้าม commit Firebase service-account key, API key ที่เป็น secret, solver license หรือไฟล์ลูกค้า
- คงไฟล์ Knowledge และ UX prototype เป็น design references

Exit criteria: workspace มี baseline ที่ย้อนกลับได้และไม่มี secret ถูก track

### Step 1 — Scaffold the application workspace

สร้างโครงสร้าง:

```text
apps/
  web/                 Vite + React + TypeScript
  functions/           Firebase Functions 2nd gen
packages/
  domain/              IDs, roles, state machines and shared types
  schemas/             Runtime validation contracts
  ui/                  Product-specific components and tokens
firebase/
  firestore.rules
  firestore.indexes.json
  storage.rules
  firebase.json
services/
  calculation-worker/  placeholder contract first
  export-worker/       placeholder contract first
```

Baseline tooling:

- pnpm workspace
- strict TypeScript
- React Router
- runtime schema validation
- ESLint and formatting
- Vitest and React Testing Library
- Playwright for critical E2E flows
- Firebase Local Emulator Suite

Exit criteria: clean install, lint, typecheck, unit test and production build pass

### Step 2 — Build the app shell from the approved UX

- Organization and project switcher
- Portfolio
- Project shell and G0–G7 stage rail
- Revision context bar
- Responsive inspector
- Loading, empty, error, offline, stale and forbidden states
- Thai/English-ready labels and numeric/unit formatting

ใช้ `ux-precast-web-app.html` เป็น visual reference แต่แยกเป็น React components ที่ดูแลรักษาได้ ไม่ copy ทั้ง prototype เป็น component เดียว

Exit criteria: user can navigate Portfolio → Project → every stage using fixture data

### Step 3 — Implement Firebase identity and tenant isolation

- Firebase Authentication abstraction
- Organization membership
- Project membership and Role Matrix v1
- `RequireOrganizationMembership`, `RequireProjectMembership` and `Can`
- Firestore and Storage rules
- Emulator tests for cross-organization denial
- Local development seed data; no production credentials required

Exit criteria: every Role Matrix test has an explicit allow/deny result and non-members cannot read project metadata or files

### Step 4 — Implement workflow and approval primitives

- Artifact state machines
- Immutable Revision references
- Approval Request and Approval Inbox
- Separation-of-Duties validation
- server-only approve/lock/issue/release commands
- append-only Audit Timeline
- idempotency keys for authoritative commands

Exit criteria: Engineer can submit; a different Checker can approve; creator self-approval and direct client status writes are denied

### Step 5 — First vertical slice

สร้าง workflow บางแต่ครบวงจรก่อน FEM จริง:

```text
Login fixture
→ Portfolio
→ Create project from Type 2 template
→ Upload sample IFC/PDF metadata
→ Create and approve Design Basis
→ Create mock analytical-model snapshot
→ Run deterministic mock analysis job
→ Generate sample Calculation Report metadata
→ Generate sample P-W03 Drawing metadata
→ Run export preflight fixture
→ Create manifest
→ Technical approval
→ Production release by a distinct user
```

Exit criteria: revision, permission, audit and release architecture works end-to-end with deterministic fixtures

### Step 6 — BIM and engineering authoring

- IFC metadata extraction and GLB preview
- revision comparison and impact events
- engineer-controlled panelization
- openings, joints, supports, lifting anchors and inserts
- Neutral Product/Analysis Model schema
- Design Criteria versioning and validation

Exit criteria: G0–G2 are enforced and model snapshot is deterministic

### Step 7 — FEM integration

- Begin with a verified solver adapter, not a new general FEM solver
- Cloud Function orchestrates; Cloud Run worker executes heavy/native calculation
- benchmark fixtures and known-answer tests
- equilibrium, reaction, mesh-quality and convergence checks
- normalized result schema and result viewer

Exit criteria: G3/G4 pass repeatably against approved benchmark models and independent reference results

### Step 8 — BOQ and preliminary estimate

- model-linked quantity takeoff
- Price Book and effective-date resolution
- waste, indirect, contingency, markup and tax
- technical quantity sign-off and commercial approval
- revision delta and low/base/high range
- XLSX/PDF/CSV/JSON exports

Exit criteria: same immutable inputs reproduce the same quantities/totals and every line traces to elements or documented allowances

### Step 9 — Shop Drawing and professional exports

- Drawing Register and panel drawing generator
- dimensions, reinforcement, embeds, anchors, weight and COG
- DXF R2018 profile plus PDF/A
- Mandatory `REVIT-DRAFTING-01` 2D DXF, sibling PDF/A and JSON manifest for Revit Drafting View
- Validate Model Space, `Z = 0`, units, local origin/extents, semantic layers, fonts and allowed entities
- Calculation PDF/A, DOCX draft and XLSX/CSV tables
- IFC/BVBS adapters where supported
- export preflight, manifest and SHA-256 checksums

Exit criteria: G5–G7 enforce matching revisions and released packages cannot be overwritten

### Step 10 — Pilot and production readiness

- staging Firebase/GCP project
- App Check, IAM, secret management and upload security
- monitoring, retries, backup and retention
- engineering benchmark review
- accessibility and browser tests
- pilot project with real but non-production-critical data first
- security and release checklist before live production use

## 5. Recommended first coding milestone

Milestone name: **M0 Foundation and Secure Workflow Shell**

Include:

- workspace scaffold
- app shell and Portfolio fixture
- Role Matrix types and permission evaluator
- Team and Permissions screen
- Approval Inbox fixture
- Firebase Emulator configuration and rule tests
- one submit/approve flow using local fixtures
- audit event contract
- `REVIT-DRAFTING-01` domain/profile type and deterministic fixture only; no production exporter in M0

Do not include yet:

- production Firebase deployment
- real customer uploads
- full IFC geometry processing
- full FEM solver
- automated Shop Drawing/DXF generation
- commercial pricing release

## 6. M0 definition of done

- Fresh checkout installs with one documented command
- `lint`, `typecheck`, `test` and `build` pass
- No secret or production credential is required
- Cross-tenant and self-approval denial tests pass
- Project route cannot load without membership
- UI matches the approved UX direction at desktop and responsive review widths
- Core state/role/action strings come from shared domain types
- Knowledge links are visible from the repository README
- Known limitations and next milestone are documented

## 7. Prompt for the new implementation task

Use this prompt in a new Codex task inside the same `Precast-Module` project:

> เริ่มพัฒนา M0 — Foundation and Secure Workflow Shell สำหรับ Precast Engineering Web App ใน workspace นี้ ก่อนแก้โค้ดให้อ่าน `knowledge/README.md` และเอกสาร Knowledge ที่ลิงก์ทั้งหมด โดยถือ Role Matrix v1 และ workflow G0–G7 เป็นข้อกำหนดที่อนุมัติแล้ว ตรวจสถานะ workspace ก่อน จากนั้นเสนอรายการไฟล์ที่จะสร้างแบบสั้น ๆ และดำเนินการ scaffold pnpm workspace ที่มี Vite + React + TypeScript, Firebase Functions 2nd gen, shared domain/schema packages, Firebase Emulator configuration, App Shell, Portfolio fixture, Team and Permissions, Approval Inbox, permission guards และ emulator tests สำหรับ tenant isolation/self-approval ห้าม deploy cloud, ห้ามใช้ production credentials และยังไม่สร้าง FEM solver จริง ให้ใช้ deterministic mock analysis fixture แทน รัน lint, typecheck, tests และ production build แก้ปัญหาจนผ่าน แล้วสรุปไฟล์สำคัญ ผลทดสอบ ข้อจำกัด และงาน M1 ที่แนะนำ

## 8. Checkpoints requiring Product Owner approval

ขออนุมัติก่อนดำเนินการเมื่อ:

- เปลี่ยน Role Matrix, Gate หรือ separation-of-duties behavior
- เลือก/เปลี่ยน FEM solver หรือ design code implementation
- เชื่อม production Firebase/GCP project
- เปิดใช้ paid infrastructure หรือ vendor service
- ส่งข้อมูลลูกค้าไปบริการภายนอก
- ออกเอกสาร `Approved`, `For Construction` หรือ `Released to Production`
- เปลี่ยนสูตรราคา, markup, tax หรือ commercial approval policy

การ scaffold, fixture, local emulator, automated test และ refactor ภายในข้อกำหนดที่อนุมัติแล้วสามารถดำเนินการได้โดยไม่ต้องขออนุมัติทีละไฟล์
