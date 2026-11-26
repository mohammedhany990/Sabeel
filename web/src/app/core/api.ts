import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './config';
import * as M from './models';

type Query = Record<string, string | number | boolean | undefined | null>;

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  private params(q?: Query): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(q ?? {})) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  get<T>(path: string, q?: Query): Observable<T> {
    return this.http.get<T>(API_BASE + path, { params: this.params(q) });
  }
  post<T>(path: string, body: unknown = {}, q?: Query): Observable<T> {
    return this.http.post<T>(API_BASE + path, body, { params: this.params(q) });
  }
  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(API_BASE + path, body);
  }
  patch<T>(path: string, q?: Query): Observable<T> {
    return this.http.patch<T>(API_BASE + path, {}, { params: this.params(q) });
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(API_BASE + path);
  }

  profile = () => this.get<M.ProfileResponse>('/users/me');
  updateProfile = (b: M.UpdateProfileRequest) => this.put<M.ProfileResponse>('/users/me', b);
  preferences = () => this.get<M.PreferencesResponse>('/users/me/preferences');
  updatePreferences = (b: M.PreferencesRequest) => this.put<M.PreferencesResponse>('/users/me/preferences', b);
  registerDeviceToken = (fcmToken: string, platform: string) => this.post<void>('/users/me/device-tokens', { fcmToken, platform });

  surahs = () => this.get<M.Surah[]>('/quran/surahs');
  surah = (id: number) => this.get<M.Ayah[]>(`/quran/surahs/${id}`);
  page = (p: number) => this.get<M.Ayah[]>(`/quran/pages/${p}`);
  juz = (j: number) => this.get<M.Ayah[]>(`/quran/juz/${j}`);
  search = (q: string, page = 0, size = 20) => this.get<M.Paged<M.Ayah>>('/quran/search', { q, page, size });
  reciters = () => this.get<M.Reciter[]>('/quran/reciters');
  ayahAudio = (reciter: number, surah: number, ayah: number) => this.get<M.AyahAudio>(`/quran/reciters/${reciter}/audio`, { surah, ayah });
  surahTimings = (reciter: number, surah: number) => this.get<M.SurahTimings>(`/quran/reciters/${reciter}/surahs/${surah}/timings`);
  surahAudio = (reciter: number, surah: number) => this.get<M.SurahAudio>(`/quran/reciters/${reciter}/surahs/${surah}/audio`);
  editions = () => this.get<M.EditionInfo[]>('/quran/editions');
  editionAyah = (key: string, surah: number, ayah: number) => this.get<M.EditionAyah>(`/quran/editions/${key}/${surah}/${ayah}`);
  bookmarks = () => this.get<M.Bookmark[]>('/quran/bookmarks');
  addBookmark = (ayahId: number, note?: string) => this.post<M.Bookmark>('/quran/bookmarks', { ayahId, note });
  removeBookmark = (id: string) => this.delete<void>(`/quran/bookmarks/${id}`);
  readingState = () => this.get<M.ReadingState>('/quran/reading-state');
  saveReadingState = (lastAyahId: number) => this.put<M.ReadingState>('/quran/reading-state', { lastAyahId });
  readingHistory = (page = 0, size = 20) => this.get<M.Paged<M.ReadingHistory>>('/quran/reading-history', { page, size });

  plans = () => this.get<M.Plan[]>('/memorization/plans/me');
  createPlan = (b: M.CreatePlanRequest) => this.post<M.Plan>('/memorization/plans', b);
  setPlanStatus = (id: string, status: string) => this.patch<M.Plan>(`/memorization/plans/${id}`, { status });
  planProgress = (id: string) => this.get<M.PlanProgress>(`/memorization/plans/${id}/progress`);
  todayTasks = () => this.get<M.Task[]>('/memorization/tasks/today');
  completeTask = (id: string, accuracy: number) => this.post<M.Task>(`/memorization/tasks/${id}/complete`, { accuracy });

  revisionDue = () => this.get<M.RevisionItem[]>('/revision/due');
  revisionUpcoming = (days = 7) => this.get<M.RevisionItem[]>('/revision/upcoming', { days });
  revisionStats = () => this.get<M.RevisionStats>('/revision/stats');
  review = (id: string, accuracy: number, mistakesCount: number) => this.post<M.ReviewResponse>(`/revision/items/${id}/review`, { accuracy, mistakesCount });

  notifications = () => this.get<M.AppNotification[]>('/notifications/me');
  markRead = (id: string) => this.post<void>(`/notifications/me/${id}/read`);

  prayerTimes = (q: { date?: string; lat?: number; lng?: number; method?: string }) => this.get<M.PrayerTimes>('/prayer/times', q);
  prayerMonth = (q: { year: number; month: number; lat?: number; lng?: number; method?: string }) => this.get<M.PrayerTimes[]>('/prayer/times/month', q);
  qibla = (lat: number, lng: number) => this.get<M.Qibla>('/prayer/qibla', { lat, lng });
  hijri = (date?: string) => this.get<M.Hijri>('/prayer/hijri', { date });
  prayerSettings = () => this.get<M.PrayerSettings>('/prayer/settings');
  savePrayerSettings = (b: { latitude: number; longitude: number; method: string; timezone: string; asrFactor: number }) => this.put<M.PrayerSettings>('/prayer/settings', b);

  azkarCategories = () => this.get<M.AzkarCategory[]>('/azkar/categories');
  azkarToday = (tz?: string) => this.get<M.AzkarToday[]>('/azkar/today', { tz });
  azkarProgress = (id: number, tz?: string) => this.post<M.AzkarProgress>(`/azkar/items/${id}/progress`, {}, { tz });
  azkarStreaks = () => this.get<M.AzkarStreak[]>('/azkar/streaks');

  courses = (category?: string, q?: string) => this.get<M.Course[]>('/learning/courses', { category, q });
  course = (slug: string) => this.get<M.Course>(`/learning/courses/${slug}`);
  createCourse = (b: { title: string; description: string; category: string; thumbnailUrl?: string }) => this.post<M.Course>('/learning/courses', b);
  addLesson = (id: string, b: { title: string; videoUrl: string; durationSec: number; description: string; sortOrder: number }) => this.post<M.Course>(`/learning/courses/${id}/lessons`, b);
  publishCourse = (id: string) => this.post<M.Course>(`/learning/courses/${id}/publish`);
  enroll = (courseId: string) => this.post<M.Enrollment>(`/learning/enrollments/${courseId}`);
  myCourses = () => this.get<M.Enrollment[]>('/learning/my-courses');
  lessonProgress = (enrollmentId: string, lessonId: string, watchedSeconds: number) => this.post<M.LessonProgress>('/learning/progress', { enrollmentId, lessonId, watchedSeconds });
  rateCourse = (id: string, rating: number, review: string) => this.post<M.Course>(`/learning/courses/${id}/ratings`, { rating, review });

  challenges = () => this.get<M.Challenge[]>('/community/challenges');
  createChallenge = (b: { title: string; description: string; metric: string; targetValue: number; startsAt: string; endsAt: string }) => this.post<M.Challenge>('/community/challenges', b);
  joinChallenge = (id: string) => this.post<M.MyChallenge>(`/community/challenges/${id}/join`);
  myChallenges = () => this.get<M.MyChallenge[]>('/community/challenges/me');
  createCircle = (name: string, description: string) => this.post<M.Circle>('/community/circles', { name, description });
  joinCircle = (inviteCode: string) => this.post<M.Circle>('/community/circles/join', { inviteCode });
  myCircles = () => this.get<M.Circle[]>('/community/circles/me');
  circleMembers = (id: string) => this.get<M.CircleMember[]>(`/community/circles/${id}/members`);
  badges = () => this.get<M.Badge[]>('/community/badges');
  myBadges = () => this.get<M.Badge[]>('/community/badges/me');

  createEvaluation = (b: M.EvaluationRequest) => this.post<M.Evaluation>('/recitation/evaluations', b);
  evaluations = () => this.get<M.Evaluation[]>('/recitation/evaluations');
  evaluation = (id: string) => this.get<M.Evaluation>(`/recitation/evaluations/${id}`);
}
