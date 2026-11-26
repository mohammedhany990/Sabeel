import { describe, expect, it } from 'vitest';
import { clampPage } from './khatma';

describe('clampPage', () => {
  it('keeps the page inside the mushaf', () => {
    expect(clampPage(-4)).toBe(0);
    expect(clampPage(700)).toBe(604);
    expect(clampPage(12.9)).toBe(12);
    expect(clampPage(Number.NaN)).toBe(0);
  });
});
