import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4200';
const OUT = process.env.OUT_DIR || 'teaser-out';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const durations = fs.existsSync('audio/durations2.json') ? JSON.parse(fs.readFileSync('audio/durations2.json', 'utf8')) : {};

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const email = 'teaser' + Date.now() + '@example.com';
const pre = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const prePage = await pre.newPage();
await prePage.goto(BASE + '/register', { waitUntil: 'networkidle' });
await prePage.fill('input[name=name]', 'Sabeel Demo');
await prePage.fill('input[name=email]', email);
await prePage.fill('input[name=password]', 'Passw0rd!demo');
await prePage.click('button[type=submit]');
await prePage.waitForURL('**/app/dashboard', { timeout: 30000 });
await prePage.goto(BASE + '/app/recitation', { waitUntil: 'networkidle' });
await prePage.click('button.tab:has-text("Transcript")');
await prePage.$eval('textarea[name=tr]', (el) => { el.value = 'بسم الله الرحمن الرحيم'; el.dispatchEvent(new Event('input', { bubbles: true })); });
await prePage.click('button:has-text("Evaluate recitation")');
await prePage.waitForSelector('.badge-ok', { timeout: 90000 }).catch(() => {});
const state = await pre.storageState();
await pre.close();

const context = await browser.newContext({
  storageState: state,
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  geolocation: { latitude: 30.0444, longitude: 31.2357 },
  permissions: ['geolocation']
});
const t0 = Date.now();
const page = await context.newPage();
const now = () => (Date.now() - t0) / 1000;
const failures = [];
const timeline = [];
let cur = null;

async function caption(en, ar) {
  await page.evaluate(([en, ar]) => {
    let box = document.getElementById('demo-caption');
    if (!box) {
      const style = document.createElement('style');
      style.textContent = '@keyframes capin{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}';
      document.head.appendChild(style);
      box = document.createElement('div');
      box.id = 'demo-caption';
      box.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:86%;z-index:2147483647;background:rgba(7,14,20,.86);border:1px solid rgba(243,217,139,.35);border-radius:18px;color:#fff;text-align:center;padding:10px 28px 12px;font-family:system-ui,sans-serif;pointer-events:none;box-shadow:0 12px 40px rgba(0,0,0,.45);animation:capin .35s ease both';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    const e = document.createElement('div');
    e.style.cssText = 'font-size:28px;font-weight:700;line-height:1.35';
    e.textContent = en;
    const a = document.createElement('div');
    a.style.cssText = 'font-size:30px;font-weight:700;line-height:1.5;direction:rtl;color:#f3d98b';
    a.textContent = ar;
    box.append(e, a);
  }, [en, ar]);
}

async function show(en, ar) {
  await caption(en, ar);
  await sleep(450);
  if (cur.open === null) cur.open = now();
}
function hold() {
  if (cur.open !== null) { cur.ranges.push([cur.open, now()]); cur.open = null; }
}
function kept() {
  return cur.ranges.reduce((a, r) => a + (r[1] - r[0]), 0) + (cur.open !== null ? now() - cur.open : 0);
}
async function pad(need) {
  while (kept() < need) await sleep(100);
}

async function scene(id, en, ar, fn) {
  const need = (durations[id] || 5) + 1.0;
  cur = { id, ranges: [], open: null };
  try {
    await fn(need, (() => show(en, ar)));
    if (cur.open === null) await show(en, ar);
    await pad(need);
    await page.screenshot({ path: OUT + '/' + id + '.png' }).catch(() => undefined);
  } catch (e) {
    failures.push(id + ': ' + e.message);
    console.log('SCENE FAILED', id, e.message);
    if (cur.open === null) cur.open = now();
    await sleep(1500);
  }
  hold();
  timeline.push({ id, need, ranges: cur.ranges });
}

const scroll = (y) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), y);

await scene('n01', 'Quran, memorization, prayer and azkar in one place', 'القرآن والحفظ والصلاة والأذكار في مكان واحد', async (need, show) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await sleep(600);
  await show();
  await page.mouse.move(640, 420, { steps: 25 });
});

await scene('n02', 'Read the full Quran', 'اقرأ المصحف كاملًا', async (need, show) => {
  await page.goto(BASE + '/app/quran/1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ayah', { timeout: 20000 });
  await sleep(800);
  await show();
  await sleep(1500);
  await scroll(260);
});

