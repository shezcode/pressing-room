import { expect, test } from '@playwright/test';
import { CUSTOMER_STATE } from './storage-states';

// Signed in through "Try as Customer" once per run by customer.setup.ts
test.use({ storageState: CUSTOMER_STATE });

test.describe('Shopping as the Demo Customer', () => {
  test('checks out and finds the Record in the Collection beside the seeded Orders', async ({ page }) => {
    await page.goto('/#/records');
    // El madrileño is in neither seeded Order, so it can only reach the Collection through this checkout
    await page.getByRole('link', { name: 'El madrileño' }).click();
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('link', { name: 'Your cart, 1 items' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();

    await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();
    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Street address').fill('Calle Mayor 1');
    await page.getByLabel('City').fill('Madrid');
    await page.getByLabel('Postal code').fill('28013');
    await page.getByLabel('Country').selectOption({ label: 'España' });
    await page.getByLabel('Community').selectOption({ label: 'Madrid' });
    await page.getByLabel('Province').selectOption({ label: 'Madrid' });
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByRole('heading', { name: 'Thank you for your order' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('El madrileño');
    await expect(page.getByRole('main')).toContainText('Ada Lovelace');
    await expect(page.getByRole('link', { name: 'Your cart, 0 items' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Collection' }).click();
    await expect(page.getByRole('heading', { name: 'Your Collection' })).toBeVisible();
    const collection = page.getByRole('main').getByRole('listitem');
    await expect(collection).toHaveCount(5);
    for (const [title, owned] of [
      ['El madrileño', 1],
      ['Cobre', 1],
      ['Abbey Road', 2],
      ['The Dark Side of the Moon', 1],
      ['Madvillany', 1]
    ] as const) {
      await expect(collection.filter({ hasText: title })).toContainText(`Owned: ${owned}`);
    }
  });
});
