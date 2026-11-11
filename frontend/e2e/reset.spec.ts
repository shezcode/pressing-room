import { expect, Page, test } from '@playwright/test';
import { CONTAINER, restartContainer } from './container';
import { ADMIN_STATE, CUSTOMER_STATE, sessionToken } from './storage-states';

// Runs last, in the `reset` project: the restart takes the app away from any journey still running
test.skip(!CONTAINER, 'restarts the container, so it needs `npm run e2e`');
// The restart and the fresh demo reset take several seconds
test.setTimeout(120_000);

const catalogTitles = async (page: Page) => {
  await page.goto('/#/records');
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.getByRole('button', { name: 'Load more' })).toBeHidden();
  return page.getByRole('main').getByRole('heading', { level: 3 });
};

test('a container restart puts the Catalog and the Demo Customer back to the seed', async ({ browser, request }) => {
  // The Demo Customer orders Cobre (the API is enough: checkout.spec covers the form)
  const customer = await (await browser.newContext({ storageState: CUSTOMER_STATE })).newPage();
  await customer.goto('/');
  const cobre = (await (await request.get('/api/records?search=Cobre')).json()).records[0];
  const order = await request.post('/api/orders', {
    headers: { Authorization: `Bearer ${await sessionToken(customer)}` },
    data: {
      lines: [{ recordId: cobre.id, quantity: 1 }],
      shippingAddress: {
        name: 'Ada Lovelace',
        street: 'Calle Mayor 1',
        city: 'Madrid',
        postalCode: '28013',
        isoCode: 'ES',
        communityId: '12',
        provinceId: '28'
      }
    }
  });
  expect(order.status()).toBe(201);
  await customer.goto('/#/collection');
  await expect(customer.getByRole('main').getByRole('listitem').filter({ hasText: 'Cobre' })).toContainText('Owned: 2');

  // The Admin deletes Harry's house
  const admin = await (await browser.newContext({ storageState: ADMIN_STATE })).newPage();
  await admin.goto('/#/admin/records');
  await admin.getByRole('button', { name: "Delete Harry's house" }).click();
  await admin.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(admin.getByText(`Deleted "Harry's house" by Harry Styles.`)).toBeVisible();
  await expect(await catalogTitles(admin)).toHaveCount(10);

  await restartContainer(request);

  // The old sessions belong to accounts the reset replaced, so look again as a Visitor, then a fresh Demo Customer
  const visitor = await browser.newPage();
  const titles = await catalogTitles(visitor);
  await expect(titles).toHaveCount(11);
  await expect(titles.filter({ hasText: "Harry's house" })).toHaveCount(1);
  // The admin journey restocked Bon Iver; the seed has it Out of stock again
  await expect(visitor.getByRole('main').getByRole('article').filter({ hasText: 'i, i' })).toContainText('Out of stock');

  await visitor.goto('/#/login');
  await visitor.getByRole('button', { name: 'Try as Customer' }).click();
  await expect(visitor.getByRole('heading', { name: 'Your Collection' })).toBeVisible();
  const collection = visitor.getByRole('main').getByRole('listitem');
  await expect(collection).toHaveCount(4);
  for (const [title, owned] of [
    ['Cobre', 1],
    ['Abbey Road', 2],
    ['The Dark Side of the Moon', 1],
    ['Madvillany', 1]
  ] as const) {
    await expect(collection.filter({ hasText: title })).toContainText(`Owned: ${owned}`);
  }
});
