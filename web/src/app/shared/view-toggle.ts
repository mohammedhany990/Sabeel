import { Component, input, output } from '@angular/core';
import { T } from '../core/i18n';

@Component({
  selector: 'app-view-toggle',
  imports: [T],
  template: `
    <div class="seg" role="tablist" data-testid="view-toggle">
      <button type="button" role="tab" [class.on]="active() === 'mushaf'" [attr.aria-selected]="active() === 'mushaf'" (click)="pick.emit('mushaf')" data-testid="view-mushaf">{{ 'Mushaf pages' | t }}</button>
      <button type="button" role="tab" [class.on]="active() === 'verse'" [attr.aria-selected]="active() === 'verse'" (click)="pick.emit('verse')" data-testid="view-verse">{{ 'Verse view' | t }}</button>
    </div>
  `,
  styles: [`
    .seg { display: inline-flex; padding: 4px; gap: 4px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255, 255, 255, 0.05); }
    button { border: 0; background: transparent; color: var(--muted); padding: 8px 18px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 0.9rem; }
    button.on { background: linear-gradient(135deg, var(--gold), var(--gold-deep)); color: #1a1408; font-weight: 700; }
  `]
})
export class ViewToggle {
  readonly active = input<'mushaf' | 'verse'>('mushaf');
  readonly pick = output<'mushaf' | 'verse'>();
}
