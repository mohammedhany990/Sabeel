import http from 'node:http';
import crypto from 'node:crypto';
import { SURAHS, TEXTS, RECITERS, AZKAR } from './data.mjs';

const PORT = Number(process.env.PORT || 8080);
const TTL = Number(process.env.MOCK_TOKEN_TTL_SECONDS || 900);
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const day = (d = new Date()) => d.toISOString().slice(0, 10);
const addDays = (n) => day(new Date(Date.now() + n * 86400000));

const starts = [];
let acc = 0;
for (const s of SURAHS) { starts.push(acc + 1); acc += s[4]; }
const START_PAGES = [1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604];
const surahList = SURAHS.map((s, i) => ({ id: i + 1, nameAr: s[2], nameEn: s[1], transliteration: s[0], revelationType: s[3], revelationTypeAr: s[3] === 'Meccan' ? 'مكية' : 'مدنية', ayahCount: s[4], startPage: START_PAGES[i], startJuz: null }));
const ayahsOf = (sid) => (TEXTS[sid] || []).map((t, i) => ({ id: starts[sid - 1] + i, surahId: sid, ayahNumber: i + 1, textUthmani: t, textSimple: t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/ٱ/g, 'ا'), page: null, juz: null, hizb: null }));

const db = { requestLog: [], users: [], tokens: new Map(), refresh: new Map(), profiles: new Map(), prefs: new Map(), bookmarks: [], state: new Map(), history: [], plans: [], tasks: [], revisions: [], notes: [], azkarLog: new Map(), streaks: new Map(), courses: [], enrollments: [], progress: new Map(), ratings: new Map(), challenges: [], parts: [], circles: [], members: [], evals: [], badges: new Map(), stats: new Map(), settings: new Map() };

db.courses.push({ id: uid(), title: 'Tajweed Foundations', slug: 'tajweed-foundations', description: 'Makharij, sifat and the core rules, with practice drills for every lesson.', teacherId: 'seed', category: 'TAJWEED', thumbnailUrl: null, status: 'PUBLISHED', lessons: [
  { lessonId: 'l1', title: 'Letters and their points of articulation', videoUrl: 'https://example.com/video1', durationSec: 600, description: 'Where each letter comes from.', sortOrder: 0 },
  { lessonId: 'l2', title: 'Noon sakinah and tanween', videoUrl: 'https://example.com/video2', durationSec: 540, description: 'Izhar, idgham, iqlab and ikhfa.', sortOrder: 1 }], ratingAvg: 0, ratingCount: 0 });
db.challenges.push({ id: uid(), code: 'WEEK10', title: 'Ten tasks this week', description: 'Complete ten memorization tasks.', metric: 'MEMORIZATION_TASKS', targetValue: 10, startsAt: now(), endsAt: addDays(30) + 'T00:00:00Z', participants: 0 });
const BADGES = [
  { code: 'FIRST_TASK', title: 'First Step', titleAr: 'الخطوة الأولى', descriptionAr: 'أكمل أول مهمة حفظ لك', description: 'Complete your first memorization task', triggerType: 'MEMORIZATION_TASKS', threshold: 1, awardedAt: null },
  { code: 'TASKS_10', title: 'Consistent', titleAr: 'المثابر', descriptionAr: 'أكمل ١٠ مهام حفظ', description: 'Complete 10 memorization tasks', triggerType: 'MEMORIZATION_TASKS', threshold: 10, awardedAt: null },
  { code: 'STREAK_7', title: 'Week of Worship', titleAr: 'أسبوع العبادة', descriptionAr: 'حافظ على الأذكار ٧ أيام متتالية', description: 'Reach a 7-day azkar streak', triggerType: 'STREAK_DAYS', threshold: 7, awardedAt: null }
];

