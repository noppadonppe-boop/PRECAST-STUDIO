import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const firebaseCli = resolve('node_modules/firebase-tools/lib/bin/firebase.js');
const child = spawn(process.execPath, [firebaseCli, '--config', 'firebase/firebase.json', 'emulators:start', '--project', 'demo-precast-m1', '--only', 'auth,functions,firestore,storage'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    XDG_CONFIG_HOME: resolve('.firebase-config'),
    XDG_CACHE_HOME: resolve('.firebase-cache'),
    FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill('SIGINT'));
}

child.on('error', (error) => { throw error; });
child.on('exit', (code) => process.exit(code ?? 1));
