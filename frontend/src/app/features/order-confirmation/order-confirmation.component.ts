import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Order, OrderLine } from '@data/orders/order.model';
import { OrdersService } from '@data/orders/orders.service';
import { RecordsService } from '@data/records/records.service';

// Someone else's Order answers 404 like a missing one, so both show as not found
type ConfirmationState =
  | { status: 'loading' }
  | { status: 'loaded'; order: Order }
  | { status: 'notFound' }
  | { status: 'error' };

@Component({
  selector: 'app-order-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, RouterLink, TranslateModule],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss'
})
export class OrderConfirmationComponent implements OnInit {
  private readonly ordersService: OrdersService = inject(OrdersService);
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  // The date follows the interface language; prices stay in USD as everywhere else
  protected readonly translate: TranslateService = inject(TranslateService);

  protected readonly state = signal<ConfirmationState>({ status: 'loading' });
  protected readonly order = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.order : null;
  });

  ngOnInit(): void {
    this.load();
  }

  // Also the retry button's handler after a failed load
  protected load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.state.set({ status: 'loading' });
    this.ordersService
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => this.state.set({ status: 'loaded', order }),
        error: (error: HttpErrorResponse) => this.state.set({ status: error.status === 404 ? 'notFound' : 'error' })
      });
  }

  // Covers stay on disk after a Record is deleted (ADR-0001), so the snapshot's cover always resolves
  protected coverSrc(line: OrderLine): string {
    return this.recordsService.coverSrc(line.coverUrl);
  }
}
