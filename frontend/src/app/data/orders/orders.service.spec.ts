import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Order, OrderRejection, ShippingAddressInput } from './order.model';
import { OrdersService } from './orders.service';

const API = 'http://localhost:3000/api/orders';

const ADDRESS: ShippingAddressInput = {
  name: 'Ana',
  street: 'Calle Mayor 1',
  city: 'Madrid',
  postalCode: '28013',
  isoCode: 'ES',
  communityId: 'c-13',
  provinceId: 'p-28'
};

const ORDER: Order = {
  id: 'o 1',
  customerId: 'customer-1',
  lines: [
    {
      recordId: 'r1',
      artist: 'Nina Simone',
      title: 'Pastel Blues',
      format: 'Vinyl',
      price: 2499,
      coverUrl: '/covers/r1.jpg',
      quantity: 2
    }
  ],
  shippingAddress: { ...ADDRESS, country: 'Spain', community: 'Madrid', province: 'Madrid' },
  total: 4998,
  status: 'Placed',
  datePlaced: '2026-01-01T00:00:00.000Z'
};

describe('OrdersService', () => {
  let service: OrdersService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrdersService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('place posts only ids, quantities and the address, and returns the Order', () => {
    let result: Order | undefined;

    service.place([{ recordId: 'r1', quantity: 2 }], ADDRESS).subscribe((o) => (result = o));

    const req = backend.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ lines: [{ recordId: 'r1', quantity: 2 }], shippingAddress: ADDRESS });
    req.flush(ORDER);
    expect(result).toEqual(ORDER);
  });

  it('place passes a 409 rejection on with its failing lines', () => {
    const rejection: OrderRejection = {
      code: 'ORDER_REJECTED',
      message: 'Not enough stock',
      lines: [{ recordId: 'r1', quantity: 2, reason: 'insufficientStock', available: 1 }]
    };
    let error: HttpErrorResponse | undefined;

    service.place([{ recordId: 'r1', quantity: 2 }], ADDRESS).subscribe({ error: (e) => (error = e) });

    backend.expectOne(API).flush(rejection, { status: 409, statusText: 'Conflict' });
    expect(error?.status).toBe(409);
    expect(error?.error).toEqual(rejection);
  });

  it('get fetches one Order by its encoded id', () => {
    let result: Order | undefined;

    service.get('o 1').subscribe((o) => (result = o));

    const req = backend.expectOne(`${API}/o%201`);
    expect(req.request.method).toBe('GET');
    req.flush(ORDER);
    expect(result).toEqual(ORDER);
  });
});
