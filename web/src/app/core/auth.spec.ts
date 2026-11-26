import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Auth } from './auth';
import { API_BASE } from './config';
import { I18n } from './i18n';
import { authInterceptor } from './interceptor';

const tokens = (n: string) => ({ accessToken: 'a' + n, refreshToken: 'r' + n, tokenType: 'Bearer', expiresIn: 900 });

describe('Auth and interceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: Auth;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(Auth);
  });

  it('sends Accept-Language on every call, including anonymous ones', () => {
    const i18n = TestBed.inject(I18n);
    i18n.set('ar');
    client.get(`${API_BASE}/quran/surahs`).subscribe();
    expect(http.expectOne(`${API_BASE}/quran/surahs`).request.headers.get('Accept-Language')).toBe('ar');
    i18n.set('en');
    auth.login('a@b.co', 'password1').subscribe();
    const login = http.expectOne(`${API_BASE}/auth/login`);
    expect(login.request.headers.get('Accept-Language')).toBe('en');
    login.flush(tokens('1'));
    http.expectOne(`${API_BASE}/auth/me`).flush({ id: 'u1', name: 'A', email: 'a@b.co', role: 'USER', emailVerified: true });
  });

  it('register posts the chosen language', () => {
    auth.register('Ali', 'a@b.co', 'password1', 'ar').subscribe();
    const req = http.expectOne(`${API_BASE}/auth/register`);
    expect(req.request.body).toEqual({ name: 'Ali', email: 'a@b.co', password: 'password1', language: 'ar' });
    req.flush({ id: 'u1', name: 'Ali', email: 'a@b.co', role: 'USER', emailVerified: false });
  });

  it('login stores tokens and loads the user', () => {
    auth.login('a@b.co', 'password1').subscribe();
    http.expectOne(`${API_BASE}/auth/login`).flush(tokens('1'));
    http.expectOne(`${API_BASE}/auth/me`).flush({ id: 'u1', name: 'A', email: 'a@b.co', role: 'USER', emailVerified: true });
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()?.id).toBe('u1');
    expect(localStorage.getItem('sabeel.session')).toContain('a1');
  });

  it('attaches the bearer token to API calls', () => {
    auth.login('a@b.co', 'password1').subscribe();
    http.expectOne(`${API_BASE}/auth/login`).flush(tokens('1'));
    http.expectOne(`${API_BASE}/auth/me`).flush({ id: 'u1', name: 'A', email: 'a@b.co', role: 'USER', emailVerified: true });
    client.get(`${API_BASE}/users/me`).subscribe();
    const req = http.expectOne(`${API_BASE}/users/me`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer a1');
    req.flush({});
  });

  it('does not attach a token to login', () => {
    client.post(`${API_BASE}/auth/login`, {}).subscribe();
    const req = http.expectOne(`${API_BASE}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(tokens('1'));
  });

  it('refreshes once on 401 and retries the original request with the new token', () => {
    auth.login('a@b.co', 'password1').subscribe();
    http.expectOne(`${API_BASE}/auth/login`).flush(tokens('1'));
    http.expectOne(`${API_BASE}/auth/me`).flush({ id: 'u1', name: 'A', email: 'a@b.co', role: 'USER', emailVerified: true });
    let body: unknown;
    client.get(`${API_BASE}/revision/stats`).subscribe((b) => (body = b));
    http.expectOne(`${API_BASE}/revision/stats`).flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    const refresh = http.expectOne(`${API_BASE}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'r1' });
    refresh.flush(tokens('2'));
    const retry = http.expectOne(`${API_BASE}/revision/stats`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer a2');
    retry.flush({ dueNow: 1 });
    expect(body).toEqual({ dueNow: 1 });
  });
});
