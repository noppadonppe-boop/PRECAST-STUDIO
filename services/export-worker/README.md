# Estimate export worker boundary

M6 defines a server-side export manifest for four mutually reconciled outputs: BOQ XLSX, estimate PDF, audit CSV and audit JSON. Binary rendering remains behind this worker boundary and must consume the same immutable Estimate payload and snapshot hash.

The manifest is rejected unless all conditions are true:

- Estimate schema and backend-recalculated formulas are valid.
- Every rate is current, effective and unit-compatible.
- The G4 design dependency is `PASS`.
- The estimate is independently approved, locked and has a snapshot hash.
- No blocking condition remains and the grand total/range are available.

The local fixture intentionally fails these conditions (`G4 = NOT_CHECKED` and one expired transport rate), so it creates no XLSX/PDF/audit file and cannot present a draft as issued commercial evidence. A future renderer must record file checksums and the source snapshot hash without rounding source quantities.

## M7 documentation boundary

M7 adds a deterministic manifest planner for Calculation Report DOCX/PDF/A, panel drawing PDF/A/SVG previews, result XLSX, drawing-register CSV and audit JSON. Planning is rejected unless the Documentation Set is approved and locked, G4/G6 evidence is `PASS`, the snapshot hash exists and no blocker remains. Binary rendering is intentionally not implemented while the local fixture remains unsafe.

The shared `REVIT-DRAFTING-01` contract is a future DXF exporter input, not an emitted file. It fixes R2018, millimetres, 2D Model Space, Z=0, conservative entities, semantic `PC-*` layers, no border and required sibling PDF/A/JSON. Its M7 preflight state is `notRun`; production DXF generation, golden-file checks and Revit import verification must be implemented before it can enter an issued manifest. The product must describe this path as “Revit-ready CAD import,” never Native Revit.