const AR_TITLES = { 400: 'طلب غير صالح', 401: 'غير مصرّح', 403: 'ممنوع', 404: 'غير موجود', 409: 'تعارض', 500: 'خطأ في الخادم' };
const AR_DETAILS = { 'Invalid credentials': 'بيانات الدخول غير صحيحة', 'Email already registered': 'البريد الإلكتروني مسجّل بالفعل', 'invalid or expired token': 'الرمز غير صالح أو منتهي', 'You already have an active plan': 'لديك خطة نشطة بالفعل', 'Unknown invite code': 'رمز الدعوة غير معروف', 'Course not found': 'الدورة غير موجودة', 'Teacher role required': 'مطلوب دور معلّم', 'Admin role required': 'مطلوب دور مشرف' };
let currentLang = 'en';
const problem = (res, status, detail) => send(res, status, currentLang === 'ar' ? { type: 'about:blank', title: AR_TITLES[status] || http.STATUS_CODES[status], status, detail: AR_DETAILS[detail] || detail } : { type: 'about:blank', title: http.STATUS_CODES[status], status, detail }, 'application/problem+json');
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Language': currentLang, 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const readBody = (req) => new Promise((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } }); });
const newTokens = (user) => {
  const accessToken = 'at.' + crypto.randomBytes(16).toString('hex');
  const refreshToken = 'rt.' + crypto.randomBytes(16).toString('hex');
  db.tokens.set(accessToken, { userId: user.id, exp: Date.now() + TTL * 1000 });
  db.refresh.set(refreshToken, user.id);
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: TTL };
};
const notify = (userId, type, title, body, ar) => {
  const lang = db.profiles.get(userId)?.preferredLanguage === 'ar' && ar ? 'ar' : 'en';
  const text = lang === 'ar' ? ar : { title, body };
  db.notes.unshift({ id: uid(), userId, type, title: text.title, body: text.body, language: lang, channel: 'PUSH', status: 'SENT', createdAt: now(), readAt: null });
};
const bump = (userId, metric, value = 1, set = false) => {
  const key = userId + metric;
  const v = set ? Math.max(db.stats.get(key) || 0, value) : (db.stats.get(key) || 0) + value;
  db.stats.set(key, v);
  const earned = db.badges.get(userId) || [];
  for (const b of BADGES) if (b.triggerType === metric && v >= b.threshold && !earned.find((e) => e.code === b.code)) { earned.push({ code: b.code, title: b.title, description: null, triggerType: null, threshold: 0, awardedAt: now() }); notify(userId, 'BADGE', 'Badge earned', b.title); }
  db.badges.set(userId, earned);
  for (const p of db.parts.filter((p) => p.userId === userId && !p.completedAt)) {
    const c = db.challenges.find((c) => c.id === p.challengeId);
    if (c && c.metric === metric) { p.progress = set ? Math.max(p.progress, value) : p.progress + value; if (p.progress >= c.targetValue) p.completedAt = now(); }
  }
};
const planCalc = (b) => {
  let remaining = 0;
  for (let s = b.startingSurahId; s <= b.targetSurahId; s++) remaining += SURAHS[s - 1][4] - (s === b.startingSurahId ? b.startingAyah - 1 : 0);
  const days = Math.max(1, Math.round((new Date(b.targetDate) - new Date(day())) / 86400000));
  return { total: remaining, daily: Math.ceil(remaining / days), days };
};
const taskFor = (plan, date) => {
  const { daily } = planCalc({ startingSurahId: plan.currentSurahId, startingAyah: plan.currentAyah, targetSurahId: plan.targetSurahId, targetDate: plan.targetDate });
  const to = Math.min(SURAHS[plan.currentSurahId - 1][4], plan.currentAyah + plan.dailyAyahTarget - 1);
  return { id: uid(), planId: plan.id, userId: plan.userId, taskDate: date, surahId: plan.currentSurahId, fromAyah: plan.currentAyah, toAyah: to, taskType: 'NEW', completed: false, completedAt: null, daily };
};
const bearing = (lat, lng) => {
  const r = Math.PI / 180, kl = 21.4225 * r, kn = 39.8262 * r, l1 = lat * r, dn = kn - lng * r;
  const y = Math.sin(dn) * Math.cos(kl), x = Math.cos(l1) * Math.sin(kl) - Math.sin(l1) * Math.cos(kl) * Math.cos(dn);
  return (Math.atan2(y, x) / r + 360) % 360;
};
const dirName = (b) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(b / 45) % 8];
const normalize = (t) => t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').split(/\s+/).filter(Boolean);
const align = (exp, got) => {
  const m = [], e = normalize(exp), g = normalize(got);
  const n = Math.max(e.length, g.length);
  for (let i = 0; i < n; i++) {
    if (e[i] === undefined) m.push({ type: 'ADDITION', expected: '', actual: g[i], position: i });
    else if (g[i] === undefined) m.push({ type: 'OMISSION', expected: e[i], actual: '', position: i });
    else if (e[i] !== g[i]) m.push({ type: 'SUBSTITUTION', expected: e[i], actual: g[i], position: i });
  }
  return { mistakes: m, accuracy: Math.max(0, 100 * (1 - m.length / Math.max(1, e.length))) };
};

