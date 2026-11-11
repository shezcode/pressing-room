import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CartService } from '@data/cart/cart.service';
import { ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; record: ShopRecord }
  | { status: 'notFound' }
  | { status: 'error' };

@Component({
  selector: 'app-record-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, TranslateModule],
  templateUrl: './record-detail.component.html',
  styleUrl: './record-detail.component.scss'
})
export class RecordDetailComponent implements OnInit {
  private readonly cartService: CartService = inject(CartService);
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly state = signal<DetailState>({ status: 'loading' });
  protected readonly record = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.record : null;
  });

  ngOnInit(): void {
    this.load();
  }

  // Also the retry button's handler after a failed load
  protected load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.state.set({ status: 'loading' });
    this.recordsService
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => this.state.set({ status: 'loaded', record }),
        error: (error: HttpErrorResponse) => this.state.set({ status: error.status === 404 ? 'notFound' : 'error' })
      });
  }

  protected inCart(record: ShopRecord): number {
    return this.cartService.quantityOf(record.id);
  }

  // Out of stock Records cannot be added, nor can more copies than exist
  protected canAdd(record: ShopRecord): boolean {
    return this.inCart(record) < record.stock;
  }

  protected addToCart(record: ShopRecord): void {
    this.cartService.add(record);
  }

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }

  // The variant (LP, 2xLP) is the more precise label when a Record has one
  protected formatLabel(record: ShopRecord): string {
    return record.variant ?? record.format;
  }
}
