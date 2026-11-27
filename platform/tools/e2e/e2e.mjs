import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4200';
const OUT = process.env.OUT_DIR || 'e2e-out';
fs.mkdirSync(OUT, { recursive: true });
const results = [];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  geolocation: { latitude: 30.0444, longitude: 31.2357 },
  permissions: ['geolocation']
});
const page = await context.newPage();
page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.request().method(), r.url()); });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log('PASS', name);
  } catch (e) {
    results.push({ name, ok: false, error: e.message.split('\n')[0] });
    console.log('FAIL', name, e.message.replace(/\n/g, ' | ').slice(0, 1500));
    await page.screenshot({ path: `${OUT}/fail-${results.length}.png`, fullPage: true }).catch(() => undefined);
  }
}

const email = 'e2e' + Date.now() + '@example.com';
const nav = async (text) => {
  await page.locator('a.nav', { hasText: text }).first().click();
};

await check('register and land on the dashboard', async () => {
  await page.goto(BASE + '/register', { waitUntil: 'networkidle' });
  await page.fill('input[name=name]', 'E2E User');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'Passw0rd!e2e');
  await page.click('button[type=submit]');
  await page.waitForURL('**/app/dashboard', { timeout: 30000 });
});

await check('dashboard ayah of the day shows meaning and tafsir directly', async () => {
  await page.goto(BASE + '/app/dashboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=daily-tafsir] p.body', { timeout: 20000 });
  const m = (await page.locator('[data-testid=daily-meaning] p.body').first().innerText()).trim();
  const t = (await page.locator('[data-testid=daily-tafsir] p.body').first().innerText()).trim();
  if (m.length < 5 || t.length < 5) throw new Error('empty meaning or tafsir');
  if (await page.locator('h3', { hasText: 'Ayah of the day' }).count() !== 1) throw new Error('more than one ayah of the day card');
  await page.screenshot({ path: `${process.env.SHOTS || '/tmp'}/real-dashboard-ayah.png` });
});

await check('ayah of the day opens the mushaf page', async () => {
  await page.getByRole('link', { name: 'Open in the mushaf' }).click();
  await page.waitForURL('**/app/mushaf?ayah=*', { timeout: 20000 });
  await page.waitForSelector('span.vtext', { timeout: 30000 });
  await page.waitForSelector('.sheet', { timeout: 10000 });
  await page.getByRole('button', { name: 'Tajweed rules' }).click();
  await page.waitForSelector('[data-testid=tajweed-rules] .tj-rule', { timeout: 5000 });
  await page.screenshot({ path: `${process.env.SHOTS || '/tmp'}/real-mushaf-tajweed.png` });
});

await check('verse route redirects to the mushaf page', async () => {
  await page.goto(BASE + '/app/quran/2', { waitUntil: 'networkidle' });
  await page.waitForURL('**/app/mushaf?page=*', { timeout: 20000 });
});

await check('asma ul-husna name opens meaning and greatness', async () => {
  await page.goto(BASE + '/app/asma', { waitUntil: 'networkidle' });
  await page.locator('div.name').nth(3).click();
  const t = await page.locator('[data-testid=asma-detail]').innerText();
  if (!t.includes('Meaning') || !t.includes('Greatness') || t.length < 150) throw new Error('detail incomplete: ' + t.slice(0, 80));
});

