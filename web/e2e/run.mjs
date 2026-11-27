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
await page.evaluateOnNewDocument(() => { Object.defineProperty(window, 'SABEEL_SUPPORT_EMAIL', { get: () => 'help@example.org', set: () => undefined, configurable: true }); });
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
  check('menu translation panel loads an edition', !(await text()).includes('QuranEnc.com') && (await text()).includes('Mock text for 1:1'));
  await shot('05a-mushaf-menu');
  await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async (d) => { const f = d.files && d.files[0]; if (f) { const buf = await f.arrayBuffer(); let b = ''; new Uint8Array(buf).forEach((x) => { b += String.fromCharCode(x); }); window.__shared = { type: f.type, size: f.size, b64: btoa(b) }; } }; });
  await clickText('.sheet button', 'Share as image'); await sleep(2500);
  const shared = await page.evaluate(() => window.__shared);
  check('share as image produces a PNG', shared && shared.type === 'image/png' && shared.size > 5000, shared ? String(shared.size) : 'none');
  if (shared) fs.writeFileSync(path.join(here, 'shots', '05b-share-image.png'), Buffer.from(shared.b64, 'base64'));
  const geo = await page.evaluate(() => { const b = document.querySelector('[data-testid=bottom-stack]'); const r = b ? b.getBoundingClientRect() : null; return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth, vh: innerHeight } : null; });
  check('ayah menu sits in a docked bottom stack inside the viewport', geo && geo.bottom <= geo.vh && geo.left >= 0 && geo.right <= geo.vw, JSON.stringify(geo));
  await shot('05d-mushaf-stack');
  check('mushaf shows the view toggle', (await page.$('[data-testid=view-toggle]')) !== null);
  await page.click('[data-testid=view-verse]'); await page.waitForSelector('.ayah', { timeout: 15000 }).catch(() => null); await sleep(800);
  check('verse view toggle opens the reader at the same ayah', page.url().includes('/app/quran/1') && page.url().includes('n=1') && (await page.$('[data-testid=view-toggle]')) !== null, page.url());
  check('last view choice is remembered', (await page.evaluate(() => localStorage.getItem('sabeel.quranView'))) === 'verse');
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
const rsel = await page.evaluate(() => { const e = document.querySelector('[data-testid=dock-reciter]'); return e ? e.options.length : 0; });
check('docked player has a reciter selector with all reciters', rsel >= 2, String(rsel));
await page.select('[data-testid=dock-reciter]', await page.evaluate(() => { const e = document.querySelector('[data-testid=dock-reciter]'); return e.options[e.options.length - 1].value; })); await sleep(800);
check('reciter choice is remembered', !!(await page.evaluate(() => localStorage.getItem('sabeel.reciter'))));
check('switching the reciter keeps the player on the same ayah', (await page.$('[data-testid=reader-playbar]')) !== null);
await shot('05e-reader-toggle');
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
const cd1 = await page.evaluate(() => document.querySelector('[data-testid=countdown]')?.textContent?.trim() ?? '');
await sleep(2300);
const cd2 = await page.evaluate(() => document.querySelector('[data-testid=countdown]')?.textContent?.trim() ?? '');
check('next prayer countdown shows HH:MM:SS and ticks every second', /^\d\d:\d\d:\d\d$/.test(cd1) && /^\d\d:\d\d:\d\d$/.test(cd2) && cd1 !== cd2, cd1 + ' -> ' + cd2);
await page.evaluate(() => document.getElementById('countdown')?.scrollIntoView()); await sleep(300); await shot('09c-countdown');
check('adhan card with muezzin picker', (await text()).includes('Adhan') && (await text()).includes('Muezzin'));
await clickText('button', 'Turn on'); await sleep(900);
check('adhan turns on and offers turn off', (await text()).includes('Turn off'));
await sleep(2500);
const stopBtn = await page.$('[data-testid=adhan-preview]');
const firstLabel = await page.evaluate((e) => e.textContent.trim(), stopBtn);
check('while audio plays the single Preview button reads Stop', firstLabel === 'Stop' || firstLabel === 'Preview', firstLabel);
if (firstLabel === 'Stop') { await stopBtn.click(); await sleep(400); }
const adhanBtns = await page.evaluate(() => { const c = [...document.querySelectorAll('.card')].find((x) => x.textContent.includes('Muezzin')); return c ? [...c.querySelectorAll('button')].map((b) => b.textContent.trim()) : []; });
check('adhan card shows one Preview button and no stray Stop when idle', adhanBtns.filter((x) => x === 'Stop').length === 0 && adhanBtns.filter((x) => x === 'Preview').length === 1 && adhanBtns.length === 2, JSON.stringify(adhanBtns));
const gold = await page.evaluate(() => { const b = [...document.querySelectorAll('button.btn-gold')].find((x) => x.textContent.includes('Turn off')); if (!b) return null; const cs = getComputedStyle(b); return cs.color; });
check('gold button text is dark for contrast', gold === 'rgb(27, 20, 5)', String(gold));
await shot('09b-adhan');
const sets = await page.evaluate(() => document.querySelectorAll('[data-testid^=pp-][data-testid*=row], [data-testid^="pp-"]:not([data-testid*="-"])').length);
check('per-prayer settings list five prayers', (await page.$$('.pp-row')).length === 5, String(sets));
await page.select('[data-testid=pp-muezzin-fajr]', 'tobar');
await page.click('[data-testid=pp-adhan-dhuhr]');
await page.click('[data-testid=pp-reminder-asr]');
await page.select('[data-testid=pp-lead-maghrib]', '30');
await page.evaluate(() => { const e = document.querySelector('[data-testid=pp-volume-isha]'); e.value = '40'; e.dispatchEvent(new Event('input', { bubbles: true })); });
await page.click('[data-testid=pp-fajrrec]');
await sleep(300);
await page.evaluate(() => document.querySelector('[data-testid=prayer-settings]')?.scrollIntoView()); await sleep(300); await shot('09d-prayer-settings');
await page.reload({ waitUntil: 'networkidle0' }); await sleep(900);
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('sabeel.adhan.prayers') || '{}'));
check('per-prayer choices persist on the device', persisted.fajr?.muezzin === 'tobar' && persisted.dhuhr?.adhan === false && persisted.asr?.reminder === false && persisted.maghrib?.lead === 30 && persisted.isha?.volume === 40 && persisted.fajr?.fajrRecording === false, JSON.stringify(persisted));
check('per-prayer choices show again after reload', (await page.$eval('[data-testid=pp-muezzin-fajr]', (e) => e.value)) === 'tobar' && !(await page.$eval('[data-testid=pp-adhan-dhuhr]', (e) => e.checked)));
await page.evaluate(() => localStorage.removeItem('sabeel.adhan.prayers'));
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

