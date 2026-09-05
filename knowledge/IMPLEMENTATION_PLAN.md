# Vite + React + Firebase — Implementation Plan

แนวทางเริ่มงานจริงและ prompt สำหรับเปิด coding task กำหนดไว้ใน [BUILD_STARTER_GUIDE.md](./BUILD_STARTER_GUIDE.md)

## 1. Recommended repository structure

```text
precast-engineering/
  apps/
    web/                       # Vite + React + TypeScript
    functions/                 # Firebase Functions 2nd gen
  services/
    calculation-worker/        # Cloud Run container
    export-worker/             # DXF/PDF/IFC/BVBS container
  packages/
    domain/                    # types, IDs, enums and state machines
    schemas/                   # runtime validation and versioned contracts
    calculation-contracts/     # neutral model/result schemas
    ui/                        # app-specific design system/components
    testing/                   # fixtures and test helpers
  firebase/
    firestore.rules
    firestore.indexes.json
    storage.rules
    firebase.json
  docs/
    adr/                       # architecture decision records
  knowledge/
  .env.example
```

หากเริ่มเป็น repo เดียว สามารถใช้ `src/` ก่อน แต่ให้รักษา module boundary ตามรายการข้างบนเพื่อแยก frontend, authoritative backend และ native worker

## 2. Frontend modules

```text
src/
  app/               # router, providers, error boundaries
  auth/
  permissions/
  team/
  approvals/
  portfolio/
  projects/
  bim-intake/
  design-basis/
  panelization/
  loads/
  analysis/
  design-checks/
  estimating/
  calculations/
  drawings/
  exports/
  releases/
  libraries/
  audit/
  components/
  firebase/
  domain/
  utils/
```

Feature module ประกอบด้วย route, components, hooks, validators, queries/commands and tests ของตัวเอง

## 3. Route map

```text
/login
/org/:orgId/projects
/org/:orgId/review
/org/:orgId/team
/org/:orgId/audit
/org/:orgId/libraries
/org/:orgId/settings
/org/:orgId/projects/:projectId/overview
/org/:orgId/projects/:projectId/intake
/org/:orgId/projects/:projectId/design-basis/:versionId
/org/:orgId/projects/:projectId/panelization/:modelVersionId
/org/:orgId/projects/:projectId/loads/:loadModelVersionId
/org/:orgId/projects/:projectId/analysis/:analysisRunId
/org/:orgId/projects/:projectId/design/:analysisRunId
/org/:orgId/projects/:projectId/estimates/:estimateVersionId
/org/:orgId/projects/:projectId/calculations/:reportId
/org/:orgId/projects/:projectId/drawings/:drawingSetId
/org/:orgId/projects/:projectId/exports/:exportJobId
/org/:orgId/projects/:projectId/releases/:releasePackageId
```

## 4. Command/query boundary

### Client may write directly when rules permit

- Personal UI preferences
- Draft comments/issues
- Draft non-authoritative form state
- Upload source file to a project-scoped staging path

### Server command required

- Accept/freeze source revision
- Submit/check/approve/lock Design Basis
- Create model revision
- Start/cancel analysis job
- Approve analysis/design checks
- Generate issued calculation report
- Generate export package
- Release/supersede production package
- Assign sequence/document/release numbers

Commands must be idempotent and return the created resource ID plus current state.

### Permission implementation

- Central domain vocabulary comes from `ROLE_PERMISSION_KNOWLEDGE.md`
- `permissions/can.ts` evaluates UI affordance only; it is not authoritative
- `RequireOrganizationMembership` and `RequireProjectMembership` guard routes
- `Can` renders allowed action, disabled-with-reason action, or hides sensitive content
- Cloud Functions call a shared `authorizeCommand()` before any authoritative write
- Authorization checks active membership, expiry, role/capability, source state, immutable hashes and Separation of Duties
- Firestore/Storage Rules deny direct writes to authoritative status fields
- Membership/role changes invalidate client permission cache and refresh ID-token coarse claims when required

## 5. MVP phases

### Phase 0 — Foundation

- Vite React TypeScript app shell
- Firebase projects for dev/staging/prod
- Auth and organization membership
- Firestore/Storage rules with emulator tests
- Design tokens, routing, error boundary and audit primitives

Exit: authorized user can enter own organization; cross-tenant tests deny access.

### Phase 1 — Portfolio and project workflow

- Project CRUD/archive
- Project template
- Members/roles
- Team and Permissions screen using Role Matrix v1
- My Work / Approval Inbox and immutable Approval Snapshot dialog
- Append-only Audit Timeline
- Stage rail, issues and review queue
- Revision context and audit timeline

Exit: multi-project workflow works without calculation logic.

### Phase 2 — BIM Intake and Design Basis

- Resumable upload and file validation
- IFC metadata/preview worker
- Source revision and compare summary
- Design Basis forms, inheritance, approval and locking

Exit: G0/G1 gates enforced server-side.

### Phase 3 — Product model and panelization

- Viewer selection
- Panel split/merge and properties
- Openings, joints, anchors, inserts and supports
- Weight/COG and factory constraints
- Immutable product-model versions

Exit: exported neutral product model is deterministic.

### Phase 4 — Loads and analysis orchestration

