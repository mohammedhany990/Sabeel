import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Api } from '../core/api';
import { I18n, T } from '../core/i18n';
import { pickDailyAyah } from '../core/daily-ayah';
import { Ayah, EditionAyah, Surah } from '../core/models';
import { ShareAyah } from '../core/share-ayah';
import { toArabicDigits } from '../core/util';

@Component({
  selector: 'app-daily-ayah',
  imports: [T, RouterLink],
  template: `
    <div class="card gilded daily" data-testid="daily-ayah">
      <div class="card-title"><h3>{{ 'Ayah of the day' | t }}</h3><span class="badge">{{ surahId() }}:{{ ayahNumber() }}</span></div>
      <div class="ar txt">{{ text() }} <span class="end">&#64831;{{ toAr(ayahNumber()) }}&#64830;</span></div>
      <div class="block" data-testid="daily-meaning">
        <div class="lbl">{{ 'Meaning' | t }}</div>
        @if (meaning(); as m) { <p class="body" [attr.dir]="m.dir">{{ m.text }}</p> }
        @else { <p class="muted">{{ 'Loading' | t }}</p> }
      </div>
      <div class="block" data-testid="daily-tafsir">
        <div class="lbl">{{ 'Tafsir' | t }}</div>
        @if (tafsir(); as m) { <p class="body" [attr.dir]="m.dir">{{ m.text }}</p> }
        @else { <p class="muted">{{ 'Loading' | t }}</p> }
      </div>
      <div class="row-actions">
        <a class="btn btn-sm btn-gold" routerLink="/app/mushaf" [queryParams]="{ ayah: surahId() + ':' + ayahNumber() }">{{ 'Open in the mushaf' | t }}</a>
        <button class="btn btn-sm" (click)="share('text')">{{ 'Share as text' | t }}</button>
        <button class="btn btn-sm" (click)="share('image')">{{ 'Share as image' | t }}</button>
      </div>
    </div>
  `,
  styles: [`
    .daily { display: grid; gap: 14px; margin-bottom: 18px; animation: rise 0.5s ease both; }
    .txt { font-size: clamp(1.5rem, 3vw, 2.2rem); line-height: 2.2; text-align: right; }
    .block { border-top: 1px solid var(--border); padding-top: 10px; }
    .lbl { color: var(--gold); font-weight: 700; margin-bottom: 4px; }
    .body { line-height: 1.9; margin: 0; white-space: pre-wrap; }
    .row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .daily { animation: none; } }
  `]
})
export class DailyAyahCard implements OnInit {
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);
  private readonly shareSvc = inject(ShareAyah);
  private readonly fallback = pickDailyAyah();
  protected readonly surahId = signal(this.fallback.surahId);
  protected readonly ayahNumber = signal(this.fallback.ayahNumber);
  protected readonly text = signal(this.fallback.text);
  protected readonly meaning = signal<{ text: string; source: string; dir: string } | null>(null);
  protected readonly tafsir = signal<{ text: string; source: string; dir: string } | null>(null);
  private ayah: Ayah | null = null;
  private surahs: Surah[] = [];

  ngOnInit(): void {
    this.api.surahs().pipe(catchError(() => of([] as Surah[]))).subscribe((s) => (this.surahs = s));
    this.api.dailyAyah().subscribe({
      next: (d) => {
        this.ayah = d.ayah;
        this.surahId.set(d.ayah.surahId);
        this.ayahNumber.set(d.ayah.ayahNumber);
        this.text.set(d.ayah.textUthmani);
        this.loadEditions();
      },
      error: () => {
        this.api.ayah(this.fallback.surahId, this.fallback.ayahNumber).pipe(catchError(() => of(null))).subscribe((a) => {
          if (a) { this.ayah = a; if (a.textUthmani) this.text.set(a.textUthmani); }
        });
        this.loadEditions();
      }
    });
  }

  private loadEditions(): void {
    const s = this.surahId();
    const a = this.ayahNumber();
    const tKey = localStorage.getItem('sabeel.tafsir') || 'arabic_moyassar';
    const mKey = localStorage.getItem('sabeel.translation') || 'english_rwwad';
    this.api.editionAyah(mKey, s, a).pipe(catchError(() => of(null))).subscribe((d) => {
      this.meaning.set(this.fromEdition(d) ?? { text: this.i18n.isRtl() ? this.fallback.tafsirAr : this.fallback.tafsirEn, source: 'Sabeel', dir: this.i18n.isRtl() ? 'rtl' : 'ltr' });
    });
    this.api.editionAyah(tKey, s, a).pipe(catchError(() => of(null))).subscribe((d) => {
      this.tafsir.set(this.fromEdition(d) ?? { text: this.i18n.isRtl() ? this.fallback.tafsirAr : this.fallback.tafsirEn, source: 'Sabeel', dir: this.i18n.isRtl() ? 'rtl' : 'ltr' });
    });
  }

  private fromEdition(d: EditionAyah | null): { text: string; source: string; dir: string } | null {
    if (!d || !d.entries?.length) return null;
    return { text: d.entries.map((e) => e.text).join('\n'), source: `${d.edition.title} · QuranEnc.com`, dir: d.edition.language === 'ar' ? 'rtl' : 'ltr' };
  }

  protected share(kind: 'text' | 'image'): void {
    const s = this.surahs.find((x) => x.id === this.surahId()) ?? ({ id: this.surahId(), nameAr: '', nameEn: 'Surah ' + this.surahId(), transliteration: 'Surah ' + this.surahId(), ayahCount: 0 } as Surah);
    const a = this.ayah ?? { id: 0, surahId: this.surahId(), ayahNumber: this.ayahNumber(), textUthmani: this.text(), textSimple: '', page: null, juz: null, hizb: null };
    const tafsir = this.tafsir()?.text;
    if (kind === 'text') this.shareSvc.shareText(a, s, { tafsir: true }, tafsir);
    else this.shareSvc.shareImage(a, s, { tafsir: true }, tafsir);
  }

  protected toAr(n: number): string {
    return toArabicDigits(n);
  }
}
