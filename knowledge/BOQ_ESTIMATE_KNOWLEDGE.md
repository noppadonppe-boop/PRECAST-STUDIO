# BOQ and Preliminary Cost Estimate — Knowledge

## 1. Purpose

โมดูลนี้ถอดปริมาณจาก approved product/design model และสร้าง BOQ/ประมาณราคาเบื้องต้นที่ตรวจสอบย้อนกลับได้ เป้าหมายไม่ใช่การให้ราคาสุดท้ายโดยอัตโนมัติ แต่ทำให้ทีมเห็นปริมาณ แหล่งราคา สมมติฐาน ความไม่แน่นอน และผลกระทบเมื่อแบบเปลี่ยน

## 2. Position in workflow

```text
Design Checks approved
  → Quantity takeoff
  → BOQ mapping
  → Price Book and vendor rate resolution
  → Waste/indirect/transport/erection calculation
  → Preliminary estimate review
  → Calculation report / Shop drawing / Production release
```

ระบบอาจแสดง estimate ระหว่างออกแบบได้ แต่ Estimate ที่ออกเอกสารต้องอ้างอิง model/design revision ที่ชัดเจน

## 3. Estimate maturity levels

| Level | Source | Expected use |
|---|---|---|
| Concept estimate | Architectural area/module count | Feasibility and option comparison |
| Engineering estimate | Panelization, preliminary rebar and connections | Budget and design optimization |
| Pre-production estimate | Approved design and drawing quantities | Internal production budget |
| Actual cost | Purchase, labor, production and logistics records | Variance and product learning |

UI ต้องแสดง maturity level และช่วงความไม่แน่นอน ห้ามแสดง preliminary estimate ราวกับเป็น fixed quotation

## 4. Quantity scope

### Precast elements

- Concrete volume by material/grade
- Panel area, edge length, thickness and weight
- Reinforcing bar and mesh by diameter/grade/shape
- Lifting anchors, embedded plates, inserts, sleeves and ferrules
- Grout, bearing pads, sealant and joint materials
- Openings, recesses, blockouts and penetrations
- Surface finish, coating, insulation and architectural treatment

### Manufacturing

- Mold/formwork contact area
- Mold setup/change and reuse count
- Reinforcement fabrication labor
- Casting, curing, stripping and patching labor
- Factory equipment and handling
- Quality inspection/test allowance
- Waste/scrap factors

### Logistics and installation

- Transport weight, dimensions and trips
- Special permit/escort allowance
- Crane type, capacity, radius and working days
- Installation crew and temporary bracing
- Grouting, joint closure, sealant and finishing
- Mobilization and site preliminaries

### Commercial

- Direct material/labor/equipment cost
- Subcontract and vendor items
- Indirect cost/overhead
- Contingency/risk allowance
- Markup or target gross margin; name the method explicitly
- Tax/VAT shown separately

## 5. Quantity rules

- Every quantity line links to one or more element IDs or a documented project-level allowance
- Store raw quantity, waste factor, payable quantity and unit separately
- Do not round raw geometry before aggregation
- Apply display rounding only at UI/report layer
- Openings and deductions follow organization/project rules with rule version
- Rebar quantity may come from detailed BBS or approved allowance; show source type
- Joint material calculated from length/area/volume as appropriate
- Transport trips use vehicle capacity and dimensional constraints, not weight alone
- Manual quantity override requires reason, author and date

## 6. Price Book

Hierarchy:

```text
Organization Price Book
  → Product-family Price Book
  → Regional/project Price Book
  → Vendor quotation
  → Project line override
```

Minimum rate fields:

```ts
interface PriceBookItem {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  currency: string;
  baseRate: number;
  sourceType: "priceBook" | "vendorQuote" | "historical" | "assumption";
  sourceRef?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  region?: string;
  supplierId?: string;
  taxIncluded: boolean;
  status: "draft" | "approved" | "expired";
}
```

Expired or missing rates create warnings/errors according to project policy. Rate edits never mutate issued estimates.

## 7. Estimate formulas

```text
Raw quantity       = model-derived quantity
Payable quantity   = raw quantity × (1 + waste factor)
Direct line cost   = payable quantity × unit rate
Direct cost        = sum(direct line costs)
Indirect cost      = rule-based amount or percentage with named basis
Contingency        = percentage or risk-item total with named basis
Estimated cost     = direct + indirect + contingency
Selling price      = estimated cost + markup
VAT                = taxable basis × VAT rate
Grand total        = selling price + VAT
```

หากใช้ Gross Margin แทน Markup ต้องใช้ชื่อและสูตรที่ถูกต้อง และห้ามใช้สองคำแทนกัน

## 8. Firestore additions

```text
organizations/{orgId}/priceBooks/{priceBookId}
  items/{priceBookItemId}

organizations/{orgId}/projects/{projectId}/estimateVersions/{estimateVersionId}
  lines/{estimateLineId}
  assumptions/{assumptionId}
  adjustments/{adjustmentId}
```

