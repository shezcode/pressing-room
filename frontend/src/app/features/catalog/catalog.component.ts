import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, distinctUntilChanged, finalize, map } from 'rxjs';
import { FormatFilterComponent } from '@common/format-filter/format-filter.component';
import { RecordGridComponent } from '@common/record-grid/record-grid.component';
import { RECORD_FORMATS, RecordFormat, ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

const PAGE_SIZE = 9;

// Every Record the shop sells; the search term and Format live in the address so reloads and shared links keep them
@Component({
  selector: 'app-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatFilterComponent, RecordGridComponent, TranslateModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent implements OnInit {
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);

  protected readonly activeFormat = signal<RecordFormat | null>(null);
  protected readonly search = signal('');
  protected readonly records = signal<ShopRecord[]>([]);
  // Null until the first page for the current search and Format arrives
  protected readonly total = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly hasMore = computed(() => this.records().length < (this.total() ?? 0));
  protected readonly isFiltered = computed(() => this.activeFormat() !== null || this.search() !== '');

  private lastPage = 0;
  private request?: Subscription;

  ngOnInit(): void {
    // Emits straight away, so this also loads the first page
    this.route.queryParamMap
      .pipe(
        map((params) => {
          const format = params.get('format') as RecordFormat;
          // An unknown format in a hand-edited address falls back to All
          return { search: params.get('search')?.trim() ?? '', format: RECORD_FORMATS.includes(format) ? format : null };
        }),
        distinctUntilChanged((a, b) => a.search === b.search && a.format === b.format),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ search, format }) => {
        this.search.set(search);
        this.activeFormat.set(format);
        this.reload();
      });
  }

  // The address is the source of truth, so the query parameter change triggers the reload
  filterBy(format: RecordFormat | null): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { format }, queryParamsHandling: 'merge' });
  }

  // Also retries the same page after a failure, since the page only advances on success
  loadMore(): void {
    if (this.loading()) {
      return;
    }

    const page = this.lastPage + 1;
    this.loading.set(true);
    this.failed.set(false);

    this.request = this.recordsService
      .list({ page, limit: PAGE_SIZE, search: this.search(), format: this.activeFormat() ?? undefined })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.lastPage = page;
          this.total.set(result.total);
          this.records.update((records) => [...records, ...result.records]);
        },
        error: () => this.failed.set(true)
      });
  }

  // Starts over from the first page, dropping any request still in flight for the old filters
  private reload(): void {
    this.request?.unsubscribe();
    this.lastPage = 0;
    this.records.set([]);
    this.total.set(null);
    this.loadMore();
  }
}
