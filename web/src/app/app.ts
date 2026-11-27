import { Component, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
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
  private readonly sw = inject(SwUpdate, { optional: true });

  constructor() {
    const sw = this.sw;
    if (!sw?.isEnabled) return;
    sw.versionUpdates.subscribe((e) => {
      if (e.type === 'VERSION_READY') sw.activateUpdate().then(() => document.location.reload());
    });
    const check = () => sw.checkForUpdate().catch(() => undefined);
    check();
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    sw.unrecoverable.subscribe(() => document.location.reload());
  }
}
