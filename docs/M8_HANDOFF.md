# M8 completion and M9 handoff

## Completed in M8

- Added a deterministic `REVIT-DRAFTING-01` DXF builder with R2018/AC1032, millimetres, Model Space, Z=0, local-origin geometry, declared extents, Arial fallback, conservative entities and stable semantic `PC-*` layers.
- Added structural DXF preflight for version, units, entity allow-list, Model/Paper Space, Z coordinates, extents, origin, layers and prohibited external/proxy resources.
- Added a server-side export-job result contract with immutable-storage attestation, normalized paths, file roles, sizes, source hashes, file checksums and exact Revit-verified DXF hash coverage.
- Added deterministic Release Package manifest/checksum composition bound to the current approved and locked Design Basis, Product Model, Calculation Report and G6 Documentation Set snapshots.
- Required actual target Autodesk Revit Drafting View import and sibling PDF/A visual comparison evidence to be `PASS` before composition, submission, technical approval or release.
- Added Production Manager compose/submit controls, independent Engineering Checker approval and a separate Production Manager release command with recipient, production queue and append-only audit evidence.
- Added G7 project state, current Release Package identity and an immutable `released` artifact state.
- Denied direct client writes to export jobs and Release Packages; every lifecycle transition remains command-only and idempotent.
- Added G7 UI for readiness, blockers, manifest/checksum identity, file inventory and approval/release actors.
- Added unit, emulator Rules/Functions and browser coverage for deterministic export, forged evidence rejection, separation of duties and the full synthetic happy path.

## Deliberate safety state

- The local project remains `NOT_CHECKED` at G4/G6. It has no approved Documentation Set, renderer output, export job or actual Revit/PDF comparison attestation, so Release Package composition and G7 release remain blocked.
- M8 does not connect to Autodesk Revit, Firebase Production, customer data, production storage or a production queue. No DXF, PDF/A, DOCX, XLSX, checksum register or production archive is issued from the local fixture.
- The DXF builder and structural inspector are deterministic software controls, not evidence that a file has imported correctly into Revit. The release schema separately requires server-authoritative target-version import and visual-comparison evidence.
- Emulator happy-path records use synthetic `PASS` evidence only to prove workflow enforcement. They are not engineering validation, certification or authorization for fabrication.
- Released records are immutable through client Rules and normal artifact transitions. Superseding a released package must create a new revision; destructive replacement is not supported.

## Recommended M9 — staging and pilot production readiness

1. Complete verified code-specific engineering, reinforcement, lifting, transport and connection methods with independent benchmark evidence so G4/G6 can reach `PASS` legitimately.
2. Implement the trusted render/export worker, immutable object storage, malware/content controls, PDF/A validation, page-by-page visual QA and signed export-job attestation.
3. Run a supported-version Revit lab matrix against golden DXF fixtures and retain import logs, dimension tolerances, screenshots and PDF comparisons as auditable evidence.
4. Add Release Package revision history, supersede/withdraw controls, controlled download receipts, retention/backup policy and downstream fabrication acknowledgements.
5. Deploy only to a dedicated Firebase Staging environment with App Check, least-privilege IAM, secrets, monitoring and recovery exercises; Production connection remains a separate Product Owner decision.
