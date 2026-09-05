# Precast Engineering Web App

M8 controlled issue and Production Release controls for a multi-organization precast engineering workflow. This repository intentionally uses local fixtures and Firebase Emulator Suite only; it contains no production project binding, customer upload, solver license, malware-scanner service, general FEM solver, authoritative design result, issued engineering document, live export worker, or Native Revit integration.

## Source of truth

Implementation follows the approved knowledge base:

- [Knowledge index](knowledge/README.md)
- [Product and technical knowledge](knowledge/PRECAST_WEB_APP_KNOWLEDGE.md)
- [Role and Permission Matrix v1](knowledge/ROLE_PERMISSION_KNOWLEDGE.md)
- [UX/UI knowledge](knowledge/UX_UI_KNOWLEDGE.md)
- [BOQ and estimate knowledge](knowledge/BOQ_ESTIMATE_KNOWLEDGE.md)
- [Revit/DXF interoperability knowledge](knowledge/REVIT_DXF_INTEROP_KNOWLEDGE.md)
- [Implementation plan](knowledge/IMPLEMENTATION_PLAN.md)
- [Build starter guide](knowledge/BUILD_STARTER_GUIDE.md)

The knowledge base overrides fixture behavior. Any change to engineering safety, Role Matrix, G0–G7, approval/release semantics, production services, or commercial policy requires Product Owner approval.

## Quick start

Requirements: Node.js 22+, pnpm 11+, Java 21+ (for Firebase emulators).

```sh
pnpm install
pnpm check
pnpm dev
```

Open `http://localhost:5173`. The default web app remains a deterministic fixture. To exercise persisted behavior locally, start `pnpm emulators`, run `pnpm emulators:seed` in another terminal, then start `pnpm dev` with `VITE_DATA_MODE=emulator`. Use `?as=detailer` for G6 and `?as=production` for G7. The `NOT_CHECKED` design, lifting and reinforcement evidence deliberately blocks documentation approval, package composition and Production Release. No production credential is required.

## Workspace map

```text
apps/web/                 Vite + React + TypeScript app shell
apps/functions/           Firebase Functions 2nd gen command boundary
packages/domain/          Approved roles, actions, gates and permission evaluator
packages/schemas/         Versioned Zod command/calculation contracts
packages/ui/              Product tokens and shared UI primitives
firebase/                 Firestore/Storage rules, indexes and emulator configuration
firebase/tests/           Rules tests for tenant isolation and authoritative transitions
services/                 Worker boundaries and enforced M6-M8 export/release policy
knowledge/                Approved product and engineering source of truth
```

## Security model through M8

- Deny by default in Firestore and Storage Rules.
- Organization and project membership are separate and project membership can expire.
- UI permission checks explain unavailable actions but are never authoritative.
- Direct client approval/issue/release writes are denied.
- Submit/approve/return, Source freeze, Design Basis versioning, and project create/update/archive run as idempotent Functions transactions.
- BIM uploads are limited to IFC/PDF, 100 MB, uploader-bound staging paths, and mandatory quarantine metadata; quarantined objects cannot be read.
- G0 requires clean scan metadata, unit/coordinate/level/object-identity checks, zero duplicate GlobalIds, independent structural approval, no open critical issues, and Project Manager freeze.
- G1 requires a complete bounded Design Basis, current accepted source, an independent checker, and an immutable locked approval snapshot.
- Product Model versions bind accepted Source and locked Design Basis IDs, canonicalize entity ordering, and preserve immutable superseded history.
- G2 validates panel/opening geometry, globally unique references, joints, supports, construction scenarios, load cases/combinations and zero model-quality failures before independent checker lock.
- Load Model versions separate scenario activation, mesh controls, stiffness modifiers and solver controls from the locked Product Model.
- Queueing freezes the Load Model and records an immutable input manifest, engine version and input hash before server-side execution.
- The versioned `two-panel-static-v1` adapter records phase history, normalized reactions/displacement, equilibrium, convergence, topology and benchmark evidence with an output hash.
- Direct client writes to analysis lifecycle, manifest and result fields are denied. Firestore stores metadata only, not large mesh/result arrays.
- Functions revalidate active membership, expiry, role/capability, artifact state, snapshot hash, blockers and current upstream revisions.
- Every successful transition creates exactly one append-only audit event and a command receipt.
- Artifact creators cannot approve their own Design Basis, analysis, calculation, or drawing revision.
- Benchmark controls can report `PASS`, `WARNING` or `FAIL`, while the engineering design status remains `NOT_CHECKED` until verified design methods are implemented.
- Completed analysis evidence can be submitted only when fatal-warning, topology, equilibrium, convergence and independent-benchmark controls pass. Independent checker approval locks its immutable snapshot and advances G3.
- The M5 Design Check register has exactly seven required categories: panel strength, serviceability, openings, joints, anchors, lifting and transport.
- Design Check generation requires the current approved G3 analysis hash. Direct client creation or result mutation is denied.
- Any `FAIL` or unresolved `NOT_CHECKED` item blocks calculation submission and G4 approval. The local fixture intentionally leaves every unimplemented design method `NOT_CHECKED`.
- Estimate creation is limited to an active Cost Estimator and requires current approved G3/model snapshots plus an approved Price Book revision.
- Exact model-derived quantities retain element IDs, raw quantity, waste and payable quantity; backend formulas determine amounts and every cost layer.
- Missing, expired and unit-mismatched rates remain explicit with null rate/amount fields. They never silently become zero.
- Direct estimate/Price Book mutations are denied. Commercial approval remains independent; a Project Manager requires explicit `commercialApprove` capability.
- XLSX, PDF, CSV and JSON export manifests require an approved locked estimate, current rates, `PASS` design dependency, complete totals and no blockers. The M6 fixture therefore emits no commercial file.
- Documentation Set creation is limited to the Detailer role and binds the current approved Product Model plus current Calculation Report hashes in one server transaction.
- The canonical Calculation Report register contains 13 ordered source-linked sections; every panel drawing retains geometry, openings, anchors, material, weight, volume, COG and upstream IDs.
- G6 preflight has eight required categories. `FAIL` and `NOT_CHECKED` results remain explicit and block submit, approval and rendering.
- The shared `REVIT-DRAFTING-01` profile defines deterministic R2018 2D Model Space DXF conventions, millimetres, Z=0, semantic `PC-*` layers and PDF/A/JSON companions. It is labelled “Revit-ready CAD import,” never Native Revit.
- M8 adds a deterministic R2018/mm DXF builder and structural preflight for verified worker use; the unsafe local fixture still emits no production file.
- Release Package composition accepts only a completed server-authoritative export result bound to the current approved/locked G6 hash, complete required file roles, immutable storage, checksums and `PASS` evidence from an actual target Revit Drafting View import plus sibling PDF/A comparison.
- Production Manager composition/submission, independent Engineering Checker approval and a distinct Production Manager release actor enforce separation of duties. A released package is locked and cannot be overwritten.
- Direct client writes to export jobs and release packages remain denied. The local fixture has no export/Revit attestation, so G7 visibly remains blocked and no manifest, checksum register or production archive is issued.

## Validation commands

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

See the [M8 completion and M9 handoff](docs/M8_HANDOFF.md) before extending the application. Earlier handoffs remain as historical context.
