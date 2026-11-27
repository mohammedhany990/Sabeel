import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach the Sabeel gateway. Check that the backend is running.';
    const body = e.error as { detail?: string; title?: string; errors?: Record<string, string> } | null;
    if (body?.errors) return Object.values(body.errors).join(', ');
    return body?.detail || body?.title || `Request failed (${e.status})`;
  }
  return e instanceof Error ? e.message : 'Something went wrong';
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
