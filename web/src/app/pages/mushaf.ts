import { Component, ElementRef, OnDestroy, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Api } from '../core/api';
import { I18n, T } from '../core/i18n';
import { Ayah, EditionAyah, EditionInfo, Surah } from '../core/models';
import { extraAyahUrl, extraOf, mergeReciters } from '../core/extra-reciters';
import { ShareAyah } from '../core/share-ayah';
import { Toast } from '../core/toast';
import { PageHead, Spinner } from '../shared/ui';
import { DockPlayer } from '../shared/dock-player';
import { analyzeTajweed } from '../core/data/tajweed-rules';

interface Verse {
  verse_key: string;
  text_uthmani_tajweed: string;
  juz_number?: number;
}

const JUZ_PAGES = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
const CACHE_KEY = 'sabeel.mushafCache';
const CACHE_MAX = 40;

const BISMILLAH_TJ = '<tajweed class=ham_wasl>بِسْمِ</tajweed> <tajweed class=ham_wasl>اللَّهِ</tajweed> <tajweed class=madda_normal>الرَّحْمَٰنِ</tajweed> <tajweed class=madda_normal>الرَّحِيمِ</tajweed>';

function colorize(t: string, sanitizer: DomSanitizer): SafeHtml {
  const html = t
    .replace(/<tajweed class="?([\w]+)"?>/g, '<span class="tj-$1">')
    .replace(/<\/tajweed>/g, '</span>')
    .replace(/<span class="end">/g, '<span class="tj-end">');
  return sanitizer.bypassSecurityTrustHtml(html);
}

