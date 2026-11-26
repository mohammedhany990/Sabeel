import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { T } from '../core/i18n';
import { DailyAyah } from '../core/models';
import { toArabicDigits } from '../core/util';

@Component({
  selector: 'app-daily-ayah',
  imports: [T, RouterLink],
  template: `
    @if (daily(); as d) {
      <div class="card gilded daily" data-testid="daily-ayah">
        <div class="card-title"><h3>{{ 'Ayah of the day' | t }}</h3><span class="badge">{{ d.ayah.surahId }}:{{ d.ayah.ayahNumber }}</span></div>
        <div class="ar txt">{{ d.ayah.textUthmani }} <span class="end">&#64831;{{ toAr(d.ayah.ayahNumber) }}&#64830;</span></div>
        <a class="btn btn-sm" [routerLink]="['/app/quran', d.ayah.surahId]" [queryParams]="{ ayah: d.ayah.id }">{{ 'Open in reader' | t }}</a>
      </div>
    }
  `,
  styles: [`
    .daily { display: grid; gap: 14px; margin-bottom: 18px; animation: rise 0.5s ease both; }
    .txt { font-size: clamp(1.5rem, 3vw, 2.2rem); line-height: 2.2; text-align: right; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .daily { animation: none; } }
  `]
})
export class DailyAyahCard implements OnInit {
  private readonly api = inject(Api);
  protected readonly daily = signal<DailyAyah | null>(null);

  ngOnInit(): void {
    this.api.dailyAyah().subscribe({ next: (d) => this.daily.set(d), error: () => undefined });
  }

  protected toAr(n: number): string {
    return toArabicDigits(n);
  }
}
