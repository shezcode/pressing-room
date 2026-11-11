import { Shop, aRecord, api, button, notFound, serverError, setUpShop } from '../shopping.testing';

describe('Record detail page', () => {
  let shop: Shop;

  beforeEach(async () => {
    shop = await setUpShop();
  });

  afterEach(() => shop.http.verify());

  async function open(id: string): Promise<void> {
    await shop.harness.navigateByUrl(`/records/${id}`);
  }

  it('shows the Record', async () => {
    await open('r1');
    shop.http.expectOne(api('/api/records/r1')).flush(aRecord());
    await shop.settle();

    expect(shop.page().querySelector('h1')!.textContent).toBe('Kind of Blue');
    expect(shop.text()).toContain('Miles Davis');
    expect(shop.text()).toContain('LP - 1959');
    expect(shop.text()).toContain('$24.99');
    expect(shop.text()).toContain('Modal jazz.');
  });

  it('disables adding an Out of stock Record', async () => {
    await open('r1');
    shop.http.expectOne(api('/api/records/r1')).flush(aRecord({ stock: 0 }));
    await shop.settle();

    expect(button(shop, 'racks.outOfStock').disabled).toBeTrue();
  });

  it('adds copies to the Cart until it holds every copy in stock', async () => {
    await open('r1');
    shop.http.expectOne(api('/api/records/r1')).flush(aRecord({ stock: 2 }));
    await shop.settle();

    button(shop, 'recordDetail.addToCart').click();
    await shop.settle();
    button(shop, 'recordDetail.addToCart').click();
    await shop.settle();

    expect(button(shop, 'recordDetail.allInCart').disabled).toBeTrue();
    expect(shop.cart.quantityOf('r1')).toBe(2);
    expect(shop.page().querySelector('a[href="/cart"]')).not.toBeNull();
  });

  it('says so when no Record has the id', async () => {
    await open('nope');
    shop.http.expectOne(api('/api/records/nope')).flush(null, notFound);
    await shop.settle();

    expect(shop.text()).toContain('recordDetail.notFoundTitle');
    expect(shop.page().querySelector('button')).toBeNull();
  });

  it('offers a retry when loading fails', async () => {
    await open('r1');
    shop.http.expectOne(api('/api/records/r1')).flush(null, serverError);
    await shop.settle();
    expect(shop.page().querySelector('[role="alert"]')!.textContent).toContain('recordDetail.error');

    button(shop, 'recordDetail.retry').click();
    shop.http.expectOne(api('/api/records/r1')).flush(aRecord());
    await shop.settle();

    expect(shop.page().querySelector('h1')!.textContent).toBe('Kind of Blue');
  });
});
