import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthenticationService } from '@core/security/authentication.service';
import { HeaderComponent } from './header.component';

@Component({ template: '' })
class PageStubComponent {}

describe('HeaderComponent search', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input[type="search"]');

  const visit = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
  };

  const submit = async (term: string): Promise<void> => {
    input().value = term;
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([{ path: '**', component: PageStubComponent }]),
        {
          provide: AuthenticationService,
          useValue: { user: signal(null), isAdmin: signal(false), isCustomer: signal(false) }
        }
      ]
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HeaderComponent);
  });

  it('opens the Catalog with the search term from any page', async () => {
    await visit('/cart');

    await submit(' miles ');

    expect(router.url).toBe('/records?search=miles');
  });

  it('opens the Catalog without a search for an empty term', async () => {
    await visit('/');

    await submit('  ');

    expect(router.url).toBe('/records');
  });

  it('keeps the current Format when searching from the Catalog', async () => {
    await visit('/records?format=CD&search=old');

    await submit('miles');

    expect(router.url).toBe('/records?format=CD&search=miles');
  });

  it('points the Shop link at the Catalog', async () => {
    await visit('/');
    const shop: HTMLAnchorElement = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('.site-nav a')).find(
      (link) => link.textContent!.trim() === 'nav.shop'
    )!;

    expect(shop.getAttribute('href')).toBe('/records');
  });

  // Icon-only, so a longer translation cannot widen the header
  it('shows Sign in and Cart as icons labelled for screen readers', async () => {
    await visit('/');
    const signIn: HTMLElement = fixture.nativeElement.querySelector('a[href="/login"]');
    const cart: HTMLElement = fixture.nativeElement.querySelector('a[href="/cart"]');

    expect(signIn.getAttribute('aria-label')).toBe('header.signIn');
    expect(signIn.textContent!.trim()).toBe('');
    expect(cart.getAttribute('aria-label')).toBe('header.cartLabel');
    expect(cart.textContent!.trim()).toBe('0');
  });

  it('gives every icon button a tooltip', async () => {
    await visit('/');
    const titles = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('a[href="/login"], a[href="/cart"], [role="switch"], .lang-toggle__btn')
    ).map((button) => button.title);

    expect(titles).toEqual([
      'header.languages.en',
      'header.languages.es',
      'header.darkTheme',
      'header.signIn',
      'header.cartLabel'
    ]);
  });

  it('opens the menu from the hamburger and closes it when a link is followed', async () => {
    await visit('/');
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-controls="site-menu"]');
    const menu = (): HTMLElement => fixture.nativeElement.querySelector('#site-menu');

    expect(toggle.getAttribute('aria-label')).toBe('header.menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu().classList).toContain('is-open');

    menu().querySelector<HTMLElement>('a[href="/records"]')!.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu().classList).not.toContain('is-open');
  });
});
