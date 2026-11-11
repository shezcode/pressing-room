import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordPage, ShopRecord } from './record.model';
import { RecordsService } from './records.service';

const API = 'http://localhost:3000/api/records';

const RECORD: ShopRecord = {
  id: 'r 1',
  artist: 'Nina Simone',
  title: 'Pastel Blues',
  format: 'Vinyl',
  variant: 'LP',
  year: 1965,
  genre: 'Jazz',
  price: 2499,
  stock: 3,
  coverUrl: '/covers/r1.jpg',
  featured: true,
  description: '',
  dateAdded: '2026-01-01T00:00:00.000Z'
};

describe('RecordsService', () => {
  let service: RecordsService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RecordsService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('list', () => {
    it('asks for one page and returns it', () => {
      const page: RecordPage = { records: [RECORD], total: 1, page: 2, limit: 12 };
      let result: RecordPage | undefined;

      service.list({ page: 2, limit: 12 }).subscribe((p) => (result = p));

      const req = backend.expectOne((r) => r.url === API);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.toString()).toBe('page=2&limit=12');
      req.flush(page);
      expect(result).toEqual(page);
    });

    it('sends search, format and featured when given', () => {
      service.list({ page: 1, limit: 4, search: 'blue', format: 'CD', featured: true }).subscribe();

      const req = backend.expectOne((r) => r.url === API);
      expect(req.request.params.toString()).toBe('page=1&limit=4&search=blue&format=CD&featured=true');
      req.flush({ records: [], total: 0, page: 1, limit: 4 });
    });

    it('leaves out an empty search and featured=false', () => {
      service.list({ page: 1, limit: 4, search: '', featured: false }).subscribe();

      const req = backend.expectOne((r) => r.url === API);
      expect(req.request.params.toString()).toBe('page=1&limit=4');
      req.flush({ records: [], total: 0, page: 1, limit: 4 });
    });
  });

  it('get fetches one Record by its encoded id', () => {
    let result: ShopRecord | undefined;

    service.get('r 1').subscribe((r) => (result = r));

    const req = backend.expectOne(`${API}/r%201`);
    expect(req.request.method).toBe('GET');
    req.flush(RECORD);
    expect(result).toEqual(RECORD);
  });

  it('create posts the multipart body and returns the new Record', () => {
    const body = new FormData();
    body.set('artist', 'Nina Simone');
    let result: ShopRecord | undefined;

    service.create(body).subscribe((r) => (result = r));

    const req = backend.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(body);
    req.flush(RECORD);
    expect(result).toEqual(RECORD);
  });

  it('update puts the multipart body to the Record and returns it', () => {
    const body = new FormData();
    let result: ShopRecord | undefined;

    service.update('r 1', body).subscribe((r) => (result = r));

    const req = backend.expectOne(`${API}/r%201`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBe(body);
    req.flush(RECORD);
    expect(result).toEqual(RECORD);
  });

  it('delete removes the Record', () => {
    let done = false;

    service.delete('r 1').subscribe({ complete: () => (done = true) });

    const req = backend.expectOne(`${API}/r%201`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBeTrue();
  });

  it('coverSrc points cover paths at the API', () => {
    expect(service.coverSrc('/covers/r1.jpg')).toBe('http://localhost:3000/covers/r1.jpg');
  });
});
