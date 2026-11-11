import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subscriber } from './subscriber.model';
import { SubscribersService } from './subscribers.service';

const API = 'http://localhost:3000/api/subscribers';

describe('SubscribersService', () => {
  let service: SubscribersService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SubscribersService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('subscribe posts the email and returns the Subscriber', () => {
    const subscriber: Subscriber = { email: 'ana@example.com', dateSubscribed: '2026-01-01T00:00:00.000Z' };
    let result: Subscriber | undefined;

    service.subscribe('ana@example.com').subscribe((s) => (result = s));

    const req = backend.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@example.com' });
    req.flush(subscriber);
    expect(result).toEqual(subscriber);
  });

  describe('isAlreadySubscribed', () => {
    function failWith(status: number, body: object): unknown {
      let error: unknown;
      service.subscribe('ana@example.com').subscribe({ error: (e) => (error = e) });
      backend.expectOne(API).flush(body, { status, statusText: 'Error' });
      return error;
    }

    it('recognises the backend’s duplicate answer', () => {
      expect(service.isAlreadySubscribed(failWith(409, { code: 'ALREADY_SUBSCRIBED' }))).toBeTrue();
    });

    it('rejects a 409 with another code', () => {
      expect(service.isAlreadySubscribed(failWith(409, { code: 'OTHER' }))).toBeFalse();
    });

    it('rejects other statuses', () => {
      expect(service.isAlreadySubscribed(failWith(500, { code: 'ALREADY_SUBSCRIBED' }))).toBeFalse();
    });

    it('rejects errors that are not HTTP errors', () => {
      expect(service.isAlreadySubscribed(new Error('offline'))).toBeFalse();
      expect(service.isAlreadySubscribed(new HttpErrorResponse({ status: 409 }))).toBeFalse();
    });
  });
});
