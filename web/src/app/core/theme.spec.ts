import { describe, expect, it } from 'vitest';
import { normalizeTheme } from './theme';

describe('normalizeTheme', () => {
  it('defaults to dark and accepts light', () => {
    expect(normalizeTheme(null)).toBe('dark');
    expect(normalizeTheme('purple')).toBe('dark');
    expect(normalizeTheme('light')).toBe('light');
  });
});
