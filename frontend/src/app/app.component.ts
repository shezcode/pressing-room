import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LANG_STORAGE_KEY } from '@core/constants/global.constants';
import { LocaleService } from '@core/locale/locale.service';
import { ThemesConstants } from '@core/constants/themes.constants';
import { ThemeService } from '@core/theme/theme.service';
import { HeaderComponent } from '@layout/header/header.component';
import { FooterComponent } from '@layout/footer/footer.component';
import { DemoBannerComponent } from '@layout/demo-banner/demo-banner.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DemoBannerComponent, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private locale: LocaleService = inject(LocaleService);
  private translate: TranslateService = inject(TranslateService);
  private themeService: ThemeService = inject(ThemeService);

  constructor() {
    // Screen readers pronounce the page in its <html lang>
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(({ lang }) => (document.documentElement.lang = lang));
    // The language saved by the header's switch, or else the browser's
    this.locale.setupAppLanguage(localStorage.getItem(LANG_STORAGE_KEY) ?? undefined);
    this.applyOsColorScheme();
  }

  private applyOsColorScheme(): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.themeService.setTheme(prefersDark ? ThemesConstants.DARK : ThemesConstants.LIGHT);
  }
}
