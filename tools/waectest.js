/* v67 "The Friday Waecathon" — end-to-end suite.
   Same topology as cbttest.js: docs on :8100 (or BASE), every /rest/v1/*
   call proxied to the in-memory cbtmock on :8125, polling backbone only
   (no socket needed — nothing here streams).
   Covers: the one-tap template, the ALL draw, waecathon session settings,
   the house stamp on join, the house table + WhatsApp summary, the Today
   board banner (countdown → doors open → into the hall), and the
   pre-ALTER degradation path.
   Run: node waectest.js [BASE]      (default http://localhost:8100/)        */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function enterExam(p, ms) {
  await p.waitForFunction(() => document.getElementById('cbtGateGo') || document.getElementById('cbtBriefGo') || document.getElementById('cbtRunTimer'), null, { timeout: ms || 20000 });
  if (await p.locator('#cbtGateGo').count()) {
    await p.click('#cbtGateCamEnable');
    await p.click('#cbtGateVoxEnable');
    await p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 15000 });
    await p.click('#cbtGateGo');
  }
  await p.waitForFunction(() => document.getElementById('cbtBriefGo') || document.getElementById('cbtRunTimer'), null, { timeout: 8000 });
  if (await p.locator('#cbtBriefGo').count()) { await p.check('#cbtBriefOk'); await p.click('#cbtBriefGo'); }
  await p.waitForSelector('#cbtRunTimer', { timeout: 8000 });
}

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8125;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra ? '  [' + extra + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function dump(table) {
  const r = await fetch(MOCK + '/_dump?table=' + table);
  return r.json();
}
async function tweak(payload) {
  const r = await fetch(MOCK + '/_tweak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json();
}
async function flags(payload) {
  const r = await fetch(MOCK + '/_flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json();
}

function seedFor(role, opts) {
  opts = opts || {};
  const act = role === 'teacher'
    ? { h: 'waectest0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'waectest000000' + (opts.tag || '1'), mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: opts.name || 'Ada Student' };
  return `
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '70');
      localStorage.setItem('nssc_cbt_who', '1');
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-waec-device${opts.tag || ''}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
    ${opts.grade != null ? "localStorage.setItem('study_grade', JSON.stringify(" + opts.grade + "));" : ''}
  `;
}

async function mkCtx(browser, role, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.addInitScript(seedFor(role, opts));
  await ctx.route('**/rest/v1/**', async route => {
    const req = route.request();
    const u = new URL(req.url());
    try {
      const init = { method: req.method(), headers: {} };
      for (const [k, v] of Object.entries(req.headers())) if (!/^:/.test(k)) init.headers[k] = v;
      const pd = req.postData();
      if (pd) init.body = pd;
      const r = await fetch(MOCK + u.pathname + u.search, init);
      const buf = Buffer.from(await r.arrayBuffer());
      const headers = {};
      r.headers.forEach((v, k) => { headers[k] = v; });
      await route.fulfill({ status: r.status, headers, body: buf });
    } catch (e) {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'mock proxy: ' + e.message }) });
    }
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
  await p.waitForFunction(() => !!window.MAMSS_CBT && document.getElementById('cbtRoot') && document.getElementById('cbtRoot').innerHTML.length > 50, null, { timeout: 20000 });
}
async function openOverview(p) {
  await p.click('.study-nav a[data-view="overview"]');
  await p.waitForSelector('#viewOverview:not([hidden])', { timeout: 15000 });
}

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  console.log('\n=== v67 The Friday Waecathon ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + '\n');

  try {
    /* ---------- 1. the template button drafts the whole event ---------- */
    const T = await mkCtx(browser, 'teacher');
    await openCbt(T.p);
    await T.p.click('#cbtConsoleBtn');
    await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    await T.p.waitForFunction(() => typeof CLASSES !== 'undefined' && CLASSES.length === 3, null, { timeout: 45000 });
    ok('builder offers the Waecathon template', await T.p.locator('#cbtWaecTpl').count() === 1);
    ok('class row grew the 🏆 All option', await T.p.locator('[data-cls="ALL"]').count() === 1);
    await T.p.click('#cbtWaecTpl');
    await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length >= 40, null, { timeout: 60000 });
    ok('template drew a full 40-question paper', (await T.p.locator('.cbt-draft-q').count()) === 40);
    const stems = await T.p.$$eval('.cbt-draft-q b', bs => bs.map(b => b.textContent.trim()));
    ok('all 40 questions unique', new Set(stems).size === stems.length);
    ok('draft is set to ALL classes', await T.p.locator('[data-cls="ALL"].on').count() === 1);
    ok('title names the festival + its Friday', await T.p.inputValue('#cbtDraftTitle').then(t => /Friday Waecathon · \d/.test(t)), await T.p.inputValue('#cbtDraftTitle'));
    ok('count = 40, duration = 60', (await T.p.inputValue('#cbtCount')) === '40' && (await T.p.inputValue('#cbtDuration')) === '60');
    ok('waecathon checkbox ticked', await T.p.isChecked('#cbtWaec'));
    ok('the Waecathon template requires live room audio', (await T.p.inputValue('#cbtVoice')) === 'required');
    /* the scheduled sitting must be the NEXT Friday at 16:00 local */
    const sched = await T.p.inputValue('#cbtSched');
    const when = new Date(sched);
    ok('sitting is pinned to a Friday', sched && when.getDay() === 5, sched);
    ok('sitting starts at 16:00', sched && when.getHours() === 16 && when.getMinutes() === 0, sched);
    ok('sitting is in the future', when.getTime() > Date.now(), sched);
    const nf = await T.p.evaluate(() => MAMSS_CBT._test.nextFriday16().toISOString());
    ok('nextFriday16() agrees with the form', new Date(nf).getTime() === when.getTime(), nf + ' vs ' + when.toISOString());

    /* ---------- 2. go live: the session carries the festival ---------- */
    await T.p.click('#cbtGoLive');
    await T.p.waitForSelector('.cbt-big-code', { timeout: 20000 });
    const code = (await T.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
    const sess = (await dump('sessions')).find(x => x.code === code);
    ok('session stored with cls=ALL', !!sess && sess.cls === 'ALL');
    ok('settings carry waecathon=true', !!sess && sess.settings && sess.settings.waecathon === true);
    ok('settings carry voice=required (school policy)', !!sess && sess.settings.voice === 'required');
    ok('the Waecathon ships shuffled per device', !!sess && sess.settings.shuffle === true);
    ok('settings kept scheduled_at', !!sess && !!sess.settings.scheduledAt);
    await T.p.click('#cbtStart');
    await T.p.waitForSelector('.cbt-chip.live', { timeout: 10000 });
    ok('the Waecathon goes live', true);

    /* ---------- 3. houses: every joiner stamps its own class ---------- */
    const S1 = await mkCtx(browser, 'student', { tag: '-s1', grade: 0, name: 'Ada Student' });   /* SS1 */
    const S3 = await mkCtx(browser, 'student', { tag: '-s3', grade: 2, name: 'Bisi Student' });   /* SS3 */
    await openCbt(S1.p);
    await S1.p.fill('#cbtJoinCode', code);
    await S1.p.click('#cbtJoinBtn');
    await enterExam(S1.p, 25000);
    await openCbt(S3.p);
    await S3.p.fill('#cbtJoinCode', code);
    await S3.p.click('#cbtJoinBtn');
    await enterExam(S3.p, 25000);
    const atts = (await dump('attempts')).filter(a => a.session_code === code);
    ok('both students joined the festival', atts.length === 2, JSON.stringify(atts.map(a => a.name)));
    ok('SS1 student stamped cls=SS1', atts.some(a => a.name === 'Ada Student' && a.cls === 'SS1'));
    ok('SS3 student stamped cls=SS3', atts.some(a => a.name === 'Bisi Student' && a.cls === 'SS3'));
    ok('clsOf() reads the same study_grade key as the reporter',
      await S3.p.evaluate(() => MAMSS_CBT._test.clsOf() === 'SS3'));

    /* ---------- 4. submit, then the house table settles it ---------- */
    for (const S of [S1, S3]) {
      for (let i = 1; i <= 40; i++) {
        await S.p.waitForSelector('.cbt-opt', { timeout: 10000 });
        await S.p.locator('.cbt-opt').nth(i % 4).click();
        await S.p.waitForFunction(() => { const b = document.getElementById('cbtNextBtn'); return b && !b.disabled; }, null, { timeout: 8000 });
        const isLast = i === 40;
        await S.p.click('#cbtNextBtn');
        if (isLast) {
          await S.p.waitForSelector('#cbtRevSubmit', { timeout: 10000 });
          await S.p.click('#cbtRevSubmit');
        } else {
          await S.p.waitForFunction(n => document.querySelectorAll('#cbtPalHost .done').length === n, i, { timeout: 10000 });
        }
      }
      await S.p.waitForFunction(() => /SUBMITTED/i.test(document.querySelector('#viewCbt').textContent), null, { timeout: 20000 });
    }
    ok('both papers submitted', (await dump('attempts')).filter(a => a.session_code === code && ['submitted', 'autosubmitted'].includes(a.status)).length === 2);
    await T.p.click('[data-ctab="results"]');
    await T.p.waitForSelector('#cbtConsBody', { timeout: 30000 });
    await T.p.waitForFunction(() => /House table/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 20000 });
    const resTxt = await T.p.locator('#cbtConsBody').innerText();
    ok('results grow the 🏆 House table', /🏆 House table/.test(resTxt));
    ok('both houses are on the table', /SS1/.test(resTxt) && /SS3/.test(resTxt));
    ok('table names a top scorer per house', /Top scorer/i.test(resTxt) && /Ada Student|Bisi Student/.test(resTxt));
    ok('leading house wears the medal', /🥇/.test(resTxt));
    ok('table promises it lives on the server', /outlasts the exam/i.test(resTxt));
    const houseRows = await T.p.$$eval('#cbtConsBody table', ts => {
      const t = ts.find(x => /House/.test(x.textContent) && /Average/.test(x.textContent));
      return t ? [...t.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim())) : null;
    });
    ok('house table is ordered by average, descending',
      !!houseRows && houseRows.length === 2 &&
      parseInt(houseRows[0][2]) >= parseInt(houseRows[1][2]),
      JSON.stringify(houseRows));

    /* ---------- 5. the WhatsApp summary posts the house table ---------- */
    const waTxt = await T.p.evaluate(() => {
      const wa = document.getElementById('cbtWaResults');
      if (!wa) return null;
      let captured = null;
      const realOpen = window.open;
      window.open = function (u) { captured = u; return null; };
      wa.click();
      window.open = realOpen;
      return captured;
    });
    ok('WhatsApp summary exists on the results card', !!waTxt);
    ok('summary carries the house table', !!waTxt && /House%20table|House table/.test(decodeURIComponent(waTxt || '')), waTxt && decodeURIComponent(waTxt).slice(0, 120));

    /* ---------- 6. the Today board banner counts the festival down ---------- */
    await openOverview(S1.p);
    await S1.p.waitForFunction(() => !!window.MAMSS_HABITS, null, { timeout: 20000 });
    /* the sitting is live right now, so the banner must be the door, not a countdown */
    await S1.p.evaluate(() => localStorage.removeItem('nssc_hab_waec'));
    await S1.p.evaluate(() => MAMSS_HABITS.render());
    await S1.p.waitForFunction(() => { const b = document.getElementById('habWaec'); return b && !b.hidden && b.textContent.trim().length > 5; }, null, { timeout: 20000 });
    ok('banner appears on the Today board while the Waecathon is live', true);
    ok('banner says the festival is live', await S1.p.locator('#habWaec').innerText().then(t => /LIVE|doors are open/i.test(t)), await S1.p.locator('#habWaec').innerText());
    ok('banner becomes the door into the hall', await S1.p.locator('#habWaec [data-goto-cbt]').count() === 1);
    ok('banner spans the whole board', await S1.p.evaluate(() => {
      const b = document.getElementById('habWaec');
      const g = b.parentElement.getBoundingClientRect();
      return b.getBoundingClientRect().width > g.width * 0.9;
    }));
    /* one tap walks the student into the CBT hall */
    await S1.p.click('#habWaec [data-goto-cbt]');
    await S1.p.waitForSelector('#viewCbt:not([hidden])', { timeout: 15000 });
    ok('the door opens the Live CBT hall', true);

    /* ---------- 7. a future sitting counts down instead ---------- */
    await T.p.click('[data-ctab="create"]');
    await T.p.click('#cbtWaecTpl');
    await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length >= 40, null, { timeout: 60000 });
    await T.p.click('#cbtGoLive');
    await T.p.waitForSelector('.cbt-big-code', { timeout: 20000 });
    const code2 = (await T.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
    /* scheduled in the future, never started → waiting, not live */
    const sess2 = (await dump('sessions')).find(x => x.code === code2);
    ok('second festival session stored waiting', !!sess2 && sess2.status === 'waiting');
    await tweak({ code, status: 'ended' });
    await openOverview(S3.p);
    await S3.p.waitForFunction(() => !!window.MAMSS_HABITS, null, { timeout: 20000 });
    await S3.p.evaluate(() => localStorage.removeItem('nssc_hab_waec'));
    await S3.p.evaluate(() => MAMSS_HABITS.render());
    await S3.p.waitForFunction(() => { const b = document.getElementById('habWaec'); return b && !b.hidden && b.textContent.trim().length > 5; }, null, { timeout: 20000 });
    const cd = await S3.p.locator('#habWaec').innerText();
    ok('a future festival counts down in days', /Friday Waecathon in \d+ day/.test(cd), cd);
    ok('countdown states the format', /40 questions/.test(cd) && /every class/.test(cd), cd);
    ok('countdown offers no door yet', await S3.p.locator('#habWaec [data-goto-cbt]').count() === 0);
    ok('banner is cached for ten minutes', await S3.p.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('nssc_hab_waec') || 'null');
      return !!c && Array.isArray(c.rows) && Date.now() - c.at < 600000;
    }));

    /* ---------- 8. no festival, no banner (the quiet case) ---------- */
    await tweak({ code: code2, status: 'ended' });
    const S9 = await mkCtx(browser, 'student', { tag: '-s9', name: 'Chidi Student' });
    await openOverview(S9.p);
    await S9.p.waitForFunction(() => !!window.MAMSS_HABITS, null, { timeout: 20000 });
    await S9.p.evaluate(() => MAMSS_HABITS.render());
    await sleep(1200);
    ok('with no festival the banner stays hidden', await S9.p.locator('#habWaec[hidden]').count() === 1);
    ok('the rest of the Today board still renders', await S9.p.locator('#habPanel .hab-flamecard').count() === 1);
    ok('non-waecathon papers never raise a banner', await S9.p.evaluate(async () => {
      const c = window.MAMSS_CODES && MAMSS_CODES.ledger;
      const r = await fetch('/rest/v1/cbt_sessions?select=code&settings->>waecathon=eq.true&status=in.(waiting,live)', {
        headers: c ? { apikey: c.key, Authorization: 'Bearer ' + c.key } : {},
      });
      const rows = await r.json();
      return Array.isArray(rows) && rows.length === 0;
    }));

    /* ---------- 9. before the ALTER is pasted, everything still works ---------- */
    await flags({ attCols: false });
    const SB = await mkCtx(browser, 'student', { tag: '-sb', grade: 1, name: 'Pre-ALTER Student' });
    await openCbt(SB.p);
    await SB.p.fill('#cbtJoinCode', code2);
    await SB.p.click('#cbtJoinBtn');
    /* the session is ended, so join the live one instead — re-open it first */
    await flags({ attCols: true });
    await tweak({ code: code2, status: 'waiting' });
    await flags({ attCols: false });
    await SB.p.evaluate(() => MAMSS_CBT.mount());
    await openCbt(SB.p);
    await SB.p.fill('#cbtJoinCode', code2);
    await SB.p.click('#cbtJoinBtn');
    await SB.p.waitForFunction(() => {
      const t = document.querySelector('#viewCbt');
      return t && (/waiting room|Waiting|begins|cbtRunTimer/i.test(t.textContent) || document.getElementById('cbtWaitingCount'));
    }, null, { timeout: 25000 });
    ok('a pre-ALTER server still admits the student (400 → retry without cls)', true);
    ok('the missing-column fallback is remembered on the device', await SB.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_nocols') || '0') === 1));
    const attB = (await dump('attempts')).filter(a => a.session_code === code2);
    ok('the joined row exists with no house stamp', attB.length >= 1 && !attB.some(a => a.cls));
    await flags({ attCols: true });
    const resB = await T.p.evaluate(() => {
      const d = window.MAMSS_CBT._test;
      return typeof d.clsOf === 'function' && typeof d.nextFriday16 === 'function' && typeof d.voiceMode === 'function';
    });
    ok('_test surface exposes the waecathon helpers', resB);

    /* ---------- 10. page errors ---------- */
    ok('no page errors (teacher)', T.errs.length === 0, T.errs.slice(0, 2).join(' | '));
    ok('no page errors (SS1 student)', S1.errs.length === 0, S1.errs.slice(0, 2).join(' | '));
    ok('no page errors (SS3 student)', S3.errs.length === 0, S3.errs.slice(0, 2).join(' | '));
    ok('no page errors (pre-ALTER student)', SB.errs.length === 0, SB.errs.slice(0, 2).join(' | '));
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
