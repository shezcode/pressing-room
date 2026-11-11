import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Community, Country, Province } from './location.model';
import { LocationsService } from './locations.service';

const API = 'http://localhost:3000/location';

describe('LocationsService', () => {
  let service: LocationsService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LocationsService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('countries fetches every country', () => {
    const countries: Country[] = [{ id: 'es', name: 'Spain', isoCode: 'ES' }];
    let result: Country[] | undefined;

    service.countries().subscribe((c) => (result = c));

    const req = backend.expectOne(`${API}/countries`);
    expect(req.request.method).toBe('GET');
    req.flush(countries);
    expect(result).toEqual(countries);
  });

  it('communities fetches every community', () => {
    const communities: Community[] = [{ id: 'c-13', name: 'Madrid' }];
    let result: Community[] | undefined;

    service.communities().subscribe((c) => (result = c));

    const req = backend.expectOne(`${API}/communities`);
    expect(req.request.method).toBe('GET');
    req.flush(communities);
    expect(result).toEqual(communities);
  });

  it('provinces fetches the provinces of one community by its encoded id', () => {
    const provinces: Province[] = [{ id: 'p-28', name: 'Madrid', communityId: 'c 13' }];
    let result: Province[] | undefined;

    service.provinces('c 13').subscribe((p) => (result = p));

    const req = backend.expectOne(`${API}/provinces/c%2013`);
    expect(req.request.method).toBe('GET');
    req.flush(provinces);
    expect(result).toEqual(provinces);
  });
});
