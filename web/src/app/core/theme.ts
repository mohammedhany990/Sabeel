import { Injectable, signal } from '@angular/core';

export type ThemeName = 'dark' | 'light';

export function normalizeTheme(value: string | null | undefined): ThemeName {
  return value === 'light' ? 'light' : 'dark';
}

@Injectable({ providedIn: 'root' })
export class Theme {
  readonly current = signal<ThemeName>(normalizeTheme(localStorage.getItem('sabeel.theme')));

  constructor() {
    this.apply(this.current());
  }

  toggle(): void {
    const next: ThemeName = this.current() === 'dark' ? 'light' : 'dark';
    this.current.set(next);
    localStorage.setItem('sabeel.theme', next);
    this.apply(next);
  }

  private apply(name: ThemeName): void {
    document.documentElement.setAttribute('data-theme', name);
  }
}
