import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d791"/><stop offset="1" stop-color="#b8892e"/></linearGradient></defs>
      <path d="M32 6 L40 24 L58 32 L40 40 L32 58 L24 40 L6 32 L24 24 Z" fill="url(#lg)"/>
      <circle cx="32" cy="32" r="7" fill="#04181a"/>
    </svg>
    <span class="word">Sabeel</span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 10px; }
    .word { font: 700 1.7rem var(--font-display); letter-spacing: 0.04em; color: var(--text); }
  `]
})
export class Logo {}
