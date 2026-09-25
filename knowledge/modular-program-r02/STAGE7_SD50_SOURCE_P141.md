# P141 — SD50 source review and AU search

Date: 2026-09-19. Continues P140; no change of user-selected SD50 or concrete strength.

## Evidence and interpretation

Official source: https://service.tisi.go.th/fulltext/TIS-24-2559p.pdf , downloaded from TISI. 26 PDF pages; SHA256 `0d4bab902203414041b4dcbb898b93d77129108b1912882be9328834d9c4f6f0`. Source retained privately under `references/stage7/TIS-24-2559p.pdf`; no public catalogue distribution.

This is the 2559 amendment followed by the 2548 base text. PDF1–4 amendment reviewed: standard number changed, scope1.2 removed, manufacturing/chemistry section5 and marking provisions replaced, alloy appendix added. Do not discard the amendment or describe the unchanged base-page header as the current standard identifier.

Table7, clause6.3.1, printed6/PDF18 visually verified: SD50 minimum yield490MPa, tensile620MPa and elongation13%. These are product-standard thresholds, not a mill certificate or completed ACI qualification. PDF23 clause9.5.2.3 specifies initial elongation gauge length5d for the relevant specimen; the13% value must not be compared directly to a different ASTM gauge/test basis. PDF24 refers test method to TIS244 Part4, which has not been reviewed here.

For source-based draft material data use490MPa, not500MPa inferred from the name. ACI design use and any code-specific limit remain pending qualification. Do not convert SD50 automatically into ASTM A615/A706 or AU reinforcement. In particular, dividing the separate minima620/490 does NOT prove the actual tensile/yield ratio of supplied steel. Lot tests, actual ratio, elongation/test method, chemistry/weldability and applicable seismic requirements remain required.

No final bar diameter, spacing, fy parameter in an adopted STD or RC capacity has been changed. A text scan of stage7-named scripts under tools/modular-program found no FYLD/fyMPa/yieldStrength/500000/490000 matches; this is not an audit of every historical STD.

## AU source search

Filename-based PDF search completed in F:/Downloads, E:/1.0 Project GPT Work and C:/Users/Administrator/Downloads for3600,1170,SD50,24-2559 and AS/NZS variants. Matches for3600 were project drawing numbers, not identified full AS3600 standards. Two SD50-labelled quotation filenames were found in another project's material backup; these were not used as this project's certificates. This is a limited filename search, not proof of absence from the entire computer or unnamed/scanned documents.

Existing NCC material remains a reference index, not a substitute for AS3600 and the applicable AS/NZS1170 clauses. Requested the precise AU folder or authorized online source; do not substitute unverified third-party copies or assume an edition solely from software support.

## Generated evidence and status

`tools/modular-program/stage7-sd50-source-p141.mjs` verifies the source hash and produces `output/staad-p7-p141/sd50-source.json`. Numeric values are manually transcribed from the visually checked table; the script checks evidence integrity and unit arithmetic, not engineering compliance.

Stage7/8 stays5%, final analysis0/48, RC design0/48. Full material/code gate still open: official ACI corrections, SD50 acceptance route, AU clauses, exposure/load envelopes and structural joints remain unresolved. Preserve all historical solver results and adopted geometry. No production release.
