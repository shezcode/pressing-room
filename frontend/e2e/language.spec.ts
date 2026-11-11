import { expect, test } from '@playwright/test';

test.describe('Language', () => {
  test('switching to Spanish translates the banner and the page', async ({ page }) => {
    await page.goto('/#/records');
    await expect(page.getByRole('heading', { name: 'Catalog', level: 1 })).toBeVisible();

    await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Spanish' }).click();

    await expect(page.getByText('Demo de portfolio de una tienda ficticia.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Principal', exact: true }).getByRole('link', { name: 'Tienda' })
    ).toBeVisible();
    await expect(page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
