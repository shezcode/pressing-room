import { defineConfig, devices } from '@playwright/test';

// Started by e2e/run.mjs; set E2E_BASE_URL yourself to run against an app that is already up
const baseURL = process.env['E2E_BASE_URL'];
if (!baseURL) {
  throw new Error('E2E_BASE_URL is not set: run `npm run e2e`');
}

export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  forbidOnly: !!process.env['CI'],
  // No retries: the suite must pass first time
  retries: 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]] : 'list',
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'retain-on-failure'
  },
  projects: [
    // Signs in once per run: sign-in shares a rate limit of 20 requests / 15 min per IP
    { name: 'setup', testMatch: /\.setup\.ts$/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['admin.spec.ts', 'reset.spec.ts'],
      dependencies: ['setup']
    },
    // Journeys that change data other journeys assert run one project at a time, after them
    { name: 'admin', use: { ...devices['Desktop Chrome'] }, testMatch: 'admin.spec.ts', dependencies: ['chromium'] },
    // Restarts the container, so it must run last and alone
    { name: 'reset', use: { ...devices['Desktop Chrome'] }, testMatch: 'reset.spec.ts', dependencies: ['admin'] }
  ]
});
