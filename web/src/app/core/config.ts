declare global {
  interface Window {
    SABEEL_API_BASE?: string;
    SABEEL_SUPPORT_EMAIL?: string;
  }
}

export const API_BASE: string = (typeof window !== 'undefined' && window.SABEEL_API_BASE) || 'http://localhost:8080/api/v1';

const EMAIL_SHAPE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export function readSupportEmail(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  return EMAIL_SHAPE.test(v) ? v : '';
}

export const SUPPORT_EMAIL: string = readSupportEmail(typeof window !== 'undefined' ? window.SABEEL_SUPPORT_EMAIL : undefined);
