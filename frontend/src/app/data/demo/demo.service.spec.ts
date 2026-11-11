import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DemoService } from './demo.service';

const API = 'http://localhost:3000/api/demo';

describe('DemoService', () => {
  let demo: DemoService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    demo = TestBed.inject(DemoService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('is off until the API answers', () => {
    demo.load();

    const req = backend.expectOne(API);
    expect(req.request.method).toBe('GET');
    expect(demo.enabled()).toBeFalse();
    req.flush({ enabled: true });
    expect(demo.enabled()).toBeTrue();
  });

  it('stays off for anything but a clear true', () => {
    demo.load();
    backend.expectOne(API).flush({ enabled: 'true' });

    expect(demo.enabled()).toBeFalse();
  });

  it('stays off when the API fails', () => {
    demo.load();
    backend.expectOne(API).flush(null, { status: 500, statusText: 'Server Error' });

    expect(demo.enabled()).toBeFalse();
  });
});
