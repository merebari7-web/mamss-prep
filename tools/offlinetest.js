/* v63 "Anywhere" — offline excellence suite.
   Proves the installed app is a real offline product: boots from cache with
   the network fully cut, runs a complete practice session from the local
   bank, shows the designed offline strip, holds the progress report until
   connectivity returns, and offers the update notice.
   Topology: docs on :8100 (real server, service worker ACTIVE), REST proxied
   to cbtmock on :8138 while online.
   Run: node offlinetest.js [BASE]      (default http://localhost:8100/)     */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8138;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra !== undefined ? '  [' + JSON.stringify(extra).slice(0, 200) + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(600);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(`
    window.__MP_TEST_REPORT_OK__ = 1;
    localStorage.setItem('nssc_mp_seen', '71');
    localStorage.setItem('nssc_devid', JSON.stringify('offline-device'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify({ h: 'offlinetest0000', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' }))});
    localStorage.setItem('nssc_attempts_guest', JSON.stringify([{ d: 'x', tms: Date.now() - 86400e3, cls: 'SS1', subj: 'Mathematics', total: 10, correct: 6, pct: 60, mode: 'study' }]));
  `);
  let hits = 0, netOff = false;
  await ctx.route('**/rest/v1/**', async route => {
    const req = route.request(); const u = new URL(req.url());
    if (netOff) return route.abort('internetdisconnected');   // real drop-out semantics
    if (u.pathname.includes('class_progress')) hits++;
    const init = { method: req.method(), headers: {} };
    for (const [k, v] of Object.entries(req.headers())) if (!/^:/.test(k)) init.headers[k] = v;
    const pd = req.postData(); if (pd) init.body = pd;
    try {
      const r = await fetch(MOCK + u.pathname + u.search, init);
      const buf = Buffer.from(await r.arrayBuffer());
      await route.fulfill({ status: r.status, body: buf, headers: { 'Content-Type': 'application/json' } });
    } catch (e) { await route.fulfill({ status: 502, body: '{}' , contentType: 'application/json'}); }
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());

  /* ---------------- phase 1: online first visit installs the offline app */
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  // localhost IS a secure context; the site's own gate registers on https
  // only, so the suite registers the worker exactly as a prod visit would.
  await p.evaluate(() => navigator.serviceWorker.register('./sw.js'));
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
  ok('service worker controls the page after first visit', true);
  const cached = await p.evaluate(async () => {
    const keys = await caches.keys();
    const v68 = keys.find(k => k.includes('-v76'));
    if (!v68) return { v68: false };
    const c = await caches.open(v68);
    const reqs = await c.keys();
    return {
      v68: true,
      bank: reqs.some(r => r.url.endsWith('/bank.js')),
      shell: reqs.some(r => r.url.includes('/index.html')),
      worker: reqs.some(r => r.url.includes('progress-up.js')),
    };
  });
  ok('v71 cache holds shell + question bank + reporter', cached.v68 && cached.bank && cached.shell && cached.worker, cached);
  await sleep(2500);
  ok('first visit files a progress report while online', hits > 0, hits);
  ok('persistent-storage request was made', await p.evaluate(() => localStorage.getItem('nssc_persist') !== null));

  /* ---------------- phase 2: the network dies; the app does not ---------- */
  netOff = true;
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 30000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await sleep(1200);
  ok('app boots fully offline from cache', true);
  const strip = await p.evaluate(() => {
    const s = document.getElementById('mpNetStrip');
    return s ? { hidden: s.hidden, role: s.getAttribute('role'), text: s.textContent } : null;
  });
  ok('offline strip appears with role=status', strip && !strip.hidden && strip.role === 'status', strip);
  ok('strip explains that work stays on-device', /Offline/.test(strip.text) && /reconnect/.test(strip.text), strip.text);

  /* practice renders from the local bank, offline */
  await p.click('.study-sidebar .study-nav a[data-view="practice"]');
  await p.waitForSelector('#classTabs .tab', { timeout: 15000 });
  ok('practice class cards render offline from the cached bank', true);

  /* complete a whole session offline */
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem('nssc_attempts_guest') || '[]').length);
  await p.evaluate(async () => {
    startDaily();
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < 60 && state.quiz && state.idx < state.quiz.length; i++) {
      pick(0);
      await new Promise(r => setTimeout(r, 40));
      nextQ();
      await new Promise(r => setTimeout(r, 40));
    }
  });
  await sleep(800);
  const post = await p.evaluate(k => ({
    n: JSON.parse(localStorage.getItem('nssc_attempts_guest') || '[]').length,
    daily: !!JSON.parse(localStorage.getItem('nssc_daily_guest') || '{}')[k],
  }), dayKey());
  ok('a full practice session completes offline', post.n === before + 1, { before, post });
  ok('offline session writes the daily record', post.daily === true, post);

  /* report waits patiently while offline */
  const offState = await p.evaluate(() => MAMSS_PROGRESS.push().then(() => MAMSS_PROGRESS.state()));
  ok('reporter reports offline state without erroring', offState === 'off', offState);
  const hitsOffline = hits;

  /* ---------------- phase 3: connectivity returns ----------------------- */
  netOff = false;
  await ctx.setOffline(false);
  let filed = false;
  for (let i = 0; i < 20; i++) { await sleep(500); if (hits > hitsOffline) { filed = true; break; } }
  ok('queued report files itself on reconnect', filed, { hitsOffline, hits });
  await sleep(600);
  const stripBack = await p.evaluate(() => { const s = document.getElementById('mpNetStrip'); return s ? s.hidden : null; });
  ok('offline strip clears itself when back online', stripBack === true, stripBack);

  /* update notice */
  await p.evaluate(() => MAMSS_NET.showUpdate());
  const upd = await p.evaluate(() => {
    const s = document.getElementById('mpNetStrip');
    return { hidden: s.hidden, txt: s.textContent, btn: !!document.getElementById('mpNetReload') };
  });
  ok('update notice offers a reload instead of silent swaps', !upd.hidden && /fresh edition/i.test(upd.txt) && upd.btn, upd);
  await p.evaluate(() => MAMSS_NET.clearUpdate());
  ok('notice clears and leaves no strip behind', await p.evaluate(() => document.getElementById('mpNetStrip').hidden === true));

  ok('zero page errors across online, offline and reconnect phases', errs.length === 0, errs.slice(0, 3));

  await browser.close();
  mock.kill('SIGTERM');
  console.log('');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
