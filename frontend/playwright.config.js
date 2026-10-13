/** Run desktop and mobile journeys against a tier-local Vite server, one worker. */
import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';
const env = { ...loadEnv('test', process.cwd(), ''), ...process.env };
const host = env.E2E_HOST || '127.0.0.1';
const port = Number(env.E2E_PORT || 5174);
const baseURL = `http://${host}:${port}`;
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host ${host} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
