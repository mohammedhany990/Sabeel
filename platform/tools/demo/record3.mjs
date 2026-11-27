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
await step('w01', 'Ayah of the day with its tafsir, and your weekly summary', 'آية اليوم مع تفسيرها وملخص أسبوعك', async () => { await page.evaluate(() => window.scrollTo(0, 0)); await sleep(2500); await page.evaluate(() => window.scrollBy(0, 500)); }, 3000);
await step('s04', 'All 114 surahs from the full Tanzil text', 'القرآن كاملاً: ١١٤ سورة', async () => { await nav('Surah list and search'); }, 3000);
await step('n01', 'The Quran opens as mushaf pages: turn the page, or jump by page, surah or juz', 'يُفتح القرآن كصفحات مصحف: قلّب الصفحة أو انتقل بالصفحة أو السورة أو الجزء', async () => {
  await clickText('a.surah', 'The Opening');
  await page.waitForSelector('span.vtext', { timeout: 30000 });
  await sleep(2500);
  await clickText('.mushaf-nav button', 'Next page');
  await sleep(2500);
  await page.selectOption('.mushaf-nav label:nth-of-type(3) select', { value: '10' });
  await sleep(2500);
}, 3000);
await step('n02', 'Tap any ayah to play it, read tafsir or translation, or share it as text or an image with the Sabeel logo', 'اضغط على أي آية لتشغيلها أو قراءة التفسير أو الترجمة أو مشاركتها كنص أو كصورة بشعار سبيل', async () => {
  await page.addStyleTag({ content: '.sheet { bottom: 110px !important; }' });
  await page.locator('span.vtext').first().click();
  await sleep(1500);
  await clickText('.sheet button', 'Translation');
  await page.waitForSelector('.sheet .ed-text', { timeout: 15000 });
  await sleep(2500);
  await clickText('.sheet button', 'Tafsir');
  await sleep(3000);
}, 3000);
await step('s05', 'Read ayah by ayah', 'القراءة آية آية', async () => {
  await clickText('.sheet a', 'Verse view');
  await page.waitForSelector('.ayah', { timeout: 15000 });
}, 3000);
await step('s06', 'Bookmark an ayah, or mark where you stopped', 'علامة على آية أو موضع التوقف', async () => {
  await clickText('.ayah button', 'Bookmark');
  await sleep(900);
  await clickText('.ayah button', 'Stopped here');
}, 3000);
await step('w02', 'Tafsir and translation per ayah, with edition name and source', 'تفسير وترجمة لكل آية مع اسم الإصدار والمصدر', async () => {
  await clickText('.ayah button', 'Tafsir and translation');
  await page.waitForSelector('.detail .ed-block', { timeout: 15000 });
}, 3000);
await step('w03', 'Share any ayah as text or as an image', 'شارك أي آية كنص أو كصورة', async () => {
  await clickText('button', 'Share ayah');
  await sleep(1200);
}, 3000);
await step('w04', 'Sticky player and the Husary and Minshawi teaching reciters', 'مشغّل ثابت وقرّاء الحصري والمنشاوي للتعلّم', async () => {
  const value = await page.evaluate(() => {
    const sel = document.querySelector('select[name=reciter]');
    const o = [...sel.options].find((x) => /husary/i.test(x.textContent));
    return o ? o.value : null;
  });
  if (value === null) throw new Error('no Husary reciter');
  await page.selectOption('select[name=reciter]', { value });
  await sleep(600);
  await clickText('button', 'Play from start');
  await sleep(3500);
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
await step('n03', 'Choose between several muezzins for the adhan, with a reminder 15 minutes before each prayer', 'اختر من عدة مؤذنين للأذان مع تذكير قبل الصلاة بخمس عشرة دقيقة', async () => {
  await nav('Prayer');
  await sleep(1200);
  await page.evaluate(() => document.querySelector('select[name=mz]').scrollIntoView({ block: 'center' }));
  await sleep(1200);
  await page.selectOption('select[name=mz]', { value: 'beautiful' });
  await sleep(800);
  await clickText('button', 'Preview');
  await sleep(3000);
  await clickText('button', 'Stop');
}, 3000);
await step('s12', 'Prayer times, Qibla and Hijri date', 'المواقيت والقبلة والتاريخ الهجري', async () => {
  await nav('Prayer');
  await sleep(1500);
  await clickText('button', 'Load month');
}, 3000);
await step('w07', 'Prayer tracking, missed prayers and night prayer', 'متابعة الصلوات والقضاء وقيام الليل', async () => {
  await page.evaluate(() => { const el = [...document.querySelectorAll('h3')].find((h) => /Qada/i.test(h.textContent)); if (el) el.scrollIntoView({ block: 'center' }); });
  await sleep(1500);
  await clickText('button', '+');
}, 3500);
await step('s13', 'Azkar with streaks', 'الأذكار وسلسلة الأيام', async () => {
  await nav('Azkar');
  await clickText('button.tab', 'Sleep');
  await clickText('button', 'Tap to count');
}, 3000);
await step('w08', 'Tasbih counter that keeps your daily count', 'مسبحة تحفظ عدّك اليومي', async () => {
  await nav('Tasbih');
  await clickText('button.big', 'Tap to count');
  await sleep(300);
  await clickText('button.big', 'Tap to count');
}, 3000);
await step('w09', 'Masnoon duas and the names of Allah', 'أدعية مسنونة وأسماء الله الحسنى', async () => {
  await nav('Duas');
  await sleep(2000);
  await nav('Asma ul-Husna');
}, 3500);
await step('w10', 'Hijri calendar with fasting hints and a fasting tracker', 'تقويم هجري مع مناسبات الصيام ومتابع الصيام', async () => {
  await nav('Hijri calendar');
  await sleep(1500);
}, 3500);
await step('w11', 'Approximate zakat calculator and prophet stories with a short quiz', 'حاسبة زكاة تقريبية وقصص الأنبياء مع اختبار', async () => {
  await nav('Zakat');
  await page.fill('input[name=cash]', '100000');
  await page.fill('input[name=gp]', '100');
  await sleep(1500);
  await nav('Prophet stories');
  await sleep(1500);
}, 3500);
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