await check('tafsir panel shows the edition text', async () => {
  await page.goto(BASE + '/app/quran/1?view=verse', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ayah', { timeout: 20000 });
  await page.locator('.ayah').first().getByRole('button', { name: 'Tafsir and translation' }).click();
  await page.waitForSelector('.ed-block .ed-text', { timeout: 20000 });
  const text = (await page.locator('.ed-text').first().innerText()).trim();
  if (text.length < 5) throw new Error('empty edition text');
});

await check('switching the tafsir edition loads another text', async () => {
  const sel = page.locator('select[name=tafsirKey]');
  const options = await sel.locator('option').count();
  if (options < 2) throw new Error('only ' + options + ' tafsir editions');
  await sel.selectOption({ index: 1 });
  await page.waitForSelector('.ed-block', { timeout: 15000 });
});

await check('sources page lists the editions', async () => {
  await page.goto(BASE + '/app/sources', { waitUntil: 'networkidle' });
  const body = await page.locator('main, body').first().innerText();
  if (!/QuranEnc/i.test(body) || !/Tanzil/i.test(body)) throw new Error('sources missing');
});

await check('dashboard shows the ayah of the day', async () => {
  await page.goto(BASE + '/app/dashboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=daily-ayah] .txt', { timeout: 20000 });
  const text = (await page.locator('[data-testid=daily-ayah] .txt').innerText()).trim();
  if (text.length < 5) throw new Error('empty daily ayah');
});

await check('tafsir search returns linked results', async () => {
  await page.goto(BASE + '/app/quran', { waitUntil: 'networkidle' });
  await page.selectOption('[data-testid=ts-edition]', 'english_rwwad');
  await page.fill('[data-testid=ts-query]', 'merciful');
  await page.click('[data-testid=ts-run]');
  await page.waitForSelector('[data-testid=ts-hit]', { timeout: 20000 });
  await page.locator('[data-testid=ts-hit]').first().click();
  await page.waitForURL('**/app/mushaf?ayah=*', { timeout: 20000 });
  await page.waitForSelector('span.vtext', { timeout: 30000 });
});

await check('khatma plan starts and saves progress', async () => {
  await page.goto(BASE + '/app/quran', { waitUntil: 'networkidle' });
  await page.fill('[data-testid=khatma-days]', '30');
  await page.click('[data-testid=khatma-start]');
  await page.waitForSelector('[data-testid=khatma-per-day]', { timeout: 15000 });
  const perDay = (await page.locator('[data-testid=khatma-per-day]').innerText()).trim();
  if (perDay !== '21') throw new Error('per day ' + perDay);
  await page.fill('[data-testid=khatma-page]', '100');
  await page.locator('#khatma button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=khatma-summary]')?.textContent?.includes('100 / 604'), null, { timeout: 15000 });
});

await check('tasbeeh counts and saves a total', async () => {
  await page.goto(BASE + '/app/azkar', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=tasbeeh-tick]', { timeout: 20000 });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 5; i++) { await page.click('[data-testid=tasbeeh-tick]'); await page.waitForTimeout(150); }
  const pending = (await page.locator('[data-testid=tasbeeh-pending]').innerText()).trim();
  if (pending !== '5') throw new Error('pending ' + pending);
  await page.click('[data-testid=tasbeeh-save]');
  await page.waitForFunction(() => document.querySelector('[data-testid=tasbeeh-today]')?.textContent?.trim() === '5', null, { timeout: 15000 });
});

await check('prayer countdown and tracker', async () => {
  await page.goto(BASE + '/app/prayer', { waitUntil: 'networkidle' });
  await page.waitForSelector('#countdown', { timeout: 30000 });
  const text = (await page.locator('#countdown').innerText()).trim();
  if (!/\d\d:\d\d:\d\d/.test(text) && !/No more prayers today/.test(text)) throw new Error('countdown card ' + text);
  await page.waitForSelector('[data-testid^="log-"]', { timeout: 15000 });
  const box = page.locator('[data-testid^="log-"][data-testid$="-fajr"]').first();
  const saved = page.waitForResponse((r) => r.url().includes('/prayer/log') && r.request().method() === 'PUT', { timeout: 15000 });
  await box.check({ timeout: 15000 });
  await saved;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid^="log-"]', { timeout: 15000 });
  const checked = await page.locator('[data-testid^="log-"][data-testid$="-fajr"]').first().isChecked();
  if (!checked) throw new Error('tracker did not persist');
});

