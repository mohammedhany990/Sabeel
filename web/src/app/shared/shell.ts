import { T } from '../core/i18n';
import { LangSwitch } from './lang-switch';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { Logo } from './logo';

interface NavItem { path: string; label: string; icon: SafeHtml; }

@Component({
  selector: 'app-shell',
  imports: [T, LangSwitch, RouterOutlet, RouterLink, RouterLinkActive, Logo],
  template: `
    <div class="layout pattern">
      <aside class="side" [class.open]="menuOpen()">
        <a routerLink="/app/dashboard" class="brand" (click)="menuOpen.set(false)"><app-logo /></a>
        <nav>
          @for (g of groups; track g.title) {
            <div class="group">{{ g.title | t }}</div>
            @for (n of g.items; track n.path) {
              <a [routerLink]="'/app/' + n.path" routerLinkActive="active" class="nav" (click)="menuOpen.set(false)">
                <span class="ico" [innerHTML]="n.icon"></span>{{ n.label | t }}
              </a>
            }
          }
        </nav>
        <div class="who">
          <div class="avatar">{{ initials() }}</div>
          <div class="grow">
            <div class="nm">{{ auth.user()?.name }}</div>
            <div class="muted small">{{ auth.user()?.role | t }}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm signout" (click)="logout()">{{ 'Sign out' | t }}</button>
      </aside>
      <div class="main">
        <header class="top">
          <button class="btn btn-ghost btn-icon burger" (click)="menuOpen.set(!menuOpen())" [attr.aria-label]="'Menu' | t">&#9776;</button>
          <div class="grow"></div>
          <app-lang />
          <a routerLink="/app/notifications" class="bell" [attr.aria-label]="'Notifications' | t">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
            @if (unread() > 0) { <span class="dot">{{ unread() }}</span> }
          </a>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 270px 1fr; min-height: 100vh; }
    .side { position: sticky; top: 0; height: 100vh; padding: 18px 16px; display: flex; flex-direction: column; border-inline-end: 1px solid var(--line-soft); background: rgba(3, 18, 19, 0.7); backdrop-filter: blur(14px); overflow: hidden; }
    .brand { padding: 4px 10px 18px; }
    .brand:hover { text-decoration: none; }
    .signout { margin: 12px 8px 0; flex-shrink: 0; }
    nav { flex: 1; min-height: 0; overflow-y: auto; display: grid; gap: 3px; align-content: start; }
    .group { margin: 16px 12px 6px; font-size: 0.68rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-deep); font-weight: 700; }
    .nav { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; color: var(--muted); font-weight: 500; font-size: 0.93rem; }
    .nav:hover { background: var(--panel); color: var(--text); text-decoration: none; }
    .nav.active { background: linear-gradient(90deg, rgba(226, 194, 117, 0.18), rgba(226, 194, 117, 0.04)); color: var(--gold); box-shadow: inset 2px 0 0 var(--gold); }
    :host-context([dir='rtl']) .nav.active { background: linear-gradient(270deg, rgba(226, 194, 117, 0.18), rgba(226, 194, 117, 0.04)); box-shadow: inset -2px 0 0 var(--gold); }
    .ico { width: 20px; height: 20px; display: inline-flex; }
    .ico ::ng-deep svg { width: 20px; height: 20px; }
    .who { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 14px 8px 0; border-top: 1px solid var(--line-soft); margin-top: 14px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #f0d791, var(--gold-deep)); color: #1b1405; font-weight: 700; }
    .nm { font-weight: 600; font-size: 0.9rem; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .small { font-size: 0.72rem; }
    .main { min-width: 0; display: flex; flex-direction: column; }
    .top { display: flex; align-items: center; gap: 12px; padding: 16px 34px 0; }
    .burger { display: none; }
    .bell { position: relative; width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--line-soft); color: var(--text); background: var(--panel); }
    .bell:hover { border-color: var(--gold); text-decoration: none; }
    .dot { position: absolute; top: -4px; inset-inline-end: -4px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; background: var(--gold); color: #1b1405; font: 700 0.7rem var(--font-ui); display: grid; place-items: center; }
    .content { padding: 18px 34px 60px; max-width: 1280px; width: 100%; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: fixed; z-index: 50; width: 280px; transform: translateX(-100%); transition: transform 0.25s; background: #04191a; }
      .side.open { transform: none; }
      .burger { display: inline-flex; }
      .top, .content { padding-inline: 16px; }
      :host-context([dir='rtl']) .side { transform: translateX(100%); }
      :host-context([dir='rtl']) .side.open { transform: none; }
    }
  `]
})
export class Shell implements OnInit, OnDestroy {
  protected readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly unread = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  protected readonly initials = computed(() =>
    (this.auth.user()?.name ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  );

  private readonly sanitizer = inject(DomSanitizer);

  private svg(path: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`);
  }

  protected readonly groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [{ path: 'dashboard', label: 'Dashboard', icon: this.svg('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>') }]
    },
    {
      title: 'Quran',
      items: [
        { path: 'quran', label: 'Read and listen', icon: this.svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 21V5"/>') },
        { path: 'library', label: 'Bookmarks', icon: this.svg('<path d="M6 3h12v18l-6-4-6 4Z"/>') },
        { path: 'memorization', label: 'Memorization', icon: this.svg('<path d="M12 3 3 8l9 5 9-5Z"/><path d="M7 10.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-5.5"/>') },
        { path: 'revision', label: 'Revision', icon: this.svg('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>') },
        { path: 'recitation', label: 'Recitation check', icon: this.svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>') }
      ]
    },
    {
      title: 'Daily worship',
      items: [
        { path: 'prayer', label: 'Prayer and Qibla', icon: this.svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') },
        { path: 'azkar', label: 'Azkar', icon: this.svg('<path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z"/>') }
      ]
    },
    {
      title: 'Grow together',
      items: [
        { path: 'courses', label: 'Courses', icon: this.svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>') },
        { path: 'community', label: 'Community', icon: this.svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6-3.6"/>') }
      ]
    },
    {
      title: 'Account',
      items: [
        { path: 'notifications', label: 'Notifications', icon: this.svg('<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>') },
        { path: 'settings', label: 'Profile and settings', icon: this.svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.5a7 7 0 0 0-2 1.2l-2.3-.9-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.5a7 7 0 0 0 2-1.2l2.3.9 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z"/>') }
      ]
    }
  ];

  ngOnInit(): void {
    this.refreshUnread();
    this.timer = setInterval(() => this.refreshUnread(), 60000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private refreshUnread(): void {
    this.api.notifications().subscribe({
      next: (l) => this.unread.set(l.filter((n) => !n.readAt).length),
      error: () => undefined
    });
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
