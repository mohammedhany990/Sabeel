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

  it('never shows an untranslated server message in the Arabic view', () => {
    document.documentElement.lang = 'ar';
    try {
      const raw = new HttpErrorResponse({ status: 400, error: { detail: 'some brand new backend text' } });
      expect(errorMessage(raw)).toBe('Please check the details and try again.');
      expect(errorMessage(new HttpErrorResponse({ status: 500, error: { detail: 'boom' } }))).toBe('The server had a problem. Please try again in a moment.');
      expect(errorMessage(new HttpErrorResponse({ status: 401 }))).toBe('Your session has expired. Please sign in again.');
      const known = new HttpErrorResponse({ status: 400, error: { detail: 'current password is incorrect' } });
      expect(errorMessage(known)).toBe('current password is incorrect');
      expect(errorMessage(new Error('Network down'))).toBe('Something went wrong');
    } finally {
      document.documentElement.lang = 'en';
    }
  });

  it('keeps the server detail in the English view', () => {
    document.documentElement.lang = 'en';
    const raw = new HttpErrorResponse({ status: 400, error: { detail: 'some brand new backend text' } });
    expect(errorMessage(raw)).toBe('some brand new backend text');
  });

  it('adds days as an ISO date', () => {
    expect(addDays(1)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats times and arabic digits', () => {
    expect(formatTime('2026-11-26T04:52:00+02:00', 'Africa/Cairo')).toMatch(/04:52|4:52/);
    expect(toArabicDigits(2026)).toBe('٢٠٢٦');
  });
});
