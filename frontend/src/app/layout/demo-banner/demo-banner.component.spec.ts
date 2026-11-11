import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env';
import { DemoService } from '@data/demo/demo.service';
import { DemoBannerComponent } from './demo-banner.component';

describe('DemoBannerComponent', () => {
  let fixture: ComponentFixture<DemoBannerComponent>;
  let http: HttpTestingController;

  const banner = (): HTMLElement | null => fixture.nativeElement.querySelector('.demo-banner');

  // Startup reads the demo status once; the test answers that request
  const startWith = async (answer: (request: ReturnType<HttpTestingController['expectOne']>) => void) => {
    TestBed.inject(DemoService).load();
    answer(http.expectOne(`${environment.apiBaseUrl}/api/demo`));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoBannerComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DemoBannerComponent);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows the demo notice when demo mode is on', async () => {
    await startWith((request) => request.flush({ enabled: true }));
    expect(banner()?.textContent).toContain('demo.banner');
  });

  it('shows nothing when demo mode is off', async () => {
    await startWith((request) => request.flush({ enabled: false }));
    expect(banner()).toBeNull();
  });

  it('treats a failed status request as demo mode off', async () => {
    await startWith((request) => request.flush('down', { status: 500, statusText: 'Server Error' }));
    expect(banner()).toBeNull();
  });
});
