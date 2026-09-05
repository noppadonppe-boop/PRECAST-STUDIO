# M2 completion and M3 handoff

## Completed in M2

- Project-scoped resumable Storage upload with IFC/PDF extension and MIME validation, 100 MB limit, uploader-bound path, quarantine metadata, progress UI, and denied reads until scan state is clean.
- Versioned Source Revision metadata with unit, coordinate, level, object-identity, object-count and duplicate-GlobalId results.
- Server-authoritative G0 path: BIM Coordinator submits, a distinct Structural Engineer approves suitability, and the Project Manager freezes the clean source as accepted and locked.
- G0 freeze checks open critical issues transactionally; accepted-exception disposition requires Project Manager reason and responsible person.
- Complete Design Basis contract covering jurisdiction, explicit code editions, units, design life, risk, concrete, reinforcement, stiffness, durability, fire resistance, lifting, transport, inheritance and override reasons.
- Server-authoritative Design Basis creation, approval/locking and superseding. The prior locked revision is retained as immutable history and downstream state becomes out of date.
- Live project register subscriptions plus idempotent project update and soft-archive commands. Archived projects are immutable.
- Four emulator identities (`bim`, `engineer`, `pm`, `checker`) and deterministic G0 → G1 browser coverage.
- Security-rule tests for quarantine, invalid uploads, identity spoofing, direct transition forgery, issue reference immutability and PM exception disposition.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

The emulator suite is the only configured backend. Functions require App Check outside the emulator and all client-authoritative approval/freeze/release writes remain denied.

## Deliberate boundaries for M3+

- M2 models scan and BIM-validation outcomes but does not claim to run a production malware scanner or IFC parser. The clean seeded source is deterministic test evidence only; a production scanner/parser worker must write trusted results through an administrative boundary.
- Design Basis UI shows and submits the complete seeded record; richer field-by-field editing, library selection and change comparison can extend the existing version command without weakening immutable approval snapshots.
- Issue creation/disposition is enforced and covered at the persistence layer; a full issue-board UX remains future work.
- No FEM solver, engineering `PASS`, drawing generator, production release, deployment, production credentials or customer data was introduced.
- The mock analysis remains `NOT CHECKED`, non-authoritative and unsuitable for engineering design, construction or production release.

## Recommended M3 — panelization and analytical model

1. Implement versioned panel segmentation, openings, joints, lifting inserts, supports and load-path metadata against the accepted Source and locked Design Basis.
2. Add neutral analytical-model generation with explicit units, coordinate transforms and provenance.
3. Introduce deterministic geometry/model validation, issue linkage and stale-downstream propagation.
4. Add G2 review/acceptance and browser coverage while preserving Separation of Duties and command receipts.
