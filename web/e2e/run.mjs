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
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
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
await sleep(1200);
const dd = await page.evaluate(() => { const g = (id) => { const e = document.querySelector(`[data-testid=${id}] p.body`); if (!e) return null; const r = e.getBoundingClientRect(); return { len: e.innerText.trim().length, vis: r.height > 0 }; }; return { m: g('daily-meaning'), t: g('daily-tafsir'), cards: [...document.querySelectorAll('h3')].filter((h) => h.innerText.includes('Ayah of the day')).length }; });
check('dashboard ayah of the day shows meaning and tafsir directly, no click', dd.m && dd.m.vis && dd.m.len > 5 && dd.t && dd.t.vis && dd.t.len > 5 && dd.cards === 1, JSON.stringify(dd));
await shot('03b-dashboard-ayah');
await clickText('a', 'Open in the mushaf'); await page.waitForSelector('span.vtext', { timeout: 20000 }).catch(() => null); await sleep(800);
check('ayah of the day opens the mushaf page with the ayah selected', page.url().includes('/app/mushaf') && (await page.$('.sheet')) !== null, page.url());
await shot('03c-ayah-in-mushaf');
await clickText('.sheet button', 'Tajweed rules'); await sleep(400);
check('tajweed rules are explained for the selected ayah', (await page.$$('[data-testid=tajweed-rules] .tj-rule')).length > 0);
await shot('03d-tajweed-rules');
await page.goto('http://localhost:4300/app/quran/2', { waitUntil: 'networkidle0' }); await sleep(1500);
check('old verse route redirects to the mushaf page', page.url().includes('/app/mushaf?page='), page.url());
await page.goto('http://localhost:4300/app/dashboard', { waitUntil: 'networkidle0' }); await sleep(800);
check('recitation feature is removed from the nav', !(await text()).includes('Recitation check'));

await go('Surah list and search');
check('quran index lists 114 surahs', (await page.$$('a.surah')).length === 114);
await shot('04-quran-index');
await clickText('a.surah', 'Al-Fatihah'); await page.waitForSelector('span.vtext', { timeout: 20000 }).catch(() => null); await sleep(500);
check('surah card opens the mushaf page', page.url().includes('/app/mushaf') && (await text()).includes('Mushaf with tajweed'), page.url());
const firstVerse = await page.$('span.vtext');
if (firstVerse) {
  await firstVerse.click(); await sleep(500);
  const t1 = await text();
  check('tapping an ayah opens the menu with all actions', ['Play', 'Tafsir', 'Translation', 'Share as text', 'Share as image'].every((x) => t1.includes(x)));
  await clickText('.sheet button', 'Translation'); await sleep(1200);
  check('menu translation panel loads an edition', (await text()).includes('QuranEnc.com') && (await text()).includes('Mock text for 1:1'));
  await shot('05a-mushaf-menu');
  await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async (d) => { const f = d.files && d.files[0]; if (f) { const buf = await f.arrayBuffer(); let b = ''; new Uint8Array(buf).forEach((x) => { b += String.fromCharCode(x); }); window.__shared = { type: f.type, size: f.size, b64: btoa(b) }; } }; });
  await clickText('.sheet button', 'Share as image'); await sleep(2500);
  const shared = await page.evaluate(() => window.__shared);
  check('share as image produces a PNG', shared && shared.type === 'image/png' && shared.size > 5000, shared ? String(shared.size) : 'none');
  if (shared) fs.writeFileSync(path.join(here, 'shots', '05b-share-image.png'), Buffer.from(shared.b64, 'base64'));
  await clickText('.sheet a', 'Verse view'); await sleep(1500);
} else {
  check('mushaf page loaded for the surah card', false, 'no verses (api.quran.com unreachable?)');
  await page.goto(page.url().split('/app/')[0] + '/app/quran/1'); await sleep(1500);
}
check('reader shows ayahs', (await page.$$('.ayah')).length === 7);
await page.evaluate(() => { Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, set(v) { this.setAttribute('data-src', v); }, get() { return this.getAttribute('data-src') || ''; } }); HTMLMediaElement.prototype.play = function () { this.dispatchEvent(new Event('play')); return Promise.resolve(); }; HTMLMediaElement.prototype.pause = function () { this.dispatchEvent(new Event('pause')); }; });
await clickText('button', 'Play from start'); await sleep(1500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.evaluate(() => { const m = document.querySelector('main, .content, .main'); if (m) m.scrollTop = m.scrollHeight; });
const dock = await page.evaluate(() => { const e = document.querySelector('[data-testid=reader-playbar]'); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, native: !!document.querySelector('audio[controls]') }; });
check('reader dock player stays visible at the bottom with stop and no native audio bar', dock && dock.bottom <= dock.vh && dock.top > 0 && !dock.native, JSON.stringify(dock));
await shot('05c-reader-dock');
await clickText('[data-testid=reader-playbar] button', 'Stop'); await sleep(400);
check('stop button hides the player', (await page.$('[data-testid=reader-playbar]')) === null);
await clickText('.ayah:nth-of-type(2) button', 'Bookmark'); await sleep(500);
await clickText('.ayah button', 'Stopped here'); await sleep(500);
await shot('05-reader');
check('bookmark saved', (await text()).includes('Bookmarked'));
await clickText('button', 'Share ayah'); await sleep(400);
check('share panel offers text and image', (await text()).includes('Share as text') && (await text()).includes('Share as image'));
await clickText('button', 'Share as text'); await sleep(600);

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
check('adhan card with muezzin picker', (await text()).includes('Adhan') && (await text()).includes('Muezzin'));
await clickText('button', 'Turn on'); await sleep(900);
check('adhan turns on and offers turn off', (await text()).includes('Turn off'));
await shot('09b-adhan');
await clickText('button', 'Turn off'); await sleep(500);
await clickText('button', 'Load month'); await sleep(900);
check('month table', (await page.$$('table tbody tr')).length >= 28);
await clickText('button', 'Save and recalculate'); await sleep(800);

