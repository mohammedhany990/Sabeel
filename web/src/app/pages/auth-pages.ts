import { I18n, T } from '../core/i18n';
import { LangSwitch } from '../shared/lang-switch';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { errorMessage } from '../core/util';
import { Logo } from '../shared/logo';

const SHARED_STYLES = `
  .wrap { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; }
  .art { position: relative; padding: 56px; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(160deg, rgba(15, 107, 87, 0.55), rgba(4, 24, 26, 0.95)); border-inline-end: 1px solid var(--line); overflow: hidden; }
  .art .verse { font: 2.4rem/1.9 var(--font-quran); direction: rtl; color: var(--gold); text-align: center; margin: 40px 0; }
  .art .tr { text-align: center; color: var(--muted); font-style: italic; }
  .panel { position: relative; display: grid; place-items: center; padding: 32px; }
  .langpos { position: absolute; top: 18px; inset-inline-end: 18px; }
  form { width: 100%; max-width: 420px; display: grid; gap: 16px; }
  .sub { color: var(--muted); margin-top: -6px; }
  .foot { text-align: center; color: var(--muted); font-size: 0.9rem; }
  .ok-box { padding: 12px 16px; border-radius: 12px; background: rgba(47, 191, 148, 0.1); border: 1px solid rgba(47, 191, 148, 0.4); color: #b6f0dc; font-size: 0.9rem; }
  .pwrow { display: flex; gap: 8px; align-items: stretch; }
  .pwrow input { flex: 1; min-width: 0; }
  .pwtoggle { border: 1px solid var(--line); background: rgba(255,255,255,0.04); color: var(--gold); border-radius: 12px; padding: 0 14px; cursor: pointer; font: inherit; }
  @media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } .art { display: none; } }
`;

const SHELL_OPEN = `
  <div class="wrap pattern">
    <section class="art">
      <a href="/"><app-logo /></a>
      <div>
        <div class="verse">إِنَّ هَٰذَا ٱلْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ</div>
        <div class="tr">{{ 'Indeed, this Quran guides to what is most upright. (17:9)' | t }}</div>
      </div>
      <div class="muted">{{ 'Memorize. Revise. Recite. Grow.' | t }}</div>
    </section>
    <section class="panel"><app-lang class="langpos" />
`;
const SHELL_CLOSE = `</section></div>`;

@Component({
  selector: 'app-login',
  imports: [T, LangSwitch, FormsModule, RouterLink, Logo],
  styles: [SHARED_STYLES],
  template: `${SHELL_OPEN}
    <form (ngSubmit)="submit()">
      <div><h1>{{ 'Welcome back' | t }}</h1><p class="sub">{{ 'Sign in to continue your journey.' | t }}</p></div>
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      <label class="field">{{ 'Email' | t }}<input type="email" name="email" [(ngModel)]="email" required autocomplete="email" [placeholder]="'you@example.com' | t"></label>
      <label class="field">{{ 'Password' | t }}<input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" [placeholder]="'Your password' | t"></label>
      <div class="row between"><span></span><a routerLink="/forgot-password">{{ 'Forgot password?' | t }}</a></div>
      <button class="btn btn-gold" type="submit" [disabled]="busy()">{{ (busy() ? 'Signing in...' : 'Sign in') | t }}</button>
      <div class="foot">{{ 'New to Sabeel?' | t }} <a routerLink="/register">{{ 'Create an account' | t }}</a></div>
    </form>
  ${SHELL_CLOSE}`
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/app/dashboard']),
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }
}

@Component({
  selector: 'app-register',
  imports: [T, LangSwitch, FormsModule, RouterLink, Logo],
  styles: [SHARED_STYLES],
  template: `${SHELL_OPEN}
    <form (ngSubmit)="submit()">
      <div><h1>{{ 'Begin your path' | t }}</h1><p class="sub">{{ 'Create your Sabeel account.' | t }}</p></div>
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      @if (done()) { <div class="ok-box">{{ 'Account created. We sent a verification email. You can sign in now.' | t }}</div> }
      <label class="field">{{ 'Full name' | t }}<input name="name" [(ngModel)]="name" required minlength="2" maxlength="120" autocomplete="name"></label>
      <label class="field">{{ 'Email' | t }}<input type="email" name="email" [(ngModel)]="email" required autocomplete="email"></label>
      <label class="field">{{ 'Password (8 to 72 characters)' | t }}<input type="password" name="password" [(ngModel)]="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>
      <button class="btn btn-gold" type="submit" [disabled]="busy()">{{ (busy() ? 'Creating...' : 'Create account') | t }}</button>
      <div class="foot">{{ 'Already registered?' | t }} <a routerLink="/login">{{ 'Sign in' | t }}</a></div>
    </form>
  ${SHELL_CLOSE}`
})
export class RegisterPage {
  private readonly i18n = inject(I18n);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  name = '';
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly done = signal(false);

