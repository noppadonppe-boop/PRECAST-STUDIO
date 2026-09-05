# M1 completion and M2 handoff

## Completed in M1

- Firebase Auth emulator users, deterministic seed data and emulator-backed login without production credentials.
- Persisted organization/project memberships with live subscription and permission-context invalidation when membership data changes.
- Server-authoritative `submitArtifact`, `approveArtifact` and `returnArtifact` commands with schema validation, active/expiry checks, Role Matrix enforcement, Separation of Duties, blocker checks and Firestore transactions.
- Immutable approval snapshots using deterministic SHA-256 identity, current-upstream validation and mismatch/stale-draft rejection.
- Idempotent command receipts and exactly one append-only audit event for each successful state transition.
- Type 2 project creation from the approved `type-2-residential-v1` template, including initial project-manager membership and audit record.
- Approval Inbox decisions, Design Basis submission control, project audit timeline and explicit loading/error/forbidden states.
- Firestore emulator coverage for all Role Matrix v1 roles, inactive/expired membership, tenant boundaries, external-reviewer sharing and denied direct authoritative writes.
- Playwright journey covering Portfolio → Project → submit → self-approval denial → forbidden route → independent approval → audit timeline.
- Functions are bundled for a valid Node.js 22 ESM runtime while Firebase Admin and Functions SDKs remain runtime dependencies.

## Local verification

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

`pnpm test:e2e` starts and seeds the local Auth, Functions, Firestore and Storage emulators, runs against an installed Chrome/Chromium browser, and shuts down all test processes. Local App Check enforcement is disabled only when `FUNCTIONS_EMULATOR=true`; deployed Functions continue to require App Check.

## Deliberate boundaries for M2+

- BIM upload/staging, resumable transfer, MIME/extension/size validation, malware-scan state and IFC parsing belong to Phase 2 (BIM Intake and Design Basis).
- The Portfolio register still uses the approved visual fixture for cross-project demonstration; created Type 2 projects and memberships are persisted and become visible through the live access context, but a full Firestore-backed project-register query/archive flow remains next work.
- Design Basis form authoring/inheritance and gate G0/G1 transition policy are not implemented yet; M1 supplies the secure workflow primitives they will call.
- Issues, comments and review-queue authoring are still UI/domain scaffolds.
- No production Firebase project, deployment, customer data, paid service or credential was introduced.
- The deterministic mock analysis remains `NOT CHECKED`, non-authoritative and unsuitable for engineering design, construction or production release.

## Recommended M2 — BIM Intake and Design Basis

1. Add project-scoped resumable upload staging with strict file validation and scan-state quarantine.
2. Create immutable Source Revision acceptance/compare records and enforce G0 server-side.
3. Implement versioned Design Basis authoring, inheritance, review, locking and superseding on the M1 command boundary.
4. Replace fixture-only project listing with Firestore project queries and complete project update/archive commands.
5. Add issue/comment persistence and review-queue linkage to exact artifact revisions.
6. Expand Playwright coverage for upload rejection, source acceptance, Design Basis locking and stale-revision recovery.
