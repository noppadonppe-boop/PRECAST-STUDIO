# P139 — Local ACI intake and first material screening

## Source status superseding the ACI access blocker

User requested local search and then continuation. Located `F:/Downloads/ACI-318R-19.pdf`: 628 pages, 11,456,527 bytes, SHA256 `b9f35acac5ffcbad9147cf7858911f072e7da55f1737317a7a64c944e57be7d3`.
Cover identifies ACI318-19 plus ACI318R-19, IN-LB. Code and commentary pages are readable without a password prompt. Prior cover/contents/interior/index sampling establishes substantial code content, not a page-by-page completeness/authenticity audit. Local third-party watermarks are present; do not publish or redistribute the PDF. Original file is unchanged.

ACI content is now available for clause review: do not keep asking for online login as the sole prerequisite. AU source access remains separate.

## Clause evidence inspected this turn

- 19.2.1, printed355/PDF357: strength selection includes durability, not strength analysis alone.
- 19.2.2.1(b), 19.2.3.1, printed356/PDF358: normalweight elastic modulus and modulus of rupture equations; full page rendered and visually checked.
- 19.2.4.3, printed357/PDF359: normalweight lambda1; extracted text reviewed.
- 19.3.1.1, printed358/PDF360: exposure assignment; extracted text reviewed, not a site-classification decision.
- 19.3.2.1, printed361/PDF363: restrictive combined exposure requirements; visually checked.
- Table19.3.2.1, printed366/PDF368: visually checked including footnotes. C2 requires minimum5000psi and maximumw/cm0.40; nonprestressed chloride limit0.15%, subject to the table's cementitious-mass basis and footnotes9/10; cover per20.5. Cover and mix qualification have NOT been completed.

Text extraction has corrupt glyphs in some words/equations; visual verification is necessary. Poppler reported missing Symbol display font; selected rendered formula/table pages were visually legible. Do not apply automated extraction of all formulas unchecked.

## Reproducible numeric screen

`tools/modular-program/stage7-aci-material-screen-p139.mjs` checks source hash and unit round trips, generating `output/staad-p7-p139/material-screen.json`.

- Confirmed fc350kgf/cm2 =34.323275MPa =4978.170157psi, NOT5000psi.
- Using the actual IN-LB19.2.2.1(b) equation and converting output: Ec=27728.648793MPa. This differs from historical reference E30000MPa by -7.57117%. It is a code-estimated material modulus, not cracked/effective system stiffness or a test result.
- Corresponding modulus of rupture=3.648506MPa with lambda1, not direct tensile capacity for arbitrary joint/anchor checks.
- Conditional C2 screen:350ksc falls below this edition's5000psi threshold (=351.534790ksc). No rounding up. This does not assign C2 to every site and does not diagnose every existing module as unsafe.
- To satisfy the no-geographic-exclusion target, exposed member mixes may need a higher specified strength and accompanying durability/cover provisions. Develop a proposed mix-strength revision before changing the user's accepted350ksc. Increasing strength alone is not full durability compliance. Do not apply ACI classifications to the AU track.

## Edition / errata

Publisher comparison document accessed: https://www.concrete.org/Portals/0/Files/PDF/318-19%28Reapproved%202022%29-File-for-318-19-owners.pdf . Its introductory statement says the2022 reapproval updates references without technical changes. This is NOT a complete errata reconciliation; individual referenced-standard updates remain to be reviewed. Project remains318-19, not318-25.

Official errata landing/PDF retrieval attempts failed this turn. Do not substitute a third-party search snippet for verified official corrections; mark reconciliation pending. Material numbers above are local-edition screens pending that review.

## Dependencies and status

No STD files, models, reinforcement, historical solver results or geometry were changed. Prior E30000 reference runs remain valid only for their recorded assumptions, not newly validated design results. A design-facing material revision must rerun dependent results and check cracking assumptions; do not multiply old force outputs by the E ratio.

Next: reconcile official errata; review cover and steel admissibility; propose durability variants needed for full geographic coverage; complete joints/load basis before final runs. Stage7/8 remains5% under P105 gates; finalanalysis0/48 and RC0/48. Source intake/partial screening does not close the full two-code gate.
