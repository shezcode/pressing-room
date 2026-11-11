import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CollectionEntry } from '@data/collection/collection.model';
import { CollectionService } from '@data/collection/collection.service';
import { RecordsService } from '@data/records/records.service';

type CollectionStatus = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss'
})
export class CollectionComponent implements OnInit {
  private readonly collectionService: CollectionService = inject(CollectionService);
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly status = signal<CollectionStatus>('loading');
  protected readonly entries = signal<CollectionEntry[]>([]);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.collectionService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          this.entries.set(entries);
          this.status.set('loaded');
        },
        error: () => this.status.set('error')
      });
  }

  protected coverSrc(entry: CollectionEntry): string {
    return this.recordsService.coverSrc(entry.coverUrl);
  }
}
