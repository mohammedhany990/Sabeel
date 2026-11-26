import { Dt, I18n, Nm, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { Plan, PlanProgress, Surah, Task } from '../core/models';
import { Toast } from '../core/toast';
import { addDays, errorMessage } from '../core/util';
import { PageHead, Ring, Spinner } from '../shared/ui';

@Component({
  selector: 'app-memorization',
  imports: [T, Nm, Dt, FormsModule, PageHead, Ring, Spinner],
  template: `
    <app-head [title]="'Memorization' | t" [subtitle]="'A daily target that fits your calendar.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      @if (error()) { <div class="error-box" style="margin-bottom:14px">{{ error() | t }}</div> }

      <div class="grid grid-2">
        <div class="card gilded">
          <div class="card-title"><h3>{{ 'Today\\'s tasks' | t }}</h3><span class="badge">{{ tasks().length }}</span></div>
          <div class="list">
            @for (t of tasks(); track t.id) {
              <div class="item">
                <div>
                  <strong>{{ surahName(t.surahId) }}</strong>
                  <span class="muted"> {{ 'ayah {a} to {b}' | t: { a: t.fromAyah, b: t.toAyah } }}</span>
                  <span class="badge" style="margin-inline-start:8px">{{ t.taskType | t }}</span>
                </div>
                @if (t.completed) {
                  <span class="badge badge-ok">{{ 'Completed' | t }}</span>
                } @else {
                  <div class="row">
                    <label class="row small muted">{{ 'Accuracy' | t }} <input type="number" min="0" max="100" style="width:80px;padding:7px" [ngModel]="accuracy[t.id] ?? 90" (ngModelChange)="accuracy[t.id] = $event" [name]="'acc' + t.id"> %</label>
                    <button class="btn btn-gold btn-sm" (click)="complete(t)">{{ 'Complete' | t }}</button>
                  </div>
                }
              </div>
            } @empty { <div class="empty">{{ 'No task for today.' | t }}</div> }
          </div>
        </div>

        <div class="card">
          <div class="card-title"><h3>{{ 'New plan' | t }}</h3></div>
          <form class="stack" (ngSubmit)="create()">
            <div class="grid" style="grid-template-columns:2fr 1fr">
              <label class="field">{{ 'Start surah' | t }}
                <select name="ss" [(ngModel)]="form.startingSurahId">@for (s of surahs(); track s.id) { <option [ngValue]="s.id">{{ s.id }}. {{ s | nm }}</option> }</select>
              </label>
              <label class="field">{{ 'Start ayah' | t }}<input type="number" name="sa" min="1" [(ngModel)]="form.startingAyah"></label>
            </div>
            <label class="field">{{ 'Target surah' | t }}
              <select name="ts" [(ngModel)]="form.targetSurahId">@for (s of surahs(); track s.id) { <option [ngValue]="s.id">{{ s.id }}. {{ s | nm }}</option> }</select>
            </label>
            <label class="field">{{ 'Target date' | t }}<input type="date" name="td" [(ngModel)]="form.targetDate" [min]="minDate"></label>
            <button class="btn btn-gold" type="submit" [disabled]="creating()">{{ (creating() ? 'Creating...' : 'Create plan') | t }}</button>
          </form>
        </div>
      </div>

      <h2 style="margin:28px 0 14px">{{ 'Your plans' | t }}</h2>
      <div class="grid grid-2">
        @for (p of plans(); track p.id) {
          <div class="card">
            <div class="row between">
              <div>
                <h3 style="margin:0">{{ '{a} to {b}' | t: { a: surahName(p.startingSurahId), b: surahName(p.targetSurahId) } }}</h3>
                <div class="muted small">{{ p.startDate | dt: 'mediumDate' }} ← {{ p.targetDate | dt: 'mediumDate' }}</div>
              </div>
              <span class="badge" [class.badge-ok]="p.status === 'ACTIVE'" [class.badge-warn]="p.status === 'PAUSED'">{{ p.status | t }}</span>
            </div>
            <div class="row" style="margin:16px 0">
              @if (progress()[p.id]; as pr) {
                <app-ring [value]="pr.progressPercent / 100" [label]="pr.progressPercent.toFixed(0) + '%'" caption="memorized" />
                <div class="stack" style="gap:6px">
                  <div><strong>{{ pr.memorizedAyahs }}</strong> <span class="muted">{{ 'of {n} ayahs' | t: { n: pr.totalAyahs } }}</span></div>
                  <div><strong>{{ pr.dailyAyahTarget }}</strong> <span class="muted">{{ 'ayahs per day' | t }}</span></div>
                  <div><strong>{{ pr.daysRemaining }}</strong> <span class="muted">{{ 'days remaining' | t }}</span></div>
                  <div class="muted small">{{ 'Now at {s}:{a}' | t: { s: surahName(pr.currentSurahId), a: pr.currentAyah } }}</div>
                </div>
              } @else {
                <div class="muted">{{ '{d} ayahs per day · {w} per week' | t: { d: p.dailyAyahTarget, w: p.weeklyAyahTarget } }}</div>
              }
            </div>
            <div class="row">
              @if (p.status === 'ACTIVE') { <button class="btn btn-sm" (click)="setStatus(p, 'PAUSED')">{{ 'Pause' | t }}</button> }
              @if (p.status === 'PAUSED') { <button class="btn btn-sm btn-gold" (click)="setStatus(p, 'ACTIVE')">{{ 'Resume' | t }}</button> }
              @if (p.status === 'ACTIVE' || p.status === 'PAUSED') { <button class="btn btn-sm btn-danger" (click)="setStatus(p, 'CANCELLED')">{{ 'Cancel plan' | t }}</button> }
            </div>
          </div>
        } @empty { <div class="empty">{{ 'You have no plans yet. Create one on the right.' | t }}</div> }
      </div>
    }
  `
})
export class Memorization implements OnInit {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  private readonly toast = inject(Toast);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly creating = signal(false);
  protected readonly surahs = signal<Surah[]>([]);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly progress = signal<Record<string, PlanProgress>>({});
  protected readonly minDate = addDays(1);
  protected accuracy: Record<string, number> = {};
  protected form = { startingSurahId: 1, startingAyah: 1, targetSurahId: 114, targetDate: addDays(730) };

  ngOnInit(): void {
    this.api.surahs().subscribe({
      next: (s) => { this.surahs.set(s); this.reload(); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected surahName(id: number): string {
    const s = this.surahs().find((x) => x.id === id);
    return s ? (this.i18n.isRtl() ? s.nameAr : s.transliteration) : this.i18n.t('Surah {n}', { n: id });
  }

  private reload(): void {
    this.api.plans().subscribe({
      next: (p) => {
        this.plans.set(p);
        this.loading.set(false);
        p.forEach((plan) => this.api.planProgress(plan.id).subscribe({
          next: (pr) => this.progress.update((m) => ({ ...m, [plan.id]: pr })),
          error: () => undefined
        }));
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
    this.api.todayTasks().subscribe({ next: (t) => this.tasks.set(t), error: () => undefined });
  }

  protected create(): void {
    this.creating.set(true);
    this.api.createPlan(this.form).subscribe({
      next: () => { this.creating.set(false); this.toast.ok('Plan created'); this.reload(); },
      error: (e) => { this.creating.set(false); this.toast.error(errorMessage(e)); }
    });
  }

  protected setStatus(p: Plan, status: string): void {
    this.api.setPlanStatus(p.id, status).subscribe({
      next: () => { this.toast.ok(this.i18n.t('Plan ' + status.toLowerCase())); this.reload(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected complete(t: Task): void {
    const acc = Number(this.accuracy[t.id] ?? 90);
    this.api.completeTask(t.id, acc).subscribe({
      next: (r) => {
        this.tasks.update((l) => l.map((x) => (x.id === r.id ? r : x)));
        this.toast.ok('Task completed. Revision has been scheduled.');
        this.reload();
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
