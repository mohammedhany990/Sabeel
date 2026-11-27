import { Component, computed, inject, signal } from '@angular/core';
import { ASMA_UL_HUSNA } from '../core/data/asma';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

@Component({
  selector: 'app-asma',
  imports: [T, PageHead],
  template: `
    <app-head [title]="'Asma ul-Husna' | t" [subtitle]="'The 99 beautiful names of Allah. A new name is highlighted each day.' | t" />
    <div class="card gilded today" style="margin-bottom:18px">
      <div class="muted small">{{ 'Name of the day' | t }}</div>
      <div class="ar big-name">{{ today().ar }}</div>
      @if (!i18n.isRtl()) { <div class="en-name">{{ today().en }}</div><div class="muted">{{ today().meaning }}</div> }
    </div>
    <div class="grid grid-3">
      @for (n of names; track n.en; let i = $index) {
        <div class="card name" [class.hl]="i === todayIndex()" (click)="pick.set(i)">
          <div class="num muted">{{ i + 1 }}</div>
          <div class="ar">{{ n.ar }}</div>
          @if (!i18n.isRtl()) { <div class="en-name small">{{ n.en }}</div> }
        </div>
      }
    </div>
    @if (pick() !== null) {
      <div class="card gilded" style="margin-top:18px;text-align:center">
        <div class="ar big-name">{{ names[pick()!].ar }}</div>
        @if (!i18n.isRtl()) { <div class="en-name">{{ names[pick()!].en }}</div><div class="muted">{{ names[pick()!].meaning }}</div> }
      </div>
    }
  `,
  styles: [`
    .today { text-align: center; padding: 22px; display: grid; gap: 6px; }
    .big-name { font-size: clamp(2.4rem, 6vw, 3.6rem); line-height: 1.5; }
    .en-name { color: var(--gold); font-weight: 600; }
    .name { text-align: center; display: grid; gap: 4px; padding: 14px; cursor: pointer; }
    .name .ar { font-size: 1.5rem; }
    .name.hl { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
    .small { font-size: 0.85rem; }
  `]
})
export class Asma {
  protected readonly i18n = inject(I18n);
  protected readonly names = ASMA_UL_HUSNA;
  protected readonly pick = signal<number | null>(null);
  protected readonly todayIndex = computed(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    return dayOfYear % this.names.length;
  });
  protected readonly today = computed(() => this.names[this.todayIndex()]);
}
