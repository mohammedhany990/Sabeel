import { chromium } from 'playwright';
import fs from 'node:fs';

let t0 = 0;
const BASE = process.env.BASE_URL || 'http://localhost:4200';
const OUT = process.env.OUT_DIR || 'demo-out';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({
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
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(10,20,30,.88);color:#fff;text-align:center;padding:10px 24px;font-family:system-ui,sans-serif;pointer-events:none';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    const e = document.createElement('div');
    e.style.cssText = 'font-size:22px;line-height:1.35';
    e.textContent = en;
    const a = document.createElement('div');
    a.style.cssText = 'font-size:24px;line-height:1.5;direction:rtl;color:#f3d98b';
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
    const want = ((durations[name] || 0) + 0.7) * 1000;
    const left = Math.max(hold, want - (Date.now() - started));
    await sleep(left);
  } catch (e) {
    const want = ((durations[name] || 0) + 0.7) * 1000;
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

const email = 'demo' + Date.now() + '@example.com';

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await step('s01', 'Sabeel brings the Quran, memorization, revision, prayer times and azkar together in one place. Let\'s see it running.', 'سبيل تجمع القرآن والحفظ والمراجعة ومواقيت الصلاة والأذكار في مكان واحد', null, 4000);

await page.goto(BASE + '/register', { waitUntil: 'networkidle' });
await step('s02', 'Create an account', 'إنشاء حساب', async () => {
  await type('input[name=name]', 'Demo User');
  await type('input[name=email]', email);
  await type('input[name=password]', 'Passw0rd!demo');
  await sleep(500);
  await page.click('button[type=submit]');
  await page.waitForURL('**/app/dashboard', { timeout: 20000 });
}, 2000);
await step('s03', 'Dashboard: your day at a glance', 'لوحة التحكم: ملخص يومك', null, 3000);
await step('s04', 'All 114 surahs from the full Tanzil text', 'القرآن كاملاً: ١١٤ سورة', async () => { await nav('Surah list and search'); }, 3000);
await step('s05', 'Read ayah by ayah', 'القراءة آية آية', async () => {
  await clickText('a.surah', 'The Opening');
  await page.waitForSelector('.ayah', { timeout: 15000 });
}, 3000);
await step('s06', 'Bookmark an ayah, or mark where you stopped', 'علامة على آية أو موضع التوقف', async () => {
  await clickText('.ayah button', 'Bookmark');
  await sleep(900);
  await clickText('.ayah button', 'Stopped here');
}, 3000);
await step('s07', 'Library: bookmarks and last position', 'المكتبة: العلامات وآخر موضع', async () => { await nav('Bookmarks'); }, 3000);
await step('s08', 'Memorization plan with a daily target', 'خطة الحفظ والورد اليومي', async () => {
  await nav('Memorization');
  await clickText('button', 'Create plan');
  await sleep(1500);
}, 3000);
await step('s09', 'Complete today\'s task', 'إكمال مهمة اليوم', async () => {
  await clickText('button', 'Complete');
  await sleep(1500);
}, 3000);
await step('s10', 'Spaced-repetition revision: 1, 3, 7, 14, 30, 60 days', 'مراجعة متباعدة: ١ ٣ ٧ ١٤ ٣٠ ٦٠ يوماً', async () => {
  await nav('Revision');
  for (let i = 0; i < 3; i++) {
    const has = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.innerText.includes('Submit review')));
    if (has) { await clickText('button', 'Submit review'); break; }
    await sleep(1000);
  }
}, 3000);
await step('s11', 'Recitation: text comparison demo mode (not tajweed grading)', 'التلاوة: مقارنة نصية تجريبية وليست تقييم تجويد', async () => {
  await nav('Recitation');
  await clickText('button.tab', 'Transcript');
  await page.$eval('textarea[name=tr]', (el) => { el.value = 'بسم الله الرحمن الرحمة'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await clickText('button', 'Evaluate recitation');
  await sleep(6000);
}, 2000);
await step('s12', 'Prayer times, Qibla and Hijri date', 'المواقيت والقبلة والتاريخ الهجري', async () => {
  await nav('Prayer');
  await sleep(1500);
  await clickText('button', 'Load month');
}, 3000);
await step('s13', 'Azkar with streaks', 'الأذكار وسلسلة الأيام', async () => {
  await nav('Azkar');
  await clickText('button.tab', 'Sleep');
  await clickText('button', 'Tap to count');
}, 3000);
await step('s14', 'Courses: enroll, track lessons, rate', 'الدورات: التسجيل والمتابعة والتقييم', async () => {
  await nav('Courses');
  await clickText('a.course', 'Tajweed');
  await sleep(1200);
  await clickText('button', 'Enroll');
  await sleep(800);
  await clickText('button', 'Mark lesson complete');
}, 3000);
await step('s15', 'Community: badges, challenges and circles', 'المجتمع: شارات وتحديات ودوائر', async () => {
  await nav('Community');
  await sleep(1500);
  await clickText('button.tab', 'Challenges');
  await sleep(800);
  await clickText('button', 'Join challenge');
  await sleep(1500);
  await clickText('button.tab', 'Circles');
}, 3000);
await step('s16', 'Switch to Arabic: the interface turns right-to-left', 'التبديل إلى العربية', async () => {
  await clickText('button.lang', 'العربية');
  await sleep(1500);
  await page.goto(BASE + '/app/quran/1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ayah', { timeout: 15000 });
}, 4000);

const video = page.video();
await context.close();
await browser.close();
const src = await video.path();
fs.renameSync(src, OUT + '/demo.webm');
fs.writeFileSync(OUT + '/failures.txt', failures.join('\n'));
fs.writeFileSync(OUT + '/timeline.json', JSON.stringify(timeline));
console.log('failures:', failures.length);
