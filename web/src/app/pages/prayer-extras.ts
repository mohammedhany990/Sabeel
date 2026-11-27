import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { I18n, T } from '../core/i18n';
import { Adhan, PrayerTimes, PrayerTracker } from '../core/models';
import { Toast } from '../core/toast';

const DAILY = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export function lastDays(count: number, from: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

export function nextPrayer(times: Record<string, string>, now: number): { name: string; at: number } | null {
  for (const n of ORDER) {
    const raw = times[n];
    if (raw && new Date(raw).getTime() > now) return { name: n, at: new Date(raw).getTime() };
  }
  return null;
}

export function nextWithRollover(today: Record<string, string> | null, tomorrow: Record<string, string> | null, now: number): { name: string; at: number } | null {
  const a = today ? nextPrayer(today, now) : null;
  if (a) return a;
  return tomorrow ? nextPrayer(tomorrow, now) : null;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

@Component({
  selector: 'app-prayer-extras',
  imports: [T, FormsModule],
  template: `
    <div style="margin-top:18px">
      <div class="card gilded" id="countdown">
        <div class="card-title"><h3>{{ 'Next prayer' | t }}</h3></div>
        @if (isToday() && next(); as n) {
          <div class="big">{{ name(n.name) }}</div>
          <div class="count" data-testid="countdown">{{ remaining() }}</div>
        } @else { <div class="muted">{{ 'Loading next prayer...' | t }}</div> }
      </div>
    </div>

    <div class="card" style="margin-top:18px" id="tracker">
      <div class="card-title">
        <h3>{{ 'Prayer tracker' | t }}</h3>
        @if (tracker(); as t) { <span class="badge">{{ 'Streak (days)' | t }}: {{ t.currentStreak }}</span> }
      </div>
      <p class="muted small">{{ 'Last 7 days' | t }}</p>
      @if (tracker(); as t) {
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>{{ 'Day' | t }}</th>@for (p of daily; track p) { <th>{{ name(p) }}</th> }</tr></thead>
            <tbody>
              @for (d of dayKeys(); track d) {
                <tr>
                  <td>{{ d }}</td>
                  @for (p of daily; track p) {
                    <td><input type="checkbox" [checked]="has(d, p)" (change)="toggle(d, p, $any($event.target).checked)" [attr.data-testid]="'log-' + d + '-' + p" [attr.aria-label]="name(p) + ' ' + d"></td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="muted small">{{ t.prayedInRange }} / {{ t.possibleInRange }}</p>
      }
    </div>
  `,
  styles: [`
    .big { font-size: 1.6rem; color: var(--gold); text-transform: capitalize; }
    .count { font: 600 2.4rem var(--font-ui); letter-spacing: 0.04em; }
    .small { font-size: 0.8rem; }
    .hidden { display: none; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 8px 12px; text-align: start; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
    th { color: var(--muted); font-weight: 600; text-transform: capitalize; }
  `]
})
export class PrayerExtras implements OnInit, OnDestroy {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  protected readonly i18n = inject(I18n);
  readonly times = input<PrayerTimes | null>(null);
  readonly isToday = input(true);
  readonly query = input<{ lat?: number; lng?: number; method?: string } | null>(null);
  protected readonly tomorrow = signal<PrayerTimes | null>(null);
  private tomorrowKey = '';

  protected readonly daily = DAILY;
  protected readonly now = signal(Date.now());
  protected readonly tracker = signal<PrayerTracker | null>(null);
  protected readonly adhans = signal<Adhan[]>([]);
  protected readonly adhanId = signal(localStorage.getItem('sabeel.adhan') || '');
  protected readonly autoplay = signal(localStorage.getItem('sabeel.adhan.auto') === '1');
  protected readonly next = computed(() => {
    const t = this.times();
    return t ? nextWithRollover(t.times, this.tomorrow()?.times ?? null, this.now()) : null;
  });
  protected readonly remaining = computed(() => {
    const n = this.next();
    return n ? formatCountdown(n.at - this.now()) : '';
  });
  protected readonly dayKeys = computed(() => (this.tracker() ? lastDays(7, new Date()) : []));
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPlayed = '';

  constructor() {
    effect(() => {
      const t = this.times();
      const now = this.now();
      if (!t || !this.isToday() || nextPrayer(t.times, now)) return;
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      const key = isoDay(d);
      if (this.tomorrowKey === key) return;
      this.tomorrowKey = key;
      const q = this.query();
      this.api.prayerTimes({ date: key, lat: q?.lat, lng: q?.lng, method: q?.method }).subscribe({ next: (x) => this.tomorrow.set(x), error: () => { this.tomorrowKey = ''; } });
    });
    effect(() => {
      const n = this.next();
      const left = n ? n.at - this.now() : Infinity;
      if (n && this.autoplay() && this.isToday() && left <= 0 && this.lastPlayed !== String(n.at)) {
        this.lastPlayed = String(n.at);
        this.play();
      }
    });
  }

  ngOnInit(): void {
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.api.adhans().subscribe({ next: (a) => this.adhans.set(a), error: () => undefined });
    this.reload();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.stopAdhan();
  }

  protected name(n: string): string {
    const ar = this.i18n.isRtl() ? this.times()?.namesAr?.[n] : undefined;
    return ar ?? this.i18n.t(n);
  }

  private reload(): void {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    this.api.prayerLog(isoDay(from), isoDay(to)).subscribe({ next: (t) => this.tracker.set(t), error: () => undefined });
  }

  protected has(day: string, prayer: string): boolean {
    return (this.tracker()?.days[day] ?? []).includes(prayer.toUpperCase());
  }

  protected toggle(day: string, prayer: string, prayed: boolean): void {
    this.api.setPrayerLog(day, prayer.toUpperCase(), prayed).subscribe({
      next: () => this.reload(),
      error: () => { this.toast.error('Could not save.'); this.reload(); }
    });
  }

  protected pickAdhan(id: string): void {
    this.adhanId.set(id);
    localStorage.setItem('sabeel.adhan', id);
  }

  protected setAutoplay(on: boolean): void {
    this.autoplay.set(on);
    localStorage.setItem('sabeel.adhan.auto', on ? '1' : '0');
  }

  readonly playing = signal(false);
  private audio: HTMLAudioElement | null = null;

  protected preview(): void {
    if (this.playing()) { this.stopAdhan(); return; }
    this.play();
  }

  protected stopAdhan(): void {
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio = null; }
    this.playing.set(false);
  }

  private play(): void {
    const a = this.adhans().find((x) => x.id === this.adhanId());
    if (!a) return;
    this.stopAdhan();
    const audio = new Audio(a.url);
    this.audio = audio;
    audio.onended = () => this.playing.set(false);
    this.playing.set(true);
    audio.play().catch(() => { this.playing.set(false); this.toast.error('Could not play this audio.'); });
  }
}
