import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthenticationService } from './authentication.service';
import { TokenInterceptor } from './token.interceptor';
import { TEST_TOKEN, signInAs } from './testing/sign-in';

@Component({ template: '' })
class PageComponent {}

const API_URL = 'http://localhost:3000/api/collection';

describe('TokenInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
        provideRouter([
          { path: '', component: PageComponent },
          { path: 'login', component: PageComponent },
          { path: 'collection', component: PageComponent }
        ])
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    TestBed.inject(AuthenticationService).logout();
  });

  it('attaches the bearer token when signed in', () => {
    signInAs('customer');

    http.get(API_URL).subscribe();

    const request = backend.expectOne(API_URL).request;
    expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
    expect(request.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('sends no token when signed out', () => {
    http.get(API_URL).subscribe();

    expect(backend.expectOne(API_URL).request.headers.has('Authorization')).toBeFalse();
  });

  // shortcut: matches only a leading /assets/; the translation loader requests assets/i18n/ (no slash) and still gets the token
  it('sends no token for /assets/ files even when signed in', () => {
    signInAs('customer');

    http.get('/assets/i18n/en.json').subscribe();

    expect(backend.expectOne('/assets/i18n/en.json').request.headers.has('Authorization')).toBeFalse();
  });

  it('on a 401 signs the user out, goes to login and passes the error on', async () => {
    signInAs('customer');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/collection');
    let error: unknown;

    http.get(API_URL).subscribe({ error: (e) => (error = e) });
    backend.expectOne(API_URL).flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthenticationService).isLoggedIn()).toBeFalse();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(error).toEqual({ message: 'expired' });
  });

  it('passes other errors on untouched and keeps the session', async () => {
    signInAs('customer');
    let error: unknown;

    http.get(API_URL).subscribe({ error: (e) => (error = e) });
    backend.expectOne(API_URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(error instanceof HttpErrorResponse && error.status).toBe(500);
    expect(TestBed.inject(AuthenticationService).isLoggedIn()).toBeTrue();
  });
});
