import { I18n, Loc, Nm, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { AzkarStreak, AzkarToday } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';
import { Tasbeeh } from './tasbeeh';

@Component({
  selector: 'app-azkar',
  imports: [T, Loc, Nm, PageHead, Spinner, Tasbeeh],
  template: `
    <app-head [title]="'Daily azkar' | t" [subtitle]="'Tap each zikr to count. Your day follows your own timezone.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      <div class="tabs" style="margin-bottom:18px">
        @for (c of categories(); track c.code) {
          <button class="tab" [class.active]="selected() === c.code" (click)="selected.set(c.code)">{{ c | nm: 'sub' }} <span class="muted">{{ c.completedItems }}/{{ c.totalItems }}</span></button>
        }
      </div>
      @if (current(); as c) {
        <div class="grid grid-3" style="margin-bottom:18px">
          <div class="card gilded stat"><div class="num">{{ c.completedItems }}/{{ c.totalItems }}</div><div class="lbl">{{ 'Completed today' | t }}</div></div>
          <div class="card gilded stat"><div class="num">{{ streakOf(c.code)?.currentStreak ?? 0 }}</div><div class="lbl">{{ 'Current streak' | t }}</div></div>
          <div class="card gilded stat"><div class="num">{{ streakOf(c.code)?.longestStreak ?? 0 }}</div><div class="lbl">{{ 'Longest streak' | t }}</div></div>
        </div>
        @if (c.complete) { <div class="card gilded" style="margin-bottom:18px;text-align:center"><span class="gold">{{ 'Complete. May Allah accept it from you.' | t }}</span></div> }
        <div class="list">
          @for (i of c.items; track i.id) {
            <div class="card zikr" [class.done]="i.done">
              <div class="ar txt">{{ i.textAr }}</div>
              @if (!i18n.isRtl() && i.textEn) { <div class="muted en-tr">{{ i.textEn }}</div> }
              <div class="row between">
                <span class="muted small">{{ i | loc: 'reference' }}</span>
                <button class="btn" [class.btn-gold]="!i.done" [disabled]="i.done" (click)="tap(c.code, i.id)">
                  {{ (i.done ? 'Done' : 'Tap to count') | t }} · {{ i.todayCount }}/{{ i.repeatTarget }}
                </button>
              </div>
              <div class="progress"><span [style.width.%]="(i.todayCount / i.repeatTarget) * 100"></span></div>
            </div>
          } @empty { <div class="empty">{{ 'No items in this category.' | t }}</div> }
        </div>
      }
      <app-tasbeeh />
    }
  `,
  styles: [`
    .en-tr { font-size: 0.95rem; line-height: 1.6; }
    .zikr { display: grid; gap: 14px; }
    .zikr.done { opacity: 0.65; border-color: rgba(47, 191, 148, 0.4); }
    .txt { font-size: clamp(1.5rem, 3vw, 2.1rem); line-height: 2.2; text-align: right; }
    .small { font-size: 0.8rem; }
  `]
})
export class Azkar implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  protected readonly i18n = inject(I18n);
  private readonly tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly categories = signal<AzkarToday[]>([]);
  protected readonly streaks = signal<AzkarStreak[]>([]);
  protected readonly selected = signal('');

  protected current(): AzkarToday | undefined {
    return this.categories().find((c) => c.code === this.selected()) ?? this.categories()[0];
  }

  protected streakOf(code: string): AzkarStreak | undefined {
    return this.streaks().find((s) => s.categoryCode === code);
  }

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    forkJoin({ t: this.api.azkarToday(this.tz), s: this.api.azkarStreaks() }).subscribe({
      next: (r) => {
        this.categories.set(r.t);
        this.streaks.set(r.s);
        if (!this.selected() && r.t.length) this.selected.set(r.t[0].code);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected tap(code: string, itemId: number): void {
    this.api.azkarProgress(itemId, this.tz).subscribe({
      next: (p) => {
        if (p.categoryComplete) this.toast.ok('Category completed. Your streak has been updated.');
        this.reload();
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