const routes = [];
const route = (method, pattern, handler, pub = false) => routes.push({ method, re: new RegExp('^' + pattern.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '$'), handler, pub });

route('POST', '/auth/register', async ({ body }) => {
  if (!body.email || !body.password || body.password.length < 8 || !body.name) return [400, { detail: 'name, email and a password of at least 8 characters are required' }];
  if (db.users.find((u) => u.email === body.email.toLowerCase())) return [409, { detail: 'Email already registered' }];
  const role = body.email.startsWith('teacher') ? 'TEACHER' : body.email.startsWith('admin') ? 'ADMIN' : 'USER';
  const u = { id: uid(), name: body.name, email: body.email.toLowerCase(), password: body.password, role, emailVerified: false };
  db.users.push(u);
  db.profiles.set(u.id, { userId: u.id, name: u.name, profileImageUrl: null, country: null, timezone: null, preferredReciterId: null, preferredLanguage: body.language === 'ar' ? 'ar' : 'en', createdAt: now(), updatedAt: now() });
  db.prefs.set(u.id, { pushEnabled: true, emailEnabled: true, memorizationReminderTime: '06:00:00', revisionReminderTime: '20:00:00', prayerReminders: true, azkarReminders: true, revisionReminders: true });
  notify(u.id, 'WELCOME', 'Welcome to Sabeel', 'Your account is ready. Create a memorization plan to begin.', { title: 'مرحبًا بك في سبيل', body: 'حسابك جاهز. أنشئ خطة حفظ لتبدأ.' });
  return [201, { id: u.id, name: u.name, email: u.email, role: u.role, emailVerified: false }];
}, true);
route('POST', '/auth/login', async ({ body }) => {
  const u = db.users.find((x) => x.email === (body.email || '').toLowerCase() && x.password === body.password);
  return u ? [200, newTokens(u)] : [401, { detail: 'Invalid credentials' }];
}, true);
route('POST', '/auth/refresh', async ({ body }) => {
  const id = db.refresh.get(body.refreshToken);
  if (!id) return [401, { detail: 'Invalid refresh token' }];
  db.refresh.delete(body.refreshToken);
  return [200, newTokens(db.users.find((u) => u.id === id))];
}, true);
route('POST', '/auth/logout', async ({ body }) => { db.refresh.delete(body.refreshToken); return [200, { message: 'Logged out' }]; });
route('POST', '/auth/change-password', async ({ user, body }) => {
  if (user.password !== body.currentPassword) return [400, { detail: 'current password is incorrect' }];
  if (!body.newPassword || body.newPassword.length < 8) return [400, { detail: 'validation failed' }];
  user.password = body.newPassword;
  for (const [tok, id] of [...db.refresh]) if (id === user.id && tok !== body.keepRefreshToken) db.refresh.delete(tok);
  return [200, { message: 'password updated' }];
});
route('POST', '/auth/forgot-password', async () => [200, { message: 'If the email exists, a reset link was sent.' }], true);
route('POST', '/auth/reset-password', async () => [200, { message: 'Password updated.' }], true);
route('GET', '/auth/verify-email', async () => [200, { message: 'Email verified.' }], true);
route('GET', '/auth/me', async ({ user }) => [200, { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified }]);

route('GET', '/users/me', async ({ user }) => [200, db.profiles.get(user.id)]);
route('PUT', '/users/me', async ({ user, body }) => { const p = { ...db.profiles.get(user.id), ...body, updatedAt: now() }; db.profiles.set(user.id, p); user.name = p.name; return [200, p]; });
route('GET', '/users/me/preferences', async ({ user }) => [200, db.prefs.get(user.id)]);
route('PUT', '/users/me/preferences', async ({ user, body }) => { const p = { ...db.prefs.get(user.id), ...body }; db.prefs.set(user.id, p); return [200, p]; });
route('POST', '/users/me/device-tokens', async () => [200, undefined]);

