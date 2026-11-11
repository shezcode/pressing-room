import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ShopRecord } from '@data/records/record.model';
import { Shop, aRecord, api, button, notFound, serverError, setUpShop, signInAsCustomer } from '../shopping.testing';

describe('Cart page', () => {
  let shop: Shop;
  const kindOfBlue = aRecord({ id: 'r1', title: 'Kind of Blue', price: 2499, stock: 3 });
  const blueTrain = aRecord({ id: 'r2', title: 'Blue Train', artist: 'John Coltrane', price: 1000, stock: 5 });

  beforeEach(async () => {
    shop = await setUpShop();
  });

  afterEach(() => shop.http.verify());

  async function openWith(...records: ShopRecord[]): Promise<void> {
    await shop.harness.navigateByUrl('/cart');
    for (const record of records) {
      shop.http.expectOne(api(`/api/records/${record.id}`)).flush(record);
    }
    await shop.settle();
  }

  const lines = (): HTMLElement[] => Array.from(shop.page().querySelectorAll('.cart-line'));
  const total = (): string => shop.page().querySelector('.cart__total strong')!.textContent!.trim();

  it('shows the empty state when the Cart is empty', async () => {
    await shop.harness.navigateByUrl('/cart');

    expect(shop.text()).toContain('cart.empty');
    expect(lines().length).toBe(0);
  });

  it('lists each line with its subtotal and the total', async () => {
    shop.cart.setQuantity(kindOfBlue, 2);
    shop.cart.setQuantity(blueTrain, 1);
    await openWith(kindOfBlue, blueTrain);

    expect(lines().map((line) => line.querySelector('.cart-line__title')!.textContent!.trim())).toEqual([
      'Kind of Blue',
      'Blue Train'
    ]);
    expect(lines()[0].querySelector('.cart-line__subtotal')!.textContent!.trim()).toBe('$49.98');
    expect(total()).toBe('$59.98');
  });

  it('changes a quantity within the stock', async () => {
    shop.cart.setQuantity(kindOfBlue, 2);
    await openWith(kindOfBlue);
    const [decrease, increase] = Array.from(lines()[0].querySelectorAll<HTMLButtonElement>('.cart-line__step'));

    increase.click();
    await shop.settle();
    expect(lines()[0].querySelector('output')!.textContent).toBe('3');
    expect(increase.disabled).withContext('the Cart holds every copy in stock').toBeTrue();

    decrease.click();
    await shop.settle();
    decrease.click();
    await shop.settle();
    expect(lines()[0].querySelector('output')!.textContent).toBe('1');
    expect(decrease.disabled).toBeTrue();
    expect(total()).toBe('$24.99');
  });

  it('lowers a quantity to what is left in stock', async () => {
    shop.cart.setQuantity(kindOfBlue, 3);
    await openWith({ ...kindOfBlue, stock: 1 });

    expect(lines()[0].querySelector('output')!.textContent).toBe('1');
  });

  it('removes lines, down to the empty state', async () => {
    shop.cart.setQuantity(kindOfBlue, 1);
    shop.cart.setQuantity(blueTrain, 1);
    await openWith(kindOfBlue, blueTrain);

    button(shop, 'cart.remove').click();
    await shop.settle();
    expect(lines().length).toBe(1);
    expect(total()).toBe('$10');

    button(shop, 'cart.remove').click();
    await shop.settle();
    expect(shop.text()).toContain('cart.empty');
    expect(shop.cart.lines()).toEqual([]);
  });

  it('blocks checkout while a line is Out of stock or its Record was deleted', async () => {
    shop.cart.setQuantity(kindOfBlue, 1);
    shop.cart.setQuantity(blueTrain, 1);
    await shop.harness.navigateByUrl('/cart');
    shop.http.expectOne(api('/api/records/r1')).flush({ ...kindOfBlue, stock: 0 });
    shop.http.expectOne(api('/api/records/r2')).flush(null, notFound);
    await shop.settle();

    expect(shop.text()).toContain('racks.outOfStock');
    expect(shop.text()).toContain('cart.unavailable');
    expect(button(shop, 'cart.checkout').disabled).toBeTrue();
  });

  it('offers a retry when the Records cannot be loaded', async () => {
    shop.cart.setQuantity(kindOfBlue, 1);
    await shop.harness.navigateByUrl('/cart');
    shop.http.expectOne(api('/api/records/r1')).flush(null, serverError);
    await shop.settle();
    expect(shop.text()).toContain('cart.error');

    button(shop, 'cart.retry').click();
    shop.http.expectOne(api('/api/records/r1')).flush(kindOfBlue);
    await shop.settle();
    expect(lines().length).toBe(1);
  });

  it('sends a visitor to sign in on the way to checkout', async () => {
    shop.cart.setQuantity(kindOfBlue, 1);
    await openWith(kindOfBlue);

    button(shop, 'cart.checkout').click();
    await shop.settle();

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fcheckout');
    shop.http.match(() => true); // the login page's own requests
  });

  it('takes a Customer straight to checkout', async () => {
    signInAsCustomer();
    shop.cart.setQuantity(kindOfBlue, 1);
    await openWith(kindOfBlue);

    button(shop, 'cart.checkout').click();
    await shop.settle();

    expect(TestBed.inject(Router).url).toBe('/checkout');
    shop.http.match(() => true); // the checkout page's own requests
  });
});
