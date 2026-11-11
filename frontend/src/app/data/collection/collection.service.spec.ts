import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CollectionEntry } from './collection.model';
import { CollectionService } from './collection.service';

describe('CollectionService', () => {
  it('list fetches the Customer’s Collection', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    const entries: CollectionEntry[] = [
      {
        recordId: 'r1',
        artist: 'Nina Simone',
        title: 'Pastel Blues',
        format: 'Vinyl',
        coverUrl: '/covers/r1.jpg',
        quantity: 2,
        inShop: false
      }
    ];
    let result: CollectionEntry[] | undefined;

    TestBed.inject(CollectionService)
      .list()
      .subscribe((e) => (result = e));

    const req = backend.expectOne('http://localhost:3000/api/collection');
    expect(req.request.method).toBe('GET');
    req.flush(entries);
    expect(result).toEqual(entries);
    backend.verify();
  });
});
