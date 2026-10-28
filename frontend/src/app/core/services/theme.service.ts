import { Injectable, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private getInitialTheme(): AppTheme {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const saved = localStorage.getItem('nexooai_theme');
        if (saved === 'light' || saved === 'dark') {
          return saved;
        }
      }
    } catch {
      // Storage unavailable
    }
    return 'light'; // Royal champagne ivory light theme as default
  }

  readonly currentTheme = signal<AppTheme>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  toggleTheme(): void {
    const next = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('nexooai_theme', theme);
      } catch (e) {
        console.warn('Storage unavailable', e);
      }
    }
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }
}
