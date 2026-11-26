import { T } from '../core/i18n';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { Course, Enrollment, Lesson } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { Spinner } from '../shared/ui';

@Component({
  selector: 'app-course-detail',
  imports: [T, FormsModule, RouterLink, Spinner],
  template: `
    <a routerLink="/app/courses" class="muted">{{ '← All courses' | t }}</a>
    @if (loading()) { <app-spinner /> } @else if (error()) { <div class="error-box" style="margin-top:14px">{{ error() | t }}</div> } @else if (course(); as c) {
      <div class="card gilded" style="margin:14px 0 18px">
        <div class="row between">
          <div>
            <span class="badge">{{ c.category | t }}</span> <span class="badge" [class.badge-ok]="c.status === 'PUBLISHED'" [class.badge-warn]="c.status === 'DRAFT'">{{ c.status | t }}</span>
            <h1 style="margin-top:10px">{{ c.title }}</h1>
            <p class="muted">{{ c.description }}</p>
            <div class="gold">&#9733; {{ c.ratingAvg.toFixed(1) }} <span class="muted">{{ '({r} ratings) · {l} lessons' | t: { r: c.ratingCount, l: c.lessons.length } }}</span></div>
          </div>
          <div class="stack">
            @if (!enrollment() && c.status === 'PUBLISHED') { <button class="btn btn-gold" (click)="enroll()">{{ 'Enroll for free' | t }}</button> }
            @if (enrollment(); as e) { <span class="badge badge-ok">{{ 'Enrolled · {a}/{b} lessons' | t: { a: e.lessonsCompleted, b: e.lessonsTotal } }}</span> }
            @if (isOwner() && c.status === 'DRAFT') { <button class="btn btn-gold" (click)="publish()">{{ 'Publish course' | t }}</button> }
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 18px" [class.stackcols]="true">
        <div class="card">
          @if (activeLesson(); as l) {
            <h3>{{ l.title }}</h3>
            <p class="muted">{{ l.description }}</p>
            @if (isDirectVideo(l.videoUrl)) {
              <video #v [src]="l.videoUrl" controls style="width:100%;border-radius:14px;background:#000" (pause)="report(l, v.currentTime)" (ended)="report(l, l.durationSec)"></video>
            } @else {
              <a class="btn" [href]="l.videoUrl" target="_blank" rel="noopener">{{ 'Open lesson video' | t }}</a>
            }
            <div class="row" style="margin-top:14px">
              @if (enrollment()) { <button class="btn btn-gold" (click)="report(l, l.durationSec)">{{ 'Mark lesson complete' | t }}</button> }
              @else { <span class="muted small">{{ 'Enroll to track your progress.' | t }}</span> }
              <span class="muted small">{{ '{n} seconds' | t: { n: l.durationSec } }}</span>
            </div>
          } @else { <div class="empty">{{ 'This course has no lessons yet.' | t }}</div> }
        </div>
        <div class="card">
          <div class="card-title"><h3>{{ 'Lessons' | t }}</h3></div>
          <div class="list">
            @for (l of c.lessons; track l.lessonId) {
              <button class="item lesson" [class.active]="activeLesson()?.lessonId === l.lessonId" (click)="activeLesson.set(l)">
                <span>{{ l.sortOrder + 1 }}. {{ l.title }}</span><span class="muted small">{{ '{n}s' | t: { n: l.durationSec } }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      @if (enrollment()) {
        <div class="card" style="margin-top:18px">
          <div class="card-title"><h3>{{ 'Rate this course' | t }}</h3></div>
          <form class="stack" (ngSubmit)="rate()">
            <div class="row">@for (n of [1,2,3,4,5]; track n) { <button type="button" class="btn btn-icon" [class.btn-gold]="rating >= n" (click)="rating = n">{{ n }}</button> }</div>
            <textarea name="rv" [(ngModel)]="review" [placeholder]="'Share what you think (optional)' | t"></textarea>
            <button class="btn btn-gold" type="submit" [disabled]="!rating">{{ 'Submit rating' | t }}</button>
          </form>
        </div>
      }

      @if (isOwner()) {
        <div class="card" style="margin-top:18px">
          <div class="card-title"><h3>{{ 'Add a lesson' | t }}</h3></div>
          <form class="stack" (ngSubmit)="addLesson()">
            <div class="grid grid-2">
              <label class="field">{{ 'Title' | t }}<input name="lt" [(ngModel)]="lesson.title" required></label>
              <label class="field">{{ 'Video URL' | t }}<input name="lu" [(ngModel)]="lesson.videoUrl" required [placeholder]="'https://' | t"></label>
              <label class="field">{{ 'Duration (seconds)' | t }}<input type="number" min="1" name="ld" [(ngModel)]="lesson.durationSec" required></label>
              <label class="field">{{ 'Order' | t }}<input type="number" min="0" name="lo" [(ngModel)]="lesson.sortOrder"></label>
            </div>
            <label class="field">{{ 'Description' | t }}<textarea name="ldesc" [(ngModel)]="lesson.description"></textarea></label>
            <button class="btn" type="submit">{{ 'Add lesson' | t }}</button>
          </form>
        </div>
      }
    }
  `,
  styles: [`
    .lesson { width: 100%; text-align: start; color: inherit; font: inherit; cursor: pointer; }
    .lesson.active { border-color: var(--gold); background: rgba(226, 194, 117, 0.08); }
    .small { font-size: 0.8rem; }
    @media (max-width: 900px) { .stackcols { grid-template-columns: 1fr !important; } }
  `]
})
export class CourseDetail {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly toast = inject(Toast);
  readonly slug = input.required<string>();
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly course = signal<Course | null>(null);
  protected readonly enrollment = signal<Enrollment | null>(null);
  protected readonly activeLesson = signal<Lesson | null>(null);
  protected rating = 0;
  protected review = '';
  protected lesson = { title: '', videoUrl: '', durationSec: 60, description: '', sortOrder: 0 };

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => this.load(slug));
    });
  }

  protected isOwner(): boolean {
    const c = this.course();
    return !!c && c.teacherId === this.auth.user()?.id;
  }

  protected isDirectVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.error.set('');
    this.api.course(slug).subscribe({
      next: (c) => {
        this.course.set(c);
        this.activeLesson.set(c.lessons[0] ?? null);
        this.lesson.sortOrder = c.lessons.length;
        this.loading.set(false);
        this.loadEnrollment(c.id);
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  private loadEnrollment(courseId: string): void {
    this.api.myCourses().subscribe({ next: (l) => this.enrollment.set(l.find((e) => e.courseId === courseId) ?? null), error: () => undefined });
  }

  protected enroll(): void {
    const c = this.course();
    if (!c) return;
    this.api.enroll(c.id).subscribe({
      next: (e) => { this.enrollment.set(e); this.toast.ok('Enrolled'); },
      error: (er) => this.toast.error(errorMessage(er))
    });
  }

  protected report(l: Lesson, seconds: number): void {
    const e = this.enrollment();
    if (!e || seconds < 1) return;
    this.api.lessonProgress(e.id, l.lessonId, Math.max(1, Math.round(seconds))).subscribe({
      next: (p) => {
        if (p.completed) this.toast.ok('Lesson completed');
        const c = this.course();
        if (c) this.loadEnrollment(c.id);
      },
      error: (er) => this.toast.error(errorMessage(er))
    });
  }

  protected rate(): void {
    const c = this.course();
    if (!c || !this.rating) return;
    this.api.rateCourse(c.id, this.rating, this.review).subscribe({
      next: (u) => { this.course.set(u); this.toast.ok('Thanks for your rating'); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected publish(): void {
    const c = this.course();
    if (!c) return;
    this.api.publishCourse(c.id).subscribe({
      next: (u) => { this.course.set(u); this.toast.ok('Course published'); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected addLesson(): void {
    const c = this.course();
    if (!c) return;
    this.api.addLesson(c.id, { ...this.lesson, durationSec: Number(this.lesson.durationSec), sortOrder: Number(this.lesson.sortOrder) }).subscribe({
      next: (u) => {
        this.course.set(u);
        if (!this.activeLesson()) this.activeLesson.set(u.lessons[0] ?? null);
        this.lesson = { title: '', videoUrl: '', durationSec: 60, description: '', sortOrder: u.lessons.length };
        this.toast.ok('Lesson added');
      },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
