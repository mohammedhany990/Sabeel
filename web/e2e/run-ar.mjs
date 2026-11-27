import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const shots = path.join(here, 'shots-ar');
fs.mkdirSync(shots, { recursive: true });

const procs = [
  spawn('node', [path.join(root, 'mock-gateway/server.mjs')], { env: { ...process.env, PORT: '18080' }, stdio: 'ignore' }),
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
const shot = (n) => page.screenshot({ path: path.join(shots, `${n}.png`) });
const text = async () => page.evaluate(() => document.body.innerText);
const setVal = async (sel, v) => { await page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v); };
const attrs = () => page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, stored: localStorage.getItem('sabeel.lang') }));
const latin = async () => {
  const t = await text();
  const allowed = new Set(['Sabeel', 'Angular', 'Spring', 'Boot', 'FCM', 'IANA', 'http', 'https', 'MP', 'Al', 'com', 'everyayah', 'Alafasy', 'kbps', 'mp', 'Bukhari', 'Muslim', 'Tirmidhi', 'Dawud', 'Zukhruf', 'Az', 'Abu', 'At', 'api', 'quran', 'Africa', 'Cairo', 'Amiri', 'Hifz', 'teacherar', 'Teacher', 'Hany', 'example', 'Passw', 'ayah', 'EN', 'English', 'Welcome', 'WELCOME', 'Your', 'account', 'ready', 'Create', 'memorization', 'plan', 'begin', 'Tajweed', 'TAJWEED', 'Foundations', 'Makharij', 'sifat', 'and', 'the', 'core', 'rules', 'with', 'practice', 'drills', 'for', 'every', 'lesson']);
  return [...new Set((t.match(/[A-Za-z]{3,}/g) || []).filter((w) => !allowed.has(w)))];
};
const visit = async (p, name) => {
  await page.goto('http://localhost:4300' + p, { waitUntil: 'networkidle0' });
  await sleep(700);
  const left = await latin();
  check(`${name}: no untranslated English words`, left.length === 0, left.join(' | '));
  await shot(name);
};

await page.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sabeel.lang', 'ar'); sessionStorage.setItem('seeded', '1'); } });
await page.goto('http://localhost:4300/', { waitUntil: 'networkidle0' });
let a = await attrs();
check('Arabic selected: html dir=rtl lang=ar', a.dir === 'rtl' && a.lang === 'ar', JSON.stringify(a));
check('landing shows Arabic hero', (await text()).includes('رفيقك الكامل'));
await shot('01-landing-ar');
await page.click('app-lang button'); await sleep(400);
a = await attrs();
check('switch to English: dir=ltr and persisted', a.dir === 'ltr' && a.lang === 'en' && a.stored === 'en', JSON.stringify(a));
check('English hero shown after switch', (await text()).includes('complete companion'));
await page.reload({ waitUntil: 'networkidle0' });
a = await attrs();
check('English choice survives reload', a.dir === 'ltr' && a.stored === 'en');
await page.click('app-lang button'); await sleep(400);
await page.reload({ waitUntil: 'networkidle0' });
a = await attrs();
check('Arabic choice survives reload', a.dir === 'rtl' && a.stored === 'ar');

await visit('/login', '02-login-ar');
await page.goto('http://localhost:4300/register', { waitUntil: 'networkidle0' });
await setVal('input[name=name]', 'Teacher Hany'); await setVal('input[name=email]', 'teacherar@example.com'); await setVal('input[name=password]', 'Passw0rd!x');
await shot('03-register-ar');
await page.click('button[type=submit]'); await sleep(1800);
check('register in Arabic opens dashboard', page.url().endsWith('/app/dashboard'), page.url());
check('Arabic dashboard shows ayah of the day and tafsir', (await text()).includes('آية اليوم') && (await text()).includes('التفسير'));

