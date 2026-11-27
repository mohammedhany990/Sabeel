import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Api } from './api';
import { I18n } from './i18n';
import { PrayerTimes } from './models';
import { Toast } from './toast';

export interface Muezzin { id: string; name: string; url: string; fajrUrl?: string; }

export const MUEZZINS: Muezzin[] = [
  { id: 'madina', name: 'Madinah', url: 'assets/adhan/madina.mp3' },
  { id: 'aqsa', name: 'Al-Aqsa', url: 'assets/adhan/aqsa.mp3' },
  { id: 'alafasy', name: 'Mishary Alafasy', url: 'assets/adhan/alafasy.mp3' },
  { id: 'beautiful', name: 'Adhan, recording 1', url: 'assets/adhan/beautiful.mp3' },
  { id: 'azan', name: 'Adhan, recording 2', url: 'assets/adhan/azan.mp3' },
  { id: 'tobar', name: 'Nasr al-Din Tobar', url: 'assets/adhan/tobar.mp3', fajrUrl: 'assets/adhan/tobar-fajr.mp3' }
];

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const LEADS = [5, 10, 15, 20, 30];
const PRAYER_KEY = 'sabeel.adhan.prayers';

export interface PrayerCfg { adhan: boolean; muezzin: string; reminder: boolean; lead: number; volume: number; fajrRecording: boolean; }

export function defaultCfg(): Record<string, PrayerCfg> {
  const o: Record<string, PrayerCfg> = {};
  for (const p of PRAYERS) o[p] = { adhan: true, muezzin: '', reminder: true, lead: 15, volume: 100, fajrRecording: true };
  return o;
}

export function parseCfg(raw: string): Record<string, PrayerCfg> {
  const base = defaultCfg();
  try {
    const j = JSON.parse(raw || '{}');
    for (const p of PRAYERS) {
      const c = j?.[p];
      if (!c || typeof c !== 'object') continue;
      base[p] = {
        adhan: c.adhan !== false,
        muezzin: typeof c.muezzin === 'string' && MUEZZINS.some((m) => m.id === c.muezzin) ? c.muezzin : '',
        reminder: c.reminder !== false,
        lead: LEADS.includes(c.lead) ? c.lead : 15,
        volume: typeof c.volume === 'number' && c.volume >= 10 && c.volume <= 100 ? Math.round(c.volume) : 100,
        fajrRecording: c.fajrRecording !== false
      };
    }
  } catch { return base; }
  return base;
}

export function dueReminderFor(times: Record<string, string>, now: number, cfg: Record<string, PrayerCfg>, windowMs: number = WINDOW_MS): { prayer: string; lead: number } | null {
  for (const p of PRAYERS) {
    const c = cfg[p];
    const iso = times[p];
    if (!c || !c.reminder || !iso) continue;
    const t = new Date(iso).getTime();
    if (isNaN(t)) continue;
    const before = c.lead * 60000;
    const diff = t - now;
    if (diff <= before && diff > before - windowMs) return { prayer: p, lead: c.lead };
  }
  return null;
}
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
  readonly prayers = signal<Record<string, PrayerCfg>>(parseCfg(this.read(PRAYER_KEY)));

  setPrayer(p: string, patch: Partial<PrayerCfg>): void {
    const next = { ...this.prayers(), [p]: { ...this.prayers()[p], ...patch } };
    this.prayers.set(next);
    this.write(PRAYER_KEY, JSON.stringify(next));
  }

  previewPrayer(p: string): void {
    if (this.playing()) { this.stop(); return; }
    this.play(this.urlFor(p), this.prayers()[p].volume);
  }

  private urlFor(p: string): string {
    const id = this.prayers()[p]?.muezzin || this.muezzin();
    const m = MUEZZINS.find((x) => x.id === id) ?? MUEZZINS[0];
    return p === 'fajr' && m.fajrUrl && this.prayers()[p].fajrRecording ? m.fajrUrl : m.url;
  }
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
    this.play(CHIME_URL);
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
    if (this.playing()) { this.stop(); return; }
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
      const due = dueReminderFor(this.times.times, now, this.prayers());
      if (due) {
        const r = due.prayer;
        const rkey = r + this.times.times[r];
        if (this.lastReminded !== rkey) {
          this.lastReminded = rkey;
          this.play(CHIME_URL);
          const name = r.charAt(0).toUpperCase() + r.slice(1);
          this.toast.show(this.i18n.t('{p} starts in {n} minutes', { p: this.i18n.t(name), n: due.lead }), 'info');
        }
      }
    }
    if (!this.enabled()) return;
    const p = duePrayer(this.times.times, now);
    if (!p || !this.prayers()[p]?.adhan) return;
    const key = p + this.times.times[p];
    if (this.lastFired === key) return;
    this.lastFired = key;
    this.play(this.urlFor(p), this.prayers()[p].volume);
    this.toast.show('Time for ' + p.charAt(0).toUpperCase() + p.slice(1), 'info');
  }

  private play(url: string, volume = 100): void {
    this.stop();
    const a = new Audio(url);
    a.volume = Math.max(0, Math.min(1, volume / 100));
    this.audio = a;
    const done = () => { if (this.audio === a) { this.playing.set(false); this.audio = null; } };
    a.onended = done;
    a.onerror = done;
    a.onpause = done;
    a.onemptied = done;
    a.onplaying = () => { if (this.audio === a) this.playing.set(true); };
    a.play().catch(() => {
      done();
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
