import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { RecordsService } from '@data/records/records.service';
import { CatalogComponent } from './catalog.component';

describe('CatalogComponent', () => {
  let recordsService: jasmine.SpyObj<RecordsService>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    recordsService = jasmine.createSpyObj('RecordsService', ['list', 'coverSrc']);
    recordsService.list.and.returnValue(of({ records: [], total: 0, page: 1, limit: 9 }));

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([{ path: 'records', component: CatalogComponent }]),
        { provide: RecordsService, useValue: recordsService }
      ]
    });
    harness = await RouterTestingHarness.create();
  });

  it('searches and filters by the search and format query parameters', async () => {
    await harness.navigateByUrl('/records?format=Vinyl&search=miles', CatalogComponent);

    expect(recordsService.list).toHaveBeenCalledWith({ page: 1, limit: 9, search: 'miles', format: 'Vinyl' });
  });

  const press = (label: string): void => {
    const buttons: HTMLButtonElement[] = Array.from(harness.routeNativeElement!.querySelectorAll('.format-filter__btn'));
    buttons.find((button) => button.textContent!.trim() === label)!.click();
  };

  it('writes the chosen Format to the address, keeping the search, and reloads from it', async () => {
    await harness.navigateByUrl('/records?search=miles', CatalogComponent);

    press('racks.filters.cd');
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/records?search=miles&format=CD');
    expect(recordsService.list).toHaveBeenCalledWith({ page: 1, limit: 9, search: 'miles', format: 'CD' });
  });

  it('drops the format parameter when All is chosen', async () => {
    await harness.navigateByUrl('/records?format=Vinyl', CatalogComponent);

    press('racks.filters.all');
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/records');
  });

  it('treats an unknown format in the address as All', async () => {
    await harness.navigateByUrl('/records?format=Shellac', CatalogComponent);

    expect(recordsService.list).toHaveBeenCalledWith({ page: 1, limit: 9, search: '', format: undefined });
  });

  it('heads the page "Catalog" without a search and with the match count with one', async () => {
    recordsService.list.and.returnValue(of({ records: [], total: 3, page: 1, limit: 9 }));
    const heading = (): string => harness.routeNativeElement!.querySelector('h1')!.textContent!.trim();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { catalog: { title: 'Catalog', results: "{{count}} Records for '{{term}}'" } });
    translate.use('en');

    await harness.navigateByUrl('/records', CatalogComponent);
    expect(heading()).toBe('Catalog');

    await harness.navigateByUrl('/records?search=miles', CatalogComponent);
    expect(heading()).toBe("3 Records for 'miles'");
  });
});
