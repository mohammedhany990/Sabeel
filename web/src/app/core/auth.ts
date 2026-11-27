import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { API_BASE } from './config';
import { MessageResponse, TokenResponse, UserResponse } from './models';

const STORAGE_KEY = 'sabeel.session';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private tokens = signal<TokenResponse | null>(this.restore());
  private refreshing$: Observable<TokenResponse> | null = null;

  readonly user = signal<UserResponse | null>(null);
  readonly isLoggedIn = computed(() => this.tokens() !== null);
  readonly role = computed(() => this.user()?.role ?? 'USER');

  private restore(): TokenResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TokenResponse) : null;
    } catch {
      return null;
    }
  }

  private store(t: TokenResponse | null): void {
    this.tokens.set(t);
    if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else localStorage.removeItem(STORAGE_KEY);
  }

  get accessToken(): string | null {
    return this.tokens()?.accessToken ?? null;
  }

  login(email: string, password: string): Observable<UserResponse> {
    return this.http.post<TokenResponse>(`${API_BASE}/auth/login`, { email, password }).pipe(
      tap((t) => this.store(t)),
      switchMap(() => this.loadUser())
    );
  }

  register(name: string, email: string, password: string, language: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${API_BASE}/auth/register`, { name, email, password, language });
  }

  loadUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${API_BASE}/auth/me`).pipe(tap((u) => this.user.set(u)));
  }

  ensureUser(): Observable<boolean> {
    if (!this.isLoggedIn()) return of(false);
    if (this.user()) return of(true);
    return this.loadUser().pipe(map(() => true));
  }

  refresh(): Observable<TokenResponse> {
    const current = this.tokens();
    if (!current) throw new Error('no session');
    if (!this.refreshing$) {
      this.refreshing$ = this.http
        .post<TokenResponse>(`${API_BASE}/auth/refresh`, { refreshToken: current.refreshToken })
        .pipe(
          tap((t) => this.store(t)),
          finalize(() => (this.refreshing$ = null)),
          shareReplay(1)
        );
    }
    return this.refreshing$;
  }

  hasRefresh(): boolean {
    return this.tokens() !== null;
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${API_BASE}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${API_BASE}/auth/reset-password`, { token, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${API_BASE}/auth/change-password`, {
      currentPassword,
      newPassword,
      keepRefreshToken: this.tokens()?.refreshToken ?? null
    });
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${API_BASE}/auth/verify-email`, { params: { token } });
  }

  logout(): void {
    const t = this.tokens();
    if (t) this.http.post(`${API_BASE}/auth/logout`, { refreshToken: t.refreshToken }).subscribe({ error: () => undefined });
    this.clear();
  }

  clear(): void {
    this.store(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
