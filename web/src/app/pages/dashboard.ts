import { Hj, I18n, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { Api } from '../core/api';
import { ShareAyah, ShareOptions } from '../core/share-ayah';
import { Auth } from '../core/auth';
import { DailyAyah, pickDailyAyah } from '../core/daily-ayah';
import { AzkarStreak, Badge, PrayerTimes, ReadingState, RevisionStats, Surah, Task } from '../core/models';
import { formatTime } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';
import { DailyAyahCard } from './daily-ayah';
import { WeeklyCard } from './weekly';

const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

@Component({
  selector: 'app-dashboard',
  imports: [T, Hj, RouterLink, PageHead, Spinner, DailyAyahCard, WeeklyCard],
  template: `
    <app-head [title]="greeting()" [subtitle]="'Here is your day at a glance.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      <app-daily-ayah />
      <app-weekly />
      <div class="grid grid-4">
        <div class="card gilded stat"><div class="num">{{ tasks().length }}</div><div class="lbl">{{ 'Memorization tasks today' | t }}</div></div>
        <div class="card gilded stat"><div class="num">{{ stats()?.dueNow ?? 0 }}</div><div class="lbl">{{ 'Revisions due now' | t }}</div></div>
        <div class="card gilded stat"><div class="num">{{ bestStreak() }}</div><div class="lbl">{{ 'Best azkar streak (days)' | t }}</div></div>
        <div class="card gilded stat"><div class="num">{{ badges().length }}</div><div class="lbl">{{ 'Badges earned' | t }}</div></div>
      </div>

      <div class="card gilded" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Ayah of the day' | t }}</h3><a [routerLink]="['/app/quran', daily().surahId]" [queryParams]="{ ayah: daily().ayahNumber }">{{ 'Open in the mushaf' | t }}</a></div>
        <p class="daily-ayah">{{ ayahText() }}</p>
        <p class="muted">{{ surahName(daily().surahId) }} · {{ 'ayah {n}' | t: { n: daily().ayahNumber } }}</p>
        <div class="tafsir-box">
          <div class="tafsir-head"><strong>{{ 'Tafsir' | t }}</strong><button class="btn btn-sm btn-ghost" (click)="showTafsir.set(!showTafsir())">{{ (showTafsir() ? 'Hide' : 'Show') | t }}</button></div>
          @if (showTafsir()) { <p class="tafsir-text">{{ tafsirText() }}</p> }
        </div>
        <div class="tafsir-box" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm" (click)="shareAyah('text')">{{ 'Share as text' | t }}</button>
          <button class="btn btn-sm btn-gold" (click)="shareAyah('image')">{{ 'Share as image' | t }}</button>
          <label class="sopt"><input type="checkbox" [checked]="shareOpts.tafsir" (change)="shareOpts.tafsir = !shareOpts.tafsir"> {{ 'Include tafsir' | t }}</label>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px">
        <div class="card">
          <div class="card-title"><h3>{{ 'Today\\'s memorization' | t }}</h3><a routerLink="/app/memorization">{{ 'Open' | t }}</a></div>
          @if (tasks().length === 0) {
            <div class="empty">{{ 'No task for today. Create a plan to get a daily target.' | t }}<br><a class="btn btn-sm" style="margin-top:12px" routerLink="/app/memorization">{{ 'Create a plan' | t }}</a></div>
          } @else {
            <div class="list">
              @for (t of tasks(); track t.id) {
                <div class="item">
                  <div><strong>{{ surahName(t.surahId) }}</strong> <span class="muted">{{ 'ayah {a} to {b}' | t: { a: t.fromAyah, b: t.toAyah } }}</span></div>
                  <span class="badge" [class.badge-ok]="t.completed">{{ (t.completed ? 'Done' : t.taskType) | t }}</span>
                </div>
              }
            </div>
          }
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'Next prayer' | t }}</h3><a routerLink="/app/prayer">{{ 'All times' | t }}</a></div>
          @if (next()) {
            <div class="stat"><div class="num">{{ next()!.time }}</div><div class="lbl">{{ (i18n.isRtl() ? next()!.nameAr : null) ?? (next()!.name | t) }} · {{ prayer()?.hijriDate | hj: prayer()?.hijriDateAr }}</div></div>
          } @else {
            <div class="empty">{{ 'Set your location in Prayer and Qibla to see times here.' | t }}</div>
          }
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'Continue reading' | t }}</h3><a routerLink="/app/quran">{{ 'Browse' | t }}</a></div>
          @if (reading()) {
            <p class="muted">{{ 'You stopped at ayah #{n} of the Quran.' | t: { n: reading()!.lastAyahId } }}</p>
            <a class="btn btn-gold" [routerLink]="['/app/quran', resumeSurah()]" [queryParams]="{ ayah: reading()!.lastAyahId }">{{ 'Resume reading' | t }}</a>
          } @else {
            <p class="muted">{{ 'Start with Al-Fatihah and your progress will be remembered.' | t }}</p>
            <a class="btn btn-gold" [routerLink]="['/app/quran', 1]">{{ 'Open Al-Fatihah' | t }}</a>
          }
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'Revision queue' | t }}</h3><a routerLink="/app/revision">{{ 'Open' | t }}</a></div>
          <div class="row">
            <div class="stat"><div class="num">{{ stats()?.scheduled ?? 0 }}</div><div class="lbl">{{ 'Scheduled' | t }}</div></div>
            <div class="stat"><div class="num">{{ stats()?.mastered ?? 0 }}</div><div class="lbl">{{ 'Mastered' | t }}</div></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .daily-ayah { font-size: 1.6rem; line-height: 2.2; color: var(--gold); text-align: center; margin: 8px 0 4px; }
    .tafsir-head { display: flex; align-items: center; justify-content: space-between; color: var(--gold); margin-top: 14px; border-top: 1px solid var(--line-soft); padding-top: 12px; }
    .sopt { display: flex; gap: 6px; align-items: center; color: var(--muted); font-size: 0.85rem; }
    .tafsir-text { margin-top: 8px; line-height: 1.9; }
  `]
})
export class Dashboard implements OnInit {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly loading = signal(true);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly stats = signal<RevisionStats | null>(null);
  protected readonly streaks = signal<AzkarStreak[]>([]);
  protected readonly badges = signal<Badge[]>([]);
  protected readonly prayer = signal<PrayerTimes | null>(null);
  protected readonly reading = signal<ReadingState | null>(null);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly next = signal<{ name: string; nameAr: string | null; time: string } | null>(null);
  protected readonly daily = signal<DailyAyah>(pickDailyAyah());
  protected readonly ayahText = signal('');
  protected readonly showTafsir = signal(true);
  protected readonly shareOpts: ShareOptions = { tafsir: true };
  private readonly shareSvc = inject(ShareAyah);

