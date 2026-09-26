/* v57 "School Dashboard" — end-to-end suite.
   Topology identical to cbttest: docs on :8100, all /rest/v1/* proxied by
   Playwright route to cbtmock on :8124 (now with a code_redemptions table).
   Seeds a whole-school dataset (3 papers, 7 sittings, 8 activations), then
   checks every aggregate the 4th teacher-console tab renders.
   Run: node dashtest.js [BASE]        (default http://localhost:8100/)      */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8124;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;
const KEY = 'sb_publishable_test';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra !== undefined ? '  [' + JSON.stringify(extra).slice(0, 240) + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = msAgo => new Date(Date.now() - msAgo).toISOString();
const D = 86400000;

async function seed(path, rows) {
  const r = await fetch(MOCK + '/rest/v1/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
    body: JSON.stringify(rows)
  });
  if (!r.ok) throw new Error('seed ' + path + ' → ' + r.status);
}
const Q = (q, a) => ({ q, o: ['opt A', 'opt B', 'opt C', 'opt D'], a, e: 'because' });

function seedFor(role, opts) {
  opts = opts || {};
  const act = role === 'teacher'
    ? { h: 'testsuite0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'testsuite0000001', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
  return `
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '60');
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-dash-device${opts.tag || ''}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
  `;
}
async function mkCtx(browser, role, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(seedFor(role, opts));
  if (opts.deadTables) {
    await ctx.route('**/rest/v1/**', route => route.fulfill({
      status: 404, contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', message: 'Could not find the table public.cbt_sessions in the schema cache' }),
    }));
  } else {
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
        await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'mock proxy: ' + e.message }) });
      }
    });
  }
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  p.on('download', d => d.cancel().catch(() => {}));
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  return { ctx, p, errs };
}
async function openCbt(p) {
  await p.click('.study-nav a[data-view="cbt"]');
  await p.waitForSelector('#viewCbt:not([hidden])', { timeout: 15000 });
  await p.waitForFunction(() => !!window.MAMSS_CBT && document.getElementById('cbtRoot') && document.getElementById('cbtRoot').innerHTML.length > 50, null, { timeout: 20000 });
}
async function openSchool(T) {
  await T.p.evaluate(() => MAMSS_CBT.openTeacher());
  await T.p.waitForSelector('.cbt-tabs [data-ctab="school"]', { timeout: 10000 });
  await T.p.click('[data-ctab="school"]');
  await T.p.waitForFunction(() => /Whole school/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
}
const body = T => T.p.locator('#cbtConsBody').innerText();

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});

  /* ── whole-school dataset ─────────────────────────────────────────────── */
  await seed('cbt_sessions', [
    { code: 'AAA111', title: 'Midterm Maths', cls: 'SS1', subject: 'Mathematics', status: 'ended', teacher: 'Mr Okoro', duration_s: 1800, created_at: iso(3 * D), live_at: iso(3 * D), ended_at: iso(3 * D - 1800000), questions: [Q('2+2?', 0), Q('x²=9?', 1), Q('π≈?', 2)] },
    { code: 'BBB222', title: 'English Mock', cls: 'SS2', subject: 'English', status: 'ended', teacher: 'Mr Okoro', duration_s: 1800, created_at: iso(1 * D), live_at: iso(1 * D), ended_at: iso(1 * D - 1800000), questions: [Q('Antonym of big?', 3), Q('Plural of child?', 0)] },
    { code: 'CCC333', title: 'Live Mixed Paper', cls: 'SS3', subject: '', status: 'live', teacher: 'Mr Okoro', duration_s: 2400, created_at: iso(7200000), live_at: iso(7200000), questions: [Q('H2O is?', 1)] }
  ]);
  await seed('cbt_attempts', [
    { session_code: 'AAA111', device_id: 'd1', name: 'Ada Student', slip: 'MAMSS··1234··', status: 'submitted', score: 8, total: 10, integrity: 0, webcam: 'on', joined_at: iso(3 * D), submitted_at: iso(3 * D - 1500000) },
    { session_code: 'AAA111', device_id: 'd2', name: 'Chidi Okeke', slip: 'MAMSS··2345··', status: 'submitted', score: 9, total: 10, integrity: 2, webcam: 'denied', joined_at: iso(3 * D), submitted_at: iso(3 * D - 1400000) },
    { session_code: 'AAA111', device_id: 'd3', name: 'Blessing Eze', slip: 'MAMSS··3456··', status: 'submitted', score: 6, total: 10, integrity: 0, webcam: '', joined_at: iso(3 * D), submitted_at: iso(3 * D - 1300000) },
    { session_code: 'BBB222', device_id: 'd1', name: 'Ada Student', slip: 'MAMSS··1234··', status: 'submitted', score: 7, total: 10, integrity: 0, webcam: 'skipped', joined_at: iso(1 * D), submitted_at: iso(1 * D - 1500000) },
    { session_code: 'BBB222', device_id: 'd4', name: 'Dan Adeyemi', slip: 'MAMSS··4567··', status: 'autosubmitted', score: 5, total: 10, integrity: 1, webcam: 'on', joined_at: iso(1 * D), submitted_at: iso(1 * D - 900000) },
    { session_code: 'CCC333', device_id: 'd5', name: 'Efe Urhobo', slip: 'MAMSS··5678··', status: 'running', score: null, total: null, integrity: 0, webcam: 'on', joined_at: iso(3600000) },
    { session_code: 'CCC333', device_id: 'd6', name: 'Late Comer', slip: '', status: 'waiting', score: null, total: null, integrity: 0, webcam: '', joined_at: iso(1800000) }
  ]);
  await seed('code_redemptions', [
    { code_hash: 'h1', batch: 'SS1-3-main', redeemed_at: iso(1 * D) },
    { code_hash: 'h2', batch: 'SS1-3-main', redeemed_at: iso(2 * D) },
    { code_hash: 'h3', batch: 'SS1-3-main', redeemed_at: iso(30 * D) },
    { code_hash: 'h4', batch: 'SS1-3-main', redeemed_at: iso(40 * D) },
    { code_hash: 'h5', batch: 'SS1-3-main', redeemed_at: iso(50 * D) },
    { code_hash: 'h6', batch: 'SS1-3-topup', redeemed_at: iso(3 * D) },
    { code_hash: 'h7', batch: 'SS1-3-topup', redeemed_at: iso(20 * D) },
    { code_hash: 'h8', batch: 'TEACHER-1', redeemed_at: iso(12 * 3600000) }
  ]);

  const browser = await chromium.launch();
  console.log('\n=== v57 School Dashboard ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + '\n');
  const ALL = [];
  try {
    /* ── 1. the tab itself ── */
    const T = await mkCtx(browser, 'teacher');
    await openCbt(T.p);
    await T.p.evaluate(() => MAMSS_CBT.openTeacher());
    await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    ok('teacher console now has a 4th tab: School', await T.p.locator('[data-ctab="school"]').count() === 1);
    await openSchool(T);
    let t = await body(T);
    ok('dashboard renders the whole-school header', /Whole school/.test(t));

    /* ── 2. headline stats (exact math on the seeded dataset) ── */
    ok('papers run = 3, with the live one called out', /Papers run:\s*3 \(1 live\)/.test(t.replace(/\s+/g, ' ')), t.slice(0, 200));
    ok('sittings = 7', /Sittings:\s*7/.test(t.replace(/\s+/g, ' ')));
    ok('school average = 70% ((80+90+60+70+50)/5)', /School average:\s*70%/.test(t.replace(/\s+/g, ' ')));
    ok('unique students = 6 (Ada deduped by slip, waiter counted by name)', /Students:\s*6/.test(t.replace(/\s+/g, ' ')));
    ok('integrity flags summed = 3', /Flags:\s*3/.test(t.replace(/\s+/g, ' ')));
    ok('cameras on = 3 (on statuses across sittings)', /Cameras on:\s*3/.test(t.replace(/\s+/g, ' ')));

    /* ── 3. per-class bars ── */
    ok('SS1: 77% avg · 3 sat', /SS1[\s\S]{0,80}77% avg · 3 sat/.test(t));
    ok('SS2: 60% avg · 2 sat', /SS2[\s\S]{0,80}60% avg · 2 sat/.test(t));
    ok('SS3: no graded sittings yet · 2 sat', /SS3[\s\S]{0,80}no graded sittings · 2 sat/.test(t));
    ok('one horizontal bar per class', await T.p.locator('#cbtConsBody .cbt-hbar').count() >= 3);

    /* ── 4. score spread ── */
    ok('score spread renders 10 band bars', await T.p.locator('.cbt-bar[title="Graded sittings by score band"] i').count() === 10);
    const hist = await T.p.evaluate(() => MAMSS_CBT._test.dash().stats.hist);
    ok('histogram buckets exact: 50s…90s one each', JSON.stringify(hist) === JSON.stringify([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]), hist);

    /* ── 5. every-paper table ── */
    ok('every-paper table lists all 3 sessions', /Midterm Maths[\s\S]*English Mock[\s\S]*Live Mixed Paper/.test(t) || (await T.p.locator('[data-dash-open]').count()) === 3);
    ok('the live paper is flagged LIVE', /LIVE/.test(t));
    ok('top scorer shown per paper (Chidi Okeke · 90%)', /Chidi Okeke · 90%/.test(t));
    ok('paper without graded sittings shows — for avg/top', (t.match(/—/g) || []).length >= 2);

    /* ── 6. drill-down into the existing results view ── */
    await T.p.click('[data-dash-open="AAA111"]');
    await T.p.waitForFunction(() => /Class ranking/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    t = await body(T);
    ok('Open → jumps straight into that paper\'s full results', /Class ranking/.test(t) && /Chidi Okeke/.test(t));
    ok('per-question accuracy carried over from v54 results', /Per-question accuracy/.test(t) && /2\+2\?/.test(t));
    ok('results tab is now the active one', await T.p.locator('[data-ctab="results"].on').count() === 1);
    await T.p.click('[data-ctab="school"]');
    await T.p.waitForFunction(() => /Whole school/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });

    /* ── 7. activation roll-out ── */
    t = await body(T);
    ok('main batch: 5 of 120 slips used', /5 of 120 slips used/.test(t));
    ok('topup batch: 2 of 380 slips used', /2 of 380 slips used/.test(t));
    ok('teacher batch: 1 of 10 slips used', /1 of 10 slips used/.test(t));
    ok('school total: 8 of 510 activated', /8 of 510 slips activated/.test(t));
    ok('weekly pace: 4 in the last 7 days', /4 in the last 7 days/.test(t));
    ok('privacy note: practice progress never appears here', /private to each student/i.test(t));

    /* ── 8. buttons ── */
    await T.p.click('#cbtDashCsv');
    await sleep(400);
    ok('CSV export fires without a page error', T.errs.length === 0, T.errs.slice(0, 2));
    await T.p.evaluate(() => { window.__wa = null; window.open = function (u) { window.__wa = u; return null; }; });
    await T.p.click('#cbtDashWa');
    const wa = await T.p.evaluate(() => decodeURIComponent(window.__wa || ''));
    ok('WhatsApp summary carries the real numbers', /school dashboard/i.test(wa) && /School average: 70%/.test(wa) && /7 sittings · 6 students/.test(wa) && /Strongest paper: Midterm Maths \(77% avg\)/.test(wa), wa.slice(0, 200));
    await T.p.click('#cbtDashRefresh');
    await T.p.waitForFunction(() => /Whole school/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    ok('manual refresh re-renders cleanly', /Updated/.test(await body(T)));

    /* ── 9. pure-aggregator unit checks ── */
    const unit = await T.p.evaluate(() => {
      const S = MAMSS_CBT._test.schoolStats;
      const empty = S([], [], null);
      const dup = S([{ code: 'X1', title: 'x', cls: 'SS1', status: 'ended', created_at: new Date().toISOString() }],
        [{ session_code: 'X1', name: 'A', slip: 'S1', status: 'submitted', score: 10, total: 10, integrity: 0 },
         { session_code: 'X1', name: 'A again', slip: 'S1', status: 'submitted', score: 8, total: 10, integrity: 0 }], null);
      const perfect = S([{ code: 'X2', title: 'y', cls: 'SS2', status: 'ended', created_at: new Date().toISOString() }],
        [{ session_code: 'X2', name: 'P', slip: 'S2', status: 'submitted', score: 10, total: 10, integrity: 0 }], null);
      const week = S([], [], [{ batch: 'B', redeemed_at: new Date(Date.now() - 8 * 86400000).toISOString() }, { batch: 'B', redeemed_at: new Date().toISOString() }]);
      return { empty, dup, perfect, week };
    });
    ok('empty school: nulls, not NaNs', unit.empty.avg === null && unit.empty.sessions === 0 && unit.empty.hist.every(x => x === 0));
    ok('same slip twice = 1 student, avg of both sittings', unit.dup.students === 1 && unit.dup.avg === 90, unit.dup);
    ok('100% lands in the top bucket', unit.perfect.hist[9] === 1);
    ok('8-day-old activation outside the weekly window', unit.week.act.week === 1 && unit.week.act.total === 2);

    ALL.push(...T.errs);

    /* ── 10. degraded & role gating ── */
    const D2 = await mkCtx(browser, 'teacher', { tag: 'dead', deadTables: true });
    await openCbt(D2.p);
    await D2.p.evaluate(() => MAMSS_CBT.openTeacher());
    await D2.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    await D2.p.click('[data-ctab="school"]');
    await D2.p.waitForFunction(() => /being set up/i.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    ok('missing tables → the friendly "being set up" note', true);
    ALL.push(...D2.errs);

    const S2 = await mkCtx(browser, 'student', { tag: 'stu' });
    await openCbt(S2.p);
    await S2.p.evaluate(() => MAMSS_CBT.openTeacher && MAMSS_CBT.openTeacher());
    await sleep(400);
    ok('students never see the School tab (console is teacher-gated)', await S2.p.locator('[data-ctab="school"]').count() === 0);
    ALL.push(...S2.errs);

    ok('zero page errors across every context', ALL.length === 0, ALL.slice(0, 3));
  } finally {
    await browser.close();
    try { mock.kill('SIGKILL'); } catch (e) {}
  }
  console.log('\ndashtest: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e); process.exit(1); });
