# M0 limitations and M1 handoff

## Deliberate limitations

- Authentication, organization membership and project data use deterministic local fixtures. No Firebase project is connected.
- The approval dialog demonstrates an immutable snapshot decision in component state only. Firestore writes are intentionally denied; M1 must implement the idempotent transactional command and append-only audit event.
- Functions validate App Check/auth/schema at the callable boundary, but M1 must load membership and artifact snapshots inside a transaction before any authoritative transition.
- Storage client writes are disabled. M1 BIM intake must add a project-scoped staging path with MIME, extension, size and scan-state validation.
- The analysis fixture computes deterministic demonstration values and hashes only. It is explicitly `NOT CHECKED`, non-authoritative and unsuitable for design, construction or production.
- No IFC parsing, FEM solver, report/DXF generation, price release, cloud deployment, production credential or paid service exists.
- The prototype covers desktop and responsive review widths. Full keyboard/a11y and critical Playwright journeys remain M1 verification work.

## Recommended M1 — Identity, persistence and workflow primitives

1. Connect Firebase Auth and emulator-backed seed/login without adding production credentials.
2. Persist organization/project membership and invalidate permission caches on role or expiry changes.
3. Implement submit/approve/return callable commands with transactions, idempotency and one append-only audit event per successful transition.
4. Add immutable Approval Snapshot persistence and verify hashes/upstream revision currency server-side.
5. Expand the emulator matrix for every Role Matrix v1 role, suspended/expired membership and protected authoritative states.
6. Add project creation from the approved Type 2 template and project-level audit timeline.
7. Add Playwright coverage for Portfolio → Project → submit → independent approval, including forbidden and self-approval paths.

