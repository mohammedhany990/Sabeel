import { Component, computed, inject, signal } from '@angular/core';
import { ASMA_UL_HUSNA } from '../core/data/asma';
import { ASMA_DETAILS } from '../core/data/asma-details';
import { I18n, T } from '../core/i18n';
import { PageHead } from '../shared/ui';

@Component({
  selector: 'app-asma',
  imports: [T, PageHead],
  template: `
    <app-head [title]="'Asma ul-Husna' | t" [subtitle]="'The 99 beautiful names of Allah. A new name is highlighted each day.' | t" />
    <div class="card gilded today" style="margin-bottom:18px">
      <div class="muted small">{{ 'Name of the day' | t }}</div>
      <div class="ar big-name">{{ today().ar }}</div>
      @if (!i18n.isRtl()) { <div class="en-name">{{ today().en }}</div><div class="muted">{{ today().meaning }}</div> }
      <p class="today-text" [attr.dir]="i18n.isRtl() ? 'rtl' : 'ltr'">{{ i18n.isRtl() ? details[todayIndex()].ar : details[todayIndex()].en }}</p>
      <button class="btn btn-sm btn-gold" style="justify-self:center" (click)="pick.set(todayIndex())">{{ 'Meaning and greatness' | t }}</button>
    </div>
    <div class="grid grid-3">
      @for (n of names; track n.en; let i = $index) {
        <div class="card name" [class.hl]="i === todayIndex()" (click)="pick.set(i)" (keydown.enter)="pick.set(i)" tabindex="0" role="button">
          <div class="num muted">{{ i + 1 }}</div>
          <div class="ar">{{ n.ar }}</div>
          @if (!i18n.isRtl()) { <div class="en-name small">{{ n.en }}</div> }
        </div>
      }
    </div>
    @if (pick() !== null) {
      <div class="backdrop" (click)="pick.set(null)"></div>
      <div class="card gilded detail" role="dialog" data-testid="asma-detail" [attr.aria-label]="names[pick()!].en">
        <button class="btn btn-sm btn-ghost close" (click)="pick.set(null)">{{ 'Close' | t }}</button>
        <div class="ar big-name">{{ names[pick()!].ar }}</div>
        @if (!i18n.isRtl()) { <div class="en-name">{{ names[pick()!].en }}</div><div class="muted">{{ names[pick()!].meaning }}</div> }
        <div class="sec"><div class="lbl">{{ 'Meaning' | t }}</div><p [attr.dir]="i18n.isRtl() ? 'rtl' : 'ltr'">{{ i18n.isRtl() ? details[pick()!].ar : details[pick()!].en }}</p></div>
        <div class="sec"><div class="lbl">{{ 'Greatness' | t }}</div><p [attr.dir]="i18n.isRtl() ? 'rtl' : 'ltr'">{{ i18n.isRtl() ? details[pick()!].greatAr : details[pick()!].greatEn }}</p></div>
        <div class="nav"><button class="btn btn-sm" (click)="step(-1)">{{ 'Previous' | t }}</button><span class="muted">{{ pick()! + 1 }} / 99</span><button class="btn btn-sm" (click)="step(1)">{{ 'Next' | t }}</button></div>
      </div>
    }
  `,
  styles: [`
    .today { text-align: center; padding: 22px; display: grid; gap: 6px; }
    .big-name { font-size: clamp(2.4rem, 6vw, 3.6rem); line-height: 1.5; }
    .en-name { color: var(--gold); font-weight: 600; }
    .name { text-align: center; display: grid; gap: 4px; padding: 14px; cursor: pointer; }
    .name .ar { font-size: 1.5rem; }
    .name.hl { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
    .today-text { margin: 4px auto; max-width: 620px; line-height: 1.8; }
    .backdrop { position: fixed; inset: 0; z-index: 70; background: rgba(4, 24, 26, 0.6); }
    .detail { position: fixed; z-index: 80; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 40px); overflow: auto; text-align: center; display: grid; gap: 8px; padding: 22px; background: var(--bg-2); color: var(--text); border: 1px solid var(--line); box-shadow: var(--shadow); }
    .detail .btn { background: var(--panel-strong); color: var(--text); border: 1px solid var(--line-soft); }
    .detail .close { color: var(--text); }
    .detail .close { justify-self: end; }
    .sec { text-align: start; border-top: 1px solid var(--line); padding-top: 8px; }
    .sec p { margin: 4px 0 0; line-height: 1.8; }
    .lbl { color: var(--gold); font-weight: 700; }
    .nav { display: flex; justify-content: space-between; align-items: center; }
    .small { font-size: 0.85rem; }
  `]
})
export class Asma {
  protected readonly i18n = inject(I18n);
  protected readonly names = ASMA_UL_HUSNA;
  protected readonly details = ASMA_DETAILS;

  protected step(d: number): void {
    const n = this.names.length;
    this.pick.update((p) => (((p ?? 0) + d) % n + n) % n);
  }
  protected readonly pick = signal<number | null>(null);
  protected readonly todayIndex = computed(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    return dayOfYear % this.names.length;
  });
  protected readonly today = computed(() => this.names[this.todayIndex()]);
}
