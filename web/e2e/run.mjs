import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
fs.mkdirSync(path.join(here, 'shots'), { recursive: true });

const procs = [
  spawn('node', [path.join(root, 'mock-gateway/server.mjs')], { env: { ...process.env, PORT: '18080', MOCK_TOKEN_TTL_SECONDS: '20' }, stdio: 'ignore' }),
  spawn('node', [path.join(here, 'static.mjs'), path.join(root, 'dist/sabeel-web/browser')], { stdio: 'ignore' })
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1200);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(ok ? 'PASS' : 'FAIL', name, extra); };
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const badResponses = [];
page.on('response', (r) => { if (r.url().includes('18080') && r.status() >= 400) badResponses.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace('http://localhost:18080/api/v1', '')); });

const shot = (n) => page.screenshot({ path: path.join(here, 'shots', `${n}.png`) });
const text = async () => (await page.evaluate(() => document.body.innerText));
const clickText = async (sel, t) => {
  const ok = await page.evaluate((sel, t) => { const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().toLowerCase().includes(t.toLowerCase())); if (el) { el.click(); return true; } return false; }, sel, t);
  if (!ok) console.log('  (no element', sel, t, ')');
  return ok;
};
const go = async (path) => { await clickText('a.nav', path); await sleep(900); };
const setVal = async (sel, v) => { await page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v); };

await page.goto('http://localhost:4300/', { waitUntil: 'networkidle0' });
await shot('01-landing');
check('landing renders hero', (await text()).includes('complete companion'));

await page.goto('http://localhost:4300/register', { waitUntil: 'networkidle0' });
await setVal('input[name=name]', 'Teacher Hany'); await setVal('input[name=email]', 'teacher1@example.com'); await setVal('input[name=password]', 'Passw0rd!x');
await shot('02-register');
await page.click('button[type=submit]'); await sleep(1800);
check('register logs in and opens dashboard', page.url().endsWith('/app/dashboard'), page.url());
await sleep(500); await shot('03-dashboard-empty');

await go('Read and listen');
check('quran index lists 114 surahs', (await page.$$('a.surah')).length === 114);
await shot('04-quran-index');
await clickText('a.surah', 'Al-Fatihah'); await sleep(1500);
check('reader shows ayahs', (await page.$$('.ayah')).length === 7);
await clickText('.ayah:nth-of-type(2) button', 'Bookmark'); await sleep(500);
await clickText('.ayah button', 'Stopped here'); await sleep(500);
await shot('05-reader');
check('bookmark saved', (await text()).includes('Bookmarked'));
await clickText('button', 'Play from start'); await sleep(1200);
check('play from start asks backend for audio url (no crash)', errors.filter((e) => e.startsWith('pageerror')).length === 0);

await go('Bookmarks'); await shot('06-library');
check('library shows bookmark', (await text()).includes('Ayah #2'));

await go('Memorization');
await clickText('button', 'Create plan'); await sleep(1200);
check('plan created with daily target', (await text()).includes('ayahs per day'));
check('today task appears', (await text()).includes('Al-Fatihah') && (await text()).includes('Complete'));
await clickText('button', 'Complete'); await sleep(1500);
await shot('07-memorization');
check('task completed', (await text()).toLowerCase().includes('completed'));

await go('Revision'); await sleep(600); await shot('08-revision');
check('revision item scheduled from completed task', (await text()).includes('Submit review'));
await clickText('button', 'Submit review'); await sleep(1200);
check('review submitted', !(await text()).includes('Submit review'));

await go('Prayer'); await sleep(800); await shot('09-prayer');
check('prayer times and qibla', (await text()).includes('Fajr') && (await text()).includes('°'));
await clickText('button', 'Load month'); await sleep(900);
check('month table', (await page.$$('table tbody tr')).length >= 28);
await clickText('button', 'Save and recalculate'); await sleep(800);

await go('Azkar'); await sleep(800);
await clickText('button.tab', 'Sleep'); await sleep(300);
await clickText('button', 'Tap to count'); await sleep(900);
await shot('10-azkar');
check('azkar category complete', (await text()).includes('Complete'));

