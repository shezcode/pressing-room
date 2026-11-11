import { TestBed } from '@angular/core/testing';
import { DemoService } from '@data/demo/demo.service';
import { ShopRecord } from '@data/records/record.model';
import { signInAs } from '@core/security/testing/sign-in';
import { Shop, api, setUpShop } from '../shopping.testing';

// Shared setup for the Admin page specs: the shopping page setup, signed in as the Admin, on /admin/records.

export const COVERS = ['/uploads/covers/beatles1.webp', '/uploads/covers/pinkfloyd.webp'];

export async function openAdminRecords(records: ShopRecord[], { demo = false } = {}): Promise<Shop> {
  const shop = await setUpShop();
  signInAs('admin');
  // Startup reads the demo status; with demo mode on the form then asks for the existing covers
  TestBed.inject(DemoService).load();
  shop.http.expectOne(api('/api/demo')).flush({ enabled: demo });
  await shop.harness.navigateByUrl('/admin/records');
  flushList(shop, records);
  await shop.settle();
  if (demo) {
    shop.http.expectOne(api('/api/demo/covers')).flush({ covers: COVERS });
    await shop.settle();
  }
  return shop;
}

// Answers the first page of the list, which the page asks for on open and again after a create or delete
export function flushList(shop: Shop, records: ShopRecord[]): void {
  shop.http
    .expectOne((req) => req.method === 'GET' && req.url === api('/api/records') && req.params.get('page') === '1')
    .flush({ records, total: records.length, page: 1, limit: 20 });
}

export function type(shop: Shop, id: string, value: string): void {
  const input = shop.page().querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

export async function submitForm(shop: Shop): Promise<void> {
  shop.page().querySelector<HTMLButtonElement>('form button[type="submit"]')!.click();
  await shop.settle();
}

// Each row's cells as text, without the cover and the action buttons
export function rows(shop: Shop): string[][] {
  return Array.from(shop.page().querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td'))
      .slice(1, -1)
      .map((cell) => cell.textContent!.replace(/\s+/g, ' ').trim())
  );
}
