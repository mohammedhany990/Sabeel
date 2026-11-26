import { Dt, I18n, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { RevisionItem, RevisionStats, Surah } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';

@Component({
  selector: 'app-revision',
  imports: [T, Dt, FormsModule, PageHead, Spinner],
  template: `
    <app-head [title]="'Revision' | t" [subtitle]="'Spaced repetition keeps your memorization strong.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      @if (error()) { <div class="error-box" style="margin-bottom:14px">{{ error() | t }}</div> }
      <div class="grid grid-3">
        <div class="card gilded stat"><div class="num">{{ stats()?.dueNow ?? 0 }}</div><div class="lbl">{{ 'Due now' | t }}</div></div>
        <div class="card gilded stat"><div class="num">{{ stats()?.scheduled ?? 0 }}</div><div class="lbl">{{ 'Scheduled' | t }}</div></div>
        <div class="card gilded stat"><div class="num">{{ stats()?.mastered ?? 0 }}</div><div class="lbl">{{ 'Mastered' | t }}</div></div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-title"><h3>{{ 'Due for review' | t }}</h3></div>
        <div class="list">
          @for (i of due(); track i.id) {
            <div class="item">
              <div>
                <strong>{{ surahName(i.surahId) }}</strong> <span class="muted">{{ 'ayah {a} to {b}' | t: { a: i.fromAyah, b: i.toAyah } }}</span>
                <div class="muted small">{{ 'Interval {n} days' | t: { n: i.intervalDays } }} · <span class="badge" [class.badge-bad]="i.difficulty === 'HARD'">{{ i.difficulty | t }}</span></div>
              </div>
              <div class="row">
                <label class="row small muted">{{ 'Accuracy' | t }} <input type="number" min="0" max="100" style="width:76px;padding:7px" [ngModel]="acc[i.id] ?? 90" (ngModelChange)="acc[i.id] = $event" [name]="'a' + i.id"> %</label>
                <label class="row small muted">{{ 'Mistakes' | t }} <input type="number" min="0" style="width:66px;padding:7px" [ngModel]="mist[i.id] ?? 0" (ngModelChange)="mist[i.id] = $event" [name]="'m' + i.id"></label>
                <button class="btn btn-gold btn-sm" (click)="review(i)">{{ 'Submit review' | t }}</button>
              </div>
            </div>
          } @empty { <div class="empty">{{ 'Nothing is due. Come back tomorrow or complete a memorization task to add items.' | t }}</div> }
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-title">
          <h3>{{ 'Upcoming' | t }}</h3>
          <div class="tabs">@for (d of [7, 14, 30]; track d) { <button class="tab" [class.active]="days() === d" (click)="loadUpcoming(d)">{{ '{n} days' | t: { n: d } }}</button> }</div>
        </div>
        <div class="list">
          @for (i of upcoming(); track i.id) {
            <div class="item"><div><strong>{{ surahName(i.surahId) }}</strong> <span class="muted">{{ 'ayah {a} to {b}' | t: { a: i.fromAyah, b: i.toAyah } }}</span></div><span class="badge">{{ i.nextRevisionDate | dt: 'mediumDate' }}</span></div>
          } @empty { <div class="empty">{{ 'No revisions scheduled in this window.' | t }}</div> }
        </div>
      </div>
    }
  `
})
export class Revision implements OnInit {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  private readonly toast = inject(Toast);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly stats = signal<RevisionStats | null>(null);
  protected readonly due = signal<RevisionItem[]>([]);
  protected readonly upcoming = signal<RevisionItem[]>([]);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly days = signal(7);
  protected acc: Record<string, number> = {};
  protected mist: Record<string, number> = {};

  ngOnInit(): void {
    forkJoin({ s: this.api.surahs(), st: this.api.revisionStats(), d: this.api.revisionDue(), u: this.api.revisionUpcoming(7) }).subscribe({
      next: (r) => { this.surahs.set(r.s); this.stats.set(r.st); this.due.set(r.d); this.upcoming.set(r.u); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected surahName(id: number): string {
    const s = this.surahs().find((x) => x.id === id);
    return s ? (this.i18n.isRtl() ? s.nameAr : s.transliteration) : this.i18n.t('Surah {n}', { n: id });
  }

  protected loadUpcoming(d: number): void {
    this.days.set(d);
    this.api.revisionUpcoming(d).subscribe({ next: (u) => this.upcoming.set(u), error: (e) => this.toast.error(errorMessage(e)) });
  }

  protected review(i: RevisionItem): void {
    this.api.review(i.id, Number(this.acc[i.id] ?? 90), Number(this.mist[i.id] ?? 0)).subscribe({
      next: (r) => {
        this.toast.ok(r.mastered ? this.i18n.t('Mastered. Excellent work.') : this.i18n.t('Next review in {n} days', { n: r.nextIntervalDays }));
        forkJoin({ st: this.api.revisionStats(), d: this.api.revisionDue(), u: this.api.revisionUpcoming(this.days()) }).subscribe((x) => {
          this.stats.set(x.st); this.due.set(x.d); this.upcoming.set(x.u);
        });
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
