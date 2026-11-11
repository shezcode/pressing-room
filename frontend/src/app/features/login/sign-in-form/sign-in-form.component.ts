import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthenticationService } from '@core/security/authentication.service';
import { EMAIL_PATTERN } from '@app/shared/validators/email.validator';

type SignInState = 'idle' | 'submitting' | 'invalidCredentials' | 'failed';

@Component({
  selector: 'app-sign-in-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './sign-in-form.component.html'
})
export class SignInFormComponent {
  private readonly authenticationService: AuthenticationService = inject(AuthenticationService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly signedIn = output<void>();

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)]
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });
  protected readonly state = signal<SignInState>('idle');

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
      .signIn(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.signedIn.emit(),
        error: (error: unknown) =>
          this.state.set(error instanceof HttpErrorResponse && error.status === 400 ? 'invalidCredentials' : 'failed')
      });
  }
}
