import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Signal, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouteConstants } from '@core/constants/route.constants';
import { CartService } from '@data/cart/cart.service';
import { ThemesConstants } from '@core/constants/themes.constants';
import { LANG_STORAGE_KEY, SUPPORTED_LANGS } from '@core/constants/global.constants';
import { AuthenticationService } from '@core/security/authentication.service';
import { ThemeService } from '@core/theme/theme.service';
import { LocaleService } from '@core/locale/locale.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly themeService: ThemeService = inject(ThemeService);
  private readonly locale: LocaleService = inject(LocaleService);
  private readonly router: Router = inject(Router);
  private readonly authenticationService: AuthenticationService = inject(AuthenticationService);

  protected readonly user = this.authenticationService.user;
  // The Admin cannot shop, so the Cart link is only for visitors and Customers
  protected readonly isAdmin = this.authenticationService.isAdmin;
  // Only Customers own a Collection: not the Admin, not visitors
  protected readonly isCustomer = this.authenticationService.isCustomer;

  protected readonly languages = SUPPORTED_LANGS;
  protected readonly translate: TranslateService = inject(TranslateService);

  protected readonly isDark = computed(() => this.themeService.themeApplied() === ThemesConstants.DARK);
  protected readonly searchOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly cartCount: Signal<number> = inject(CartService).count;

  constructor() {
    // The header is sticky, so links to a landing section must stop below it
    const host: HTMLElement = inject(ElementRef).nativeElement;
    inject(ViewportScroller).setOffset(() => [0, host.offsetHeight]);
    // Any navigation (a link, Back, a search) leaves the mobile menu, so it should not stay open over the new page
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.menuOpen.set(false);
    });
  }

  signOut(): void {
    this.menuOpen.set(false);
    this.authenticationService.logout();
    this.router.navigate([RouteConstants.MAIN]);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setLanguage(lang: string): void {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    this.locale.setupAppLanguage(lang);
  }

  // Escape gives focus back to the hamburger, since the focused menu item is about to be hidden
  closeMenu(toggle: HTMLElement): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    toggle.focus();
  }

  toggleSearch(): void {
    this.searchOpen.update((open) => !open);
  }

  // Searching always lands on the Catalog: an empty term clears the search, and a chosen Format is kept
  submitSearch(event: Event, term: string): void {
    event.preventDefault();
    this.searchOpen.set(false);
    this.router.navigate(['/', RouteConstants.RECORDS], {
      queryParams: { search: term.trim() || null },
      queryParamsHandling: 'merge'
    });
  }
}
