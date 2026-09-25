# P121 — Full I-C1 native run and recovered support-group equilibrium

Stage 7/8 remains 5% under the P105 twenty-gate checklist. This is a completed diagnostic/reference run, not completion of a final building design gate.

## Accepted geometry direction

Develop 250 × 400 mm perimeter beams with outer faces flush to the building and axes 125 mm inward; no continuous soil support. Develop a separate wall seat. I floor overlap is geometrically 80 mm; U uses 13 supports to keep spacing at most 3 m. These are development decisions, not verified bearing or member capacities.

## Model and scope

All 14 I-C1 concrete parts, 7,916 shell elements, 152 beam elements and 6 pinned support locations. Trial beam centroid is source Z=-200 mm. Rigid constraints are assembled as disjoint groups to avoid assigning one node to overlapping control/dependent groups.

This is an explicitly all-rigid connection REFERENCE case under self-weight only. END panels are fixed to floors in this trial, without roof/side ties. E=30 GPa and density=2400 kg/m3 remain trial properties. Seat concrete geometry/mass, actual joint flexibility/contact, imposed/code loads, lateral/handling cases and RC design are not verified. Minimum beam element length is 7.5 mm; conditioning/refinement still requires review.

## Native run and correction to reaction extraction

Run: `output/staad-p7-p121/runs/60784e7e8bbd421b8cffe24e13111fbc`.
STAAD native run completed with zero warnings/errors. Its raw support-reaction table sums to approximately 250.30 kN versus 293.359064 kN modeled self-weight and must NOT be issued as complete foundation reactions.

The corrected extraction sums native GLOBAL beam end forces and plate corner forces at every node belonging to each supported rigid group. Transport moments to the actual supported node before summation. Do not add the raw reaction table again and do not distribute the missing force by guesswork. Validate each element's self-weight equilibrium independently before group summation.

Recovered vertical sum: 293.359120 kN. Maximum global force residual approximately 0.060 N; maximum global moment residual approximately 0.120 Nm. Maximum residual moment at pinned supports approximately 0.018 Nm. Predefined global criteria are 5 N / 10 Nm. These checks pass for this reference case only.

The parser accounts for fixed-width native beam output where adjacent signed values have no intervening space. It verifies all 152 members and all 7,916 plates and their end/corner node identities; it does not silently skip malformed records.

## Evidence and limitations

- Generator: `tools/modular-program/stage7-full-rigid-reference-p121.mjs`
- Native runner: `tools/modular-program/run-staad-full-reference-p121.ps1`
- Verification: `tools/modular-program/verify-full-reference-p121.mjs`
- Run-folder `group-reaction-verification.json` contains concurrent six-component results, source hashes and tolerances.
- Original native STD/ANL/log and earlier failed raw-reaction interpretation remain preserved.

No final foundation reaction schedule is released. No RC capacity, final joint model, mesh convergence of the full building or 48-product analysis completion is claimed. Final analysed products remain 0/48 and RC-designed products 0/48. Engineering approval and production release remain false.