  protected shareAyah(kind: 'text' | 'image'): void {
    const d = this.daily();
    const surah = this.surahs().find((x) => x.id === d.surahId);
    const s: Surah = surah ?? ({ id: d.surahId, nameAr: '', nameEn: 'Surah ' + d.surahId, transliteration: 'Surah ' + d.surahId, ayahCount: 0 } as Surah);
    const a = { id: 0, surahId: d.surahId, ayahNumber: d.ayahNumber, textUthmani: this.ayahText(), textSimple: '', page: null, juz: null, hizb: null };
    const tafsir = this.tafsirText();
    if (kind === 'text') this.shareSvc.shareText(a, s, this.shareOpts, tafsir);
    else this.shareSvc.shareImage(a, s, this.shareOpts, tafsir);
  }

  protected tafsirText(): string {
    const d = this.daily();
    return this.i18n.isRtl() ? d.tafsirAr : d.tafsirEn;
  }

  protected greeting(): string {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const name = this.auth.user()?.name?.split(' ')[0] ?? '';
    return this.i18n.t('{p}, {n}', { p: this.i18n.t(part), n: name });
  }

  protected bestStreak(): number {
    return this.streaks().reduce((m, s) => Math.max(m, s.currentStreak), 0);
  }

  protected surahName(id: number): string {
    const s = this.surahs().find((x) => x.id === id);
    return s ? (this.i18n.isRtl() ? s.nameAr : s.transliteration) : this.i18n.t('Surah {n}', { n: id });
  }

  protected resumeSurah(): number {
    return this.surahIdForAyah(this.reading()?.lastAyahId ?? 1);
  }

  private surahIdForAyah(ayahId: number): number {
    const saved = Number(localStorage.getItem('sabeel.lastSurah'));
    if (saved > 0) return saved;
    let acc = 0;
    for (const s of this.surahs()) {
      acc += s.ayahCount;
      if (ayahId <= acc) return s.id;
    }
    return 1;
  }

  ngOnInit(): void {
    let pending = 7;
    const done = () => { if (--pending === 0) this.loading.set(false); };
    const safe = <T>(source: Observable<T>, fallback: T): Observable<T> => source.pipe(catchError(() => of(fallback)));
    safe(this.api.surahs(), []).subscribe((v) => { this.surahs.set(v); done(); });
    safe(this.api.todayTasks(), []).subscribe((v) => { this.tasks.set(v); done(); });
    safe<RevisionStats | null>(this.api.revisionStats(), null).subscribe((v) => { this.stats.set(v); done(); });
    safe(this.api.azkarStreaks(), []).subscribe((v) => { this.streaks.set(v); done(); });
    safe(this.api.myBadges(), []).subscribe((v) => { this.badges.set(v); done(); });
    safe<ReadingState | null>(this.api.readingState(), null).subscribe((v) => { this.reading.set(v); done(); });
    safe<PrayerTimes | null>(this.api.prayerTimes({}), null).subscribe((v) => {
      this.prayer.set(v);
      if (v) this.next.set(this.pickNext(v));
      done();
    });
    const d = this.daily();
    this.ayahText.set(d.text);
    this.api.ayah(d.surahId, d.ayahNumber).pipe(catchError(() => of(null))).subscribe((a) => {
      if (a?.textUthmani) this.ayahText.set(a.textUthmani);
    });
  }

  private pickNext(p: PrayerTimes): { name: string; nameAr: string | null; time: string } | null {
    const now = Date.now();
    const entries = ORDER.filter((k) => p.times[k]).map((k) => ({ key: k, name: k.charAt(0).toUpperCase() + k.slice(1), iso: p.times[k] }));
    const upcoming = entries.find((e) => new Date(e.iso).getTime() > now) ?? entries[0];
    return upcoming ? { name: upcoming.name, nameAr: p.namesAr?.[upcoming.key] ?? null, time: formatTime(upcoming.iso, p.timezone) } : null;
  }
}