@Component({
  selector: 'app-mushaf',
  imports: [T, PageHead, Spinner, RouterLink, DockPlayer],
  template: `
    <app-head [title]="'Mushaf with tajweed' | t" [subtitle]="'Page-by-page Madani layout with colored tajweed text from the Quran Foundation API (api.quran.com).' | t" />
    <div class="mushaf-nav" style="margin-bottom:14px">
      <button class="btn btn-sm" (click)="go(-1)" [disabled]="page$() <= 1">{{ 'Previous page' | t }}</button>
      <label class="jumpto">{{ 'Page' | t }}
        <input type="number" min="1" max="604" [value]="page$()" (change)="jump($any($event.target).value)">
      </label>
      <label class="jumpto">{{ 'Surah' | t }}
        <select [value]="0" (change)="jumpSurah($any($event.target).value)">
          <option [value]="0" disabled>{{ 'Jump to surah' | t }}</option>
          @for (s of surahs(); track s.id) { <option [value]="s.id">{{ s.id }}. {{ i18n.isRtl() ? s.nameAr : s.transliteration }}</option> }
        </select>
      </label>
      <label class="jumpto">{{ 'Juz' | t }}
        <select [value]="juz()" (change)="jumpJuz($any($event.target).value)">
          @for (j of juzList; track j) { <option [value]="j" [selected]="j === juz()">{{ j }}</option> }
        </select>
      </label>
      <button class="btn btn-sm" (click)="go(1)" [disabled]="page$() >= 604">{{ 'Next page' | t }}</button>
    </div>

    @if (loading()) { <app-spinner /> } @else if (error()) {
      <div class="error-box">{{ 'Could not load this page online. Connect to the internet once to cache pages for offline reading.' | t }}</div>
    } @else {
      @if (fromCache()) { <p class="muted small">{{ 'Showing the saved copy of this page.' | t }}</p> }
      <div class="pagehead muted">
        <span>{{ 'Juz {n}' | t: { n: juz() } }}</span>
        <span>{{ 'Page {n}' | t: { n: page$() } }}</span>
      </div>
      <div class="mushaf" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
        @for (v of verses(); track v.verse_key) {
          @if (surahStart(v)) {
            <div class="surah-head">{{ surahName(surahOf(v)) }}</div>
            @if (surahOf(v) !== 1 && surahOf(v) !== 9) { <div class="bismillah" [innerHTML]="bismillah"></div> }
          }
          <span class="vtext" [class.sel]="sel() === v.verse_key" [class.playing]="playingKey() === v.verse_key" [attr.data-key]="v.verse_key" (click)="select(v)" [innerHTML]="html(v)"></span><span class="vnum">&#64831;{{ arNum(ayahOf(v)) }}&#64830;</span>
        }
      </div>
      @if (sel(); as k) {
        <div class="sheet" role="dialog">
          <div class="sheet-head">
            <strong>{{ surahName(selSurah()) }} {{ k }}</strong>
            <button class="btn btn-sm btn-ghost" (click)="closeSheet()">{{ 'Close' | t }}</button>
          </div>
          <div class="sheet-actions">
            <button class="btn btn-sm btn-gold" (click)="playSel()">{{ (playingKey() === k ? 'Stop' : 'Play') | t }}</button>
            <button class="btn btn-sm" [class.on]="panel() === 'tafsir'" (click)="openPanel('tafsir')">{{ 'Tafsir' | t }}</button>
            <button class="btn btn-sm" [class.on]="panel() === 'tajweed'" (click)="openPanel('tajweed')">{{ 'Tajweed rules' | t }}</button>
            <button class="btn btn-sm" [class.on]="panel() === 'translation'" (click)="openPanel('translation')">{{ 'Translation' | t }}</button>
            <button class="btn btn-sm" (click)="shareText()">{{ 'Share as text' | t }}</button>
            <button class="btn btn-sm" (click)="shareImage()">{{ 'Share as image' | t }}</button>
            <a class="btn btn-sm btn-ghost" [routerLink]="['/app/quran', selSurah()]" [queryParams]="{ view: 'verse' }">{{ 'Verse view' | t }}</a>
          </div>
          @if (panel() === 'tajweed') {
            <div class="tj-panel" data-testid="tajweed-rules">
              @for (h of tajweedHits(); track h.rule.key) {
                <div class="tj-rule"><strong [style.color]="h.rule.color">{{ i18n.isRtl() ? h.rule.ar : h.rule.en }}</strong> <span class="ar tj-words">{{ h.words.join(' ، ') }}</span><div class="muted small">{{ i18n.isRtl() ? h.rule.descAr : h.rule.descEn }}</div></div>
              } @empty { <p class="muted">{{ 'No tajweed marks in this ayah.' | t }}</p> }
            </div>
          } @else if (panel(); as pn) {
            <label class="field">{{ (pn === 'tafsir' ? 'Tafsir' : 'Translation') | t }}
              <select (change)="pickEdition(pn === 'tafsir' ? 'tafsir' : 'translation', $any($event.target).value)">
                @for (e of (pn === 'tafsir' ? tafsirEditions() : translationEditions()); track e.key) { <option [value]="e.key" [selected]="e.key === (pn === 'tafsir' ? tafsirKey() : translationKey())">{{ e.title }} ({{ e.version }})</option> }
              </select>
            </label>
            @if (detail(); as d) {
              <div class="ed-title" dir="auto">{{ d.edition.title }} · {{ 'Version' | t }} {{ d.edition.version }} · QuranEnc.com</div>
              @for (en of d.entries; track en.fromAyah) {
                <p class="ed-text" [attr.dir]="d.edition.language === 'ar' ? 'rtl' : 'ltr'">{{ en.text }}</p>
              } @empty { <p class="muted">{{ 'No text for this ayah in this edition.' | t }}</p> }
            }
            @if (detailError()) { <div class="error-box">{{ 'Could not load the tafsir.' | t }}</div> }
          }
        </div>
      }
      <audio #player (ended)="onEnded()" (error)="onAudioError()" (play)="paused.set(false)" (pause)="onPaused()"></audio>
      @if (playingKey(); as pk) {
        <app-dock-player testid="mushaf-playbar" [audio]="audioEl()" [title]="surahName(Number(pk.split(':')[0])) + ' ' + pk" [subtitle]="reciterName()" [paused]="paused()" (toggle)="togglePause()" (stop)="stopAudio()" />
      }
      @if (!i18n.isRtl()) {
        <p class="muted small legend">
          <span class="tj-madda_normal">Madd</span> · <span class="tj-ghunnah">Ghunnah</span> · <span class="tj-qalqalah">Qalqalah</span> · <span class="tj-ikhfa">Ikhfa</span> · <span class="tj-ham_wasl">Hamzat wasl</span>
        </p>
      }
    }
  `,
  styles: [`
    .mushaf-nav { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .jumpto { display: flex; gap: 6px; align-items: center; color: var(--muted); }
    .jumpto input, .jumpto select { width: 90px; padding: 6px 8px; border-radius: 8px; background: var(--panel); color: var(--text); border: 1px solid var(--border); }
    .jumpto select { width: auto; }
    .pagehead { display: flex; justify-content: space-between; padding: 0 6px 8px; }
    .mushaf { background: #fdf6e3; color: #1a1408; border-radius: 14px; padding: 22px 26px; direction: rtl; text-align: justify; font-family: Amiri, serif; font-size: 1.9rem; line-height: 2.4; user-select: none; }
    .surah-head { text-align: center; color: #0d5c46; font-weight: 700; border: 2px solid #0d5c46; border-radius: 12px; margin: 10px 0 6px; padding: 4px; font-size: 1.5rem; }
    .bismillah { text-align: center; color: #0d5c46; margin-bottom: 6px; }
    .vnum { color: #b8860b; font-size: 1.1rem; }
    .legend { margin-top: 10px; display: flex; gap: 14px; flex-wrap: wrap; }
    :host ::ng-deep .tj-madda_normal, :host ::ng-deep .tj-madda_permissible, :host ::ng-deep .tj-madda_allowed, :host ::ng-deep .tj-madda_necessary { color: #e07b00; }
    :host ::ng-deep .tj-madda_obligatory, :host ::ng-deep .tj-madda_lazim { color: #d40000; }
    :host ::ng-deep .tj-ghunnah, :host ::ng-deep .tj-idgham_ghunnah, :host ::ng-deep .tj-idgham_wo_ghunnah { color: #0d8a3f; }
    :host ::ng-deep .tj-qalqalah { color: #1d4ed8; }
    :host ::ng-deep .tj-ikhfa, :host ::ng-deep .tj-ikhfa_shafawi, :host ::ng-deep .tj-iqlab { color: #7c3aed; }
    :host ::ng-deep .tj-ham_wasl { color: #6b7280; }
    :host ::ng-deep .tj-tafkheem { color: #b91c1c; font-weight: 700; }
    :host ::ng-deep .tj-end { color: #b8860b; }
    .small { font-size: 0.85rem; }
    .vtext { cursor: pointer; border-radius: 6px; }
    .vtext.sel { background: rgba(184, 134, 11, 0.25); }
    .vtext.playing { background: rgba(13, 138, 63, 0.22); }
    .sheet { position: sticky; bottom: 12px; z-index: 30; margin-top: 14px; background: linear-gradient(var(--panel), var(--panel)), var(--bg); border: 1px solid var(--gold); border-radius: 14px; padding: 12px 14px; max-height: 55vh; overflow: auto; }
    .sheet { bottom: 84px; }
    .sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: var(--gold); }
    .sheet-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .sheet-actions .on { outline: 2px solid var(--gold); }
    .ed-title { font-size: 0.78rem; color: var(--gold); margin-top: 8px; }
    .tj-rule { margin: 6px 0; }
    .tj-words { margin-inline-start: 8px; font-size: 1.2rem; }
    .ed-text { line-height: 1.9; white-space: pre-wrap; margin: 6px 0; }
  `]
})
export class Mushaf implements OnInit, OnDestroy {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly shareSvc = inject(ShareAyah);
  private readonly toast = inject(Toast);
  readonly page = input<string>();
  readonly ayah = input<string>();
  private readonly cur = signal(1);
  private readonly player = viewChild<ElementRef<HTMLAudioElement>>('player');
  protected readonly verses = signal<Verse[]>([]);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly fromCache = signal(false);
  protected readonly juz = signal(1);
  protected readonly bismillah = colorize(BISMILLAH_TJ, this.sanitizer);
  protected readonly juzList = Array.from({ length: 30 }, (_, i) => i + 1);
  protected readonly sel = signal<string | null>(null);
  protected readonly playingKey = signal<string | null>(null);
  protected readonly panel = signal<'tafsir' | 'translation' | 'tajweed' | null>(null);
  protected readonly editions = signal<EditionInfo[]>([]);
  protected readonly detail = signal<EditionAyah | null>(null);
  protected readonly detailError = signal(false);
  protected readonly tafsirKey = signal(localStorage.getItem('sabeel.tafsir') || 'arabic_moyassar');
  protected readonly translationKey = signal(localStorage.getItem('sabeel.translation') || 'english_rwwad');
  private reciterId = 0;
  private touchX = 0;

