import { Component, computed, inject, signal } from '@angular/core';
import { TASBIH_PRESETS, TASBIH_TARGETS, TasbihPreset } from '../core/data/tasbih';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadCounts(): Record<string, number> {
  try {
    const all = JSON.parse(localStorage.getItem('sabeel.tasbih') || '{}');
    return all[todayKey()] || {};
  } catch {
    return {};
  }
}

function saveCounts(c: Record<string, number>): void {
  try {
    const all = JSON.parse(localStorage.getItem('sabeel.tasbih') || '{}');
    all[todayKey()] = c;
    const days = Object.keys(all).sort();
    while (days.length > 30) delete all[days.shift()!];
    localStorage.setItem('sabeel.tasbih', JSON.stringify(all));
  } catch {
    return;
  }
}

@Component({
  selector: 'app-tasbih',
  imports: [T, PageHead],
  template: `
    <app-head [title]="'Tasbih counter' | t" [subtitle]="'Pick a zikr, tap to count. Your counts are saved for today on this device.' | t" />
    <div class="tabs" style="margin-bottom:18px">
      @for (p of presets; track p.id) {
        <button class="tab" [class.active]="current().id === p.id" (click)="select(p)">
          <span class="ar">{{ p.ar }}</span>
        </button>
      }
    </div>
    <div class="card gilded counter">
      <div class="zikr ar">{{ current().ar }}</div>
      @if (!i18n.isRtl()) { <div class="muted">{{ current().en }}</div> }
      <div class="num">{{ count() }}<span class="muted target">/ {{ target() === 0 ? '\u221E' : target() }}</span></div>
      <div class="targets">
        @for (t of targets; track t) {
          <button class="chip" [class.active]="target() === t" (click)="target.set(t)">{{ t }}</button>
        }
        <button class="chip" [class.active]="target() === 0" (click)="target.set(0)">{{ 'Open' | t }}</button>
      </div>
      <label class="chip-line"><input type="checkbox" [checked]="cycle()" (change)="setCycle($any($event.target).checked)" data-testid="tasbih-cycle"> {{ 'Move to the next zikr when the target is reached' | t }}</label>
      <button class="big" (click)="tap()">{{ 'Tap to count' | t }}</button>
      <div class="row" style="justify-content:center;gap:10px">
        <button class="btn btn-ghost btn-sm" (click)="nextZikr()" data-testid="tasbih-next">{{ 'Next zikr' | t }}</button>
        <button class="btn btn-ghost btn-sm" (click)="reset()">{{ 'Reset this zikr' | t }}</button>
        @if (target() > 0 && count() >= target()) { <span class="gold">{{ 'Complete. May Allah accept it.' | t }}</span> }
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <div class="card-title"><h3>{{ 'Today' | t }}</h3><span class="badge">{{ total() }}</span></div>
      <div class="list">
        @for (p of presets; track p.id) {
          @if (counts()[p.id]) {
            <div class="row between"><span class="ar">{{ p.ar }}</span><span class="muted">{{ counts()[p.id] }}</span></div>
          }
        } @empty { <div class="empty">{{ 'No tasbih counted yet today.' | t }}</div> }
      </div>
    </div>
  `,
  styles: [`
    .counter { display: grid; gap: 12px; text-align: center; padding: 26px; }
    .zikr { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.6; }
    .num { font-size: 3.2rem; font-weight: 700; color: var(--gold); }
    .target { font-size: 1.2rem; }
    .targets { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .chip { padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; }
    .chip.active { border-color: var(--gold); color: var(--gold); }
    .chip-line { color: var(--muted); font-size: 0.9rem; display: flex; gap: 8px; justify-content: center; align-items: center; }
    .big { padding: 22px; border-radius: 18px; border: none; background: linear-gradient(135deg, var(--gold), #b8944a); color: #1a1408; font-size: 1.3rem; font-weight: 700; cursor: pointer; }
    .big:active { transform: scale(0.98); }
    .row { display: flex; align-items: center; }
    .row.between { justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .list .row:last-child { border-bottom: none; }
  `]
})
export class Tasbih {
  protected readonly i18n = inject(I18n);
  protected readonly presets = TASBIH_PRESETS;
  protected readonly targets = TASBIH_TARGETS;
  protected readonly current = signal<TasbihPreset>(TASBIH_PRESETS[0]);
  protected readonly counts = signal<Record<string, number>>(loadCounts());
  protected readonly target = signal(TASBIH_PRESETS[0].target);
  protected readonly count = computed(() => this.counts()[this.current().id] || 0);
  protected readonly total = computed(() => Object.values(this.counts()).reduce((a, b) => a + b, 0));

  protected select(p: TasbihPreset): void {
    this.current.set(p);
    this.target.set(p.target);
  }

  protected tap(): void {
    const c = { ...this.counts() };
    const id = this.current().id;
    c[id] = (c[id] || 0) + 1;
    this.counts.set(c);
    saveCounts(c);
    if (this.cycle() && this.target() > 0 && c[id] === this.target()) setTimeout(() => this.nextZikr(), 700);
  }

  protected readonly cycle = signal(localStorage.getItem('sabeel.tasbihCycle') !== '0');

  protected setCycle(v: boolean): void {
    this.cycle.set(v);
    localStorage.setItem('sabeel.tasbihCycle', v ? '1' : '0');
  }

  protected nextZikr(): void {
    const i = this.presets.findIndex((p) => p.id === this.current().id);
    this.select(this.presets[(i + 1) % this.presets.length]);
  }

  protected reset(): void {
    const c = { ...this.counts() };
    delete c[this.current().id];
    this.counts.set(c);
    saveCounts(c);
  }
}
