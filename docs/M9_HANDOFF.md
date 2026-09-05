# M9 progress handoff — Staging preparation

Status: IN PROGRESS — local preparation implemented; M9 exit criteria are not met.

## Baseline

The reviewed Pilot/BIM baseline is commit `43764af`, following M8 `6a3e4ce`. See [baseline review](M9_BASELINE_REVIEW.md). IFC bytes and SHA-256 are versioned; the open RVT and automatic backup remain local and ignored. No production data or credentials were uploaded.

## Implemented locally

- Shared client configuration validator rejects unknown modes, real projects in fixture/emulator mode, mismatched staging project/domain/bucket, missing App Check configuration and bundled debug tokens. Vite applies the same check before serving/building.
- Added an initially unconfigured, operator-reviewed target record and demo-only default Firebase alias, root `.env.local` loading, staging Hosting/Rules/Functions deployment configuration, and a read-only configuration preflight CLI.
- Added reCAPTCHA Enterprise App Check initialization and a separate Staging sign-in/membership rehearsal screen. Emulator `?as=` identities are not used there. Password input is cleared after sign-in attempts.
- Added server command environment checks. External runtimes require explicit Staging variables and the matching Google project. The Production Release callable is disabled outside the demo emulator during M9.
- Added transactional downstream gate invalidation when Source, Design Basis or Product Model revisions change. Immutable artifact records remain historical; current dependent gates become `outOfDate` and G7 cannot rely on the prior approved G6 state.
- Restricted the fixture seeder to loopback emulator hosts.
- Added a versioned Pilot evidence schema/register covering eight gates, ten scenarios, seven distinct participant roles and eleven operational/engineering readiness categories. PASS requires evidence, verifier and timestamp. Duplicate categories/accounts and G6/G7 PASS with unverified G4 are rejected.
- Added readiness reporting, the [Staging runbook](M9_STAGING_RUNBOOK.md), [Revit import QA record](pilot/REVIT_QA.md), and an explicit register of open engineering/export limitations. Readiness reports are local review aids, not signed approvals or backend release evidence.
- Added reviewed-plan Pilot provisioning: preview by default, explicit matching Staging target/account validation before apply, atomic new-organization creation, seven distinct roles, expiring memberships, no fabricated engineering artifacts, idempotent receipt and overwrite protection. See [operator instructions](pilot/PROVISIONING.md). Actual Staging apply remains pending.
- Expanded the Staging screen into a read-only membership-scoped project/evidence viewer using actual current G0–G7 reference IDs. Missing records do not imply PASS; project switching, access errors/revocation and expiry remove old evidence. Full cloud editing/approval remains pending.
- Added an actual `Precast_Module_Test.ifc` browser upload regression. Checks original checksum/bytes, newly created revision metadata, quarantined state, disabled submission and authenticated binary-read denial. Intake labels now distinguish unparsed uploads from deterministic seed data, including NOT CHECKED object/duplicate counts. See [actual intake test record](pilot/BIM_INTAKE_QA.md).

## Validation

- Local lint, typecheck, 62 unit tests, 51 emulator tests and production-mode build passed.
- `pnpm test:e2e`: 6 browser tests passed, including actual IFC upload/quarantine. These are local emulator results, not Staging acceptance.
- Provisioning example preview passes without cloud access; apply without a reviewed matching target is rejected before Firebase authentication or writes.
- Configuration negative checks reject staging builds without the approved target; `staging:preflight` reports pending operator setup.
- `pilot:readiness` reports BLOCKED; require-ready mode returns nonzero for the current incomplete evidence register.
- Node on this host is 24.19.0 while Functions declares Node 22; the emulator uses the host runtime. Target Node 22 staging verification remains an operator checkpoint. Existing bundle-size/dependency-annotation warnings remain non-fatal.

## Remaining work and external checkpoints

| Work package | Current state / required evidence |
| --- | --- |
| M9.0 baseline | Reviewed and committed; automated local checks passed |
| M9.1 Staging | Config/guards/runbook prepared; project ID, actual configuration, deployment, IAM, App Check enforcement, budgets and restore evidence pending |
| M9.2 Pilot data | IFC inventory and administrative provisioning tool available; actual named accounts, privacy/retention ownership, approved libraries and Staging apply pending |
| M9.3 G0–G7 | Emulator rehearsal and dynamic read-only cloud evidence viewer available; full Staging editing/approval workflow and live Pilot walkthrough remain pending |
| M9.4 negative/Revit QA | Local revision/security controls tested; real DXF import/PDF comparison, download audit and retention scenarios pending |
| M9.5 UAT | Evidence structure and rollback procedure prepared; actual UAT, signed decisions, cost/performance and incident/restore exercises pending |

Verified engineering methods, IFC scanner/parser, reinforcement, trusted render/export worker, production storage and supported-version Revit import checks remain incomplete. Existing RVT/IFC files do not establish those checks. No gate has been promoted to PASS to satisfy M9.

Next operator input: exact dedicated Staging project ID, Web config in `.env.local`, pilot organization/project and named participant UIDs. Do not send service-account JSON/private keys or tokens in chat. Follow the runbook and preserve the separate Product Owner decision for Production deployment.
