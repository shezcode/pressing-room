import { expect, test } from '@playwright/test';
import { ADMIN_STATE, sessionToken } from './storage-states';

test.use({ storageState: ADMIN_STATE });

test.describe('Cover upload on the Demo', () => {
  test('the record form offers existing covers instead of a file input', async ({ page }) => {
    await page.goto('/#/admin/records');
    await expect(page.getByRole('heading', { name: 'Add a Record' })).toBeVisible();

    await expect(page.getByRole('group', { name: 'Cover image' }).getByRole('radio')).toHaveCount(11);
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByText('Cover upload is disabled in the demo.')).toBeVisible();
  });

  test('the API refuses a direct multipart cover upload with 403', async ({ page, request }) => {
    await page.goto('/#/admin/records');
    await expect(page.getByRole('heading', { name: 'Manage Records', level: 1 })).toBeVisible();

    const response = await request.post('/api/records', {
      headers: { Authorization: `Bearer ${await sessionToken(page)}` },
      multipart: {
        artist: 'Test Artist',
        title: 'Uploaded cover',
        format: 'Vinyl',
        year: '2024',
        genre: 'Rock',
        price: '2000',
        stock: '1',
        description: 'Should never be created.',
        cover: { name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('not really a png') }
      }
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ message: 'Cover upload is disabled in the demo' });
  });
});
