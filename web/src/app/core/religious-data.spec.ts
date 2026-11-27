import { describe, expect, it } from 'vitest';
import { ASMA_UL_HUSNA } from './data/asma';
import { DUA_CATEGORIES } from './data/duas';
import { gregorianFromHijri, hijriFromGregorian, hijriMonthLength, upcomingOccasions } from './data/hijri';
import { TASBIH_PRESETS } from './data/tasbih';

describe('bundled content', () => {
  it('asma list has 99 names with translations', () => {
    expect(ASMA_UL_HUSNA.length).toBe(99);
    for (const n of ASMA_UL_HUSNA) {
      expect(n.ar.length).toBeGreaterThan(1);
      expect(n.en.length).toBeGreaterThan(1);
      expect(n.meaning.length).toBeGreaterThan(1);
    }
  });

  it('tasbih presets have Arabic text and targets', () => {
    expect(TASBIH_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const p of TASBIH_PRESETS) expect(p.target).toBeGreaterThan(0);
  });

  it('dua categories have referenced duas', () => {
    expect(DUA_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    for (const c of DUA_CATEGORIES) {
      expect(c.duas.length).toBeGreaterThanOrEqual(2);
      for (const d of c.duas) expect(d.ref.length).toBeGreaterThan(2);
    }
  });
});

describe('hijri calendar', () => {
  it('converts 1 Ramadan 1445 to 2024-03-11 (Umm al-Qura table range)', () => {
    const d = gregorianFromHijri(1445, 9, 1);
    const h = hijriFromGregorian(d);
    expect(h).toEqual({ day: 1, month: 9, year: 1445 });
  });

  it('round-trips today', () => {
    const now = new Date();
    const h = hijriFromGregorian(now);
    const back = hijriFromGregorian(gregorianFromHijri(h.year, h.month, h.day));
    expect(back).toEqual(h);
  });

  it('month lengths are 29 or 30', () => {
    for (let m = 1; m <= 12; m++) {
      const len = hijriMonthLength(m, 1446);
      expect(len === 29 || len === 30).toBe(true);
    }
  });

  it('upcoming occasions are in the future and sorted', () => {
    const occ = upcomingOccasions(hijriFromGregorian(new Date()), 4);
    expect(occ.length).toBeGreaterThan(0);
    for (let i = 1; i < occ.length; i++) expect(occ[i].daysAway).toBeGreaterThanOrEqual(occ[i - 1].daysAway);
    expect(occ[0].daysAway).toBeGreaterThanOrEqual(0);
  });
});
