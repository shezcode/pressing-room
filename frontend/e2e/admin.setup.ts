import { expect, test as setup } from '@playwright/test';
import { ADMIN_STATE } from './storage-states';

setup('sign in as the Demo Admin', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Try as Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Manage Records', level: 1 })).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});
