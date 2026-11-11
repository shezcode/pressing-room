import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '@env';
import { Role, SessionUser } from '@core/types/auth';
import { AuthenticationService } from '../authentication.service';

export const TEST_TOKEN = 'test-token';

// Signs in through the real service and a flushed sign-in response, so specs depend on no storage details
export function signInAs(role: Role, user: Partial<SessionUser> = {}): void {
  TestBed.inject(AuthenticationService)
    .signIn({ email: `${role}@example.com`, password: 'secret' })
    .subscribe();
  TestBed.inject(HttpTestingController)
    .expectOne(`${environment.apiBaseUrl}/auth/signin`)
    .flush({
      message: 'ok',
      token: TEST_TOKEN,
      user: { id: `${role}-1`, name: role, email: `${role}@example.com`, role, ...user }
    });
}
