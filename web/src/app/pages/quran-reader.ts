import { I18n, Loc, Nm, T } from '../core/i18n';
import { Component, ElementRef, OnDestroy, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Api } from '../core/api';
import { ViewToggle } from '../shared/view-toggle';
import { DockPlayer } from '../shared/dock-player';
import { extraAyahUrl, extraOf, mergeReciters } from '../core/extra-reciters';
import { Ayah, Bookmark, EditionAyah, EditionInfo, Reciter, Surah } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage, toArabicDigits } from '../core/util';
import { ShareAyah, ShareOptions } from '../core/share-ayah';
import { Spinner } from '../shared/ui';

@Component({
  selector: 'app-quran-reader',
  imports: [ViewToggle, DockPlayer, T, Loc, Nm, FormsModule, RouterLink, Spinner],
  template: `
    <div class="viewbar"><app-view-toggle active="verse" (pick)="switchView($event)" /></div>
    <a routerLink="/app/quran" class="muted">{{ '← All surahs' | t }}</a>
    @if (loading()) { <app-spinner /> } @else if (error()) { <div class="error-box" style="margin-top:14px">{{ error() | t }}</div> } @else if (surah(); as s) {
      <div class="card gilded hero">
        <div class="ar title">{{ s.nameAr }}</div>
        @if (!i18n.isRtl()) { <h2>{{ s | nm }} @if (s | nm: 'sub') { <span class="muted">· {{ s | nm: 'sub' }}</span> }</h2> }
        <div class="row" style="justify-content:center">
          <span class="badge">{{ s | loc: 'revelationType' }}</span>
          <span class="badge">{{ '{n} ayahs' | t: { n: s.ayahCount } }}</span>
          @if (s.startJuz) { <span class="badge">{{ 'Juz {n}' | t: { n: s.startJuz } }}</span> }
        </div>
      </div>

      <div class="card bar">
        <label class="field grow">{{ 'Reciter' | t }}
          <select [ngModel]="reciterId()" (ngModelChange)="changeReciter(+$event)" name="reciter">
            @for (r of reciters(); track r.id) { <option [value]="r.id">{{ r | nm: 'sub' }} ({{ r | loc: 'style' }})</option> }
          </select>
        </label>
        <button class="btn btn-gold" (click)="playFrom(ayahs()[0])" [disabled]="busyAudio()">{{ 'Play from start' | t }}</button>
        <button class="btn" (click)="playWholeSurah()">{{ 'Play full surah' | t }}</button>
        @if (playingId() !== null || surahMode()) { <button class="btn btn-ghost" (click)="stop()">{{ 'Stop' | t }}</button> }
      </div>

      @if (playingId() !== null || surahMode()) {
        <app-dock-player testid="reader-playbar" [audio]="audioEl()" [title]="surahMode() ? ('Full surah' | t) : ('Ayah {n}' | t: { n: playingNumber() })" [reciters]="reciterOptions()" [reciterId]="reciterId()" (reciterChange)="changeReciter($event)" [paused]="paused()" (toggle)="togglePause()" (stop)="stop()" />
      }
      <audio #player (ended)="onEnded()" (error)="onAudioError()" (play)="paused.set(false)" (pause)="onPaused()"></audio>

      @if (s.id !== 1 && s.id !== 9) { <div class="ar bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div> }

      <div class="card text">
        @for (a of ayahs(); track a.id) {
          <div class="ayah" [id]="'a' + a.id" [class.playing]="playingId() === a.id" [class.target]="focusId() === a.id">
            <div class="tools">
              <span class="no">{{ a.ayahNumber }}</span>
              <button class="btn btn-sm btn-ghost" (click)="playToggle(a)" [title]="'Play from this ayah' | t">{{ (playingId() === a.id && !paused() ? 'Pause' : 'Play') | t }}</button>
              <button class="btn btn-sm btn-ghost" (click)="toggleBookmark(a)">{{ (bookmarkFor(a.id) ? 'Bookmarked' : 'Bookmark') | t }}</button>
              <button class="btn btn-sm btn-ghost" (click)="markRead(a)">{{ 'Stopped here' | t }}</button>
              <button class="btn btn-sm btn-ghost" (click)="toggleDetail(a)">{{ 'Tafsir and translation' | t }}</button>
              <button class="btn btn-sm btn-ghost" (click)="shareFor.set(shareFor() === a.id ? null : a.id)">{{ 'Share ayah' | t }}</button>
            </div>
            @if (shareFor() === a.id) {
              <div class="sharebar">
                <button class="btn btn-sm" (click)="doShareText(a)">{{ 'Share as text' | t }}</button>
                <button class="btn btn-sm btn-gold" (click)="doShareImage(a)">{{ 'Share as image' | t }}</button>
              </div>
            }
            <div class="ar line" (click)="toggleDetail(a)">{{ a.textUthmani }} <span class="end">&#64831;{{ toAr(a.ayahNumber) }}&#64830;</span></div>
            @if (detailId() === a.id) {
              <div class="detail">
                <div class="row">
                  <label class="field grow">{{ 'Tafsir' | t }}
                    <select [ngModel]="tafsirKey()" (ngModelChange)="pick('tafsir', $event, a)" name="tafsirKey">
                      @for (e of tafsirEditions(); track e.key) { <option [value]="e.key">{{ e.title }} ({{ e.version }})</option> }
                    </select>
                  </label>
                  <label class="field grow">{{ 'Translation' | t }}
                    <select [ngModel]="translationKey()" (ngModelChange)="pick('translation', $event, a)" name="translationKey">
                      @for (e of translationEditions(); track e.key) { <option [value]="e.key">{{ e.title }} ({{ e.version }})</option> }
                    </select>
                  </label>
                </div>
                @for (d of detail(); track d.edition.key) {
                  <div class="ed-block">
                    @for (en of d.entries; track en.fromAyah) {
                      <p class="ed-text" [attr.dir]="d.edition.language === 'ar' ? 'rtl' : 'ltr'">{{ en.text }}</p>
                      @if (en.notes) { <p class="ed-notes" dir="auto">{{ en.notes }}</p> }
                    } @empty { <p class="muted">{{ 'No text for this ayah in this edition.' | t }}</p> }
                  </div>
                }
                @if (detailError()) { <div class="error-box">{{ 'Could not load the tafsir.' | t }}</div> }
                <button class="btn btn-sm btn-ghost" (click)="detailId.set(null)">{{ 'Close' | t }}</button>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .viewbar { display: flex; justify-content: center; margin: 4px 0 16px; }
    .hero { text-align: center; margin: 14px 0 18px; }
    .title { font-size: 3.4rem; color: var(--gold); line-height: 1.6; }
    .bar { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
    .hidden { display: none; }
    .bismillah { text-align: center; font-size: 2rem; color: var(--gold); margin: 18px 0; }
    .text { padding: 8px 26px; }
    .ayah { padding: 18px 0; border-bottom: 1px solid var(--line-soft); }
    .ayah:last-child { border-bottom: 0; }
    .ayah.playing { background: linear-gradient(90deg, transparent, rgba(47, 191, 148, 0.1), transparent); }
    .ayah.target { box-shadow: inset 0 0 0 1px var(--gold); border-radius: 12px; padding-left: 14px; padding-right: 14px; }
    .tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; opacity: 0.55; transition: opacity 0.2s; }
    .ayah:hover .tools, .ayah.playing .tools { opacity: 1; }
    .no { min-width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--line); color: var(--gold); font-weight: 600; font-size: 0.82rem; }
    .line { font-size: clamp(1.7rem, 3.4vw, 2.5rem); line-height: 2.3; text-align: right; }
    .end { color: var(--gold); font-size: 0.7em; }
    .line { cursor: pointer; }
    .detail { margin-top: 10px; padding: 14px; border: 1px solid var(--line-soft); border-radius: 12px; }
    .ed-block { margin: 12px 0; }
    .ed-title { font-size: 0.78rem; color: var(--gold); }
    .ed-text { line-height: 1.9; white-space: pre-wrap; margin: 6px 0; }
    .ed-notes { font-size: 0.85rem; color: var(--muted); white-space: pre-wrap; }
    .pb-info { white-space: nowrap; color: var(--gold); }
    .sharebar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 8px 0 4px; }
    .sopt { display: flex; gap: 6px; align-items: center; color: var(--muted); font-size: 0.9rem; }
  `]
})
export class QuranReader implements OnDestroy {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  private readonly toast = inject(Toast);
  readonly id = input.required<string>();
  readonly ayah = input<string>();
  readonly n = input<string>();
  private readonly router = inject(Router);
  private readonly player = viewChild<ElementRef<HTMLAudioElement>>('player');

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly surah = signal<Surah | null>(null);
  protected readonly ayahs = signal<Ayah[]>([]);
  protected readonly reciters = signal<Reciter[]>([]);
  protected readonly reciterId = signal(1);
  protected audioEl = () => this.player()?.nativeElement ?? null;
  protected reciterLabel = (): string => {
    const r = this.reciters().find((x) => x.id === this.reciterId());
    return r ? (this.i18n.isRtl() ? r.nameAr : r.nameEn) : '';
  };
  protected readonly bookmarks = signal<Bookmark[]>([]);
  protected readonly playingId = signal<number | null>(null);
  protected readonly surahMode = signal(false);
  protected readonly paused = signal(false);
  protected readonly busyAudio = signal(false);
  protected readonly shareFor = signal<number | null>(null);
  protected readonly shareOpts: ShareOptions = { tafsir: false };
  private readonly shareSvc = inject(ShareAyah);

