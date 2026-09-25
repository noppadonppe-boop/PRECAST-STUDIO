import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { resolveClientEnvironment } from '../../packages/domain/src/environment';
import stagingTarget from '../../firebase/staging-target.json';

export default defineConfig(({ mode }) => {
  const envDir = resolve(import.meta.dirname, '../..');
  const testEnv = mode === 'test' ? { VITE_DATA_MODE: 'fixture', VITE_FIREBASE_PROJECT_ID: 'demo-precast-m1' } : {};
  resolveClientEnvironment({ ...loadEnv(mode, envDir, 'VITE_'), ...process.env, ...testEnv }, stagingTarget.projectId);
  return {
    root: import.meta.dirname,
    envDir,
    // Keep authored TypeScript/TSX authoritative when legacy adjacent JS emit files exist.
    resolve: { extensions: ['.ts', '.tsx', '.mjs', '.js', '.mts', '.jsx', '.json'] },
    define: mode === 'test' ? { 'import.meta.env.VITE_DATA_MODE': JSON.stringify('fixture'), 'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('demo-precast-m1') } : {},
    plugins: [react()],
    ...(mode === 'catalogue' ? { publicDir: false, build: { outDir: 'dist-catalogue', rollupOptions: { input: resolve(import.meta.dirname, 'catalogue.html') } } } : {}),
    server: { port: 5173 },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});
