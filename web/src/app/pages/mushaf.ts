import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Api } from '../core/api';
import { I18n, T } from '../core/i18n';
import { Surah } from '../core/models';
import { PageHead, Spinner } from '../shared/ui';

interface Verse {
  verse_key: string;
  text_uthmani_tajweed: string;
  juz_number?: number;
}

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
  imports: [T, PageHead, Spinner],
  template: `
    <app-head [title]="'Mushaf with tajweed' | t" [subtitle]="'Page-by-page Madani layout with colored tajweed text from the Quran Foundation API (api.quran.com).' | t" />
    <div class="mushaf-nav" style="margin-bottom:14px">
      <button class="btn btn-sm" (click)="go(-1)" [disabled]="page() <= 1">{{ 'Previous page' | t }}</button>
      <label class="jumpto">{{ 'Page' | t }}
        <input type="number" min="1" max="604" [value]="page()" (change)="jump($any($event.target).value)">
      </label>
      <label class="jumpto">{{ 'Surah' | t }}
        <select [value]="0" (change)="jumpSurah($any($event.target).value)">
          <option [value]="0" disabled>{{ 'Jump to surah' | t }}</option>
          @for (s of surahs(); track s.id) { <option [value]="s.id">{{ s.id }}. {{ i18n.isRtl() ? s.nameAr : s.transliteration }}</option> }
        </select>
      </label>
      <button class="btn btn-sm" (click)="go(1)" [disabled]="page() >= 604">{{ 'Next page' | t }}</button>
    </div>

    @if (loading()) { <app-spinner /> } @else if (error()) {
      <div class="error-box">{{ 'Could not load this page online. Connect to the internet once to cache pages for offline reading.' | t }}</div>
    } @else {
      <div class="pagehead muted">
        <span>{{ 'Juz {n}' | t: { n: juz() } }}</span>
        <span>{{ 'Page {n}' | t: { n: page() } }}</span>
      </div>
      <div class="mushaf" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
        @for (v of verses(); track v.verse_key) {
          @if (surahStart(v)) {
            <div class="surah-head">{{ surahName(surahOf(v)) }}</div>
            @if (surahOf(v) !== 1 && surahOf(v) !== 9) { <div class="bismillah" [innerHTML]="bismillah"></div> }
          }
          <span class="vtext" [innerHTML]="html(v)"></span><span class="vnum">&#64831;{{ arNum(ayahOf(v)) }}&#64830;</span>
        }
      </div>
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
  `]
})
export class Mushaf implements OnInit {
  protected readonly i18n = inject(I18n);
  private readonly api = inject(Api);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly page = signal(1);
  protected readonly verses = signal<Verse[]>([]);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly juz = signal(1);
  protected readonly bismillah = colorize(BISMILLAH_TJ, this.sanitizer);
  private touchX = 0;

  ngOnInit(): void {
    const saved = Number(localStorage.getItem('sabeel.mushafPage'));
    if (saved >= 1 && saved <= 604) this.page.set(saved);
    this.api.surahs().subscribe({ next: (s) => this.surahs.set(s), error: () => undefined });
    this.load();
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
    this.jump(this.page() + delta);
  }

  protected jump(p: number | string): void {
    const n = Math.min(604, Math.max(1, Number(p) || 1));
    this.page.set(n);
    try {
      localStorage.setItem('sabeel.mushafPage', String(n));
    } catch {
      return;
    }
    this.load();
  }

  protected jumpSurah(id: string): void {
    const s = this.surahs().find((x) => x.id === Number(id));
    if (s?.startPage) this.jump(s.startPage);
  }

  protected touchStart(e: TouchEvent): void {
    this.touchX = e.changedTouches[0].clientX;
  }

  protected touchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 60) this.go(dx > 0 ? 1 : -1);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    fetch(`https://api.quran.com/api/v4/verses/by_page/${this.page()}?language=en&fields=text_uthmani_tajweed&per_page=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        this.verses.set(d.verses ?? []);
        this.juz.set(d.verses?.[0]?.juz_number ?? 1);
        this.loading.set(false);
      })
      .catch(() => {
        this.verses.set([]);
        this.loading.set(false);
        this.error.set(true);
      });
  }
}