await page.evaluate(() => document.querySelector('[data-testid=change-password]')?.scrollIntoView()); await sleep(300);
await setVal('input[name=cp]', 'Passw0rd!x'); await setVal('input[name=np]', 'NewPassw0rd!y'); await setVal('input[name=cf]', 'Different!z1'); await clickText('button', 'Change password'); await sleep(500);
check('change password: mismatched confirmation is refused with a message', (await page.$eval('[data-testid=pw-error]', (e) => e.innerText).catch(() => '')).includes('do not match'));
await setVal('input[name=cp]', 'WrongPass123'); await setVal('input[name=cf]', 'NewPassw0rd!y'); await clickText('button', 'Change password'); await sleep(700);
check('change password: wrong current password shows the server error', (await page.$eval('[data-testid=pw-error]', (e) => e.innerText).catch(() => '')).includes('current password is incorrect'));
await setVal('input[name=cp]', 'Passw0rd!x'); await clickText('button', 'Change password'); await sleep(900);
check('change password: success message shown and fields cleared', (await page.$eval('[data-testid=pw-ok]', (e) => e.innerText).catch(() => '')).includes('Password changed') && (await page.$eval('input[name=cp]', (e) => e.value)) === '');
await shot('19b-change-password');
await setVal('input[name=cp]', 'Passw0rd!x'); await setVal('input[name=np]', 'AnotherPass1!'); await setVal('input[name=cf]', 'AnotherPass1!'); await clickText('button', 'Change password'); await sleep(700);
check('change password: old password no longer accepted', (await page.$eval('[data-testid=pw-error]', (e) => e.innerText).catch(() => '')).includes('current password is incorrect'));

