import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { T } from '../core/i18n';
import { Khatma } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';

export function clampPage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(604, Math.max(0, Math.floor(value)));
}

@Component({
  selector: 'app-khatma',
  imports: [T, FormsModule],
  template: `
    <div class="card" style="margin-bottom:18px" id="khatma">
      <div class="card-title"><h3>{{ 'Khatma plan' | t }}</h3></div>
      @if (!loaded()) { <div class="muted">…</div> }
      @else if (plan(); as k) {
        <div class="progress"><span [style.width.%]="k.percent"></span></div>
        <p data-testid="khatma-summary">{{ k.currentPage }} / {{ k.totalPages }} · {{ k.percent }}%</p>
        @if (k.completed) {
          <p class="gold">{{ 'Khatma complete. May Allah accept it.' | t }}</p>
        } @else {
          <p class="muted small">{{ 'Pages per day' | t }}: <strong data-testid="khatma-per-day">{{ k.pagesPerDay }}</strong> · {{ 'Days left' | t }}: {{ k.daysLeft }} · {{ (k.onTrack ? 'On track' : 'Behind schedule') | t }}</p>
          <form class="row" (ngSubmit)="update()">
            <input name="page" type="number" min="0" max="604" [(ngModel)]="page" [attr.aria-label]="'Last page read' | t" data-testid="khatma-page">
            <button class="btn btn-gold" type="submit">{{ 'Update' | t }}</button>
          </form>
        }
        <button class="btn btn-ghost btn-sm" type="button" style="margin-top:10px" (click)="abandon()">{{ 'Abandon' | t }}</button>
      } @else {
        <form class="row" (ngSubmit)="start()">
          <input name="days" type="number" min="1" max="730" [(ngModel)]="days" [attr.aria-label]="'Finish in (days)' | t" data-testid="khatma-days">
          <button class="btn btn-gold" type="submit" data-testid="khatma-start">{{ 'Start khatma' | t }}</button>
        </form>
      }
    </div>
  `,
  styles: [`.small { font-size: 0.85rem; } input { max-width: 140px; }`]
})
export class KhatmaCard implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  protected readonly plan = signal<Khatma | null>(null);
  protected readonly loaded = signal(false);
  protected days = 30;
  protected page = 0;

  ngOnInit(): void {
    this.api.khatma().subscribe({
      next: (k) => this.apply(k ?? null),
      error: () => this.loaded.set(true)
    });
  }

  private apply(k: Khatma | null): void {
    this.plan.set(k);
    this.page = k?.currentPage ?? 0;
    this.loaded.set(true);
  }

  protected start(): void {
    this.api.startKhatma(Math.max(1, Math.floor(this.days))).subscribe({
      next: (k) => this.apply(k),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected update(): void {
    this.api.khatmaProgress(clampPage(this.page)).subscribe({
      next: (k) => this.apply(k),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }

  protected abandon(): void {
    this.api.abandonKhatma().subscribe({
      next: () => this.apply(null),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
