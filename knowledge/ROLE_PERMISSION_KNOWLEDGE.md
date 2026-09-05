# Role and Permission Matrix v1

Status: **Approved**  
Approved by: Product Owner  
Approval date: 2026-09-05  
Applies to: Vite + React + TypeScript + Firebase MVP

## 1. Objective

ระบบสิทธิ์ต้องรองรับหลายองค์กรและหลายโครงการ โดยแยกผู้จัดทำ ผู้ตรวจ ผู้อนุมัติ และผู้ส่งผลิตออกจากกัน เพื่อป้องกัน self-approval ควบคุม Revision และทำให้ทุกการเปลี่ยนสถานะตรวจสอบย้อนหลังได้

หลักการ:

- Deny by default
- Least privilege
- Organization role แยกจาก Project role
- หนึ่งผู้ใช้มีหลาย Project role ได้ แต่ยังต้องผ่าน Separation of Duties ราย Revision
- การเป็น Admin ไม่ทำให้มีสิทธิ์อนุมัติงานวิศวกรรม
- Approved/Released artifact เป็น immutable; การแก้ไขต้องสร้าง Revision ใหม่
- UI permission เป็นเพียงการสื่อสาร; Firestore/Storage Rules และ backend command เป็นผู้บังคับสิทธิ์จริง

## 2. Core human roles

| Role key | Display name | Scope | Primary responsibility |
|---|---|---|---|
| `orgAdmin` | Organization Admin | Organization | สมาชิก สิทธิ์ Template, Library, Price Book policy และ Organization settings |
| `projectManager` | Project Manager | Project | สร้างโครงการ จัดทีม Milestone Gate และการออกเอกสารด้านบริหาร |
| `bimCoordinator` | Architect / BIM Coordinator | Project | Upload/compare แบบสถาปัตย์ จัดการ Grid/Level/Opening และตอบ Design Issue |
| `structuralEngineer` | Structural Engineer | Project | Design Criteria, Panelization, Loads, FEM, Design Check และ quantity technical sign-off |
| `engineeringChecker` | Checker / Engineering Approver | Project | Independent technical review และ approval ของ immutable engineering snapshot |
| `costEstimator` | QS / Cost Estimator | Project | Quantity mapping, Price Book resolution, waste/indirect/contingency/markup และ estimate |
| `detailer` | Detailer / Drafter | Project | Shop Drawing layout, dimensions, marks, schedules และ draft export |
| `productionManager` | Production Manager | Project/Factory | รับ Released Package จัดคิวผลิต Acknowledge และเปิด Production Issue |

## 3. Optional roles

| Role key | Purpose |
|---|---|
| `commercialApprover` | อนุมัติ Rate, Markup, Estimate และเอกสารราคาที่ออกภายนอก; MVP อาจมอบสิทธิ์นี้ให้ Project Manager แยกต่างหาก |
| `siteQa` | Inspection, NCR, installation, handover และ As-built |
| `externalReviewer` | ดู Comment และ Download เฉพาะ issued content ที่ถูกแชร์ |
| `vendorContributor` | Upload quotation/certificate ในพื้นที่จำกัดโดยไม่มีสิทธิ์เห็น Calculation หรือราคาอื่น |

`systemWorker` เป็น service identity ไม่ใช่ human role ใช้รัน Calculation/Export jobs และเขียนผลลัพธ์ตาม job scope เท่านั้น ไม่มีสิทธิ์ approve หรือ release แทนบุคคล

## 4. Standard actions

| Action | Meaning |
|---|---|
| `view` | ดู metadata และ content ที่ได้รับอนุญาต |
| `comment` | Comment, markup หรือเปิด Issue |
| `create` | สร้าง Draft/Revision ใหม่ |
| `editDraft` | แก้ไขเฉพาะ Draft ที่ไม่ถูก lock |
| `submit` | ส่ง immutable snapshot เข้าสู่ review |
| `review` | ตรวจ Return for Correction หรือบันทึก disposition |
| `approve` | อนุมัติและ lock snapshot |
| `release` | ออกเอกสารหรือส่ง Production Package |
| `admin` | จัดการสมาชิก Role policy และค่าองค์กร |

## 5. Capability matrix

