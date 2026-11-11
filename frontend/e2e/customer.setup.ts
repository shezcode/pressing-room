import { expect, test as setup } from '@playwright/test';
import { CUSTOMER_STATE } from './storage-states';

setup('sign in as the Demo Customer', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Try as Customer' }).click();
  await expect(page.getByRole('heading', { name: 'Your Collection' })).toBeVisible();
  await page.context().storageState({ path: CUSTOMER_STATE });
});