route('GET', '/quran/surahs', async () => [200, surahList], true);
route('GET', '/quran/surahs/{id}', async ({ p }) => [200, ayahsOf(Number(p.id))], true);
route('GET', '/quran/ayahs/{surah}/{number}', async ({ p }) => {
  const a = ayahsOf(Number(p.surah)).find((x) => x.ayahNumber === Number(p.number));
  return a ? [200, a] : [404, { title: 'Not Found', detail: 'Ayah not found' }];
}, true);
route('GET', '/quran/search', async ({ q }) => {
  const term = (q.get('q') || '').trim();
  const all = Object.keys(TEXTS).flatMap((s) => ayahsOf(Number(s))).filter((a) => a.textSimple.includes(term) || a.textUthmani.includes(term));
  return [200, { content: all, page: 0, size: 20, totalElements: all.length, totalPages: 1 }];
}, true);
const EDITIONS = [
  { key: 'arabic_moyassar', kind: 'tafsir', language: 'ar', version: '1', title: 'Al-Tafsir Al-Muyassar', publisher: 'Mock', source: 'https://quranenc.com', terms: 'https://quranenc.com', retrieved: '2026-11-26' },
  { key: 'english_rwwad', kind: 'translation', language: 'en', version: '1', title: 'English translation', publisher: 'Mock', source: 'https://quranenc.com', terms: 'https://quranenc.com', retrieved: '2026-11-26' }
];
route('GET', '/quran/editions', async () => [200, EDITIONS], true);
route('GET', '/quran/editions/{key}/{surah}/{number}', async ({ p }) => {
  const e = EDITIONS.find((x) => x.key === p.key);
  if (!e) return [404, { detail: 'Unknown edition' }];
  return [200, { edition: e, surah: Number(p.surah), ayah: Number(p.number), entries: [{ fromAyah: Number(p.number), toAyah: Number(p.number), text: 'Mock text for ' + p.surah + ':' + p.number }] }];
}, true);
route('GET', '/quran/reciters', async () => [200, RECITERS], true);
route('GET', '/quran/reciters/{id}/audio', async ({ p, q }) => {
  const s = String(q.get('surah')).padStart(3, '0'), a = String(q.get('ayah')).padStart(3, '0');
  return [200, { reciterId: Number(p.id), surahId: Number(q.get('surah')), ayahNumber: Number(q.get('ayah')), audioUrl: `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3` }];
}, true);
route('GET', '/quran/reciters/{id}/surahs/{sid}/audio', async ({ p }) => [200, { reciterId: Number(p.id), surahId: Number(p.sid), surahNameEn: SURAHS[p.sid - 1][0], url: `https://server8.mp3quran.net/afs/${String(p.sid).padStart(3, '0')}.mp3`, format: 'mp3' }], true);
route('GET', '/quran/bookmarks', async ({ user }) => [200, db.bookmarks.filter((b) => b.userId === user.id)]);
route('POST', '/quran/bookmarks', async ({ user, body }) => { const b = { id: uid(), userId: user.id, ayahId: body.ayahId, note: body.note || null, createdAt: now() }; db.bookmarks.push(b); return [200, b]; });
route('DELETE', '/quran/bookmarks/{id}', async ({ p }) => { db.bookmarks = db.bookmarks.filter((b) => b.id !== p.id); return [200, undefined]; });
route('GET', '/quran/reading-state', async ({ user }) => { const s = db.state.get(user.id); return s ? [200, s] : [404, { detail: 'No reading state yet' }]; });
route('PUT', '/quran/reading-state', async ({ user, body }) => { const s = { lastAyahId: body.lastAyahId, lastReadAt: now() }; db.state.set(user.id, s); db.history.unshift({ userId: user.id, ayahId: s.lastAyahId, readAt: s.lastReadAt }); return [200, s]; });
route('GET', '/quran/reading-history', async ({ user }) => { const c = db.history.filter((h) => h.userId === user.id); return [200, { content: c.slice(0, 20), page: 0, size: 20, totalElements: c.length, totalPages: 1 }]; });

