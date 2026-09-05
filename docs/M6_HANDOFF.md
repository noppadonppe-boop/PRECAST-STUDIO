# M6 completion and M7 handoff

## Completed in M6

- Added versioned Price Book and Estimate domain contracts with THB currency, source/effective dates, tax basis, status and unit validation.
- Added deterministic server-side quantity takeoff for concrete, formwork, lifting anchors, panel joints and transport weight.
- Every BOQ line stores its model element IDs, exact raw quantity, waste percentage, payable quantity, quantity rule, unit, resolved source/rate and amount state.
- Added server-authoritative formula validation for direct cost, indirect cost, contingency, estimated cost, markup, selling price, VAT, grand total and uncertainty range.
- Missing, expired or unit-mismatched rates use explicit states and null monetary fields; incomplete totals never appear as zero.
- Added an idempotent Cost Estimator command that binds the current locked Product Model, approved G3 analysis and approved Price Book revision, then appends audit/receipt evidence.
- Added independent commercial approval routing. A Project Manager may approve only with the explicit `commercialApprove` capability; estimate authors cannot self-approve.
- Added G5 UI for maturity, Price Book/effective date, traceable BOQ lines, cost-layer summary, design/rate blockers and disabled issue actions.
- Added export-manifest policy for reconciled XLSX/PDF/CSV/JSON outputs. It rejects anything except an approved, locked, complete and reproducible Estimate snapshot.
- Added unit, schema, emulator command, security-rule and browser tests for deterministic recomputation and blocking behavior.

## Deliberate safety state

- The local fixture remains an engineering preliminary estimate, not a quotation or issued BOQ.
- G4 remains `NOT_CHECKED`, and the seeded transport rate expired on 2026-06-30. Both appear as blockers.
- Consequently direct/derived totals, submission and export stay unavailable. No XLSX/PDF/audit artifact is generated because doing so would violate the reviewed-snapshot export rule.
- The priced direct subtotal is informative only and is explicitly not presented as the complete direct cost.

## Recommended M7 — calculation report and shop drawings

1. Implement verified code-specific design methods before attempting to turn G4 from `NOT_CHECKED` to `PASS`.
2. Add a versioned drawing register bound to approved calculation/model snapshots.
3. Generate panel sheets with geometry, openings, embeds, lifting points, reinforcement and cross-references.
4. Add markup, compare and drawing preflight; block unresolved references or dimensional conflicts.
5. Render calculation/drawing PDF previews and verify every page before allowing G6 approval.
