# M9 Staging operator runbook

Status: local preparation, external setup pending. Use Node 22.18+ or the project's tested Node 24 tooling. No cloud resources have been provisioned by this change.

## Target and client setup

1. Select a dedicated Firebase Staging project. Record its exact ID, the reviewing administrator and review timestamp in `firebase/staging-target.json`. Keep `releaseToFactory=false`.
2. Add a `staging` project alias with the same ID in `.firebaserc`. Keep the default demo alias. Never point this alias at Production.
3. Copy `.env.example` to repository-root `.env.local`. Set `VITE_DATA_MODE=staging`, the six public Firebase Web App config identifiers, `VITE_DEFAULT_ORG_ID`, and `VITE_APPCHECK_SITE_KEY`. The target must use its default Firebase Auth domain and default bucket. Vite now reads this root environment directory.
4. Enable the chosen staging email/password provider, create separate named participant accounts and configure authorized domains. The Staging screen ignores fixture role query parameters and uses real Firebase sign-in.
5. Register the web app with reCAPTCHA Enterprise and initialize App Check before Firestore/Auth access. Enable enforcement for supported resources after checking valid-request metrics. Callable Functions already enforce App Check outside emulators. A debug token must never be put in a `VITE_` variable or a deployed bundle; any local debug provider experiment needs a separately registered and revoked operator token.
6. Run `pnpm staging:preflight`. Exit 2 means configuration is incomplete. Success validates local identifiers only; it does not assert deployment, IAM, App Check enforcement, billing or UAT success.

Firebase references: [reCAPTCHA Enterprise setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [project aliases](https://firebase.google.com/docs/cli#project_aliases), [Functions App Check](https://firebase.google.com/docs/app-check/cloud-functions).

## Server and explicit deployment

Set the non-secret Functions runtime variables `PRECAST_ENVIRONMENT=staging` and `PRECAST_STAGING_PROJECT_ID=<reviewed ID>` using the target-specific Functions environment configuration. Runtime commands reject a `GCLOUD_PROJECT` mismatch. The external Production Release callable remains blocked during M9 rehearsal.

Use runtime service accounts and ADC, managed secret storage for any future secrets, and separate operator/deploy/runtime identities. Review exact permissions before granting access; do not use Owner/Editor as application runtime roles. Configure budget notifications, log retention, error alerts and named incident/backup owners in the staging project.

After tests and a staging-mode build pass, an authorized operator can run:

```text
firebase deploy --config firebase/staging.firebase.json --project <reviewed-staging-project-id> --only firestore:rules,firestore:indexes,storage,functions,hosting
```

Use the exact reviewed ID, not an inferred default. Retain deployment output, Rules/index versions, build revision and App Check metrics. This command is documented only and has not been executed. The hosting configuration publishes only `apps/web/dist`, not the repository or test IFC.

## Pilot identities and data migration

The supplied fixture seed is for loopback emulators only. Never run it against Staging: it contains fixed passwords and synthetic engineering evidence.

Provision seven distinct UIDs for BIM Coordinator, Engineer, Checker, QS, Detailer, Production Manager and Project Manager. Record them in `docs/pilot/evidence.json`. Have the operator create only approved organization/project membership metadata with effective/expiry dates and minimum capabilities. No tool here imports fixture approvals or copies Pilot data to Production. Automated staging migration is deferred until exact accounts, data ownership and retention dates are assigned.

Create a new Pilot project with G0–G7 `notStarted`, no current approved artifact IDs, and `PILOT / NOT FOR PRODUCTION` identity. Record each imported file's hash, data owner, privacy review, retention date and cleanup owner. The local IFC contains author metadata; its deployment is not part of this change. Scanner/parser absence keeps uploaded files quarantined. DWG is not yet accepted by the current IFC/PDF intake contract.

## Smoke test and rollout boundary

In staging mode, verify the displayed Firebase project and organization, sign in with the assigned account, verify membership reads, then sign out. Test denied access with an unprovisioned account and cross-tenant/expired accounts. Record actual test evidence; automated local tests do not replace this step.

The staging UI is a sign-in/membership rehearsal screen. Full workflow screens still contain fixture IDs and are intentionally not mounted against Staging. Dynamic artifact selection and real pilot provisioning must be completed before a cloud G0–G7 walkthrough. Local emulator workflow tests remain available.

## Recovery and production decision

Before UAT, record a staging backup/restore exercise with backup ID, timestamp, source revision, isolated restore target and reconciliation results. Retain immutable files and audit data for the approved period; cleanup requires explicit object/document inventories and the data owner's approval.

Rollback: record the last tested application/Rules/Functions revision and Hosting version before deploying, pause new intake if a critical failure occurs, restore the recorded application configuration to Staging, verify memberships and snapshot consistency, and replay only idempotent commands with known receipts. Never rewrite released evidence to make a rollback pass. Assign an incident lead and confirm recovery time/data-loss objectives with the operator.

Update the evidence register after independent reviewers validate the actual results. `pnpm pilot:readiness` reports outstanding checks; `node --experimental-strip-types tools/pilot-readiness.mjs docs/pilot/evidence.json --require-ready` exits 2 while blocked. Even a ready report grants no Production deployment or fabrication authority.
