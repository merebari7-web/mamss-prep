/* v69 "The Gold Standard" — the ProProfs-grade candidate desk.
   Seeded shuffle, briefing ritual, number pad, mark-for-review, locked ink,
   review-and-confirm, certificate, copy/print lock, dwell-time analytics. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const MOCK = 'http://127.0.0.1:8130';
const BASE = process.argv[2] || 'http://localhost:8100/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ok ' + pass + ' — ' + name); } else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra ? '  [[' + extra + ']]' : '')); } };

async function post(path, body) {
  return fetch(MOCK + path, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'x', Authorization: 'Bearer x', Prefer: 'return=minimal' }, body: JSON.stringify(body) });
}
async function dump(table) {
  const r = await fetch(MOCK + '/rest/v1/cbt_' + table + '?select=*', { headers: { apikey: 'x', Authorization: 'Bearer x' } });
  const j = await r.json();
  return j;
}

(async () => {
  console.log('=== v69 The Gold Standard ===');
  console.log('BASE ' + BASE + ' → mock :8130\n');
  const mock = spawn('node', [__dirname + '/cbtmock.js', '8130'], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});

  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const mkCtx = async (role, name, batch, tag, grade, noWho) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(`
      window.__CBT_FORCE_POLL = 1;
      localStorage.setItem('nssc_mp_seen', '70');
      ${noWho ? '' : "localStorage.setItem('nssc_cbt_who', '1');"}
      localStorage.setItem('nssc_devid', JSON.stringify('prof-device-${tag}'));
      ${grade != null ? `localStorage.setItem('study_grade', JSON.stringify(${grade}));` : ''}
      localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify({ h: 'prof' + tag + 'hash0000', mask: 'MAMSS··TEST··', at: Date.now(), batch, role, name }))});
    `);
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
    p.on('pageerror', e => console.log('[pageerror-' + tag + ']', String(e).slice(0, 160)));
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
    await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
    await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
    return { ctx, p };
  };
async function gateClear(p) {
  await p.waitForFunction(() => document.getElementById('cbtGateGo') || document.getElementById('cbtBriefGo') || document.getElementById('cbtRunTimer'), null, { timeout: 20000 });
  if (await p.locator('#cbtGateGo').count()) {
    await p.click('#cbtGateCamEnable');
    await p.click('#cbtGateVoxEnable');
    await p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 15000 });
    await p.click('#cbtGateGo');
  }
}
  const openCbt = async p => {
    await p.click('.study-nav a[data-view="cbt"]');
    await p.waitForSelector('#viewCbt:not([hidden])', { timeout: 15000 });
    await p.waitForFunction(() => !!window.MAMSS_CBT && document.getElementById('cbtRoot').innerHTML.length > 50, null, { timeout: 20000 });
  };
  const join = async (p, code) => {
    await openCbt(p);
    await p.fill('#cbtJoinCode', code);
    await p.click('#cbtJoinBtn');
  };

  /* ---------- 1. the seeded maths (unit) ---------- */
  const U = await mkCtx('student', 'Unit Student', 'SS1-3-topup', 'u', 1);
  await openCbt(U.p);
  const math = await U.p.evaluate(() => {
    const T = MAMSS_CBT._test;
    const s1 = T.seed32('ada|PRF001'), s2 = T.seed32('ada|PRF001'), s3 = T.seed32('bisi|PRF001');
    const perm = T.permSeeded(5, s1);
    const sorted = perm.slice().sort((a, b) => a - b).join(',');
    const sess = { code: 'PRF001', questions: [1, 2, 3, 4, 5, 6, 7, 8].map(() => ({ q: 'x' })), settings: { shuffle: true } };
    const plain = { code: 'PRF001', questions: sess.questions, settings: {} };
    const o1 = T.buildOrder(sess, { did: 'ada' }), o2 = T.buildOrder(sess, { did: 'ada' }), o3 = T.buildOrder(sess, { did: 'bisi' });
    const idn = T.buildOrder(plain, { did: 'ada' });
    const op1 = T.optPermFor(sess, { did: 'ada' }, 0), op2 = T.optPermFor(sess, { did: 'ada' }, 0), op3 = T.optPermFor(sess, { did: 'ada' }, 1);
    return { det: s1 === s2, diff: s1 !== s3, sorted, o1, o2, o3, idn: idn.join(','), op1, op2, op3, ops: op1.slice().sort((a, b) => a - b).join(',') };
  });
  ok('seed32 is deterministic and device-sensitive', math.det && math.diff);
  ok('permSeeded returns a true permutation', math.sorted === '0,1,2,3,4', math.sorted);
  ok('shuffle order: same device same paper, different device different paper', JSON.stringify(math.o1) === JSON.stringify(math.o2) && JSON.stringify(math.o1) !== JSON.stringify(math.o3), JSON.stringify([math.o1, math.o3]));
  ok('without the setting the order stays the paper’s own', math.idn === '0,1,2,3,4,5,6,7');
  ok('option permutation: deterministic per question, a true permutation', JSON.stringify(math.op1) === JSON.stringify(math.op2) && math.ops === '0,1,2,3' && JSON.stringify(math.op1) !== JSON.stringify(math.op3));

  /* ---------- 2. teacher builds the paper with the shuffle switch ---------- */
  const T = await mkCtx('teacher', 'Mr Okoro', 'TEACHER-1', 't');
  await openCbt(T.p);
  await T.p.click('#cbtConsoleBtn');
  await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
  await T.p.click('[data-ctab="create"]');
  await T.p.waitForSelector('#cbtDraftTitle', { timeout: 10000 });
  await T.p.fill('#cbtDraftTitle', 'Gold Standard Drill');
  await T.p.fill('#cbtCount', '5');
  await T.p.check('#cbtShuffle');
  ok('the builder offers the shuffle switch', true);
  await T.p.click('#cbtDraw');
  await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length === 5, null, { timeout: 30000 });
  await T.p.click('#cbtGoLive');
  await T.p.waitForSelector('.cbt-big-code', { timeout: 20000 });
  const code = (await T.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
  const sessRow = (await dump('sessions')).find(x => x.code === code);
  const QS = sessRow.questions;
  ok('the shuffle switch rides in the session settings', sessRow.settings.shuffle === true);
  await T.p.click('#cbtStart');
  await T.p.waitForSelector('.cbt-chip.live', { timeout: 10000 });
  ok('the shuffled paper goes live', true);

  /* ---------- 2b. the sitting door: name + class, class-set papers ---------- */
  const W = await mkCtx('student', 'Who Student', 'SS1-3-topup', 'w', 1, true);
  await openCbt(W.p);
  await W.p.waitForSelector('#cbtWhoGo', { timeout: 15000 });
  ok('the sitting door asks who sits', /Who sits today/.test(await W.p.locator('#viewCbt').innerText()));
  ok('the door lists JSS and SS classes', /JSS1/.test(await W.p.locator('#viewCbt').innerText()) && /SS3/.test(await W.p.locator('#viewCbt').innerText()));
  await W.p.fill('#cbtWhoName', ' ');
  await W.p.click('#cbtWhoGo');
  ok('the door refuses an empty name', /Write your name/.test(await W.p.locator('#cbtWhoFb').innerText()));
  await W.p.fill('#cbtWhoName', 'Who Student');
  await W.p.click('[data-who-cls="4"]');
  await W.p.click('#cbtWhoGo');
  await W.p.waitForSelector('#cbtJoinCode', { timeout: 10000 });
  ok('the hall wears the sitter on its door', /Sitting as Who Student · JSS2/.test(await W.p.locator('#viewCbt').innerText()));
  await W.p.fill('#cbtJoinCode', code);
  await W.p.click('#cbtJoinBtn');
  await W.p.waitForFunction(() => /set for/.test(document.querySelector('#viewCbt').textContent), null, { timeout: 10000 });
  ok('a wrong-class code is refused honestly', /set for/.test(await W.p.locator('#viewCbt').innerText()));
  await W.p.click('#cbtBackHome');
  await W.p.click('#cbtWhoChange');
  await W.p.waitForSelector('#cbtWhoGo', { timeout: 8000 });
  await W.p.click('[data-who-cls="0"]');
  await W.p.click('#cbtWhoGo');
  await W.p.waitForSelector('#cbtJoinCode', { timeout: 8000 });
  await W.p.fill('#cbtJoinCode', code);
  await W.p.click('#cbtJoinBtn');
  await gateClear(W.p);
  ok('the right class walks in', (await W.p.locator('#cbtBriefGo').count()) === 1 || (await W.p.locator('#cbtRunTimer').count()) === 1);

  /* ---------- 3. the briefing ritual ---------- */
  const S = await mkCtx('student', 'Ada Student', 'SS1-3-topup', 's', 0);
  await join(S.p, code);
  await gateClear(S.p);
  await S.p.waitForSelector('#cbtBriefGo', { timeout: 20000 });
  const briefTxt = await S.p.locator('#viewCbt').innerText();
  ok('the briefing states the ink rule', /answer once/.test(briefTxt) && /final, like ink/.test(briefTxt));
  ok('the briefing explains the pad and the review', /number pad|pad/.test(briefTxt) && /review page/.test(briefTxt));
  ok('the briefing names the shuffle when it is on', /shuffled for your device/.test(briefTxt));
  ok('the pledge gates the door', await S.p.locator('#cbtBriefGo').isDisabled());
  await S.p.check('#cbtBriefOk');
  ok('the pledge opens the door', !(await S.p.locator('#cbtBriefGo').isDisabled()));
  await S.p.click('#cbtBriefGo');
  await S.p.waitForSelector('#cbtRunTimer', { timeout: 10000 });

  /* ---------- 4. the pad matches the seeded order ---------- */
  const expected = await S.p.evaluate(async (CODE) => {
    const T2 = MAMSS_CBT._test;
    const r = await T2.rest('cbt_sessions?select=code,questions,settings&code=eq.' + CODE);
    const j = r.json;
    const s = Array.isArray(j) ? j[0] : j;
    return T2.buildOrder(s, T2.me()).map(x => x + 1);
  }, code);
  const padSeq = await S.p.locator('#cbtPalHost button').allInnerTexts();
  ok('the pad lists every question in the seeded order', padSeq.map(t => +t.trim()).join(',') === expected.join(','), padSeq.join(',') + ' vs ' + expected.join(','));
  const stemNo = await S.p.locator('.cbt-q-stem').innerText();
  ok('the paper opens on the first shuffled question', stemNo.trim().startsWith(expected[0] + '.'), stemNo.slice(0, 12));
  ok('the pad counts the journey', /0 answered · 0 marked · 5 to go/.test(await S.p.locator('#cbtPalCounts').innerText()));

  /* ---------- 5. answer, mark, jump, locked ink ---------- */
  const pick = async (p, origIdx) => {
    const before = await p.locator('#cbtPalHost .done').count();
    await p.waitForSelector('.cbt-opt[data-opt="' + origIdx + '"]', { timeout: 6000 });
    await p.click('.cbt-opt[data-opt="' + origIdx + '"]');
    await p.waitForFunction(() => { const b = document.getElementById('cbtNextBtn'); return b && !b.disabled; }, null, { timeout: 5000 });
    await p.click('#cbtNextBtn');
    await p.waitForFunction(n => document.querySelectorAll('#cbtPalHost .done').length === n || document.getElementById('cbtRevSubmit'), before + 1, { timeout: 8000 });
  };
  await pick(S.p, QS[expected[0] - 1].a);                       /* correct, first shuffled slot */
  await S.p.waitForFunction(() => document.querySelectorAll('#cbtPalHost .done').length === 1, null, { timeout: 6000 });
  ok('a saved answer turns its pad cell navy', true);
  const second = expected[1] - 1;
  await S.p.click('#cbtPalHost button[data-pal="1"]');
  await S.p.waitForSelector('#cbtMarkBtn', { timeout: 6000 });
  await S.p.click('#cbtMarkBtn');
  ok('the star marks a question for review', await S.p.locator('#cbtPalHost button[data-pal="1"]').evaluate(b => b.classList.contains('mark')));
  await S.p.click('#cbtPalHost button[data-pal="4"]');
  await pick(S.p, QS[expected[4] - 1].a);
  const headAfter = await S.p.locator('#cbtRunHead').innerText();
  ok('saving walks to the next open question, not the next number', headAfter.includes('Question ' + expected[1] + ' of 5'), headAfter);
  await S.p.click('#cbtPalHost button[data-pal="0"]');
  await S.p.waitForSelector('.cbt-q-card', { timeout: 6000 });
  ok('an answered question reopens as locked ink', /final, like ink on paper/.test(await S.p.locator('#cbtQHost').innerText()) && await S.p.locator('.cbt-opt[data-opt]').count() === 0);
  ok('locked ink shows the saved choice', await S.p.locator('.cbt-opt.sel').count() === 1);
  await S.p.click('#cbtNextBtn');
  ok('Next on locked ink walks to the first open question', (await S.p.locator('.cbt-q-stem').innerText()).trim().startsWith(expected[1] + '.'));

  ok('the hall carries a calculator', await S.p.locator('#cbtCalcBtn').count() === 1);
  await S.p.click('#cbtCalcBtn');
  await S.p.waitForFunction(() => !!window.__calcApi && document.querySelector('.ca-box'), null, { timeout: 10000 });
  ok('the calculator opens over the paper', true);
  const calcVal = await S.p.evaluate(() => window.__calcApi.compute('12+8'));
  ok('the calculator computes', String(calcVal).startsWith('20'), String(calcVal));
  await S.p.evaluate(() => window.__calcApi.close());

  /* ---------- 6. the copy/print lock ---------- */
  await S.p.keyboard.press('Control+c');
  ok('copying is blocked while the paper runs', await S.p.waitForFunction(() => document.body.innerText.includes('Copying and printing are disabled'), null, { timeout: 5000 }).then(() => true).catch(() => false));

  /* ---------- 7. the review page ---------- */
  await S.p.click('#cbtReviewBtn');
  await S.p.waitForSelector('#cbtRevSubmit', { timeout: 8000 });
  const revTxt = await S.p.locator('#viewCbt').innerText();
  ok('the review page counts answered, marked, unanswered', /2 of 5 answered · 1 marked for review · 3 unanswered/.test(revTxt), revTxt.match(/\d of 5[^\n]*/)?.[0]);
  ok('the review names the unanswered questions', /Still unanswered/.test(revTxt));
  ok('the review keeps the clock in view', await S.p.locator('#cbtRevTimer').count() === 1);
  await S.p.click('#cbtRevBack');
  await S.p.waitForSelector('#cbtNextBtn', { timeout: 6000 });
  ok('keep working returns to the paper', true);

  /* ---------- 8. finish correctly → distinction + certificate ---------- */
  for (let pos = 1; pos <= 4; pos++) {
    const openPos = await S.p.evaluate(() => {
      const cells = [...document.querySelectorAll('#cbtPalHost button')];
      return cells.findIndex(c => !c.classList.contains('done'));
    });
    if (openPos < 0) break;
    const orig = expected[openPos] - 1;
    await S.p.click('#cbtPalHost button[data-pal="' + openPos + '"]');
    await pick(S.p, QS[orig].a);
    await sleep(150);
  }
  await S.p.waitForSelector('#cbtRevSubmit', { timeout: 8000 });
  ok('the last save lands on the review page, not a blind submit', /5 of 5 answered/.test(await S.p.locator('#viewCbt').innerText()));
  await S.p.click('#cbtRevSubmit');
  await S.p.waitForSelector('.cbt-chip', { timeout: 10000 });
  const doneTxt = await S.p.locator('#viewCbt').innerText();
  ok('a perfect paper reads SUBMITTED 5 / 5', /SUBMITTED/.test(doneTxt) && /5 \/ 5/.test(doneTxt));
  ok('the result speaks personally to a distinction', /Distinction work/.test(doneTxt));
  ok('a pass mints a certificate button', await S.p.locator('#cbtCertBtn').count() === 1);
  await S.p.click('#cbtCertBtn');
  await S.p.waitForSelector('#cbtCertSheet', { timeout: 8000 });
  const certTxt = await S.p.locator('#cbtCertSheet').innerText();
  ok('the certificate names the candidate and the band', /Ada Student/.test(certTxt) && /DISTINCTION/.test(certTxt));
  ok('the certificate carries a verify line', new RegExp('Verify: ' + code.slice(0, 3) + '-' + code.slice(3) + ' · \\d{8}').test(certTxt), certTxt.match(/Verify.*/)?.[0]);
  ok('the certificate can be printed', await S.p.locator('#cbtCertPrint').count() === 1);
  await S.p.click('#cbtCertBack');
  ok('back to results from the certificate', /SUBMITTED/.test(await S.p.locator('#viewCbt').innerText()));

  /* ---------- 9. teacher: dwell time joins the question analysis ---------- */
  await T.p.click('[data-ctab="results"]');
  await T.p.waitForFunction(() => /Per-question accuracy/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 12000 });
  const resTxt = await T.p.locator('#cbtConsBody').innerText();
  ok('the analysis states average dwell-time per question', /avg \d+s on this question/.test(resTxt), resTxt.match(/avg [^\n]*/)?.[0]);
  ok('the option bars still stand beside it', /A · B · C · D/.test(resTxt));

  /* ---------- 10. rejoin keeps the same shuffled paper, brief remembered ---------- */
  const S2 = await mkCtx('student', 'Bisi Student', 'SS1-3-topup', 's2', 0);
  await join(S2.p, code);
  await gateClear(S2.p);
  await S2.p.waitForSelector('#cbtBriefGo', { timeout: 20000 });
  await S2.p.check('#cbtBriefOk'); await S2.p.click('#cbtBriefGo');
  await S2.p.waitForSelector('#cbtRunTimer', { timeout: 10000 });
  const firstStem = (await S2.p.locator('.cbt-q-stem').innerText()).trim();
  await S2.p.reload({ waitUntil: 'domcontentloaded' });
  await S2.p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await S2.p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await join(S2.p, code);
  await gateClear(S2.p);
  await S2.p.waitForSelector('#cbtRunTimer', { timeout: 20000 });
  ok('a rejoin skips the briefing it already pledged', await S2.p.locator('#cbtBriefGo').count() === 0);
  ok('a rejoin keeps the same shuffled paper', (await S2.p.locator('.cbt-q-stem').innerText()).trim() === firstStem, firstStem.slice(0, 10));

  /* ---------- 11. a failing paper gets the study line, no certificate ---------- */
  for (let i = 0; i < 5; i++) {
    const openPos = await S2.p.evaluate(() => [...document.querySelectorAll('#cbtPalHost button')].findIndex(c => !c.classList.contains('done')));
    if (openPos < 0) break;
    const orig = expected[openPos] - 1;
    await S2.p.click('#cbtPalHost button[data-pal="' + openPos + '"]');
    const wrong = (QS[orig].a + 1) % 4;
    await pick(S2.p, wrong);
    await sleep(120);
  }
  await S2.p.waitForSelector('#cbtRevSubmit', { timeout: 8000 });
  await S2.p.click('#cbtRevSubmit');
  await S2.p.waitForSelector('.cbt-chip', { timeout: 10000 });
  const failTxt = await S2.p.locator('#viewCbt').innerText();
  ok('a failing paper gets the study line', /below the pass line/.test(failTxt));
  ok('a failing paper mints no certificate', await S2.p.locator('#cbtCertBtn').count() === 0);

  /* ---------- 12. the pad never trips the integrity log ---------- */
  const atts = (await dump('attempts')).filter(a => a.session_code === code);
  ok('navigation by pad logs no integrity events', atts.every(a => !a.integrity), JSON.stringify(atts.map(a => a.integrity)));
  ok('both papers submitted with server-graded scores', atts.filter(a => a.status === 'submitted').length === 2 && atts.some(a => a.name === 'Ada Student' && a.score === 5));

  await browser.close();
  mock.kill();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
