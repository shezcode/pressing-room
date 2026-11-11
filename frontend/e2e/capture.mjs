#!/usr/bin/env node
// `npm run capture:readme`: the README's screenshots (light and dark) and journey GIF, taken from the demo container
// into docs/readme/. Not part of the test suite (Playwright only collects *.spec.ts and *.setup.ts). Needs ffmpeg.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { withDemoContainer } from './demo-container.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'readme');
const viewport = { width: 1280, height: 800 };
const THEMES = { light: 'light-theme', dark: 'dark-theme' };

// The theme toggle only swaps this body class (ThemeService); it is not persisted, so apply it after every load
const open = async (page, path, theme, heading) => {
  await page.goto(path);
  await page.evaluate((cls) => document.body.classList.replace('light-theme', cls), THEMES[theme]);
  await expect(page.getByRole('heading', { name: heading, level: 1 }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // let the Material transitions settle
};

const signIn = async (page, role, heading) => {
  await page.goto('/#/login');
  await page.getByRole('button', { name: `Try as ${role}` }).click();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
};

const shoot = (page, name, theme) => page.screenshot({ path: join(outDir, `${name}-${theme}.jpg`), type: 'jpeg', quality: 75 });

const screenshots = async (browser) => {
  for (const theme of Object.keys(THEMES)) {
    const visitor = await browser.newPage({ viewport, locale: 'en-US' });
    await open(visitor, '/', theme, /./);
    await shoot(visitor, 'home', theme);
    await open(visitor, '/#/records', theme, 'Catalog');
    await shoot(visitor, 'catalog', theme);
    await visitor.close();

    const customer = await browser.newPage({ viewport, locale: 'en-US' });
    await signIn(customer, 'Customer', 'Your Collection');
    await open(customer, '/#/collection', theme, 'Your Collection');
    await shoot(customer, 'collection', theme);
    await customer.close();

    const admin = await browser.newPage({ viewport, locale: 'en-US' });
    await signIn(admin, 'Admin', 'Manage Records');
    await open(admin, '/#/admin/records', theme, 'Manage Records');
    await shoot(admin, 'admin', theme);
    await admin.close();
  }
};

// Home -> Shop -> a Record -> Add to cart -> Cart, recorded as video and turned into a small GIF
const journeyGif = async (browser) => {
  const videoDir = mkdtempSync(join(tmpdir(), 'pressing-room-capture-'));
  try {
    const size = { width: 1280, height: 720 };
    const context = await browser.newContext({ viewport: size, locale: 'en-US', recordVideo: { dir: videoDir, size } });
    const page = await context.newPage();
    const pause = () => page.waitForTimeout(1200);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause();
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Shop' }).click();
    await expect(page.getByRole('heading', { name: 'Catalog', level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await pause();
    await page.getByRole('link', { name: 'Abbey Road' }).click();
    await expect(page.getByRole('heading', { name: 'Abbey Road', level: 1 })).toBeVisible();
    await pause();
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await pause();
    await page.getByRole('link', { name: 'View cart' }).click();
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    await pause();
    const video = page.video();
    await context.close();
    const palette =
      'fps=6,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4';
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-ss',
      '0.5',
      '-i',
      await video.path(),
      '-vf',
      palette,
      join(outDir, 'journey.gif')
    ]);
  } finally {
    rmSync(videoDir, { recursive: true, force: true });
  }
};

process.exit(
  await withDemoContainer('capture', async (baseURL) => {
    mkdirSync(outDir, { recursive: true });
    const browser = await chromium.launch();
    try {
      // newPage/newContext below take baseURL from here
      const withBase = {
        newPage: (options) => browser.newPage({ baseURL, ...options }),
        newContext: (options) => browser.newContext({ baseURL, ...options })
      };
      await screenshots(withBase);
      await journeyGif(withBase);
      console.log(`capture: wrote ${outDir}`);
      return 0;
    } finally {
      await browser.close();
    }
  })
);