route('POST', '/memorization/plans', async ({ user, body }) => {
  if (db.plans.find((p) => p.userId === user.id && p.status === 'ACTIVE')) return [409, { detail: 'You already have an active plan' }];
  const c = planCalc(body);
  const plan = { id: uid(), userId: user.id, startingSurahId: body.startingSurahId, startingAyah: body.startingAyah, targetSurahId: body.targetSurahId, startDate: day(), targetDate: body.targetDate, dailyAyahTarget: c.daily, weeklyAyahTarget: c.daily * 7, status: 'ACTIVE', currentSurahId: body.startingSurahId, currentAyah: body.startingAyah, total: c.total, done: 0 };
  db.plans.push(plan);
  db.tasks.push(taskFor(plan, day()));
  return [201, plan];
});
route('GET', '/memorization/plans/me', async ({ user }) => [200, db.plans.filter((p) => p.userId === user.id)]);
route('PATCH', '/memorization/plans/{id}', async ({ p, q }) => { const plan = db.plans.find((x) => x.id === p.id); plan.status = q.get('status'); return [200, plan]; });
route('GET', '/memorization/plans/{id}/progress', async ({ p }) => {
  const x = db.plans.find((y) => y.id === p.id);
  return [200, { planId: x.id, status: x.status, totalAyahs: x.total, memorizedAyahs: x.done, progressPercent: (x.done / x.total) * 100, currentSurahId: x.currentSurahId, currentAyah: x.currentAyah, daysRemaining: Math.max(0, Math.round((new Date(x.targetDate) - new Date()) / 86400000)), dailyAyahTarget: x.dailyAyahTarget }];
});
route('GET', '/memorization/tasks/today', async ({ user }) => [200, db.tasks.filter((t) => t.userId === user.id && t.taskDate === day())]);
route('POST', '/memorization/tasks/{id}/complete', async ({ user, p, body }) => {
  const t = db.tasks.find((x) => x.id === p.id);
  t.completed = true; t.completedAt = now();
  const plan = db.plans.find((x) => x.id === t.planId);
  const count = t.toAyah - t.fromAyah + 1;
  plan.done += count;
  if (t.toAyah >= SURAHS[t.surahId - 1][4]) { plan.currentSurahId = t.surahId + 1; plan.currentAyah = 1; } else plan.currentAyah = t.toAyah + 1;
  if (plan.currentSurahId > plan.targetSurahId) { plan.status = 'COMPLETED'; bump(user.id, 'PLANS_COMPLETED'); }
  db.revisions.push({ id: uid(), userId: user.id, surahId: t.surahId, fromAyah: t.fromAyah, toAyah: t.toAyah, nextRevisionDate: day(), intervalDays: 1, lastAccuracy: body.accuracy, difficulty: body.accuracy < 70 ? 'HARD' : 'NORMAL', status: 'DUE' });
  bump(user.id, 'MEMORIZATION_TASKS');
  notify(user.id, 'MEMORIZATION', 'Task completed', `Accuracy ${body.accuracy}%. Revision scheduled.`);
  return [200, t];
});

route('GET', '/revision/due', async ({ user }) => [200, db.revisions.filter((r) => r.userId === user.id && r.nextRevisionDate <= day() && r.status !== 'MASTERED')]);
route('GET', '/revision/upcoming', async ({ user, q }) => [200, db.revisions.filter((r) => r.userId === user.id && r.status !== 'MASTERED' && r.nextRevisionDate <= addDays(Number(q.get('days') || 7)))]);
route('GET', '/revision/stats', async ({ user }) => { const l = db.revisions.filter((r) => r.userId === user.id); return [200, { dueNow: l.filter((r) => r.status !== 'MASTERED' && r.nextRevisionDate <= day()).length, scheduled: l.filter((r) => r.status !== 'MASTERED').length, mastered: l.filter((r) => r.status === 'MASTERED').length }]; });
route('POST', '/revision/items/{id}/review', async ({ p, body }) => {
  const r = db.revisions.find((x) => x.id === p.id);
  const ladder = [1, 3, 7, 14, 30, 60];
  const i = ladder.indexOf(r.intervalDays);
  const next = body.accuracy >= 90 ? (ladder[i + 1] ?? 60) : body.accuracy >= 70 ? r.intervalDays : ladder[Math.max(0, i - 2)];
  r.intervalDays = next; r.nextRevisionDate = addDays(next); r.lastAccuracy = body.accuracy; r.difficulty = body.accuracy < 70 ? 'HARD' : 'NORMAL';
  const mastered = body.accuracy >= 90 && i === ladder.length - 1;
  if (mastered) r.status = 'MASTERED';
  return [200, { itemId: r.id, nextIntervalDays: next, nextRevisionDate: r.nextRevisionDate, difficulty: r.difficulty, mastered }];
});

route('GET', '/notifications/me', async ({ user }) => [200, db.notes.filter((n) => n.userId === user.id)]);
route('POST', '/notifications/me/{id}/read', async ({ p }) => { const n = db.notes.find((x) => x.id === p.id); if (n) n.readAt = now(); return [200, undefined]; });

