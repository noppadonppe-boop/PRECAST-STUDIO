# Revit Drafting View and DXF Interoperability

Status: **Approved requirement**  
Approved by: Product Owner  
Approval date: 2026-09-05

## 1. Objective

ระบบต้องส่ง Shop Drawing ไปใช้งานใน Revit Drafting View ได้อย่างควบคุม โดยส่ง DXF 2D พร้อม Export Profile, Preflight result และ machine-readable manifest ที่ระบุหน่วย Scale, Layer, Revision และ Hash ครบถ้วน

ข้อกำหนดนี้ไม่ถือว่า DXF กลายเป็น Native Revit elements โดยอัตโนมัติ การ Import/Link DXF จะคงอยู่เป็น CAD import/link object ส่วนการสร้าง Native Detail Line, Text, Dimension และ Filled Region ต้องใช้ Revit Add-in/API adapter ในเฟสแยก

Autodesk ระบุว่า Revit รองรับ DWG/DXF และสามารถ Import CAD เข้า Drafting View; `Current View Only` จะถูกเลือกอัตโนมัติเมื่ออยู่ใน Drafting View: <https://help.autodesk.com/cloudhelp/2023/ENU/Revit-DocumentPresent/files/GUID-6334D2D4-8C52-4503-BD44-ED61D1792228.htm>

## 2. Mandatory export profiles

### `PC-FAB-DXF-01`

ใช้สำหรับ Shop Drawing เต็มแผ่นและ workflow โรงงาน:

- DXF R2018 default; organization may allow R2013/R2010
- Full drawing composition, title block, revision block and production notes
- Model-space/paper-space behavior controlled by factory profile
- Units, layers, fonts and block naming follow factory standard

### `REVIT-DRAFTING-01`

ใช้สำหรับ Import/Link เข้า Revit Drafting View:

- 2D content only; every entity lies on `Z = 0`
- Model Space only
- One panel/detail or one controlled drawing view per DXF
- Default unit millimetres with explicit `$INSUNITS`
- Local origin near `0,0`; content bounds must pass configured maximum extents
- Intended Drafting View scale recorded in manifest, not inferred from viewport size
- No paper title block by default; Revit sheet/title block remains authoritative
- Optional `includeBorder=false|true` profile flag for consultant workflows
- No external references, proxy objects or unresolved external resources

## 3. Conservative entity policy

Allowed baseline entities:

- `LINE`
- `LWPOLYLINE`
- `ARC`
- `CIRCLE`
- controlled `INSERT` blocks with embedded definitions
- `TEXT`/`MTEXT` using approved fonts
- simple `HATCH` only when verified by the target Revit-version test matrix

Reject or convert before issue:

- 3D entities or non-zero elevation
- proxy/custom entities
- unresolved XREF/image references
- unsupported spline/complex hatch patterns
- zero-length and duplicate entities
- open boundary polylines where closure is required
- fonts not in the approved/fallback list

## 4. Layer profile

Minimum `REVIT-DRAFTING-01` layers:

| Layer | Content |
|---|---|
| `PC-OUTLINE` | visible panel/profile edges |
| `PC-HIDDEN` | hidden geometry |
| `PC-REBAR` | reinforcement geometry |
| `PC-REBAR-TEXT` | bar marks and rebar notes |
| `PC-DIM` | dimension graphics/text |
| `PC-TEXT` | general notes and labels |
| `PC-EMBED` | plates, inserts, sleeves and anchors |
| `PC-OPENING` | openings, recesses and blockouts |
| `PC-CENTER` | centerlines and grids |
| `PC-REVISION` | revision cloud/mark where included |

Layer names are stable contract values. Organization presets may map them to client names without changing semantic layer keys in the manifest. Revit maps imported DWG/DXF layers to display/line-weight controls, so layer discipline is part of the interoperability contract: <https://help.autodesk.com/cloudhelp/2026/ENU/Revit-Model/files/GUID-E8705303-0610-4A82-9118-0C3A742706D2.htm>

## 5. Text, dimensions and graphics

- Prefer approved TrueType fonts with an organization-defined fallback
- Store font name and fallback used in preflight/manifest
- Text height is derived from intended plotted size and Drafting View scale
- Dimension values must come from the approved geometry snapshot, not from rounded display strings
- Imported dimensions are graphical CAD content; they are not assumed to be Native Revit dimensions
- Use color/layer mapping consistently and never rely on color alone for meaning
- PDF/A output is the visual reference for comparing the imported Drafting View

## 6. Manifest contract

Every Revit-ready DXF has a sibling JSON record:

