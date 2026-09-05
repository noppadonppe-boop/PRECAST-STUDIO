# Precast Engineering Web App — Product and Technical Knowledge

## 1. Objective

ระบบต้องรองรับวงจรงานต่อไปนี้แบบ end-to-end และตรวจสอบย้อนหลังได้:

```text
Architectural model
  → BIM intake and revision check
  → Design basis approval
  → Precast panelization
  → Loads, supports and construction stages
  → Analytical model and FEM
  → Member, joint and anchor design
  → Quantity takeoff, BOQ and preliminary estimate
  → Calculation review
  → Shop drawing generation
  → Export preflight
  → Production release package
```

ระบบเป็น engineering workflow platform ไม่ใช่เพียง 3D viewer และไม่ควรพยายามเป็น generic CAD/FEM program ใน MVP

## 2. Product scope

### In scope

- Multi-organization และ multi-project
- Project templates และ product-family templates
- IFC/PDF/DXF/DWG reference intake
- Revision comparison และ downstream impact tracking
- Design Basis/Design Criteria with approval and locking
- Engineer-controlled panelization
- Material, connection, anchor และ load libraries
- Analysis scenarios: service, demoulding, lifting, transport, storage, installation, final support
- Solver job orchestration and result visualization
- Design checks: panel, reinforcement, opening, joint, anchor, bearing and foundation interface
- Model-linked quantity takeoff, BOQ, price book and preliminary cost estimate
- Calculation report generation
- Shop drawing register and production drawing generation
- Batch export: DXF, PDF/A, DOCX, XLSX/CSV, IFC, BVBS and JSON manifest
- Review, comments, checker approval, release and audit history

### Out of scope for MVP

- เขียน general-purpose FEM solver ใหม่ทั้งหมด
- แก้ไข BIM/CAD แบบอิสระเทียบเท่า Revit หรือ AutoCAD
- Fully automatic panelization without engineer confirmation
- Nonlinear material/contact analysis ทุกกรณี
- Mobile-first engineering authoring
- Direct CNC integration ทุกยี่ห้อ; ให้เริ่มจาก adapter/export profile

## 3. Users and roles

Role Matrix v1 ได้รับอนุมัติเป็น baseline ของ MVP และกำหนดรายละเอียดไว้ใน [ROLE_PERMISSION_KNOWLEDGE.md](./ROLE_PERMISSION_KNOWLEDGE.md)

Core roles ได้แก่ Organization Admin, Project Manager, BIM Coordinator, Structural Engineer, Engineering Checker, QS/Cost Estimator, Detailer และ Production Manager ส่วน Commercial Approver, Site/QA และ External Reviewer เป็น role เสริมตามนโยบายองค์กร

หลักการบังคับ:

- ผู้จัดทำห้าม approve Revision ของตนเอง
- Admin ไม่ได้รับ technical approval capability อัตโนมัติ
- Project role และวันหมดอายุเก็บใน Firestore membership; Custom Claims ใช้เฉพาะ coarse organization/platform role
- Technical approval และ Production Release เป็นคนละ action และต้องถูกตรวจ server-side
- Approved/Released artifact ห้ามแก้ทับ ต้อง supersede ด้วย Revision ใหม่

## 4. Workflow and gates

### Gate G0 — BIM accepted

- Unit, coordinate, level and object identity ผ่าน validation
- Critical issues เป็นศูนย์ หรือมี accepted exception
- Source revision ถูก freeze เป็น immutable reference

### Gate G1 — Design Basis approved

- Design code, loading code and edition ระบุครบ
- `f'c`, `fy`, density, stiffness and durability parameters ระบุหน่วย/แหล่งที่มา
- Handling/transport criteria ครบ
- Checker approved และ version locked

### Gate G2 — Analytical model ready

- Panel IDs, geometry, thickness, materials, offsets and openings ครบ
- Joint stiffness, supports and load path ผ่าน connectivity checks
- Load cases/combinations and stages ผ่าน validation

### Gate G3 — Analysis verified

- Solver completed without unresolved fatal warnings
- Reaction/equilibrium check ผ่าน tolerance
- Mesh and result convergence checks ตาม project policy
- Independent benchmark/sanity checks recorded

### Gate G4 — Design approved

- Strength, serviceability, handling, connections and anchors checked
- `FAIL` เป็นศูนย์
- `NOT CHECKED` ทุกข้อมี disposition
- Checker signs the immutable calculation snapshot

