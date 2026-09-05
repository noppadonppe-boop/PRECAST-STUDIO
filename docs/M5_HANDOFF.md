# M5 completion and M6 handoff

## Completed in M5

- Added immutable G3 review payloads and deterministic review hashes to completed analysis runs.
- G3 submission now requires completed phase evidence, zero fatal warnings, clean topology, equilibrium and convergence success, an independent benchmark match, current upstream revisions and no blockers.
- Independent Engineering Checker approval locks the analysis snapshot, records audit/receipt evidence, sets the current approved analysis run and advances G3 to approved/G4 to in-progress.
- Added a versioned Design Check schema with exactly seven required categories: panel strength, serviceability, openings, joints, anchors, lifting and transport.
- Every check records scenario, entity IDs, governing combination where available, code-clause reference, status, message and optional disposition/evidence metadata.
- Added a server-authoritative command that generates a deterministic Design Check register only from the current approved G3 analysis hash and locked Product Model.
- The local design-check generator intentionally emits `NOT_CHECKED` for unimplemented engineering methods. It does not invent utilization or passing capacity results.
- G4 submission rejects any `FAIL`, unresolved `NOT_CHECKED`, invalid schema, stale upstream or blocking condition. Direct client creation and result mutation are denied.
- Added G3 submit/review controls and a G4 register showing category status, entity trace, code-method state, immutable hash and explicit blocking summary.

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

- M5 verifies and approves the controlled G3 benchmark evidence; it does not claim that the project design passes.
- G4 remains in-progress because all seven engineering design methods are intentionally `NOT_CHECKED` in the local fixture.
- No verified code-specific capacity engine, production FEM adapter, calculation PDF/DOCX generator, customer data, credentials, deployment or production release is included.
- A future implementation must not convert a `NOT_CHECKED` item to `PASS` without a versioned method, clause reference, reproducible demand/capacity evidence and independent verification.

## Recommended M6 — BOQ and preliminary estimate

1. Add model-linked quantity takeoff with element IDs, source type, units, waste and reconciliation against approved model/design revisions.
2. Add versioned Price Book references, effective dates, currencies and explicit project overrides with reasons.
3. Keep direct, indirect, contingency, markup and tax layers separate and disclose assumptions, exclusions and uncertainty ranges.
4. Block missing or expired rates from silently appearing as zero, and preserve `NOT_CHECKED` design dependencies in downstream estimate evidence.
5. Add deterministic XLSX/PDF/audit exports only after the underlying estimate snapshot is reviewed and reproducible.