const PRAYER_BASE = { fajr: '04:52', sunrise: '06:20', dhuhr: '11:44', asr: '14:42', maghrib: '17:07', isha: '18:29' };
const NAMES_AR = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const timesFor = (date, tz) => Object.fromEntries(Object.entries(PRAYER_BASE).map(([k, v]) => [k, `${date}T${v}:00+02:00`]));
route('GET', '/prayer/times', async ({ user, q }) => {
  const s = db.settings.get(user.id);
  const date = q.get('date') || day();
  return [200, { date, method: q.get('method') || s?.method || 'EGYPT', timezone: s?.timezone || 'Africa/Cairo', times: timesFor(date), hijriDate: '14 Jumada al-Ula 1448 AH', namesAr: NAMES_AR, hijriDateAr: '١٤ جمادى الأولى ١٤٤٨ هـ' }];
});
route('GET', '/prayer/times/month', async ({ user, q }) => {
  const y = Number(q.get('year')), m = Number(q.get('month'));
  const n = new Date(y, m, 0).getDate();
  return [200, Array.from({ length: n }, (_, i) => { const date = `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`; return { date, method: 'EGYPT', timezone: 'Africa/Cairo', times: timesFor(date), hijriDate: '', namesAr: NAMES_AR, hijriDateAr: null }; })];
});
route('GET', '/prayer/qibla', async ({ q }) => { const b = bearing(Number(q.get('lat')), Number(q.get('lng'))); return [200, { latitude: Number(q.get('lat')), longitude: Number(q.get('lng')), bearingDegrees: b, direction: dirName(b) }]; });
route('GET', '/prayer/hijri', async ({ q }) => [200, { gregorian: q.get('date') || day(), hijri: '14 Jumada al-Ula 1448', hijriYear: 1448, hijriMonth: 5, hijriDay: 14, hijriAr: '١٤ جمادى الأولى ١٤٤٨ هـ', monthNameAr: 'جمادى الأولى', noteAr: 'تقويم هجري مدني جدولي؛ قد يختلف بيوم عن التقاويم المعتمدة على رؤية الهلال.', monthName: 'Jumada al-Ula', note: 'Tabular civil calendar' }]);
route('GET', '/prayer/settings', async ({ user }) => { const s = db.settings.get(user.id); return s ? [200, s] : [404, { detail: 'No prayer settings saved' }]; });
route('PUT', '/prayer/settings', async ({ user, body }) => { const s = { latitude: body.latitude, longitude: body.longitude, method: body.method, timezone: body.timezone, asrFactor: body.asrFactor || 1 }; db.settings.set(user.id, s); return [200, s]; });

const azkarToday = (userId) => AZKAR.map((c) => {
  const items = c.items.map((i) => { const n = db.azkarLog.get(userId + day() + i.id) || 0; return { id: i.id, textAr: i.textAr, textEn: i.textEn ?? null, repeatTarget: i.repeatTarget, reference: i.reference, referenceAr: i.referenceAr ?? null, todayCount: n, done: n >= i.repeatTarget }; });
  return { code: c.code, nameEn: c.nameEn, nameAr: c.nameAr, completedItems: items.filter((i) => i.done).length, totalItems: items.length, complete: items.every((i) => i.done), items };
});
route('GET', '/azkar/categories', async () => [200, AZKAR.map((c) => ({ id: c.id, code: c.code, nameEn: c.nameEn, nameAr: c.nameAr, itemCount: c.items.length }))]);
route('GET', '/azkar/today', async ({ user }) => [200, azkarToday(user.id)]);
route('GET', '/azkar/streaks', async ({ user }) => [200, AZKAR.map((c) => db.streaks.get(user.id + c.code) || { categoryCode: c.code, currentStreak: 0, longestStreak: 0, lastCompletedDate: null })]);
route('POST', '/azkar/items/{id}/progress', async ({ user, p }) => {
  const item = AZKAR.flatMap((c) => c.items).find((i) => i.id === Number(p.id));
  const cat = AZKAR.find((c) => c.items.includes(item));
  const key = user.id + day() + item.id;
  const n = Math.min(item.repeatTarget, (db.azkarLog.get(key) || 0) + 1);
  db.azkarLog.set(key, n);
  const complete = azkarToday(user.id).find((c) => c.code === cat.code).complete;
  if (complete) { const s = db.streaks.get(user.id + cat.code) || { categoryCode: cat.code, currentStreak: 0, longestStreak: 0, lastCompletedDate: null }; if (s.lastCompletedDate !== day()) { s.currentStreak += 1; s.longestStreak = Math.max(s.longestStreak, s.currentStreak); s.lastCompletedDate = day(); db.streaks.set(user.id + cat.code, s); bump(user.id, 'STREAK_DAYS', s.currentStreak, true); } }
  return [200, { itemId: item.id, count: n, repeatTarget: item.repeatTarget, itemDone: n >= item.repeatTarget, categoryComplete: complete }];
});

