import { describe, expect, it } from 'vitest';
import { defaultCfg, dueReminderFor, parseCfg } from './adhan';

describe('per-prayer adhan settings', () => {
  const times = { fajr: '2026-11-27T03:00:00Z', dhuhr: '2026-11-27T09:40:00Z', asr: '2026-11-27T12:35:00Z', maghrib: '2026-11-27T14:55:00Z', isha: '2026-11-27T16:15:00Z' };

  it('defaults keep today behavior', () => {
    const c = defaultCfg();
    expect(c['fajr']).toEqual({ adhan: true, muezzin: '', reminder: true, lead: 15, volume: 100, fajrRecording: true });
    expect(Object.keys(c)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });

  it('parses stored values and drops invalid ones', () => {
    const c = parseCfg(JSON.stringify({ asr: { adhan: false, muezzin: 'tobar', lead: 10, volume: 40 }, isha: { muezzin: 'nope', lead: 7, volume: 500 } }));
    expect(c['asr']).toMatchObject({ adhan: false, muezzin: 'tobar', lead: 10, volume: 40 });
    expect(c['isha']).toMatchObject({ muezzin: '', lead: 15, volume: 100 });
    expect(parseCfg('not json')['fajr'].lead).toBe(15);
  });

  it('uses each prayer lead time and skips disabled reminders', () => {
    const c = defaultCfg();
    c['asr'].lead = 30;
    c['dhuhr'].reminder = false;
    const at = (iso: string, mins: number) => new Date(iso).getTime() - mins * 60000 + 1000;
    expect(dueReminderFor(times, at(times.asr, 30), c)).toEqual({ prayer: 'asr', lead: 30 });
    expect(dueReminderFor(times, at(times.asr, 15), c)).toBeNull();
    expect(dueReminderFor(times, at(times.dhuhr, 15), c)).toBeNull();
    expect(dueReminderFor(times, at(times.maghrib, 15), c)).toEqual({ prayer: 'maghrib', lead: 15 });
  });
});