await check('weekly summary shows stats and a suggestion', async () => {
  await page.goto(BASE + '/app/dashboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=weekly-summary]', { timeout: 20000 });
  const prayers = (await page.locator('[data-testid=weekly-prayers]').innerText()).trim();
  if (!/^\d+\/35$/.test(prayers)) throw new Error('prayers ' + prayers);
  const suggestion = (await page.locator('[data-testid=weekly-suggestion]').innerText()).trim();
  if (suggestion.length < 10) throw new Error('suggestion ' + suggestion);
});

await check('revision reminder toggle saves and persists', async () => {
  await page.goto(BASE + '/app/settings', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=revision-reminders-toggle]', { timeout: 20000 });
  const toggle = page.locator('[data-testid=revision-reminders-toggle]');
  if (!(await toggle.isChecked())) throw new Error('should default to on');
  await toggle.uncheck();
  const saved = page.waitForResponse((r) => r.url().includes('/users/me/preferences') && r.request().method() === 'PUT', { timeout: 15000 });
  await page.getByRole('button', { name: /Save preferences/ }).click();
  const resp = await saved;
  if (!resp.ok()) throw new Error('save status ' + resp.status());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=revision-reminders-toggle]', { timeout: 20000 });
  if (await page.locator('[data-testid=revision-reminders-toggle]').isChecked()) throw new Error('toggle did not persist');
});

await check('light theme toggles, persists and keeps text readable', async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/app/dashboard', { waitUntil: 'networkidle' });
  await page.click('[data-testid=theme-toggle]');
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (theme !== 'light') throw new Error('theme ' + theme);
  await page.reload({ waitUntil: 'networkidle' });
  const kept = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (kept !== 'light') throw new Error('theme not kept ' + kept);
  const ratios = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const parse = (v) => {
      const h = v.trim().replace('#', '');
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    };
    const lum = ([r, g, b]) => [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bg = css.getPropertyValue('--bg');
    return { text: ratio(css.getPropertyValue('--text'), bg), muted: ratio(css.getPropertyValue('--muted'), bg), gold: ratio(css.getPropertyValue('--gold'), bg) };
  });
  if (ratios.text < 7 || ratios.muted < 4.5 || ratios.gold < 4.5) throw new Error('contrast ' + JSON.stringify(ratios));
  await page.screenshot({ path: `${OUT}/light-dashboard.png`, fullPage: true });
  await page.goto(BASE + '/app/quran/1?view=verse', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ayah', { timeout: 20000 });
  await page.screenshot({ path: `${OUT}/light-reader.png` });
  await page.goto(BASE + '/app/prayer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/light-prayer.png`, fullPage: true });
  await page.evaluate(() => localStorage.removeItem('sabeel.theme'));
});

const overflowPages = ['/app/dashboard', '/app/quran', '/app/quran/1?view=verse', '/app/memorization', '/app/revision', '/app/prayer', '/app/azkar', '/app/library', '/app/community', '/app/settings'];
for (const [label, size] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
  await check('no horizontal overflow on ' + label + ' in English and Arabic', async () => {
    await page.setViewportSize(size);
    const bad = [];
    for (const lang of ['en', 'ar']) {
      await page.evaluate((l) => localStorage.setItem('sabeel.lang', l), lang);
      for (const path of overflowPages) {
        await page.goto(BASE + path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        const width = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
        if (width > 2) bad.push(lang + ' ' + path + ' +' + width + 'px');
        if (path === '/app/dashboard') await page.screenshot({ path: `${OUT}/${label}-${lang}-dashboard.png` });
        if (path === '/app/quran/1?view=verse') await page.screenshot({ path: `${OUT}/${label}-${lang}-reader.png` });
      }
    }
    await page.evaluate(() => localStorage.setItem('sabeel.lang', 'en'));
    if (bad.length) throw new Error(bad.join('; '));
  });
}

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
