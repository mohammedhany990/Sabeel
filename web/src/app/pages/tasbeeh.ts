import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Api } from '../core/api';
import { T } from '../core/i18n';
import { TasbeehSummary } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';

export const PHRASES: { code: string; ar: string }[] = [
  { code: 'SUBHANALLAH', ar: 'سُبْحَانَ اللَّهِ' },
  { code: 'ALHAMDULILLAH', ar: 'الْحَمْدُ لِلَّهِ' },
  { code: 'ALLAHU_AKBAR', ar: 'اللَّهُ أَكْبَرُ' },
  { code: 'LA_ILAHA_ILLALLAH', ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ' },
  { code: 'ASTAGHFIRULLAH', ar: 'أَسْتَغْفِرُ اللَّهَ' },
  { code: 'SALAWAT', ar: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ' }
];

@Component({
  selector: 'app-tasbeeh',
  imports: [T],
  template: `
    <div class="card" style="margin-top:18px" id="tasbeeh">
      <div class="card-title"><h3>{{ 'Tasbeeh' | t }}</h3></div>
      <div class="tabs">
        @for (p of phrases; track p.code) {
          <button class="tab" [class.active]="selected() === p.code" (click)="select(p.code)">{{ p.ar }}</button>
        }
      </div>
      <div class="ar phrase">{{ currentAr() }}</div>
      <div class="pad">
        <button class="btn btn-gold tap" type="button" (click)="tick()" data-testid="tasbeeh-tick">{{ 'Count' | t }}</button>
        <div class="count" data-testid="tasbeeh-pending">{{ pending() }}</div>
      </div>
      <div class="row">
        <button class="btn" type="button" (click)="save()" [disabled]="!pending()" data-testid="tasbeeh-save">{{ 'Save count' | t }}</button>
        <button class="btn btn-ghost" type="button" (click)="pending.set(0)">{{ 'Reset view' | t }}</button>
      </div>
      <p class="muted small">{{ 'Counted on this device until you save.' | t }}</p>
      @if (summary(); as s) {
        <p class="small">{{ 'Today' | t }}: <strong data-testid="tasbeeh-today">{{ s.today[selected()] ?? 0 }}</strong> · {{ 'All time' | t }}: <strong>{{ s.lifetime[selected()] ?? 0 }}</strong></p>
      }
    </div>
  `,
  styles: [`
    .phrase { font-size: 2rem; text-align: center; margin: 14px 0; }
    .pad { display: grid; justify-items: center; gap: 10px; margin: 8px 0 14px; }
    .tap { width: 150px; height: 150px; border-radius: 50%; font-size: 1.2rem; }
    .count { font: 600 2.4rem var(--font-ui); }
    .small { font-size: 0.8rem; }
  `]
})
export class Tasbeeh implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  private readonly tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected readonly phrases = PHRASES;
  protected readonly selected = signal(PHRASES[0].code);
  protected readonly pending = signal(0);
  protected readonly summary = signal<TasbeehSummary | null>(null);
  protected readonly currentAr = computed(() => PHRASES.find((p) => p.code === this.selected())?.ar ?? '');

  ngOnInit(): void {
    this.api.tasbeeh(this.tz).subscribe({ next: (s) => this.summary.set(s), error: () => undefined });
  }

  protected select(code: string): void {
    if (this.pending() > 0) this.save();
    this.selected.set(code);
  }

  protected tick(): void {
    this.pending.update((n) => n + 1);
  }

  protected save(): void {
    const count = Math.min(this.pending(), 1000);
    if (!count) return;
    const code = this.selected();
    this.api.addTasbeeh(code, count, this.tz).subscribe({
      next: (s) => { this.summary.set(s); this.pending.update((n) => Math.max(0, n - count)); this.toast.ok('Saved.'); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