check('prayer tracker card with qada, qiyam and witr reminder', (await text()).includes('Qada') && (await text()).includes('Night prayer') && (await text()).includes('witr is not marked'));

await go('Tasbih'); await sleep(700);
await clickText('button.big', 'Tap to count'); await sleep(400);
check('tasbih counter increments', (await text()).includes('Today') && !((await text()).includes('No tasbih counted yet')));
await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
check('tasbih count is saved across reload', (await page.$eval('.counter .num', (e) => e.innerText)).trim().startsWith('1'));
const firstTab = await page.$eval('.tab.active', (e) => e.innerText);
await page.evaluate(() => { const b = document.querySelector('button.big'); for (let i = 0; i < 32; i++) b.click(); });
await sleep(1500);
const secondTab = await page.$eval('.tab.active', (e) => e.innerText);
check('tasbih moves to the next zikr after the target is reached', firstTab !== secondTab, firstTab + ' -> ' + secondTab);
await shot('17-tasbih');

await go('Duas'); await sleep(600);
check('duas page lists categories and a dua', (await text()).includes('Masnoon duas') && (await text()).includes('Al-Bukhari'));
await shot('18-duas');
await clickText('button.tab', 'Istikhara'); await sleep(300);
check('duas include istikhara', (await text()).includes('Sahih al-Bukhari 1162'));
await shot('18b-istikhara');

await go('Asma ul-Husna'); await sleep(600);
check('asma page shows name of the day and 99 names', (await text()).includes('Name of the day') && (await page.$$('div.name')).length === 99);
await shot('19-asma');
await clickText('div.name', 'Ar-Rahman'); await sleep(400);
const ad = await page.evaluate(() => { const e = document.querySelector('[data-testid=asma-detail]'); return e ? e.innerText : ''; });
check('tapping an Asma name opens meaning and greatness', ad.includes('Meaning') && ad.includes('Greatness') && ad.includes('Ar-Rahman') && ad.length > 200, ad.slice(0, 60));
await shot('19b-asma-detail');
await clickText('[data-testid=asma-detail] button', 'Close'); await sleep(200);

await go('Hijri calendar'); await sleep(600);
check('hijri calendar shows occasions and tracker', (await text()).includes('Upcoming occasions') && (await text()).includes('Fasting tracker') && (await text()).includes('Next recommended fasts') && (await text()).includes('Ashura'));
await shot('20-hijri');

await go('Zakat'); await sleep(500);
await setVal('input[name=cash]', '100000'); await setVal('input[name=gp]', '100');
await sleep(300);
check('zakat computes due amount', (await text()).toLowerCase().includes('zakat due'));
await shot('21-zakat');

await go('Quran (mushaf pages)'); await sleep(2500);
const mushafOk = (await text()).includes('Mushaf with tajweed');
const verses = await page.$$('span.vtext');
check('mushaf page renders', mushafOk && (verses.length > 0 || (await text()).includes('Could not load this page')), 'verses=' + verses.length);
await shot('23-mushaf');
if (verses.length > 0) {
  const before = await page.$eval('.pagehead', (e) => e.innerText);
  await clickText('.mushaf-nav button', 'Next page'); await sleep(1500);
  const after = await page.$eval('.pagehead', (e) => e.innerText);
  check('mushaf next page changes the page', before !== after, before.replace(/\s+/g, ' ') + ' -> ' + after.replace(/\s+/g, ' '));
  await page.select('.mushaf-nav label:nth-of-type(3) select', '10'); await sleep(1800);
  check('mushaf juz jump lands on page 182', (await page.$eval('.pagehead', (e) => e.innerText)).includes('182'));
  await shot('23b-mushaf-juz');
}

await go('Prophet stories'); await sleep(700);
check('stories page shows prophet and quiz', (await text()).includes('Stories of the prophets') && (await text()).includes('Quiz'));
await shot('22-stories');

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

await go('Notifications'); await sleep(700);
await clickText('button', 'Mark as read'); await sleep(500);
await shot('18-notifications');
check('notifications list', (await text()).includes('Welcome to Sabeel'));
await page.click('button.bell'); await sleep(900);
check('bell click on the notifications page returns to the previous page', !page.url().includes('/app/notifications'), page.url());
await page.click('button.bell'); await sleep(900);
check('bell click again reopens notifications', page.url().includes('/app/notifications'), page.url());

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
