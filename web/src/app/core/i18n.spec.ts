import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AR, HIJRI_MONTHS } from './i18n-ar';
import { I18n } from './i18n';

describe('I18n', () => {
  let i18n: I18n;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18n);
  });

  it('returns the English key when the language is English', () => {
    i18n.set('en');
    expect(i18n.t('Sign in')).toBe('Sign in');
  });

  it('translates keys and fills parameters in Arabic', () => {
    i18n.set('ar');
    expect(i18n.t('Sign in')).toBe(AR['Sign in']);
    expect(i18n.t('ayah {a} to {b}', { a: 1, b: 7 })).toBe('الآية 1 إلى 7');
  });

  it('falls back to the key for unknown text', () => {
    i18n.set('ar');
    expect(i18n.t('Unknown backend text')).toBe('Unknown backend text');
  });

  it('translates server notification patterns', () => {
    i18n.set('ar');
    expect(i18n.t('Time for Fajr')).toBe('حان وقت الفجر');
  });

  it('translates hijri month names and the era suffix', () => {
    i18n.set('ar');
    expect(i18n.hijri('14 Jumada al-Ula 1448 AH')).toBe('14 ' + HIJRI_MONTHS['Jumada al-Ula'] + ' 1448 هـ');
  });

  it('applies direction and language to the document and persists the choice', async () => {
    i18n.set('ar');
    TestBed.tick();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(localStorage.getItem('sabeel.lang')).toBe('ar');
    i18n.toggle();
    TestBed.tick();
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem('sabeel.lang')).toBe('en');
  });

  it('has an Arabic entry for every status and enum label used in the UI', () => {
    for (const k of ['ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED', 'TAFSIR', 'EGYPT', 'MEMORIZATION_TASKS', 'OMISSION', 'fajr']) expect(AR[k]).toBeTruthy();
  });
});

describe('Backend localized fields', () => {
  it('prefers the Arabic field in Arabic and falls back to the English text', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const i18n = TestBed.inject(I18n);
    const { Loc } = await import('./i18n');
    const loc = TestBed.runInInjectionContext(() => new Loc());
    const badge = { title: 'First Step', titleAr: 'الخطوة الأولى', description: 'Unknown text', descriptionAr: null };
    i18n.set('en');
    expect(loc.transform(badge, 'title')).toBe('First Step');
    i18n.set('ar');
    expect(loc.transform(badge, 'title')).toBe('الخطوة الأولى');
    expect(loc.transform(badge, 'description')).toBe('Unknown text');
  });
});
