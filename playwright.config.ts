import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(existsSync(chromePath) ? { launchOptions: { executablePath: chromePath } } : {}),
  },
});
