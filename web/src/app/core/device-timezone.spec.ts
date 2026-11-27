import { deviceTimezone } from './api';

describe('deviceTimezone', () => {
  it('returns the browser IANA timezone', () => {
    expect(deviceTimezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});
