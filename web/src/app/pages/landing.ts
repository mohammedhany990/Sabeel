import { T } from '../core/i18n';
import { LangSwitch } from '../shared/lang-switch';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { Logo } from '../shared/logo';

@Component({
  selector: 'app-landing',
  imports: [T, LangSwitch, RouterLink, Logo],
  template: `
    <div class="page pattern">
      <header class="nav">
        <app-logo />
        <div class="row">
          <app-lang />
          @if (auth.isLoggedIn()) {
            <a class="btn btn-gold" routerLink="/app/dashboard">{{ 'Open dashboard' | t }}</a>
          } @else {
            <a class="btn btn-ghost" routerLink="/login">{{ 'Sign in' | t }}</a>
            <a class="btn btn-gold" routerLink="/register">{{ 'Get started' | t }}</a>
          }
        </div>
      </header>

      <section class="hero">
        <span class="badge">{{ 'Memorize. Revise. Recite. Grow.' | t }}</span>
        <h1>{{ 'Your complete companion for a life with the Quran' | t }}</h1>
        <p class="lead">{{ 'Plan your hifz, revise with spaced repetition, check your recitation, keep your prayers and azkar, learn from teachers and grow with a community. One calm, beautiful place.' | t }}</p>
        <div class="row cta">
          <a class="btn btn-gold" routerLink="/register">{{ 'Start for free' | t }}</a>
          <a class="btn" routerLink="/login">{{ 'I already have an account' | t }}</a>
        </div>
        <div class="verse ar">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
      </section>

      <section class="features">
        @for (f of features; track f.title) {
          <article class="card gilded">
            <div class="fi">{{ f.mark }}</div>
            <h3>{{ f.title | t }}</h3>
            <p class="muted">{{ f.text | t }}</p>
          </article>
        }
      </section>

      <footer class="foot muted">{{ 'Sabeel · built on a twelve-service Spring Boot platform · Angular frontend' | t }}</footer>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; padding: 0 clamp(18px, 5vw, 70px) 40px; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 26px 0; }
    .hero { text-align: center; max-width: 880px; margin: 50px auto 70px; display: grid; gap: 18px; justify-items: center; }
    .hero h1 { font-size: clamp(2.6rem, 6vw, 4.6rem); background: linear-gradient(180deg, #fff6dc, var(--gold)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .lead { font-size: 1.15rem; color: var(--muted); max-width: 700px; }
    .cta { justify-content: center; }
    .verse { font-size: 2.2rem; color: var(--gold); margin-top: 24px; opacity: 0.9; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; max-width: 1180px; margin: 0 auto; }
    .fi { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(135deg, #f0d791, var(--gold-deep)); color: #1b1405; font: 700 1.3rem var(--font-display); margin-bottom: 14px; }
    .foot { text-align: center; margin-top: 60px; font-size: 0.85rem; }
  `]
})
export class Landing {
  protected readonly auth = inject(Auth);
  protected readonly features = [
    { mark: 'ق', title: 'Read and listen', text: 'All 114 surahs in Uthmani script with ayah-level audio from five reciters, search, bookmarks and resume where you stopped.' },
    { mark: 'ح', title: 'Memorization plans', text: 'Set a target date and get a daily ayah goal, carry-over for missed days and a live progress ring.' },
    { mark: 'م', title: 'Spaced revision', text: 'A 1, 3, 7, 14, 30, 60 day ladder with ease factors keeps what you memorized from slipping away.' },
    { mark: 'ت', title: 'Recitation check', text: 'Submit audio and get a word-level comparison with missed, added and substituted words.' },
    { mark: 'ص', title: 'Prayer and Qibla', text: 'Calculated prayer times, Qibla bearing with a compass and the Hijri date for your location.' },
    { mark: 'ذ', title: 'Daily azkar', text: 'Morning, evening, after-prayer and sleep azkar with counters and streaks.' },
    { mark: 'د', title: 'Courses', text: 'Learn tafsir, hadith, fiqh, seerah and tajweed with progress tracking and ratings.' },
    { mark: 'ج', title: 'Community', text: 'Earn badges, join challenges and study in private circles with an invite code.' }
  ];
}
