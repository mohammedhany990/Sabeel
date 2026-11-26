import { Injectable, inject, signal } from '@angular/core';
import { I18n } from './i18n';

export interface ToastItem { id: number; kind: 'ok' | 'error' | 'info'; text: string; }

@Injectable({ providedIn: 'root' })
export class Toast {
  readonly items = signal<ToastItem[]>([]);
  private readonly i18n = inject(I18n);
  private seq = 0;

  show(text: string, kind: ToastItem['kind'] = 'info'): void {
    const id = ++this.seq;
    this.items.update((l) => [...l, { id, kind, text: this.i18n.t(text) }]);
    setTimeout(() => this.items.update((l) => l.filter((t) => t.id !== id)), 4200);
  }
  ok(text: string): void { this.show(text, 'ok'); }
  error(text: string): void { this.show(text, 'error'); }
}