### Gate G5 — BOQ and preliminary estimate reviewed

- Quantity takeoff reconciled with approved model version
- Price Book/effective date/currency and project overrides recorded
- Estimate assumptions, exclusions, waste, indirect cost and uncertainty range disclosed
- Estimate version reviewed or accepted according to project policy

### Gate G6 — Drawing ready

- Drawing geometry and schedules match approved model revision
- Required dimensions, reinforcement, inserts, lifting points, weight and COG complete
- Title block, issue status and approvals complete

### Gate G7 — Production released

- Export preflight passed
- Manifest and checksums generated
- Drawing/calculation/design basis revisions match
- Release package immutable; subsequent changes create a new revision

## 5. Design Basis knowledge

Design Basis ต้องแยกจาก Analysis Settings

### Design Criteria

- Jurisdiction, standards and editions
- Design method, design life and risk category
- Material properties and test-based values
- Loads and load-combination rules
- Strength, serviceability, durability and fire criteria
- Lifting, transport, storage and erection criteria
- Factory, crane, vehicle and tolerance constraints

### Analysis Settings

- Element idealization and shell formulation
- Mesh size and refinement zones
- Stiffness modifiers
- Joint/support spring values
- Linear/nonlinear options
- Solver tolerance and iteration controls
- Result averaging/envelope method

### Minimum material fields

Concrete:

- `fcDemould`, `fcLift`, `fcTransport`, `fc28`
- `density`, `elasticModulus`, `poissonRatio`
- tensile/flexural strength
- creep, shrinkage and thermal coefficient
- cover, exposure and fire rating
- source type: code/default/test/certificate

Reinforcement and connection materials:

- Rebar `fy`, `fu`, `Es`, grade and available sizes
- Mesh/wire properties
- Embedded steel `Fy`, `Fu`
- Bolt grade, weld electrode, anchor product and grout strength

## 6. Analysis architecture

### Authoritative calculation rule

Browser สามารถแสดง preview หรือ quick estimate ได้ แต่ authoritative calculation ต้องเกิดใน controlled backend job พร้อมบันทึก engine version, input hash and output hash

### Neutral Analysis Model

ใช้ versioned schema ที่ไม่ผูกกับ solver ใด solver หนึ่ง:

```ts
interface AnalysisModel {
  schemaVersion: string;
  projectId: string;
  sourceRevisionId: string;
  designBasisVersionId: string;
  modelVersionId: string;
  units: "kN-m-MPa";
  nodes: AnalysisNode[];
  shells: ShellElement[];
  beams: BeamElement[];
  links: LinkElement[];
  materials: MaterialRef[];
  sections: SectionRef[];
  supports: Support[];
  loadCases: LoadCase[];
  loadCombinations: LoadCombination[];
  scenarios: AnalysisScenario[];
}
```

Solver adapter รับ schema นี้และสร้าง input ของ solver ที่เลือก ผลลัพธ์ถูก normalize กลับเป็น result schema กลาง

### Backend job sequence

1. Validate immutable input snapshot
2. Resolve material/library versions
3. Generate analytical topology and mesh
4. Run model-quality checks
5. Execute solver
6. Verify reactions, equilibrium and solver status
7. Normalize results and create envelopes
8. Run code/design checks
9. Render report tables/figures
10. Store artifacts, summary and checksums

Cloud Functions เหมาะกับคำสั่งและ orchestration ส่วน FEM/native CAD exporters ควรแยกเป็น containerized Cloud Run service/job เพื่อควบคุม runtime, native dependencies และ resource profile. Cloud Run Jobs ทำงานแบบ run-to-completion และรองรับ timeout ต่อ task ได้ยาวกว่า request ปกติ: <https://cloud.google.com/run/docs/create-jobs>

## 7. System architecture

```text
Vite + React SPA
  ├─ Firebase Auth
  ├─ Firestore subscriptions/commands
  ├─ Cloud Storage uploads/downloads
  └─ App Check
          │
          ▼
Cloud Functions 2nd gen
  ├─ authorization and workflow commands
  ├─ revision/approval transitions
  ├─ create export/analysis jobs
  └─ notifications and audit events
          │
          ▼
Cloud Run Calculation/Export Workers
  ├─ IFC parser and geometry service
  ├─ mesher and solver adapter
  ├─ design-check engine
  ├─ report renderer
  └─ DXF/PDF/IFC/BVBS exporters
          │
          ▼
Firestore metadata + Cloud Storage artifacts
```

