import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pilotProvisioningSchema } from '../packages/schemas/src/pilotProvisioning.ts';

const args = process.argv.slice(2);
if (args.some((arg) => arg.startsWith('--') && arg !== '--apply' && !arg.startsWith('--confirm-project=')) || args.filter((arg) => !arg.startsWith('--')).length !== 1) throw new Error('Expected one plan path and only --apply / --confirm-project=ID options.');
const planPath = args.find((arg) => !arg.startsWith('--'));
if (!planPath) throw new Error('Usage: provision-pilot.mjs plan.json [--apply --confirm-project=ID]');
const plan = pilotProvisioningSchema.parse(JSON.parse(readFileSync(planPath, 'utf8')));
const target = JSON.parse(readFileSync('firebase/staging-target.json', 'utf8'));
const aliases = JSON.parse(readFileSync('.firebaserc', 'utf8'));
const targetReady = target.schemaVersion === '1.0.0' && target.environment === 'staging' && target.projectId === plan.firebaseProjectId && typeof target.reviewedBy === 'string' && target.reviewedBy.trim().length > 0 && typeof target.reviewedAt === 'string' && Number.isFinite(Date.parse(target.reviewedAt)) && Date.parse(target.reviewedAt) <= Date.now() && target.releaseToFactory === false && aliases.projects?.staging === target.projectId;
const summary = { mode: args.includes('--apply') ? 'apply' : 'preview', firebaseProjectId: plan.firebaseProjectId, orgId: plan.orgId, projectId: plan.projectId, targetReady: Boolean(targetReady), writes: { organizations: 1, projects: 1, organizationMemberships: 7, projectMemberships: 7, auditEvents: 1, receipts: 1 }, gateStates: 'G0–G7 notStarted', engineeringArtifacts: 0, authAccountsCreated: 0 };
console.log(JSON.stringify(summary, null, 2));
if (args.includes('--apply')) {
  if (!targetReady || !args.includes(`--confirm-project=${plan.firebaseProjectId}`)) throw new Error('Apply requires a reviewed matching Staging target and explicit --confirm-project.');
  if (Object.entries(process.env).some(([key, value]) => key.includes('EMULATOR') && value)) throw new Error('Staging apply cannot run with emulator overrides.');
  const requireFromFunctions = createRequire(new URL('../apps/functions/package.json', import.meta.url));
  const { initializeApp, deleteApp } = requireFromFunctions('firebase-admin/app');
  const { getAuth } = requireFromFunctions('firebase-admin/auth');
  const { build } = requireFromFunctions('esbuild');
  const app = initializeApp({ projectId: plan.firebaseProjectId }, 'pilot-operator');
  try {
    const auth = getAuth(app);
    for (const uid of new Set([...plan.participants.map((item) => item.uid), plan.reviewedBy, plan.dataOwner, plan.cleanupOwner])) {
      const user = await auth.getUser(uid);
      if (user.disabled || !user.emailVerified) throw new Error('Every assigned account/owner must exist, be enabled and have a verified email.');
    }
    const outfile = resolve('apps/functions/dist/pilot-operator.cjs');
    await build({ entryPoints: ['apps/functions/src/pilotProvisioning.ts'], outfile, bundle: true, platform: 'node', format: 'cjs', external: ['firebase-admin', 'firebase-admin/*'] });
    const { provisionPilot } = requireFromFunctions(outfile);
    console.log(JSON.stringify(await provisionPilot(app, plan, { projectId: plan.firebaseProjectId, emulator: false })));
  } finally { await deleteApp(app); }
}
