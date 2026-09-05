# Estimate export worker boundary

M6 defines a server-side export manifest for four mutually reconciled outputs: BOQ XLSX, estimate PDF, audit CSV and audit JSON. Binary rendering remains behind this worker boundary and must consume the same immutable Estimate payload and snapshot hash.

The manifest is rejected unless all conditions are true:

- Estimate schema and backend-recalculated formulas are valid.
- Every rate is current, effective and unit-compatible.
- The G4 design dependency is `PASS`.
- The estimate is independently approved, locked and has a snapshot hash.
- No blocking condition remains and the grand total/range are available.

The local fixture intentionally fails these conditions (`G4 = NOT_CHECKED` and one expired transport rate), so it creates no XLSX/PDF/audit file and cannot present a draft as issued commercial evidence. A future renderer must record file checksums and the source snapshot hash without rounding source quantities.
