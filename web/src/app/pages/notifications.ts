import { Dt, T } from '../core/i18n';
import { Component, OnInit, inject, signal } from '@angular/core';

import { Api } from '../core/api';
import { AppNotification } from '../core/models';
import { Toast } from '../core/toast';
import { errorMessage } from '../core/util';
import { PageHead, Spinner } from '../shared/ui';

@Component({
  selector: 'app-notifications',
  imports: [T, Dt, PageHead, Spinner],
  template: `
    <app-head [title]="'Notifications' | t" [subtitle]="'Reminders, badges and results from every service.' | t" />
    @if (loading()) { <app-spinner /> } @else {
      @if (error()) { <div class="error-box">{{ error() | t }}</div> }
      <div class="list">
        @for (n of items(); track n.id) {
          <div class="item" [style.opacity]="n.readAt ? 0.6 : 1">
            <div class="grow">
              <div class="row"><strong>{{ n.title | t }}</strong><span class="badge">{{ n.type | t }}</span>@if (!n.readAt) { <span class="badge badge-ok">{{ 'New' | t }}</span> }</div>
              <div class="muted">{{ n.body | t }}</div>
              <div class="muted small">{{ n.createdAt | dt: 'medium' }} · {{ n.channel | t }} · {{ n.status | t }}</div>
            </div>
            @if (!n.readAt) { <button class="btn btn-sm" (click)="read(n)">{{ 'Mark as read' | t }}</button> }
          </div>
        } @empty { <div class="empty">{{ 'You are all caught up.' | t }}</div> }
      </div>
    }
  `,
  styles: ['.small { font-size: 0.78rem; }']
})
export class Notifications implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(Toast);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly items = signal<AppNotification[]>([]);

  ngOnInit(): void {
    this.api.notifications().subscribe({
      next: (l) => { this.items.set(l); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  protected read(n: AppNotification): void {
    this.api.markRead(n.id).subscribe({
      next: () => this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))),
      error: (e) => this.toast.error(errorMessage(e))
    });
  }
}