Legend: `V` view, `C` create/edit draft, `S` submit, `Q` review, `A` approve/lock, `R` release, `—` no access. สิทธิ์ที่ระบุเป็นเพดาน; project policy และ artifact state สามารถจำกัดเพิ่มได้

| Module/action | Org Admin | PM | BIM | Engineer | Checker | QS | Detailer | Production |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Organization users/settings | A | V | — | — | — | — | — | — |
| Project setup/members | C | C | V | V | V | V | V | V |
| Source/BIM revision | V | V/A | C/S | V/A | V | V | V | — |
| Design Basis | V | V | V/Q | C/S | Q/A | V | V | — |
| Panelization, loads, supports | V | V | V/Q | C/S | Q/A | V | V | — |
| FEM and design checks | V | V | V | C/S | Q/A | V | V | — |
| Quantity takeoff | V | V | V | Q/A | V | C/S | V | — |
| Price/rate/estimate | V | A* | — | V | V | C/S | V | — |
| Shop Drawing | V | V | V/Q | Q | Q/A | V | C/S | V |
| Draft export | V | V | V | C | C | C | C | V |
| Calculation/drawing issue | V | R* | V | S | A | S | S | V |
| Production package | V | V/R* | — | V | A | V | V | R |
| Project audit | V | V | own/project | project | project | project | project | release scope |

`*` PM ต้องได้รับ capability `commercialApprove` หรือ `productionRelease` โดยชัดเจน ไม่ได้มาจากตำแหน่ง PM อัตโนมัติ

## 6. Stage ownership and dual control

| Artifact/transition | Author | Technical or commercial approval | Final release |
|---|---|---|---|
| BIM Revision | BIM Coordinator | Structural Engineer accepts structural suitability | Project Manager freezes G0 |
| Design Basis | Structural Engineer | Engineering Checker | lock automatically after approval |
| FEM/Design snapshot | Structural Engineer | Engineering Checker | — |
| BOQ quantities | System + QS | Structural Engineer validates model quantities | — |
| Rates/Estimate | QS | Commercial Approver or delegated PM | PM issues commercial document |
| Shop Drawing | Detailer | Structural Engineer reviews detailing; Checker gives final technical approval | — |
| Calculation Report | System from approved snapshot | Engineering Checker | Project Manager issues |
| Production Package | System composes approved artifacts | Engineering Checker confirms technical completeness | Production Manager releases |

## 7. Separation-of-Duties rules

Server-side transition must reject when any condition fails:

1. `actorUid === artifact.createdBy` and action is `approve` for Design Basis, Analysis, Calculation or Drawing
2. Current user lacks active membership for the artifact organization/project
3. Required project role or explicit capability is missing or expired
4. Artifact is not in the required source state
5. Required upstream Revision/Hash is stale, superseded or mismatched
6. Blocking Issue, `FAIL`, unresolved `NOT CHECKED` or failed preflight remains
7. Production Release lacks both technical approval and a distinct release actor
8. Issued/Released artifact is being updated rather than superseded

For a very small organization, an explicit `smallTeamException` policy may allow one person to hold several roles, but never approve their own artifact. Exception use must be shown in the approval dialog and audit event.

## 8. Firebase authorization model

Use Firebase Authentication for identity. Keep only coarse organization/platform flags in Custom Claims because claims are intended for access control, must be set from a privileged server environment, and have a 1,000-byte size limit: <https://firebase.google.com/docs/auth/admin/custom-claims>

```text
organizations/{orgId}/members/{uid}
organizations/{orgId}/projects/{projectId}/members/{uid}
organizations/{orgId}/roleTemplates/{roleTemplateId}
organizations/{orgId}/projects/{projectId}/approvalPolicies/{policyId}
organizations/{orgId}/projects/{projectId}/approvalRequests/{requestId}
organizations/{orgId}/projects/{projectId}/auditEvents/{eventId}
```

