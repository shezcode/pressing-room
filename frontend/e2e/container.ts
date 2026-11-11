import { execFileSync } from 'node:child_process';
import { APIRequestContext, expect } from '@playwright/test';

// Set by run.mjs. The container keeps its name and host port, so run.mjs still removes it at the end
export const CONTAINER = process.env['E2E_CONTAINER'];

// The demo reset runs before the server listens, so a healthy answer means fresh seed data
export const restartContainer = async (request: APIRequestContext) => {
  execFileSync('docker', ['restart', '--time', '2', CONTAINER!], { stdio: 'ignore' });
  await expect
    .poll(async () => (await request.get('/api/health').catch(() => null))?.ok() ?? false, { timeout: 90_000 })
    .toBe(true);
};
