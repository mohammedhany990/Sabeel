import { Dt, I18n, Loc, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { Badge, Challenge, Circle, CircleMember, MyChallenge } from '../core/models';
import { Toast } from '../core/toast';
import { addDays, errorMessage, todayIso } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';

const METRICS = ['MEMORIZATION_TASKS', 'PLANS_COMPLETED', 'STREAK_DAYS'];

@Component({
  selector: 'app-community',
  imports: [T, Loc, Dt, FormsModule, PageHead, Spinner],
  template: `
    <app-head [title]="'Community' | t" [subtitle]="'Badges, challenges and private study circles.' | t" />
    <div class="tabs" style="margin-bottom:18px">
      <button class="tab" [class.active]="tab() === 'badges'" (click)="tab.set('badges')">{{ 'Badges' | t }}</button>
      <button class="tab" [class.active]="tab() === 'challenges'" (click)="tab.set('challenges')">{{ 'Challenges' | t }}</button>
      <button class="tab" [class.active]="tab() === 'circles'" (click)="tab.set('circles')">{{ 'Circles' | t }}</button>
    </div>
    @if (loading()) { <app-spinner /> } @else {
      @if (tab() === 'badges') {
        <div class="grid grid-4">
          @for (b of badges(); track b.code) {
            <div class="card badgecard" [class.locked]="!earned(b.code)">
              <div class="medal">{{ (earned(b.code) ? '&#9733;' : '&#9906;') | t }}</div>
              <h3>{{ b | loc: 'title' }}</h3>
              <p class="muted small">{{ b | loc: 'description' }}</p>
              @if (earned(b.code); as e) { <span class="badge badge-ok">{{ 'Earned {d}' | t: { d: (e.awardedAt | dt: 'mediumDate') } }}</span> } @else { <span class="badge">{{ 'Locked' | t }}</span> }
            </div>
          } @empty { <div class="empty" style="grid-column:1/-1">{{ 'No badge definitions available.' | t }}</div> }
        </div>
      }

      @if (tab() === 'challenges') {
        <div class="grid grid-2">
          @for (c of challenges(); track c.id) {
            <div class="card">
              <div class="row between"><h3 style="margin:0">{{ c.title }}</h3><span class="badge">{{ c.metric | t }}</span></div>
              <p class="muted">{{ c.description }}</p>
              <div class="muted small">{{ 'Target {n} · {p} joined · ends {d}' | t: { n: c.targetValue, p: c.participants, d: (c.endsAt | dt: 'mediumDate') } }}</div>
              @if (mineFor(c.id); as m) {
                <div class="progress" style="margin:14px 0 6px"><span [style.width.%]="Math.min(100, (m.progress / c.targetValue) * 100)"></span></div>
                <div class="row between"><span class="small muted">{{ m.progress }} / {{ c.targetValue }}</span>@if (m.completed) { <span class="badge badge-ok">{{ 'Completed' | t }}</span> } @else { <span class="badge badge-warn">{{ 'In progress' | t }}</span> }</div>
              } @else {
                <button class="btn btn-gold" style="margin-top:14px" (click)="join(c)">{{ 'Join challenge' | t }}</button>
              }
            </div>
          } @empty { <div class="empty" style="grid-column:1/-1">{{ 'No active challenges right now.' | t }}</div> }
        </div>
        @if (auth.role() === 'ADMIN') {
          <div class="card" style="margin-top:18px">
            <div class="card-title"><h3>{{ 'Create a challenge (admin)' | t }}</h3></div>
            <form class="stack" (ngSubmit)="createChallenge()">
              <div class="grid grid-2">
                <label class="field">{{ 'Title' | t }}<input name="ct" [(ngModel)]="cform.title" required></label>
                <label class="field">{{ 'Metric' | t }}<select name="cm" [(ngModel)]="cform.metric">@for (m of metrics; track m) { <option [value]="m">{{ m | t }}</option> }</select></label>
                <label class="field">{{ 'Target value' | t }}<input type="number" min="1" name="cv" [(ngModel)]="cform.targetValue"></label>
                <label class="field">{{ 'Starts' | t }}<input type="date" name="cs" [(ngModel)]="cform.startsAt"></label>
                <label class="field">{{ 'Ends' | t }}<input type="date" name="ce" [(ngModel)]="cform.endsAt"></label>
              </div>
              <label class="field">{{ 'Description' | t }}<textarea name="cd" [(ngModel)]="cform.description"></textarea></label>
              <button class="btn btn-gold" type="submit">{{ 'Create challenge' | t }}</button>
            </form>
          </div>
        }
      }

      @if (tab() === 'circles') {
        <div class="grid grid-2">
          <div class="card">
            <div class="card-title"><h3>{{ 'Create a circle' | t }}</h3></div>
            <form class="stack" (ngSubmit)="createCircle()">
              <label class="field">{{ 'Name' | t }}<input name="n" [(ngModel)]="circleName" required></label>
              <label class="field">{{ 'Description' | t }}<input name="d" [(ngModel)]="circleDesc"></label>
              <button class="btn btn-gold" type="submit">{{ 'Create' | t }}</button>
            </form>
          </div>
          <div class="card">
            <div class="card-title"><h3>{{ 'Join with an invite code' | t }}</h3></div>
            <form class="stack" (ngSubmit)="joinCircle()">
              <label class="field">{{ 'Invite code (8 characters)' | t }}<input name="code" [(ngModel)]="invite" required maxlength="8" style="text-transform:uppercase;letter-spacing:0.2em"></label>
              <button class="btn" type="submit">{{ 'Join circle' | t }}</button>
            </form>
          </div>
        </div>
        <h2 style="margin:26px 0 14px">{{ 'My circles' | t }}</h2>
        <div class="grid grid-2">
          @for (c of circles(); track c.id) {
            <div class="card">
              <div class="row between"><h3 style="margin:0">{{ c.name }}</h3><span class="badge">{{ 'Code {c}' | t: { c: c.inviteCode } }}</span></div>
              <p class="muted">{{ c.description }}</p>
              <button class="btn btn-sm" (click)="toggleMembers(c)">{{ (openCircle() === c.id ? 'Hide members' : 'Show members') | t }}</button>
              @if (openCircle() === c.id) {
                <div class="list" style="margin-top:12px">
                  @for (m of members(); track $index) { <div class="item">{{ memberLabel(m) }}</div> } @empty { <div class="muted">{{ 'No members found.' | t }}</div> }
                </div>
              }
            </div>
          } @empty { <div class="empty" style="grid-column:1/-1">{{ 'You are not in any circle yet.' | t }}</div> }
        </div>
      }
    }
  `,
  styles: [`
    .badgecard { text-align: center; display: grid; gap: 8px; justify-items: center; }
    .badgecard.locked { opacity: 0.55; }
    .medal { width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; font-size: 1.7rem; background: linear-gradient(135deg, #f0d791, var(--gold-deep)); color: #1b1405; }
    .locked .medal { background: var(--panel-strong); color: var(--muted); }
    .small { font-size: 0.8rem; }
  `]
})
export class Community implements OnInit {
  private readonly api = inject(Api);
  protected readonly i18n = inject(I18n);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(Auth);
  protected readonly Math = Math;
  protected readonly metrics = METRICS;
  protected readonly tab = signal<'badges' | 'challenges' | 'circles'>('badges');
  protected readonly loading = signal(true);
  protected readonly badges = signal<Badge[]>([]);
  protected readonly myBadges = signal<Badge[]>([]);
  protected readonly challenges = signal<Challenge[]>([]);
  protected readonly myChallenges = signal<MyChallenge[]>([]);
  protected readonly circles = signal<Circle[]>([]);
  protected readonly members = signal<CircleMember[]>([]);
  protected readonly openCircle = signal('');
  protected circleName = '';
  protected circleDesc = '';
  protected invite = '';
  protected cform = { title: '', description: '', metric: 'MEMORIZATION_TASKS', targetValue: 10, startsAt: todayIso(), endsAt: addDays(30) };

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    forkJoin({ b: this.api.badges(), mb: this.api.myBadges(), c: this.api.challenges(), mc: this.api.myChallenges(), ci: this.api.myCircles() }).subscribe({
      next: (r) => {
        this.badges.set(r.b); this.myBadges.set(r.mb); this.challenges.set(r.c); this.myChallenges.set(r.mc); this.circles.set(r.ci);
        this.loading.set(false);
      },
      error: (e) => { this.loading.set(false); this.toast.error(errorMessage(e)); }
    });
  }

  protected earned(code: string): Badge | undefined {
    return this.myBadges().find((b) => b.code === code);
  }

  protected mineFor(id: string): MyChallenge | undefined {
    return this.myChallenges().find((m) => m.challengeId === id);
  }

  protected join(c: Challenge): void {
    this.api.joinChallenge(c.id).subscribe({
      next: () => { this.toast.ok('Joined'); this.reload(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected createChallenge(): void {
    const f = this.cform;
    this.api.createChallenge({ ...f, targetValue: Number(f.targetValue), startsAt: f.startsAt + 'T00:00:00Z', endsAt: f.endsAt + 'T23:59:59Z' }).subscribe({
      next: () => { this.toast.ok('Challenge created'); this.reload(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected createCircle(): void {
    this.api.createCircle(this.circleName.trim(), this.circleDesc.trim()).subscribe({
      next: (c) => { this.toast.ok(this.i18n.t('Circle created. Invite code {c}', { c: c.inviteCode })); this.circleName = ''; this.circleDesc = ''; this.reload(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected joinCircle(): void {
    this.api.joinCircle(this.invite.trim().toUpperCase()).subscribe({
      next: (c) => { this.toast.ok(this.i18n.t('Joined {n}', { n: c.name })); this.invite = ''; this.reload(); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected toggleMembers(c: Circle): void {
    if (this.openCircle() === c.id) { this.openCircle.set(''); return; }
    this.api.circleMembers(c.id).subscribe({
      next: (m) => { this.members.set(m); this.openCircle.set(c.id); },
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected memberLabel(m: CircleMember): string {
    return Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }
}