route('GET', '/learning/courses', async ({ q }) => [200, db.courses.filter((c) => c.status === 'PUBLISHED' && (!q.get('category') || c.category === q.get('category')) && (!q.get('q') || c.title.toLowerCase().includes(q.get('q').toLowerCase())))], true);
route('GET', '/learning/courses/{slug}', async ({ p }) => { const c = db.courses.find((x) => x.slug === p.slug); return c ? [200, c] : [404, { detail: 'Course not found' }]; });
route('POST', '/learning/courses', async ({ user, body }) => {
  if (user.role === 'USER') return [403, { detail: 'Teacher role required' }];
  const c = { id: uid(), title: body.title, slug: body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), description: body.description || '', teacherId: user.id, category: body.category, thumbnailUrl: body.thumbnailUrl || null, status: 'DRAFT', lessons: [], ratingAvg: 0, ratingCount: 0 };
  db.courses.push(c);
  return [200, c];
});
route('POST', '/learning/courses/{id}/lessons', async ({ p, body }) => { const c = db.courses.find((x) => x.id === p.id); c.lessons.push({ lessonId: uid(), ...body }); return [200, c]; });
route('POST', '/learning/courses/{id}/publish', async ({ p }) => { const c = db.courses.find((x) => x.id === p.id); if (!c.lessons.length) return [400, { detail: 'A course needs at least one lesson to be published' }]; c.status = 'PUBLISHED'; return [200, c]; });
route('POST', '/learning/enrollments/{courseId}', async ({ user, p }) => {
  const c = db.courses.find((x) => x.id === p.courseId);
  let e = db.enrollments.find((x) => x.userId === user.id && x.courseId === c.id);
  if (!e) { e = { id: uid(), userId: user.id, courseId: c.id, courseTitle: c.title, status: 'ACTIVE', enrolledAt: now(), lessonsCompleted: 0, lessonsTotal: c.lessons.length }; db.enrollments.push(e); }
  return [200, e];
});
route('GET', '/learning/my-courses', async ({ user }) => [200, db.enrollments.filter((e) => e.userId === user.id)]);
route('POST', '/learning/progress', async ({ body }) => {
  const e = db.enrollments.find((x) => x.id === body.enrollmentId);
  const c = db.courses.find((x) => x.id === e.courseId);
  const l = c.lessons.find((x) => x.lessonId === body.lessonId);
  const key = e.id + l.lessonId;
  const watched = Math.min(l.durationSec, (db.progress.get(key) || 0) + body.watchedSeconds);
  db.progress.set(key, watched);
  const completed = watched >= l.durationSec * 0.95;
  e.lessonsCompleted = c.lessons.filter((x) => (db.progress.get(e.id + x.lessonId) || 0) >= x.durationSec * 0.95).length;
  return [200, { enrollmentId: e.id, lessonId: l.lessonId, watchedSeconds: watched, completed }];
});
route('POST', '/learning/courses/{id}/ratings', async ({ user, p, body }) => {
  const c = db.courses.find((x) => x.id === p.id);
  db.ratings.set(c.id + user.id, body.rating);
  const all = [...db.ratings.entries()].filter(([k]) => k.startsWith(c.id)).map(([, v]) => v);
  c.ratingCount = all.length; c.ratingAvg = all.reduce((a, b) => a + b, 0) / all.length;
  return [200, c];
});

