import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const workspaceConfig = resolve('.firebase-config');
const workspaceCache = resolve('.firebase-cache');
const firebaseCli = resolve('node_modules/firebase-tools/lib/bin/firebase.js');

const result = spawnSync(
  process.execPath,
  [
    firebaseCli,
    '--config',
    'firebase/firebase.json',
    'emulators:exec',
    '--project',
    'demo-precast-m0',
    '--only',
    'firestore,storage',
    'vitest run firebase/tests/src',
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      XDG_CONFIG_HOME: workspaceConfig,
      XDG_CACHE_HOME: workspaceCache,
      FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
    },
    stdio: 'inherit',
  },
);

if (result.error !== undefined) throw result.error;
process.exit(result.status ?? 1);

