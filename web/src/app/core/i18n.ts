import { Injectable, Pipe, PipeTransform, effect, inject, signal } from '@angular/core';
import { AR, HIJRI_MONTHS, PATTERNS } from './i18n-ar';

export type Lang = 'en' | 'ar';

const STORAGE_KEY = 'sabeel.lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    return 'en';
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(initial());

  constructor() {
    effect(() => {
      const l = this.lang();
      document.documentElement.lang = l;
      document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch {
        return;
      }
    });
  }

  isRtl(): boolean {
    return this.lang() === 'ar';
  }

  set(l: Lang): void {
    this.lang.set(l);
  }

  toggle(): void {
    this.lang.set(this.lang() === 'ar' ? 'en' : 'ar');
  }

  t(key: string, params?: Record<string, string | number>): string {
    let out = this.lang() === 'ar' ? (AR[key] ?? key) : key;
    if (this.lang() === 'ar' && AR[key] === undefined) {
      for (const [re, tpl] of PATTERNS) {
        const m = re.exec(key);
        if (m) {
          out = tpl.replace(/\$(\d)/g, (_x, i: string) => this.t(m[Number(i)]));
          break;
        }
      }
    }
    const failed = /^Request failed \((\d+)\)$/.exec(key);
    if (failed) out = this.lang() === 'ar' ? AR['Request failed ({n})'].replace('{n}', failed[1]) : key;
    if (params) {
      for (const k of Object.keys(params)) out = out.split('{' + k + '}').join(String(params[k]));
    }
    return out;
  }

  hijri(v: string | null | undefined): string {
    if (!v) return '';
    if (this.lang() !== 'ar') return v;
    let out = v.replace(/\s*AH$/, ' هـ');
    for (const k of Object.keys(HIJRI_MONTHS)) out = out.split(k).join(HIJRI_MONTHS[k]);
    return out;
  }

  locale(): string {
    return this.lang() === 'ar' ? 'ar-EG' : 'en-US';
  }
}

@Pipe({ name: 't', pure: false })
export class T implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: string | null | undefined, params?: Record<string, string | number>): string {
    return key == null ? '' : this.i18n.t(key, params);
  }
}

interface Named { nameAr?: string; nameEn?: string; transliteration?: string; }

@Pipe({ name: 'nm', pure: false })
export class Nm implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(o: Named | null | undefined, mode: 'main' | 'sub' = 'main'): string {
    if (!o) return '';
    const ar = this.i18n.isRtl();
    if (mode === 'sub') return ar ? (o.transliteration !== undefined ? '' : (o.nameAr ?? '')) : (o.nameEn ?? '');
    return ar ? (o.nameAr ?? '') : (o.transliteration ?? o.nameEn ?? '');
  }
}

@Pipe({ name: 'dt', pure: false })
export class Dt implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(v: string | number | Date | null | undefined, kind: 'mediumDate' | 'medium' = 'mediumDate'): string {
    if (v == null || v === '') return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const opts: Intl.DateTimeFormatOptions =
      kind === 'medium'
        ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(this.i18n.locale(), opts).format(d);
  }
}


@Pipe({ name: 'hj', pure: false })
export class Hj implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(v: string | null | undefined, ar?: string | null): string {
    if (ar && this.i18n.isRtl()) return ar;
    return this.i18n.hijri(v);
  }
}

@Pipe({ name: 'loc', pure: false })
export class Loc implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(o: object | null | undefined, field: string): string {
    if (!o) return '';
    const rec = o as Record<string, unknown>;
    const base = rec[field];
    const baseText = typeof base === 'string' ? base : '';
    if (!this.i18n.isRtl()) return baseText;
    const ar = rec[field + 'Ar'];
    return typeof ar === 'string' && ar ? ar : this.i18n.t(baseText);
  }
}
