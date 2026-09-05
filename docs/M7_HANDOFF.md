# M7 completion and M8 handoff

## Completed in M7

- Added a versioned Documentation Set contract bound to the current locked Product Model and current Calculation Report hashes.
- Added an idempotent Detailer-only backend command with membership, role, upstream revision, snapshot, audit and receipt enforcement.
- Added the canonical 13-section Calculation Report register with deterministic ordering, source references and explicit section status.
- Added one source-linked shop drawing record and vector preview per panel, including geometry, openings, lifting-anchor IDs, material, volume, weight and COG.
- Added an eight-category G6 preflight register for model hash, drawing identity, geometry, dimensions, title block, lifting, reinforcement and engineering approval.
- Added server-side G6 submit/approval guards. Any unapproved G4 evidence, `FAIL`, unresolved `NOT_CHECKED`, drawing reinforcement gap or blocker rejects the transition.
- Added a gated export-manifest planner for Calculation DOCX/PDF/A, drawing PDF/A/SVG, result XLSX, register CSV and audit JSON.
- Added `REVIT-DRAFTING-01` as a shared deterministic contract and fixture: DXF R2018, millimetres, 2D Model Space at Z=0, 1:20 intent, no border, conservative entities, stable `PC-*` layers and sibling PDF/A/JSON requirements.
- Added G6 UI for report outline, panel drawing/register selection, preflight results, blockers and the clearly labelled “Revit-ready CAD import” profile.
- Added domain, schema, backend, emulator Security Rules and browser coverage for deterministic generation and enforced blocking.

## Deliberate safety state

- The generated Documentation Set is for internal review and its panel sheets are marked `NOT FOR PRODUCTION`.
- G4 design methods remain `NOT_CHECKED`; lifting design and reinforcement detailing are also `NOT_CHECKED`. G6 therefore cannot be submitted or approved.
- DOCX, PDF/A, XLSX, CSV and JSON names are planned only after an approved/locked/PASS snapshot. No binary engineering document is generated in the local M7 fixture.
- The document/PDF render-and-verify workflow was deliberately withheld because rendering an incomplete set could make unsafe evidence appear issued.
- `REVIT-DRAFTING-01` has `preflightState: notRun`. M7 does not generate DXF, drive Revit, claim Native Revit output or provide a Revit add-in.
- Markup authoring and cross-revision visual comparison require persisted review/revision history and remain follow-on work; the current M7 slice provides the immutable source links and register needed to implement them safely.

## Recommended M8 — controlled issue and production release

1. Implement and independently verify code-specific design, reinforcement, lifting, transport and connection methods so G4 can reach `PASS` legitimately.
2. Add persisted drawing markups, dispositions and previous-revision visual comparison without mutating immutable evidence.
3. Implement DOCX/PDF/A/spreadsheet renderers from one approved snapshot; render every page and verify layout, references, hashes and archival conformance.
4. Implement the `REVIT-DRAFTING-01` DXF exporter, golden fixtures, entity/layer/extents checks and automated import verification in supported Revit versions.
5. Add package manifest checksums, issue status, independent G6 approval and G7 release/supersede workflow. Keep any optional Native Revit add-in as a separately verified adapter.
