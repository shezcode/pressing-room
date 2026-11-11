#!/usr/bin/env node
// `npm run e2e [-- <playwright args>]`: run Playwright against the production image in demo mode
// (started and always removed by demo-container.mjs). The exit code is Playwright's.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDemoContainer } from './demo-container.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const runPlaywright = (baseUrl, name) =>
  new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'test', '--config', join(here, 'playwright.config.ts'), ...process.argv.slice(2)], {
      cwd: join(here, '..'),
      stdio: 'inherit',
      env: { ...process.env, E2E_BASE_URL: baseUrl, E2E_CONTAINER: name }
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });

process.exit(await withDemoContainer('e2e', runPlaywright));
