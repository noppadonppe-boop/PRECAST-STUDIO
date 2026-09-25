# Design Criteria — 6 September 2026

Implemented a project-specific criteria register replacing the hard-coded “ยังไม่กำหนด” list.

## Engineering declarations

- Eight standard categories record code, edition, amendment/errata, scope, document source, clause, and justified non-applicability where allowed.
- The Thai precast suggestion supplies ACI 318 (2025), ACI/PCI 319 (2025), the Thai 2566 structural regulation, EIT 011008-21 (2021) as a supplementary reference, and the PCI Handbook with its edition deliberately left for selection. Existing selections are preserved.
- Loading, wind, seismic, site parameters, material strengths and handling factors require project input. No numerical design assumptions are supplied by the preset.
- Thirty-seven fields cover project context, materials, loads/combinations, serviceability, demoulding, lifting, transport, storage, erection/bracing, connections, load paths, tolerances and units. Written evidence is a declaration for human review, not automated engineering verification.
- The ACI/PCI 319-25 / ACI 318-25 pairing is checked. Compatibility of other standards, their amendments, and specific material types still requires an engineer.
- SI presentation distinguishes kN, kN·m, m, mm, MPa, kg/m³ and kN/m³, including the MPa-to-kN/m² conversion.

## Persistence and approvals

- Shared workspace: explicit save to `PRECAST MODULE/root/criteria/{projectId}-design-basis`, using existing revision conflict detection and audit writes. The `{projectId}-notes` document remains separate. Shared records are drafts; shared mode does not offer engineering approval.
- Fixture mode: edits survive stage navigation inside the same project but are not persisted after reload.
- Controlled workflow: the same editor reads the project's current Design Basis ID, supports transaction-protected draft saves and explicit superseding of approved revisions. Legacy records remain readable with their existing values; missing evidence is not fabricated.
- Server checks reject missing/malformed criteria, incomplete declarations, incompatible ACI pairing, or disagreement with solver-facing numerical/code fields at Design Basis submission/approval. Calculation submission/approval and production package composition/release also check the current criteria.
- Existing revision invalidation marks G2–G7 out of date. Creating an alternative revision without explicitly superseding the current approved basis is rejected.
- The benchmark engine is displayed as unverified for code design. This work does not implement ACI numerical design checks, grant engineering approval, or migrate shared drafts into controlled project records.

## Verification

Typecheck, lint, 75 unit/UI tests, 54 Firebase rules and transactional workflow tests, production build, and local browser visual inspection passed. Test-only completeness evidence resides in `tools/testing/designCriteriaFixture.ts`; it must not populate live projects.

## Hosting rollout

The authorized rollout target is the existing shared-mode site `https://precast-studio.web.app`, using `firebase.hosting.json` and Firebase project `precast-studio`. Hosting serves the structured draft editor; controlled approval/release server changes are committed for the separate controlled workflow and are not deployed to this shared workspace. No live engineering declarations or approvals are seeded during deployment.

## Reference sources

- [Thai structural regulation, 2566](https://ratchakitcha.soc.go.th/documents/140A054N0000000000400.pdf)
- [ACI/PCI 319-25 publisher preview](https://www.concrete.org/Portals/0/Files/PDF/Previews/319-25_preview.pdf)
- [EIT 011008-21](https://eit.or.th/api/public/file/book/173)

These identify candidate references, not a legal or engineering determination that a particular edition applies to a project. The responsible engineer must confirm applicability and clause references using the actual standards.
