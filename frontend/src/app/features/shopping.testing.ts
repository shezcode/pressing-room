import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env';
import { signInAs } from '@core/security/testing/sign-in';
import { SessionUser } from '@core/types/auth';
import { CartService } from '@data/cart/cart.service';
import { ShopRecord } from '@data/records/record.model';
import { routes } from '../app.routes';

// Shared setup for the shopping page specs: the app's real routes and services, with HTTP faked at the boundary.
// No translations are loaded, so the pages show their translation keys.

export const api = (path: string): string => `${environment.apiBaseUrl}${path}`;

export function aRecord(overrides: Partial<ShopRecord> = {}): ShopRecord {
  return {
    id: 'r1',
    artist: 'Miles Davis',
    title: 'Kind of Blue',
    format: 'Vinyl',
    variant: 'LP',
    year: 1959,
    genre: 'Jazz',
    price: 2499,
    stock: 3,
    coverUrl: '/covers/r1.jpg',
    featured: false,
    description: 'Modal jazz.',
    dateAdded: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

export interface Shop {
  harness: RouterTestingHarness;
  http: HttpTestingController;
  cart: CartService;
  page: () => HTMLElement;
  text: () => string;
  // Waits for the page to re-render after a click or a flushed response
  settle: () => Promise<void>;
}

export async function setUpShop(): Promise<Shop> {
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
  });
  const harness = await RouterTestingHarness.create();
  const page = (): HTMLElement => harness.routeNativeElement as HTMLElement;
  return {
    harness,
    http: TestBed.inject(HttpTestingController),
    cart: TestBed.inject(CartService),
    page,
    text: () => page().textContent!.replace(/\s+/g, ' '),
    settle: () => harness.fixture.whenStable()
  };
}

export function signInAsCustomer(user: Partial<SessionUser> = {}): void {
  signInAs('customer', { id: 'u1', name: 'Ana', email: 'ana@example.com', ...user });
}

export function button(shop: Shop, label: string): HTMLButtonElement {
  const found = Array.from(shop.page().querySelectorAll('button')).find((b) => b.textContent!.trim() === label);
  if (!found) {
    throw new Error(`No button labelled "${label}"`);
  }
  return found;
}

export const notFound = { status: 404, statusText: 'Not Found' };
export const serverError = { status: 500, statusText: 'Server Error' };