```ts
interface EstimateVersion {
  id: string;
  projectId: string;
  sequence: number;
  maturity: "concept" | "engineering" | "preProduction" | "actual";
  status: "draft" | "quantitiesCalculated" | "priced" | "reviewed" | "issued" | "superseded";
  currency: string;
  sourceRevisionId: string;
  designBasisVersionId: string;
  modelVersionId: string;
  analysisRunId?: string;
  drawingSetId?: string;
  priceBookId: string;
  priceBookRevision: string;
  priceEffectiveDate: string;
  quantityRuleVersion: string;
  directCost: number;
  indirectCost: number;
  contingency: number;
  estimatedCost: number;
  markup?: number;
  sellingPrice?: number;
  vat?: number;
  lowRange?: number;
  highRange?: number;
  createdBy: string;
  reviewedBy?: string;
}
```

```ts
interface EstimateLine {
  id: string;
  estimateVersionId: string;
  costCode: string;
  description: string;
  category: string;
  elementIds: string[];
  sourceType: "model" | "bbs" | "schedule" | "allowance" | "manual";
  rawQuantity: number;
  wastePercent: number;
  payableQuantity: number;
  unit: string;
  unitRate: number;
  currency: string;
  rateSourceRef: string;
  amount: number;
  overrideReason?: string;
  status: "current" | "missingRate" | "needsReview" | "approved";
}
```

## 9. Backend services

### Quantity worker

- Reads immutable product/design model snapshot
- Applies versioned quantity rules
- Generates element-to-line trace map
- Stores detailed audit output in Cloud Storage
- Writes Firestore summary and estimate lines

### Pricing engine

- Resolves Price Book hierarchy and effective date
- Validates unit compatibility and currency
- Applies waste, indirect, contingency, markup and tax rules
- Produces scenario/range outputs
- Never trusts totals submitted by the browser

### Report/export worker

- BOQ workbook `.xlsx`
- Estimate summary `.pdf`
- Quantity audit `.csv`
- Machine-readable `.json`
- Optional quotation draft as a separate commercial document

## 10. UX/UI screen

### Header

- Estimate ID/revision/status/maturity
- Model/design/calculation revisions
- Price Book and effective date
- Currency and tax mode
- `Current` or `Out of date` indicator

### Main tabs

1. Quantity Takeoff
2. Cost Summary
3. Assumptions & Exclusions
4. Revision Comparison
5. Export

### Quantity Takeoff table

- Cost code/category/description
- Linked elements and source type
- Raw quantity
- Waste factor
- Payable quantity
- Unit
- Unit rate and rate source
- Amount
- Validation/status

Selecting a BOQ line highlights contributing panels/joints/inserts in the 3D model. Selecting an element filters relevant BOQ lines.

### Inspector

- Quantity derivation and rule
- Element trace list
- Price source and effective date
- Waste and adjustment
- Manual override with mandatory reason
- Issues/comments and approval state

### Cost Summary

- Material/manufacturing/logistics/installation/indirect split
- Cost per module, panel, m² and project
- Low/base/high range
- Biggest cost drivers
- Option comparison using the same Price Book date

### Assumptions & Exclusions

- Explicit statement and owner
- Included/excluded/allowance classification
- Cost/range effect
- Required confirmation date
- Blocking/non-blocking status

## 11. Change and invalidation behavior

- Geometry/material/rebar/connection change invalidates affected quantities
- Price Book change invalidates pricing but not quantities
- Quantity rule change invalidates quantity calculation
- Manual override remains visible but must be reviewed against the new revision
- UI shows added/removed/changed quantities and cost delta
- Issued estimate remains immutable; create a new version

## 12. Reports

### BOQ workbook

- Cover/control sheet
- Estimate summary
- Detailed BOQ
- Quantity audit by element
- Price sources
- Assumptions/exclusions
- Revision delta
- Model/design/calculation references

### Estimate summary PDF

- Scope and maturity
- Executive cost summary
- Quantity and cost basis
- Price date/currency/tax
- Low/base/high range
- Major assumptions/exclusions
- Top cost drivers
- Revision and approvals

## 13. Acceptance criteria

- Every model-derived BOQ line traces back to element IDs
- Recalculation from the same snapshots produces the same quantities/totals
- Unit mismatch blocks pricing
- Missing/expired rate is visible and cannot silently become zero
- Preliminary maturity and uncertainty range are always visible
- Markup and gross-margin calculations are not mixed
- Changing model or Price Book produces an understandable delta
- Issued estimate cannot be overwritten
- BOQ XLSX, summary PDF and audit CSV contain the same revision references and totals
- Browser-submitted totals are independently recalculated by the backend

## 14. Roles and commercial approval

Use the approved [Role Matrix v1](./ROLE_PERMISSION_KNOWLEDGE.md):

- QS/Cost Estimator creates quantity mapping, rate resolution, assumptions and Estimate Draft
- Structural Engineer validates model-derived quantities and technical allowances
- Commercial Approver, or PM with explicit `commercialApprove`, approves rate basis, markup and commercial issue
- QS cannot approve their own issued Estimate under independent commercial review policy
- Manual quantity override requires reason, author, timestamp and before/after values
- Price Book approval is organization-scoped and does not grant engineering approval
- Production user sees only the cost fields explicitly permitted by organization policy; selling price and margin are hidden by default
