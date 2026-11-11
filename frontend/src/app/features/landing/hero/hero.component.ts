import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnInit {
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  // The most recently added Record: its cover is the hero artwork
  protected readonly latest = signal<ShopRecord | null>(null);

  ngOnInit(): void {
    this.recordsService
      .list({ page: 1, limit: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.latest.set(result.records[0] ?? null),
        // The hero still works without its artwork
        error: () => this.latest.set(null)
      });
  }

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }
}
