import { TestRequest } from '@angular/common/http/testing';
import { CollectionEntry } from '@data/collection/collection.model';
import { Shop, api, button, serverError, setUpShop, signInAsCustomer } from '../shopping.testing';

describe('Collection page', () => {
  let shop: Shop;

  const entry = (overrides: Partial<CollectionEntry>): CollectionEntry => ({
    recordId: 'r1',
    artist: 'Miles Davis',
    title: 'Kind of Blue',
    format: 'Vinyl',
    coverUrl: '/covers/r1.jpg',
    quantity: 1,
    inShop: true,
    ...overrides
  });

  beforeEach(async () => {
    shop = await setUpShop();
    signInAsCustomer();
    await shop.harness.navigateByUrl('/collection');
  });

  afterEach(() => shop.http.verify());

  async function answer(respond: (request: TestRequest) => void): Promise<void> {
    respond(shop.http.expectOne(api('/api/collection')));
    await shop.settle();
  }

  const entries = (): HTMLElement[] => Array.from(shop.page().querySelectorAll('.collection-entry'));

  it('lists the owned Records, linking those still in the shop', async () => {
    await answer((request) =>
      request.flush([entry({ quantity: 2 }), entry({ recordId: 'r9', title: 'Gone Record', inShop: false })])
    );

    expect(entries().length).toBe(2);
    expect(entries()[0].querySelector('a.collection-entry__title')!.getAttribute('href')).toBe('/records/r1');
    expect(entries()[1].querySelector('a')).toBeNull();
    expect(entries()[1].textContent).toContain('collection.leftTheShop');
  });

  it('shows the empty state when nothing has been bought', async () => {
    await answer((request) => request.flush([]));

    expect(shop.text()).toContain('collection.empty');
    expect(entries().length).toBe(0);
  });

  it('offers a retry when loading fails', async () => {
    await answer((request) => request.flush(null, serverError));
    expect(shop.page().querySelector('[role="alert"]')!.textContent).toBe('collection.error');

    button(shop, 'collection.retry').click();
    await answer((request) => request.flush([entry({})]));

    expect(entries().length).toBe(1);
  });
});
