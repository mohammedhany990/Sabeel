import { Component, computed, inject, signal } from '@angular/core';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, OCCASIONS, gregorianFromHijri, hijriFromGregorian, hijriMonthLength, upcomingOccasions } from '../core/data/hijri';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

function loadFasts(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem('sabeel.fasts') || '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-hijri',
  imports: [T, PageHead],
  template: `
    <app-head [title]="'Hijri calendar' | t" [subtitle]="'Umm al-Qura approximation. Verify exact dates with your local moon-sighting authority.' | t" />
    <div class="grid grid-3" style="margin-bottom:18px">
      <div class="card gilded stat">
        <div class="num">{{ today().day }}</div>
        <div class="lbl">{{ i18n.isRtl() ? monthsAr[today().month - 1] : monthsEn[today().month - 1] }} {{ today().year }}</div>
      </div>
      <div class="card gilded stat">
        <div class="num">{{ monthFasts() }}</div>
        <div class="lbl">{{ 'Fasts this month' | t }}</div>
      </div>
      <div class="card gilded stat">
        <div class="num">{{ totalFasts() }}</div>
        <div class="lbl">{{ 'Total fasts recorded' | t }}</div>
      </div>
    </div>

    @if (fastingHint(); as h) {
      <div class="card gilded" style="margin-bottom:18px">
        <div class="card-title"><h3>{{ 'Fasting reminder' | t }}</h3></div>
        <p class="muted" style="margin:0">{{ h | t }}</p>
      </div>
    }

    <div class="card" style="margin-bottom:18px">
      <div class="card-title"><h3>{{ 'Upcoming occasions' | t }}</h3></div>
      <div class="list">
        @for (o of upcoming(); track o.en) {
          <div class="row between">
            <div>
              <div>{{ i18n.isRtl() ? o.ar : o.en }}</div>
              <div class="muted small">{{ o.day }} {{ i18n.isRtl() ? monthsAr[o.month - 1] : monthsEn[o.month - 1] }}</div>
            </div>
            @if (o.daysAway === 0) { <span class="badge">{{ 'Today' | t }}</span> }
            @else if (o.daysAway === 1) { <span class="badge">{{ 'Tomorrow' | t }}</span> }
            @else { <span class="badge">{{ 'In {n} days' | t: { n: o.daysAway } }}</span> }
          </div>
        }
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>{{ 'Fasting tracker' | t }}</h3><span class="muted small">{{ i18n.isRtl() ? monthsAr[today().month - 1] : monthsEn[today().month - 1] }}</span></div>
      <p class="muted small">{{ 'Tap a day you fasted. Ramadan and voluntary fasts both count.' | t }}</p>
      <div class="days">
        @for (d of days(); track d) {
          <button class="day" [class.fasted]="fasts()[key(d)]" [class.today]="d === today().day" (click)="toggle(d)">{{ d }}</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .days { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; }
    .day { padding: 10px 0; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; }
    .day.fasted { background: rgba(47, 191, 148, 0.2); border-color: var(--green, #2fbf94); color: var(--green, #2fbf94); font-weight: 700; }
    .day.today { border-color: var(--gold); color: var(--gold); }
    .row.between { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .row.between:last-child { border-bottom: none; }
    .small { font-size: 0.85rem; }
  `]
})
export class Hijri {
  protected readonly i18n = inject(I18n);
  protected readonly monthsEn = HIJRI_MONTHS_EN;
  protected readonly monthsAr = HIJRI_MONTHS_AR;
  protected readonly today = computed(() => hijriFromGregorian(new Date()));
  protected readonly fasts = signal<Record<string, boolean>>(loadFasts());
  protected readonly upcoming = computed(() => upcomingOccasions(this.today(), 6));
  protected readonly days = computed(() => Array.from({ length: hijriMonthLength(this.today().month, this.today().year) }, (_, i) => i + 1));
  protected readonly monthFasts = computed(() => this.days().filter((d) => this.fasts()[this.key(d)]).length);
  protected readonly totalFasts = computed(() => Object.values(this.fasts()).filter(Boolean).length);

  protected fastingHint(): string | null {
    const wd = new Date().getDay();
    const t = this.today();
    if (t.month === 9) return 'Ramadan Mubarak. May Allah accept your fasting.';
    if (wd === 1) return 'Today is Monday, a recommended day to fast.';
    if (wd === 4) return 'Today is Thursday, a recommended day to fast.';
    if (t.day >= 13 && t.day <= 15) return 'These are the white days (13th-15th), recommended for fasting.';
    const occ = OCCASIONS.find((o) => o.fasting && o.month === t.month && o.day === t.day);
    return occ ? (this.i18n.isRtl() ? occ.ar : occ.en) : null;
  }

  protected key(d: number): string {
    const t = this.today();
    return `${t.year}-${t.month}-${d}`;
  }

  protected toggle(d: number): void {
    const f = { ...this.fasts() };
    const k = this.key(d);
    if (f[k]) delete f[k];
    else f[k] = true;
    this.fasts.set(f);
    try {
      localStorage.setItem('sabeel.fasts', JSON.stringify(f));
    } catch {
      return;
    }
  }
}
