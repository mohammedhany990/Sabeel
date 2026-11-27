import { describe, expect, it } from 'vitest';
import { readSupportEmail } from './config';

describe('readSupportEmail', () => {
  it('returns an empty string when unset or blank', () => {
    expect(readSupportEmail(undefined)).toBe('');
    expect(readSupportEmail('   ')).toBe('');
  });

  it('rejects values that are not an email address', () => {
    expect(readSupportEmail('not-an-email')).toBe('');
    expect(readSupportEmail('a@b')).toBe('');
    expect(readSupportEmail('a b@c.org')).toBe('');
    expect(readSupportEmail('"><script>@x.org')).toBe('');
  });

  it('accepts and trims a valid address', () => {
    expect(readSupportEmail('  help@example.org ')).toBe('help@example.org');
  });
});
