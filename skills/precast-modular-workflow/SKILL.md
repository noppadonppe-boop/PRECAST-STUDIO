---
name: precast-modular-workflow
description: Plan and maintain the Precast-Module I/L/U product catalogue, standard segments, TS-C engineering pilot, joint/FBD/shell-analysis handoffs, fabrication and BIM workflow. Use for this modular product programme and its Knowledge; not unrelated precast projects or automatic deployment.
---

# Precast Modular Workflow

Support the approved product plan while keeping product acceptance, engineering approval and production release distinct.

## Locate and read the current programme

Use the project root containing `knowledge/modular-program-r01/baseline.json`. The known project is `E:/1.0 Project GPT Work/Precast-Module`. Do not modify a different repository just because this personal skill is installed.
Read `knowledge/modular-program-current.json` first, then its referenced Knowledge and decisions. R02 is the current user-accepted development sequence; read R01 README/master/baseline for unchanged historical context, not as current thickness or execution status. Resolve revisions through this index, never by the largest directory number.
If the project is unavailable, explain what is missing and ask for its location before writing. Do not silently recreate the programme elsewhere.

This skill is installed globally for discovery, but the project Knowledge is the maintained source of product choices. The original skill source is `skills/precast-modular-workflow/` inside the project. If editing this skill, preserve project/global consistency and validate before installation.

## Select the requested phase

- Plan / Knowledge / decisions: use the master plan and baseline; change only what the user accepted. Preserve unresolved decisions as unresolved.
- Website / gallery / migration: read `WEB_CATALOG_SPEC.md`, `product_matrix.json` and the existing project role/permission Knowledge. Inspect the current app before implementation; avoid parallel duplicate apps by assumption.
- FBD / joints / analysis / structural design: read `DESIGN_BASIS_R01.md`, `ENGINEERING_WORKFLOW.md` and `source_register.json`. Read the actual relevant code clauses before any code check.
- Mould / fabrication / assembly drawings: also read existing `knowledge/REVIT_DXF_INTEROP_KNOWLEDGE.md` and require a checked design revision for production claims.
- Revit: use the engineering workflow and approved geometry/design references; keep architectural concept and fabrication/BIM status distinct.

Use the relevant available artifact skill when authoring images, drawings, PDFs, documents or applications. Do not treat this workflow as an alternative solver, code library or permission to control software that is not available.

## Product invariants accepted 2026-09-16

- Three plans I/L/U use a target standard bay length of 1.50m. I legacy 2m images and quantities remain history; never relabel them as 1.50m geometry.
- 48 product slots = 4 uses (office/home/cafe/resort) x 4 profiles (A gable/B vault/C rounded shoulder/D trapezoid) x 3 plans.
- R02 development targets: 100–200mm range, wall-roof150, floor/node roof/node wall175, local reserve up to200mm. TR is an unresolved kit, not a uniform200mm casting. These are user-accepted development dimensions, not capacity-verified selections. Final engineering may require redesign or an explicitly reviewed exception.
- TS-C is the pilot. I-C1 is a suggested sequence, not a frozen architectural design.
- Initial website is internal-team only. Future public access is a separate decision with per-artifact publication approval. Private assets require real server/storage authorization, not hidden menus.
- User selected EIT 011008-21, November2564, from the local PDF. Its identity was checked; no engineering clauses or designs were approved by that check.
- Concrete type/strength mapping, reinforcement and prestress remain undecided. Never infer non-prestressed simply from a null value.

## Current R02 sequence and local-first storage

Use `knowledge/modular-program-r02/README.md`, `decisions.json` and `DATA_MODEL.md` for this phase. Pause structural solver/refinement work until the later STAAD/EIT stage. Sequence: Typical Master → 48 dimensioned designs → local website → planning mould drawings → 48 Revit2026 packages → STAAD/EIT → reconcile all deliverables and human approval before production. Revit may be used earlier as an authoring tool. Planning mould drawings are allowed before engineering; final fabrication release is not.

Reuse Cafe/Senior Home delivery formats only, not their old materials/dimensions. Pilot I-C1, then one RVT per 48 products, shared Typical/titleblock library, A1 PDFs, true-model PNGs, schedules, audit and ZIP. Do not claim RVT completion until opened/checked in Revit. Record DirectShape/parametric limitations honestly.

Read `knowledge/modular-program-r02/FILE_INTAKE.md` for the accepted R02-A01 addendum: integrate 48 primary RVT and 48 primary STAAD STD files into per-product web records, intake/revisions/ACL/downloads and linked QA/results. Track planned slots separately from real artifacts. RVT storage is not a browser viewer; uploaded STD is not permission to execute it. Native validation requires actual target software. Preserve R02 seed hashes; add append-only supplements rather than relabeling missing files as delivered.

Keep metadata local under `data/modular-program/`, assets outside public folders, and cloud IDs null until configured. Firebase provisioning, migration and public deployment remain deferred. Read DATA_MODEL before changing storage. Stable product IDs, immutable revisions and separate development/engineering thickness fields are required. A seed is not 48 completed drawings. Grid1500 is not cast length; preserve unknown joint gaps and clearances as null.

## Data and revision discipline

