# M3 completion and M4 handoff

## Completed in M3

- Added `productModel` as a first-class versioned artifact with Structural Engineer authoring and independent Engineering Checker approval.
- Added a bounded neutral Product Model schema for panels, source object IDs, dimensions, thickness, offsets, openings, volume, weight, COG, joints, lifting/embedded anchors, supports, construction stages, load cases and combinations.
- Schema validation rejects duplicate entity IDs, out-of-panel openings, unknown panel/load-case references, same-panel joints and scenarios absent from the stage register.
- Product Model creation requires approved G0/G1 and the current locked Design Basis; every model stores immutable Source and Design Basis references.
- Canonical entity/source/stage ordering produces deterministic snapshot identity independent of input ordering.
- Engineer-controlled split and merge transformations preserve geometry/provenance and remap anchors/supports. Splitting introduces an unconfirmed internal joint and a blocking load-path result until the engineer explicitly confirms it.
- G2 submission rejects nonzero unsupported-node, disconnected-element, missing-load-path or geometry-conflict results, unconfirmed joints, stale upstreams and ordinary workflow blockers.
- Independent approval locks the Product Model, advances G2 to approved/G3 to in-progress, and appends command receipt and audit evidence.
- Firestore rules deny direct version creation, approval, superseding and non-author edits while allowing the author to revise only an unlocked current draft without changing its identity or upstream references.
- G2 UI presents panel geometry/openings, stable selection encoding, local axes, model register, stages, validation results, authoring tools and explicit `NOT CHECKED` analysis status.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:emulator
pnpm test:e2e
pnpm build
```

## Deliberate boundaries for M4+

- M3 records the load cases, combinations, supports and stages required to validate the G2 model, but it does not execute a solver or claim an analysis/design `PASS`.
- The panel preview is a deterministic engineering workspace representation, not a full IFC/GLB renderer or geometric CAD kernel.
- Split/merge requires explicit engineer action and load-path reconfirmation; no fully automatic panelization is introduced.
- No production deployment, customer data, paid solver, credential or production release is included.

## Recommended M4 — loads and analysis orchestration

1. Separate versioned load/analysis settings from the locked Design Basis and Product Model.
2. Build a controlled backend job lifecycle with immutable input manifest, engine version, logs and normalized result schema.
3. Start with verified benchmark fixtures and a stub adapter; do not implement a new general FEM solver.
4. Add mesh/model-quality, reaction/equilibrium and fatal-warning controls for G3 while retaining `NOT CHECKED` until all required evidence is verified.
