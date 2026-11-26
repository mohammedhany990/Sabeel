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

await check('tafsir panel shows the edition text with its version and source', async () => {
  await page.goto(BASE + '/app/quran/1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ayah', { timeout: 20000 });
  await page.locator('.ayah').first().getByRole('button', { name: 'Tafsir and translation' }).click();
  await page.waitForSelector('.ed-block .ed-text', { timeout: 20000 });
  const title = await page.locator('.ed-title').first().innerText();
  if (!title.includes('QuranEnc.com') || !/\d+\.\d+/.test(title)) throw new Error('missing version or source: ' + title);
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
  const box = page.locator('[data-testid^="log-"][data-testid$="-FAJR"]').first();
  await box.check({ timeout: 15000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid^="log-"]', { timeout: 15000 });
  const checked = await page.locator('[data-testid^="log-"][data-testid$="-FAJR"]').first().isChecked();
  if (!checked) throw new Error('tracker did not persist');
});

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
