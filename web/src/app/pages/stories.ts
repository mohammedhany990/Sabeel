import { Component, computed, inject, signal } from '@angular/core';
import { PROPHET_STORIES, ProphetStory } from '../core/data/stories';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

function loadScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('sabeel.stories.scores') || '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-stories',
  imports: [T, PageHead],
  template: `
    <app-head [title]="'Stories of the prophets' | t" [subtitle]="'Short authentic summaries from the Quran and seerah, with a small quiz for each prophet.' | t" />
    <div class="tabs" style="margin-bottom:18px">
      @for (p of stories; track p.id) {
        <button class="tab" [class.active]="current().id === p.id" (click)="select(p)">{{ i18n.isRtl() ? p.nameAr : p.name }}</button>
      }
    </div>

    <div class="card gilded" style="margin-bottom:18px">
      <div class="card-title"><h3>{{ i18n.isRtl() ? current().nameAr : current().name }}</h3><span class="muted">{{ i18n.isRtl() ? current().titleAr : current().title }}</span></div>
      <p class="story">{{ i18n.isRtl() ? current().storyAr : current().story }}</p>
      @if (bestScore() !== null) { <span class="badge badge-ok">{{ 'Best quiz score' | t }}: {{ bestScore() }}/{{ current().quiz.length }}</span> }
    </div>

    <div class="card">
      <div class="card-title"><h3>{{ 'Quiz' | t }}</h3></div>
      @if (!quizDone()) {
        <div class="q">
          <div class="qtext">{{ i18n.isRtl() ? q()!.qAr : q()!.q }}</div>
          <div class="opts">
            @for (o of (i18n.isRtl() ? q()!.optionsAr : q()!.options); track o; let i = $index) {
              <button class="opt" [class.picked]="picked() === i" (click)="pick(i)">{{ o }}</button>
            }
          </div>
        </div>
      } @else {
        <div class="stat" style="text-align:center">
          <div class="num gold">{{ score() }}/{{ current().quiz.length }}</div>
          <div class="lbl">{{ (score() === current().quiz.length ? 'Perfect. MashaAllah.' : 'Quiz complete') | t }}</div>
          <button class="btn" style="margin-top:10px" (click)="restart()">{{ 'Try again' | t }}</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .story { line-height: 2; font-size: 1.05rem; }
    .qtext { font-size: 1.1rem; margin-bottom: 12px; }
    .opts { display: grid; gap: 8px; }
    .opt { text-align: start; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--panel); color: var(--text); cursor: pointer; }
    .opt.picked { border-color: var(--gold); }
    .stat .num { font-size: 2.4rem; font-weight: 700; }
    .gold { color: var(--gold); }
  `]
})
export class Stories {
  protected readonly i18n = inject(I18n);
  protected readonly stories = PROPHET_STORIES;
  protected readonly current = signal<ProphetStory>(PROPHET_STORIES[0]);
  protected readonly qIndex = signal(0);
  protected readonly picked = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly quizDone = signal(false);
  protected readonly scores = signal<Record<string, number>>(loadScores());

  protected q = computed(() => this.current().quiz[this.qIndex()] ?? null);

  protected bestScore(): number | null {
    const v = this.scores()[this.current().id];
    return v === undefined ? null : v;
  }

  protected select(p: ProphetStory): void {
    this.current.set(p);
    this.restart();
  }

  protected pick(i: number): void {
    if (this.picked() !== null) return;
    this.picked.set(i);
    const correct = i === this.q()!.answer;
    const newScore = this.score() + (correct ? 1 : 0);
    setTimeout(() => {
      if (this.qIndex() + 1 >= this.current().quiz.length) {
        this.score.set(newScore);
        this.quizDone.set(true);
        const sc = { ...this.scores() };
        if (newScore > (sc[this.current().id] ?? -1)) {
          sc[this.current().id] = newScore;
          this.scores.set(sc);
          try {
            localStorage.setItem('sabeel.stories.scores', JSON.stringify(sc));
          } catch {
            return;
          }
        }
      } else {
        this.score.set(newScore);
        this.qIndex.set(this.qIndex() + 1);
        this.picked.set(null);
      }
    }, 600);
  }

  protected restart(): void {
    this.qIndex.set(0);
    this.picked.set(null);
    this.score.set(0);
    this.quizDone.set(false);
  }
}
