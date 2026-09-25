# P140 — Cover evidence, reinforcement qualification and packing screen

Continuation of P138/P139. No change to accepted geometry, fc350ksc, SD50, nonprestressed system or existing solver files. This is an ACI-track source review, not an Australian-code check or fabrication release.

## Source evidence

Local ACI318-19/318R-19 IN-LB PDF and hash remain as P139. Printed page = PDF page minus two for these citations. Text reviewed at PDF373–374 and383–389; visual checks completed for373,374,384,386,388,389. PDF385 plant-control condition was reviewed as text. Do not distribute source pages through the catalogue.

- 20.5.1.1 and R20.5.1.1 (PDF383): fire may govern cover; cover is measured to the outermost steel surface, including stirrups, not to the main-bar centre.
- Table20.5.1.3.1 (PDF384): CIP nonprestressed concrete cast against and permanently contacting ground requires3in (76.2mm). Formed weather/ground-contact surfaces have bar-size-dependent rows; protected beams have1.5in (38.1mm). No soil support does not mean no ground exposure.
- 20.5.1.3.3 (PDF385) and its table (PDF386): special precast cover provisions require plant production or equivalent site controls over forms, reinforcement, concrete quality and curing. A precast label alone is insufficient. Weather-exposed precast walls with qualifying smaller bars have a different row from other members. Do not classify the entire wall–roof shell as a wall merely to use the lowest cover.
- 20.5.1.4.1 (PDF388): increased protection is required as necessary for corrosive/severe exposure, with Chapter19 also applicable.
- R20.5.1.4.1 (PDF389): recommended corrosive-exposure covers distinguish precast walls/slabs1.5in, other precast members2in, and other concrete walls/slabs2in, other members2.5in. These numeric recommendations are COMMENTARY, not universally mandatory code minima. Prestressed-specific provisions do not apply to this study.
- 20.2.1.1–20.2.1.3 (PDF373–374): permitted reinforcement specifications and additional mechanical requirements must be checked. SD50 does not automatically become ASTM A615/A706 because nominal strength seems similar. Thai DB sizes must not be silently equated to US bar numbers. Keep SD50 selected; establish its documented qualification/acceptance route, applicable seismic properties and weldability before final RC checks.

## Proposed development envelopes — not adopted specifications

Study40mm cover for plant-controlled precast walls/slabs,65mm for formed CIP beams under the corrosive-exposure study, and80mm where CIP is cast against and permanently contacts ground. These are rounded-up study values for the cited conditions, not nationwide compliance or permission to change models. Fire, exact member classification, exposure, actual bar sizes, tolerances, joints and embedded items may govern. AU remains separate.

`tools/modular-program/stage7-cover-screen-p140.mjs` produces12 illustrative geometric cases in `output/staad-p7-p140/cover-screen.json` with source-hash and arithmetic assertions. Two orthogonal contacting bar layers on each face are assumed; no bar size is selected for the design. With40mm cover each face and illustrative12mm bars, remaining gap is t−80−48: thickness100/150/175/200mm gives−28/22/47/72mm. Negative means overlap under these assumptions; a nonnegative gap is NOT a spacing, concreting or RC pass. Additional lap layers, tolerances, aggregate and anchorage are not yet checked. A100mm panel is not universally prohibited by this illustration; another justified reinforcement/detailing system would need its own check.

## Official corrections access update

The official ACI errata selector now resolves the exact318-19 document to https://www.concrete.org/publications/geterratadocument.aspx?DocID=127285 . The page asks for sign-in. No errata file was retrieved or reconciled and no login was bypassed. This supersedes P139's unsuccessful landing-page retrieval, not the availability of the local code. The2022 comparison document is not a substitute for complete errata.

## Next dependencies and progress

Use this screen to develop cover-sensitive effective depths and reinforcement envelopes after the material/exposure basis is settled. P139's conditional C2 strength shortfall remains unresolved; do not round350ksc to5000psi. Obtain/verify SD50 specification and mill evidence, official corrections and AU source clauses. Joint stiffness/capacity, load cases and final structural checks remain separate gates.

Stage7 of8 remains5% (1/20 acceptance gates), final analysis0/48, RC design0/48. No new acceptance gate is closed by this partial review. No model, reinforcement schedule or production geometry was modified.
