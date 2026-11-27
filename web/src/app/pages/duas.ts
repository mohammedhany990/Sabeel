import { Component, computed, inject, signal } from '@angular/core';
import { DUA_CATEGORIES } from '../core/data/duas';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

@Component({
  selector: 'app-duas',
  imports: [T, PageHead],
  template: `
    <app-head [title]="'Masnoon duas' | t" [subtitle]="'Authentic supplications for daily situations.' | t" />
    <div class="tabs" style="margin-bottom:18px">
      @for (c of categories; track c.id) {
        <button class="tab" [class.active]="selected() === c.id" (click)="selected.set(c.id)">{{ i18n.isRtl() ? c.arName : c.en }}</button>
      }
    </div>
    <div class="list">
      @for (d of current().duas; track d.ar) {
        <div class="card dua">
          <div class="ar txt">{{ d.ar }}</div>
          @if (!i18n.isRtl()) { <div class="muted en">{{ d.en }}</div> }
          <div class="muted small ref">{{ d.ref }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dua { display: grid; gap: 12px; }
    .txt { font-size: clamp(1.4rem, 3vw, 1.9rem); line-height: 2.1; text-align: right; }
    .en { line-height: 1.7; }
    .ref { font-size: 0.8rem; }
  `]
})
export class Duas {
  protected readonly i18n = inject(I18n);
  protected readonly categories = DUA_CATEGORIES;
  protected readonly selected = signal(DUA_CATEGORIES[0].id);
  protected readonly current = computed(() => this.categories.find((c) => c.id === this.selected()) ?? this.categories[0]);
}
