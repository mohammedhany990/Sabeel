import { I18n, Nm, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { PreferencesResponse, ProfileResponse, Reciter } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { SUPPORT_EMAIL } from '../core/config';
import { PageHead, Spinner } from '../shared/ui';

@Component({
  selector: 'app-settings',
  imports: [T, Nm, FormsModule, PageHead, Spinner],
  template: `
    <app-head [title]="'Profile and settings' | t" [subtitle]="auth.user()?.email + ' · ' + ((auth.user()?.role ?? '') | t) + (auth.user()?.emailVerified ? '' : ' · ' + ('email not verified' | t))" />
    @if (loading()) { <app-spinner /> } @else if (profile(); as p) {
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title"><h3>{{ 'Profile' | t }}</h3></div>
          <form class="stack" (ngSubmit)="saveProfile()">
            <label class="field">{{ 'Name' | t }}<input name="n" [(ngModel)]="pf.name" required minlength="2" maxlength="120"></label>
            <label class="field">{{ 'Profile image URL' | t }}<input name="i" [(ngModel)]="pf.profileImageUrl" maxlength="500"></label>
            <div class="grid grid-2">
              <label class="field">{{ 'Country (2 letters)' | t }}<input name="c" [(ngModel)]="pf.country" maxlength="2" style="text-transform:uppercase"></label>
              <label class="field">{{ 'Interface language' | t }}<select name="lng" [(ngModel)]="pf.preferredLanguage"><option value="en">English</option><option value="ar">العربية</option></select></label>
              <label class="field">{{ 'Timezone' | t }}<input name="tz" [(ngModel)]="pf.timezone" maxlength="50" [placeholder]="'Africa/Cairo' | t"></label>
            </div>
            <label class="field">{{ 'Preferred reciter' | t }}
              <select name="r" [(ngModel)]="pf.preferredReciterId"><option [ngValue]="null">{{ 'No preference' | t }}</option>@for (r of reciters(); track r.id) { <option [ngValue]="r.id">{{ r | nm: 'sub' }}</option> }</select>
            </label>
            <button class="btn btn-gold" type="submit">{{ 'Save profile' | t }}</button>
          </form>
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'Notification preferences' | t }}</h3></div>
          <form class="stack" (ngSubmit)="savePrefs()">
            <label class="row"><input type="checkbox" name="pe" [(ngModel)]="pr.pushEnabled"> {{ 'Push notifications' | t }}</label>
            <label class="row"><input type="checkbox" name="ee" [(ngModel)]="pr.emailEnabled"> {{ 'Email notifications' | t }}</label>
            <label class="row"><input type="checkbox" name="pr" [(ngModel)]="pr.prayerReminders"> {{ 'Prayer reminders' | t }}</label>
            <label class="row"><input type="checkbox" name="ar" [(ngModel)]="pr.azkarReminders"> {{ 'Azkar reminders' | t }}</label>
            <label class="row"><input type="checkbox" name="rv" data-testid="revision-reminders-toggle" [(ngModel)]="pr.revisionReminders"> {{ 'Revision reminders' | t }}</label>
            <div class="grid grid-2">
              <label class="field">{{ 'Memorization reminder' | t }}<input type="time" name="mt" [(ngModel)]="pr.memorizationReminderTime"></label>
              <label class="field">{{ 'Revision reminder' | t }}<input type="time" name="rt" [(ngModel)]="pr.revisionReminderTime"></label>
            </div>
            <button class="btn btn-gold" type="submit">{{ 'Save preferences' | t }}</button>
          </form>
        </div>
      </div>

      <div class="card" style="margin-top:18px" data-testid="change-password">
        <div class="card-title"><h3>{{ 'Change password' | t }}</h3></div>
        <form class="stack" (ngSubmit)="changePassword()">
          @if (pwError()) { <div data-testid="pw-error" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(239,100,100,.5);background:rgba(120,30,30,.35);color:#ffb4b4">{{ pwError() | t }}</div> }
          @if (pwDone()) { <div data-testid="pw-ok" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(80,200,150,.5);background:rgba(20,90,60,.45);color:#b8f0d4">{{ 'Password changed. Other devices were signed out.' | t }}</div> }
          <label class="field">{{ 'Current password' | t }}<input type="password" name="cp" autocomplete="current-password" [(ngModel)]="pw.current" required></label>
          <label class="field">{{ 'New password' | t }}<input type="password" name="np" autocomplete="new-password" [(ngModel)]="pw.next" required minlength="8" maxlength="72"></label>
          <label class="field">{{ 'Confirm new password' | t }}<input type="password" name="cf" autocomplete="new-password" [(ngModel)]="pw.confirm" required maxlength="72"></label>
          <button class="btn btn-gold" type="submit" [disabled]="pwBusy()">{{ 'Change password' | t }}</button>
        </form>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Push device token' | t }}</h3></div>
        <p class="muted">{{ 'Register an FCM web token to receive push notifications on this browser. The backend only delivers push when FCM is enabled on the server.' | t }}</p>
        <form class="row" (ngSubmit)="registerToken()">
          <input class="grow" name="tk" [(ngModel)]="token" [placeholder]="'FCM registration token' | t" style="min-width:240px">
          <button class="btn" type="submit" [disabled]="!token.trim()">{{ 'Register token' | t }}</button>
        </form>
      </div>

      @if (supportEmail) {
        <div class="card" style="margin-top:18px" data-testid="support-card">
          <div class="card-title"><h3>{{ 'Support' | t }}</h3></div>
          <p class="muted">{{ 'Questions, feedback or a problem? Email the project.' | t }}</p>
          <a class="btn" data-testid="support-mailto" [href]="'mailto:' + supportEmail">{{ 'Contact us' | t }}</a>
        </div>
      }

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Session' | t }}</h3></div>
        <button class="btn btn-danger" (click)="auth.logout()">{{ 'Sign out' | t }}</button>
      </div>
    }
  `
})
export class Settings implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly loading = signal(true);
  protected readonly profile = signal<ProfileResponse | null>(null);
  protected readonly reciters = signal<Reciter[]>([]);
  protected pf = { name: '', profileImageUrl: '', country: '', timezone: '', preferredReciterId: null as number | null, preferredLanguage: 'en' };
  protected pr: PreferencesResponse = { pushEnabled: true, emailEnabled: true, memorizationReminderTime: null, revisionReminderTime: null, prayerReminders: true, azkarReminders: true, revisionReminders: true };
  protected token = '';
  protected readonly supportEmail = SUPPORT_EMAIL;
  protected pw = { current: '', next: '', confirm: '' };
  protected readonly pwBusy = signal(false);
  protected readonly pwError = signal('');
  protected readonly pwDone = signal(false);

  protected changePassword(): void {
    this.pwDone.set(false);
    this.pwError.set('');
    if (this.pw.next.length < 8) { this.pwError.set('New password needs at least 8 characters.'); return; }
    if (this.pw.next !== this.pw.confirm) { this.pwError.set('The new passwords do not match.'); return; }
    if (this.pw.next === this.pw.current) { this.pwError.set('new password must differ from the current password'); return; }
    this.pwBusy.set(true);
    this.auth.changePassword(this.pw.current, this.pw.next).subscribe({
      next: () => { this.pwBusy.set(false); this.pwDone.set(true); this.pw = { current: '', next: '', confirm: '' }; },
      error: (e) => { this.pwBusy.set(false); this.pwError.set(errorMessage(e)); }
    });
  }

  ngOnInit(): void {
    forkJoin({ p: this.api.profile(), pr: this.api.preferences(), r: this.api.reciters() }).subscribe({
      next: (x) => {
        this.profile.set(x.p);
        this.pf = { name: x.p.name, profileImageUrl: x.p.profileImageUrl ?? '', country: x.p.country ?? '', timezone: x.p.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, preferredReciterId: x.p.preferredReciterId, preferredLanguage: x.p.preferredLanguage === 'ar' || x.p.preferredLanguage === 'en' ? x.p.preferredLanguage : this.i18n.lang() };
        this.pr = { ...x.pr, memorizationReminderTime: x.pr.memorizationReminderTime?.slice(0, 5) ?? null, revisionReminderTime: x.pr.revisionReminderTime?.slice(0, 5) ?? null };
        this.reciters.set(x.r);
        this.loading.set(false);
      },
      error: (e) => { this.loading.set(false); this.toast.error(errorMessage(e)); }
    });
  }

  protected saveProfile(): void {
    this.api.updateProfile({
      name: this.pf.name, profileImageUrl: this.pf.profileImageUrl || undefined, country: this.pf.country.toUpperCase() || undefined,
      timezone: this.pf.timezone || undefined, preferredReciterId: this.pf.preferredReciterId, preferredLanguage: this.pf.preferredLanguage
    }).subscribe({
      next: (p) => { this.profile.set(p); if (this.pf.preferredLanguage === 'ar' || this.pf.preferredLanguage === 'en') this.i18n.set(this.pf.preferredLanguage); this.toast.ok('Profile saved'); this.auth.loadUser().subscribe({ error: () => undefined }); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected savePrefs(): void {
    this.api.updatePreferences(this.pr).subscribe({
      next: () => this.toast.ok('Preferences saved'),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected registerToken(): void {
    this.api.registerDeviceToken(this.token.trim(), 'WEB').subscribe({
      next: () => { this.toast.ok('Device token registered'); this.token = ''; },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
