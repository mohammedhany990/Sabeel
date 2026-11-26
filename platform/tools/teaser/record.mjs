import { chromium } from 'playwright';
import fs from 'node:fs';

let t0 = 0;
const BASE = process.env.BASE_URL || 'http://localhost:4200';
const OUT = process.env.OUT_DIR || 'teaser-out';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const email = 'teaser' + Date.now() + '@example.com';
const pre = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const prePage = await pre.newPage();
await prePage.goto(BASE + '/register', { waitUntil: 'networkidle' });
await prePage.fill('input[name=name]', 'Teaser User');
await prePage.fill('input[name=email]', email);
await prePage.fill('input[name=password]', 'Passw0rd!demo');
await prePage.click('button[type=submit]');
await prePage.waitForURL('**/app/dashboard', { timeout: 30000 });
await prePage.goto(BASE + '/app/recitation', { waitUntil: 'networkidle' });
await prePage.click('button.tab:has-text("Transcript")');
await prePage.$eval('textarea[name=tr]', (el) => { el.value = 'بسم الله الرحمن الرحيم'; el.dispatchEvent(new Event('input', { bubbles: true })); });
await prePage.click('button:has-text("Evaluate recitation")');
await prePage.waitForFunction(() => !/Evaluating/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {});
const state = await pre.storageState();
await pre.close();
const context = await browser.newContext({
  storageState: state,
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  geolocation: { latitude: 30.0444, longitude: 31.2357 },
  permissions: ['geolocation']
});
const page = await context.newPage();
t0 = Date.now();
const failures = [];
const timeline = [];
const durations = fs.existsSync('audio/durations.json') ? JSON.parse(fs.readFileSync('audio/durations.json', 'utf8')) : {};

async function caption(en, ar) {
  await page.evaluate(([en, ar]) => {
    let box = document.getElementById('demo-caption');
    if (!box) {
      box = document.createElement('div');
      box.id = 'demo-caption';
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(10,20,30,.88);color:#fff;text-align:center;padding:14px 28px;font-family:system-ui,sans-serif;pointer-events:none';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    const e = document.createElement('div');
    e.style.cssText = 'font-size:34px;font-weight:800;line-height:1.3';
    e.textContent = en;
    const a = document.createElement('div');
    a.style.cssText = 'font-size:34px;font-weight:800;line-height:1.5;direction:rtl;color:#f3d98b';
    a.textContent = ar;
    box.append(e, a);
  }, [en, ar]);
}

async function step(name, en, ar, fn, hold = 2500) {
  const started = Date.now();
  timeline.push({ id: name, at: (started - t0) / 1000 });
  try {
    await caption(en, ar);
    if (fn) await fn();
    await caption(en, ar);
    await page.screenshot({ path: OUT + '/' + name + '.png' }).catch(() => undefined);
    const want = Math.max(((durations[name] || 0) + 0.7) * 1000, hold);
    const left = Math.max(0, want - (Date.now() - started));
    await sleep(left);
  } catch (e) {
    const want = Math.max(((durations[name] || 0) + 0.7) * 1000, hold);
    await sleep(Math.max(0, want - (Date.now() - started)));
    failures.push(name + ': ' + e.message);
    console.log('STEP FAILED', name, e.message);
  }
}

const clickText = async (sel, t) => {
  const ok = await page.evaluate(([sel, t]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().toLowerCase().includes(t.toLowerCase()));
    if (el) { el.click(); return true; }
    return false;
  }, [sel, t]);
  if (!ok) throw new Error('missing ' + sel + ' ' + t);
};
const nav = async (t) => { await clickText('a.nav', t); await sleep(1500); };
const type = async (sel, v) => { await page.click(sel); await page.keyboard.type(v, { delay: 60 }); };

const H = 6800;
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await step('t01', 'Sabeel', 'سبيل', null, H);
await step('t02', 'Read the full Quran', 'اقرأ المصحف كاملًا', async () => {
  await page.goto(BASE + '/app/quran/1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ayah', { timeout: 20000 });
  await sleep(1000);
}, H);
await step('t03', 'Tafsir and translation, with versions', 'تفسير وترجمة بإصدارات موثقة', async () => {
  await page.locator('.ayah').first().getByRole('button', { name: 'Tafsir and translation' }).click();
  await page.waitForSelector('.ed-block .ed-text', { timeout: 20000 });
  await page.locator('.ed-block').first().scrollIntoViewIfNeeded();
  await sleep(1500);
  await page.locator('select[name=tafsirKey]').selectOption({ index: 1 });
  await sleep(2000);
}, H);
await step('t04', 'Memorize and review on schedule', 'احفظ وراجع في مواعيدك', async () => {
  await nav('Memorization');
  await clickText('button', 'Create plan');
  await sleep(1500);
  await clickText('button', 'Complete');
  await sleep(1500);
  await nav('Revision');
  await page.waitForFunction(() => !/Loading/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
  await sleep(1500);
}, H);
await step('t05', 'Recitation text check', '', async () => {
  await nav('Recitation');
  await clickText('button.tab', 'Transcript');
  await page.$eval('textarea[name=tr]', (el) => { el.value = 'بسم الله الرحمن الرحمة'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await clickText('button', 'Evaluate recitation');
  await page.waitForFunction(() => !/Evaluating/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  await sleep(2500);
}, H);
await step('t06', 'Prayer times and next-prayer countdown', 'المواقيت والعدّ التنازلي للصلاة القادمة', async () => {
  await page.evaluate(() => { const real = Date.now.bind(Date); Date.now = () => real() - 20 * 3600 * 1000; });
  await nav('Prayer');
  await page.waitForSelector('#countdown', { timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => document.getElementById('countdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await sleep(1500);
}, H);
await step('t07', 'English and Arabic, RTL ready', 'عربي وإنجليزي بالكامل', async () => {
  await clickText('button.lang', 'العربية');
  await sleep(1500);
}, H);

const video = page.video();
await context.close();
await browser.close();
const src = await video.path();
fs.renameSync(src, OUT + '/teaser.webm');
fs.writeFileSync(OUT + '/failures.txt', failures.join('\n'));
fs.writeFileSync(OUT + '/timeline.json', JSON.stringify(timeline));
console.log('failures:', failures.length);
