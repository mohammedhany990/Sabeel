import { describe, expect, it } from 'vitest';
import { DAILY_AYAHS, pickDailyAyah } from './daily-ayah';
import { duePrayer, MUEZZINS } from './adhan';

describe('pickDailyAyah', () => {
  it('returns the same ayah for the same day', () => {
    const a = pickDailyAyah(new Date('2026-11-27T10:00:00'));
    const b = pickDailyAyah(new Date('2026-11-27T22:00:00'));
    expect(a).toBe(b);
  });

  it('changes the ayah between consecutive days', () => {
    const a = pickDailyAyah(new Date('2026-11-27T12:00:00'));
    const b = pickDailyAyah(new Date('2026-11-28T12:00:00'));
    expect(a).not.toBe(b);
  });

  it('wraps around the rotation and always returns a complete entry', () => {
    const seen = new Set<number>();
    for (let i = 0; i < DAILY_AYAHS.length + 5; i++) {
      const d = pickDailyAyah(new Date(Date.UTC(2026, 0, 1 + i)));
      seen.add(DAILY_AYAHS.indexOf(d));
      expect(d.text.length).toBeGreaterThan(0);
      expect(d.tafsirEn.length).toBeGreaterThan(0);
      expect(d.tafsirAr.length).toBeGreaterThan(0);
      expect(d.surahId).toBeGreaterThanOrEqual(1);
      expect(d.surahId).toBeLessThanOrEqual(114);
      expect(d.ayahNumber).toBeGreaterThanOrEqual(1);
    }
    expect(seen.size).toBe(DAILY_AYAHS.length);
  });
});

describe('duePrayer', () => {
  const times = {
    fajr: '2026-11-27T05:00:00+02:00',
    sunrise: '2026-11-27T06:30:00+02:00',
    dhuhr: '2026-11-27T11:45:00+02:00',
    asr: '2026-11-27T14:55:00+02:00',
    maghrib: '2026-11-27T17:05:00+02:00',
    isha: '2026-11-27T18:25:00+02:00'
  };

  it('fires inside the window after a prayer time', () => {
    const now = new Date('2026-11-27T05:00:10+02:00').getTime();
    expect(duePrayer(times, now)).toBe('fajr');
  });

  it('does not fire before the time or after the window', () => {
    expect(duePrayer(times, new Date('2026-11-27T04:59:59+02:00').getTime())).toBeNull();
    expect(duePrayer(times, new Date('2026-11-27T05:00:31+02:00').getTime())).toBeNull();
  });

  it('never fires for sunrise', () => {
    expect(duePrayer(times, new Date('2026-11-27T06:30:05+02:00').getTime())).toBeNull();
  });

  it('ignores missing or invalid entries', () => {
    expect(duePrayer({ fajr: 'garbage' }, Date.now())).toBeNull();
  });
});

describe('muezzins', () => {
  it('ships the listed muezzins', () => {
    expect(MUEZZINS.map((m) => m.id)).toEqual(['madina', 'aqsa', 'alafasy', 'beautiful', 'azan', 'tobar']);
    for (const m of MUEZZINS) expect(m.url).toMatch(/^assets\/adhan\/.+\.mp3$/);
  });

  it('gives Tobar a separate fajr recording', () => {
    const t = MUEZZINS.find((m) => m.id === 'tobar');
    expect(t?.fajrUrl).toBe('assets/adhan/tobar-fajr.mp3');
  });
});
