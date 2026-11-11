import { Routes } from '@angular/router';
import { RouteConstants } from '@core/constants/route.constants';
import { adminGuard, customerGuard, notAdminGuard } from '@core/security/authentication.guard';

export const routes: Routes = [
  {
    path: RouteConstants.EMPTY,
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent)
  },
  {
    // `/records` is the Catalog; anyone can browse it
    path: RouteConstants.RECORDS,
    loadComponent: () => import('./features/catalog/catalog.component').then((m) => m.CatalogComponent)
  },
  {
    path: `${RouteConstants.RECORDS}/${RouteConstants.RECORD_ID}`,
    loadComponent: () => import('./features/record-detail/record-detail.component').then((m) => m.RecordDetailComponent)
  },
  {
    path: RouteConstants.CART,
    // Visitors and Customers shop; the Admin cannot
    canActivate: [notAdminGuard],
    loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent)
  },
  {
    path: RouteConstants.CHECKOUT,
    // Visitors sign in first and come back here; the Admin cannot check out
    canActivate: [customerGuard],
    loadComponent: () => import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent)
  },
  {
    path: `${RouteConstants.ORDERS}/${RouteConstants.ORDER_CONFIRMATION}`,
    // Only Customers have Orders; the API answers only for the Order's owner
    canActivate: [customerGuard],
    loadComponent: () =>
      import('./features/order-confirmation/order-confirmation.component').then((m) => m.OrderConfirmationComponent)
  },
  {
    path: RouteConstants.COLLECTION,
    // Only Customers own a Collection; the Admin cannot shop
    canActivate: [customerGuard],
    loadComponent: () => import('./features/collection/collection.component').then((m) => m.CollectionComponent)
  },
  {
    path: `${RouteConstants.ADMIN}/${RouteConstants.RECORDS}`,
    // Only the Admin manages the catalog; everyone else is redirected
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-records/admin-records.component').then((m) => m.AdminRecordsComponent)
  },
  {
    path: RouteConstants.LOGIN,
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  { path: RouteConstants.OTHER, redirectTo: RouteConstants.EMPTY }
];
