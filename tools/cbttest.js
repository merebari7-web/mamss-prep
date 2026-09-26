/* v54 Live CBT Hall — end-to-end suite.
   Topology: docs copy on :8100 (real ledger config present), all /rest/v1/*
   traffic rewritten by Playwright route to the in-memory cbtmock on :8124
   (primary keys + trigger emulation identical to tools/cbt_schema.sql).
   WS disabled via window.__CBT_FORCE_POLL=1 → the polling backbone is what
   gets tested (the correctness path). Two browser contexts: teacher + student.
   Run: node cbttest.js [BASE]        (default http://localhost:8100/)        */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(require('path').join(__dirname, '..', '..', 'testrig', 'node_modules', 'playwright'))); }
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8124;
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

function seedFor(role) {
  const act = role === 'teacher'
    ? { h: 'testsuite0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'testsuite0000001', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
  return `
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '54');
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-test-device'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
  `;
}

async function mkCtx(browser, role, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.addInitScript(seedFor(role));
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
        for (const [k, v] of Object.entries(req.headers())) {
          if (!/^:/.test(k)) init.headers[k] = v;
        }
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
  }
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

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const browser = await chromium.launch();
  console.log('\n=== v54 Live CBT Hall ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + '\n');

  try {
    /* ---------- 1. identity & role ---------- */
    const T = await mkCtx(browser, 'teacher');
    const S = await mkCtx(browser, 'student');
    ok('gate unlocked for planted teacher activation', await T.p.evaluate(() => !document.getElementById('gateOverlay') || getComputedStyle(document.getElementById('gateOverlay')).display === 'none' || document.body.dataset.view !== undefined));
    ok('MAMSS_ACT.teacher() true on TEACHER-1 batch', await T.p.evaluate(() => MAMSS_ACT.teacher() === true));
    ok('MAMSS_ACT.teacher() false on student batch', await S.p.evaluate(() => MAMSS_ACT.teacher() === false));

    /* ---------- 2. navigation ---------- */
    ok('desktop nav has Live CBT link', await T.p.locator('.study-sidebar .study-nav a[data-view="cbt"]').count() === 1);
    ok('mobile dock has Live CBT link', await T.p.locator('#studioDock a[data-view="cbt"]').count() === 1);
    await openCbt(T.p);
    ok('viewCbt visible + hall home rendered', await T.p.locator('#viewCbt h1').innerText().then(t => /Live CBT/.test(t)));
    ok('teacher sees the console card', await T.p.locator('#cbtConsoleBtn').count() === 1);
    await openCbt(S.p);
    ok('student does NOT see the console card', await S.p.locator('#cbtConsoleBtn').count() === 0);
    ok('student sees join input', await S.p.locator('#cbtJoinBtn').count() === 1);
    await S.p.evaluate(() => MAMSS_CBT.openTeacher && MAMSS_CBT.openTeacher());
    ok('openTeacher() refuses non-teacher (back to hall)', await S.p.locator('#cbtConsoleBtn, .cbt-tabs').count() <= 1 && await S.p.locator('.cbt-tabs').count() === 0);

    /* ---------- 3. teacher builder ---------- */
    await T.p.click('#cbtConsoleBtn');
    await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    ok('console tabs rendered', await T.p.locator('.cbt-tab').count() >= 3);
    await T.p.waitForFunction(() => typeof CLASSES !== 'undefined' && CLASSES.length === 3, null, { timeout: 45000 });
    await T.p.fill('#cbtDraftTitle', 'SS2 Mathematics · Mid-term CBT');
    await T.p.click('[data-cls="SS2"]');
    const subjOpts = await T.p.$$eval('#cbtSubject option', os => os.map(o => o.value).filter(v => v));
    ok('subject list populated from bank/meta', subjOpts.length > 3, subjOpts.length + ' options');
    const wantSubj = subjOpts.find(v => /math/i.test(v)) || subjOpts[0];
    await T.p.selectOption('#cbtSubject', wantSubj);
    await T.p.fill('#cbtCount', '5');
    await T.p.click('#cbtDraw');
    await T.p.waitForSelector('.cbt-draft-q', { timeout: 30000 });
    await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length >= 5, null, { timeout: 10000 });
    ok('drew 5 bank questions', (await T.p.locator('.cbt-draft-q').count()) === 5);
    const stems = await T.p.$$eval('.cbt-draft-q b', bs => bs.map(b => b.textContent.trim()));
    ok('drawn questions unique', new Set(stems).size === stems.length);

    /* new question: valid */
    await T.p.click('#cbtAddNew');
    await T.p.fill('#nqStem', 'Which of the following is a chemical change?');
    await T.p.fill('#nqO0', 'Melting of ice'); await T.p.fill('#nqO1', 'Rusting of iron');
    await T.p.fill('#nqO2', 'Dissolving salt'); await T.p.fill('#nqO3', 'Breaking glass');
    await T.p.check('input[name="nqA"][value="1"]');
    await T.p.fill('#nqExpl', 'Rusting forms a new substance (iron oxide).');
    await T.p.click('#cbtNewQAdd');
    await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length === 6, null, { timeout: 8000 });
    ok('custom question added (6 on paper)', true);
    ok('custom question passed WAEC mechanics check', await T.p.locator('#nqFb').innerText().then(t => /passes/.test(t)));
    /* duplicate */
    await T.p.fill('#nqStem', 'which of the following is a chemical change?');
    await T.p.fill('#nqO0', 'A'); await T.p.fill('#nqO1', 'B'); await T.p.fill('#nqO2', 'C'); await T.p.fill('#nqO3', 'D');
    await T.p.click('#cbtNewQAdd');
    ok('duplicate question blocked', await T.p.locator('#nqFb').innerText().then(t => /duplicate/i.test(t)));
    /* invalid */
    await T.p.fill('#nqStem', 'short?');
    await T.p.fill('#nqO3', '');
    await T.p.click('#cbtNewQAdd');
    ok('malformed question blocked', await T.p.locator('#nqFb').innerText().then(t => /too short|four options/i.test(t)));

    /* ---------- 4. go live ---------- */
    await T.p.click('#cbtGoLive');
    await T.p.waitForSelector('.cbt-big-code', { timeout: 15000 });
    const shown = await T.p.locator('.cbt-big-code').innerText();
    ok('session code displayed as XXX-XXX', /^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/.test(shown.trim()), shown);
    const code = shown.trim().replace('-', '');
    let sess = (await dump('sessions')).find(s => s.code === code);
    ok('session row persisted (waiting, 6 questions, 30 min)', !!sess && sess.status === 'waiting' && sess.questions.length === 6 && sess.duration_s === 1800);
    ok('questions embed answers+explanations', !!sess && sess.questions[5] && sess.questions[5].a === 1 && /Rusting/.test(sess.questions[5].e || ''));
    ok('monitor shows WAITING chip', await T.p.locator('.cbt-chip.waiting').count() === 1);

    /* ---------- 5. student joins → waiting room ---------- */
    await S.p.fill('#cbtJoinCode', code.toLowerCase());
    await S.p.click('#cbtJoinBtn');
    await S.p.waitForSelector('.cbt-chip.waiting', { timeout: 15000 });
    ok('waiting room shows title + shape', await S.p.locator('.cbt-card').first().innerText().then(t => /Mid-term CBT/.test(t) && /6 questions/.test(t) && /30 min/.test(t)));
    let atts = await dump('attempts');
    ok('attempt row created (waiting, named, slip masked)', atts.length === 1 && atts[0].status === 'waiting' && atts[0].name === 'Ada Student' && /··/.test(atts[0].slip));
    await S.p.waitForFunction(() => { const n = document.getElementById('cbtWaitingCount'); return n && /1 device/.test(n.textContent); }, null, { timeout: 8000 });
    ok('waiting room counts devices live', true);

    /* ---------- 6. teacher starts → server-side timing ---------- */
    await T.p.click('#cbtStart');
    await T.p.waitForSelector('.cbt-chip.live', { timeout: 10000 });
    sess = (await dump('sessions')).find(s => s.code === code);
    const endsIn = sess && sess.ends_at ? (new Date(sess.ends_at).getTime() - Date.now()) / 1000 : -1;
    ok('start stamped live_at + ends_at server-side (~1800 s)', !!sess.live_at && endsIn > 1780 && endsIn <= 1805, endsIn.toFixed(0) + 's');
    await T.p.waitForFunction(() => { const c = document.getElementById('cbtMonCountdown'); return c && /Time left/.test(c.textContent); }, null, { timeout: 8000 });
    ok('monitor countdown running', true);

    /* ---------- 7. student transitions to runner ---------- */
    await S.p.waitForSelector('#cbtRunTimer', { timeout: 8000 });
    ok('runner opened automatically when teacher started', true);
    ok('timer ticking mm:ss', await S.p.waitForFunction(() => /^\d+:\d{2}$/.test(document.getElementById('cbtRunTimer').textContent), null, { timeout: 4000 }).then(() => true));
    ok('question 1 of 6, four options', await S.p.locator('.cbt-card').first().innerText().then(t => /Question 1 of 6/.test(t)) && await S.p.locator('.cbt-opt').count() === 4);
    ok('next disabled until an option is chosen', await S.p.locator('#cbtNextBtn').isDisabled());

    /* roster on teacher side */
    await T.p.waitForFunction(() => { const r = document.getElementById('cbtRoster'); return r && /Ada Student/.test(r.textContent) && /RUNNING/.test(r.textContent); }, null, { timeout: 9000 });
    ok('monitor roster shows student RUNNING in real time', true);

    /* ---------- 8. answering: persisted, no going back ---------- */
    await S.p.locator('.cbt-opt').first().click();
    ok('option select enables next', !(await S.p.locator('#cbtNextBtn').isDisabled()));
    await S.p.click('#cbtNextBtn');
    await S.p.waitForFunction(() => /Question 2 of 6/.test(document.querySelector('#viewCbt').textContent), null, { timeout: 8000 });
    let ans = await dump('answers');
    ok('answer persisted the instant it was given', ans.length === 1 && ans[0].q_idx === 0 && ans[0].correct === (ans[0].choice === sess.questions[0].a));
    const dup = await S.p.evaluate(async (c) => {
      const r = await MAMSS_CBT._test.rest('cbt_answers', { method: 'POST', prefer: 'return=minimal', body: { session_code: c, device_id: MAMSS_CBT._test.me().did, q_idx: 0, choice: 3, correct: true, ms: 1, flagged: false } });
      return r.status;
    }, code);
    ok('database blocks re-answering (409 on duplicate q_idx)', dup === 409, 'status ' + dup);
    ok('no back/previous control anywhere in runner', await S.p.locator('#cbtQHost button, #viewCbt .cbt-card button').evaluateAll(bs => !bs.some(b => /back|previous|←/i.test(b.textContent))));

    /* ---------- 9. anti-cheat ---------- */
    const prevented = await S.p.evaluate(() => {
      const card = document.getElementById('cbtQCard');
      const ev = new Event('copy', { cancelable: true, bubbles: true });
      card.dispatchEvent(ev);
      const ev2 = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
      card.dispatchEvent(ev2);
      return ev.defaultPrevented && ev2.defaultPrevented;
    });
    ok('copy + context menu suppressed on question card', prevented);
    ok('question card carries no-select class', await S.p.locator('#cbtQCard.cbt-noselect').count() === 1);
    await S.p.evaluate(() => window.dispatchEvent(new Event('blur')));
    await sleep(1700);
    atts = await dump('attempts');
    ok('tab-switch logged to server after grace period', atts[0].integrity === 1, 'integrity=' + atts[0].integrity);
    ok('student sees escalation warning', await S.p.locator('.cbt-warn').innerText().then(t => /left the exam window/.test(t)));
    await T.p.waitForFunction(() => { const r = document.getElementById('cbtRoster'); return r && /⚠|1/.test(r.textContent) && r.querySelector('td b[style]'); }, null, { timeout: 9000 }).then(() => ok('teacher sees integrity flag live on roster', true)).catch(() => ok('teacher sees integrity flag live on roster', false));

    /* ---------- 10. refresh cannot reset (resume) ---------- */
    await S.p.locator('.cbt-opt').first().click();
    await S.p.click('#cbtNextBtn');
    await S.p.waitForFunction(() => /Question 3 of 6/.test(document.querySelector('#viewCbt').textContent), null, { timeout: 8000 });
    await S.p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await S.p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
    await S.p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
    await openCbt(S.p);
    await S.p.fill('#cbtJoinCode', code);
    await S.p.click('#cbtJoinBtn');
    await S.p.waitForSelector('#cbtRunTimer', { timeout: 15000 });
    ok('after refresh: resumed at question 3 (no reset)', await S.p.locator('#viewCbt').innerText().then(t => /Question 3 of 6/.test(t)));
    await S.p.waitForFunction(() => /^\d+:\d{2}$/.test(document.getElementById('cbtRunTimer').textContent), null, { timeout: 5000 });
    const tTxt = await S.p.locator('#cbtRunTimer').innerText();
    const tSec = +tTxt.split(':')[0] * 60 + +tTxt.split(':')[1];
    ok('timer continues from server deadline (< 30 min left, not reset)', tSec > 0 && tSec <= 1800, tTxt);
    const dupJoin = await S.p.evaluate(async (c) => {
      const m = MAMSS_CBT._test.me();
      const r = await MAMSS_CBT._test.rest('cbt_attempts', { method: 'POST', prefer: 'return=minimal', body: { session_code: c, device_id: m.did, name: 'Impostor', slip: 'x', status: 'waiting' } });
      return r.status;
    }, code);
    ok('one attempt per device enforced by PK (409)', dupJoin === 409, 'status ' + dupJoin);

    /* ---------- 11. finish → instant results ---------- */
    for (let i = 3; i <= 6; i++) {
      await S.p.waitForSelector('.cbt-opt', { timeout: 8000 });
      await S.p.locator('.cbt-opt').nth(i % 4).click();
      await S.p.waitForFunction(() => { const b = document.getElementById('cbtNextBtn'); return b && !b.disabled; }, null, { timeout: 4000 });
      await S.p.click('#cbtNextBtn');
      if (i < 6) await S.p.waitForFunction(n => new RegExp('Question ' + n + ' of 6').test(document.querySelector('#viewCbt').textContent), i + 1, { timeout: 8000 });
    }
    await S.p.waitForSelector('.cbt-chip', { timeout: 12000 });
    ok('auto-submit on last question → SUBMITTED', await S.p.locator('#viewCbt').innerText().then(t => /SUBMITTED/.test(t) && !/AUTO-SUBMITTED/.test(t)));
    ok('score shown as X / 6', await S.p.locator('.cbt-big-code').innerText().then(t => /^\d+ \/ 6$/.test(t.trim())));
    ok('instant breakdown lists all 6 with ✅/❌', await S.p.locator('.cbt-draft-q').count() === 6 && await S.p.locator('#viewCbt').innerText().then(t => /[✅❌⬜]/.test(t)));
    atts = await dump('attempts'); ans = await dump('answers');
    ok('server rows: submitted, 6 answers, score+total set', atts[0].status === 'submitted' && ans.length === 6 && atts[0].total === 6 && atts[0].score >= 0 && atts[0].score <= 6);

    /* ---------- 12. teacher results ---------- */
    await T.p.click('[data-ctab="results"]');
    await T.p.waitForFunction(() => /Class ranking/.test(document.querySelector('#cbtConsBody').textContent), null, { timeout: 10000 });
    ok('ranking lists the student with medal', await T.p.locator('#cbtConsBody').innerText().then(t => /Ada Student/.test(t) && /🥇/.test(t)));
    ok('per-question accuracy for all 6', await T.p.locator('.cbt-bar').count() === 6);
    const dl = T.p.waitForEvent('download', { timeout: 8000 });
    await T.p.click('#cbtCsv');
    const d = await dl;
    ok('CSV export downloads', /cbt-.*-results\.csv/.test(d.suggestedFilename()), d.suggestedFilename());

    /* ---------- 13. extend + timeout auto-submit (session 2) ---------- */
    await T.p.click('[data-ctab="create"]');
    await T.p.fill('#cbtDraftTitle', 'Timeout Drill');
    await T.p.fill('#cbtCount', '2');
    await T.p.click('#cbtDraw');
    await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length === 2, null, { timeout: 15000 });
    await T.p.click('#cbtGoLive');
    await T.p.waitForSelector('.cbt-big-code', { timeout: 15000 });
    const code2 = (await T.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
    await T.p.click('#cbtStart');
    await T.p.waitForSelector('.cbt-chip.live', { timeout: 8000 });
    let s2 = (await dump('sessions')).find(s => s.code === code2);
    await T.p.click('#cbtExt5');
    await T.p.waitForFunction(() => /added/.test(document.querySelector('#cbtConsBody').textContent) || true, null, { timeout: 5000 });
    await sleep(1200);
    const s2b = (await dump('sessions')).find(s => s.code === code2);
    ok('extend +5 min moved the server deadline', s2b.extend_s === 300 && new Date(s2b.ends_at) - new Date(s2.ends_at) === 300000);
    /* force expiry: server row says the clock already ran out */
    await tweak({ code: code2, ends_at: new Date(Date.now() - 5000).toISOString() });
    await openCbt(S.p);
    await S.p.fill('#cbtJoinCode', code2);
    await S.p.click('#cbtJoinBtn');
    await S.p.waitForFunction(() => /AUTO-SUBMITTED/.test(document.querySelector('#viewCbt').textContent), null, { timeout: 15000 });
    ok('expired deadline → immediate auto-submit', await S.p.locator('#viewCbt').innerText().then(t => /TIME|expired/i.test(t)));
    const a2 = (await dump('attempts')).filter(a => a.session_code === code2);
    ok('autosubmitted recorded server-side', a2.length === 1 && a2[0].status === 'autosubmitted');

    /* ---------- 14. end early ---------- */
    const T2 = await mkCtx(browser, 'teacher');
    await openCbt(T2.p);
    await T2.p.click('#cbtConsoleBtn');
    await T2.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    await T2.p.click('[data-ctab="monitor"]');
    await T2.p.fill('#cbtConsCode', code2.slice(0, 3) + '-' + code2.slice(3));
    await T2.p.click('#cbtConsOpen');
    await T2.p.waitForSelector('#cbtEnd', { timeout: 10000 });
    await T2.p.click('#cbtEnd');
    await T2.p.waitForSelector('.cbt-chip.ended', { timeout: 10000 });
    ok('teacher ended the session early (ENDED chip)', true);
    const s2c = (await dump('sessions')).find(s => s.code === code2);
    ok('ended_at stamped server-side', !!s2c.ended_at && s2c.status === 'ended');

    /* ---------- 15. degraded mode (tables missing) ---------- */
    const D = await mkCtx(browser, 'student', { deadTables: true });
    await openCbt(D.p);
    await D.p.fill('#cbtJoinCode', 'ZZZ999');
    await D.p.click('#cbtJoinBtn');
    await D.p.waitForFunction(() => /being set up/i.test(document.querySelector('#viewCbt').textContent), null, { timeout: 12000 });
    ok('pre-SQL installations degrade to a friendly “being set up” card', true);
    ok('rest of app unaffected in degraded mode', await D.p.evaluate(() => !!document.querySelector('.study-nav a[data-view="practice"]')));

    /* ---------- 16. page errors ---------- */
    ok('no page errors (teacher)', T.errs.length === 0, T.errs.slice(0, 2).join(' | '));
    ok('no page errors (student)', S.errs.length === 0, S.errs.slice(0, 2).join(' | '));
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