```ts
interface RevitDraftingManifestItem {
  profileId: "REVIT-DRAFTING-01";
  profileVersion: string;
  projectId: string;
  drawingId: string;
  drawingNumber: string;
  revision: string;
  panelMarks: string[];
  sourceModelVersionId: string;
  designBasisVersionId: string;
  analysisRunId: string;
  units: "mm";
  intendedScale: string;
  origin: { x: number; y: number; z: 0 };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  semanticLayers: Record<string, string>;
  fonts: Array<{ requested: string; emitted: string; fallbackUsed: boolean }>;
  entityCounts: Record<string, number>;
  dxfSha256: string;
  referencePdfSha256: string;
  generatedAt: string;
  exporterVersion: string;
}
```

## 7. DXF preflight for Revit

Release-blocking checks:

- DXF version is allowed by the selected profile
- Units and `$INSUNITS` equal the manifest
- all entities are 2D with `Z = 0`
- origin and extents are within organization limits
- only allowed entity types exist
- no XREF, proxy entity or missing resource exists
- required semantic layers exist and unknown layers are reported
- no missing font; fallback use is disclosed
- panel mark, drawing number and revision are unique/current
- DXF geometry hash matches the approved drawing/model snapshot
- sibling PDF/A and DXF represent the same drawing revision
- manifest and SHA-256 checksums are complete

Warnings that require disposition:

- approved simple hatch conversion
- text reflow risk
- very small geometry below display tolerance
- client-specific layer alias
- linked instead of imported workflow

## 8. Revit user workflow

### Import workflow

1. Create a Revit Drafting View
2. Set the view name and intended scale from the manifest
3. Use `Insert → Import CAD`
4. Select the DXF and explicit units from the manifest
5. Confirm `Current View Only`
6. Verify position/origin and layer visibility
7. Compare visually against the sibling issued PDF/A
8. Place the Drafting View on a Revit sheet

### Link workflow

Use `Link CAD` when the project needs controlled reloads after a DXF revision. Revit keeps a connection to the linked file and can reload changes, while an imported file remains the imported version: <https://help.autodesk.com/cloudhelp/2025/ENU/Revit-Model/files/GUID-B69ED66A-4272-4332-9872-FD802DA1C9E7.htm>

The project must not overwrite an issued DXF silently. A new DXF revision creates a new immutable export and the Revit user deliberately reloads/replaces the controlled link.

## 9. Optional Native Revit adapter

A later Revit Add-in may consume the manifest plus neutral drawing schema to:

- create or update a named Drafting View
- create Native Detail Curves
- create Text Notes and approved annotation types
- create Native dimensions where references can be established safely
- create Filled Regions and reusable detail components
- attach project/drawing/revision metadata
- report unsupported items instead of silently rasterizing or dropping them

Native Revit output is a separate adapter and test matrix. It does not replace the mandatory DXF + PDF/A deliverable.

## 10. Package structure

```text
PR-2026-0094_Rev-B03/
  02_Shop_Drawings_PDF/
  03_Shop_Drawings_DXF/
  06_Revit_Drafting/
    P-W03_Rev-B03_Revit.dxf
    P-W03_Rev-B03_Revit.json
  manifest.json
  checksums.sha256
```

## 11. UX requirements

- Export Configuration includes target `Factory DXF` or `Revit Drafting View`
- Revit profile shows intended scale, units, origin, border option, layer mapping and font mapping
- Preflight results distinguish blocking errors from warnings requiring disposition
- File preview shows content bounds and confirms `Z = 0`
- Package Manifest labels DXF as `Revit-ready CAD import`, not `Native Revit`
- User can download DXF, sibling PDF/A and JSON manifest together
- UI shows target Revit version/policy used for validation when configured

## 12. Acceptance criteria

- The same approved drawing snapshot produces deterministic DXF and manifest hashes
- DXF imports into a supported target Revit version and stays in the intended Drafting View only
- Imported size matches the intended millimetre geometry within configured tolerance
- No entity appears off-plane or far from the local origin
- Required layers are visible and controllable in Revit
- No missing-font warning is ignored
- Imported Drafting View visually matches the issued PDF/A within the approved comparison tolerance
- Revision, drawing number and panel mark match across DXF, PDF/A and manifest
- Failed Revit preflight prevents `Released to Production`
- Native Revit conversion, if enabled later, reports every unsupported entity and never silently changes engineering content

## 13. M0 boundary

M0 must define the export-profile/domain contract and a deterministic `REVIT-DRAFTING-01` fixture for UI and tests. M0 is not required to generate production-grade DXF or operate Revit. The real exporter, Revit import verification and optional add-in belong to the Shop Drawing/Export milestones.