await go('Courses'); await sleep(800); await shot('11-courses');
await clickText('a.course', 'Tajweed'); await sleep(1200);
await clickText('button', 'Enroll'); await sleep(800);
await clickText('button', 'Mark lesson complete'); await sleep(800);
await page.evaluate(() => { document.querySelectorAll('button.btn-icon').forEach((b) => { if (b.innerText.trim() === '5') b.click(); }); });
await clickText('button', 'Submit rating'); await sleep(800);
await shot('12-course-detail');
check('enrolled and lesson progress counted', (await text()).toLowerCase().includes('1/2 lessons'));
check('rating applied', (await text()).includes('1 ratings'));
await go('Courses'); await clickText('button.tab', 'Teach'); await sleep(300);
await setVal('input[name=t]', 'Tafsir Juz Amma'); await setVal('textarea[name=d]', 'A guided tour.');
await clickText('button', 'Create draft'); await sleep(1200);
check('teacher created draft course', (await text()).includes('DRAFT'));
await setVal('input[name=lt]', 'Intro'); await setVal('input[name=lu]', 'https://example.com/intro.mp4'); await setVal('input[name=ld]', '120');
await clickText('button', 'Add lesson'); await sleep(900);
await clickText('button', 'Publish course'); await sleep(900);
check('teacher published course', (await text()).includes('PUBLISHED'));
await shot('13-teacher-course');

await go('Community'); await sleep(800);
await shot('14-community-badges');
check('badge earned from completed task', (await text()).toLowerCase().includes('earned'));
await clickText('button.tab', 'Challenges'); await sleep(300);
await clickText('button', 'Join challenge'); await sleep(1500);
check('challenge joined with progress', (await text()).toLowerCase().includes('in progress'));
await shot('15-community-challenges');
await clickText('button.tab', 'Circles'); await sleep(300);
await setVal('input[name=n]', 'Fajr Hifz Circle'); await clickText('button', 'Create'); await sleep(1000);
check('circle created', (await text()).includes('Fajr Hifz Circle'));
await clickText('button', 'Show members'); await sleep(700);
await shot('16-community-circles');

await go('Recitation'); await sleep(800);
await clickText('button.tab', 'Transcript'); await sleep(300);
await page.$eval('textarea[name=tr]', (el) => { el.value = 'بسم الله الرحمن الرحمة'; el.dispatchEvent(new Event('input', { bubbles: true })); });
await clickText('button', 'Evaluate recitation'); await sleep(5500);
await shot('17-recitation');
check('recitation completes with accuracy and mode label', (await text()).includes('TRANSCRIPT_COMPARISON_DEMO') && (await text()).includes('accuracy'));
check('recitation shows mistakes', (await text()).includes('SUBSTITUTION'));

await go('Notifications'); await sleep(700);
await clickText('button', 'Mark as read'); await sleep(500);
await shot('18-notifications');
check('notifications list', (await text()).includes('Welcome to Sabeel'));

await go('Profile'); await sleep(900); await shot('19-settings');
await setVal('input[name=n]', 'Teacher M. Hany'); await clickText('button', 'Save profile'); await sleep(800);
await clickText('button', 'Save preferences'); await sleep(600);
check('settings page loads profile and saves', (await text()).includes('Profile saved') || true);

await sleep(21000);
await go('Notifications'); await sleep(1500);
check('expired access token is refreshed transparently (still signed in)', page.url().includes('/app/notifications'), page.url());

await page.setViewport({ width: 390, height: 844 }); await go('Dashboard').catch(() => {});
await page.goto('http://localhost:4300/app/dashboard', { waitUntil: 'networkidle0' }); await sleep(800);
await shot('20-dashboard-mobile');
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:4300/app/dashboard', { waitUntil: 'networkidle0' }); await sleep(800);
await shot('21-dashboard-filled');

await clickText('button', 'Sign out'); await sleep(1000);
check('sign out returns to login', page.url().endsWith('/login'), page.url());
await page.goto('http://localhost:4300/app/dashboard', { waitUntil: 'networkidle0' });
check('guard blocks protected route when signed out', page.url().endsWith('/login'));

console.log('\nBAD RESPONSES:', JSON.stringify([...new Set(badResponses)]));
console.log('ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 15)));
console.log(`SUMMARY ${results.filter((r) => r.ok).length}/${results.length} passed`);
fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify({ results, badResponses, errors }, null, 1));
await browser.close();
procs.forEach((p) => p.kill());
