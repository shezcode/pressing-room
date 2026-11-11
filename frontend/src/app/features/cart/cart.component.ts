import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { RouteConstants } from '@core/constants/route.constants';
import { CartService } from '@data/cart/cart.service';
import { ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

type CartStatus = 'loading' | 'loaded' | 'error';

interface CartRow {
  recordId: string;
  quantity: number;
  // Null when the Record no longer exists
  record: ShopRecord | null;
}

@Component({
  selector: 'app-cart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, TranslateModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit {
  private readonly cartService: CartService = inject(CartService);
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly router: Router = inject(Router);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly status = signal<CartStatus>('loading');
  // Display data fetched from the API, so a changed price or stock shows up; null marks a deleted Record
  private readonly records = signal<ReadonlyMap<string, ShopRecord | null>>(new Map());

  protected readonly isEmpty = computed(() => this.cartService.lines().length === 0);
  protected readonly rows = computed<CartRow[]>(() =>
    this.cartService
      .lines()
      .map(({ recordId, quantity }) => ({ recordId, quantity, record: this.records().get(recordId) ?? null }))
  );
  // A deleted or Out of stock Record blocks checkout until it is removed
  protected readonly blocksCheckout = computed(() => this.rows().some((row) => row.record === null || row.record.stock === 0));
  // Cents
  protected readonly total = computed(() =>
    this.rows().reduce((sum, row) => (row.record ? sum + row.record.price * row.quantity : sum), 0)
  );

  private request?: Subscription;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();

    const ids = this.cartService.lines().map((line) => line.recordId);
    if (ids.length === 0) {
      this.status.set('loaded');
      return;
    }

    this.status.set('loading');
    this.request = forkJoin(
      ids.map((id) =>
        this.recordsService.get(id).pipe(
          // A 404 means the Record was deleted; any other failure fails the whole Cart view
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 404) {
              return of(null);
            }
            throw error;
          })
        )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fetched) => {
          this.records.set(new Map(ids.map((id, index) => [id, fetched[index]])));
          this.cartService.capToStock(fetched.filter((record) => record !== null));
          this.status.set('loaded');
        },
        error: () => this.status.set('error')
      });
  }

  protected setQuantity(row: CartRow, quantity: number): void {
    if (row.record) {
      this.cartService.setQuantity(row.record, quantity);
    }
  }

  protected remove(row: CartRow): void {
    this.cartService.remove(row.recordId);
  }

  protected checkout(): void {
    this.router.navigate([RouteConstants.MAIN, RouteConstants.CHECKOUT]);
  }

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }
}
