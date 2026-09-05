import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { resolveClientEnvironment } from '../../packages/domain/src/environment';
import stagingTarget from '../../firebase/staging-target.json';

export default defineConfig(({ mode }) => {
  const envDir = resolve(import.meta.dirname, '../..');
  resolveClientEnvironment({ ...loadEnv(mode, envDir, 'VITE_'), ...process.env }, stagingTarget.projectId);
  return {
    root: import.meta.dirname,
    envDir,
    plugins: [react()],
    server: { port: 5173 },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});
