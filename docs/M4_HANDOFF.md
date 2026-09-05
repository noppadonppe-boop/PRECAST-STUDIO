# M4 completion and M5 handoff

## Completed in M4

- Added a first-class, versioned Load Model separated from the locked Design Basis and Product Model.
- Added bounded neutral settings for scenarios, supports, joints, load cases/combinations, shell idealization, mesh size, refinement zones, stiffness modifiers, tolerance, iteration limit and result averaging.
- Added authoritative commands to create Load Model revisions, queue controlled analysis and cancel safely. Active membership, role, G2 state, authorship, upstream currency and hashes are revalidated in transactions.
- Queueing freezes the Load Model and creates an immutable manifest containing Source, Design Basis, Product Model and Load Model identity, engine version and input hash.
- Added the deterministic `two-panel-static-v1` adapter as a verified fixture boundary. It is not a new general-purpose FEM solver.
- Recorded validate, mesh, solve, post-process, checks, artifacts and completion phases with append-only create/execute audit evidence and an idempotent command receipt.
- Added normalized applied-load, reaction, equilibrium, displacement and governing-combination output plus fatal-warning, topology, convergence and independent-benchmark verification.
- Firestore rules allow only the Structural Engineer author to edit current unlocked Load Model payload/hash fields and deny all direct analysis lifecycle/result writes.
- Added a G3 workspace for controlled settings, immutable hashes, engine identity, phase log and verification evidence.
- Kept engineering design status explicitly `NOT_CHECKED`; M4 does not approve G3.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

## Deliberate boundaries

- No production credentials, customer data, deployment, malware scanner, native solver, paid solver license, large mesh/result arrays or release workflow are included.
- A benchmark check marked `PASS` is evidence about that benchmark only and never changes the design status from `NOT_CHECKED`.
- Cancellation is implemented for queued/running records; the local fixture completes synchronously, so its normal UI path finishes before cancellation is needed.
- A production FEM adapter belongs behind the reserved worker boundary and requires independently verified benchmarks, operational controls and engineering approval.

## Recommended M5 — design checks and G3 verification

1. Define versioned calculation/check schemas for panels, joints, anchors and construction scenarios, including governing combinations and code-clause references.
2. Integrate an independently verified solver adapter behind the job contract, with external artifact storage and signed result metadata.
3. Add engineering review, issue disposition and immutable approval snapshots for analysis/design evidence while preserving Separation of Duties.
4. Permit G3 approval only after required model-quality, convergence, equilibrium, benchmark and design-check evidence is complete; retain `NOT_CHECKED` for every unimplemented check.
