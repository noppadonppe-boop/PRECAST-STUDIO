# P122 — Full I-C1 crown-group rotation sensitivity

Stage 7/8 remains 5% under P105; this supplies partial evidence for stiffness sensitivity, not a completed final-analysis or RC gate. Previous P121 turn made verified progress, not a no-progress/blocker turn.

## Controlled comparison

P121 all-rigid reference versus a second native model with 57 of 542 disjoint constraint groups changed from RIGID to FX/FY/FZ. Changed groups touch the crown. STAAD translation constraints retain offset-induced control rotation effects; they are not simple equality of translations at eccentric nodes.

At crown/longitudinal-joint intersections, the WHOLE group has its relative rotations released. This is therefore a grouped crown/intersection sensitivity case, not a pure hinge at each isolated crown pair. No actual connector type or capacity is selected by this study.

Comparison script asserts identical nodes, plates, beams, supports, trial materials and total weight. Inputs and ANL/spec hashes are checked against verification records. Same 14-part model, 7,916 plates, 152 beam elements, six foundation positions; self-weight only.

## Native evidence

New run: `output/staad-p7-p122/runs/4a2bf8a60cc94281ab00933ba224f291`.

- Native completion: zero warnings / zero errors.
- All plate and beam element self-weight checks pass 1 N / 1 Nm tolerances.
- Recovered support-group force residual maximum 0.0661 N and moment residual maximum 0.2920 Nm; criteria 5 N / 10 Nm.
- Both original native runs remain unchanged; final foundation reactions are NOT released.

| Quantity | P121 all rigid | P122 crown-touching groups translation-coupled |
|---|---:|---:|
| Maximum downward movement from printed joint table |0.179 mm|0.612 mm|
| F03 global-X reaction |−6.66250 kN|+1.95504 kN|
| F06 global-X reaction |+6.70494 kN|−1.96832 kN|

Printed displacement resolution is 0.001 mm; tied maxima can occur at multiple nodes. Ratio approximately 3.42 is a comparison of these two trial cases, not a serviceability assessment. Global-X is building width; STAAD global-Y is vertical.

## Consequence for next work

Reaction direction changes invalidate treating the all-rigid case as universally conservative. Joint stiffness/rotation/contact and physical anchor arrangements must be selected and checked before final reinforcement or foundation handoff. Do not mix maxima across cases as if concurrent.

The full-building mesh still needs convergence assessment, actual bearing/seat geometry and mass, code loads/combinations, end-panel connection definition, cracked-stiffness/serviceability and RC checks. Neither reference case represents an approved structural detail.

Requested user confirmation of normal-weight concrete, non-prestressed construction and continuous cast-in-place perimeter beams remains pending at publication. No affirmative answer is inferred. fc′350 ksc / SD50 remain accepted target grades; trial E/density are not silently upgraded to code-verified properties.

## Files

- `tools/modular-program/stage7-crown-sensitivity-p122.mjs`
- `tools/modular-program/compare-full-crown-p122.mjs`
- `output/staad-p7-p122/comparison.json`
- Run-folder `group-reaction-verification.json`, STD, ANL, log and study-spec.

Stage7 final analysed products 0/48; RC-designed products 0/48. Engineering approval false; production release false. Stage8 not started.
