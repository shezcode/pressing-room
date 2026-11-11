import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteConstants } from '@core/constants/route.constants';
import { AuthenticationService } from '@core/security/authentication.service';
import { Role } from '@core/types/auth';
import { DemoService } from '@data/demo/demo.service';
import { SignInFormComponent } from './sign-in-form/sign-in-form.component';
import { SignUpFormComponent } from './sign-up-form/sign-up-form.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SignInFormComponent, SignUpFormComponent, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly authenticationService: AuthenticationService = inject(AuthenticationService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  protected readonly demo = inject(DemoService).enabled;
  protected readonly demoState = signal<'idle' | 'submitting' | 'failed'>('idle');

  // Both forms end the same way: the person is signed in and carries on to where they were headed
  protected onSignedIn(fallback: string = RouteConstants.MAIN): void {
    this.router.navigateByUrl(this.returnUrl() ?? fallback);
  }

  // Without a page to return to, each Demo account opens where it has the most to show
  protected tryAs(role: Role): void {
    if (this.demoState() === 'submitting') {
      return;
    }
    this.demoState.set('submitting');
    const home = role === 'admin' ? `/${RouteConstants.ADMIN}/${RouteConstants.RECORDS}` : `/${RouteConstants.COLLECTION}`;
    this.authenticationService
      .demoSignIn(role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onSignedIn(home),
        error: () => this.demoState.set('failed')
      });
  }

  // Guards send people here with the page they wanted. Only in-app paths are followed
  private returnUrl(): string | null {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    const isInAppPath = returnUrl.startsWith('/') && !returnUrl.startsWith('//');
    return isInAppPath ? returnUrl : null;
  }
}
