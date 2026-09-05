import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const vite = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--config', 'apps/web/vite.config.ts', '--host', '127.0.0.1'], {
  cwd: process.cwd(),
  env: { ...process.env, VITE_DATA_MODE: 'emulator' },
  stdio: 'inherit',
});

async function waitForWeb() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:5173');
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error('Vite did not become ready for browser tests.');
}

let status = 1;
try {
  await waitForWeb();
  const result = spawnSync(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
  if (result.error !== undefined) throw result.error;
  status = result.status ?? 1;
} finally {
  if (vite.pid !== undefined) {
    vite.kill('SIGTERM');
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(vite.pid), '/T', '/F'], { stdio: 'ignore' });
  }
}

process.exit(status);
