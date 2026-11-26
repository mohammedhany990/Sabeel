import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './core/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="toasts">
      @for (t of toast.items(); track t.id) {
        <div class="toast" [class.toast-error]="t.kind === 'error'" [class.toast-ok]="t.kind === 'ok'">{{ t.text }}</div>
      }
    </div>
  `
})
export class App {
  protected readonly toast = inject(Toast);
}
