import { Component, OnDestroy, effect, input, output, signal } from '@angular/core';
import { T } from '../core/i18n';

const RATES = [0.75, 1, 1.25, 1.5];

@Component({
  selector: 'app-dock-player',
  imports: [T],
  template: `
    <div class="dock" [class.paused]="paused()" [class.floating]="floating()" [attr.data-testid]="testid()" role="region" [attr.aria-label]="'Audio player' | t">
      <div class="top">
        <span class="dot"></span>
        <div class="meta">
          <div class="title">{{ title() }}</div>
          @if (reciters().length) {
            <select class="rsel" [value]="reciterId()" (change)="reciterChange.emit(+$any($event.target).value)" [attr.aria-label]="'Reciter' | t" data-testid="dock-reciter">
              @for (r of reciters(); track r.id) { <option [value]="r.id" [selected]="r.id === reciterId()">{{ r.label }}</option> }
            </select>
          } @else if (subtitle()) { <div class="sub">{{ subtitle() }}</div> }
        </div>
        <button type="button" class="ctl rate" (click)="cycleRate()" [attr.aria-label]="'Speed' | t">{{ rate() }}x</button>
        <button type="button" class="ctl main" (click)="toggle.emit()" [attr.aria-label]="(paused() ? 'Resume' : 'Pause') | t" data-testid="dock-toggle">
          @if (paused()) { <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7Z" fill="currentColor"/></svg> }
          @else { <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg> }
        </button>
        <button type="button" class="ctl stop" (click)="stop.emit()" [attr.aria-label]="'Stop' | t" data-testid="dock-stop">
          <svg viewBox="0 0 24 24" width="18" height="18"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
          <span>{{ 'Stop' | t }}</span>
        </button>
      </div>
      <div class="prog">
        <span class="time">{{ fmt(current()) }}</span>
        <input type="range" min="0" [max]="duration() || 1" step="0.1" [value]="current()" (input)="seek($any($event.target).value)" [attr.aria-label]="'Seek' | t">
        <span class="time">{{ fmt(duration()) }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .dock { width: 100%; box-sizing: border-box; display: grid; gap: 6px; padding: 10px 16px 12px; border-radius: 22px; border: 1px solid var(--gold); background: linear-gradient(135deg, #0d4a42 0%, #072a28 55%, #04181a 100%); box-shadow: 0 14px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(226, 194, 117, 0.25); color: var(--text); }
    .dock.floating { position: fixed; z-index: 60; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(560px, calc(100vw - 24px)); }
    .rsel { max-width: 100%; margin-top: 2px; background: rgba(255, 255, 255, 0.06); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 3px 8px; font: inherit; font-size: 0.8rem; }
    .rsel option { color: #111; }
    .top { display: flex; align-items: center; gap: 10px; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--emerald); box-shadow: 0 0 0 4px rgba(47, 191, 148, 0.2); animation: pulse 1.4s ease-in-out infinite; flex: none; }
    .dock.paused .dot { animation: none; background: var(--muted); box-shadow: none; }
    .meta { flex: 1; min-width: 0; }
    .title { color: var(--gold); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { color: var(--muted); font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ctl { border: 1px solid var(--line); background: rgba(255, 255, 255, 0.06); color: var(--text); border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 12px; font: inherit; font-size: 0.85rem; }
    .ctl:hover { border-color: var(--gold); }
    .ctl.main { width: 44px; height: 44px; padding: 0; background: linear-gradient(135deg, var(--gold), var(--gold-deep)); color: #1a1408; border: 0; }
    .ctl.stop { color: var(--text); }
    .prog { display: flex; align-items: center; gap: 10px; }
    .time { font-size: 0.75rem; color: var(--muted); min-width: 34px; text-align: center; font-variant-numeric: tabular-nums; }
    input[type=range] { flex: 1; accent-color: var(--gold); height: 4px; cursor: pointer; }
    @keyframes pulse { 50% { box-shadow: 0 0 0 7px rgba(47, 191, 148, 0); } }
    @media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
  `]
})
export class DockPlayer implements OnDestroy {
  readonly audio = input<HTMLAudioElement | null>(null);
  readonly title = input('');
  readonly subtitle = input('');
  readonly paused = input(false);
  readonly reciters = input<{ id: number; label: string }[]>([]);
  readonly reciterId = input(0);
  readonly floating = input(true);
  readonly reciterChange = output<number>();
  readonly testid = input('dock-player');
  readonly toggle = output<void>();
  readonly stop = output<void>();
  protected readonly current = signal(0);
  protected readonly duration = signal(0);
  protected readonly rate = signal(1);
  private el: HTMLAudioElement | null = null;
  private readonly onTime = () => { this.current.set(this.el?.currentTime ?? 0); this.duration.set(Number.isFinite(this.el?.duration) ? this.el!.duration : 0); };

  constructor() {
    effect(() => {
      const a = this.audio();
      this.detach();
      if (!a) return;
      this.el = a;
      const saved = Number(localStorage.getItem('sabeel.audioRate')) || 1;
      this.rate.set(saved);
      a.defaultPlaybackRate = saved;
      a.playbackRate = saved;
      for (const ev of ['timeupdate', 'loadedmetadata', 'durationchange', 'loadstart']) a.addEventListener(ev, this.onTime);
      this.onTime();
    });
  }

  private detach(): void {
    if (this.el) for (const ev of ['timeupdate', 'loadedmetadata', 'durationchange', 'loadstart']) this.el.removeEventListener(ev, this.onTime);
    this.el = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }

  protected cycleRate(): void {
    const i = RATES.indexOf(this.rate());
    const next = RATES[(i + 1) % RATES.length];
    this.rate.set(next);
    localStorage.setItem('sabeel.audioRate', String(next));
    if (this.el) { this.el.defaultPlaybackRate = next; this.el.playbackRate = next; }
  }

  protected seek(v: string): void {
    if (this.el) this.el.currentTime = Number(v);
  }

  protected fmt(s: number): string {
    const n = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  }
}