await page.goto('http://localhost:4300/app/quran/1', { waitUntil: 'networkidle0' }); await sleep(600);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => /علامة|Bookmark/i.test(e.innerText + e.title)); if (b) b.click(); });
await page.goto('http://localhost:4300/app/memorization', { waitUntil: 'networkidle0' }); await sleep(600);
await page.evaluate(() => { const f = document.querySelector('form'); if (f) { const d = new Date(); d.setDate(d.getDate() + 30); const i = f.querySelector('input[type=date]'); if (i) { i.value = d.toISOString().slice(0, 10); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } } });
await page.evaluate(() => { const b = [...document.querySelectorAll('form button[type=submit]')][0]; if (b) b.click(); });
await sleep(1200);

await page.goto('http://localhost:4300/app/dashboard', { waitUntil: 'networkidle0' }); await sleep(500);
await page.click('app-lang button'); await sleep(900);
await page.goto('http://localhost:4300/app/azkar', { waitUntil: 'networkidle0' }); await sleep(700);
const azEn = await text();
check('English azkar shows the English translation', azEn.includes('Glory be to Allah') && azEn.includes('Sahih Muslim'));
await page.click('app-lang button'); await sleep(900);
await page.goto('http://localhost:4300/app/azkar', { waitUntil: 'networkidle0' }); await sleep(700);
const azAr = await text();
check('Arabic azkar shows the Arabic reference from the backend field', azAr.includes('صحيح مسلم') && !azAr.includes('Glory be to Allah'));
for (const [p, n] of [['/app/dashboard', '04-dashboard-ar'], ['/app/quran', '05-quran-ar'], ['/app/quran/1', '06-reader-ar'], ['/app/library', '07-library-ar'], ['/app/memorization', '08-memorization-ar'], ['/app/revision', '09-revision-ar'], ['/app/prayer', '11-prayer-ar'], ['/app/azkar', '12-azkar-ar'], ['/app/tasbih', '21-tasbih-ar'], ['/app/duas', '22-duas-ar'], ['/app/asma', '23-asma-ar'], ['/app/hijri', '24-hijri-ar'], ['/app/zakat', '25-zakat-ar'], ['/app/stories', '26-stories-ar'], ['/app/mushaf', '27-mushaf-ar'], ['/app/courses', '13-courses-ar'], ['/app/community', '14-community-ar'], ['/app/notifications', '15-notifications-ar'], ['/app/settings', '16-settings-ar']]) await visit(p, n);

const rtl = await page.evaluate(() => {
  const side = document.querySelector('.side')?.getBoundingClientRect();
  return side ? { sideLeft: Math.round(side.left), width: window.innerWidth } : null;
});
check('sidebar sits on the right in RTL', rtl && rtl.sideLeft > rtl.width / 2, JSON.stringify(rtl));
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:4300/app/dashboard', { waitUntil: 'networkidle0' }); await sleep(600);
await shot('17-dashboard-mobile-ar');
await page.click('.burger'); await sleep(500);
await shot('18-menu-mobile-ar');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
check('no horizontal overflow on mobile in Arabic', !overflow);

const log = await page.evaluate(async () => (await fetch('http://localhost:18080/api/v1/__mock/requests')).json());
const api = log.filter((r) => !r.path.startsWith('/__mock'));
check('every API call carries Accept-Language', api.length > 0 && api.every((r) => r.lang === 'ar' || r.lang === 'en'), String(api.filter((r) => !r.lang).length) + ' without');
check('Arabic calls send ar and English calls send en', api.some((r) => r.lang === 'ar') && api.some((r) => r.lang === 'en'));
const reg = api.find((r) => r.path === '/auth/register');
check('register sends language ar', reg && reg.body && reg.body.language === 'ar', JSON.stringify(reg && reg.body));
const syncs = api.filter((r) => r.method === 'PUT' && r.path === '/users/me').map((r) => r.body && r.body.preferredLanguage);
check('switching language while logged in syncs preferredLanguage', syncs.includes('en') && syncs.includes('ar'), JSON.stringify(syncs));
console.log('ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 10)));
console.log(`SUMMARY ${results.filter((r) => r.ok).length}/${results.length} passed`);
fs.writeFileSync(path.join(here, 'results-ar.json'), JSON.stringify({ results, errors }, null, 1));
await browser.close();
procs.forEach((p) => p.kill());
