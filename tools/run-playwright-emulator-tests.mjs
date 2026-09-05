import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const result = spawnSync(
  process.execPath,
  [
    resolve('node_modules/firebase-tools/lib/bin/firebase.js'),
    '--config',
    'firebase/firebase.json',
    'emulators:exec',
    '--project',
    'demo-precast-m1',
    '--only',
    'auth,functions,firestore,storage',
    'node tools/seed-emulators.mjs && node tools/run-browser-tests.mjs',
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      XDG_CONFIG_HOME: resolve('.firebase-config'),
      XDG_CACHE_HOME: resolve('.firebase-cache'),
      FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
    },
    stdio: 'inherit',
  },
);

if (result.error !== undefined) throw result.error;
process.exit(result.status ?? 1);