  submit(): void {
    if (this.password.length < 8 || this.name.trim().length < 2) {
      this.error.set('Name needs 2+ characters and password 8+ characters.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.register(this.name.trim(), this.email.trim(), this.password, this.i18n.lang()).subscribe({
      next: () => {
        this.done.set(true);
        this.auth.login(this.email.trim(), this.password).subscribe({
          next: () => this.router.navigate(['/app/dashboard']),
          error: () => {
            this.busy.set(false);
            this.router.navigate(['/login']);
          }
        });
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }
}

@Component({
  selector: 'app-forgot',
  imports: [T, LangSwitch, FormsModule, RouterLink, Logo],
  styles: [SHARED_STYLES],
  template: `${SHELL_OPEN}
    <form (ngSubmit)="submit()">
      <div><h1>{{ 'Reset password' | t }}</h1><p class="sub">{{ 'We will email you a reset link.' | t }}</p></div>
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      @if (message()) { <div class="ok-box">{{ message() | t }}</div> }
      <label class="field">{{ 'Email' | t }}<input type="email" name="email" [(ngModel)]="email" required></label>
      <button class="btn btn-gold" type="submit" [disabled]="busy()">{{ 'Send reset link' | t }}</button>
      <div class="foot"><a routerLink="/login">{{ 'Back to sign in' | t }}</a></div>
    </form>
  ${SHELL_CLOSE}`
})
export class ForgotPage {
  private readonly auth = inject(Auth);
  email = '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => { this.busy.set(false); this.message.set('If the email exists, a reset link was sent.'); },
      error: (e) => { this.busy.set(false); this.error.set(errorMessage(e)); }
    });
  }
}

@Component({
  selector: 'app-reset',
  imports: [T, LangSwitch, FormsModule, RouterLink, Logo],
  styles: [SHARED_STYLES],
  template: `${SHELL_OPEN}
    <form (ngSubmit)="submit()">
      <div><h1>{{ 'Choose a new password' | t }}</h1></div>
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      @if (message()) { <div class="ok-box">{{ message() | t }}</div> }
      @if (!message()) {
        @if (!hasToken() && !manual()) {
          <p class="sub" data-testid="reset-no-token">{{ 'Open the reset link from your email to choose a new password.' | t }}</p>
          <button class="btn" type="button" data-testid="reset-have-code" (click)="manual.set(true)">{{ 'I have a code' | t }}</button>
        } @else {
          @if (!hasToken()) {
            <label class="field">{{ 'Reset token' | t }}<input name="token" [(ngModel)]="tokenValue" required autocomplete="off"></label>
          }
          <label class="field">{{ 'New password' | t }}
            <span class="pwrow"><input [type]="show() ? 'text' : 'password'" name="pw" [(ngModel)]="password" required minlength="8" maxlength="72" autocomplete="new-password"><button class="pwtoggle" type="button" data-testid="reset-toggle" (click)="show.set(!show())">{{ (show() ? 'Hide' : 'Show') | t }}</button></span>
          </label>
          <label class="field">{{ 'Confirm new password' | t }}<input [type]="show() ? 'text' : 'password'" name="confirm" [(ngModel)]="confirm" required maxlength="72" autocomplete="new-password"></label>
          <button class="btn btn-gold" type="submit" [disabled]="busy()">{{ 'Update password' | t }}</button>
        }
      } @else {
        <a class="btn btn-gold" routerLink="/login" id="reset-signin">{{ 'Sign in with your new password' | t }}</a>
      }
      <div class="foot"><a routerLink="/login">{{ 'Back to sign in' | t }}</a></div>
    </form>
  ${SHELL_CLOSE}`
})
export class ResetPage {
  private readonly auth = inject(Auth);
  readonly token = input<string>();
  tokenValue = '';
  password = '';
  confirm = '';
  readonly hasToken = signal(false);
  readonly manual = signal(false);
  readonly show = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  constructor() {
    queueMicrotask(() => {
      const t = this.token();
      if (t) {
        this.tokenValue = t;
        this.hasToken.set(true);
        if (typeof history !== 'undefined') history.replaceState(history.state, '', location.pathname);
      }
    });
  }

  submit(): void {
    this.error.set('');
    if (!this.tokenValue.trim()) { this.error.set('Open the reset link from your email to choose a new password.'); return; }
    if (this.password.length < 8) { this.error.set('New password needs at least 8 characters.'); return; }
    if (this.password !== this.confirm) { this.error.set('The new passwords do not match.'); return; }
    this.busy.set(true);
    this.auth.resetPassword(this.tokenValue.trim(), this.password).subscribe({
      next: () => { this.busy.set(false); this.message.set('Password updated.'); this.password = ''; this.confirm = ''; },
      error: (e) => { this.busy.set(false); this.error.set(errorMessage(e)); }
    });
  }
}

@Component({
  selector: 'app-verify',
  imports: [T, LangSwitch, RouterLink, Logo],
  styles: [SHARED_STYLES],
  template: `${SHELL_OPEN}
    <div style="max-width:420px;display:grid;gap:16px">
      <h1>{{ 'Email verification' | t }}</h1>
      @if (state() === 'loading') { <div class="loading"><span class="spinner"></span>{{ 'Verifying your email...' | t }}</div> }
      @if (state() === 'ok') { <div class="ok-box">{{ message() | t }}</div> }
      @if (state() === 'error') { <div class="error-box">{{ message() | t }}</div> }
      <a class="btn btn-gold" routerLink="/login">{{ 'Continue to sign in' | t }}</a>
    </div>
  ${SHELL_CLOSE}`
})
export class VerifyPage {
  private readonly auth = inject(Auth);
  readonly token = input<string>();
  readonly state = signal<'loading' | 'ok' | 'error'>('loading');
  readonly message = signal('');

  constructor() {
    queueMicrotask(() => {
      const t = this.token();
      if (!t) {
        this.state.set('error');
        this.message.set('Missing verification token.');
        return;
      }
      this.auth.verifyEmail(t).subscribe({
        next: () => { this.state.set('ok'); this.message.set('Email verified.'); },
        error: (e) => { this.state.set('error'); this.message.set(errorMessage(e)); }
      });
    });
  }
}
