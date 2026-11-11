import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Shop, aRecord, api } from '../../shopping.testing';
import { COVERS, flushList, openAdminRecords, rows, submitForm, type } from '../admin.testing';

// The form lives on the Admin records page, so it is driven through /admin/records
describe('Record form', () => {
  let shop: Shop;
  const theWall = aRecord({ id: 'r1', artist: 'Pink Floyd', title: 'The Wall', variant: null, coverUrl: COVERS[1] });
  const forEmma = aRecord({ id: 'r2', artist: 'Bon Iver', title: 'For Emma', year: 2007, price: 1999, stock: 2 });

  afterEach(() => shop.http.verify());

  const el = (): HTMLElement => shop.page();
  const fileInput = (): HTMLInputElement | null => el().querySelector('input[type="file"]');
  const coverOptions = (): HTMLInputElement[] => Array.from(el().querySelectorAll('input[name="record-cover-pick"]'));
  const fieldError = (id: string): string => el().querySelector(`#${id}-error`)!.textContent!.trim();
  const heading = (): string => el().querySelector('.admin__create .admin__heading')!.textContent!.trim();
  const sent = (method: 'POST' | 'PUT', path: string) => shop.http.expectOne({ method, url: api(path) });

  function fillNewRecord(): void {
    type(shop, 'record-artist', 'Bon Iver');
    type(shop, 'record-title', 'For Emma');
    type(shop, 'record-year', '2007');
    type(shop, 'record-price', '19.99');
    type(shop, 'record-stock', '2');
  }

  function chooseFile(file: File): void {
    const input = fileInput()!;
    const files = new DataTransfer();
    files.items.add(file);
    input.files = files.files;
    input.dispatchEvent(new Event('change'));
  }

  async function editFirstRow(): Promise<void> {
    el().querySelector<HTMLButtonElement>('tbody tr button')!.click();
    await shop.settle();
  }

  describe('with demo mode off', () => {
    beforeEach(async () => {
      shop = await openAdminRecords([theWall]);
    });

    it('shows the file input and no cover picker', () => {
      expect(fileInput()).not.toBeNull();
      expect(coverOptions().length).toBe(0);
      expect(el().textContent).not.toContain('admin.form.coverDemoDisabled');
    });

    it('creates a Record with the uploaded cover and shows it at the top of the list', async () => {
      fillNewRecord();
      const file = new File(['png'], 'cover.png', { type: 'image/png' });
      chooseFile(file);
      await submitForm(shop);

      const request = sent('POST', '/api/records');
      const body = request.request.body as FormData;
      expect(body.get('artist')).toBe('Bon Iver');
      expect(body.get('title')).toBe('For Emma');
      expect(body.get('year')).toBe('2007');
      // The form takes dollars and the API stores cents
      expect(body.get('price')).toBe('1999');
      expect(body.get('stock')).toBe('2');
      expect(body.get('cover')).toEqual(file);
      expect(body.has('coverUrl')).toBeFalse();
      request.flush(forEmma);
      flushList(shop, [forEmma, theWall]);
      await shop.settle();

      expect(rows(shop).map((row) => row[1])).toEqual(['For Emma', 'The Wall']);
      expect(el().querySelector('.admin__success')!.textContent!.trim()).toBe('admin.form.created');
      expect(el().querySelector<HTMLInputElement>('#record-artist')!.value).toBe('');
    });

    it('requires a file when creating a Record', async () => {
      fillNewRecord();
      await submitForm(shop);

      shop.http.expectNone(api('/api/records'));
      expect(fieldError('record-cover')).toBe('admin.form.errors.coverRequired');
    });

    it('edits a Record, starting from its stored values', async () => {
      await editFirstRow();

      expect(heading()).toBe('admin.form.editHeading');
      expect(el().querySelector<HTMLInputElement>('#record-title')!.value).toBe('The Wall');
      expect(el().querySelector<HTMLInputElement>('#record-price')!.value).toBe('24.99');

      type(shop, 'record-title', 'The Wall (Remastered)');
      await submitForm(shop);

      const request = sent('PUT', '/api/records/r1');
      const body = request.request.body as FormData;
      expect(body.get('title')).toBe('The Wall (Remastered)');
      // No new file keeps the current cover
      expect(body.has('cover')).toBeFalse();
      request.flush({ ...theWall, title: 'The Wall (Remastered)' });
      await shop.settle();

      expect(rows(shop).map((row) => row[1])).toEqual(['The Wall (Remastered)']);
      expect(heading()).toBe('admin.form.heading');
    });

    it('shows each field error the API returns next to its field', async () => {
      // With a real message, so the API's own wording is what the Admin reads
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', { admin: { form: { errors: { rejected: '{{message}}' } } } });
      translate.use('en');
      fillNewRecord();
      chooseFile(new File(['png'], 'cover.png', { type: 'image/png' }));
      await submitForm(shop);

      sent('POST', '/api/records').flush(
        { message: 'Invalid record', errors: { title: 'Title is too similar', genre: 'Unknown genre', cover: 'Not an image' } },
        { status: 400, statusText: 'Bad Request' }
      );
      await shop.settle();

      expect(fieldError('record-title')).toBe('Title is too similar');
      expect(fieldError('record-genre')).toBe('Unknown genre');
      expect(fieldError('record-cover')).toBe('Not an image');
      expect(fieldError('record-artist')).toBe('');
      expect(el().querySelector('#record-title')!.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('with demo mode on', () => {
    beforeEach(async () => {
      shop = await openAdminRecords([theWall], { demo: true });
    });

    it('replaces the file input with a picker over the existing covers and a demo note', () => {
      expect(fileInput()).toBeNull();
      expect(coverOptions().length).toBe(COVERS.length);
      const previews = Array.from(el().querySelectorAll<HTMLImageElement>('.record-form__cover-option img'));
      expect(previews.map((img) => img.getAttribute('src'))).toEqual(COVERS.map((url) => api(url)));
      expect(el().textContent).toContain('admin.form.coverDemoDisabled');
    });

    it('requires picking a cover when creating a Record', async () => {
      fillNewRecord();
      await submitForm(shop);

      shop.http.expectNone(api('/api/records'));
      expect(fieldError('record-cover')).toBe('admin.form.errors.coverRequired');
    });

    it('sends the picked cover when creating a Record', async () => {
      fillNewRecord();
      coverOptions()[0].click();
      await submitForm(shop);

      const request = sent('POST', '/api/records');
      const body = request.request.body as FormData;
      expect(body.get('coverUrl')).toBe(COVERS[0]);
      expect(body.has('cover')).toBeFalse();
      request.flush(forEmma);
      flushList(shop, [forEmma, theWall]);
      await shop.settle();
    });

    it("keeps the Record's cover when editing without picking another", async () => {
      await editFirstRow();
      expect(coverOptions()[1].checked).toBeTrue();
      await submitForm(shop);

      const request = sent('PUT', '/api/records/r1');
      expect((request.request.body as FormData).has('coverUrl')).toBeFalse();
      request.flush(theWall);
    });

    it('switches to another existing cover when editing', async () => {
      await editFirstRow();
      coverOptions()[0].click();
      await submitForm(shop);

      const request = sent('PUT', '/api/records/r1');
      expect((request.request.body as FormData).get('coverUrl')).toBe(COVERS[0]);
      request.flush({ ...theWall, coverUrl: COVERS[0] });
    });
  });
});
