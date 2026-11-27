import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(here, 'shots', 'sweep');
fs.mkdirSync(out, { recursive: true });
const procs = [
  spawn('node', [path.join(root, 'mock-gateway/server.mjs')], { env: { ...process.env, PORT: '18080' }, stdio: 'ignore' }),
  spawn('node', [path.join(here, 'static.mjs'), path.join(root, 'dist/sabeel-web/browser')], { stdio: 'ignore' })
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1200);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
const bad = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace('http://localhost:18080', '')); });
const BASE = 'http://localhost:4300';
const MOBILE = process.env.MOBILE === '1';
if (MOBILE) await page.setViewport({ width: 390, height: 844, isMobile: true });
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const PUBLIC = ['/', '/login', '/register', '/forgot-password', '/reset-password?token=x', '/verify-email?token=x'];
const APP = ['dashboard', 'quran', 'quran/1', 'mushaf', 'library', 'memorization', 'revision', 'prayer', 'azkar', 'tasbih', 'duas', 'asma', 'hijri', 'zakat', 'stories', 'courses', 'community', 'notifications', 'sources', 'settings'].map((x) => '/app/' + x);

const analyse = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const over = (top, bottom) => { const a = top.a + bottom.a * (1 - top.a); if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a }; };
  const bgCandidates = (el) => {
    let layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const bg = parse(cs.backgroundColor);
      let imgs = [];
      if (cs.backgroundImage && cs.backgroundImage !== 'none') imgs = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
      layers.push({ bg, imgs });
      if ((bg && bg.a === 1) || (imgs.length && imgs.every((i) => i.a === 1))) break;
    }
    const page = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    let options = [{ r: page.r, g: page.g, b: page.b, a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      const next = [];
      for (const base of options) {
        if (L.imgs.length) for (const im of L.imgs) next.push(over(im, base));
        else next.push(base);
      }
      options = next;
      if (L.bg && L.bg.a > 0) options = options.map((o) => over(L.bg, o));
    }
    return options;
  };
  const fails = [];
  const leaks = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const t = node.textContent.trim();
    if (!t) continue;
    const el = node.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (el.closest('button:disabled') || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)') continue;
    const r = el.getBoundingClientRect();
    if (cs.visibility === 'hidden' || cs.display === 'none' || r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue;
    let op = 1; for (let n = el; n; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
    if (op < 0.05) continue;
    const fg0 = parse(cs.color); if (!fg0) continue;
    const key = el;
    if (seen.has(key)) continue; seen.add(key);
    const opts = bgCandidates(el);
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    let worst = 99;
    for (const bg of opts) { const fg = over({ ...fg0, a: fg0.a * op }, bg); worst = Math.min(worst, ratio(fg, bg)); }
    if (worst < need - 0.01) fails.push({ text: t.slice(0, 40), ratio: +worst.toFixed(2), need, tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '') });
    if (document.documentElement.lang === 'ar' && /[A-Za-z]{3,}/.test(t) && !el.closest('[lang=en]') && !el.closest('.ar')) leaks.add(t.slice(0, 70));
  }
  const overflow = document.scrollingElement.scrollWidth - window.innerWidth;
  const clipped = [];
  document.querySelectorAll('button, a.btn, .btn').forEach((b) => { if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflow !== 'visible') clipped.push((b.textContent || '').trim().slice(0, 30)); });
  return { fails: fails.slice(0, 25), nfails: fails.length, leaks: [...leaks].slice(0, 25), overflow, clipped: clipped.slice(0, 10) };
};

const report = [];
const prep = async (theme, lang) => {
  await page.evaluate((theme, lang) => { localStorage.setItem('sabeel.theme', theme); localStorage.setItem('sabeel.lang', lang); }, theme, lang);
};
const visit = async (route, theme, lang, tag) => {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
  await sleep(1400);
  const a = await page.evaluate(analyse);
  const name = `${tag}-${theme}-${lang}-${route.replace(/[^a-z0-9]+/gi, '_')}`;
  await page.screenshot({ path: path.join(out, (MOBILE ? 'm-' : '') + name + '.png'), fullPage: false });
  report.push({ route, theme, lang, ...a });
  if (route === '/app/asma') {
    await page.evaluate(() => document.querySelector('.card.name')?.click()); await sleep(500);
    const b = await page.evaluate(analyse);
    const body = await page.evaluate(() => [...document.querySelectorAll('[data-testid=asma-detail] .sec p')].map((p) => p.textContent.trim().length));
    await page.screenshot({ path: path.join(out, (MOBILE ? 'm-' : '') + name + '-popup.png') });
    report.push({ route: route + '#popup', theme, lang, ...b, sections: body });
    console.log('   popup contrastFails=' + b.nfails + ' sections=' + body.join(','));
  }
  if (MOBILE && route === '/app/dashboard') {
    await page.evaluate(() => document.querySelector('.burger')?.click()); await sleep(500);
    const b = await page.evaluate(analyse);
    await page.screenshot({ path: path.join(out, 'm-' + name + '-menu.png') });
    report.push({ route: route + '#menu', theme, lang, ...b });
    await page.evaluate(() => document.querySelector('.burger')?.click());
  }
  console.log(`${theme}/${lang} ${route} contrastFails=${a.nfails} leaks=${a.leaks.length} overflow=${a.overflow}`);
};

await page.goto(BASE + '/register', { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.setItem('sabeel.lang', 'en'); localStorage.setItem('sabeel.theme', 'dark'); });
await page.goto(BASE + '/register', { waitUntil: 'networkidle0' });
const setVal = async (sel, v) => { await page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v); };
const publicFirst = [];
for (const theme of ['dark', 'light']) for (const lang of ['en', 'ar']) {
  if (only && !only.includes(theme + '-' + lang)) continue;
  await page.evaluate(() => localStorage.removeItem('sabeel.tokens'));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await prep(theme, lang);
  for (const r of PUBLIC) await visit(r, theme, lang, 'pub');
  await page.goto(BASE + '/register', { waitUntil: 'networkidle0' });
  await setVal('input[name=name]', 'Teacher Hany'); await setVal('input[name=email]', `sweep-${theme}-${lang}@example.com`); await setVal('input[name=password]', 'Passw0rd!x');
  await page.click('button[type=submit]'); await sleep(2000);
  await prep(theme, lang);
  for (const r of APP) await visit(r, theme, lang, 'app');
  await page.evaluate(() => { localStorage.clear(); });
}
fs.writeFileSync(path.join(out, MOBILE ? 'report-m.json' : 'report.json'), JSON.stringify({ report, errors: [...new Set(errors)], bad: [...new Set(bad)] }, null, 1));
console.log('ERRORS', JSON.stringify([...new Set(errors)].slice(0, 20)));
console.log('BAD', JSON.stringify([...new Set(bad)].slice(0, 20)));
await browser.close();
procs.forEach((p) => p.kill());
