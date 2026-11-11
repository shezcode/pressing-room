import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Shop, aRecord, api } from '../../shopping.testing';
import { flushList, openAdminRecords, rows, submitForm, type } from '../admin.testing';

describe('Admin records page', () => {
  let shop: Shop;
  const kindOfBlue = aRecord({ id: 'r1', artist: 'Miles Davis', title: 'Kind of Blue', stock: 3 });
  const theWall = aRecord({ id: 'r2', artist: 'Pink Floyd', title: 'The Wall', format: 'CD', variant: null, stock: 0 });

  afterEach(() => shop.http.verify());

  // The row's own Edit or Delete button
  function rowButton(row: number, label: 'admin.list.edit' | 'admin.list.delete'): HTMLButtonElement {
    const buttons = Array.from(shop.page().querySelectorAll('tbody tr')[row].querySelectorAll('button'));
    return buttons.find((b) => b.textContent!.trim() === label)!;
  }

  // The confirm dialog opens in the overlay, outside the page
  async function answerDialog(label: 'admin.delete.confirm' | 'admin.delete.keep'): Promise<void> {
    await shop.settle();
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button'));
    // It closes after its exit animation
    const closed = firstValueFrom(TestBed.inject(MatDialog).afterAllClosed);
    buttons.find((b) => b.textContent!.trim() === label)!.click();
    await closed;
    await shop.settle();
  }

  const notice = (): string => shop.page().querySelector('.admin__success')!.textContent!.trim();

  it('lists the Records with their stock', async () => {
    shop = await openAdminRecords([kindOfBlue, { ...theWall, featured: true }]);

    expect(shop.text()).toContain('admin.list.title (2)');
    expect(rows(shop)).toEqual([
      ['Miles Davis', 'Kind of Blue', 'VinylLP', '$24.99', '3', 'admin.list.featuredNo'],
      ['Pink Floyd', 'The Wall', 'CD', '$24.99', '0 racks.outOfStock', 'admin.list.featuredYes']
    ]);
  });

  it('restocks a Record by saving its new stock', async () => {
    shop = await openAdminRecords([kindOfBlue, theWall]);

    rowButton(1, 'admin.list.edit').click();
    await shop.settle();
    type(shop, 'record-stock', '5');
    await submitForm(shop);

    const request = shop.http.expectOne({ method: 'PUT', url: api('/api/records/r2') });
    expect((request.request.body as FormData).get('stock')).toBe('5');
    request.flush({ ...theWall, stock: 5 });
    await shop.settle();

    expect(rows(shop)[1][4]).toBe('5');
    expect(notice()).toBe('admin.form.updated');
  });

  it('deletes a Record once the Admin confirms', async () => {
    shop = await openAdminRecords([kindOfBlue, theWall]);

    rowButton(0, 'admin.list.delete').click();
    await answerDialog('admin.delete.confirm');

    shop.http.expectOne({ method: 'DELETE', url: api('/api/records/r1') }).flush(null, { status: 204, statusText: 'No Content' });
    flushList(shop, [theWall]);
    await shop.settle();

    expect(rows(shop).map((row) => row[1])).toEqual(['The Wall']);
    expect(notice()).toBe('admin.delete.deleted');
  });

  it('keeps the Record when the Admin cancels the delete', async () => {
    shop = await openAdminRecords([kindOfBlue, theWall]);

    rowButton(0, 'admin.list.delete').click();
    await answerDialog('admin.delete.keep');

    shop.http.expectNone(api('/api/records/r1'));
    expect(rows(shop).map((row) => row[1])).toEqual(['Kind of Blue', 'The Wall']);
  });
});
