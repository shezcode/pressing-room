import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { RecordsService } from '@data/records/records.service';
import { RacksComponent } from './racks.component';

describe('RacksComponent', () => {
  let recordsService: jasmine.SpyObj<RecordsService>;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    recordsService = jasmine.createSpyObj('RecordsService', ['list', 'coverSrc']);
    recordsService.list.and.returnValue(of({ records: [], total: 0, page: 1, limit: 9 }));

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideRouter([{ path: '', component: RacksComponent }]), { provide: RecordsService, useValue: recordsService }]
    });
    harness = await RouterTestingHarness.create();
  });

  it('loads the newest 9 Records once, ignoring an old search parameter', async () => {
    await harness.navigateByUrl('/?search=miles', RacksComponent);

    expect(recordsService.list).toHaveBeenCalledOnceWith({ page: 1, limit: 9, format: undefined });
  });

  const el = (): HTMLElement => harness.routeNativeElement!;

  it('filters by Format in-page without touching the address, and says when nothing matches', async () => {
    await harness.navigateByUrl('/', RacksComponent);

    Array.from(el().querySelectorAll<HTMLButtonElement>('.format-filter__btn'))
      .find((button) => button.textContent!.trim() === 'racks.filters.cd')!
      .click();
    harness.detectChanges();

    expect(recordsService.list).toHaveBeenCalledWith({ page: 1, limit: 9, format: 'CD' });
    expect(TestBed.inject(Router).url).toBe('/');
    expect(el().querySelector('[role="status"]')!.textContent!.trim()).toBe('racks.noMatches');
  });

  it('has no "load more" and links to the full Catalog', async () => {
    recordsService.list.and.returnValue(of({ records: [], total: 40, page: 1, limit: 9 }));
    await harness.navigateByUrl('/', RacksComponent);

    expect(el().textContent).not.toContain('racks.loadMore');
    expect(el().querySelector('a[href="/records"]')!.textContent!.trim()).toBe('racks.browseCatalog');
  });
});
