import { AR, PATTERNS } from './i18n-ar';
import { HttpErrorResponse } from '@angular/common/http';

const ARABIC_LETTERS = /[\u0600-\u06FF]/;

function viewIsArabic(): boolean {
  return typeof document !== 'undefined' && document.documentElement.lang === 'ar';
}

function translatable(text: string): boolean {
  return ARABIC_LETTERS.test(text) || AR[text] !== undefined || PATTERNS.some(([re]) => re.test(text));
}

function byStatus(status: number): string {
  if (status === 400 || status === 422) return 'Please check the details and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'We could not find what you asked for.';
  if (status === 409) return 'This conflicts with existing data.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server had a problem. Please try again in a moment.';
  return 'Something went wrong';
}

export function errorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach the Sabeel gateway. Check that the backend is running.';
    const body = e.error as { detail?: string; title?: string; errors?: Record<string, string>; fields?: Record<string, string> } | null;
    const raw = body?.detail || (body?.errors ? Object.values(body.errors).join(', ') : '') || body?.fields && Object.values(body.fields).join(', ') || '';
    if (raw && (!viewIsArabic() || translatable(raw))) return raw;
    if (viewIsArabic()) return byStatus(e.status);
    return body?.title || `Request failed (${e.status})`;
  }
  if (e instanceof Error && !viewIsArabic()) return e.message;
  return 'Something went wrong';
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}


export function formatTime(iso: string, tz?: string): string {
  try {
    return new Date(iso).toLocaleTimeString(typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG' : [], { hour: '2-digit', minute: '2-digit', timeZone: tz });
  } catch {
    return iso;
  }
}

export function toArabicDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}
