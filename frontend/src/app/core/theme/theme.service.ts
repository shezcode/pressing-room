import { Injectable, signal } from '@angular/core';
import { DEFAULT_THEME, ThemesConstants } from '../constants/themes.constants';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public themeApplied = signal<string>(DEFAULT_THEME);

  constructor() {
    this.themeApplied.set(this.getCurrentTheme());
  }

  setTheme(theme: string): void {
    const body = document.body;
    const themes: string[] = Object.keys(ThemesConstants).map((key) => ThemesConstants[key as keyof typeof ThemesConstants]);
    body.classList.remove(...themes);
    body.classList.add(theme);
    this.themeApplied.set(theme);
  }

  toggleTheme(): void {
    const themes: string[] = Object.keys(ThemesConstants).map((key) => ThemesConstants[key as keyof typeof ThemesConstants]);
    const body = document.body;
    let currentTheme = themes.find((theme) => body.classList.contains(theme));
    if (!currentTheme) {
      currentTheme = DEFAULT_THEME;
    }
    const nextTheme = themes[(themes.indexOf(currentTheme as string) + 1) % themes.length];
    this.setTheme(nextTheme);
  }

  private getCurrentTheme(): string {
    const themes: string[] = Object.keys(ThemesConstants).map((key) => ThemesConstants[key as keyof typeof ThemesConstants]);
    const body = document.body;
    const currentTheme = themes.find((theme) => body.classList.contains(theme)) as string;
    if (currentTheme) {
      return currentTheme;
    }
    return DEFAULT_THEME;
  }
}
