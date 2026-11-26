import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Api } from '../core/api';
import { T } from '../core/i18n';
import { Khatma, PrayerTracker, RevisionStats, TasbeehSummary } from '../core/models';
import { lastDays } from './prayer-extras';

export interface WeeklyInput {
  prayers: PrayerTracker | null;
  revision: RevisionStats | null;
  khatma: Khatma | null;
  tasbeeh: TasbeehSummary | null;
}

export interface Suggestion { key: 'revise' | 'khatma' | 'prayers' | 'steady'; link: string; n: number; }

export function sumValues(m: Record<string, number> | undefined): number {
  return Object.values(m ?? {}).reduce((a, b) => a + b, 0);
}

export function suggest(i: WeeklyInput): Suggestion {
  const due = i.revision?.dueNow ?? 0;
  if (due > 0) return { key: 'revise', link: '/app/revision', n: due };
  if (!i.khatma || i.khatma.completed) return { key: 'khatma', link: '/app/quran', n: 0 };
  const missed = i.prayers ? i.prayers.possibleInRange - i.prayers.prayedInRange : 0;
  if (missed > 0) return { key: 'prayers', link: '/app/prayer', n: missed };
  return { key: 'steady', link: '/app/dashboard', n: 0 };
}

@Component({
  selector: 'app-weekly',
  imports: [T, RouterLink],
  template: `
    @if (data(); as d) {
      <div class="card weekly" data-testid="weekly-summary">
        <div class="card-title"><h3>{{ 'Your week' | t }}</h3></div>
        <div class="cells">
          <div><div class="num" data-testid="weekly-prayers">{{ d.prayers?.prayedInRange ?? 0 }}/{{ d.prayers?.possibleInRange ?? 35 }}</div><div class="lbl">{{ 'Prayers logged' | t }}</div></div>
          <div><div class="num">{{ d.prayers?.currentStreak ?? 0 }}</div><div class="lbl">{{ 'Prayer streak (days)' | t }}</div></div>
          <div><div class="num">{{ tasbeehToday() }}</div><div class="lbl">{{ 'Tasbeeh today' | t }}</div></div>
          <div><div class="num">{{ d.khatma ? d.khatma.percent.toFixed(0) + '%' : '-' }}</div><div class="lbl">{{ 'Khatma progress' | t }}</div></div>
        </div>
        <a class="suggest" data-testid="weekly-suggestion" [routerLink]="s().link">
          @switch (s().key) {
            @case ('revise') { {{ 'Suggested: revise {n} due items' | t: { n: s().n } }} }
            @case ('khatma') { {{ 'Suggested: start a khatma plan' | t }} }
            @case ('prayers') { {{ 'Suggested: log the {n} prayers you have missed' | t: { n: s().n } }} }
            @default { {{ 'You are on track. Keep going.' | t }} }
          }
        </a>
      </div>
    }
  `,
  styles: [`
    .weekly { margin-bottom: 18px; display: grid; gap: 14px; }
    .cells { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .num { font-size: 1.6rem; font-weight: 600; color: var(--gold); }
    .lbl { color: var(--muted); font-size: 0.85rem; }
    .suggest { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line); text-decoration: none; transition: background 0.2s; }
    .suggest:hover { background: var(--panel-strong); }
  `]
})
export class WeeklyCard implements OnInit {
  private readonly api = inject(Api);
  protected readonly data = signal<WeeklyInput | null>(null);

  ngOnInit(): void {
    const days = lastDays(7, new Date());
    const none = <X>() => catchError(() => of(null as X | null));
    forkJoin({
      prayers: this.api.prayerLog(days[days.length - 1], days[0]).pipe(none<PrayerTracker>()),
      revision: this.api.revisionStats().pipe(none<RevisionStats>()),
      khatma: this.api.khatma().pipe(none<Khatma>()),
      tasbeeh: this.api.tasbeeh().pipe(none<TasbeehSummary>())
    }).subscribe((v) => this.data.set(v));
  }

  protected s(): Suggestion {
    return suggest(this.data()!);
  }

  protected tasbeehToday(): number {
    return sumValues(this.data()?.tasbeeh?.today);
  }
}
