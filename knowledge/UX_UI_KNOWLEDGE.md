# Precast Engineering Web App — UX/UI Knowledge

## 1. UX objective

UX ต้องทำให้ผู้ใช้ตอบคำถามสามข้อได้ตลอดเวลา:

1. ตอนนี้กำลังทำโครงการ/Revision ใด
2. ขั้นตอนนี้ผ่าน Gate แล้วหรือยัง และติดอะไร
3. ผลลัพธ์นี้อ้างอิง Design Basis, model และ calculation run ใด

ระบบต้องให้ความสำคัญกับ correctness, traceability และ reviewability มากกว่าความรวดเร็วเพียงอย่างเดียว

## 2. Navigation model

### Organization level

- Portfolio
- My work / Review queue
- Product templates
- Material/load/joint/anchor libraries
- Export presets
- Team and permissions
- Audit and system settings

### Project level

```text
1 BIM Intake
2 Design Criteria
3 Panelization
4 Loads & Supports
5 FEM Analysis
6 Design Checks
7 BOQ & Estimate
8 Calculation Report
9 Drawing & Export
10 Production Release / History
```

ทุกขั้นตอนแสดงสถานะ `Not started`, `In progress`, `Needs attention`, `Ready for review`, `Approved`, `Out of date` หรือ `Superseded`

## 3. App shell

Desktop engineering workspace ใช้โครงสร้าง:

```text
┌──────────────┬──────────────────────────────────────────────┐
│ Organization │ Project / Revision / Stage / User actions   │
│ Portfolio    ├──────────────────────────────┬───────────────┤
│ Project      │ Main viewer / editor         │ Inspector     │
│ Stage rail   │ 2D / 3D / report / drawing  │ Properties    │
│              │                              │ Checks        │
│              ├──────────────────────────────┴───────────────┤
│              │ Status, validation, job progress, summary    │
└──────────────┴──────────────────────────────────────────────┘
```

- Left rail: app scope, current project and stages
- Top bar: project code, source revision, Design Basis revision, calculation status and current user
- Main area: dominant working surface
- Right inspector: selected object/setting/result only
- Bottom status: units, selection, warnings and asynchronous job progress

## 4. Portfolio screen

### User goal

เห็นทุกโครงการ งานรอตรวจ และ production release โดยไม่ต้องเปิดทีละโครงการ

### Required content

- Project name/code/product family
- Current stage and gate status
- Source/model/design-basis revisions
- Assigned engineer/checker
- Due date and last update
- Open critical issues
- Drawing/export/release state
- Search, status filter and assignee filter

### Primary actions

- Create project from template
- Open project
- Open review queue

### Avoid

- Generic KPI ที่ไม่มี action
- Progress percentage ที่ไม่สัมพันธ์กับ gate จริง
- แสดง `100%` หากยังไม่ approved/released

## 4A. Team and Permissions screen

หน้าจอนี้ใช้ Role Matrix v1 จาก [ROLE_PERMISSION_KNOWLEDGE.md](./ROLE_PERMISSION_KNOWLEDGE.md) และเข้าถึงได้เฉพาะ Organization Admin; Project Manager เปิดดูสมาชิกโครงการและเสนอการเปลี่ยนแปลงได้ตาม policy

### Required content

- รายชื่อผู้ใช้ สถานะ Active/Invited/Suspended, Organization role และจำนวนโครงการ
- Project role chips, effective date, expiry date และ explicit capabilities
- Filter ตาม role, project และ status
- Role explanation panel ที่แสดงสิทธิ์สูงสุดและข้อจำกัด Separation of Duties
- Project Access drawer สำหรับเพิ่ม/ลด role และ capability
- Role change preview: ก่อน/หลัง, โครงการที่ได้รับผล, active approval assignments และคำเตือน conflict
- `Suspend access` แทนการลบประวัติผู้ใช้ออกจากเอกสารวิศวกรรม

### Permission behavior

- แสดงปุ่มแบบ disabled พร้อมเหตุผลเมื่อผู้ใช้ควรเข้าใจ workflow แต่ไม่มีสิทธิ์ดำเนินการ
- ซ่อนข้อมูล/ปุ่มเมื่อการแสดงผลจะเปิดเผยโครงการหรือข้อมูลที่ไม่มีสิทธิ์
- เตือนเมื่อ assignment ทำให้ผู้ใช้เป็นทั้ง author และ checker ของ active artifact
- บังคับ comment เมื่อ override policy หรือมอบ delegated capability

## 4B. My Work and Approval Inbox

แบ่งรายการเป็น `Needs my action`, `Submitted by me`, `Returned` และ `Recently decided`

แต่ละรายการแสดง Project, Artifact, Revision, Author, Requested action, Due date, Gate และ blocking conditions พร้อมลิงก์เปิด immutable review snapshot

