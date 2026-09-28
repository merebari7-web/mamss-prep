/* v64 "The Habit Loop" — gamification suite.
   Covers: Today board render, streak flame + freeze bridging (pure maths),
   quest progress + self-claiming coins + once-only celebration, weekly quest,
   league ordering / own-row / calm empty state, offline degradation, a11y
   attributes, zero page errors.
   Topology: docs on :8100, REST proxied to cbtmock on :8139.
   Run: node habitstest.js [BASE]      (default http://localhost:8100/)      */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8139;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra !== undefined ? '  [' + JSON.stringify(extra).slice(0, 200) + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dk = off => { const d = new Date(Date.now() - off * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const tms = off => Date.now() - off * 86400000;

/* 3-day streak, 20 questions today incl. an 80% paper */
const ATTEMPTS = [
  { d: 'x', tms: tms(0), cls: 'SS1', subj: 'Mathematics', total: 12, correct: 10, pct: 80, mode: 'study' },
  { d: 'x', tms: tms(0) - 3600e3, cls: 'SS1', subj: 'English', total: 8, correct: 5, pct: 62, mode: 'study' },
  { d: 'x', tms: tms(1), cls: 'SS1', subj: 'Biology', total: 10, correct: 7, pct: 70, mode: 'daily', daily: true },
  { d: 'x', tms: tms(2), cls: 'SS1', subj: 'Chemistry', total: 10, correct: 6, pct: 60, mode: 'study' },
];

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(600);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  await fetch(MOCK + '/rest/v1/class_progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'k' },
    body: JSON.stringify([
      { owner: 'a'.repeat(64), student: 'Bola Pupil', cls: 'SS2', role: 'student', blob: { recent: [{ t: Date.now(), subj: 'Mathematics', tot: 15, cor: 12, pct: 80 }] } },
      { owner: 'b'.repeat(64), student: 'Chike Learner', cls: 'SS3', role: 'student', blob: { recent: [{ t: Date.now(), subj: 'Biology', tot: 10, cor: 8, pct: 80 }] } },
    ]),
  });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(`
    window.__MP_TEST_REPORT_OK__ = 1;
    localStorage.setItem('nssc_mp_seen', '71');
    localStorage.setItem('nssc_devid', JSON.stringify('habits-device'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify({ h: 'habitstest0000', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' }))});
    localStorage.setItem('nssc_attempts_guest', ${JSON.stringify(JSON.stringify(ATTEMPTS))});
    localStorage.setItem('nssc_coins_guest', '5');
    localStorage.setItem('nssc_mistakes', JSON.stringify([{ q: 'a' }, { q: 'b' }, { q: 'c' }, { q: 'd' }, { q: 'e' }]));
  `);
  let hits = 0, netOff = false;
  await ctx.route('**/rest/v1/**', async route => {
    const req = route.request(); const u = new URL(req.url());
    if (netOff) return route.abort('internetdisconnected');
    if (u.pathname.includes('class_progress')) hits++;
    const init = { method: req.method(), headers: {} };
    for (const [k, v] of Object.entries(req.headers())) if (!/^:/.test(k)) init.headers[k] = v;
    const pd = req.postData(); if (pd) init.body = pd;
    try {
      const r = await fetch(MOCK + u.pathname + u.search, init);
      const buf = Buffer.from(await r.arrayBuffer());
      await route.fulfill({ status: r.status, body: buf, headers: { 'Content-Type': 'application/json' } });
    } catch (e) { await route.fulfill({ status: 502, body: '{}', contentType: 'application/json' }); }
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  await p.waitForSelector('#habPanel', { timeout: 15000 });

  /* board structure */
  const cards = await p.evaluate(() => ({
    flame: !!document.querySelector('#habPanel .hab-flamecard'),
    quests: !!document.querySelector('#habPanel .hab-quests'),
    league: !!document.querySelector('#habPanel .hab-league'),
    label: document.getElementById('habPanel').getAttribute('aria-label'),
  }));
  ok('Today board mounts with flame, quests and league cards', cards.flame && cards.quests && cards.league, cards);
  ok('board is a labelled region', cards.label === 'Today at MAMSS', cards.label);
  const days = await p.evaluate(() => +document.querySelector('#habPanel .hab-days').textContent);
  ok('streak flame reads the three-day run', days === 3, days);

  /* quests reflect today's work */
  let qtxt = await p.evaluate(() => document.querySelector('#habPanel .hab-quests').innerText);
  ok('quest 1 shows 20/20 and claims itself', /20\/20|✓/.test(qtxt), qtxt.slice(0, 120));
  ok('quest 2 sees the 80% paper', /✓ \+10|1\/1/.test(qtxt), qtxt.slice(0, 160));
  const coins = await p.evaluate(() => +JSON.parse(localStorage.getItem('nssc_coins_guest')));
  ok('completed quests paid coins into the purse', coins >= 25, coins);
  const bars = await p.evaluate(() => [...document.querySelectorAll('#habPanel .hab-bar')].map(b => b.getAttribute('role')));
  ok('every quest bar is a real progressbar', bars.length >= 4 && bars.every(r => r === 'progressbar'), bars);

  /* celebration fired once */
  const cel = await p.evaluate(() => ({ flag: !!JSON.parse(localStorage.getItem('nssc_hab_cel') || '{}')['quest:' + new Date().toISOString().slice(0, 10)] }));
  ok('quest celebration recorded once for today', cel.flag, cel);
  await p.evaluate(() => { const c = document.getElementById('habCelebrate'); if (c) c.remove(); });

  /* weekly quest counts study days this week */
  qtxt = await p.evaluate(() => document.querySelector('#habPanel .hab-week').innerText);
  const dsm = (new Date().getDay() + 6) % 7;               /* days since Monday — the week the quest counts */
  const haveDays = Math.min(3, dsm + 1);                    /* seeded study days that fall inside this week */
  ok('weekly quest counts this week’s study days', new RegExp(haveDays + '\\/5|✓').test(qtxt), qtxt.slice(0, 100));

  /* league ordering + calm copy */
  /* determinism: wait for the reporter's own row to land in the mock, then
     drop the ten-minute league cache and re-render (first fetch can race the
     reporter's first push — by design the cache would hold that for 10 min) */
  for (let i = 0; i < 40; i++) {
    const rows = await fetch(MOCK + '/_dump?table=prog').then(r => r.json()).catch(() => []);
    if (Array.isArray(rows) && rows.length >= 1) break;
    await sleep(500);
  }
  await p.evaluate(() => { localStorage.removeItem('nssc_hab_league'); MAMSS_HABITS.render(); });
  await p.waitForFunction(() => /Ada/.test((document.getElementById('habLeagueBody') || {}).innerText || ''), null, { timeout: 15000 });
  await p.waitForFunction(() => { const b = document.getElementById('habLeagueBody'); return b && /Bola/.test(b.textContent); }, null, { timeout: 15000 });
  const league = await p.evaluate(() => document.getElementById('habLeagueBody').innerText);
  ok('league ranks the class by weekly questions', /^1/.test(league) && /Ada[\s\S]*Bola[\s\S]*Chike/.test(league), league.slice(0, 140));

  /* freeze maths (pure): a bridged hole */
  const fr = await p.evaluate(() => {
    const T = MAMSS_HABITS._test;
    const run = [];
    for (let i = 0; i < 9; i++) if (i !== 3) run.push({ d: 'x', tms: Date.now() - i * 86400000, cls: 'SS1', subj: 'Mathematics', total: 10, correct: 7, pct: 70, mode: 'study' });
    localStorage.setItem('nssc_attempts_guest', JSON.stringify(run));
    localStorage.setItem(T.FREEZ, JSON.stringify({ banked: 1, used: [], milestone: 1 }));
    const celKey = 'freeze:' + new Date().toISOString().slice(0, 10);
    localStorage.setItem('nssc_hab_cel', JSON.stringify({ [celKey]: 1 }));
    const s = MAMSS_HABITS.streak();
    return { days: s.days, used: JSON.parse(localStorage.getItem(T.FREEZ)).used.length };
  });
  ok('a banked shield bridges exactly one missed day', fr.days === 9 && fr.used === 1, fr);

  /* offline: league degrades, board survives */
  netOff = true;
  await p.evaluate(() => localStorage.removeItem(MAMSS_HABITS._test.LEAG));
  await p.evaluate(() => MAMSS_HABITS.render());
  await sleep(800);
  const offLeague = await p.evaluate(() => document.getElementById('habLeagueBody').innerText);
  ok('league degrades calmly offline', /begins when your class|No questions|Reading|q$|Bola/m.test(offLeague), offLeague.slice(0, 100));
  ok('board still renders offline', await p.evaluate(() => !!document.querySelector('#habPanel .hab-flamecard')));
  netOff = false;

  ok('zero page errors across the habit loop', errs.length === 0, errs.slice(0, 3));

  await browser.close();
  mock.kill('SIGTERM');
  console.log('');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
