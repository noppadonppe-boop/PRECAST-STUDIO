# P144 — ARC quantities and positions prepared for structural loads

2026-09-19. Read-only intake of accepted-stage ARC packages, retaining their architectural-study limitations. No RVT/STD/source package edited. Uses JSON sources corresponding to the schedules; no workbook was created or modified.

## Results

-48 product packages located through P123 ledger manifest references, not a guessed common directory. PM-I-B3 remains the P103 pilot; the other47 use P104.
-514 material-geometry rows classified and1803 registered ARC/MEP items retained with mark, family, coordinates and group.
-Every intake manifest hash matches P123; used coordination/item/recipe files match their manifest. All48 ARC RVT hashes match the manifest. This establishes unchanged files relative to prior evidence, not a fresh native reopening or design approval.
-47 floor recipes independently measured by polygon shoelace area; totals match native recorded finish areas within1e-6m2. P103 has only recorded native area in this intake; no claim of independently re-extracted pilot floor polygons.
-Floor polygons retain the source concrete instance, top elevation and study thickness to enable later distributed-load mapping. A floor-finish area is NOT automatically the statutory live-load area or gross footprint; partitions/gaps and use zones still require review.

## Do not convert every material volume into weight

Inspected P103/P104 family-generation and native audit code. Material volumes are sums of Revit material geometry, including simplified solid envelopes. Metal appearance does not select aluminium versus steel or a real hollow section. Cabinets and equipment bodies are not solid timber or metal blocks. Therefore:

-GL-01: a model-only glazing mass study may be calculated from recorded volume and P125's glass unit weight24.5kN/m3. Example PM-I-C1:0.08544m3 gives2.09328kN. This excludes final glass makeup confirmation, framing, hardware and load transfer. It is not adopted dead load.
-FL-01:10mm architectural assembly allowance; do not treat it as10mm of verified solid porcelain. Substrate/adhesive and final build-up remain open.
-MT-01/JN-01/EQ-01/SN-01: actual sections/construction and manufacturer operating mass needed. No automatic solid-volume multiplication.
-DK-01: timber species and support arrangement unresolved; exterior deck weight must not automatically be applied to the module.
-LS-01: plant symbol is not saturated planter contents. SITE-01 is illustrative ground, excluded from superstructure quantity conversion rather than a missing building material.
-MEP location symbols do not establish equipment ratings, masses or pipe contents. Loose furniture and fixed items need appropriate dead/live classification to avoid adding loads already represented by occupancy allowances.

The source unit-weight evidence is P125 Table2, PDF10, with source hash verified. No new blanket legal compliance claim or new unit-weight selection for other materials. All actual adopted material weights, receiving structural parts and complete added dead load remain null until supported; study numbers are separate.

## Files and checks

`tools/modular-program/stage7-arc-load-intake-p144.mjs` generates `output/staad-p7-p144/arc-load-intake.json`.

Checks: source hashes, unique48 IDs, finite nonnegative volumes, complete material classification, independent clockwise/counterclockwise rectangle area tests,47 native-area reconciliations, independent glass example arithmetic, and preservation of null final weights. Unexpected material codes or changed source files stop generation. No solver or native Revit process was run this turn.

## Next work / state

Determine finish assembly and equipment/load classification, map confirmed loads to actual supporting elements, and coordinate external appendages before supplying D to P143. Roof drainage, joints, lateral cases, full AU source access and code compatibility remain in scope. No duplicate selfweight; no source quantities silently adopted as operating loads.

Stage7/8 remains5% per P105 (full acceptance gates); final analysis0/48, RC0/48. This intake completes the48-package quantity/position extraction task, not the complete dead-load or analysis gate. Engineering approval and production release remain false.
