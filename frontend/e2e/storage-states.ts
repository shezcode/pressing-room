import { join } from 'node:path';
import { Page } from '@playwright/test';

// Written by the setup project; use with `test.use({ storageState: CUSTOMER_STATE })`
export const CUSTOMER_STATE = join(__dirname, '.auth', 'customer.json');
export const ADMIN_STATE = join(__dirname, '.auth', 'admin.json');

// The API token of the signed-in page, for journeys that call the API directly
export const sessionToken = async (page: Page): Promise<string> =>
  JSON.parse((await page.evaluate(() => localStorage.getItem('pressing-room.session'))) ?? '{}').token;
