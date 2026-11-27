import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

@Component({
  selector: 'app-zakat',
  imports: [T, PageHead, FormsModule],
  template: `
    <app-head [title]="'Zakat calculator' | t" [subtitle]="'An approximate guide. Nisab and rates are editable - confirm your madhab and local values with a scholar.' | t" />
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title"><h3>{{ 'Your wealth' | t }}</h3></div>
        <label class="field">{{ 'Cash and bank balances' | t }}<input type="number" min="0" [(ngModel)]="cash" name="cash"></label>
        <label class="field">{{ 'Gold (grams)' | t }}<input type="number" min="0" [(ngModel)]="gold" name="gold"></label>
        <label class="field">{{ 'Silver (grams)' | t }}<input type="number" min="0" [(ngModel)]="silver" name="silver"></label>
        <label class="field">{{ 'Debts you owe (due within a year)' | t }}<input type="number" min="0" [(ngModel)]="debts" name="debts"></label>
      </div>
      <div class="card">
        <div class="card-title"><h3>{{ 'Rates' | t }}</h3><span class="muted small">{{ 'Editable' | t }}</span></div>
        <label class="field">{{ 'Gold price per gram' | t }}<input type="number" min="0" [(ngModel)]="goldPrice" name="gp"></label>
        <label class="field">{{ 'Silver price per gram' | t }}<input type="number" min="0" [(ngModel)]="silverPrice" name="sp"></label>
        <label class="field">{{ 'Nisab (grams of gold, commonly 85)' | t }}<input type="number" min="0" [(ngModel)]="nisabGrams" name="ng"></label>
        <label class="field">{{ 'Zakat rate (percent)' | t }}<input type="number" min="0" step="0.1" [(ngModel)]="rate" name="rate"></label>
      </div>
    </div>
    <div class="card gilded" style="margin-top:18px">
      <div class="grid grid-3">
        <div class="stat"><div class="num">{{ format(nisab()) }}</div><div class="lbl">{{ 'Nisab value' | t }}</div></div>
        <div class="stat"><div class="num">{{ format(zakatable()) }}</div><div class="lbl">{{ 'Zakatable wealth' | t }}</div></div>
        <div class="stat"><div class="num gold">{{ format(due()) }}</div><div class="lbl">{{ 'Zakat due' | t }}</div></div>
      </div>
      @if (!eligible()) { <p class="muted small" style="margin-top:10px">{{ 'Your zakatable wealth is below the nisab, so no zakat is due by this estimate.' | t }}</p> }
      <p class="muted small" style="margin-top:10px">{{ 'This is an approximate calculator for guidance only. Values depend on current metal prices and scholarly opinion.' | t }}</p>
    </div>
  `,
  styles: [`
    .field { display: grid; gap: 6px; margin-bottom: 12px; color: var(--muted); }
    input { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--panel); color: var(--text); }
    .stat { text-align: center; }
    .num { font-size: 1.6rem; font-weight: 700; }
    .gold { color: var(--gold); }
  `]
})
export class Zakat {
  protected readonly i18n = inject(I18n);
  protected cash = 0;
  protected gold = 0;
  protected silver = 0;
  protected debts = 0;
  protected goldPrice = 0;
  protected silverPrice = 0;
  protected nisabGrams = 85;
  protected rate = 2.5;
  protected zakatable(): number {
    return Math.max(0, (this.cash || 0) + (this.gold || 0) * (this.goldPrice || 0) + (this.silver || 0) * (this.silverPrice || 0) - (this.debts || 0));
  }

  protected nisab(): number {
    return (this.nisabGrams || 85) * (this.goldPrice || 0);
  }

  protected eligible(): boolean {
    return this.goldPrice > 0 && this.zakatable() >= this.nisab();
  }

  protected due(): number {
    return this.eligible() ? (this.zakatable() * (this.rate || 2.5)) / 100 : 0;
  }

  protected format(n: number): string {
    return n.toLocaleString(this.i18n.isRtl() ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 });
  }
}