Approval dialog ต้องแสดง:

- การกระทำที่กำลังลงนาม: Review, Approve, Issue หรือ Release
- Source/Design Basis/Model/Analysis/Drawing/Estimate revisions
- Snapshot hash และ current/out-of-date state
- Author, reviewer และผล Separation-of-Duties check
- Blocking errors, unresolved issues และ preflight state
- Comment; บังคับกรอกเมื่อ Return for Correction หรือใช้ exception policy

## 5. BIM Intake and Revision Compare

### Main area

- Upload source model with progress and file metadata
- 3D/2D preview
- New vs previous revision overlay
- Added/removed/modified object list
- Unit, coordinate, level, duplicate and opening validation

### Inspector

- Selected object identity and source `GlobalId`
- Change classification
- Issue/accept exception action

### Gate behavior

- Critical error blocks acceptance
- Accepted exception requires reason and responsible user
- Accepted revision becomes immutable

## 6. Design Criteria screen

Use tabs; do not create one extremely long form:

- Codes & units
- Concrete
- Reinforcement/connections
- Loads & combinations
- Serviceability/durability/fire
- Handling/transport/erection
- Analysis settings
- Approval and history

### Header summary

- Design Basis ID and status
- Design/loading standards and editions
- `fc28`, `fcLift`, `fy`, density
- Unit system
- Approved by/date

### Field behavior

- Show value, unit, source and inheritance level
- Show company default vs project override
- Override requires reason
- Test-based value links to certificate/report
- Invalid range is error; unusual but allowable value is warning
- Changing an approved value creates a new revision, never edits the locked revision

### Primary action

`Submit for check` or `Approve & lock` according to role

## 7. Panelization workspace

### Main tools

- Select architectural surfaces
- Mark structural/non-structural
- Split/merge panel
- Place/edit opening and blockout
- Assign type, thickness and material
- Place joint, embedded item, lifting anchor and transport support
- Show factory/crane/transport constraints

### Visual encoding

- Neutral surfaces by default
- One stable accent for selection
- Distinct overlay for warnings and failures
- IDs displayed only at useful zoom level
- Color never communicates status alone; pair with icon/text

### Inspector

- Panel mark/type/dimensions/thickness/material
- Weight, volume and COG
- Upstream object IDs
- Joint/anchor/inserts
- Manufacturing constraints and validation

## 8. Loads & Supports screen

- Scenario picker: service/demould/lift/transport/storage/installation/final
- Load cases and combinations list
- Direct load editing with unit-aware inputs
- Support/joint activation by scenario
- Clear local/global axis indicator
- Load visualization and resultant summary
- Validation for unsupported nodes, disconnected elements and missing load paths

Design Criteria defines the rule/value source; this screen defines where and how loads/supports act on geometry.

## 9. FEM Analysis screen

### Before run

- Immutable input summary
- Analysis model version and Design Basis version
- Mesh statistics and quality warnings
- Solver/engine version
- Estimated job type, not an unreliable fake duration

### During run

- Job phases: validate, mesh, solve, post-process, checks, artifacts
- Logs summarized; technical log downloadable by authorized users
- Cancel only while safe; keep cancelled run record

### Result UX

- Scenario/case/combination selector
- Result type and component selector
- Deformed/undeformed toggle
- Contour scale with unit and min/max
- Probe selected location
- Reactions and equilibrium panel
- `PASS/WARNING/FAIL/NOT CHECKED`
- Link every check to input, formula/rule reference and result location

## 10. Design Checks screen

- Element register grouped by panel/floor/roof/joint/anchor
- Envelope utilization and governing combination
- Reinforcement proposal and editable zones
- Opening/local reinforcement
- Lifting/transport checks
- Connection/anchor checks
- Bulk review without hiding individual exceptions
- Filters for fail/warning/not checked

Changing reinforcement/detail creates a new design revision and re-runs affected checks.

## 11. BOQ & Preliminary Estimate screen

### User goal

เห็นว่าปริมาณมาจากชิ้นงานใด ใช้อัตราราคาใด และแบบ/ราคาเปลี่ยนแล้วกระทบต้นทุนเท่าใด

### Header context

- Estimate ID/revision/status/maturity
- Product model, Design Basis and calculation revisions
- Price Book revision/effective date/currency
- `Current` หรือ `Out of date`
- Preliminary uncertainty range

### Main tabs

- Quantity Takeoff
- Cost Summary
- Assumptions & Exclusions
- Revision Comparison
- Export

### Quantity Takeoff table

- Cost code/category/description
- Element trace and source type
- Raw quantity, waste and payable quantity
- Unit, unit rate, price source and amount
- Missing/expired/override/approved status

