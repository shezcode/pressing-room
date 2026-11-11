import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Role } from '@core/types/auth';
import { AuthenticationService } from './authentication.service';
import { adminGuard, customerGuard, notAdminGuard } from './authentication.guard';
import { signInAs } from './testing/sign-in';

@Component({ template: '' })
class PageComponent {}

type Visitor = 'visitor' | Role;

describe('Auth guards', () => {
  async function navigateAs(who: Visitor, url: string): Promise<string> {
    if (who !== 'visitor') {
      signInAs(who);
    }
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: PageComponent },
          { path: 'login', component: PageComponent },
          { path: 'collection', component: PageComponent, canActivate: [customerGuard] },
          { path: 'admin', component: PageComponent, canActivate: [adminGuard] },
          { path: 'cart', component: PageComponent, canActivate: [notAdminGuard] }
        ])
      ]
    });
  });

  afterEach(() => TestBed.inject(AuthenticationService).logout());

  describe('customerGuard', () => {
    it('sends a visitor to login, returning to the page afterwards', async () => {
      expect(await navigateAs('visitor', '/collection?sort=new')).toBe('/login?returnUrl=%2Fcollection%3Fsort%3Dnew');
    });

    it('lets a Customer in', async () => {
      expect(await navigateAs('customer', '/collection')).toBe('/collection');
    });

    it('sends the Admin home', async () => {
      expect(await navigateAs('admin', '/collection')).toBe('/');
    });
  });

  describe('adminGuard', () => {
    it('sends a visitor to login, returning to the page afterwards', async () => {
      expect(await navigateAs('visitor', '/admin')).toBe('/login?returnUrl=%2Fadmin');
    });

    it('sends a Customer home', async () => {
      expect(await navigateAs('customer', '/admin')).toBe('/');
    });

    it('lets the Admin in', async () => {
      expect(await navigateAs('admin', '/admin')).toBe('/admin');
    });
  });

  describe('notAdminGuard', () => {
    it('lets a visitor in', async () => {
      expect(await navigateAs('visitor', '/cart')).toBe('/cart');
    });

    it('lets a Customer in', async () => {
      expect(await navigateAs('customer', '/cart')).toBe('/cart');
    });

    it('sends the Admin home', async () => {
      expect(await navigateAs('admin', '/cart')).toBe('/');
    });
  });
});