- Scenario/load/support editor
- Neutral analysis schema
- Job queue/status/logs
- Stub solver first, then verified solver adapter
- Result normalization, contour/result probe and equilibrium check

Exit: benchmark model returns repeatable verified results.

### Phase 5 — Design checks

- Panel/reinforcement/opening checks
- Joint/anchor/lifting/transport checks
- Governing combination and utilization
- Checker review and immutable approval snapshot

Exit: G3/G4 rules and `NOT CHECKED` handling implemented.

### Phase 6 — BOQ and Preliminary Estimate

- Model-linked quantity takeoff and audit trace
- Price Book, rate source/effective date and unit validation
- Waste, indirect, contingency, markup and tax rules
- Estimate revision/delta and low/base/high range
- BOQ XLSX, estimate PDF and audit CSV/JSON

Exit: the same immutable snapshots reproduce the same quantities/totals and every model-derived line traces to element IDs.

### Phase 7 — Calculation and Shop Drawing

- Professional calculation report template
- Drawing register and panel drawing generator
- Preview/markup/revision compare
- PDF/A, DOCX and spreadsheet outputs
- Neutral drawing/export profile contracts, including `REVIT-DRAFTING-01`

Exit: report/drawing references match the approved upstream revisions.

### Phase 8 — Export and Production Release

- `PC-FAB-DXF-01` and mandatory `REVIT-DRAFTING-01` DXF profiles and preflight
- Batch export jobs
- IFC/BVBS/schedules adapters
- Package manifest and SHA-256 checksums
- Release/supersede workflow and history
- Revit import verification fixtures and optional Native Revit add-in adapter backlog

Exit: G5/G6 gates enforced; released package cannot be overwritten.

## 6. Initial backlog

### Must have

- Auth and tenant isolation
- Project/revision/stage model
- Design Basis versioning and approval
- File storage and metadata
- Job model and background status
- Immutable analysis/drawing/release references
- DXF and report export specification
- Revit Drafting View manifest/profile schema and deterministic fixture
- Security-rule tests and audit events

### Should have

- IFC/GLB preview
- Revision compare
- Template inheritance
- Drawing register
- Preflight rule engine
- Review comments and notifications

### Later

- Automated panelization suggestions
- Advanced nonlinear/local FEM
- Optimization by mold/weight/cost
- Factory MES/CNC adapters
- AI-assisted issue classification and drafting

## 7. Core TypeScript enums

```ts
type ProjectStage =
  | "intake"
  | "designBasis"
  | "panelization"
  | "loads"
  | "analysis"
  | "design"
  | "estimate"
  | "calculation"
  | "drawingExport"
  | "productionRelease";

type GateState =
  | "notStarted"
  | "inProgress"
  | "needsAttention"
  | "readyForReview"
  | "approved"
  | "outOfDate"
  | "superseded";

type CheckStatus = "pass" | "warning" | "fail" | "notChecked";
type IssueStatus = "open" | "answered" | "acceptedException" | "closed";
```

## 8. Environment and configuration

- Do not commit `.env.local`, service-account JSON, signing keys or solver licenses
- Browser Firebase config is not a secret, but Security Rules and App Check remain required
- Use separate Firebase/GCP projects for dev, staging and production
- Store public client config in Vite `VITE_...` variables only
- Keep server secrets in managed secret storage
- Pin schema version and engine/exporter version on every job

## 9. Testing strategy

### Frontend

- Unit tests for formatters, units and validation
- Component tests for forms, gates, permissions and async states
- Accessibility tests for keyboard/forms/dialogs
- E2E tests for critical workflows

### Firebase

- Emulator tests for every role/path/action
- Test cross-organization denial
- Test unauthorized approval/release denial
- Test atomic status transition and idempotency
- Test every Role Matrix v1 action for allow/deny, including expired/suspended membership
- Test self-approval denial and distinct technical-approval/production-release actors
- Test client writes cannot set `approved`, `locked`, `issued` or `released`

### Calculation/export

- Schema contract tests
- Known-answer engineering benchmark tests
- Golden files for DXF layers/entities and PDF layout
- Compare output hashes for deterministic fixtures
- Corrupt/oversize/untrusted upload tests
- Worker timeout/retry/cancellation tests

## 10. Definition of Done for an engineering feature

- Domain schema and migration/version policy defined
- Permission matrix and Security Rules implemented/tested
- Loading, empty, error, stale, offline and forbidden states exist
- Audit event created for authoritative state change
- Upstream/downstream revision linkage visible
- Unit/precision policy tested
- Backend validates all client input again
- Calculation/export output includes engine/schema version and hashes
- UX acceptance criteria and E2E happy/error paths pass
- Thai/English labels and technical symbols render correctly
- Engineer/checker has reviewed the workflow with a representative project

## 11. First implementation milestone

Build a thin vertical slice before full FEM:

```text
Login
→ Portfolio
→ Create project from Type 2 template
→ Upload IFC/PDF
→ Create and approve Design Basis
→ Create mock analysis job with immutable snapshot
→ Generate sample Calculation PDF and P-W03 DXF/PDF
→ Run preflight
→ Create manifest and production release package
```

This milestone validates tenant security, revision traceability, job orchestration and export workflow before investing in advanced geometry/FEM functionality.
