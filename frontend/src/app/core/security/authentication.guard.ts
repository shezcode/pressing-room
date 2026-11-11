import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouteConstants } from '@core/constants/route.constants';
import { Role } from '@core/types/auth';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  private router: Router = inject(Router);
  private authenticationService: AuthenticationService = inject(AuthenticationService);

  // Signed-in people pass; everyone else goes to the login page
  canActivate(): boolean | UrlTree {
    return this.authenticationService.isLoggedIn() || this.router.createUrlTree([RouteConstants.LOGIN]);
  }

  // Only the given role passes. A visitor goes to the login page and is sent back here after signing in;
  // a person with the other role goes home, since signing in again would not help
  canActivateAs(role: Role, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.authenticationService.isLoggedIn()) {
      return this.router.createUrlTree([RouteConstants.LOGIN], { queryParams: { returnUrl: state.url } });
    }
    return this.authenticationService.user()?.role === role || this.router.createUrlTree([RouteConstants.MAIN]);
  }

  // For routes the Admin must not use (such as the Cart): visitors and Customers pass
  canActivateUnlessAdmin(): boolean | UrlTree {
    return !this.authenticationService.isAdmin() || this.router.createUrlTree([RouteConstants.MAIN]);
  }
}

export const customerGuard: CanActivateFn = (_route, state) => inject(AuthGuard).canActivateAs('customer', state);

export const adminGuard: CanActivateFn = (_route, state) => inject(AuthGuard).canActivateAs('admin', state);

export const notAdminGuard: CanActivateFn = () => inject(AuthGuard).canActivateUnlessAdmin();