  protected doShareText(a: Ayah): void {
    const s = this.surah();
    if (!s) return;
    this.shareSvc.shareText(a, s, this.shareOpts);
  }

  protected doShareImage(a: Ayah): void {
    const s = this.surah();
    if (!s) return;
    this.shareSvc.shareImage(a, s, this.shareOpts);
  }

  protected playingNumber(): number {
    const a = this.ayahs().find((x) => x.id === this.playingId());
    return a?.ayahNumber ?? 0;
  }
  protected readonly focusId = signal<number | null>(null);
  protected readonly toAr = toArabicDigits;
  protected readonly detailId = signal<number | null>(null);
  protected readonly detail = signal<EditionAyah[]>([]);
  protected readonly detailError = signal(false);
  protected readonly editions = signal<EditionInfo[]>([]);
  protected readonly tafsirKey = signal(localStorage.getItem('sabeel.tafsir') || 'arabic_moyassar');
  protected readonly translationKey = signal(localStorage.getItem('sabeel.translation') || 'english_rwwad');
  protected readonly tafsirEditions = computed(() => this.editions().filter((e) => e.kind !== 'translation'));
  protected readonly translationEditions = computed(() => this.editions().filter((e) => e.kind === 'translation'));

  constructor() {
    effect(() => {
      const sid = Number(this.id());
      untracked(() => this.load(sid));
    });
  }

