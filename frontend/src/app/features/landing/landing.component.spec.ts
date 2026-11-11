import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { RecordsService } from '@data/records/records.service';
import { SubscribersService } from '@data/subscribers/subscribers.service';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  beforeEach(() => {
    const recordsService = jasmine.createSpyObj<RecordsService>('RecordsService', ['list', 'coverSrc']);
    recordsService.list.and.returnValue(of({ records: [], total: 0, page: 1, limit: 9 }));

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: RecordsService, useValue: recordsService },
        { provide: SubscribersService, useValue: jasmine.createSpyObj('SubscribersService', ['subscribe']) }
      ],
      deferBlockBehavior: DeferBlockBehavior.Manual
    });
  });

  it('keeps the fragment targets in place before the sections load, then fills them in', async () => {
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const sections = ['featured', 'racks', 'about'];

    for (const id of sections) {
      expect(el.querySelector(`#${id}`))
        .withContext(id)
        .not.toBeNull();
      expect(el.querySelector(`#${id} app-${id}`))
        .withContext(id)
        .toBeNull();
    }
    expect(el.querySelector('app-friday-list')).toBeNull();

    const blocks = await fixture.getDeferBlocks();
    expect(blocks.length).toBe(4);
    for (const block of blocks) {
      await block.render(DeferBlockState.Complete);
    }

    for (const id of sections) {
      expect(el.querySelector(`#${id} app-${id}`))
        .withContext(id)
        .not.toBeNull();
    }
    expect(el.querySelector('app-friday-list')).not.toBeNull();
  });
});
