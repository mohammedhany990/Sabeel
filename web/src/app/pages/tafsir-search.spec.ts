import { describe, expect, it } from 'vitest';
import { validQuery } from './tafsir-search';

describe('validQuery', () => {
  it('needs three characters after trimming', () => {
    expect(validQuery('  ab ')).toBe(false);
    expect(validQuery('رحم')).toBe(true);
    expect(validQuery('mercy')).toBe(true);
  });
});
