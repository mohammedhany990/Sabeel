import { Component, computed, inject, signal } from '@angular/core';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const QADA_PRAYERS = PRAYERS.concat(['witr']);

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadJson<T>(k: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) || '') as T;
  } catch {
    return fallback;
  }
}

@Component({
  selector: 'app-prayer-tracker',
  imports: [T],
  template: `
    <div class="card">
      <div class="card-title"><h3>{{ 'Qada (missed prayers)' | t }}</h3></div>
      <p class="muted small">{{ 'Track prayers you are making up. Adjust the counters as you complete them.' | t }}</p>
      <div class="prow">
        @for (p of qadaPrayers; track p) {
          <div class="qcell">
            <span>{{ p | t }}</span>
            <div class="qrow">
              <button class="btn btn-ghost btn-sm" (click)="bumpQada(p, -1)">-</button>
              <span class="qnum">{{ qada()[p] || 0 }}</span>
              <button class="btn btn-ghost btn-sm" (click)="bumpQada(p, 1)">+</button>
            </div>
          </div>
        }
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="card-title"><h3>{{ 'Night prayer (qiyam and witr)' | t }}</h3></div>
      <p class="muted small">{{ 'Plan tonight\u2019s qiyam, mark the rakahs you prayed, and record your witr.' | t }}</p>
      @if (!witr()) { <p class="gold small" data-testid="witr-reminder">{{ 'Reminder: witr is not marked yet. Pray it before you sleep or before Fajr.' | t }}</p> }
      <div class="prow" style="align-items:center">
        <label class="field" style="margin:0">{{ 'Target rakahs' | t }}
          <select class="tselect" [value]="target()" (change)="setTarget($any($event.target).value)">
            @for (n of [2, 4, 6, 8, 11, 13]; track n) { <option [value]="n">{{ n }}</option> }
          </select>
        </label>
        <div class="qcell">
          <span>{{ 'Prayed' | t }}</span>
          <div class="qrow">
            <button class="btn btn-ghost btn-sm" (click)="qiyam(-1)">-</button>
            <span class="qnum">{{ qiyamCount() }}</span>
            <button class="btn btn-ghost btn-sm" (click)="qiyam(1)">+</button>
          </div>
        </div>
        <button class="btn" [class.btn-gold]="witr()" (click)="toggleWitr()">{{ (witr() ? 'Witr done' : 'Mark witr done') | t }}</button>
      </div>
    </div>
  `,
  styles: [`
    .prow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .pcell { display: grid; gap: 6px; justify-items: center; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; min-width: 84px; }
    .pcell.done { border-color: var(--green, #2fbf94); background: rgba(47, 191, 148, 0.15); }
    .chk { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border); display: grid; place-items: center; color: var(--green, #2fbf94); }
    .pcell.done .chk { border-color: var(--green, #2fbf94); }
    .qcell { display: grid; gap: 6px; justify-items: center; }
    .qrow { display: flex; align-items: center; gap: 8px; }
    .qnum { min-width: 34px; text-align: center; font-weight: 700; color: var(--gold); }
    .tselect { padding: 8px 10px; border-radius: 10px; background: var(--panel); color: var(--text); border: 1px solid var(--border); }
    .field { display: grid; gap: 6px; color: var(--muted); }
    .small { font-size: 0.85rem; }
  `]
})
export class PrayerTracker {
  protected readonly i18n = inject(I18n);
  protected readonly prayers = PRAYERS;
  protected readonly qadaPrayers = QADA_PRAYERS;
  protected readonly today = signal<Record<string, boolean>>(loadJson(`sabeel.prayertrack.${todayKey()}`, {}));
  protected readonly qada = signal<Record<string, number>>(loadJson('sabeel.qada', {}));
  protected readonly qiyamState = signal<{ target: number; count: number; witr: boolean }>(
    loadJson(`sabeel.qiyam.${todayKey()}`, { target: 8, count: 0, witr: false })
  );
  protected readonly doneCount = computed(() => PRAYERS.filter((p) => this.today()[p]).length);
  protected readonly target = computed(() => this.qiyamState().target);
  protected readonly qiyamCount = computed(() => this.qiyamState().count);
  protected readonly witr = computed(() => this.qiyamState().witr);

  protected toggle(p: string): void {
    const t = { ...this.today() };
    t[p] = !t[p];
    this.today.set(t);
    try {
      localStorage.setItem(`sabeel.prayertrack.${todayKey()}`, JSON.stringify(t));
    } catch {
      return;
    }
  }

  protected bumpQada(p: string, delta: number): void {
    const q = { ...this.qada() };
    q[p] = Math.max(0, (q[p] || 0) + delta);
    this.qada.set(q);
    try {
      localStorage.setItem('sabeel.qada', JSON.stringify(q));
    } catch {
      return;
    }
  }

  protected qiyam(delta: number): void {
    const s = { ...this.qiyamState(), count: Math.max(0, this.qiyamState().count + delta) };
    this.qiyamState.set(s);
    this.save(s);
  }

  protected setTarget(v: string): void {
    const s = { ...this.qiyamState(), target: parseInt(v, 10) || 8 };
    this.qiyamState.set(s);
    this.save(s);
  }

  protected toggleWitr(): void {
    const s = { ...this.qiyamState(), witr: !this.qiyamState().witr };
    this.qiyamState.set(s);
    this.save(s);
  }

  private save(s: { target: number; count: number; witr: boolean }): void {
    try {
      localStorage.setItem(`sabeel.qiyam.${todayKey()}`, JSON.stringify(s));
    } catch {
      return;
    }
  }
}
