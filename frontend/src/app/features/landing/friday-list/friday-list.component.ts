import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SubscribersService } from '@data/subscribers/subscribers.service';
import { EMAIL_PATTERN } from '@app/shared/validators/email.validator';

type SignupState = 'idle' | 'submitting' | 'subscribed' | 'duplicate' | 'failed';

@Component({
  selector: 'app-friday-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './friday-list.component.html',
  styleUrl: './friday-list.component.scss'
})
export class FridayListComponent {
  private readonly subscribersService: SubscribersService = inject(SubscribersService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)]
  });
  protected readonly state = signal<SignupState>('idle');

  // Editing the field after a result hides the stale message
  protected clearResult(): void {
    if (this.state() !== 'submitting') {
      this.state.set('idle');
    }
  }

  // A lone FormControl gives the form no Angular directive, so the native submit is stopped here
  protected submit(event: Event): void {
    event.preventDefault();

    if (this.state() === 'submitting') {
      return;
    }

    // Shows the format message on an untouched or invalid field instead of posting
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    this.state.set('submitting');

    this.subscribersService
      .subscribe(this.email.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.email.reset();
          this.state.set('subscribed');
        },
        error: (error: unknown) => this.state.set(this.subscribersService.isAlreadySubscribed(error) ? 'duplicate' : 'failed')
      });
  }
}
