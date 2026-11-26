import { Component, inject } from '@angular/core';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { I18n, T } from '../core/i18n';

@Component({
  selector: 'app-lang',
  imports: [T],
  template: `<button type="button" class="btn btn-ghost btn-sm lang" (click)="toggle()" [attr.aria-label]="'Language' | t">{{ i18n.isRtl() ? 'English' : 'العربية' }}</button>`
})
export class LangSwitch {
  protected readonly i18n = inject(I18n);
  private readonly auth = inject(Auth);
  private readonly api = inject(Api);

  protected toggle(): void {
    this.i18n.toggle();
    if (!this.auth.isLoggedIn()) return;
    const language = this.i18n.lang();
    this.api.profile().subscribe({
      next: (p) => this.api.updateProfile({
        name: p.name,
        profileImageUrl: p.profileImageUrl || undefined,
        country: p.country || undefined,
        timezone: p.timezone || undefined,
        preferredReciterId: p.preferredReciterId,
        preferredLanguage: language
      }).subscribe({ error: () => undefined }),
      error: () => undefined
    });
  }
}
