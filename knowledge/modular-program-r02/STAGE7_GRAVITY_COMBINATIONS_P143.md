# P143 — ACI gravity combination compiler and48-product input mapping

## Delivered

Implemented a reusable factor-set compiler linked to all48 P123 quantity ledgers and P124 provisional live-load records. It generates16 distinct gravity-only combinations after removing duplicates, including cases where transient floor/roof loads do not act together. This is input preparation, not16 solved load cases or48 completed structural analyses.

Files:
- `tools/modular-program/stage7-gravity-combinations-p143.mjs`
- `tools/modular-program/test-gravity-combinations-p143.mjs`
- `output/staad-p7-p143/gravity-combinations.json`

## Code evidence

Local `F:/Downloads/ACI-318R-19.pdf`, hash as P139. PDF63–65 (printed61–63) rendered and visually read this turn. Text extraction alone corrupts some symbols; factors were transcribed from the page image.

5.2.1/5.2.2 require the applicable loads and general-building-code basis. Table5.3.1(a,b,c) provides the gravity subset:1.4D;1.2D+1.6L+0.5Q;1.2D+1.6Q+1.0L, with Q selected separately from Lr/S/R. These are roof live/snow/rain alternatives, not their sum. The wind branch of(c) and all lateral combinations are outside this compiler subset, not excluded from the programme.

5.3.2 requires investigating loads not acting simultaneously. Compiler removes whole transient actions independently, while spatial load patterns on continuous members remain to be generated. 5.3.3 allows certain L-factor reductions with exceptions; no such reduction is applied, including cafe/public-assembly areas. 5.3.4 concentrated/impact/etc loads remain to be assessed. Commentary discusses nonlinear response: superposition of solved results cannot replace analysis of factored loads when nonlinearity matters. No STAAD LOAD COMB/REPEAT LOAD execution route was validated in this turn.

Official errata remain unreconciled. Thai statutory factor/resistance compatibility recorded in P125 remains open; this is NOT a claim that ACI coefficients automatically satisfy Thai legal provisions. AU formulas are neither substituted nor generated.

## Input and safety behaviour

- D means complete dead load, not only the historic precast/beam subtotal. Source subtotals remain traceable but missing fitout, seats, inserts and other items are not set to zero.
- Known selfweight ledger is not a second nodal load in a model already using SELFWEIGHT.
- Provisional Thai occupancy pressures are retained without making them final zones. No gross footprint is silently substituted for loaded floor area.
- Roof row, loaded projected area, rainfall/ponding and snow applicability remain explicit unresolved inputs. An absent-load combination is not evidence that that action is inapplicable everywhere.
- Scalar arithmetic preserves null for unknown/incomplete actions. These arithmetic totals are bookkeeping, not member forces or support reactions.
- Export guard rejects all current48 products until required input flags and actual numeric/zone data are present. It is a necessary guard, not sufficient engineering approval or a complete model validator.
- Model geometry, old solver runs and material selections are unchanged.360ksc remains the separately authorized C2 study from P142.

## Verification

Tests passed for hand-calculated synthetic totals140/157/156/136kN (D100,L20,Lr10kN), independent transient absence, exclusivity of roof alternatives, unknown/null/NaN handling, genuinely known zero, and rejection of a record with all readiness flags falsely set true but missing data. All48 product IDs unique; source geometry/axis and ACI/Thai source hashes checked. Every product remains blocked from final export. These tests are software/data QA only.

Next: map actual ARC quantities and occupancy zones, select/verify roof drainage/load basis, reconcile the Thai design route, develop joints, then assemble and verify native load cases. The complete lateral/environmental/handling scope remains required. Stage7/8 stays5% under P105, final analysis0/48, RC0/48; no full gate closed by this subset.