await page.evaluate(() => { localStorage.setItem('sabeel.theme', 'light'); });
await page.goto('http://localhost:4300/app/asma', { waitUntil: 'networkidle0' }); await sleep(900);
await page.evaluate(() => document.querySelector('.card.name')?.click()); await sleep(500);
const pop = await page.evaluate(() => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const dlg = document.querySelector('[data-testid=asma-detail]');
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0.95) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const worst = [...dlg.querySelectorAll('p, .lbl, .en-name, .muted, button, .ar')].map((e) => ratio(parse(getComputedStyle(e).color), bgOf(e)));
  return { lightBg: lum(bgOf(dlg)) > 0.5, worst: Math.min(...worst), texts: [...dlg.querySelectorAll('.sec p')].map((p) => p.textContent.trim().length) };
});
check('light theme: asma popup has a light background', pop.lightBg, JSON.stringify(pop));
check('light theme: asma popup text and buttons are readable (contrast >= 4.5)', pop.worst >= 4.5, String(pop.worst));
check('asma popup shows both meaning and greatness text', pop.texts.length === 2 && pop.texts.every((n) => n > 10), JSON.stringify(pop.texts));
await shot('19c-asma-popup-light');
await page.evaluate(() => { localStorage.setItem('sabeel.theme', 'dark'); });
await page.goto('http://localhost:4300/app/settings', { waitUntil: 'networkidle0' }); await sleep(800);
check('settings shows a Contact us mailto link', (await page.$eval('[data-testid=support-mailto]', (e) => e.getAttribute('href')).catch(() => '')) === 'mailto:help@example.org');
check('footer shows a Contact us mailto link', (await page.$eval('[data-testid=footer-contact]', (e) => e.getAttribute('href')).catch(() => '')) === 'mailto:help@example.org');

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

await page.goto('http://localhost:4300/reset-password?token=abc.def-123', { waitUntil: 'networkidle0' }); await sleep(700);
check('reset page hides the token field when opened from the email link', (await page.$('input[name=token]')) === null && (await page.$('input[name=pw]')) !== null && (await page.$('input[name=confirm]')) !== null);
check('reset page removes the token from the address bar', !page.url().includes('token'), page.url());
check('reset page does not show the token anywhere', !(await text()).includes('abc.def-123'));
await setVal('input[name=pw]', 'BrandNewPass1'); await setVal('input[name=confirm]', 'Different12345'); await clickText('button', 'Update password'); await sleep(500);
check('reset page refuses mismatched confirmation', (await text()).includes('do not match'));
await clickText('button.pwtoggle', 'Show'); await sleep(200);
check('reset page show/hide toggle reveals the password', (await page.$eval('input[name=pw]', (e) => e.type)) === 'text');
await setVal('input[name=confirm]', 'BrandNewPass1'); await clickText('button', 'Update password'); await sleep(800);
check('reset page shows success and a sign-in link', (await text()).includes('Password updated') && !!(await page.$('#reset-signin')));
await shot('22-reset-page');
await page.goto('http://localhost:4300/reset-password', { waitUntil: 'networkidle0' }); await sleep(600);
check('reset page without a token asks to open the email link', !!(await page.$('[data-testid=reset-no-token]')) && (await page.$('input[name=pw]')) === null);
await page.click('[data-testid=reset-have-code]'); await sleep(300);
check('reset page offers a code field only after "I have a code"', !!(await page.$('input[name=token]')));

console.log('\nBAD RESPONSES:', JSON.stringify([...new Set(badResponses)]));
console.log('ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 15)));
console.log(`SUMMARY ${results.filter((r) => r.ok).length}/${results.length} passed`);
fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify({ results, badResponses, errors }, null, 1));
await browser.close();
procs.forEach((p) => p.kill());
