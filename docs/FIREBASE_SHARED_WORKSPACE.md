# Firebase shared workspace

The repository-root `.env` selects `VITE_DATA_MODE=shared` and supplies the six Firebase web config values for `precast-studio`. `.env` and `.env.*` are ignored by Git, except `.env.example`. Vite reads the repository root; restart it after environment changes. A local `.env.local`, if present, takes precedence.

Run `pnpm dev` and open `http://127.0.0.1:5173`. The application restores an existing Firebase Auth session or signs in anonymously. Every signed-in user opens the same shared workspace; user IDs are recorded as attribution, never used as storage folders. The web config is included in the browser bundle as required by Firebase; access is governed by Firebase rules.

## Firestore layout

The Firebase project is `precast-studio`, using the default Firestore database. The collection is also named `precast-studio`, and its document is `root`:

```text
precast-studio/root
  projects/{projectId}          Project directory
  intake/{projectId}-notes      BIM intake notes/references
  criteria/{projectId}-notes    Design criteria notes/references
  panel/{projectId}             Draft panel geometry
  panel/{projectId}-notes       Panel menu notes
  loads/{projectId}-notes       Load notes/references
  analysis/{projectId}-notes    Analysis notes/references
  design/{projectId}-notes      Design notes/references
  cost/{projectId}              Unit rate and waste percentage
  cost/{projectId}-notes        Estimate notes
  report/{projectId}-notes      Calculation report notes
  shop/{projectId}-notes        Drawing/export notes
  release/{projectId}-notes     Production release notes
  review/workspace             Shared review notes
  team/workspace               Shared team information
  libraries/workspace          Shared engineering library notes
  settings/workspace           Shared workspace settings notes
  audit/{eventId}              Automatically recorded create/update events
```

Collections appear when their first record is saved. Documents hold `data`, `revision`, `updatedAt`, and `updatedBy`. Transactions save a record and its audit event together. A stale revision is rejected with an instruction to load the latest data. Listeners update clean forms across browsers; unsaved edits remain local until explicitly saved. Closing or reloading the browser with unsaved edits prompts the user. Save notes before switching menus.

The shared mode saves actual project records, panel draft edits, estimate assumptions, and per-menu notes to Firestore. The starting two-panel geometry remains an explicitly labeled example, not imported BIM or certified engineering output. This change does not implement a solver, technical approvals, production release, file uploads, or changes to Firebase access roles. Existing fixture/emulator engineering workflows remain available in their original modes. No fixture projects or approval results are copied into the live database.

## Startup handling

The environment resolver now accepts the explicit shared project. Local modes remain restricted to `demo-precast-m1`, and staging retains its existing checks. A dynamic bootstrap handles module/configuration failures before React mounts; an error boundary handles render failures. Firebase authentication or connection failures show a retry screen instead of an empty page.

## Verification on 2026-09-05

- Created/read the real `precast-studio/root` document.
- Two distinct anonymous users wrote, read, updated, and reread one shared Firestore document.
- Two separate Chrome contexts verified project creation, live shared panel and note edits, persistence after reload, unit-rate saving, stale-write rejection, and audit events. No browser page errors occurred.
- Temporary verification documents/projects were deleted. Audit entries are retained as records of the test actions.
- Browser screenshot: `tmp/firebase-verification/shared-cost.png`.

To repeat the live checks (they create temporary test data and require cleanup permissions):

```sh
node --env-file=.env tools/verify-shared-firebase.mjs
# With pnpm dev running:
node tools/verify-shared-browser.mjs
```

`firebase/shared.firestore.rules` and `firebase/shared.firebase.json` provide a separately scoped rules configuration for this shared namespace, with signed-in access including anonymous users, revision checks, and append-only audit events. These rules are tested locally; they have **not been deployed**. The live verification used the project's existing deployed rules. No existing remote rules were replaced. The supplied rules deny deletes; temporary verification cleanup requires appropriate existing rules or an administrative cleanup mechanism if these rules are deployed later.

## Firebase Hosting deployment

The hosting site is `precast-studio`, associated with this project's Firebase web app. Configure the repository-root environment for shared mode, then run:

```sh
pnpm build
firebase deploy --config firebase/shared.firebase.json --project precast-studio --only hosting
```

The site serves `apps/web/dist` at `https://precast-studio.web.app`, with SPA rewrites for direct project and stage URLs. Hashed assets use immutable caching; the HTML entry point is revalidated. This command deploys Hosting only and preserves existing Firestore rules, Storage rules, and Functions. Firebase CLI authentication with access to the project is required. Never commit `.env` or Firebase CLI credentials.

Firebase references: [Firestore data model](https://firebase.google.com/docs/firestore/data-model), [anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth).
