import { describe, expect, it } from 'vitest';
import { PHRASES } from './tasbeeh';

describe('tasbeeh phrases', () => {
  it('matches the backend phrase codes', () => {
    expect(PHRASES.map((p) => p.code)).toEqual([
      'SUBHANALLAH', 'ALHAMDULILLAH', 'ALLAHU_AKBAR', 'LA_ILAHA_ILLALLAH', 'ASTAGHFIRULLAH', 'SALAWAT'
    ]);
  });
});