Firebase modular Web SDK เป็น baseline สำหรับ client app: <https://firebase.google.com/docs/web/setup>

## 8. Firestore data model

ใช้ Firestore เก็บ metadata/workflow เท่านั้น ไม่เก็บ mesh, result arrays หรือ binary files ขนาดใหญ่ใน document

```text
organizations/{orgId}
  members/{uid}
  settings/general
  libraries/{libraryId}
  templates/{templateId}
  priceBooks/{priceBookId}
  projects/{projectId}
    members/{uid}
    sourceRevisions/{sourceRevisionId}
    issues/{issueId}
    designBasisVersions/{designBasisVersionId}
    productModelVersions/{modelVersionId}
      elements/{elementId}
      joints/{jointId}
      supports/{supportId}
    loadModelVersions/{loadModelVersionId}
    analysisRuns/{analysisRunId}
      checks/{checkId}
    estimateVersions/{estimateVersionId}
      lines/{estimateLineId}
    calculationReports/{reportId}
    drawingSets/{drawingSetId}
      drawings/{drawingId}
    exportJobs/{exportJobId}
    releasePackages/{releasePackageId}
    auditEvents/{eventId}
```

### Document rules

- IDs generated once and never reused
- Approved/issued/released documents are immutable
- Summary documents may be updated; issued artifacts may not be overwritten
- Store `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
- Store upstream references and hashes on every downstream artifact
- Store status transitions as append-only audit events
- Avoid unbounded arrays; use subcollections and pagination
- Use transaction/batched write for related status transitions and counters; Firestore supports atomic transactions/batched writes: <https://firebase.google.com/docs/firestore/manage-data/transactions>

### Core project document

```ts
interface Project {
  id: string;
  orgId: string;
  code: string;
  name: string;
  productFamilyId?: string;
  status: "active" | "onHold" | "completed" | "archived";
  currentStage: ProjectStage;
  currentSourceRevisionId?: string;
  currentDesignBasisVersionId?: string;
  currentModelVersionId?: string;
  currentApprovedAnalysisRunId?: string;
  currentDrawingSetId?: string;
  currentReleasePackageId?: string;
  assignedUserIds: string[];
  dueAt?: Timestamp;
}
```

### Immutable analysis run

```ts
interface AnalysisRun {
  id: string;
  projectId: string;
  sequence: number;
  status: "queued" | "running" | "passed" | "warning" | "failed" | "cancelled" | "superseded";
  sourceRevisionId: string;
  designBasisVersionId: string;
  modelVersionId: string;
  loadModelVersionId: string;
  engineName: string;
  engineVersion: string;
  inputHash: string;
  outputHash?: string;
  storagePrefix: string;
  summary?: AnalysisSummary;
  initiatedBy: string;
  approvedBy?: string;
}
```

## 9. Cloud Storage structure

```text
organizations/{orgId}/projects/{projectId}/
  source/{sourceRevisionId}/
    architectural.ifc
    reference.pdf
    model.glb
  analysis/{analysisRunId}/
    input/model.json
    solver/input.*
    solver/result.*
    normalized/summary.json
    plots/*.svg
    logs/run.log
  calculations/{reportId}/
    calculation-report.pdf
    calculation-report.docx
    result-tables.xlsx
  estimates/{estimateVersionId}/
    boq.xlsx
    estimate-summary.pdf
    quantity-audit.csv
  drawings/{drawingSetId}/{drawingId}/
    drawing.pdf
    drawing.dxf
    preview.svg
  releases/{releasePackageId}/
    production-package.zip
    manifest.json
    checksums.sha256
```

Cloud Storage Security Rules สามารถตรวจสิทธิ์ path, content type และขนาดไฟล์ได้: <https://firebase.google.com/docs/storage/security>

## 10. State machines

### Design Basis

`draft → submitted → checked → approved → locked → superseded`

### Analysis Run

`queued → validating → meshing → solving → postProcessing → passed|warning|failed`

### Drawing

`draft → internalReview → forApproval → approved → forProduction → superseded`

### BOQ and Estimate

`draft → quantitiesCalculated → priced → reviewed → issued → superseded`

### Release Package

`draft → preflightRunning → preflightFailed|readyForRelease → released → superseded`

การเปลี่ยน Design Basis, source revision, geometry, load model หรือ connection library ต้องสร้าง impact event และ mark ผลลัพธ์ downstream เป็น `outOfDate` จนกว่าจะคำนวณ/ตรวจ/อนุมัติใหม่

## 11. Shop drawing requirements

อย่างน้อยแต่ละ panel drawing ต้องมี:

- Project, element mark, drawing number and revision
- Plan/elevation/sections/details
- Overall and opening dimensions
- Thickness, chamfer, recess and blockout
- Reinforcement by face, direction, bar mark, spacing and cover
- Lifting anchors and permitted lifting configuration
- Embedded plates, sleeves, inserts and MEP penetrations
- Joint/interface details
- Concrete/material/finish/tolerance notes
- Weight, volume and center of gravity
- Designed/checked/approved/issue status
- Source model, design basis and calculation references

## 12. Export formats and professional package

### Shop drawings

- DXF R2018 default; allow organization presets for R2013/R2010
- Vector PDF/A for issued drawings
- SVG or PNG preview for browser only
- DWG only through a licensed/approved conversion adapter

### Calculation package

- PDF/A-2b: issued immutable report
- DOCX: editable draft, never authoritative after approval
- XLSX/CSV: result and schedule tables
- JSON: input/output/audit manifest

### BIM and production

- IFC 4.3 for interoperable model exchange
- GLB for lightweight browser preview
- BVBS for reinforcement data where factory workflow supports it
- XLSX/CSV panel, insert, lifting and bar schedules
- Machine/CNC formats implemented as factory-specific adapters

### DXF preflight

- Units and insertion scale
- Drawing extents and local origin
- Layer naming/profile
- Linetype, lineweight, font and text style
- Closed/open polyline rules
- Duplicate/zero-length entities
- Unsupported spline/hatch/entity types
- Model-space/paper-space policy
- Block names and attributes
- Title block and revision
- Element mark and drawing number uniqueness
- Geometry compared with approved product-model hash

### Release package

```text
PR-2026-0094_Rev-B03/
  01_Calculations/
  02_Shop_Drawings_PDF/
  03_Shop_Drawings_DXF/
  04_Schedules/
  05_BIM/
  manifest.json
  checksums.sha256
```

## 13. Security and audit

- Firebase Authentication establishes identity
- Firestore/Storage Security Rules enforce organization/project membership
- Custom claims may carry coarse roles; project-level rights remain in Firestore
- Approval and release commands execute server-side only
- Admin SDK bypasses Firestore rules, therefore backend services require least-privilege IAM and explicit authorization checks
- Enable App Check for web and verify App Check token on custom backend endpoints: <https://firebase.google.com/docs/app-check/web/custom-resource>
- Never put service-account keys, solver licenses or signing secrets in the client bundle
- Validate upload extension, MIME, size and path; scan external files before processing
- Audit create/update/approve/release/download events where contract requires
- Retain immutable copies of issued artifacts; avoid hard delete for engineering records
- Use the approved action vocabulary: `view`, `comment`, `create`, `editDraft`, `submit`, `review`, `approve`, `release`, `admin`
- Enforce Separation of Duties against the immutable artifact `createdBy`, not only the user's current role list
- Reject suspended/expired project membership and log role/capability changes as append-only audit events
- Direct client transitions to `approved`, `locked`, `issued` and `released` are denied; commands run through shared backend authorization

## 14. Quality and verification

- Unit tests for formulas and state transitions
- Schema/contract tests for every worker adapter
- Firebase Emulator tests for Firestore and Storage rules
- Golden-file regression for DXF/PDF/report layouts
- FEM benchmark problems with known hand calculations
- Cross-check selected models against an independent engineering program
- Reaction/equilibrium and unit checks on every run
- End-to-end test from BIM upload to release package
- Human checker signs real project results before construction/production use

Firebase recommends Local Emulator Suite for local testing, including Security Rules and Functions integration: <https://firebase.google.com/docs/emulator-suite/connect_auth>

## 15. Engineering disclaimer behavior

ทุก issued report ต้องแสดง scope, limitations, unresolved assumptions, design standard/edition, input revision and responsible engineer. UI must not show a green `PASS` for a failure mode that was not evaluated; use `NOT CHECKED` explicitly.
