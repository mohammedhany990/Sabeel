import { I18n, Loc, Nm, T } from '../core/i18n';
import { Component, ElementRef, OnDestroy, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { Ayah, Bookmark, Reciter, Surah } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage, toArabicDigits } from '../core/util';
import { Spinner } from '../shared/ui';

@Component({
  selector: 'app-quran-reader',
  imports: [T, Loc, Nm, FormsModule, RouterLink, Spinner],
  template: `
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
          <select [ngModel]="reciterId()" (ngModelChange)="reciterId.set(+$event); stop()" name="reciter">
            @for (r of reciters(); track r.id) { <option [value]="r.id">{{ r | nm: 'sub' }} ({{ r | loc: 'style' }})</option> }
          </select>
        </label>
        <button class="btn btn-gold" (click)="playFrom(ayahs()[0])" [disabled]="busyAudio()">{{ 'Play from start' | t }}</button>
        <button class="btn" (click)="playWholeSurah()">{{ 'Play full surah' | t }}</button>
        @if (playingId() !== null || surahMode()) { <button class="btn btn-ghost" (click)="stop()">{{ 'Stop' | t }}</button> }
      </div>

      <audio #player (ended)="onEnded()" (error)="onAudioError()" controls style="width:100%;margin:14px 0" [class.hidden]="playingId() === null && !surahMode()"></audio>

      @if (s.id !== 1 && s.id !== 9) { <div class="ar bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div> }

      <div class="card text">
        @for (a of ayahs(); track a.id) {
          <div class="ayah" [id]="'a' + a.id" [class.playing]="playingId() === a.id" [class.target]="focusId() === a.id">
            <div class="tools">
              <span class="no">{{ a.ayahNumber }}</span>
              <button class="btn btn-sm btn-ghost" (click)="playFrom(a)" [title]="'Play from this ayah' | t">{{ 'Play' | t }}</button>
              <button class="btn btn-sm btn-ghost" (click)="toggleBookmark(a)">{{ (bookmarkFor(a.id) ? 'Bookmarked' : 'Bookmark') | t }}</button>
              <button class="btn btn-sm btn-ghost" (click)="markRead(a)">{{ 'Stopped here' | t }}</button>
            </div>
            <div class="ar line">{{ a.textUthmani }} <span class="end">&#64831;{{ toAr(a.ayahNumber) }}&#64830;</span></div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
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
    .tools { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; opacity: 0.55; transition: opacity 0.2s; }
    .ayah:hover .tools, .ayah.playing .tools { opacity: 1; }
    .no { min-width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--line); color: var(--gold); font-weight: 600; font-size: 0.82rem; }
    .line { font-size: clamp(1.7rem, 3.4vw, 2.5rem); line-height: 2.3; text-align: right; }
    .end { color: var(--gold); font-size: 0.7em; }
  `]
})
export class QuranReader implements OnDestroy {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  private readonly toast = inject(Toast);
  readonly id = input.required<string>();
  readonly ayah = input<string>();
  private readonly player = viewChild<ElementRef<HTMLAudioElement>>('player');

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly surah = signal<Surah | null>(null);
  protected readonly ayahs = signal<Ayah[]>([]);
  protected readonly reciters = signal<Reciter[]>([]);
  protected readonly reciterId = signal(1);
  protected readonly bookmarks = signal<Bookmark[]>([]);
  protected readonly playingId = signal<number | null>(null);
  protected readonly surahMode = signal(false);
  protected readonly busyAudio = signal(false);
  protected readonly focusId = signal<number | null>(null);
  protected readonly toAr = toArabicDigits;

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
      profile: this.api.profile()
    }).subscribe({
      next: (r) => {
        this.surah.set(r.surahs.find((s) => s.id === sid) ?? null);
        this.ayahs.set(r.ayahs);
        this.reciters.set(r.reciters);
        const pref = r.profile.preferredReciterId;
        this.reciterId.set(pref && r.reciters.some((x) => x.id === pref) ? pref : (r.reciters[0]?.id ?? 1));
        this.loading.set(false);
        localStorage.setItem('sabeel.lastSurah', String(sid));
        this.api.bookmarks().subscribe({ next: (b) => this.bookmarks.set(b), error: () => undefined });
        const target = Number(this.ayah());
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

  protected playFrom(a: Ayah | undefined): void {
    if (!a) return;
    this.surahMode.set(false);
    this.busyAudio.set(true);
    this.api.ayahAudio(this.reciterId(), a.surahId, a.ayahNumber).subscribe({
      next: (r) => {
        this.busyAudio.set(false);
        const el = this.player()?.nativeElement;
        if (!el) return;
        el.src = r.audioUrl;
        this.playingId.set(a.id);
        el.play().catch(() => this.toast.error('The browser blocked audio playback or the audio file is unavailable.'));
        document.getElementById('a' + a.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.api.saveReadingState(a.id).subscribe({ error: () => undefined });
      },
      error: (e) => { this.busyAudio.set(false); this.toast.error(errorMessage(e)); }
    });
  }

  protected playWholeSurah(): void {
    const s = this.surah();
    if (!s) return;
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

  protected stop(): void {
    const el = this.player()?.nativeElement;
    if (el) { el.pause(); el.removeAttribute('src'); }
    this.playingId.set(null);
    this.surahMode.set(false);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