await scene('n03', 'Tafsir and translation, with version and source', 'تفسير وترجمة مع الإصدار والمصدر', async (need, show) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.ayah').first().getByRole('button', { name: 'Tafsir and translation' }).click();
  await page.waitForSelector('.ed-block .ed-text', { timeout: 20000 });
  await page.locator('.ed-block').first().scrollIntoViewIfNeeded();
  await sleep(600);
  await show();
  await sleep(2600);
  await page.locator('select[name=tafsirKey]').selectOption({ index: 1 });
});

await scene('n04', 'Search inside the tafsir', 'ابحث داخل التفسير', async (need, show) => {
  await page.goto(BASE + '/app/quran', { waitUntil: 'networkidle' });
  await page.selectOption('[data-testid=ts-edition]', 'english_rwwad');
  await page.locator('[data-testid=ts-query]').scrollIntoViewIfNeeded();
  await sleep(500);
  await show();
  await page.click('[data-testid=ts-query]');
  await page.keyboard.type('merciful', { delay: 110 });
  await sleep(300);
  await page.click('[data-testid=ts-run]');
  await page.waitForSelector('[data-testid=ts-hit]', { timeout: 20000 });
});

await scene('n05', 'Memorization plan with a daily target', 'خطة حفظ بورد يومي', async (need, show) => {
  await page.goto(BASE + '/app/memorization', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !/Loading/.test(document.body.innerText), null, { timeout: 20000 });
  await sleep(500);
  await show();
  await sleep(1800);
  await page.locator('button:has-text("Create plan")').first().click();
  await page.waitForSelector('text=Complete', { timeout: 20000 });
});

await scene('n06', 'Recitation text comparison', 'مقارنة نصية للتلاوة', async (need, show) => {
  await page.goto(BASE + '/app/recitation', { waitUntil: 'networkidle' });
  await page.waitForSelector('textarea[name=tr], button.tab', { timeout: 20000 });
  await page.locator('button.tab', { hasText: 'Transcript' }).click();
  await sleep(500);
  await show();
  await page.click('textarea[name=tr]');
  await page.keyboard.type('بسم الله الرحمن الرحمة', { delay: 90 });
  await sleep(500);
  await page.locator('button', { hasText: 'Evaluate recitation' }).click();
  hold();
  await page.waitForFunction(() => [...document.querySelectorAll('.card-title')].some((t) => /Latest result/.test(t.innerText) && t.querySelector('.badge-ok')), null, { timeout: 60000 });
  await sleep(400);
  cur.open = now();
});

await scene('n07', 'Ayah of the day and your weekly summary', 'آية اليوم وملخص أسبوعك', async (need, show) => {
  await page.goto(BASE + '/app/dashboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=weekly-summary]', { timeout: 20000 });
  await page.waitForSelector('[data-testid=daily-ayah]', { timeout: 20000 });
  await sleep(700);
  await show();
  await sleep(2500);
  await scroll(250);
});

await page.addInitScript(() => { const real = Date.now.bind(Date); Date.now = () => real() - 20 * 3600 * 1000; });
await scene('n08', 'Prayer times, countdown and tracker', 'المواقيت والعدّ التنازلي وتتبّع الصلاة', async (need, show) => {
  await page.goto(BASE + '/app/prayer', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => /\d\d:\d\d:\d\d/.test(document.getElementById('countdown')?.innerText || ''), null, { timeout: 30000 });
  await page.waitForSelector('[data-testid^="log-"]', { timeout: 20000 });
  await sleep(600);
  await show();
  await sleep(2200);
  await scroll(320);
  await sleep(1200);
  await page.locator('[data-testid^="log-"][data-testid$="-fajr"]').first().check();
});

await scene('n09', 'English and Arabic, right-to-left ready', 'عربي وإنجليزي بالكامل', async (need, show) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('button.lang', { hasText: 'العربية' }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl', null, { timeout: 10000 });
  await sleep(700);
  await show();
  await sleep(2200);
  await scroll(300);
});

await scene('n10', 'Sabeel', 'سبيل', async (need, show) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await sleep(700);
  await show();
});

await context.close();
await browser.close();
const vids = fs.readdirSync(OUT).filter((f) => f.endsWith('.webm'));
if (vids[0]) fs.renameSync(OUT + '/' + vids[0], OUT + '/teaser.webm');
fs.writeFileSync(OUT + '/timeline2.json', JSON.stringify(timeline));
fs.writeFileSync(OUT + '/failures.txt', failures.join('\n'));
console.log('done', failures.length, 'failures');