เลือก BOQ line แล้วต้อง highlight ชิ้นงานที่เกี่ยวข้องในโมเดล; เลือก panel แล้วกรองรายการ BOQ ที่สัมพันธ์กัน

### Summary and estimate behavior

- Direct material/manufacturing/logistics/installation split
- Indirect cost, contingency and markup shown separately
- Cost per module/panel/m²/project
- Low/base/high range
- Top cost drivers
- Missing rate must never appear as zero without an explicit warning
- Manual quantity/rate override requires reason and reviewer

รายละเอียดเต็มอยู่ใน `BOQ_ESTIMATE_KNOWLEDGE.md`

## 12. Calculation Report screen

### Standard report structure

1. Cover and document control
2. Scope and limitations
3. Codes and Design Criteria
4. Materials
5. Loads and combinations
6. Analytical model and assumptions
7. Model verification/mesh/equilibrium
8. Analysis results
9. Panel and reinforcement checks
10. Joint, anchor and bearing checks
11. Lifting, transport and erection checks
12. Conclusions and unresolved items
13. Appendices and result tables

### UX

- Report outline on left or as compact navigator
- Page preview in center
- Included sections and issue status in inspector
- Every figure/table has source calculation run
- `DOCX` marked Draft/Editable
- `PDF/A` marked Issued/Immutable after approval
- Checker comments anchored to section/page

## 13. Drawing & Export Center

Use one center with five subviews:

1. Drawing Register
2. Shop Drawing Preview
3. Calculation Report Preview
4. Export Configuration
5. Package Manifest and History

### Drawing Register columns

- Drawing number
- Panel mark/type
- Sheet and revision
- Status
- Geometry/model revision
- Design Basis and calculation run
- Designer/checker/approver
- Preflight status
- Last export/release

### Shop Drawing Preview

- Vector preview with layers
- Sheet/title block and print preview
- Layer visibility
- Dimension/annotation validation
- Revision clouds and markup
- Compare current vs previous revision
- Jump from drawing object to 3D panel

### Export Configuration

Organization-managed presets:

- `Factory Standard`
- `Revit Drafting View · REVIT-DRAFTING-01`
- `Consultant Submission`
- `Archive Package`
- Optional client/factory-specific profiles

Fields:

- Output formats
- DXF version
- Units and local/global origin
- Layer mapping, text style, linetype and block profile
- Paper size, scale and title-block profile
- File naming pattern and folder structure
- IFC export view/version
- Include/exclude preview and source data
- Target application/workflow and validation profile version
- For Revit Drafting View: intended scale, `Z = 0`, Model Space, border option, semantic layer mapping and font fallback

### Supported format choices

| Deliverable | Recommended formats |
|---|---|
| Shop drawing | DXF R2018, vector PDF/A, SVG preview |
| Revit Drafting View | 2D DXF using `REVIT-DRAFTING-01` + sibling PDF/A + JSON manifest |
| Calculation | PDF/A-2b, DOCX draft, XLSX/CSV result tables, JSON manifest |
| BIM/model | IFC 4.3, GLB preview |
| Production | BVBS, XLSX/CSV schedules, factory-specific adapter |
| Archive | ZIP + `manifest.json` + SHA-256 checksums |

### DXF Preflight panel

- Units/insertion scale
- Extents/origin
- Layer profile
- Text fonts/styles
- Unsupported entities
- Open polylines/duplicate/zero-length entities
- Blocks/attributes
- Title block, panel mark and revision
- Geometry hash against approved product model
- Revit checks: Model Space, `Z = 0`, explicit units, local origin/extents, entity whitelist, no XREF/proxy object and sibling PDF/hash match

Display exact issue location and remediation. Do not provide a green `Ready` state if any release-blocking check failed.

### Generate Package interaction

```text
Configure preset
  → Preview affected files
  → Run preflight
  → Review warnings
  → Generate immutable package
  → Checker/approver confirmation
  → Release to Production
```

Generation runs asynchronously. UI shows file count and phases, not a blocking spinner.

## 14. Production Release screen

- Release package ID, revision and status
- Included drawings/calculations/schedules/BIM
- Manifest and checksums
- Approved Design Basis/model/calculation links
- Released by/date and recipient/production queue
- Supersede action creates a new package; no silent replacement
- Download permissions and download audit where required

## 15. Global components

