# Precast Engineering Web App

M1 Identity, Persistence and Workflow Primitives for a multi-organization precast engineering workflow. This repository intentionally uses local fixtures and Firebase Emulator Suite only; it contains no production project binding, customer upload, solver license, or authoritative engineering result.

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

Open `http://localhost:5173`. The default web app remains a deterministic fixture. To exercise persisted M1 behavior locally, start `pnpm emulators`, run `pnpm emulators:seed` in another terminal, then start `pnpm dev` with `VITE_DATA_MODE=emulator`. No production credential is required.

## Workspace map

```text
apps/web/                 Vite + React + TypeScript app shell
apps/functions/           Firebase Functions 2nd gen command boundary
packages/domain/          Approved roles, actions, gates and permission evaluator
packages/schemas/         Versioned Zod command/calculation contracts
packages/ui/              Product tokens and shared UI primitives
firebase/                 Firestore/Storage rules, indexes and emulator configuration
firebase/tests/           Rules tests for tenant isolation and authoritative transitions
services/                 Reserved worker boundaries; no real FEM/export worker in M1
knowledge/                Approved product and engineering source of truth
```

## Security model in M1

- Deny by default in Firestore and Storage Rules.
- Organization and project membership are separate and project membership can expire.
- UI permission checks explain unavailable actions but are never authoritative.
- Direct client approval/issue/release writes are denied.
- Submit/approve/return and Type 2 project creation run as idempotent Functions transactions.
- Functions revalidate active membership, expiry, role/capability, artifact state, snapshot hash, blockers and current upstream revisions.
- Every successful transition creates exactly one append-only audit event and a command receipt.
- Artifact creators cannot approve their own Design Basis, analysis, calculation, or drawing revision.
- The deterministic mock analysis always reports `NOT CHECKED`; it never presents a design `PASS`.

## Validation commands

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

See the [M1 completion and M2 handoff](docs/M1_HANDOFF.md) before extending the application. The original [M0 handoff](docs/M0_LIMITATIONS.md) remains as historical context.
