import { Component, input } from '@angular/core';
import { T } from '../core/i18n';

@Component({
  selector: 'app-head',
  template: `<div class="page-head"><h1>{{ title() }}</h1>@if (subtitle()) { <p>{{ subtitle() }}</p> }</div>`
})
export class PageHead {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}

@Component({
  selector: 'app-spinner',
  imports: [T],
  template: `<div class="loading"><span class="spinner"></span>{{ label() | t }}</div>`
})
export class Spinner {
  readonly label = input('Loading...');
}

@Component({
  selector: 'app-ring',
  imports: [T],
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 120 120">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2fbf94"/><stop offset="1" stop-color="#e2c275"/></linearGradient></defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round"
        [attr.stroke-dasharray]="circ" [attr.stroke-dashoffset]="circ * (1 - clamp())" transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" fill="#f3efe3" font-size="24" font-weight="600" font-family="Cormorant Garamond, serif">{{ label() }}</text>
      <text x="60" y="78" text-anchor="middle" fill="#9db3ab" font-size="10">{{ caption() | t }}</text>
    </svg>
  `
})
export class Ring {
  readonly value = input(0);
  readonly size = input(140);
  readonly label = input('');
  readonly caption = input('');
  protected readonly circ = 2 * Math.PI * 52;
  protected clamp(): number {
    return Math.max(0, Math.min(1, this.value()));
  }
}