```ts
type ProjectRole =
  | "projectManager"
  | "bimCoordinator"
  | "structuralEngineer"
  | "engineeringChecker"
  | "costEstimator"
  | "detailer"
  | "productionManager"
  | "commercialApprover"
  | "siteQa"
  | "externalReviewer";

interface OrganizationMember {
  uid: string;
  orgId: string;
  orgRoles: Array<"orgAdmin">;
  status: "invited" | "active" | "suspended";
  joinedAt?: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

interface ProjectMember {
  uid: string;
  projectId: string;
  roles: ProjectRole[];
  capabilities: string[];
  status: "active" | "suspended";
  effectiveFrom: Timestamp;
  expiresAt?: Timestamp;
  invitedBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

interface ApprovalRequest {
  id: string;
  artifactType: "sourceRevision" | "designBasis" | "analysis" | "estimate" | "calculation" | "drawingSet" | "releasePackage";
  artifactId: string;
  artifactRevision: string;
  snapshotHash: string;
  requestedAction: "review" | "approve" | "issue" | "release";
  requiredRole: ProjectRole;
  assignedTo?: string;
  status: "open" | "inReview" | "approved" | "returned" | "cancelled" | "superseded";
  requestedBy: string;
  requestedAt: Timestamp;
  decidedBy?: string;
  decidedAt?: Timestamp;
  decisionComment?: string;
}
```

Firestore and Storage Rules check `request.auth.uid`, active membership, artifact path and allowed draft fields. Server/Admin SDK bypasses Firestore Rules, so every Cloud Function/Cloud Run command must call a shared authorization service and use least-privilege IAM: <https://firebase.google.com/docs/firestore/security/rules-conditions>

## 9. Frontend permission guards

```ts
type PermissionContext = {
  userId: string;
  orgId: string;
  projectId: string;
  roles: ProjectRole[];
  capabilities: string[];
  artifactStatus?: string;
  artifactCreatedBy?: string;
  isCurrentRevision?: boolean;
};

can("editDraft", "designBasis", context);
can("approve", "analysis", context);
can("release", "productionPackage", context);
```

Required UI layers:

- `RequireOrganizationMembership` route guard
- `RequireProjectMembership` route guard
- `Can` component/hook for actions and fields
- disabled action with visible reason when the user may understand the workflow but cannot act
- hidden action only when showing it would disclose inaccessible data
- server error remains authoritative even if client state says allowed
- permission cache invalidates when membership, project policy or token claims change

## 10. Approval and audit events

Every authoritative action writes an append-only event containing:

- `orgId`, `projectId`, artifact type/id/revision
- action and state before/after
- actor UID, effective roles and delegated capabilities
- timestamp, request ID and idempotency key
- snapshot/input/output hashes
- comment/reason and any exception policy
- IP/device/session metadata only when privacy policy permits

Role assignment, suspension, expiration, download of controlled documents, approval, rejection, issue, release and supersede are auditable actions.

## 11. UX requirements

### Team and Permissions

- Member list with status, organization role, project roles, effective/expiry dates and project count
- Role template explanation before assignment
- Project access drawer with checkboxes grouped by author/reviewer/releaser
- warning when one user would become both author and checker on the same active artifact
- suspend access without deleting engineering history
- role change summary before save

### My Work / Approval Inbox

- Group by `Needs my action`, `Submitted by me`, `Returned`, `Recently decided`
- Each item shows project, artifact/revision, requested action, author, due date and blocking conditions
- Approval dialog shows immutable snapshot hash, upstream revisions and separation-of-duties validation
- `Return for correction` requires a comment
- `Approve`, `Issue` and `Release` require deliberate confirmation

### Audit Timeline

- Filter by project, artifact, action, actor and date
- Show human-readable event first, technical IDs/hashes on expansion
- Link each event to immutable artifact snapshot
- No edit/delete controls for normal users

## 12. Security-rule and E2E acceptance tests

- Cross-organization reads/writes are denied
- Non-member project access is denied
- Suspended or expired membership is denied
- Engineer can edit own Draft but cannot approve it
- Checker can approve submitted artifact created by another active member
- Detailer cannot change structural geometry or reinforcement source data
- QS can override quantity only with reason; browser totals are recalculated server-side
- Production sees only approved/released package paths
- External Reviewer sees only explicitly shared issued documents
- Direct client writes to `approved`, `locked`, `issued` or `released` states are denied
- Release fails when calculation, drawing, estimate or hashes are stale/mismatched
- Issued/Released artifacts cannot be overwritten
- Every successful authoritative transition creates one audit event even after safe retry