route('GET', '/community/challenges', async () => [200, db.challenges.map((c) => ({ ...c, participants: db.parts.filter((p) => p.challengeId === c.id).length }))]);
route('POST', '/community/challenges', async ({ user, body }) => { if (user.role !== 'ADMIN') return [403, { detail: 'Admin role required' }]; const c = { id: uid(), code: uid().slice(0, 6), ...body, participants: 0 }; db.challenges.push(c); return [200, c]; });
route('POST', '/community/challenges/{id}/join', async ({ user, p }) => { let x = db.parts.find((q) => q.userId === user.id && q.challengeId === p.id); if (!x) { x = { userId: user.id, challengeId: p.id, progress: 0, completedAt: null, joinedAt: now() }; db.parts.push(x); } return [200, { challengeId: x.challengeId, progress: x.progress, completed: !!x.completedAt, joinedAt: x.joinedAt, completedAt: x.completedAt }]; });
route('GET', '/community/challenges/me', async ({ user }) => [200, db.parts.filter((x) => x.userId === user.id).map((x) => ({ challengeId: x.challengeId, progress: x.progress, completed: !!x.completedAt, joinedAt: x.joinedAt, completedAt: x.completedAt }))]);
route('POST', '/community/circles', async ({ user, body }) => { const c = { id: uid(), name: body.name, description: body.description || '', inviteCode: crypto.randomBytes(4).toString('hex').toUpperCase(), createdAt: now() }; db.circles.push(c); db.members.push({ circleId: c.id, userId: user.id, role: 'OWNER' }); return [200, c]; });
route('POST', '/community/circles/join', async ({ user, body }) => { const c = db.circles.find((x) => x.inviteCode === body.inviteCode); if (!c) return [404, { detail: 'Unknown invite code' }]; if (!db.members.find((m) => m.circleId === c.id && m.userId === user.id)) db.members.push({ circleId: c.id, userId: user.id, role: 'MEMBER' }); return [200, c]; });
route('GET', '/community/circles/me', async ({ user }) => [200, db.circles.filter((c) => db.members.find((m) => m.circleId === c.id && m.userId === user.id))]);
route('GET', '/community/circles/{id}/members', async ({ user, p }) => { if (!db.members.find((m) => m.circleId === p.id && m.userId === user.id)) return [403, { detail: 'Members only' }]; return [200, db.members.filter((m) => m.circleId === p.id).map((m) => ({ userId: m.userId, role: m.role, name: db.users.find((u) => u.id === m.userId)?.name || '' }))]; });
route('GET', '/community/badges', async () => [200, BADGES]);
route('GET', '/community/badges/me', async ({ user }) => [200, db.badges.get(user.id) || []]);

route('POST', '/recitation/evaluations', async ({ user, body }) => {
  const job = { id: uid(), userId: user.id, surahId: body.surahId, fromAyah: body.fromAyah, toAyah: body.toAyah, status: 'PENDING', evaluationMode: body.transcript ? 'TRANSCRIPT_COMPARISON_DEMO' : 'UNCONFIGURED_NO_ASR', mistakeCount: null, accuracy: null, mistakes: null, error: null, createdAt: now(), completedAt: null };
  db.evals.unshift(job);
  setTimeout(() => {
    if (body.transcript) { const r = align(body.expectedText, body.transcript); job.status = 'COMPLETED'; job.accuracy = r.accuracy; job.mistakeCount = r.mistakes.length; job.mistakes = JSON.stringify(r.mistakes); }
    else { job.status = 'FAILED'; job.error = 'No speech-to-text engine is configured on this mock gateway.'; }
    job.completedAt = now();
  }, 2000);
  return [200, job];
});
route('GET', '/recitation/evaluations', async ({ user }) => [200, db.evals.filter((e) => e.userId === user.id)]);
route('GET', '/recitation/evaluations/{id}', async ({ p }) => [200, db.evals.find((e) => e.id === p.id)]);

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/v1')) return problem(res, 404, 'Not found');
  const path = url.pathname.slice(7);
  currentLang = (req.headers['accept-language'] || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
  if (path === '/__mock/requests') return send(res, 200, db.requestLog);
  db.requestLog.push({ method: req.method, path, lang: req.headers['accept-language'] || null, body: null });
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.re.exec(path);
    if (!m) continue;
    let user = null;
    if (!r.pub) {
      const t = db.tokens.get((req.headers.authorization || '').replace('Bearer ', ''));
      if (!t || t.exp < Date.now()) return problem(res, 401, 'invalid or expired token');
      user = db.users.find((u) => u.id === t.userId);
    }
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    db.requestLog[db.requestLog.length - 1].body = ['PUT'].includes(req.method) || path === '/auth/register' ? { ...body, password: undefined } : null;
    try {
      const [status, payload] = await r.handler({ req, p: m.groups || {}, q: url.searchParams, body, user });
      return send(res, status, payload, status >= 400 ? 'application/problem+json' : 'application/json');
    } catch (e) {
      return problem(res, 500, String(e.message));
    }
  }
  problem(res, 404, 'No such endpoint in the mock gateway');
}).listen(PORT, () => console.log(`Sabeel mock gateway on :${PORT}`));
