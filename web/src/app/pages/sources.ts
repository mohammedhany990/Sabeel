import { Component, inject, signal } from '@angular/core';
import { Api } from '../core/api';
import { EditionInfo } from '../core/models';
import { T } from '../core/i18n';
import { Spinner } from '../shared/ui';

@Component({
  selector: 'app-sources',
  imports: [T, Spinner],
  template: `
    <h2>{{ 'Quran text, tafsir and translations' | t }}</h2>
    <p class="muted">{{ 'Texts are shown unmodified, with their source and version. Tafsir and translation texts come from QuranEnc.com.' | t }}</p>
    <div class="card">
      <h3>Tanzil Project</h3>
      <p class="muted">{{ 'Quran text: Tanzil Project (CC BY 3.0, unmodified).' | t }}</p>
      <a href="https://tanzil.net" target="_blank" rel="noopener">tanzil.net</a>
    </div>
    @if (loading()) { <app-spinner /> }
    @for (e of editions(); track e.key) {
      <div class="card ed">
        <h3 dir="auto">{{ e.title }}</h3>
        <div class="muted" dir="auto">{{ 'Publisher' | t }}: {{ e.publisher }}</div>
        <div class="muted">{{ 'Version' | t }}: {{ e.version }} · {{ 'Retrieved' | t }}: {{ e.retrieved }}</div>
        <div><a [href]="e.source" target="_blank" rel="noopener">{{ 'Source page' | t }}</a> · <a [href]="e.terms" target="_blank" rel="noopener">{{ 'Terms' | t }}</a></div>
      </div>
    }
    <h2 class="ed">{{ 'Adhan recordings' | t }}</h2>
    <div class="card">
      <p class="muted">{{ 'Madinah, Al-Aqsa and Mishary Alafasy: Internet Archive collection by JpnMuslim, included unmodified.' | t }}</p>
      <p class="muted">{{ 'Adhan, recording 1: Adam-synagda, Wikimedia Commons, CC0 1.0, converted to MP3.' | t }}</p>
      <p class="muted">{{ 'Adhan, recording 2: Andrewler, Wikimedia Commons, CC BY-SA 4.0, converted to MP3.' | t }}</p>
      <a href="https://archive.org/details/Mp3CollectionAdzan" target="_blank" rel="noopener">archive.org</a> ·
      <a href="https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg" target="_blank" rel="noopener">{{ 'Source page' | t }} 1</a> ·
      <a href="https://commons.wikimedia.org/wiki/File:Azan.ogg" target="_blank" rel="noopener">{{ 'Source page' | t }} 2</a>
    </div>
  `,
  styles: [`.ed { margin-top: 12px; }`]
})
export class Sources {
  private readonly api = inject(Api);
  protected readonly editions = signal<EditionInfo[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.api.editions().subscribe({
      next: (e) => { this.editions.set(e); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
