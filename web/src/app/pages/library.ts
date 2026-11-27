import { Dt, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { Ayah, Bookmark, Paged, ReadingHistory, Surah } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';

@Component({
  selector: 'app-library',
  imports: [T, Dt, RouterLink, PageHead, Spinner],
  template: `
    <app-head [title]="'Bookmarks and history' | t" [subtitle]="'Your saved ayahs and recent reading.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title"><h3>{{ 'Bookmarks' | t }}</h3><span class="badge">{{ bookmarks().length }}</span></div>
          <div class="list">
            @for (b of bookmarks(); track b.id) {
              <div class="item">
                <div>
                  <a [routerLink]="['/app/mushaf']" [queryParams]="{ ayah: keyOf(b.ayahId) }">{{ 'Ayah #{n}' | t: { n: b.ayahId } }}</a>
                  @if (b.note) { <div class="muted">{{ b.note }}</div> }
                  <div class="muted small">{{ b.createdAt | dt: 'medium' }}</div>
                </div>
                <button class="btn btn-sm btn-danger" (click)="remove(b)">{{ 'Remove' | t }}</button>
              </div>
            } @empty { <div class="empty">{{ 'No bookmarks yet. Bookmark an ayah while reading.' | t }}</div> }
          </div>
        </div>
        <div class="card">
          <div class="card-title"><h3>{{ 'Reading history' | t }}</h3></div>
          <div class="list">
            @for (h of history()?.content ?? []; track $index) {
              <div class="item"><a [routerLink]="['/app/mushaf']" [queryParams]="{ ayah: keyOf(h.ayahId) }">{{ 'Ayah #{n}' | t: { n: h.ayahId } }}</a><span class="muted small">{{ h.readAt | dt: 'medium' }}</span></div>
            } @empty { <div class="empty">{{ 'Nothing here yet.' | t }}</div> }
          </div>
        </div>
      </div>
    }
  `
})
export class Library implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly bookmarks = signal<Bookmark[]>([]);
  protected readonly history = signal<Paged<ReadingHistory> | null>(null);
  protected readonly surahs = signal<Surah[]>([]);

  ngOnInit(): void {
    forkJoin({ b: this.api.bookmarks(), h: this.api.readingHistory(), s: this.api.surahs() }).subscribe({
      next: (r) => { this.bookmarks.set(r.b); this.history.set(r.h); this.surahs.set(r.s); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected keyOf(ayahId: number): string {
    let acc = 0;
    for (const s of this.surahs()) {
      if (ayahId <= acc + s.ayahCount) return s.id + ':' + (ayahId - acc);
      acc += s.ayahCount;
    }
    return '1:1';
  }

  protected surahOf(ayahId: number): number {
    let acc = 0;
    for (const s of this.surahs()) {
      acc += s.ayahCount;
      if (ayahId <= acc) return s.id;
    }
    return 1;
  }

  protected remove(b: Bookmark): void {
    this.api.removeBookmark(b.id).subscribe({
      next: () => { this.bookmarks.update((l) => l.filter((x) => x.id !== b.id)); this.toast.ok('Removed'); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
