# M9 baseline review — 2026-09-05

Baseline follows M8 commit `6a3e4ce`.

Validation: lint, typecheck, 47 unit tests, 50 emulator tests, 5 browser tests and production build passed. Browser tests ran after the emulator test suite to avoid their shared-port conflict.

- Reviewed the IFC MIME normalization and upload-revision selection changes, their three validation tests, the BIM import guide, the pyRevit export button, and the M9 knowledge changes.
- Verified `Precast_Module_Test.ifc` SHA-256 against the supplied manifest: `46012F90F9C7B056E0C5C25CFEB5037C8D18C35A2764F23C694166E6ED19AA77`.
- IFC header declares IFC2X3 CoordinationView_V2.0 and millimetre length units. This text/header check does not verify geometry or malware safety.
- The IFC includes author metadata. It is retained locally in this repository for the authorized test baseline; sharing or deployment requires the pilot data owner's privacy review.
- The editable RVT is open and file-locked. It and its automatic `.0001.rvt` backup remain local, excluded from Git. The source RVT size in the supplied manifest is descriptive, not a verified immutable source identity. The versioned exchange IFC is the reproducible baseline.
- The pyRevit script exports the active document, stores IFC GUIDs and overwrites the named IFC output. It was inspected, not executed during this review. Operators must select the test model and refresh the manifest after each export.
- `tools/export_test_ifc.py` from the prior inventory is no longer present; the current pyRevit extension is the supplied replacement.
- Existing engineering methods, scanner/parser and export/Revit QA remain incomplete. Uploaded IFC stays quarantined and G4–G7 cannot be declared passed from this baseline.
