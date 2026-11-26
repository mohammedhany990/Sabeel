import { T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { Course, Enrollment } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';

const CATEGORIES = ['TAFSIR', 'HADITH', 'FIQH', 'SEERAH', 'TAJWEED'];

@Component({
  selector: 'app-courses',
  imports: [T, FormsModule, RouterLink, PageHead, Spinner],
  template: `
    <app-head [title]="'Courses' | t" [subtitle]="'Learn with teachers and track your progress.' | t" />
    <div class="row between" style="margin-bottom:18px">
      <div class="tabs">
        <button class="tab" [class.active]="tab() === 'catalog'" (click)="tab.set('catalog')">{{ 'Catalog' | t }}</button>
        <button class="tab" [class.active]="tab() === 'mine'" (click)="tab.set('mine')">{{ 'My courses ({n})' | t: { n: mine().length } }}</button>
        @if (auth.role() === 'TEACHER' || auth.role() === 'ADMIN') { <button class="tab" [class.active]="tab() === 'teach'" (click)="tab.set('teach')">{{ 'Teach' | t }}</button> }
      </div>
    </div>

    @if (tab() === 'catalog') {
      <form class="row" style="margin-bottom:18px" (ngSubmit)="load()">
        <input class="grow" name="q" [(ngModel)]="q" [placeholder]="'Search courses' | t" style="min-width:200px">
        <select name="c" [(ngModel)]="category" (ngModelChange)="load()" style="width:auto">
          <option value="">{{ 'All categories' | t }}</option>
          @for (c of categories; track c) { <option [value]="c">{{ c | t }}</option> }
        </select>
        <button class="btn btn-gold" type="submit">{{ 'Search' | t }}</button>
      </form>
      @if (loading()) { <app-spinner /> } @else {
        @if (error()) { <div class="error-box">{{ error() | t }}</div> }
        <div class="grid grid-3">
          @for (c of courses(); track c.id) {
            <a class="card course" [routerLink]="['/app/courses', c.slug]">
              <div class="thumb" [style.background-image]="c.thumbnailUrl ? 'url(' + c.thumbnailUrl + ')' : ''"><span class="badge">{{ c.category | t }}</span></div>
              <h3>{{ c.title }}</h3>
              <p class="muted clamp">{{ c.description }}</p>
              <div class="row between"><span class="muted small">{{ '{n} lessons' | t: { n: c.lessons.length } }}</span><span class="gold">&#9733; {{ c.ratingAvg.toFixed(1) }} <span class="muted small">({{ c.ratingCount }})</span></span></div>
            </a>
          } @empty { <div class="empty" style="grid-column:1/-1">{{ 'No published courses match.' | t }}</div> }
        </div>
      }
    }

    @if (tab() === 'mine') {
      <div class="list">
        @for (e of mine(); track e.id) {
          <div class="item">
            <div class="grow"><strong>{{ e.courseTitle }}</strong>
              <div class="progress" style="margin-top:8px"><span [style.width.%]="e.lessonsTotal ? (e.lessonsCompleted / e.lessonsTotal) * 100 : 0"></span></div>
              <div class="muted small">{{ '{a} of {b} lessons' | t: { a: e.lessonsCompleted, b: e.lessonsTotal } }}</div>
            </div>
            <span class="badge">{{ e.status | t }}</span>
            <button class="btn btn-sm" (click)="openEnrollment(e)">{{ 'Continue' | t }}</button>
          </div>
        } @empty { <div class="empty">{{ 'You have not enrolled in any course yet.' | t }}</div> }
      </div>
    }

    @if (tab() === 'teach') {
      <div class="card">
        <div class="card-title"><h3>{{ 'Create a course' | t }}</h3></div>
        <form class="stack" (ngSubmit)="create()">
          <label class="field">{{ 'Title' | t }}<input name="t" [(ngModel)]="form.title" required></label>
          <label class="field">{{ 'Description' | t }}<textarea name="d" [(ngModel)]="form.description"></textarea></label>
          <div class="grid grid-2">
            <label class="field">{{ 'Category' | t }}<select name="c" [(ngModel)]="form.category">@for (c of categories; track c) { <option [value]="c">{{ c | t }}</option> }</select></label>
            <label class="field">{{ 'Thumbnail URL (optional)' | t }}<input name="th" [(ngModel)]="form.thumbnailUrl"></label>
          </div>
          <button class="btn btn-gold" type="submit">{{ 'Create draft' | t }}</button>
          <p class="muted small" style="margin:0">{{ 'After creating it, open the course to add lessons and publish.' | t }}</p>
        </form>
      </div>
    }
  `,
  styles: [`
    .course { color: var(--text); display: grid; gap: 8px; transition: transform 0.15s, border-color 0.2s; }
    .course:hover { transform: translateY(-3px); border-color: var(--gold); text-decoration: none; }
    .thumb { height: 140px; border-radius: 14px; background: linear-gradient(135deg, var(--emerald-deep), #0a3b33) center/cover; padding: 12px; }
    .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
    .small { font-size: 0.8rem; }
  `]
})
export class Courses implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);
  protected readonly tab = signal<'catalog' | 'mine' | 'teach'>('catalog');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly courses = signal<Course[]>([]);
  protected readonly mine = signal<Enrollment[]>([]);
  protected readonly categories = CATEGORIES;
  protected q = '';
  protected category = '';
  protected form = { title: '', description: '', category: 'TAFSIR', thumbnailUrl: '' };

  ngOnInit(): void {
    this.load();
    this.api.myCourses().subscribe({ next: (m) => this.mine.set(m), error: () => undefined });
  }

  protected load(): void {
    this.loading.set(true);
    this.api.courses(this.category || undefined, this.q.trim() || undefined).subscribe({
      next: (c) => { this.courses.set(c); this.loading.set(false); this.error.set(''); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected openEnrollment(e: Enrollment): void {
    this.api.courses().subscribe({
      next: (all) => {
        const c = all.find((x) => x.id === e.courseId);
        if (c) this.router.navigate(['/app/courses', c.slug]);
        else this.toast.error('Course is no longer in the public catalog.');
      },
      error: (er) => this.toast.error(errorMessage(er))
    });
  }

  protected create(): void {
    const body = { ...this.form, thumbnailUrl: this.form.thumbnailUrl || undefined };
    this.api.createCourse(body).subscribe({
      next: (c) => { this.toast.ok('Draft created'); this.router.navigate(['/app/courses', c.slug]); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
