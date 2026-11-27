import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Api } from './api';
import { I18n } from './i18n';
import { PrayerTimes } from './models';
import { Toast } from './toast';

export interface Muezzin { id: string; name: string; url: string; fajrUrl?: string; }

export const MUEZZINS: Muezzin[] = [
  { id: 'tobar', name: 'Nasr al-Din Tobar', url: 'assets/adhan/tobar.mp3', fajrUrl: 'assets/adhan/tobar-fajr.mp3' }
];

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const ENABLED_KEY = 'sabeel.adhan.enabled';
const MUEZZIN_KEY = 'sabeel.adhan.muezzin';
const REMINDER_KEY = 'sabeel.reminder.enabled';
const WINDOW_MS = 30000;
const REMIND_BEFORE_MS = 15 * 60 * 1000;
const CHIME_URL = 'assets/adhan/chime.mp3';

export function dueReminder(times: Record<string, string>, now: number, beforeMs: number = REMIND_BEFORE_MS, windowMs: number = WINDOW_MS): string | null {
  for (const p of PRAYERS) {
    const iso = times[p];
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (isNaN(t)) continue;
    const diff = t - now;
    if (diff <= beforeMs && diff > beforeMs - windowMs) return p;
  }
  return null;
}

export function duePrayer(times: Record<string, string>, now: number, windowMs: number = WINDOW_MS): string | null {
  for (const p of PRAYERS) {
    const iso = times[p];
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (!isNaN(t) && t <= now && now - t < windowMs) return p;
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class Adhan {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  private readonly i18n = inject(I18n);

  readonly muezzins = MUEZZINS;
  readonly enabled = signal(this.read(ENABLED_KEY) === '1');
  readonly reminder = signal(this.read(REMINDER_KEY) === '1');
  readonly muezzin = signal(this.read(MUEZZIN_KEY) || 'madina');
  readonly playing = signal(false);
  private lastReminded = '';

  private times: PrayerTimes | null = null;
  private lastFired = '';
  private timer: ReturnType<typeof setInterval> | undefined;
  private audio: HTMLAudioElement | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.loadTimes();
    this.timer = setInterval(() => this.tick(), 15000);
    setInterval(() => this.loadTimes(), 3600000);
  }

  enable(): void {
    this.enabled.set(true);
    this.write(ENABLED_KEY, '1');
    this.loadTimes();
    this.preview();
  }

  disable(): void {
    this.enabled.set(false);
    this.write(ENABLED_KEY, '0');
    this.stop();
  }

  enableReminder(): void {
    this.reminder.set(true);
    this.write(REMINDER_KEY, '1');
    this.loadTimes();
    this.play(CHIME_URL);
  }

  disableReminder(): void {
    this.reminder.set(false);
    this.write(REMINDER_KEY, '0');
  }

  setMuezzin(id: string): void {
    if (!MUEZZINS.some((m) => m.id === id)) return;
    this.muezzin.set(id);
    this.write(MUEZZIN_KEY, id);
  }

  preview(): void {
    const m = MUEZZINS.find((x) => x.id === this.muezzin()) ?? MUEZZINS[0];
    this.play(m.url);
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.playing.set(false);
  }

  private tick(): void {
    if (!this.times) return;
    const now = Date.now();
    if (this.reminder()) {
      const r = dueReminder(this.times.times, now);
      if (r) {
        const rkey = r + this.times.times[r];
        if (this.lastReminded !== rkey) {
          this.lastReminded = rkey;
          this.play(CHIME_URL);
          const name = r.charAt(0).toUpperCase() + r.slice(1);
          this.toast.show(this.i18n.t('{p} starts in 15 minutes', { p: this.i18n.t(name) }), 'info');
        }
      }
    }
    if (!this.enabled()) return;
    const p = duePrayer(this.times.times, now);
    if (!p) return;
    const key = p + this.times.times[p];
    if (this.lastFired === key) return;
    this.lastFired = key;
    const m = MUEZZINS.find((x) => x.id === this.muezzin()) ?? MUEZZINS[0];
    this.play(p === 'fajr' && m.fajrUrl ? m.fajrUrl : m.url);
    this.toast.show('Time for ' + p.charAt(0).toUpperCase() + p.slice(1), 'info');
  }

  private play(url: string): void {
    this.stop();
    const a = new Audio(url);
    this.audio = a;
    a.onended = () => { this.playing.set(false); this.audio = null; };
    a.onerror = () => { this.playing.set(false); this.audio = null; };
    a.play().then(() => this.playing.set(true)).catch(() => {
      this.playing.set(false);
      this.audio = null;
      this.toast.error('The browser blocked audio playback. Tap Preview once to allow sound.');
    });
  }

  private loadTimes(): void {
    this.api.prayerTimes({}).pipe(catchError(() => of(null))).subscribe((t) => { if (t) this.times = t; });
  }

  private read(k: string): string {
    try { return localStorage.getItem(k) ?? ''; } catch { return ''; }
  }

  private write(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch { return; }
  }
}