| Component | Responsibility |
|---|---|
| `AppShell` | Organization/project navigation and responsive layout |
| `ProjectStageRail` | Gate states and out-of-date indicators |
| `RevisionContextBar` | Source, Design Basis, model, calc and drawing revisions |
| `EngineeringViewer` | 2D/3D/contour/drawing visual surface |
| `PropertyInspector` | Selected object or setting only |
| `UnitField` | Numeric value + unit + conversion + validation |
| `SourceValue` | Value inheritance and source traceability |
| `GateStatus` | Required checks and blocking reasons |
| `IssuePanel` | Comments, severity, owner and disposition |
| `ApprovalBar` | Submit/check/approve/lock actions by role |
| `PermissionBoundary` | ซ่อนหรือ disable content/action ตาม permission พร้อมเหตุผล |
| `RoleAssignmentDrawer` | กำหนด Project roles, capabilities และวันหมดอายุ |
| `ApprovalInbox` | งานที่ต้อง review/approve/issue/release ของผู้ใช้ปัจจุบัน |
| `ApprovalSnapshotDialog` | แสดง immutable snapshot, hash, upstream revisions และ SoD validation ก่อนยืนยัน |
| `AuditTimeline` | Append-only event history พร้อม actor, action, revision และ hash |
| `JobProgress` | Server job phases, status and safe retry/cancel |
| `QuantityTakeoffTable` | Traceable raw/waste/payable quantities and linked elements |
| `PriceSourceEditor` | Unit rate, effective date, hierarchy and override reason |
| `CostSummary` | Direct/indirect/contingency/markup and uncertainty range |
| `EstimateRevisionDiff` | Quantity, rate and total deltas between revisions |
| `DrawingRegister` | Drawing lifecycle and bulk operations |
| `DocumentPreview` | PDF/drawing/report preview and markup |
| `ExportPresetForm` | Format/profile/naming configuration |
| `PreflightResults` | Blocking errors and actionable warnings |
| `PackageManifest` | Files, revisions, hashes and release state |

## 16. Interaction and validation rules

- Primary action per screen is singular and specific
- Destructive/supersede actions require confirmation and impact summary
- Approval actions show the exact immutable snapshot being signed
- Async jobs survive navigation and appear in a global job center
- Autosave draft edits; approvals and releases are explicit commands
- Warn before leaving fields with invalid unit/value
- Never silently convert or round engineering values
- Show precision policy and display/storage units separately
- Empty, loading, error, offline, stale and permission-denied states are designed explicitly
- Retry must be idempotent and must not create duplicate release numbers
- Role-aware UI never assumes authorization from a hidden/visible button; every command handles server denial
- Role or membership changes invalidate cached permissions and refresh actionable screens
- Approved/Released content opens read-only with `Create new revision` or `Supersede` instead of edit

## 17. Design system direction

- Professional industrial aesthetic; restrained neutral surfaces with one accent color
- Use status colors only for semantic meaning
- Typography optimized for Thai/English mixed text and tabular numerals
- 8 px spacing system; dense mode available for registers and engineering forms
- Minimum pointer target suitable for touch, while desktop remains compact
- High-contrast focus and keyboard navigation
- Dark/light theme; technical drawing preview may use a fixed paper theme when printing
- Units aligned consistently; numeric inputs use tabular figures

## 18. Responsive behavior

- Primary authoring target: desktop 1280 px and above
- 1024 px: inspector may collapse into drawer
- Tablet: review, markup and approval supported; complex panelization limited
- Mobile: portfolio, notifications, review summary and downloads; no dense FEM/CAD editing requirement in MVP
- Never scale drawings until text becomes unreadable; provide zoom/pan and fit-to-sheet

## 19. Accessibility

- Semantic buttons, labels, tables and dialogs
- Full keyboard navigation for forms/registers
- Visible focus states
- Status represented by text/icon as well as color
- `aria-live` for job/status completion, not for every progress tick
- Drawing/contour preview includes a textual result summary
- Respect reduced-motion preferences

## 20. UX acceptance criteria

- User reaches any active project and current gate in at most three interactions
- Current revision context remains visible on every project screen
- System blocks analysis if Design Basis is not approved according to policy
- System exposes why a calculation/drawing is out of date
- User can find every `FAIL`, `WARNING` and `NOT CHECKED` without inspecting the model manually
- DXF preflight identifies units, layer and unsupported-entity problems before release
- Generated package shows formats, filenames, versions and checksums before release
- Revit-targeted package is labelled `Revit-ready CAD import`, shows intended scale/profile, and never implies Native Revit elements
- Failed `REVIT-DRAFTING-01` preflight blocks release
- Issued Calculation PDF and Shop Drawing reference the same approved calculation/design revisions
- Release operation cannot overwrite an earlier issued package
- Permission-denied users never see engineering files outside their organization/project membership
- Engineer cannot approve their own Design Basis, Analysis, Calculation or Drawing revision
- Production Release shows separate Technical Approval and Release actors
- Suspended/expired users lose access without removing their historical attribution
- Audit Timeline links every approval/release to its immutable artifact snapshot
