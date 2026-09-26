/* v60 "Any Screen" — formal responsive regression suite.
   3 viewports (393 phone / 360 small phone / 768 tablet) × 17 checks:
   14 layout-fit probes (home, 4 studio views, CBT hall, join result,
   5 console tabs, why.html, 404.html), 2 tap-target sweeps (student
   side + teacher console) and 1 page-error sweep.
   Fit  = documentElement.scrollWidth <= clientWidth + 2 AND no
          unexempted offender. Offenders exempt: position:fixed subtrees
          (headless classic-scrollbar ICB artifacts; fixed elements never
          extend document scrollWidth) and descendants of a genuinely
          scrollable/clipping ancestor (in-card table scrollers by design).
   Taps = visible a/button/input/select/textarea/[role=button] at least
          32×32 CSS px. Exempt: checkbox/radio inputs (20px by design),
          scroller descendants (table row actions), inline prose links
          (line-height carries the effective target).
   Mock-routed REST on :8132. Run: node responsetest.js [BASE]           */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8132;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;
const KEY = 'sb_publishable_test';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = ms => new Date(Date.now() - ms).toISOString();

let OK = 0, FAIL = 0;
function check(label, pass, detail) {
  if (pass) { OK++; console.log('  ✓ ' + label); }
  else { FAIL++; console.log('  ✗ ' + label + (detail ? '  →  ' + detail : '')); }
  return pass;
}

const VPS = [
  { name: 'phone-393', width: 393, height: 851 },
  { name: 'phone-360', width: 360, height: 800 },
  { name: 'tablet-768', width: 768, height: 1024 }
];

function seedFor(role) {
  const act = role === 'teacher'
    ? { h: 'resptest0000000t', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Resp Teacher' }
    : { h: 'resptest0000000s', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Resp Student' };
  return `
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '60');
    localStorage.setItem('nssc_devid', JSON.stringify('resp-${role}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
    localStorage.setItem('nssc_sync_meta', JSON.stringify({ auto: false }));
  `;
}

async function mkCtx(browser, vp, role, errors) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });
  await ctx.addInitScript(seedFor(role));
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
  p.on('pageerror', e => errors.push(vp.name + '/' + role + ': ' + e.message));
  await p.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  await sleep(1200);
  return { ctx, p };
}

/* formal fit probe — see header comment for exemption rules */
const FIT = () => {
  window.scrollTo(0, 0);
  const cw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const isScroller = p => {
    const c = getComputedStyle(p);
    return (c.overflowX === 'auto' || c.overflowX === 'scroll' || c.overflowX === 'hidden' || c.overflowX === 'clip') &&
      p.scrollWidth > p.clientWidth + 1;
  };
  const inScroller = el => {
    let p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      if (isScroller(p)) return true;
      p = p.parentElement;
    }
    return false;
  };
  const underFixed = el => {
    let p = el;
    while (p && p !== document.body) {
      if (getComputedStyle(p).position === 'fixed') return true;
      p = p.parentElement;
    }
    return false;
  };
  const vis = el => {
    const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none';
  };
  const path = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    return s;
  };
  const offenders = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el) || underFixed(el) || inScroller(el)) return;
    const r = el.getBoundingClientRect();
    const layoutRight = r.right + window.scrollX;
    if (layoutRight > cw + 2 || r.width > cw + 2)
      offenders.push(path(el) + ' right=' + Math.round(layoutRight) + ' w=' + Math.round(r.width));
  });
  return { cw, sw, fits: sw <= cw + 2 && offenders.length === 0, offenders: [...new Set(offenders)].slice(0, 6) };
};

