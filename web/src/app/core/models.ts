export interface TokenResponse { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number; }
export interface UserResponse { id: string; name: string; email: string; role: 'USER' | 'TEACHER' | 'ADMIN'; emailVerified: boolean; }
export interface MessageResponse { message: string; }

export interface ProfileResponse { userId: string; name: string; profileImageUrl: string | null; country: string | null; timezone: string | null; preferredReciterId: number | null; preferredLanguage?: string | null; createdAt: string; updatedAt: string; }
export interface UpdateProfileRequest { name?: string; profileImageUrl?: string; country?: string; timezone?: string; preferredReciterId?: number | null; preferredLanguage?: string; }
export interface PreferencesResponse { pushEnabled: boolean; emailEnabled: boolean; memorizationReminderTime: string | null; revisionReminderTime: string | null; prayerReminders: boolean; azkarReminders: boolean; }
export type PreferencesRequest = Partial<PreferencesResponse>;

export interface Surah { id: number; nameAr: string; nameEn: string; transliteration: string; revelationType: string; revelationTypeAr?: string | null; ayahCount: number; startPage: number | null; startJuz: number | null; }
export interface Ayah { id: number; surahId: number; ayahNumber: number; textUthmani: string; textSimple: string; page: number | null; juz: number | null; hizb: number | null; }
export interface Reciter { id: number; nameAr: string; nameEn: string; country: string; countryAr?: string | null; style: string; styleAr?: string | null; hasAyahAudio?: boolean; hasSurahAudio?: boolean; hasTimings?: boolean; }
export interface AyahAudio { reciterId: number; surahId: number; ayahNumber: number; audioUrl: string; }
export interface AyahTiming { ayah: number; start: number; end: number; }
export interface SurahTimings { reciterId: number; surahId: number; ayahs: AyahTiming[]; }
export interface SurahAudio { reciterId: number; surahId: number; surahNameEn: string; url: string; format: string; }
export interface Paged<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; }
export interface Bookmark { id: string; ayahId: number; note: string | null; createdAt: string; }
export interface ReadingState { lastAyahId: number; lastReadAt: string; }
export interface ReadingHistory { ayahId: number; readAt: string; }

export interface Plan { id: string; startingSurahId: number; startingAyah: number; targetSurahId: number; startDate: string; targetDate: string; dailyAyahTarget: number; weeklyAyahTarget: number; status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'; currentSurahId: number; currentAyah: number; }
export interface CreatePlanRequest { startingSurahId: number; startingAyah: number; targetSurahId: number; targetDate: string; }
export interface Task { id: string; taskDate: string; surahId: number; fromAyah: number; toAyah: number; taskType: string; completed: boolean; completedAt: string | null; }
export interface PlanProgress { planId: string; status: string; totalAyahs: number; memorizedAyahs: number; progressPercent: number; currentSurahId: number; currentAyah: number; dailyAyahTarget: number; daysRemaining: number; }

export interface RevisionItem { id: string; surahId: number; fromAyah: number; toAyah: number; nextRevisionDate: string; intervalDays: number; lastAccuracy: number | null; difficulty: string; status: string; }
export interface RevisionStats { dueNow: number; scheduled: number; mastered: number; }
export interface ReviewResponse { itemId: string; nextIntervalDays: number; nextRevisionDate: string; difficulty: string; mastered: boolean; }

export interface AppNotification { id: string; type: string; title: string; body: string; channel: string; status: string; language?: string; createdAt: string; readAt: string | null; }

export interface PrayerTimes { date: string; method: string; timezone: string; times: Record<string, string>; hijriDate: string; namesAr?: Record<string, string>; hijriDateAr?: string | null; }
export interface PrayerSettings { latitude: number; longitude: number; method: string; timezone: string; asrFactor: number; }
export interface Qibla { latitude: number; longitude: number; bearingDegrees: number; direction: string; }
export interface Hijri { gregorian: string; hijri: string; hijriYear: number; hijriMonth: number; hijriDay: number; monthName: string; note: string; hijriAr?: string | null; monthNameAr?: string | null; noteAr?: string | null; }

export interface AzkarCategory { id: number; code: string; nameEn: string; nameAr: string; itemCount: number; }
export interface AzkarItem { id: number; textAr: string; textEn?: string | null; repeatTarget: number; reference: string; referenceAr?: string | null; todayCount: number; done: boolean; }
export interface AzkarToday { code: string; nameEn: string; nameAr: string; completedItems: number; totalItems: number; complete: boolean; items: AzkarItem[]; }
export interface AzkarProgress { itemId: number; count: number; repeatTarget: number; itemDone: boolean; categoryComplete: boolean; }
export interface AzkarStreak { categoryCode: string; currentStreak: number; longestStreak: number; lastCompletedDate: string | null; }

export interface Lesson { lessonId: string; title: string; videoUrl: string; durationSec: number; description: string; sortOrder: number; }
export interface Course { id: string; title: string; slug: string; description: string; teacherId: string; category: string; thumbnailUrl: string | null; status: string; lessons: Lesson[]; ratingAvg: number; ratingCount: number; }
export interface Enrollment { id: string; courseId: string; courseTitle: string; status: string; enrolledAt: string; lessonsCompleted: number; lessonsTotal: number; }
export interface LessonProgress { enrollmentId: string; lessonId: string; watchedSeconds: number; completed: boolean; }

export interface Challenge { id: string; code: string; title: string; description: string; metric: string; targetValue: number; startsAt: string; endsAt: string; participants: number; }
export interface MyChallenge { challengeId: string; progress: number; completed: boolean; joinedAt: string; completedAt: string | null; }
export interface Circle { id: string; name: string; description: string; inviteCode: string; createdAt: string; }
export interface CircleMember { [key: string]: string; }
export interface Badge { code: string; title: string; titleAr?: string | null; description: string | null; descriptionAr?: string | null; triggerType: string | null; threshold: number; awardedAt: string | null; }

export interface Evaluation { id: string; surahId: number; fromAyah: number; toAyah: number; status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'; evaluationMode: string | null; mistakeCount: number | null; accuracy: number | null; mistakes: string | null; error: string | null; createdAt: string; completedAt: string | null; }
export interface EvaluationRequest { surahId: number; fromAyah: number; toAyah: number; audioUrl?: string; transcript?: string; expectedText: string; }
export interface Mistake { type: string; expected: string; actual: string; position: number; }

export interface EditionInfo { key: string; kind: string; language: string; version: string; title: string; publisher: string; source: string; terms: string; retrieved: string; }
export interface EditionEntry { fromAyah: number; toAyah: number; text: string; notes?: string | null; }
export interface EditionAyah { edition: EditionInfo; surah: number; ayah: number; entries: EditionEntry[]; }
export interface PrayerTracker { from: string; to: string; days: Record<string, string[]>; currentStreak: number; bestStreakInRange: number; prayedInRange: number; possibleInRange: number; }
export interface Adhan { id: string; name: string; nameAr?: string | null; url: string; }
export interface TasbeehSummary { date: string; today: Record<string, number>; lifetime: Record<string, number>; }
export interface Khatma { id: string; startDate: string; targetDate: string; currentPage: number; totalPages: number; percent: number; daysLeft: number; pagesPerDay: number; onTrack: boolean; completed: boolean; completedOn: string | null; }
export interface EditionHit { surah: number; ayah: number; snippet: string; }
export interface DailyAyah { date: string; ayah: Ayah; }
