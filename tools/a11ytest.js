/* v59 "Access & Speed" — shipping suite.
   Axe-core scans of the main views (must stay at ZERO violations), the new
   keyboard/focus behaviours (skip link, Escape-to-close + focus restore on
   What's-new, landmark-wrapped floating help), the accessible names in the
   teacher console, and first-load performance guards.
   Topology: docs on :8100, /rest/v1/* proxied to cbtmock on :8127.
   Run: node a11ytest.js [BASE]      (default http://localhost:8100/)       */
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8127;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;
const KEY = 'sb_publishable_test';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra !== undefined ? '  [' + JSON.stringify(extra).slice(0, 260) + ']' : '')); }
}

function seedFor(role, opts) {
  opts = opts || {};
  const act = role === 'teacher'
    ? { h: 'a11ysuite000000t', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'a11ysuite000000s', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
  const seen = opts.fresh ? '' : `localStorage.setItem('nssc_mp_seen', '60');`;
  return `
    window.__CBT_FORCE_POLL = 1;
    ${seen}
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-a11y${opts.tag || ''}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
  `;
}
async function mkCtx(browser, role, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(seedFor(role, opts));
  await ctx.route('**/rest/v1/**', async route => {
    const req = route.request();
    const u = new URL(req.url());
    try {
      const init = { method: req.method(), headers: {} };
      for (const [k, v] of Object.entries(req.headers())) if (!/^:/.test(k)) init.headers[k] = v;
      const pd = req.postData(); if (pd) init.body = pd;
      const r = await fetch(MOCK + u.pathname + u.search, init);
      const buf = Buffer.from(await r.arrayBuffer());
      const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
      await route.fulfill({ status: r.status, headers, body: buf });
    } catch (e) {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'mock: ' + e.message }) });
    }
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept(''));
  p.on('download', d => d.cancel().catch(() => {}));
  await p.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  if (!opts.fresh) {
    await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
    await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
    await sleep(1200);
  }
  return { ctx, p, errs };
}
async function axeClean(p, label) {
  const res = await new AxeBuilder({ page: p })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  ok('axe: ' + label + ' has zero violations', res.violations.length === 0,
    res.violations.map(v => v.id + '(' + v.impact + ')×' + v.nodes.length).join(','));
  return res;
}

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});

  const browser = await chromium.launch();
  console.log('\n=== v59 Access & Speed ===\nBASE ' + BASE + '\n');
  const ALL = [];
  try {
    /* ── 1. What's-new overlay: focus + Escape (fresh context, no mp_seen) ── */
    const F = await mkCtx(browser, 'student', { tag: 'fresh', fresh: true });
    ALL.push(F);
    await F.p.waitForSelector('#mpNewOverlay:not(.hidden)', { timeout: 20000 });
    ok('What\'s-new opens with focus already on "Start studying"', await F.p.evaluate(() => document.activeElement && document.activeElement.id === 'mpNewOk'));
    ok('overlay carries role=dialog + aria-modal', await F.p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); return o.getAttribute('role') === 'dialog' && o.getAttribute('aria-modal') === 'true'; }));
    await F.p.keyboard.press('Escape');
    await F.p.waitForFunction(() => !document.getElementById('mpNewOverlay'), null, { timeout: 10000 });
    ok('Escape closes What\'s-new (overlay removed, no crash)', true);
    ok('page still alive after Escape (MAMSS_ACT present)', await F.p.evaluate(() => !!window.MAMSS_ACT));

    /* ── 2. skip link ── */
    const S = await mkCtx(browser, 'student');
    ALL.push(S);
    const skip = await S.p.evaluate(() => {
      const a = document.querySelector('.mp-skip');
      if (!a) return null;
      const first = document.body.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      return { href: a.getAttribute('href'), isFirst: first === a, target: !!document.querySelector(a.getAttribute('href')) };
    });
    ok('skip link exists, targets #workspace, and is the first focusable element', skip && skip.href === '#workspace' && skip.isFirst && skip.target, skip);
    await S.p.keyboard.press('Tab');
    const focused = await S.p.evaluate(() => document.activeElement && document.activeElement.className);
    ok('first Tab lands on the skip link', /mp-skip/.test(String(focused)), focused);
    const vis = await S.p.evaluate(() => getComputedStyle(document.activeElement).left);
    ok('skip link becomes visible on focus (left: 0px)', vis === '0px', vis);

    /* ── 3. floating help lives in a landmark ── */
    const land = await S.p.evaluate(() => {
      const l = document.getElementById('mssWaLand');
      const a = document.getElementById('mssWa');
      return l && a ? { tag: l.tagName, label: l.getAttribute('aria-label'), inside: l.contains(a) } : null;
    });
    ok('floating WhatsApp help sits in a named <aside> landmark', land && land.tag === 'ASIDE' && /School help/.test(land.label || '') && land.inside, land);

    /* ── 4. perf: preconnect + first-load budget ── */
    ok('head preconnects the school Supabase origin', await S.p.evaluate(() => !!document.querySelector('link[rel="preconnect"][href*="mrhbuxsfhtqguxkxfczv.supabase.co"]')));
    const perf = await S.p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const res = performance.getEntriesByType('resource');
      let kb = 0; for (const r of res) kb += (r.transferSize || 0) / 1024;
      return { dcl: Math.round(nav.domContentLoadedEventEnd || 0), reqs: res.length, kb: Math.round(kb), bankRaw: res.some(r => /bank-raw/.test(r.name)) };
    });
    ok('first load stays light: ≤ 20 requests', perf.reqs <= 20, perf.reqs);
    ok('first load stays light: ≤ 450 KB transferred', perf.kb <= 450, perf.kb + 'KB');
    ok('DCL under 2 s (local server)', perf.dcl < 2000, perf.dcl + 'ms');
    ok('1.3 MB bank-raw.js rescue copy NOT fetched in a modern browser', !perf.bankRaw);

    /* ── 5. axe scans: student views ── */
    await axeClean(S.p, 'home');
    await S.p.evaluate(() => document.querySelector('.study-nav a[data-view="cbt"]').click());
    await S.p.waitForFunction(() => !!window.MAMSS_CBT && document.getElementById('cbtRoot').innerHTML.length > 50, null, { timeout: 20000 });
    await sleep(500);
    await axeClean(S.p, 'cbt hall (student)');
    ok('hall card leads with an <h2>', await S.p.evaluate(() => /Live CBT Hall/.test((document.querySelector('#cbtRoot .cbt-card h2') || {}).textContent || '')));
    ok('join-code feedback region announces politely (role=status)', await S.p.evaluate(() => { const n = document.getElementById('cbtJoinFb'); return n && n.getAttribute('role') === 'status'; }));
    await S.p.evaluate(() => document.querySelector('.study-nav a[data-view="sync"]').click());
    await sleep(900);
    await axeClean(S.p, 'sync view');
    ok('sync card leads with an <h2>', await S.p.evaluate(() => !!document.querySelector('.syn-card h2')));

    /* ── 6. teacher console: names + scans ── */
    const T = await mkCtx(browser, 'teacher');
    ALL.push(T);
    await T.p.evaluate(() => document.querySelector('.study-nav a[data-view="cbt"]').click());
    await T.p.waitForFunction(() => !!window.MAMSS_CBT, null, { timeout: 20000 });
    await sleep(600);
    await T.p.evaluate(() => MAMSS_CBT.openTeacher());
    await T.p.waitForSelector('.cbt-tabs', { timeout: 15000 });
    ok('console card leads with an <h2> (Teacher console)', await T.p.evaluate(() => /Teacher console/.test((document.querySelector('#cbtRoot .cbt-card h2') || {}).textContent || '')));
    const named = await T.p.evaluate(() => ['cbtSubject', 'cbtTopic', 'cbtDuration', 'cbtWebcam', 'cbtCount', 'cbtSched'].map(id => {
      const el = document.getElementById(id);
      return !!(el && document.querySelector('label[for="' + id + '"]'));
    }));
    ok('all six builder controls have a programmatic <label for>', named.every(Boolean), named);
    ok('draft title carries aria-label', await T.p.evaluate(() => (document.getElementById('cbtDraftTitle') || {}).getAttribute && document.getElementById('cbtDraftTitle').getAttribute('aria-label') === 'Paper title'));
    ok('draw + new-question feedback regions announce politely', await T.p.evaluate(() => ['cbtDrawFb', 'nqFb'].every(id => { const n = document.getElementById(id); return n && n.getAttribute('role') === 'status'; })));
    await axeClean(T.p, 'console: build paper');

    await T.p.click('[data-ctab="school"]');
    await T.p.waitForFunction(() => /Whole school|being set up/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 20000 });
    await axeClean(T.p, 'console: school');
    ok('no empty table headers anywhere in the dashboard', await T.p.evaluate(() => [...document.querySelectorAll('#cbtConsBody th')].every(th => th.textContent.trim() !== '')));

    await T.p.click('[data-ctab="pipeline"]');
    await T.p.waitForFunction(() => /[Qq]uestion pipeline/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 20000 });
    ok('pipeline file + textarea inputs carry accessible names', await T.p.evaluate(() => {
      const f = document.getElementById('plFile'), t = document.getElementById('plText');
      return !!(f && f.getAttribute('aria-label')) && !!(t && t.getAttribute('aria-label'));
    }));
    ok('pipeline feedback region announces politely', await T.p.evaluate(() => { const n = document.getElementById('plFb'); return n && n.getAttribute('role') === 'status'; }));
    await axeClean(T.p, 'console: pipeline');

    /* ── 7. standalone pages ── */
    const P2 = await mkCtx(browser, 'student', { tag: 'pages' });
    ALL.push(P2);
    await P2.p.goto(BASE + 'why.html', { waitUntil: 'load', timeout: 30000 });
    await sleep(400);
    await axeClean(P2.p, 'why.html');
    ok('why.html has exactly one <main>', await P2.p.evaluate(() => document.querySelectorAll('main').length === 1));
    await P2.p.goto(BASE + '404.html', { waitUntil: 'load', timeout: 30000 });
    await sleep(400);
    await axeClean(P2.p, '404.html');
    ok('404.html wraps its content in <main> (footer stays outside)', await P2.p.evaluate(() => {
      const m = document.querySelector('main');
      return !!m && m.querySelector('h1') && !m.querySelector('footer');
    }));
    ok('404 muted text darkened for sunlight readability', await P2.p.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--mut').trim();
      return v === '#6b5839';
    }));

    /* ── 8. hygiene ── */
    for (const C of ALL) ok('zero page errors (' + (C === F ? 'fresh/overlay' : C === S ? 'student' : C === T ? 'teacher' : 'pages') + ')', C.errs.length === 0, C.errs[0]);
  } catch (e) {
    fail++;
    console.log('  FATAL — ' + e.message);
  } finally {
    for (const C of ALL) { try { await C.ctx.close(); } catch (e) {} }
    try { await browser.close(); } catch (e) {}
    try { mock.kill(); } catch (e) {}
  }
  console.log('\na11ytest: ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})();
