import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { T } from '../core/i18n';
import { EditionHit, EditionInfo } from '../core/models';

export function validQuery(q: string): boolean {
  return Array.from(q.trim()).length >= 3;
}

@Component({
  selector: 'app-tafsir-search',
  imports: [T, FormsModule, RouterLink],
  template: `
    <div class="card" style="margin-bottom:18px" id="tafsir-search">
      <div class="card-title"><h3>{{ 'Search in tafsir and translation' | t }}</h3></div>
      <form class="row" (ngSubmit)="run()">
        <select name="edition" [(ngModel)]="key" [attr.aria-label]="'Edition' | t" data-testid="ts-edition">
          @for (e of editions(); track e.key) { <option [value]="e.key">{{ e.title }}</option> }
        </select>
        <input class="grow" name="q" [(ngModel)]="query" [placeholder]="'Search the selected edition' | t" style="min-width:200px" data-testid="ts-query">
        <button class="btn btn-gold" type="submit" data-testid="ts-run">{{ 'Search' | t }}</button>
      </form>
      @if (message()) { <p class="muted small">{{ message() | t }}</p> }
      <div class="list" style="margin-top:12px">
        @for (h of hits(); track h.surah + ':' + h.ayah) {
          <a class="item" [routerLink]="['/app/quran', h.surah]" data-testid="ts-hit">
            <span class="badge">{{ h.surah }}:{{ h.ayah }}</span>
            <span class="grow" dir="auto">{{ h.snippet }}</span>
          </a>
        }
      </div>
    </div>
  `,
  styles: [`.small { font-size: 0.85rem; } select { max-width: 280px; }`]
})
export class TafsirSearch implements OnInit {
  private readonly api = inject(Api);
  protected readonly editions = signal<EditionInfo[]>([]);
  protected readonly hits = signal<EditionHit[]>([]);
  protected readonly message = signal('');
  protected key = '';
  protected query = '';

  ngOnInit(): void {
    this.api.editions().subscribe({
      next: (e) => { this.editions.set(e); this.key = e[0]?.key ?? ''; },
      error: () => undefined
    });
  }

  protected run(): void {
    this.hits.set([]);
    if (!validQuery(this.query)) { this.message.set('Type at least 3 characters.'); return; }
    this.message.set('');
    this.api.searchEdition(this.key, this.query.trim()).subscribe({
      next: (h) => { this.hits.set(h); if (!h.length) this.message.set('No match in this edition.'); },
      error: () => this.message.set('Could not search right now.')
    });
  }
}
