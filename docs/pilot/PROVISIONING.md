# M9 Pilot provisioning and read-only evidence workspace

This is an administrative Staging preparation tool, not a callable Function or a fixture seeder. It creates a **new organization only** and never overwrites an existing organization/project/membership. No cloud operation has been performed by implementing or testing this tool.

## Review and preview

1. Copy `docs/pilot/provisioning.example.json` to a locally controlled plan (for example, ignored `tmp/pilot-plan.json`). Replace every example ID, name and date with reviewed values. Use seven distinct Firebase Auth UIDs with the seven prescribed roles; name a reviewer, data owner and cleanup owner. No secrets/passwords belong in the plan.
2. Review the exact dedicated Staging project, organization, membership lifetime and retention with the owner. Retention is recorded metadata, **not an implemented automatic deletion job**. Review/application dates are operator assertions, not signed approvals.
3. Run `pnpm pilot:provision tmp/pilot-plan.json`. Preview validates schema and prints the proposed write counts. It does not authenticate, check cloud records, create accounts, or write Firestore. `targetReady: false` means operator setup is still needed, not that preview created a project.

## Apply — operator checkpoint

After following `docs/M9_STAGING_RUNBOOK.md`, fill the reviewed `firebase/staging-target.json` and matching `.firebaserc` staging alias. Set up seven named, enabled, email-verified Auth accounts plus any separately named reviewer/data/cleanup owner accounts. Use approved local Application Default Credentials for the dedicated Staging project; never send service-account JSON or tokens through chat. Do not use production credentials.

```powershell
pnpm pilot:provision tmp/pilot-plan.json --apply --confirm-project=YOUR_REVIEWED_STAGING_ID
```

Apply requires exact target confirmation, rejects emulator override variables, and checks all assigned Auth accounts before the transaction. Required administrative access includes Auth user lookup and creation of the scoped Firestore records; this tool does not grant IAM or custom claims. The administrative module is bundled locally only when applying and is not exported as a deployed endpoint.

The transaction creates one organization, one project, fourteen membership records, one audit record and one plan receipt. Every G0–G7 gate starts `notStarted`; there are **zero engineering artifacts, approvals or release grants**. Memberships have no orgAdmin role or delegated capabilities. The same plan ID/content is idempotent (participant array order does not matter); a changed plan or existing organization is rejected atomically. Replay confirms the prior receipt, not current database health and not restoration of records deleted later. Corrections need a separately reviewed migration; do not edit/remove receipts to force replay.

## Staging viewer

Set `VITE_DEFAULT_ORG_ID` to the provisioned organization in the reviewed Web configuration. After real Staging login, the screen lists only currently effective membership projects and reads each project's current G0–G7 artifact IDs. It displays missing links/documents, actual gate state, artifact state, hashes, scan state and recorded blockers without synthesizing PASS. G3 only follows `currentApprovedAnalysisRunId`; queued/draft runs are not a full run history. Revocation/errors remove the workspace and membership expiry is checked locally every second, in addition to authoritative server rules.

This is read-only inspection, not the full cloud editing/approval walkthrough. No upload, role assignment, approval or production-release action is provided here. The legacy emulator workflow remains separate. Actual Staging deployment, role-based acceptance, engineering library setup, IFC worker, Revit deliverables and signed UAT remain open M9 work.
