import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Shop, aRecord, api, button, serverError, setUpShop, signInAsCustomer } from '../shopping.testing';

describe('Checkout page', () => {
  let shop: Shop;
  const kindOfBlue = aRecord({ id: 'r1', title: 'Kind of Blue', price: 2499, stock: 3 });

  beforeEach(async () => {
    shop = await setUpShop();
    // Signed up in Madrid, so the location fields start filled in
    signInAsCustomer({ name: 'Ana', countryId: 'es', communityId: 'c1', provinceId: 'p1' });
    shop.cart.setQuantity(kindOfBlue, 2);
  });

  afterEach(() => shop.http.verify());

  async function open(): Promise<void> {
    await shop.harness.navigateByUrl('/checkout');
    shop.http.expectOne(api('/location/countries')).flush([{ id: 'es', name: 'Spain', isoCode: 'ES' }]);
    shop.http.expectOne(api('/location/communities')).flush([{ id: 'c1', name: 'Madrid' }]);
    shop.http.expectOne(api('/location/provinces/c1')).flush([{ id: 'p1', name: 'Madrid', communityId: 'c1' }]);
    shop.http.expectOne(api('/api/records/r1')).flush(kindOfBlue);
    await shop.settle();
  }

  function type(id: string, value: string): void {
    const input = shop.page().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function fillAddress(): void {
    type('checkout-street', 'Calle Mayor 1');
    type('checkout-city', 'Madrid');
    type('checkout-postal-code', '28013');
  }

  const placeOrder = (): void => button(shop, 'checkout.placeOrder').click();
  const alert = (): string => shop.page().querySelector('form [role="alert"]')!.textContent!.trim();

  it('summarises the Cart', async () => {
    await open();

    expect(shop.page().querySelector('.summary-line__title')!.textContent).toBe('Kind of Blue');
    expect(shop.page().querySelector('.checkout__total strong')!.textContent!.trim()).toBe('$49.98');
  });

  it('flags every missing address field and places nothing', async () => {
    await open();

    placeOrder();
    await shop.settle();

    const errors = Array.from(shop.page().querySelectorAll('.field__error'))
      .filter((error) => error.textContent!.includes('checkout.required'))
      .map((error) => error.id);
    expect(errors).toEqual(['checkout-street-error', 'checkout-city-error', 'checkout-postal-code-error']);
    shop.http.expectNone(api('/api/orders'));
  });

  it('places the Order, empties the Cart and goes to the order confirmation', async () => {
    await open();
    fillAddress();

    placeOrder();
    const request = shop.http.expectOne(api('/api/orders'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      lines: [{ recordId: 'r1', quantity: 2 }],
      shippingAddress: {
        name: 'Ana',
        street: 'Calle Mayor 1',
        city: 'Madrid',
        postalCode: '28013',
        isoCode: 'ES',
        communityId: 'c1',
        provinceId: 'p1'
      }
    });
    request.flush({ id: 'o1' });
    await shop.settle();

    expect(TestBed.inject(Router).url).toBe('/orders/o1/confirmation');
    expect(shop.cart.lines()).toEqual([]);
    shop.http.expectOne(api('/api/orders/o1')); // the confirmation page loads the Order
  });

  it('shows an error when the Order cannot be placed, and keeps the Cart', async () => {
    await open();
    fillAddress();

    placeOrder();
    shop.http.expectOne(api('/api/orders')).flush(null, serverError);
    await shop.settle();

    expect(alert()).toBe('checkout.error');
    expect(TestBed.inject(Router).url).toBe('/checkout');
    expect(shop.cart.quantityOf('r1')).toBe(2);
  });

  it('explains a rejected Order and lowers the Cart to the copies left', async () => {
    await open();
    fillAddress();

    placeOrder();
    shop.http.expectOne(api('/api/orders')).flush(
      {
        code: 'ORDER_REJECTED',
        message: 'Rejected',
        lines: [{ recordId: 'r1', quantity: 2, reason: 'insufficientStock', available: 1 }]
      },
      { status: 409, statusText: 'Conflict' }
    );
    // The summary is refreshed with the stock left
    shop.http.expectOne(api('/api/records/r1')).flush({ ...kindOfBlue, stock: 1 });
    await shop.settle();

    expect(alert()).toContain('checkout.rejectedStock');
    expect(shop.cart.quantityOf('r1')).toBe(1);
  });

  it('shows the empty state when there is nothing to check out', async () => {
    shop.cart.clear();
    await shop.harness.navigateByUrl('/checkout');
    shop.http.match(() => true); // the location lists, which the empty page never shows

    expect(shop.text()).toContain('checkout.empty');
  });
});
