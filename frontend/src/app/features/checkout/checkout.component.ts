import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import { RouteConstants } from '@core/constants/route.constants';
import { AuthenticationService } from '@core/security/authentication.service';
import { CartService } from '@data/cart/cart.service';
import { Community, Country, Province } from '@data/locations/location.model';
import { LocationsService } from '@data/locations/locations.service';
import { OrderRejection, RejectedLine } from '@data/orders/order.model';
import { OrdersService } from '@data/orders/orders.service';
import { ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

type SummaryStatus = 'loading' | 'loaded' | 'error';
// `rejected` is a 409: some line is missing or lacks stock, and nothing was ordered.
// `placed` holds the page while it moves on to the confirmation
type PlaceState = 'idle' | 'placing' | 'placed' | 'rejected' | 'failed';

interface SummaryRow {
  recordId: string;
  quantity: number;
  // Null when the Record no longer exists
  record: ShopRecord | null;
}

interface RejectedRow extends RejectedLine {
  // Null when the summary never knew the Record
  title: string | null;
}

@Component({
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  private readonly authenticationService: AuthenticationService = inject(AuthenticationService);
  private readonly cartService: CartService = inject(CartService);
  private readonly locationsService: LocationsService = inject(LocationsService);
  private readonly ordersService: OrdersService = inject(OrdersService);
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly router: Router = inject(Router);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private readonly user = this.authenticationService.user();

  // The name and location are prefilled from the Customer's signup; the rest is entered here
  protected readonly form = new FormGroup({
    name: new FormControl(this.user?.name ?? '', { nonNullable: true, validators: [Validators.required] }),
    street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    isoCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    communityId: new FormControl(this.user?.communityId ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    // Provinces belong to a community, so the select has no options until one is chosen
    provinceId: new FormControl(this.user?.provinceId ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  protected readonly countries = signal<Country[]>([]);
  protected readonly communities = signal<Community[]>([]);
  protected readonly provinces = signal<Province[]>([]);
  protected readonly locationsFailed = signal(false);

  protected readonly summaryStatus = signal<SummaryStatus>('loading');
  protected readonly placeState = signal<PlaceState>('idle');
  // Display data fetched from the API, like on the Cart page; null marks a deleted Record
  private readonly records = signal<ReadonlyMap<string, ShopRecord | null>>(new Map());
  // The lines of the last rejected Order, shown while the state is `rejected`
  protected readonly rejectedLines = signal<RejectedRow[]>([]);

  // Once the Order is placed the Cart is empty, but the page keeps its content until the confirmation shows
  protected readonly isEmpty = computed(() => this.cartService.lines().length === 0 && this.placeState() !== 'placed');
  protected readonly rows = computed<SummaryRow[]>(() =>
    this.cartService
      .lines()
      .map(({ recordId, quantity }) => ({ recordId, quantity, record: this.records().get(recordId) ?? null }))
  );
  // A deleted or Out of stock Record has to be removed on the Cart page first, or the Order would be rejected again
  protected readonly blocksCheckout = computed(() => this.rows().some((row) => row.record === null || row.record.stock === 0));
  // Cents. The server prices the Order itself; this is what the Customer expects to pay
  protected readonly total = computed(() =>
    this.rows().reduce((sum, row) => (row.record ? sum + row.record.price * row.quantity : sum), 0)
  );

  ngOnInit(): void {
    // The prefilled values do not emit, so the signup province survives until the community changes
    this.form.controls.communityId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((communityId) => {
      this.provinces.set([]);
      this.form.controls.provinceId.reset('');
      if (communityId) {
        this.loadProvinces(communityId);
      }
    });

    this.loadLocations();
    this.loadSummary();
  }

  protected loadLocations(): void {
    this.locationsFailed.set(false);

    this.locationsService
      .countries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (countries) => {
          this.countries.set(countries);
          // The signup stores the country id, but an address holds its ISO code
          const signupCountry = countries.find((country) => country.id === this.user?.countryId);
          if (signupCountry && !this.form.controls.isoCode.value) {
            this.form.controls.isoCode.setValue(signupCountry.isoCode);
          }
        },
        error: () => this.locationsFailed.set(true)
      });

    this.locationsService
      .communities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (communities) => this.communities.set(communities), error: () => this.locationsFailed.set(true) });

    const communityId = this.form.controls.communityId.value;
    if (communityId) {
      this.loadProvinces(communityId);
    }
  }

  private loadProvinces(communityId: string): void {
    this.locationsService
      .provinces(communityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (provinces) => {
          // A slow answer for a community the user has already changed is ignored
          if (communityId === this.form.controls.communityId.value) {
            this.provinces.set(provinces);
          }
        },
        error: () => this.locationsFailed.set(true)
      });
  }

  protected loadSummary(): void {
    const ids = this.cartService.lines().map((line) => line.recordId);
    if (ids.length === 0) {
      this.summaryStatus.set('loaded');
      return;
    }

    this.summaryStatus.set('loading');
    forkJoin(
      ids.map((id) =>
        this.recordsService.get(id).pipe(
          // A 404 means the Record was deleted; any other failure fails the whole summary
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
          this.summaryStatus.set('loaded');
        },
        error: () => this.summaryStatus.set('error')
      });
  }

  // Editing a field after a failure hides the stale message. A rejection stays: it describes the Cart, not the form
  protected clearResult(): void {
    if (this.placeState() === 'failed') {
      this.placeState.set('idle');
    }
  }

  // Payment is simulated: placing the Order is the whole of it
  protected placeOrder(): void {
    if (this.placeState() === 'placing' || this.placeState() === 'placed' || this.blocksCheckout()) {
      return;
    }

    // Shows the field messages on an untouched or invalid form instead of posting
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.placeState.set('placing');

    this.ordersService
      .place(this.cartService.lines(), this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // The Cart is emptied at once, so leaving mid-navigation cannot invite ordering the same Records twice
        next: (order) => {
          this.placeState.set('placed');
          this.cartService.clear();
          this.router.navigate([RouteConstants.MAIN, RouteConstants.ORDERS, order.id, RouteConstants.CONFIRMATION], {
            replaceUrl: true
          });
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.reconcile(error.error as OrderRejection | null);
            this.placeState.set('rejected');
          } else {
            this.placeState.set('failed');
          }
        }
      });
  }

  // Lists each failing line and brings the Cart in line with what the server reported, so the Customer can try again
  private reconcile(rejection: OrderRejection | null): void {
    // Anything that is not a well-formed line is dropped rather than trusted
    const lines = (Array.isArray(rejection?.lines) ? rejection.lines : []).filter(
      (line) =>
        typeof line?.recordId === 'string' &&
        Number.isInteger(line.available) &&
        (line.reason === 'missing' || line.reason === 'insufficientStock')
    );

    // The titles come from the summary shown when the Order was placed, before it is refreshed below
    this.rejectedLines.set(lines.map((line) => ({ ...line, title: this.records().get(line.recordId)?.title ?? null })));

    for (const line of lines) {
      if (line.reason === 'insufficientStock') {
        this.cartService.capToAvailable(line.recordId, line.available);
      }
    }

    // A deleted Record now reads as unavailable and blocks checkout until it is removed
    this.loadSummary();
  }

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }
}
