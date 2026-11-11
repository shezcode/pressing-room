import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthenticationService } from '@core/security/authentication.service';
import { Community, Country, Province } from '@data/locations/location.model';
import { LocationsService } from '@data/locations/locations.service';
import { EMAIL_PATTERN } from '@app/shared/validators/email.validator';

type SignUpState = 'idle' | 'submitting' | 'emailTaken' | 'failed';

// The message the backend sends when the email already has an account
const EMAIL_TAKEN_MESSAGE = 'User already exists';
const SPAIN_ISO_CODE = 'ES';

@Component({
  selector: 'app-sign-up-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './sign-up-form.component.html'
})
export class SignUpFormComponent implements OnInit {
  private readonly authenticationService: AuthenticationService = inject(AuthenticationService);
  private readonly locationsService: LocationsService = inject(LocationsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly signedIn = output<void>();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)]
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    countryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    // solo españa tiene comunidades y provincias, deshabilitamos ambas hata que se seleccione españa
    communityId: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
    provinceId: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] })
  });
  protected readonly state = signal<SignUpState>('idle');

  protected readonly countries = signal<Country[]>([]);
  protected readonly communities = signal<Community[]>([]);
  protected readonly provinces = signal<Province[]>([]);
  protected readonly locationsFailed = signal(false);

  ngOnInit(): void {
    this.form.controls.countryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((countryId) => {
      const { communityId, provinceId } = this.form.controls;
      if (this.countries().find((country) => country.id === countryId)?.isoCode === SPAIN_ISO_CODE) {
        communityId.enable();
        provinceId.enable();
      } else {
        communityId.reset('');
        provinceId.reset('');
        communityId.disable();
        provinceId.disable();
      }
    });

    this.form.controls.communityId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((communityId) => {
      this.provinces.set([]);
      this.form.controls.provinceId.reset('');
      if (communityId) {
        this.loadProvinces(communityId);
      }
    });

    this.loadLocations();
  }

  protected loadLocations(): void {
    this.locationsFailed.set(false);

    this.locationsService
      .countries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (countries) => this.countries.set(countries), error: () => this.locationsFailed.set(true) });

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

  // Editing a field after a failure hides the stale message
  protected clearResult(): void {
    if (this.state() !== 'submitting') {
      this.state.set('idle');
    }
  }

  protected submit(): void {
    if (this.state() === 'submitting') {
      return;
    }

    // Shows the field messages on an untouched or invalid form instead of posting
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('submitting');

    this.authenticationService
      .signUp(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.signedIn.emit(),
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 400 && error.error?.message === EMAIL_TAKEN_MESSAGE
              ? 'emailTaken'
              : 'failed'
          )
      });
  }
}
