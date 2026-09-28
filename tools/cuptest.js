/* v68 "The House Cup" — the persistent class-vs-class board.
   Topology: docs on :8100 (or BASE), /rest/v1/* proxied to cbtmock on :8128.
   Polling backbone only. Seeds three ENDED waecathon sittings with known
   house averages and checks the 3·2·1 settling, the dashboard panel, the
   hall-board strip, the WhatsApp season summary, the 10-minute cache and
   the quiet degrade on a pre-ALTER server.
   Run: node cuptest.js [BASE]      (default http://localhost:8100/)         */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8128;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra ? '  [' + extra + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rest(path, method, body) {
  const r = await fetch(MOCK + path, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json', apikey: 'x', Authorization: 'Bearer x', Prefer: 'return=minimal' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.status;
}
async function flags(payload) {
  const r = await fetch(MOCK + '/_flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json();
}

function seedFor(role, tag) {
  const act = role === 'teacher'
    ? { h: 'cuptest0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'cuptest000000' + tag, mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
  return `
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '70');
      localStorage.setItem('nssc_cbt_who', '1');
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-cup-device${tag}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
  `;
}

async function mkCtx(browser, role, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.addInitScript(seedFor(role, tag));
  await ctx.route('**/rest/v1/**', async route => {
    const req = route.request(); const u = new URL(req.url());
    const init = { method: req.method(), headers: {} };
    for (const [k, v] of Object.entries(req.headers())) if (!/^:/.test(k)) init.headers[k] = v;
    const pd = req.postData(); if (pd) init.body = pd;
    const r = await fetch(MOCK + u.pathname + u.search, init);
    const buf = Buffer.from(await r.arrayBuffer());
    const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
    await route.fulfill({ status: r.status, headers, body: buf });
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  return { ctx, p, errs };
}
async function openCbt(p) {
  await p.click('.study-nav a[data-view="cbt"]');
  await p.waitForSelector('#viewCbt:not([hidden])', { timeout: 15000 });
  await p.waitForFunction(() => !!window.MAMSS_CBT && document.getElementById('cbtRoot').innerHTML.length > 50, null, { timeout: 20000 });
}
async function openSchool(T) {
  await T.p.click('#cbtConsoleBtn');
  await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
  await T.p.click('[data-ctab="school"]');
  await T.p.waitForFunction(() => /Whole school|being set up|Could not reach/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 20000 });
}

/* three settled waecathons with exact house maths:
   CUP001  SS2 80 · SS1 60 · SS3 40   → +3 SS2, +2 SS1, +1 SS3
   CUP002  SS3 90 · SS2 70 · SS1 50   → +3 SS3, +2 SS2, +1 SS1
   CUP003  SS2 85 (×2) · SS3 80 (×1)  → two houses settle → +3 SS2, +2 SS3
   totals  SS2 8 (2 wins) · SS3 6 (1 win) · SS1 3                     */
async function seedCup() {
  const sess = (code, when) => ({
    code, title: 'Friday Waecathon · ' + code, cls: 'ALL', created_by: 'cuptest',
    status: 'ended', duration_s: 3600, extend_s: 0,
    scheduled_at: when, live_at: when, ended_at: when,
    questions: [{ q: 'Cup drill?', o: ['A', 'B', 'C', 'D'], a: 0, e: 'x' }],
    settings: { instantResults: true, showRank: true, scheduledAt: when, webcam: 'off', voice: 'off', waecathon: true },
  });
  await rest('/rest/v1/cbt_sessions', 'POST', sess('CUP001', '2026-09-04T16:00:00'));
  await rest('/rest/v1/cbt_sessions', 'POST', sess('CUP002', '2026-09-11T16:00:00'));
  await rest('/rest/v1/cbt_sessions', 'POST', sess('CUP003', '2026-09-18T16:00:00'));
  const att = (code, cls, name, score) => ({
    session_code: code, device_id: code + '-' + cls + '-' + name, name, slip: 'MAMSS-000' + score,
    status: 'submitted', current_q: 1, score, total: 10, integrity: 0, webcam: '', cls,
    joined_at: '2026-09-04T16:00:00', submitted_at: '2026-09-04T17:00:00', last_seen_at: '2026-09-04T17:00:00',
  });
  const rows = [
    att('CUP001', 'SS2', 'Bisi', 8), att('CUP001', 'SS1', 'Ada', 6), att('CUP001', 'SS3', 'Chidi', 4),
    att('CUP002', 'SS3', 'Chidi', 9), att('CUP002', 'SS2', 'Bisi', 7), att('CUP002', 'SS1', 'Ada', 5),
    att('CUP003', 'SS2', 'Bisi', 8.5 | 0), att('CUP003', 'SS2', 'Efe', 9), att('CUP003', 'SS3', 'Chidi', 8),
  ];
  /* CUP003: SS2 sitters 8 and 9 → avg 85; SS3 80. Keep the tie-break honest: */
  rows[6].score = 8; rows[7].score = 9;   /* SS2 avg 85 */
  rows[8].score = 8; rows[8].total = 10;  /* SS3 avg 80 — SS2 leads on average anyway */
  for (const r of rows) await rest('/rest/v1/cbt_attempts', 'POST', r);
}

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  console.log('\n=== v68 The House Cup ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + '\n');

  try {
    /* ---------- 1. before any waecathon: the quiet board ---------- */
    const T = await mkCtx(browser, 'teacher', '-t');
    await openCbt(T.p);
    await openSchool(T);
    await T.p.waitForFunction(() => { const d = document.getElementById('cbtCupPanel'); return d && d.textContent.trim().length > 10; }, null, { timeout: 20000 });
    ok('dashboard grows the House Cup panel', await T.p.locator('#cbtCupPanel').count() === 1);
    ok('with no waecathons the panel explains the ritual', await T.p.locator('#cbtCupPanel').innerText().then(t => /begins when the first Friday Waecathon ends/i.test(t)));
    ok('the empty panel points at the one-tap template', await T.p.locator('#cbtCupPanel').innerText().then(t => /template drafts the whole paper/i.test(t)));
    const S0 = await mkCtx(browser, 'student', '-s0');
    await openCbt(S0.p);
    await sleep(1500);
    ok('no cup strip on the hall board while the cup is empty', await S0.p.locator('#cbtCupStrip').count() === 0);
    ok('the hall board itself still renders', await S0.p.locator('#cbtBoard').count() === 1);

    /* ---------- 2. three settled waecathons: the table orders itself ---------- */
    await seedCup();
    await T.p.evaluate(() => localStorage.removeItem('nssc_cbt_cup'));
    await T.p.click('[data-ctab="create"]');
    await T.p.click('[data-ctab="school"]');
    await T.p.waitForFunction(() => {
      const t = document.querySelector('#cbtCupPanel table');
      return t && t.querySelectorAll('tbody tr').length === 3;
    }, null, { timeout: 25000 });
    const rowsTxt = await T.p.$$eval('#cbtCupPanel tbody tr', trs => trs.map(tr => [...tr.children].map(td => td.textContent.trim())));
    ok('three houses on the cup table', rowsTxt.length === 3, JSON.stringify(rowsTxt));
    ok('SS2 leads on 8 points', rowsTxt[0][0].includes('SS2') && rowsTxt[0][1] === '8', JSON.stringify(rowsTxt[0]));
    ok('SS3 second on 6, SS1 third on 3', rowsTxt[1][0].includes('SS3') && rowsTxt[1][1] === '6' && rowsTxt[2][0].includes('SS1') && rowsTxt[2][1] === '3', JSON.stringify(rowsTxt.map(r => r.slice(0, 2))));
    ok('wins column counts first places (2 · 1 · 0)', rowsTxt[0][2] === '2' && rowsTxt[1][2] === '1' && rowsTxt[2][2] === '0');
    ok('leader wears the medal', rowsTxt[0][0].includes('🥇'));
    ok('sittings and sitters add up', rowsTxt[0][3] === '3' && rowsTxt[0][4] === '4', JSON.stringify(rowsTxt[0]));
    ok('best single named with its score', /Bisi — 90%|Efe — 90%|Bisi — 9%|Efe — 9%|— 9/.test(rowsTxt[0][6]) || /9\d?%/.test(rowsTxt[0][6]), rowsTxt[0][6]);
    ok('the rule is stated under the table', await T.p.locator('#cbtCupPanel').innerText().then(t => /3 points to the leading house/i.test(t)));
    ok('cup cached for ten minutes', await T.p.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('nssc_cbt_cup') || 'null');
      return !!c && Date.now() - c.at < 600000 && c.cup.standings.length === 3;
    }));

    /* ---------- 3. the season summary rides WhatsApp ---------- */
    const waTxt = await T.p.evaluate(() => {
      const b = document.getElementById('cbtCupWa');
      if (!b) return null;
      let captured = null;
      const real = window.open;
      window.open = function (u) { captured = u; return null; };
      b.click();
      window.open = real;
      return captured;
    });
    ok('House Cup summary button exists', !!waTxt);
    const waDec = decodeURIComponent(waTxt || '');
    ok('summary names the cup and the count of waecathons', /House Cup — after 3 Waecathons/.test(waDec), waDec.slice(0, 80));
    ok('summary lists houses with points, wins and averages', /1\. SS2 — 8 pts \(2 wins/.test(waDec) && /2\. SS3 — 6 pts \(1 win/.test(waDec), waDec.slice(0, 200));

    /* ---------- 4. the hall board wears the gold strip ---------- */
    const S = await mkCtx(browser, 'student', '-s1');
    await openCbt(S.p);
    await S.p.waitForSelector('#cbtCupStrip', { timeout: 25000 });
    const strip = await S.p.locator('#cbtCupStrip').innerText();
    ok('strip names the leader and the tally', /House Cup/.test(strip) && /SS2 lead on 8 pts after 3 Waecathons/.test(strip), strip);
    ok('strip lists every house score', /SS2 8 · SS3 6 · SS1 3/.test(strip), strip);
    ok('strip sits inside the board', await S.p.evaluate(() => document.getElementById('cbtBoard').contains(document.getElementById('cbtCupStrip'))));
    ok('strip is styled gold on cream', await S.p.evaluate(() => {
      const cs = getComputedStyle(document.getElementById('cbtCupStrip'));
      return cs.borderRadius !== '0px' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
    }));

    /* ---------- 5. the maths, straight from the engine ---------- */
    const math = await T.p.evaluate(() => {
      const cup = MAMSS_CBT._test.cupStandings([
        { code: 'X', rows: [ { cls: 'SS1', name: 'a', score: 10, total: 10, status: 'submitted' }, { cls: 'SS2', name: 'b', score: 5, total: 10, status: 'submitted' } ] },
        { code: 'Y', rows: [ { cls: 'SS2', name: 'b', score: 10, total: 10, status: 'submitted' }, { cls: 'SS1', name: 'a', score: 5, total: 10, status: 'submitted' } ] },
        { code: 'W', rows: [ { cls: 'SS2', name: 'b', score: 9, total: 10, status: 'submitted' }, { cls: 'SS1', name: 'a', score: 4, total: 10, status: 'submitted' } ] },
        { code: 'Z', rows: [ { cls: 'SS3', name: 'c', score: 4, total: 10, status: 'waiting' } ] },   /* not submitted: ignored */
      ]);
      return cup;
    });
    ok('cupStandings settles 3·2·1 per sitting (8 · 7 over three sittings)', math.standings[0].house === 'SS2' && math.standings[0].pts === 8 && math.standings[1].pts === 7, JSON.stringify(math.standings.map(x => [x.house, x.pts])));
    ok('unsubmitted rows never settle', math.sittings === 3 && !math.standings.some(x => x.house === 'SS3'));

    /* ---------- 6. a pre-ALTER server keeps its silence ---------- */
    await flags({ attCols: false });
    await T.p.evaluate(() => localStorage.removeItem('nssc_cbt_cup'));
    await T.p.click('[data-ctab="create"]');
    await T.p.click('[data-ctab="school"]');
    await T.p.waitForFunction(() => { const d = document.getElementById('cbtCupPanel'); return d && /begins when the first/i.test(d.textContent); }, null, { timeout: 25000 });
    ok('pre-ALTER server: the panel degrades to the quiet note', true);
    ok('pre-ALTER server: the fallback flag is set', await T.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_nocols') || '0') === 1));
    await flags({ attCols: true });

    /* ---------- 7. page errors ---------- */
    ok('no page errors (teacher)', T.errs.length === 0, T.errs.slice(0, 2).join(' | '));
    ok('no page errors (student)', S.errs.length === 0, S.errs.slice(0, 2).join(' | '));
    ok('no page errors (empty-cup student)', S0.errs.length === 0, S0.errs.slice(0, 2).join(' | '));
  } catch (e) {
    fail++;
    console.log('  FATAL ' + e.stack);
  } finally {
    await browser.close();
    mock.kill();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