For Stage 6.1 architectural work, read the current requirements referenced by `knowledge/modular-program-current.json`. P103 (`STAGE6_1_PILOT_P103.md`) records the PM-I-B3 cafe pilot; P104 (`STAGE6_1_BATCH_P104.md`) records its acceptance and authorization to expand the remaining47. Preserve the accepted pilot and build use-specific Office/Home/Cafe/Resort fitout rather than duplicating the cafe. Separate ARC RVT from linked Stage-6 structure, package references and preserve original geometry/openings. The old cafe file/image is a style/delivery reference, not a dimensional source. Include editable fitout, unbranded proposed material specs and preliminary HVAC/electrical/plumbing locations without invented capacities or concrete penetrations. Count delivered products only after native reopen, unchanged concrete, geometry coordination, visual review, relocated relative links and package verification. Track intermediate native builds separately from complete deliveries out of48. Finish the authorized47 without repeated approval requests, then stop for user review; do not resume STAAD or claim production release.

Use product slots, geometry revisions, component types, physical instances, analysis cases and mould tools as separate entities.
R01 baseline and product matrix are an initial planning snapshot, not live progress. Later implementation must create separate revisioned engineering/artifact records and seed the website from the snapshot without rewriting its history. Programme Step numbers are not app Gate numbers; use the explicit mapping in MASTER_PLAN_TH.md.
One N90 is a kit, not one casting or an ordinary half shell. Node floors are already included in recipe totals. R00 quantity formulas omit unresolved supports, interfaces and other items; they are not complete production BOMs.
Read image QA before reusing boards. Concept drawings are not exact dimensions; fix through CAD and a new artifact revision, not by changing historical labels.
Input changes invalidate dependent analysis/design/drawings. Record stale status, hashes, assumptions, units and material/geometry/joint revisions.
Keep current-user choices above historical concept proposals, but never use that precedence to skip mandatory engineering checks.
Do not mutate unrelated dirty files or publish/store private source PDFs in an app public folder.

## Engineering safeguards that affect decisions

For Stage 5 concrete lifting, read the current decision addenda, including `knowledge/modular-program-r02/decision-lifting-p52.json`. The user accepts schematic reinforcement routes without bar sizes and sufficient concrete lifting capacity as a DEVELOPMENT assumption. Continue those layouts without requesting the same missing bar/strength inputs again. Keep verified capacity null; derive demand from source mass/CG and clearly separate free suspension, breakaway, rotation and erection. This assumption does not certify anchors, steel moulds, rigging, cranes or factory floors.

P100 is the current Stage-5 scope closure. The user accepted Stage 5 as 100% for the planning mould package at P99/P100 and transferred fabrication cut/BOM details, connection/brace/base/anchor capacity checks, and remaining mould lifting/rigging/rotation work to a later Production Engineering scope. Do not report those transferred items as incomplete Stage-5 work, and do not report the scope closure as engineering approval or production release. Preserve P40/P90/P99 as historical development records. Stop before Stage 6 until the user explicitly authorizes it.

Treat user roof50 and floor150kg/m2 as requested inputs, interpreted as kgf/m2 for force conversion and awaiting code/occupancy/area-basis review. Do not claim those values satisfy every use.
Define exact geometry, openings, material properties, support and joint DOF/stiffness/contact before solving. Unknown is not zero. If insufficient, provide symbolic FBD or explicitly labelled sensitivity cases.
A vertical-load study can contain horizontal thrust. Keep interface action/reaction pairs and global equilibrium; indeterminate reactions require compatibility/stiffness.
Separate gravity pilot from complete stability checks including lateral/uplift and handling/assembly conditions. Do not state a module is safe solely because gravity equilibrium closes.
Analysis diagrams and heatmaps must come from traceable calculations, not generative imagery. Explain axis, sign, unit, load combination and solver version; check equilibrium, benchmarks, mesh convergence and singularities. Shell forces per unit length are not individual connector forces.
Use EIT clause evidence with printed/PDF page and unit system; do not blend ACI/Australian factors into EIT checks. Licensed source identity/availability is not redistribution permission.
Changing thickness or connections may change self-weight and stiffness; iterate analysis/design and record exceptions.
AI may draft and check completeness; only authorized responsible humans approve engineering or release fabrication under the project's role workflow.

## Authorization and completion

Do the requested phase only. Approval of this plan/skill is not automatic authorization to build/deploy a site, choose final materials, run external jobs, publish customer data or release moulds.
For a plan-only task, do not start engineering or app implementation. For an authorized build/analysis task, complete relevant in-scope work and checks without needless reconfirmation of accepted decisions.
End with outputs, what was actually verified, unresolved decisions and the next valid gate. Never present a code identity check, attractive image, successful solver exit or data validator as structural certification.

## Validation

Run `node knowledge/modular-program-r01/validate.mjs` to validate the R01 initial snapshot. Its null thickness and NOT_ANALYSED assertions intentionally describe that snapshot, not permissible future progress. For later revisions/live data, add lifecycle-appropriate validation separately; do not force advanced work back to NOT_ANALYSED to pass the R01 validator. No data validator is engineering verification.
After skill changes, run the installed skill-creator `scripts/quick_validate.py` against the skill directory, check referenced paths and test authorization/legacy/status scenarios before installing.