  private load(sid: number): void {
    this.stop();
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      surahs: this.api.surahs(),
      ayahs: this.api.surah(sid),
      reciters: this.api.reciters(),
      profile: this.api.profile().pipe(catchError(() => of(null)))
    }).subscribe({
      next: (r) => {
        this.surah.set(r.surahs.find((s) => s.id === sid) ?? null);
        this.ayahs.set(r.ayahs);
        this.reciters.set(mergeReciters(r.reciters));
        const pref = r.profile?.preferredReciterId;
        const saved = Number(localStorage.getItem('sabeel.reciter'));
        this.reciterId.set(saved && this.reciters().some((x) => x.id === saved) ? saved : pref && this.reciters().some((x) => x.id === pref) ? pref : (this.reciters()[0]?.id ?? 1));
        this.loading.set(false);
        localStorage.setItem('sabeel.lastSurah', String(sid));
        this.api.bookmarks().subscribe({ next: (b) => this.bookmarks.set(b), error: () => undefined });
        const byN = Number(this.n());
        const target = byN ? (r.ayahs.find((x) => x.ayahNumber === byN)?.id ?? 0) : Number(this.ayah());
        if (target) {
          this.focusId.set(target);
          setTimeout(() => document.getElementById('a' + target)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
        }
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected bookmarkFor(ayahId: number): Bookmark | undefined {
    return this.bookmarks().find((b) => b.ayahId === ayahId);
  }

  protected toggleDetail(a: Ayah): void {
    if (this.detailId() === a.id) { this.detailId.set(null); return; }
    this.detailId.set(a.id);
    if (!this.editions().length) {
      this.api.editions().subscribe({ next: (e) => this.editions.set(e), error: () => this.detailError.set(true) });
    }
    this.loadDetail(a);
  }

  protected pick(kind: 'tafsir' | 'translation', key: string, a: Ayah): void {
    if (kind === 'tafsir') { this.tafsirKey.set(key); localStorage.setItem('sabeel.tafsir', key); }
    else { this.translationKey.set(key); localStorage.setItem('sabeel.translation', key); }
    this.loadDetail(a);
  }

  private loadDetail(a: Ayah): void {
    this.detailError.set(false);
    forkJoin([
      this.api.editionAyah(this.tafsirKey(), a.surahId, a.ayahNumber),
      this.api.editionAyah(this.translationKey(), a.surahId, a.ayahNumber)
    ]).subscribe({
      next: (r) => { if (this.detailId() === a.id) this.detail.set(r); },
      error: () => this.detailError.set(true)
    });
  }

  protected toggleBookmark(a: Ayah): void {
    const existing = this.bookmarkFor(a.id);
    if (existing) {
      this.api.removeBookmark(existing.id).subscribe({
        next: () => { this.bookmarks.update((l) => l.filter((b) => b.id !== existing.id)); this.toast.ok('Bookmark removed'); },
        error: (e) => this.toast.error(errorMessage(e))
      });
    } else {
      this.api.addBookmark(a.id).subscribe({
        next: (b) => { this.bookmarks.update((l) => [...l, b]); this.toast.ok(this.i18n.t('Bookmarked ayah {n}', { n: a.ayahNumber })); },
        error: (e) => this.toast.error(errorMessage(e))
      });
    }
  }

  protected markRead(a: Ayah): void {
    this.api.saveReadingState(a.id).subscribe({
      next: () => this.toast.ok(this.i18n.t('Saved. You will resume at ayah {n}.', { n: a.ayahNumber })),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected playToggle(a: Ayah): void {
    if (this.playingId() === a.id) this.togglePause();
    else this.playFrom(a);
  }

  protected togglePause(): void {
    const el = this.player()?.nativeElement;
    if (!el || !el.src) return;
    if (el.paused) el.play().catch(() => this.toast.error('Audio could not start.'));
    else el.pause();
  }

  protected onPaused(): void {
    if (this.playingId() !== null || this.surahMode()) this.paused.set(true);
  }

  protected playFrom(a: Ayah | undefined): void {
    if (!a) return;
    this.surahMode.set(false);
    const extra = extraOf(this.reciterId());
    if (extra) {
      this.startAudio(extraAyahUrl(extra, a.surahId, a.ayahNumber), a);
      return;
    }
    this.busyAudio.set(true);
    this.api.ayahAudio(this.reciterId(), a.surahId, a.ayahNumber).subscribe({
      next: (r) => {
        this.busyAudio.set(false);
        this.startAudio(r.audioUrl, a);
      },
      error: (e) => { this.busyAudio.set(false); this.toast.error(errorMessage(e)); }
    });
  }

  private startAudio(url: string, a: Ayah): void {
    const el = this.player()?.nativeElement;
    if (!el) return;
    el.src = url;
    this.playingId.set(a.id);
    this.paused.set(false);
    el.play().catch(() => this.toast.error('The browser blocked audio playback or the audio file is unavailable.'));
    document.getElementById('a' + a.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.api.saveReadingState(a.id).subscribe({ error: () => undefined });
  }

  protected playWholeSurah(): void {
    const s = this.surah();
    if (!s) return;
    if (extraOf(this.reciterId())) {
      this.playFrom(this.ayahs()[0]);
      return;
    }
    this.api.surahAudio(this.reciterId(), s.id).subscribe({
      next: (r) => {
        const el = this.player()?.nativeElement;
        if (!el) return;
        this.playingId.set(null);
        this.surahMode.set(true);
        el.src = r.url;
        el.play().catch(() => this.toast.error('Audio could not start.'));
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected onEnded(): void {
    const current = this.playingId();
    if (current === null) return;
    const list = this.ayahs();
    const idx = list.findIndex((a) => a.id === current);
    if (idx >= 0 && idx + 1 < list.length) this.playFrom(list[idx + 1]);
    else this.stop();
  }

  protected onAudioError(): void {
    if (this.playingId() !== null || this.surahMode()) this.toast.error('Audio unavailable for this selection. The audio CDN is a third-party service.');
  }

  protected reciterOptions(): { id: number; label: string }[] {
    return this.reciters().map((x) => ({ id: x.id, label: this.i18n.isRtl() ? x.nameAr : x.nameEn }));
  }

  protected changeReciter(id: number): void {
    localStorage.setItem('sabeel.reciter', String(id));
    const cur = this.playingId();
    this.reciterId.set(id);
    if (cur !== null && !this.surahMode()) {
      const a = this.ayahs().find((x) => x.id === cur);
      if (a) this.playFrom(a);
    } else this.stop();
  }

  protected switchView(v: 'mushaf' | 'verse'): void {
    localStorage.setItem('sabeel.quranView', v);
    if (v === 'verse') return;
    const f = this.ayahs().find((x) => x.id === (this.focusId() ?? this.playingId()));
    const sid = this.surah()?.id ?? 1;
    this.router.navigate(['/app/mushaf'], { queryParams: { ayah: sid + ':' + (f?.ayahNumber ?? 1) } });
  }

  protected stop(): void {
    const el = this.player()?.nativeElement;
    if (el) { el.pause(); el.removeAttribute('src'); }
    this.playingId.set(null);
    this.surahMode.set(false);
    this.paused.set(false);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
