import { I18n, Loc, Nm, T } from '../core/i18n';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { Ayah, Paged, Surah } from '../core/models';
import { errorMessage, toArabicDigits } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';
import { KhatmaCard } from './khatma';
import { TafsirSearch } from './tafsir-search';

@Component({
  selector: 'app-quran-index',
  imports: [T, Loc, Nm, FormsModule, RouterLink, PageHead, Spinner, KhatmaCard, TafsirSearch],
  template: `
    <app-head [title]="'The Noble Quran' | t" [subtitle]="'Read, search and listen to every surah.' | t" />
    <div class="card" style="margin-bottom:18px">
      <form class="row" (ngSubmit)="runSearch(0)">
        <input class="grow" name="q" [(ngModel)]="query" [placeholder]="'Search the Quran by word or phrase' | t" style="min-width:220px">
        <button class="btn btn-gold" type="submit">{{ 'Search' | t }}</button>
        @if (results()) { <button class="btn btn-ghost" type="button" (click)="clearSearch()">{{ 'Clear' | t }}</button> }
      </form>
    </div>

    <app-tafsir-search />
    <app-khatma />

    @if (error()) { <div class="error-box">{{ error() | t }}</div> }

    @if (results(); as r) {
      <div class="card">
        <div class="card-title"><h3>{{ (r.totalElements === 1 ? '{n} result' : '{n} results') | t: { n: r.totalElements } }}</h3></div>
        @if (searching()) { <app-spinner /> }
        <div class="list">
          @for (a of r.content; track a.id) {
            <a class="item" [routerLink]="['/app/quran', a.surahId]" [queryParams]="{ ayah: a.id }">
              <div class="ar grow" style="font-size:1.6rem;line-height:2">{{ a.textUthmani }}</div>
              <span class="badge">{{ surahName(a.surahId) }} {{ a.surahId }}:{{ a.ayahNumber }}</span>
            </a>
          } @empty { <div class="empty">{{ 'No ayah matches your search.' | t }}</div> }
        </div>
        @if (r.totalPages > 1) {
          <div class="row between" style="margin-top:16px">
            <button class="btn btn-sm" [disabled]="r.page === 0" (click)="runSearch(r.page - 1)">{{ 'Previous' | t }}</button>
            <span class="muted">{{ 'Page {a} of {b}' | t: { a: r.page + 1, b: r.totalPages } }}</span>
            <button class="btn btn-sm" [disabled]="r.page + 1 >= r.totalPages" (click)="runSearch(r.page + 1)">{{ 'Next' | t }}</button>
          </div>
        }
      </div>
    } @else {
      @if (loading()) { <app-spinner /> } @else {
        <div class="row" style="margin-bottom:14px">
          <div class="tabs">
            <button class="tab" [class.active]="filter() === 'all'" (click)="filter.set('all')">{{ 'All' | t }}</button>
            <button class="tab" [class.active]="filter() === 'Meccan'" (click)="filter.set('Meccan')">{{ 'Meccan' | t }}</button>
            <button class="tab" [class.active]="filter() === 'Medinan'" (click)="filter.set('Medinan')">{{ 'Medinan' | t }}</button>
          </div>
          <span class="muted">{{ '{n} surahs' | t: { n: visible().length } }}</span>
        </div>
        <div class="grid grid-3">
          @for (s of visible(); track s.id) {
            <a class="card surah" [routerLink]="s.startPage ? ['/app/mushaf'] : ['/app/quran', s.id]" [queryParams]="s.startPage ? { page: s.startPage } : null">
              <div class="no">{{ s.id }}</div>
              <div class="grow">
                <div class="en">{{ s | nm }}</div>
                <div class="muted small">@if (s | nm: 'sub') { {{ s | nm: 'sub' }} · } {{ s | loc: 'revelationType' }} · {{ '{n} ayahs' | t: { n: s.ayahCount } }}</div>
              </div>
              <div class="ar name">{{ s.nameAr }}</div>
            </a>
          }
        </div>
      }
    }
  `,
  styles: [`
    .surah { display: flex; align-items: center; gap: 16px; color: var(--text); padding: 16px 18px; transition: transform 0.15s, border-color 0.2s; }
    .surah:hover { text-decoration: none; transform: translateY(-2px); border-color: var(--gold); }
    .no { width: 42px; height: 42px; display: grid; place-items: center; font-weight: 700; color: var(--gold); border: 1px solid var(--line); border-radius: 12px; transform: rotate(45deg); }
    .no { writing-mode: horizontal-tb; }
    .en { font-weight: 600; }
    .small { font-size: 0.78rem; }
    .name { font-size: 1.7rem; color: var(--gold); }
  `]
})
export class QuranIndex implements OnInit {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filter = signal<'all' | 'Meccan' | 'Medinan'>('all');
  protected readonly results = signal<Paged<Ayah> | null>(null);
  protected readonly searching = signal(false);
  protected query = '';
  protected readonly toAr = toArabicDigits;

  protected readonly visible = computed(() =>
    this.surahs().filter((s) => this.filter() === 'all' || s.revelationType.toLowerCase().startsWith(this.filter().toLowerCase().slice(0, 4)))
  );

  ngOnInit(): void {
    this.api.surahs().subscribe({
      next: (l) => { this.surahs.set(l); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected surahName(id: number): string {
    const s = this.surahs().find((x) => x.id === id);
    return s ? (this.i18n.isRtl() ? s.nameAr : s.transliteration) : this.i18n.t('Surah');
  }

  protected runSearch(page: number): void {
    if (!this.query.trim()) return;
    this.searching.set(true);
    this.error.set('');
    this.api.search(this.query.trim(), page).subscribe({
      next: (r) => { this.results.set(r); this.searching.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.searching.set(false); }
    });
  }

  protected clearSearch(): void {
    this.results.set(null);
    this.query = '';
  }
}
