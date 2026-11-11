import { expect, test } from '@playwright/test';
import { ADMIN_STATE } from './storage-states';

// Runs in the `admin` project, after the Visitor journeys, because it restocks Bon Iver "i, i"
test.use({ storageState: ADMIN_STATE });

test.describe('Managing Records as the Demo Admin', () => {
  test('restocks a Record, gives it an existing cover and sees both in the Catalog', async ({ page }) => {
    await page.goto('/#/admin/records');
    await page.getByRole('button', { name: 'Edit i, i' }).click();
    await expect(page.getByRole('heading', { name: 'Edit a Record' })).toBeVisible();

    await page.getByLabel('Stock').fill('5');
    // Covers are listed sorted, so Cover 1 is beatles1.webp; the radio sits invisibly over its image
    await page.getByRole('radio', { name: 'Cover 1', exact: true }).check({ force: true });
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved "i, i" by Bon Iver.')).toBeVisible();

    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Shop' }).click();
    const card = page.getByRole('main').getByRole('article').filter({ hasText: 'i, i' });
    await expect(card.getByRole('img', { name: /i, i/ })).toHaveAttribute('src', /\/uploads\/covers\/beatles1\.webp$/);
    await expect(card).not.toContainText('Out of stock');

    await card.getByRole('link', { name: 'i, i' }).click();
    await expect(page.getByRole('heading', { name: 'i, i', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
  });
});
