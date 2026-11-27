import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { addDays, errorMessage, formatTime, toArabicDigits } from './util';

describe('util', () => {
  it('reads RFC 7807 detail from backend errors', () => {
    const e = new HttpErrorResponse({ status: 409, error: { title: 'Conflict', detail: 'Email already registered' } });
    expect(errorMessage(e)).toBe('Email already registered');
  });

  it('explains an unreachable gateway', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach');
  });

  it('adds days as an ISO date', () => {
    expect(addDays(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats times and arabic digits', () => {
    expect(formatTime('2026-11-26T04:52:00+02:00', 'Africa/Cairo')).toMatch(/04:52|4:52/);
    expect(toArabicDigits(2026)).toBe('٢٠٢٦');
  });
});
