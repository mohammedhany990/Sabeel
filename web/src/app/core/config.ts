declare global {
  interface Window {
    SABEEL_API_BASE?: string;
  }
}

export const API_BASE: string = (typeof window !== 'undefined' && window.SABEEL_API_BASE) || 'http://localhost:8080/api/v1';