  protected page$ = this.cur;

  protected tajweedHits = () => {
    const k = this.sel();
    const v = this.verses().find((x) => x.verse_key === k);
    return v ? analyzeTajweed(v.text_uthmani_tajweed) : [];
  };

  protected tafsirEditions = () => this.editions().filter((e) => e.kind !== 'translation');
  protected translationEditions = () => this.editions().filter((e) => e.kind === 'translation');

  ngOnInit(): void {
    const fromUrl = Number(this.page());
    const saved = Number(localStorage.getItem('sabeel.mushafPage'));
    if (fromUrl >= 1 && fromUrl <= 604) this.cur.set(fromUrl);
    else if (saved >= 1 && saved <= 604) this.cur.set(saved);
    this.api.surahs().subscribe({ next: (s) => this.surahs.set(s), error: () => undefined });
    const key = this.ayah();
    if (key && /^\d+:\d+$/.test(key)) {
      this.pendingKey = key;
      fetch(`https://api.quran.com/api/v4/verses/by_key/${key}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => {
          const pg = Number(d?.verse?.page_number);
          if (pg >= 1 && pg <= 604) { this.cur.set(pg); localStorage.setItem('sabeel.mushafPage', String(pg)); }
          this.load();
        })
        .catch(() => this.load());
      return;
    }
    this.load();
  }

  private pendingKey: string | null = null;

  ngOnDestroy(): void {
    this.stopAudio();
  }

  protected surahOf(v: Verse): number {
    return Number(v.verse_key.split(':')[0]);
  }

  protected ayahOf(v: Verse): number {
    return Number(v.verse_key.split(':')[1]);
  }

  protected surahStart(v: Verse): boolean {
    return this.ayahOf(v) === 1;
  }

  protected ayahNo(): number {
    return Number((this.sel() ?? '1:1').split(':')[1]);
  }

  protected selSurah(): number {
    return Number((this.sel() ?? '1:1').split(':')[0]);
  }

  protected surahName(id: number): string {
    const s = this.surahs().find((x) => x.id === id);
    return s ? (this.i18n.isRtl() ? s.nameAr : s.transliteration) : String(id);
  }

  protected html(v: Verse): SafeHtml {
    return colorize(v.text_uthmani_tajweed, this.sanitizer);
  }

  protected arNum(n: number): string {
    return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  }

  protected go(delta: number): void {
    this.jump(this.cur() + delta);
  }

  protected jump(p: number | string): void {
    const n = Math.min(604, Math.max(1, Number(p) || 1));
    this.cur.set(n);
    try {
      localStorage.setItem('sabeel.mushafPage', String(n));
    } catch {
      this.closeSheet();
    }
    this.closeSheet();
    this.load();
  }

  protected jumpSurah(id: string): void {
    const s = this.surahs().find((x) => x.id === Number(id));
    if (s?.startPage) this.jump(s.startPage);
  }

  protected jumpJuz(j: string): void {
    const p = JUZ_PAGES[Number(j) - 1];
    if (p) this.jump(p);
  }

  protected touchStart(e: TouchEvent): void {
    this.touchX = e.changedTouches[0].clientX;
  }

  protected touchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 60) this.go(dx > 0 ? 1 : -1);
  }

  protected select(v: Verse): void {
    this.sel.set(this.sel() === v.verse_key ? null : v.verse_key);
    this.panel.set(null);
    this.detail.set(null);
  }

  protected closeSheet(): void {
    this.sel.set(null);
    this.panel.set(null);
    this.detail.set(null);
    this.stopAudio();
  }

  protected openPanel(p: 'tafsir' | 'translation' | 'tajweed'): void {
    if (this.panel() === p) { this.panel.set(null); return; }
    this.panel.set(p);
    if (p === 'tajweed') return;
    if (!this.editions().length) {
      this.api.editions().subscribe({ next: (e) => this.editions.set(e), error: () => this.detailError.set(true) });
    }
    this.loadDetail();
  }

  protected pickEdition(kind: 'tafsir' | 'translation', key: string): void {
    if (kind === 'tafsir') { this.tafsirKey.set(key); localStorage.setItem('sabeel.tafsir', key); }
    else { this.translationKey.set(key); localStorage.setItem('sabeel.translation', key); }
    this.loadDetail();
  }

  private loadDetail(): void {
    const k = this.sel();
    const p = this.panel();
    if (!k || !p || p === 'tajweed') return;
    const [s, a] = k.split(':').map(Number);
    this.detailError.set(false);
    this.detail.set(null);
    this.api.editionAyah(p === 'tafsir' ? this.tafsirKey() : this.translationKey(), s, a).subscribe({
      next: (d) => { if (this.sel() === k && this.panel() === p) this.detail.set(d); },
      error: () => this.detailError.set(true)
    });
  }

  protected playSel(): void {
    const k = this.sel();
    if (!k) return;
    if (this.playingKey() === k) { this.stopAudio(); return; }
    this.playKey(k);
  }

  private playKey(k: string): void {
    const [s, a] = k.split(':').map(Number);
    const start = (url: string) => {
      const el = this.player()?.nativeElement;
      if (!el) return;
      el.src = url;
      this.playingKey.set(k);
      el.play().catch(() => { this.playingKey.set(null); this.toast.error('The browser blocked audio playback or the audio file is unavailable.'); });
    };
    const resolve = (rid: number) => {
      const extra = extraOf(rid);
      if (extra) { start(extraAyahUrl(extra, s, a)); return; }
      this.api.ayahAudio(rid, s, a).subscribe({ next: (r) => start(r.audioUrl), error: () => this.toast.error('Audio unavailable for this selection. The audio CDN is a third-party service.') });
    };
    if (this.reciterId) { resolve(this.reciterId); return; }
    forkJoin({ r: this.api.reciters(), p: this.api.profile().pipe(catchError(() => of(null))) }).subscribe({
      next: ({ r, p }) => {
        const list = mergeReciters(r);
        const pref = p?.preferredReciterId;
        this.reciterId = pref && list.some((x) => x.id === pref) ? pref : (list[0]?.id ?? 1);
        const rr = list.find((x) => x.id === this.reciterId);
        this.reciterName.set(rr ? (this.i18n.isRtl() ? rr.nameAr : rr.nameEn) : '');
        resolve(this.reciterId);
      },
      error: () => this.toast.error('Audio unavailable for this selection. The audio CDN is a third-party service.')
    });
  }

  protected onEnded(): void {
    const cur = this.playingKey();
    const list = this.verses();
    const i = list.findIndex((v) => v.verse_key === cur);
    if (i >= 0 && i + 1 < list.length) {
      const next = list[i + 1].verse_key;
      this.sel.set(next);
      this.playKey(next);
    } else this.stopAudio();
  }

  protected onAudioError(): void {
    if (this.playingKey() !== null) {
      this.toast.error('Audio unavailable for this selection. The audio CDN is a third-party service.');
      this.playingKey.set(null);
    }
  }

  protected readonly paused = signal(false);
  protected readonly reciterName = signal('');
  protected audioEl = () => this.player()?.nativeElement ?? null;
  protected readonly Number = Number;

  protected togglePause(): void {
    const el = this.player()?.nativeElement;
    if (!el) return;
    if (el.paused) el.play().catch(() => this.toast.error('Audio could not start.'));
    else el.pause();
  }

  protected onPaused(): void {
    if (this.playingKey() !== null) this.paused.set(true);
  }

  protected stopAudio(): void {
    this.paused.set(false);
    const el = this.player()?.nativeElement;
    if (el) { el.pause(); el.removeAttribute('src'); }
    this.playingKey.set(null);
  }

  private withAyah(fn: (a: Ayah, s: Surah) => void): void {
    const k = this.sel();
    if (!k) return;
    const [sid, n] = k.split(':').map(Number);
    const s = this.surahs().find((x) => x.id === sid);
    if (!s) return;
    this.api.ayah(sid, n).subscribe({ next: (a) => fn(a, s), error: () => this.toast.error('Could not load this ayah.') });
  }

  protected shareText(): void {
    this.withAyah((a, s) => this.shareSvc.shareText(a, s, { tafsir: false }));
  }

  protected shareImage(): void {
    this.withAyah((a, s) => this.shareSvc.shareImage(a, s, { tafsir: false }));
  }

  private readCache(): Record<string, { verses: Verse[] }> {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private writeCache(p: number, verses: Verse[]): void {
    const c = this.readCache();
    delete c[p];
    c[p] = { verses };
    const keys = Object.keys(c);
    while (keys.length > CACHE_MAX) delete c[keys.shift() as string];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  private fetchPage(p: number): Promise<Verse[]> {
    return fetch(`https://api.quran.com/api/v4/verses/by_page/${p}?language=en&fields=text_uthmani_tajweed&per_page=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const v: Verse[] = (d.verses ?? []).map((x: Verse) => ({ verse_key: x.verse_key, text_uthmani_tajweed: x.text_uthmani_tajweed, juz_number: x.juz_number }));
        this.writeCache(p, v);
        return v;
      });
  }

  private show(v: Verse[], cached: boolean): void {
    this.verses.set(v);
    this.juz.set(v[0]?.juz_number ?? 1);
    this.fromCache.set(cached);
    this.loading.set(false);
    if (this.pendingKey) {
      const k = this.pendingKey;
      this.pendingKey = null;
      if (v.some((x) => x.verse_key === k)) {
        this.sel.set(k);
        setTimeout(() => document.querySelector(`[data-key="${k}"]`)?.scrollIntoView({ block: 'center' }), 50);
      }
    }
  }

  private load(): void {
    const p = this.cur();
    this.loading.set(true);
    this.error.set(false);
    this.fetchPage(p)
      .then((v) => {
        if (this.cur() !== p) return;
        this.show(v, false);
        if (p < 604 && !this.readCache()[p + 1]) this.fetchPage(p + 1).catch(() => undefined);
      })
      .catch(() => {
        if (this.cur() !== p) return;
        const hit = this.readCache()[p];
        if (hit) { this.show(hit.verses, true); return; }
        this.verses.set([]);
        this.loading.set(false);
        this.error.set(true);
      });
  }
}
