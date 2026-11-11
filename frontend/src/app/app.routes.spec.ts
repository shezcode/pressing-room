import { adminGuard, customerGuard, notAdminGuard } from '@core/security/authentication.guard';
import { routes } from './app.routes';

describe('routes', () => {
  const pages = routes.filter((route) => route.redirectTo === undefined);

  it('loads every page lazily', () => {
    expect(pages.length).toBe(9);
    for (const route of pages) {
      expect(route.component)
        .withContext(route.path ?? '')
        .toBeUndefined();
      expect(route.loadComponent)
        .withContext(route.path ?? '')
        .toEqual(jasmine.any(Function));
    }
  });

  it('keeps the guards', () => {
    const guards = Object.fromEntries(pages.map((route) => [route.path, route.canActivate ?? []]));
    expect(guards).toEqual({
      '': [],
      records: [],
      'records/:id': [],
      cart: [notAdminGuard],
      checkout: [customerGuard],
      'orders/:id/confirmation': [customerGuard],
      collection: [customerGuard],
      'admin/records': [adminGuard],
      login: []
    });
  });
});
