import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';
import { RecordFormat, ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';
import { FormatFilterComponent } from '@common/format-filter/format-filter.component';
import { RecordGridComponent } from '@common/record-grid/record-grid.component';

const TEASER_SIZE = 9;

// A preview of the newest Records; searching and paging happen on the Catalog
@Component({
  selector: 'app-racks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatFilterComponent, RecordGridComponent, RouterLink, TranslateModule],
  templateUrl: './racks.component.html',
  styleUrl: './racks.component.scss'
})
export class RacksComponent implements OnInit {
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly activeFormat = signal<RecordFormat | null>(null);
  protected readonly records = signal<ShopRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  private request?: Subscription;

  ngOnInit(): void {
    this.load();
  }

  filterBy(format: RecordFormat | null): void {
    this.activeFormat.set(format);
    this.load();
  }

  // Drops any request still in flight for the old Format
  load(): void {
    this.request?.unsubscribe();
    this.records.set([]);
    this.loading.set(true);
    this.failed.set(false);

    this.request = this.recordsService
      .list({ page: 1, limit: TEASER_SIZE, format: this.activeFormat() ?? undefined })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => this.records.set(result.records),
        error: () => this.failed.set(true)
      });
  }
}
