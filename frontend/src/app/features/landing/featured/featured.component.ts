import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ShopRecord, formatLabel } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

// The backend's largest page: the carousel pages through the Featured Records client-side
const MAX_FEATURED = 100;
const VISIBLE_CARDS = 2;

@Component({
  selector: 'app-featured',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, TranslateModule],
  templateUrl: './featured.component.html',
  styleUrl: './featured.component.scss'
})
export class FeaturedComponent implements OnInit {
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly records = signal<ShopRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  // Index of the first visible card; the carousel wraps around at both ends
  private readonly start = signal(0);

  protected readonly visible = computed(() => {
    const records = this.records();
    const count = Math.min(VISIBLE_CARDS, records.length);
    return Array.from({ length: count }, (_, offset) => records[(this.start() + offset) % records.length]);
  });
  protected readonly canPage = computed(() => this.records().length > 1);

  protected readonly formatLabel = formatLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.recordsService
      .list({ page: 1, limit: MAX_FEATURED, featured: true })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.start.set(0);
          this.records.set(result.records);
        },
        error: () => this.failed.set(true)
      });
  }

  previous(): void {
    this.move(-1);
  }

  next(): void {
    this.move(1);
  }

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }

  private move(step: number): void {
    const length = this.records().length;
    this.start.update((start) => (start + step + length) % length);
  }
}
