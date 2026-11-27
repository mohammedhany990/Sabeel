import { describe, expect, it } from 'vitest';
import { formatCountdown, lastDays, nextPrayer, nextWithRollover } from './prayer-extras';

describe('prayer extras', () => {
  const times = {
    fajr: '2026-11-26T03:00:00Z',
    sunrise: '2026-11-26T04:30:00Z',
    dhuhr: '2026-11-26T09:40:00Z',
    asr: '2026-11-26T12:35:00Z',
    maghrib: '2026-11-26T14:55:00Z',
    isha: '2026-11-26T16:15:00Z'
  };

  it('picks the first prayer after now', () => {
    const now = new Date('2026-11-26T10:00:00Z').getTime();
    expect(nextPrayer(times, now)?.name).toBe('asr');
  });

  it('rolls over to the next day fajr after isha', () => {
    const tomorrow = { fajr: '2026-11-27T03:01:00Z', dhuhr: '2026-11-27T09:40:00Z' };
    const r = nextWithRollover(times, tomorrow, new Date('2026-11-26T20:00:00Z').getTime());
    expect(r?.name).toBe('fajr');
    expect(r?.at).toBe(new Date('2026-11-27T03:01:00Z').getTime());
  });

  it('returns null after isha', () => {
    expect(nextPrayer(times, new Date('2026-11-26T20:00:00Z').getTime())).toBeNull();
  });

  it('formats a countdown as hh:mm:ss', () => {
    expect(formatCountdown(3 * 3600000 + 5 * 60000 + 9000)).toBe('03:05:09');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });

  it('lists the last days newest first', () => {
    const days = lastDays(3, new Date(2026, 10, 26));
    expect(days).toEqual(['2026-11-26', '2026-11-25', '2026-11-24']);
  });
});
