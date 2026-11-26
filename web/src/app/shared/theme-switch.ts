import { Component, inject } from '@angular/core';
import { T } from '../core/i18n';
import { Theme } from '../core/theme';

@Component({
  selector: 'app-theme',
  imports: [T],
  template: `<button type="button" class="btn btn-ghost btn-sm" (click)="theme.toggle()" [attr.aria-label]="(theme.current() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') | t" data-testid="theme-toggle">{{ theme.current() === 'dark' ? '☀' : '☾' }}</button>`
})
export class ThemeSwitch {
  protected readonly theme = inject(Theme);
}
