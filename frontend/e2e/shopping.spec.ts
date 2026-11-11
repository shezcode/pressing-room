import { expect, Page, test } from '@playwright/test';

// A Visitor browsing the seeded Catalog (backend/scripts/seed.js)
const openCatalog = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Shop' }).click();
  await expect(page.getByRole('heading', { name: 'Catalog', level: 1 })).toBeVisible();
};

const recordTitles = (page: Page) => page.getByRole('main').getByRole('heading', { level: 3 });

test.describe('Shopping as a Visitor', () => {
  test('browses the whole Catalog from the Shop link', async ({ page }) => {
    await openCatalog(page);

    await expect(recordTitles(page)).toHaveCount(9);
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(recordTitles(page)).toHaveCount(11);
    await expect(page.getByRole('button', { name: 'Load more' })).toBeHidden();
  });

  test('searches the Catalog by artist', async ({ page }) => {
    await openCatalog(page);
    await page.getByRole('searchbox', { name: 'Search' }).fill('Beatles');
    await page.getByRole('searchbox', { name: 'Search' }).press('Enter');

    await expect(page.getByRole('heading', { name: "2 Records for 'Beatles'", level: 1 })).toBeVisible();
    await expect(recordTitles(page)).toHaveText(['1967-1970', 'Abbey Road']);
  });

  test('filters the Catalog by Format', async ({ page }) => {
    await openCatalog(page);
    const formats = page.getByRole('group', { name: 'Filter by format' });
    await formats.getByRole('button', { name: 'Cassette' }).click();

    await expect(formats.getByRole('button', { name: 'Cassette' })).toHaveAttribute('aria-pressed', 'true');
    await expect(recordTitles(page)).toHaveText(['Madvillany']);

    await formats.getByRole('button', { name: 'CD' }).click();
    await expect(recordTitles(page)).toHaveText(['Nothing but the best']);
  });

  test('opens a Record and adds it to the Cart', async ({ page }) => {
    await openCatalog(page);
    await page.getByRole('link', { name: 'Abbey Road' }).click();

    await expect(page.getByRole('heading', { name: 'Abbey Road', level: 1 })).toBeVisible();
    await expect(page.getByText('In stock')).toBeVisible();
    await page.getByRole('button', { name: 'Add to cart' }).click();

    await expect(page.getByRole('status')).toContainText('1 in your cart.');
    await expect(page.getByRole('link', { name: 'Your cart, 1 items' })).toBeVisible();
    await page.getByRole('link', { name: 'View cart' }).click();
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Quantity of Abbey Road' })).toContainText('1');
  });

  test('cannot add an Out of stock Record to the Cart', async ({ page }) => {
    await openCatalog(page);
    await page.getByRole('searchbox', { name: 'Search' }).fill('Bon Iver');
    await page.getByRole('searchbox', { name: 'Search' }).press('Enter');
    await page.getByRole('link', { name: 'i, i' }).click();

    await expect(page.getByRole('heading', { name: 'i, i', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Your cart, 0 items' })).toBeVisible();
  });
});
