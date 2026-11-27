import { Hj, I18n, Loc, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { Adhan, LEADS, PRAYERS } from '../core/adhan';
import { PrayerExtras } from './prayer-extras';
import { PrayerTracker as PrayerLocalTracker } from './prayer-tracker';
import { Api, deviceTimezone } from '../core/api';
import { Hijri, PrayerSettings, PrayerTimes, Qibla } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage, formatTime, todayIso } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';

const NAMES = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const METHODS = ['EGYPT', 'MWL', 'ISNA', 'MAKKAH', 'KARACHI'];

@Component({
  selector: 'app-prayer',
  imports: [T, Loc, Hj, FormsModule, PageHead, Spinner, PrayerExtras, PrayerLocalTracker],
  template: `
    <app-head [title]="'Prayer and Qibla' | t" [subtitle]="'Calculated locally from your coordinates.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      <div class="grid grid-2">
        <div class="card gilded">
          <div class="card-title">
            <h3>{{ 'Prayer times' | t }}</h3>
            <input type="date" [ngModel]="date()" (ngModelChange)="date.set($event); loadTimes()" style="width:auto" name="d">
          </div>
          @if (hijri()) { <p class="gold">{{ hijri()!.hijri | hj: hijri()!.hijriAr }} <span class="muted small">({{ hijri()! | loc: 'note' }})</span></p> }
          @if (timesError()) { <div class="error-box">{{ timesError() }}</div> }
          @if (times(); as t) {
            <div class="list">
              @for (n of names; track n) {
                @if (t.times[n]) {
                  <div class="item" [class.next]="nextName() === n">
                    <strong style="text-transform:capitalize">{{ pname(n) }}</strong>
                    <span class="time">{{ fmt(t.times[n], t.timezone) }}</span>
                  </div>
                }
              }
            </div>
            <p class="muted small" style="margin-top:12px">{{ 'Method {m} · {z}. These are astronomical calculations and can differ by a few minutes from your local authority.' | t: { m: (t.method | t), z: t.timezone } }}</p>
          }
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'Qibla' | t }}</h3>@if (qibla()) { <span class="badge">{{ qibla()!.direction | t }}</span> }</div>
          @if (qibla(); as q) {
            <div class="compass">
              <div class="ring"><span class="n">{{ 'N' | t }}</span><span class="e">{{ 'E' | t }}</span><span class="s">{{ 'S' | t }}</span><span class="w">{{ 'W' | t }}</span>
                <div class="needle" [style.transform]="'rotate(' + q.bearingDegrees + 'deg)'"></div>
                <div class="kaaba"><i></i></div>
              </div>
              <div class="deg">{{ q.bearingDegrees.toFixed(1) }}°</div>
              <div class="muted">{{ 'from true north, clockwise' | t }}</div>
            </div>
          }
        </div>
      </div>

      <app-prayer-extras [query]="{ lat: form.latitude, lng: form.longitude, method: form.method }" [times]="times()" [isToday]="date() === today" />

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Adhan' | t }}</h3><span class="badge" [class.badge-ok]="adhan.enabled()">{{ (adhan.enabled() ? 'On' : 'Off') | t }}</span></div>
        <p class="muted">{{ 'Plays the adhan aloud at every prayer time while the app is open, and reminds you with a notification.' | t }}</p>
        <div class="adhan-row">
          <label class="field">{{ 'Muezzin' | t }}
            <select name="mz" [ngModel]="adhan.muezzin()" (ngModelChange)="adhan.setMuezzin($event)">
              @for (m of adhan.muezzins; track m.id) { <option [value]="m.id">{{ m.name | t }}</option> }
            </select>
          </label>
          <div class="row">
            <button class="btn" type="button" (click)="adhan.preview()" data-testid="adhan-preview">{{ (adhan.playing() ? 'Stop' : 'Preview') | t }}</button>
            <button class="btn btn-gold" type="button" (click)="toggleAdhan()">{{ (adhan.enabled() ? 'Turn off' : 'Turn on') | t }}</button>
          </div>
        </div>
        <p class="muted small">{{ 'Your choice is saved on this device. Browsers may ask you to tap Preview once before sound can play automatically.' | t }}</p>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Prayer reminder' | t }}</h3><span class="badge" [class.badge-ok]="adhan.reminder()">{{ (adhan.reminder() ? 'On' : 'Off') | t }}</span></div>
        <p class="muted">{{ 'Notifies you 15 minutes before each prayer with a gentle chime.' | t }}</p>
        <button class="btn btn-gold" type="button" (click)="adhan.reminder() ? adhan.disableReminder() : adhan.enableReminder()">{{ (adhan.reminder() ? 'Turn off' : 'Turn on') | t }}</button>
      </div>

      <div class="card" style="margin-top:18px" data-testid="prayer-settings">
        <div class="card-title"><h3>{{ 'Settings for each prayer' | t }}</h3></div>
        <p class="muted small">{{ 'The adhan and reminder switches above stay the master switches. Fajr has its own adhan recording where the muezzin offers one.' | t }}</p>
        <div class="pp-list">
          @for (p of prayerKeys; track p) {
            <div class="pp-row" [attr.data-testid]="'pp-' + p">
              <strong class="pp-name">{{ pname(p) }}</strong>
              <select [attr.aria-label]="'Muezzin' | t" [ngModel]="adhan.prayers()[p].muezzin" (ngModelChange)="adhan.setPrayer(p, { muezzin: $event })" [name]="'pm-' + p" [attr.data-testid]="'pp-muezzin-' + p">
                <option value="">{{ 'Default muezzin' | t }}</option>
                @for (m of adhan.muezzins; track m.id) { <option [value]="m.id">{{ m.name | t }}</option> }
              </select>
              <label class="pp-chk"><input type="checkbox" [checked]="adhan.prayers()[p].adhan" (change)="adhan.setPrayer(p, { adhan: $any($event.target).checked })" [attr.data-testid]="'pp-adhan-' + p"> {{ 'Adhan' | t }}</label>
              <label class="pp-chk"><input type="checkbox" [checked]="adhan.prayers()[p].reminder" (change)="adhan.setPrayer(p, { reminder: $any($event.target).checked })" [attr.data-testid]="'pp-reminder-' + p"> {{ 'Reminder' | t }}</label>
              <select [attr.aria-label]="'Reminder lead time' | t" [ngModel]="adhan.prayers()[p].lead" (ngModelChange)="adhan.setPrayer(p, { lead: +$event })" [name]="'pl-' + p" [disabled]="!adhan.prayers()[p].reminder" [attr.data-testid]="'pp-lead-' + p">
                @for (l of leads; track l) { <option [value]="l" [selected]="l === adhan.prayers()[p].lead">{{ '{n} min before' | t: { n: l } }}</option> }
              </select>
              <label class="pp-chk pp-vol">{{ 'Volume' | t }} <input type="range" min="10" max="100" step="5" [value]="adhan.prayers()[p].volume" (input)="adhan.setPrayer(p, { volume: +$any($event.target).value })" [attr.data-testid]="'pp-volume-' + p"> <span class="muted">{{ adhan.prayers()[p].volume }}%</span></label>
              @if (p === 'fajr') { <label class="pp-chk"><input type="checkbox" [checked]="adhan.prayers()[p].fajrRecording" (change)="adhan.setPrayer(p, { fajrRecording: $any($event.target).checked })" data-testid="pp-fajrrec"> {{ 'Fajr recording' | t }}</label> }
              <button class="btn btn-sm" type="button" (click)="adhan.previewPrayer(p)">{{ 'Preview' | t }}</button>
            </div>
          }
        </div>
      </div>

      <app-prayer-tracker style="display:block;margin-top:18px"></app-prayer-tracker>

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Location and method' | t }}</h3></div>
        <form class="grid grid-4" (ngSubmit)="save()">
          <label class="field">{{ 'Latitude' | t }}<input type="number" step="any" name="lat" [(ngModel)]="form.latitude" required></label>
          <label class="field">{{ 'Longitude' | t }}<input type="number" step="any" name="lng" [(ngModel)]="form.longitude" required></label>
          <label class="field">{{ 'Timezone (IANA)' | t }}<input name="tz" [(ngModel)]="form.timezone" required [placeholder]="'Africa/Cairo' | t"></label>
          <label class="field">{{ 'Method' | t }}<select name="m" [(ngModel)]="form.method">@for (m of methods; track m) { <option [value]="m">{{ m | t }}</option> }</select></label>
          <label class="field">{{ 'Asr' | t }}<select name="a" [(ngModel)]="form.asrFactor"><option [ngValue]="1">{{ 'Standard' | t }}</option><option [ngValue]="2">{{ 'Hanafi' | t }}</option></select></label>
          <div class="row" style="align-items:flex-end">
            <button class="btn" type="button" (click)="locate()">{{ 'Use my location' | t }}</button>
            <button class="btn btn-gold" type="submit">{{ 'Save and recalculate' | t }}</button>
          </div>
        </form>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'This month' | t }}</h3><button class="btn btn-sm" (click)="loadMonth()">{{ (month().length ? 'Reload' : 'Load month') | t }}</button></div>
        @if (month().length) {
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>{{ 'Date' | t }}</th>@for (n of names; track n) { <th style="text-transform:capitalize">{{ pname(n) }}</th> }</tr></thead>
              <tbody>
                @for (d of month(); track d.date) {
                  <tr [class.today]="d.date === today"><td>{{ d.date }}</td>@for (n of names; track n) { <td>{{ d.times[n] ? fmt(d.times[n], d.timezone) : '-' }}</td> }</tr>
                }
              </tbody>
            </table>
          </div>
        } @else { <div class="empty">{{ 'Load the whole month for your saved location.' | t }}</div> }
      </div>
    }
  `,
  styles: [`
    .item.next { border-color: var(--gold); background: rgba(226, 194, 117, 0.08); }
    .pp-list { display: grid; gap: 10px; margin-top: 10px; }
    .pp-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
    .pp-row select { width: auto; flex: 0 1 200px; padding: 7px 10px; border-radius: 8px; background: var(--panel); color: var(--text); border: 1px solid var(--line); min-width: 0; }
    .pp-chk { display: flex; gap: 6px; align-items: center; white-space: nowrap; color: var(--muted); }
    .pp-name { min-width: 80px; text-transform: capitalize; }
    .pp-vol input { width: 110px; }
    .adhan-row { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-top: 10px; }
    .adhan-row .field { min-width: 200px; }
    .time { font: 600 1.35rem var(--font-ui); color: var(--gold); }
    .small { font-size: 0.8rem; }
    .compass { display: grid; justify-items: center; gap: 6px; padding: 10px; }
    .ring { position: relative; width: 220px; height: 220px; border-radius: 50%; border: 2px solid var(--line); background: radial-gradient(circle, rgba(226, 194, 117, 0.08), transparent 70%); }
    .ring span { position: absolute; color: var(--muted); font-weight: 700; font-size: 0.8rem; }
    .n { top: 6px; left: 50%; transform: translateX(-50%); color: var(--gold) !important; }
    .s { bottom: 6px; left: 50%; transform: translateX(-50%); }
    .e { right: 10px; top: 50%; transform: translateY(-50%); }
    .w { left: 10px; top: 50%; transform: translateY(-50%); }
    .needle { position: absolute; inset: 0; transition: transform 0.8s cubic-bezier(.2,.8,.2,1); }
    .needle::before { content: ''; position: absolute; left: 50%; top: 18px; width: 4px; height: 94px; margin-left: -2px; border-radius: 4px; background: linear-gradient(180deg, var(--gold), transparent); }
    .needle::after { content: ''; position: absolute; left: 50%; top: 8px; margin-left: -8px; border: 8px solid transparent; border-bottom: 14px solid var(--gold); border-top: 0; }
    .kaaba { position: absolute; inset: 0; display: grid; place-items: center; }
    .kaaba i { width: 16px; height: 16px; background: #0b0b0b; border: 1px solid var(--gold); border-radius: 3px; }
    .deg { font: 600 2rem var(--font-ui); color: var(--gold); }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 9px 12px; text-align: start; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
    th { color: var(--muted); font-weight: 600; }
    tr.today td { background: rgba(226, 194, 117, 0.1); color: var(--gold); }
  `]
})
export class Prayer implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  private readonly i18n = inject(I18n);
  protected readonly adhan = inject(Adhan);
  protected readonly prayerKeys = PRAYERS;
  protected readonly leads = LEADS;

  protected toggleAdhan(): void {
    if (this.adhan.enabled()) this.adhan.disable();
    else this.adhan.enable();
  }
  protected readonly loading = signal(true);
  protected readonly times = signal<PrayerTimes | null>(null);
  protected readonly timesError = signal('');
  protected readonly hijri = signal<Hijri | null>(null);
  protected readonly qibla = signal<Qibla | null>(null);
  protected readonly month = signal<PrayerTimes[]>([]);
  protected readonly date = signal(todayIso());
  protected readonly nextName = signal('');
  protected readonly names = NAMES;

  protected pname(n: string): string {
    const ar = this.i18n.isRtl() ? (this.times()?.namesAr ?? this.month()[0]?.namesAr)?.[n] : undefined;
    return ar ?? this.i18n.t(n);
  }
  protected readonly methods = METHODS;
  protected readonly today = todayIso();
  protected form: PrayerSettings = { latitude: 30.0444, longitude: 31.2357, method: 'EGYPT', timezone: deviceTimezone() ?? 'Africa/Cairo', asrFactor: 1 };

  protected fmt = formatTime;

  ngOnInit(): void {
    this.api.prayerSettings().pipe(catchError(() => of(null))).subscribe((s) => {
      if (s) this.form = { ...s };
      this.loading.set(false);
      this.refreshAll();
    });
  }

  private refreshAll(): void {
    this.loadTimes();
    this.api.hijri(this.date()).subscribe({ next: (h) => this.hijri.set(h), error: () => undefined });
    this.api.qibla(this.form.latitude, this.form.longitude).subscribe({ next: (q) => this.qibla.set(q), error: () => undefined });
  }

  protected loadTimes(): void {
    this.timesError.set('');
    this.api.prayerTimes({ date: this.date(), lat: this.form.latitude, lng: this.form.longitude, method: this.form.method }).subscribe({
      next: (t) => {
        this.times.set(t);
        const now = Date.now();
        const next = NAMES.find((n) => t.times[n] && new Date(t.times[n]).getTime() > now);
        this.nextName.set(this.date() === this.today ? (next ?? '') : '');
      },
      error: (e) => { this.times.set(null); this.timesError.set(errorMessage(e)); }
    });
  }

  protected loadMonth(): void {
    const d = new Date(this.date());
    this.api.prayerMonth({ year: d.getFullYear(), month: d.getMonth() + 1, lat: this.form.latitude, lng: this.form.longitude, method: this.form.method }).subscribe({
      next: (m) => this.month.set(m),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected locate(): void {
    if (!navigator.geolocation) { this.toast.error('Geolocation is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        this.form.latitude = +p.coords.latitude.toFixed(4);
        this.form.longitude = +p.coords.longitude.toFixed(4);
        this.form.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.toast.ok('Location filled in. Save to recalculate.');
      },
      () => this.toast.error('Location permission denied.')
    );
  }

  protected save(): void {
    this.api.savePrayerSettings({ ...this.form, latitude: Number(this.form.latitude), longitude: Number(this.form.longitude), asrFactor: Number(this.form.asrFactor) }).subscribe({
      next: (s) => { this.form = { ...s }; this.toast.ok('Settings saved'); this.month.set([]); this.refreshAll(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
