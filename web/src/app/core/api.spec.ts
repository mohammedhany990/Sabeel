import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { Api } from './api';
import { API_BASE } from './config';

describe('Api', () => {
  let api: Api;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(Api);
    http = TestBed.inject(HttpTestingController);
  });

  it('calls the ayah audio endpoint with surah and ayah params', () => {
    api.ayahAudio(1, 2, 255).subscribe();
    const r = http.expectOne((x) => x.url === `${API_BASE}/quran/reciters/1/audio`);
    expect(r.request.params.get('surah')).toBe('2');
    expect(r.request.params.get('ayah')).toBe('255');
    r.flush({});
  });

  it('patches plan status as a query parameter', () => {
    api.setPlanStatus('p1', 'PAUSED').subscribe();
    const r = http.expectOne((x) => x.url === `${API_BASE}/memorization/plans/p1`);
    expect(r.request.method).toBe('PATCH');
    expect(r.request.params.get('status')).toBe('PAUSED');
    r.flush({});
  });

  it('sends accuracy and mistakes for a revision review', () => {
    api.review('i1', 92, 1).subscribe();
    const r = http.expectOne(`${API_BASE}/revision/items/i1/review`);
    expect(r.request.body).toEqual({ accuracy: 92, mistakesCount: 1 });
    r.flush({});
  });

  it('omits empty query values for the course catalog', () => {
    api.courses(undefined, '').subscribe();
    const r = http.expectOne((x) => x.url === `${API_BASE}/learning/courses`);
    expect(r.request.params.keys()).toEqual([]);
    r.flush([]);
  });

  it('posts a recitation evaluation with the expected text', () => {
    api.createEvaluation({ surahId: 1, fromAyah: 1, toAyah: 1, expectedText: 'x', transcript: 'x' }).subscribe();
    const r = http.expectOne(`${API_BASE}/recitation/evaluations`);
    expect(r.request.body.expectedText).toBe('x');
    r.flush({});
  });
});
