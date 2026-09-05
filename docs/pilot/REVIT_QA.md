# REVIT-DRAFTING-01 pilot import record

Status: NOT_CHECKED. Existing RVT/IFC export is not evidence of DXF import QA.

For each drawing, record package/revision, DXF and sibling PDF/A SHA-256, source model/calculation hashes, exporter/profile version, Revit version/build, tester, independent reviewer, date and evidence links.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Import into Drafting View using current-view-only | NOT_CHECKED | Pending |
| Millimetre units and intended 1:20 scale | NOT_CHECKED | Pending |
| Reference lengths and measured error in mm | NOT_CHECKED | Pending |
| Local origin, extents and Z=0 | NOT_CHECKED | Pending |
| Semantic PC-* layer mapping | NOT_CHECKED | Pending |
| Text, Arial fallback and non-ASCII labels | NOT_CHECKED | Pending |
| Dimensions, openings, anchors, linework | NOT_CHECKED | Pending |
| Sibling PDF/A page comparison | NOT_CHECKED | Pending |
| No missing/unsupported/proxy entities | NOT_CHECKED | Pending |

Retain import warnings, screenshots and measured values, not only a PASS checkbox. Repeat for the supported Revit versions. A trusted export worker must bind its eventual attestation to these exact DXF hashes; this editable checklist does not authorize release.
