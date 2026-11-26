import { I18n, Nm, T } from '../core/i18n';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { Ayah, Evaluation, Reciter, Surah } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage, parseMistakes } from '../core/util';
import { PageHead, Ring, Spinner } from '../shared/ui';

@Component({
  selector: 'app-recitation',
  imports: [T, Nm, FormsModule, PageHead, Ring, Spinner],
  template: `
    <app-head [title]="'Recitation check' | t" [subtitle]="'Compare your recitation with the expected text, word by word.' | t" />
    <div class="card gilded" style="margin-bottom:18px">
      <p class="muted" style="margin:0">{{ 'This is automated speech-to-text followed by word alignment. It is not a tajweed assessment and carries no religious authority. Results depend on the recording quality and the engine configured on the server, and every result shows which mode produced it.' | t }}</p>
    </div>

    @if (loading()) { <app-spinner /> } @else {
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title"><h3>{{ 'New evaluation' | t }}</h3></div>
          <form class="stack" (ngSubmit)="submit()">
            <div class="grid" style="grid-template-columns:2fr 1fr 1fr">
              <label class="field">{{ 'Surah' | t }}
                <select name="s" [ngModel]="surahId()" (ngModelChange)="surahId.set(+$event); loadAyahs()">@for (s of surahs(); track s.id) { <option [value]="s.id">{{ s.id }}. {{ s | nm }}</option> }</select>
              </label>
              <label class="field">{{ 'From' | t }}<input type="number" name="f" min="1" [(ngModel)]="from" (ngModelChange)="fillExpected()"></label>
              <label class="field">{{ 'To' | t }}<input type="number" name="t" min="1" [(ngModel)]="to" (ngModelChange)="fillExpected()"></label>
            </div>
            <label class="field">{{ 'Expected text (filled from the Quran, editable)' | t }}
              <textarea class="ar" name="e" [(ngModel)]="expected" style="font-size:1.4rem;line-height:2" required></textarea>
            </label>
            <div class="tabs">
              <button type="button" class="tab" [class.active]="mode() === 'audio'" (click)="mode.set('audio')">{{ 'Audio URL' | t }}</button>
              <button type="button" class="tab" [class.active]="mode() === 'transcript'" (click)="mode.set('transcript')">{{ 'Transcript (demo)' | t }}</button>
            </div>
            @if (mode() === 'audio') {
              <label class="field">{{ 'Public audio URL (http or https)' | t }}
                <input name="u" [(ngModel)]="audioUrl" [placeholder]="'https://everyayah.com/data/Alafasy_128kbps/001001.mp3' | t">
              </label>
              <div class="row">
                <button type="button" class="btn btn-sm btn-ghost" (click)="useReciterAudio()">{{ 'Use reciter audio for the first ayah' | t }}</button>
              </div>
              <p class="muted small" style="margin:0">{{ 'The server downloads the audio, so it must be a public address. Local files and private hosts are rejected by the backend.' | t }}</p>
            } @else {
              <label class="field">{{ 'Transcript text' | t }}
                <textarea class="ar" name="tr" [(ngModel)]="transcript" style="font-size:1.4rem;line-height:2"></textarea>
              </label>
            }
            <button class="btn btn-gold" type="submit" [disabled]="submitting()">{{ (submitting() ? 'Submitting...' : 'Evaluate recitation') | t }}</button>
          </form>
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'Latest result' | t }}</h3>@if (active()) { <span class="badge" [class.badge-ok]="active()!.status === 'COMPLETED'" [class.badge-bad]="active()!.status === 'FAILED'">{{ active()!.status | t }}</span> }</div>
          @if (active(); as r) {
            @if (r.status === 'PENDING' || r.status === 'RUNNING') {
              <div class="loading"><span class="spinner"></span>{{ 'Evaluating. This can take a minute with real audio.' | t }}</div>
            } @else if (r.status === 'FAILED') {
              <div class="error-box">{{ r.error || 'The evaluation failed.' }}</div>
            } @else {
              <div class="row">
                <app-ring [value]="(r.accuracy ?? 0) / 100" [label]="(r.accuracy ?? 0).toFixed(0) + '%'" caption="accuracy" />
                <div class="stack" style="gap:6px">
                  <div><strong>{{ r.mistakeCount ?? 0 }}</strong> <span class="muted">{{ 'mistakes' | t }}</span></div>
                  <div class="badge">{{ r.evaluationMode | t }}</div>
                </div>
              </div>
              <div class="list" style="margin-top:16px">
                @for (m of mistakes(); track $index) {
                  <div class="item">
                    <span class="badge" [class.badge-bad]="m.type === 'OMISSION'" [class.badge-warn]="m.type === 'SUBSTITUTION'">{{ m.type | t }}</span>
                    <span>{{ 'expected' | t }} <span class="ar" style="font-size:1.3rem">{{ m.expected || '-' }}</span></span>
                    <span>{{ 'heard' | t }} <span class="ar" style="font-size:1.3rem">{{ m.actual || '-' }}</span></span>
                    <span class="muted small">{{ 'word {n}' | t: { n: m.position + 1 } }}</span>
                  </div>
                } @empty { <div class="ok-box-inline">{{ 'No mistakes found.' | t }}</div> }
              </div>
            }
          } @else { <div class="empty">{{ 'Submit a recitation to see the result here.' | t }}</div> }
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'History' | t }}</h3><button class="btn btn-sm btn-ghost" (click)="loadHistory()">{{ 'Refresh' | t }}</button></div>
        <div class="list">
          @for (e of history(); track e.id) {
            <button class="item" style="text-align:start;color:inherit;font:inherit;cursor:pointer" (click)="show(e)">
              <span><strong>{{ surahName(e.surahId) }}</strong> <span class="muted">{{ 'ayah {a} to {b}' | t: { a: e.fromAyah, b: e.toAyah } }}</span></span>
              <span class="row"><span class="badge">{{ e.evaluationMode | t }}</span><span class="badge" [class.badge-ok]="e.status === 'COMPLETED'" [class.badge-bad]="e.status === 'FAILED'">{{ e.status | t }}</span>@if (e.accuracy !== null) { <strong>{{ e.accuracy.toFixed(1) }}%</strong> }</span>
            </button>
          } @empty { <div class="empty">{{ 'No evaluations yet.' | t }}</div> }
        </div>
      </div>
    }
  `,
  styles: [`.ok-box-inline { padding: 12px; border-radius: 12px; background: rgba(47, 191, 148, 0.1); color: #b6f0dc; } .small { font-size: 0.8rem; }`]
})
export class Recitation implements OnInit, OnDestroy {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  private readonly toast = inject(Toast);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly reciters = signal<Reciter[]>([]);
  protected readonly surahId = signal(1);
  protected readonly ayahs = signal<Ayah[]>([]);
  protected readonly history = signal<Evaluation[]>([]);
  protected readonly active = signal<Evaluation | null>(null);
  protected readonly mode = signal<'audio' | 'transcript'>('audio');
  protected readonly mistakes = computed(() => parseMistakes(this.active()?.mistakes ?? null));
  protected from = 1;
  protected to = 1;
  protected expected = '';
  protected audioUrl = '';
  protected transcript = '';
  private poll: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    forkJoin({ s: this.api.surahs(), r: this.api.reciters() }).subscribe({
      next: (x) => { this.surahs.set(x.s); this.reciters.set(x.r); this.loading.set(false); this.loadAyahs(); this.loadHistory(); },
      error: (e) => { this.toast.error(errorMessage(e)); this.loading.set(false); }
    });
  }

  ngOnDestroy(): void {
    if (this.poll) clearInterval(this.poll);
  }

  protected surahName(id: number): string {
    const s = this.surahs().find((x) => x.id === id);
    return s ? (this.i18n.isRtl() ? s.nameAr : s.transliteration) : this.i18n.t('Surah {n}', { n: id });
  }

  protected loadAyahs(): void {
    this.api.surah(this.surahId()).subscribe({
      next: (a) => { this.ayahs.set(a); this.from = 1; this.to = 1; this.fillExpected(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected fillExpected(): void {
    this.expected = this.ayahs().filter((a) => a.ayahNumber >= this.from && a.ayahNumber <= this.to).map((a) => a.textSimple || a.textUthmani).join(' ');
  }

  protected useReciterAudio(): void {
    const reciter = this.reciters().find((x) => x.hasAyahAudio !== false);
    if (!reciter) return;
    this.api.ayahAudio(reciter.id, this.surahId(), this.from).subscribe({
      next: (r) => { this.audioUrl = r.audioUrl; this.mode.set('audio'); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected loadHistory(): void {
    this.api.evaluations().subscribe({ next: (l) => this.history.set(l), error: () => undefined });
  }

  protected show(e: Evaluation): void {
    this.active.set(e);
  }

  protected submit(): void {
    if (!this.expected.trim()) { this.toast.error('Expected text is required.'); return; }
    const body = {
      surahId: this.surahId(), fromAyah: this.from, toAyah: this.to, expectedText: this.expected.trim(),
      ...(this.mode() === 'audio' ? { audioUrl: this.audioUrl.trim() } : { transcript: this.transcript.trim() })
    };
    this.submitting.set(true);
    this.api.createEvaluation(body).subscribe({
      next: (r) => { this.submitting.set(false); this.active.set(r); this.watch(r.id); this.loadHistory(); },
      error: (e) => { this.submitting.set(false); this.toast.error(errorMessage(e)); }
    });
  }

  private watch(id: string): void {
    if (this.poll) clearInterval(this.poll);
    let tries = 0;
    this.poll = setInterval(() => {
      tries++;
      this.api.evaluation(id).subscribe({
        next: (r) => {
          this.active.set(r);
          if (r.status === 'COMPLETED' || r.status === 'FAILED' || tries > 120) {
            clearInterval(this.poll);
            this.loadHistory();
          }
        },
        error: () => undefined
      });
    }, 2500);
  }
}
