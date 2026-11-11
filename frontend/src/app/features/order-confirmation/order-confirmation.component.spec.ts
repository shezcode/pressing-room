import { TestRequest } from '@angular/common/http/testing';
import { Order } from '@data/orders/order.model';
import { Shop, api, button, notFound, serverError, setUpShop, signInAsCustomer } from '../shopping.testing';

describe('Order confirmation page', () => {
  let shop: Shop;

  const order: Order = {
    id: 'o1',
    customerId: 'u1',
    lines: [
      {
        recordId: 'r1',
        artist: 'Miles Davis',
        title: 'Kind of Blue',
        format: 'Vinyl',
        price: 2499,
        coverUrl: '/covers/r1.jpg',
        quantity: 2
      }
    ],
    shippingAddress: {
      name: 'Ana',
      street: 'Calle Mayor 1',
      city: 'Madrid',
      postalCode: '28013',
      isoCode: 'ES',
      communityId: 'c1',
      provinceId: 'p1',
      country: 'Spain',
      community: 'Comunidad de Madrid',
      province: 'Madrid'
    },
    total: 4998,
    status: 'Placed',
    datePlaced: '2026-11-10T12:00:00.000Z'
  };

  beforeEach(async () => {
    shop = await setUpShop();
    signInAsCustomer();
  });

  afterEach(() => shop.http.verify());

  async function open(answer: (request: TestRequest) => void): Promise<void> {
    await shop.harness.navigateByUrl('/orders/o1/confirmation');
    answer(shop.http.expectOne(api('/api/orders/o1')));
    await shop.settle();
  }

  it('shows the Order: its lines, total and shipping address', async () => {
    await open((request) => request.flush(order));

    expect(shop.page().querySelector('h1')!.textContent).toBe('orderConfirmation.title');
    expect(shop.page().querySelector('.order-line__title')!.textContent).toBe('Kind of Blue');
    expect(shop.page().querySelector('.order-line__subtotal')!.textContent!.trim()).toBe('$49.98');
    expect(shop.page().querySelector('.confirmation__total strong')!.textContent!.trim()).toBe('$49.98');
    expect(shop.page().querySelector('address')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Ana Calle Mayor 1 28013 Madrid Madrid, Comunidad de Madrid Spain'
    );
  });

  it('says so when the Order is not found', async () => {
    await open((request) => request.flush(null, notFound));

    expect(shop.page().querySelector('h1')!.textContent).toBe('orderConfirmation.notFoundTitle');
  });

  it('offers a retry when loading fails', async () => {
    await open((request) => request.flush(null, serverError));
    expect(shop.page().querySelector('[role="alert"]')!.textContent).toBe('orderConfirmation.error');

    button(shop, 'orderConfirmation.retry').click();
    shop.http.expectOne(api('/api/orders/o1')).flush(order);
    await shop.settle();

    expect(shop.page().querySelector('.order-line__title')!.textContent).toBe('Kind of Blue');
  });
});
