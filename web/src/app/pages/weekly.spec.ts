import { describe, expect, it } from 'vitest';
import { suggest, sumValues } from './weekly';

const khatma = { completed: false } as never;
const prayers = (p: number) => ({ prayedInRange: p, possibleInRange: 35 }) as never;

describe('suggest', () => {
  it('puts due revisions first', () => {
    expect(suggest({ prayers: prayers(35), revision: { dueNow: 3, scheduled: 0, mastered: 0 }, khatma, tasbeeh: null }).key).toBe('revise');
  });
  it('suggests a khatma when there is none', () => {
    expect(suggest({ prayers: prayers(35), revision: { dueNow: 0, scheduled: 0, mastered: 0 }, khatma: null, tasbeeh: null }).key).toBe('khatma');
  });
  it('counts missed prayers', () => {
    const r = suggest({ prayers: prayers(30), revision: null, khatma, tasbeeh: null });
    expect(r.key).toBe('prayers');
    expect(r.n).toBe(5);
  });
  it('is steady when everything is done', () => {
    expect(suggest({ prayers: prayers(35), revision: null, khatma, tasbeeh: null }).key).toBe('steady');
  });
  it('sums tasbeeh values', () => {
    expect(sumValues({ a: 2, b: 3 })).toBe(5);
    expect(sumValues(undefined)).toBe(0);
  });
});
