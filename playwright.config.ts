import { defineConfig, devices } from '@playwright/test';

// Load .env.e2e if it exists (for local development)
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.e2e' });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 2560, height: 1440 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } },
    },
  ],

  // Only use webServer for local testing (when E2E_BASE_URL is localhost)
  ...(process.env.E2E_BASE_URL?.includes('localhost') ? {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  } : {}),
});
