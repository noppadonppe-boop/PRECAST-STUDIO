# Precast Engineering Web App

M4 Loads and Controlled Analysis Orchestration for a multi-organization precast engineering workflow. This repository intentionally uses local fixtures and Firebase Emulator Suite only; it contains no production project binding, customer upload, solver license, malware-scanner service, general FEM solver, or authoritative design result.

## Source of truth

Implementation follows the approved knowledge base:

- [Knowledge index](knowledge/README.md)
- [Product and technical knowledge](knowledge/PRECAST_WEB_APP_KNOWLEDGE.md)
- [Role and Permission Matrix v1](knowledge/ROLE_PERMISSION_KNOWLEDGE.md)
- [UX/UI knowledge](knowledge/UX_UI_KNOWLEDGE.md)
- [BOQ and estimate knowledge](knowledge/BOQ_ESTIMATE_KNOWLEDGE.md)
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

Open `http://localhost:5173`. The default web app remains a deterministic fixture. To exercise persisted M4 behavior locally, start `pnpm emulators`, run `pnpm emulators:seed` in another terminal, then start `pnpm dev` with `VITE_DATA_MODE=emulator`. Use `?as=engineer` at G3 to edit the versioned Load Model and run the controlled two-panel benchmark; reviewer, BIM and PM identities remain available. No production credential is required.

## Workspace map

```text
apps/web/                 Vite + React + TypeScript app shell
apps/functions/           Firebase Functions 2nd gen command boundary
packages/domain/          Approved roles, actions, gates and permission evaluator
packages/schemas/         Versioned Zod command/calculation contracts
packages/ui/              Product tokens and shared UI primitives
firebase/                 Firestore/Storage rules, indexes and emulator configuration
firebase/tests/           Rules tests for tenant isolation and authoritative transitions
services/                 Reserved worker boundaries; no real scanner/FEM/export worker in M4
knowledge/                Approved product and engineering source of truth
```

## Security model through M4

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
- M4 benchmark checks can report `PASS`, `WARNING` or `FAIL`, while the engineering design status remains `NOT CHECKED`; G3 is not approved by this milestone.

## Validation commands

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

See the [M4 completion and M5 handoff](docs/M4_HANDOFF.md) before extending the application. Earlier handoffs remain as historical context.
