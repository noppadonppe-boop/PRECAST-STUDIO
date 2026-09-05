# M9 actual IFC intake — local browser regression

Date: 2026-09-05. Environment: local Chrome/Playwright, Firebase Auth/Firestore/Storage/Functions emulators (`demo-precast-m1`). No Staging deployment or external file upload.

Source model: local `Precast_Module_Test.rvt`, 38,535,168 bytes, supplied from Revit 2026.4. It remains local/ignored and was not reopened or modified for this test. Browser input: actual repository `Precast_Module_Test.ifc`, 388,772 bytes, SHA-256 `46012F90F9C7B056E0C5C25CFEB5037C8D18C35A2764F23C694166E6ED19AA77`. The test hashes the selected input bytes, not an approved backend snapshot or downloaded storage object.

| Check | Actual local result |
| --- | --- |
| Actual IFC selected through file input | PASS — same file bytes; generic binary MIME normalized to `application/x-step` |
| Upload progress | PASS — 100% via local Storage emulator |
| Revision display and persisted metadata | PASS — new `SRC-YYYY-MM-DD-XXXX` revision, matching filename/size/type, not `SRC-R02` |
| Quarantine boundary | PASS — draft, quarantined, unlocked, no approved snapshot hash |
| Authenticated binary read as uploader | PASS — denied with HTTP 403, using ordinary BIM credentials (no admin read) |
| Submission affordance | PASS — disabled while scan/hash evidence is missing |
| UI avoids geometry claim | PASS — object and duplicate counts NOT CHECKED; seeded G0 label no longer says uploaded BIM is accepted |
| Actual malware scanning / IFC parsing / 3D viewer | NOT_CHECKED — no trusted worker/viewer implemented |
| Parsed unit, geometry, door/window/opening counts | NOT_CHECKED — reference expectations only, not results from an app parser |
| Revit DXF/PDF deliverables QA | NOT_CHECKED — separate export/import workflow remains pending |
| Real Staging / UAT acceptance | NOT_CHECKED — environment and named participants pending |

Reproduce with `pnpm test:e2e`; test: `e2e/m9-bim-intake.spec.ts`. A full-page screenshot is written to `test-results/m9-bim-intake-M9-uploads-t-b2397-ntine-with-no-parser-claims/actual-ifc-quarantine.png` and structured test evidence is attached to the test result. Test output is ignored and replaced by subsequent runs; retain it separately under the approved evidence policy for formal UAT.

The seed supplies only the existing emulator workspace/accounts required to reach intake. The test never changes the uploaded document to clean/approved, never supplies synthetic parser output, and never uses owner credentials to read its quarantined binary. IFC geometry expectations from the manifest (4 walls, 1 slab, 1 door, 2 windows, 3 openings; millimetres) remain independent reference data. Upload success does not establish an engineering or fabrication approval.