/* tap-target sweep — returns list of unexempted small interactive elements */
const TAPS = () => {
  const inScroller = el => {
    let p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const c = getComputedStyle(p);
      if ((c.overflowX === 'auto' || c.overflowX === 'scroll' || c.overflowX === 'hidden' || c.overflowX === 'clip') && p.scrollWidth > p.clientWidth + 1) return true;
      p = p.parentElement;
    }
    return false;
  };
  const vis = el => {
    const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none';
  };
  const path = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    return s;
  };
  const bad = [];
  document.querySelectorAll('a[href],button,input,select,textarea,[role="button"]').forEach(el => {
    if (!vis(el)) return;
    if (el.matches('input[type=checkbox],input[type=radio]')) return;
    if (inScroller(el)) return;
    /* inline prose links: the surrounding line box carries the target */
    if (el.tagName === 'A') {
      const cs = getComputedStyle(el);
      const par = el.parentElement;
      if (cs.display === 'inline' && par && par.textContent &&
          par.textContent.trim().length > (el.textContent || '').trim().length + 12) return;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 32 || r.height < 32) bad.push(path(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  return [...new Set(bad)];
};

function fitDetail(m) {
  return 'scrollW ' + m.sw + ' vs client ' + m.cw + (m.offenders.length ? ' · offenders: ' + m.offenders.join(' | ') : '');
}

async function runViewport(browser, vp, errors) {
  console.log('\n── ' + vp.name + ' (' + vp.width + '×' + vp.height + ') ─────────────────');
  const tag = '[' + vp.name + '] ';
  const S = await mkCtx(browser, vp, 'student', errors);

  const fit = async (label, page) => {
    const m = await page.evaluate(FIT);
    check(tag + label + ' fits ' + m.cw, m.fits, fitDetail(m));
  };

  await fit('home', S.p);
  for (const v of ['practice', 'progress', 'tools', 'sync']) {
    await S.p.evaluate(view => { const a = document.querySelector('.study-nav a[data-view="' + view + '"]'); if (a) a.click(); }, v);
    await sleep(900);
    await fit('view:' + v, S.p);
  }
  await S.p.evaluate(() => { const a = document.querySelector('.study-nav a[data-view="cbt"]'); if (a) a.click(); });
  await S.p.waitForFunction(() => !!window.MAMSS_CBT && document.getElementById('cbtRoot') && document.getElementById('cbtRoot').innerHTML.length > 50, null, { timeout: 20000 });
  await sleep(500);
  await fit('cbt hall', S.p);
  const tapsStudentA = await S.p.evaluate(TAPS);

  await S.p.fill('#cbtJoinCode', 'MOB001').catch(() => {});
  const jb = await S.p.$('#cbtJoinBtn');
  if (jb) { await jb.click().catch(() => {}); }
  await sleep(2600);
  await fit('join result', S.p);
  const tapsStudentB = await S.p.evaluate(TAPS);
  const tapsStudent = [...new Set([...tapsStudentA, ...tapsStudentB])];
  check(tag + 'student tap targets ≥32px', tapsStudent.length === 0, tapsStudent.slice(0, 8).join(' | '));

  const T = await mkCtx(browser, vp, 'teacher', errors);
  await T.p.evaluate(() => { const a = document.querySelector('.study-nav a[data-view="cbt"]'); if (a) a.click(); });
  await T.p.waitForFunction(() => !!window.MAMSS_CBT, null, { timeout: 20000 });
  await sleep(400);
  await T.p.evaluate(() => MAMSS_CBT.openTeacher());
  await T.p.waitForSelector('.cbt-tabs', { timeout: 15000 });
  const tabWait = {
    create: p => p.waitForSelector('#cbtDraftTitle', { timeout: 15000 }),
    monitor: p => p.waitForFunction(() => /Live|No live|live paper/i.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 }),
    results: p => p.waitForFunction(() => /Ended|ranking|results|No ended/i.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 }),
    school: p => p.waitForFunction(() => /Whole school/i.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 }),
    pipeline: p => p.waitForSelector('#plText', { timeout: 15000 })
  };
  const tapsTeacher = [];
  for (const tab of ['create', 'monitor', 'results', 'school', 'pipeline']) {
    await T.p.evaluate(t => { const b = document.querySelector('[data-ctab="' + t + '"]'); if (b) b.click(); }, tab);
    try { await tabWait[tab](T.p); } catch (e) { await sleep(1200); }
    await sleep(700);
    await fit('console:' + tab, T.p);
    (await T.p.evaluate(TAPS)).forEach(x => tapsTeacher.push(x));
  }
  const tapsT = [...new Set(tapsTeacher)];
  check(tag + 'console tap targets ≥32px', tapsT.length === 0, tapsT.slice(0, 8).join(' | '));

  for (const pg of ['why.html', '404.html']) {
    const q = await T.ctx.newPage();
    q.on('pageerror', e => errors.push(vp.name + '/' + pg + ': ' + e.message));
    await q.goto(BASE + pg, { waitUntil: 'load', timeout: 30000 });
    await sleep(700);
    await fit(pg, q);
    await q.close();
  }

  await S.ctx.close(); await T.ctx.close();
}

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(600);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  await fetch(MOCK + '/rest/v1/cbt_sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ code: 'MOB001', title: 'Responsive Audit Paper With A Long Title', cls: 'SS1', subject: 'Mathematics', status: 'ended', teacher: 'Resp Teacher', duration_s: 1800, created_at: iso(86400000), ended_at: iso(80000000), questions: [{ q: 'Two plus two equals what?', o: ['3', '4', '5', '6'], a: 1, e: '' }] })
  }).catch(() => {});
  await fetch(MOCK + '/rest/v1/cbt_attempts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ session_code: 'MOB001', device_id: 'resp-d1', name: 'Ada Student', slip: 'MAMSS··1234··', status: 'submitted', score: 8, total: 10, integrity: 0, webcam: 'on', joined_at: iso(86000000), submitted_at: iso(85000000) })
  }).catch(() => {});

  console.log('\n═══ RESPONSETEST · ' + BASE + ' · 3 viewports × 17 checks ═══');
  const browser = await chromium.launch();
  const errors = [];
  for (const vp of VPS) {
    const before = errors.length;
    await runViewport(browser, vp, errors);
    check('[' + vp.name + '] zero page errors', errors.length === before, errors.slice(before).join(' | '));
  }
  await browser.close();
  try { mock.kill(); } catch (e) {}

  console.log('\n' + '═'.repeat(46));
  console.log('  ' + OK + ' passed · ' + FAIL + ' failed');
  if (FAIL) { console.log('  ✗ RESPONSETEST FAILED\n'); process.exit(1); }
  console.log('  ✓ RESPONSETEST PASSED — every screen fits\n');
  process.exit(0);
})().catch(e => { console.log('FATAL ' + e.message); try { process.exit(1); } catch (_) {} });
