/* v58 "Question Pipeline" — end-to-end suite.
   Topology identical to dashtest: docs on :8100, all /rest/v1/* proxied by
   Playwright route to cbtmock on :8125 (now with a question_queue table).
   Covers: CSV/JSON parsing units, the pure validator (v54 rules + taxonomy +
   duplicate guards + WAEC mechanics warnings), the full submit → review →
   approve/reject → pool → draft-paper flow, file upload, dead-table degrade,
   and student role-gating.
   Run: node pipetest.js [BASE]        (default http://localhost:8100/)      */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8125;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;
const KEY = 'sb_publishable_test';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra !== undefined ? '  [' + JSON.stringify(extra).slice(0, 240) + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function qqRows() {
  const r = await fetch(MOCK + '/rest/v1/question_queue?select=*', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  return r.json();
}

function seedFor(role, opts) {
  opts = opts || {};
  const act = role === 'teacher'
    ? { h: 'testsuite0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'testsuite0000001', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
  return `
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '58');
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-pipe-device${opts.tag || ''}'));
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
      body: JSON.stringify({ code: 'PGRST205', message: 'Could not find the table public.question_queue in the schema cache' }),
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
  p.on('dialog', d => d.accept('duplicate of bank question'));   /* reject-note prompt */
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
async function openPipeline(T) {
  await T.p.evaluate(() => MAMSS_CBT.openTeacher());
  await T.p.waitForSelector('.cbt-tabs [data-ctab="pipeline"]', { timeout: 10000 });
  await T.p.click('[data-ctab="pipeline"]');
  await T.p.waitForFunction(() => /[Qq]uestion pipeline/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
}
const body = T => T.p.locator('#cbtConsBody').innerText();
const sub = (T, name) => T.p.click('[data-plsub="' + name + '"]');

const GOOD1 = 'Mathematics,SS1,Sequences,"What is the next term of 2, 4, 8, ...?",10,12,16,18,C,Each term doubles';
const GOOD2 = 'Biology,SS2,Cells,"Which organelle carries out photosynthesis?",Nucleus,Chloroplast,Ribosome,Vacuole,B,Chloroplasts contain chlorophyll';
const BAD_SHORT = 'Mathematics,SS1,Algebra,2+2?,3,4,5,6,A,';                       /* stem < 10 chars */
const BAD_DUP = 'English Language,SS3,Comprehension,"Choose the option nearest in meaning to the word: bold",brave,brave,fearful,shy,A,';

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});

  const browser = await chromium.launch();
  console.log('\n=== v58 Question Pipeline ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + '\n');
  const ALL = [];
  try {
    const T = await mkCtx(browser, 'teacher');
    ALL.push(T);
    await openCbt(T.p);

    /* ── 1. pure parser units ── */
    const P = await T.p.evaluate(({ GOOD1, BAD_DUP }) => {
      const t = MAMSS_CBT._test;
      const simple = t.plParseDelim('a,b,c\n1,2,3');
      const quoted = t.plParseDelim(GOOD1);
      const esc = t.plParseDelim('x,"say ""hi""",y');
      const tsv = t.plParseDelim('a\tb\n1\t2');
      const blanks = t.plParseDelim('a,b\n\n   \n1,2\n');
      const json = t.plRowsFromText('[{"question":"What is 2+2?","options":["1","3","4","2"],"answer":"C","class":"SS1","subject":"Mathematics","explanation":"arithmetic"}]');
      const jsonWrap = t.plRowsFromText('{"questions":[{"q":"Define osmosis.","o":["a","b","c","d"],"ans":1,"cls":"SS2","subj":"Biology"}]}');
      const jsonBad = t.plRowsFromText('[{"question":');
      const noHeader = t.plRowsFromText(GOOD1 + '\n' + BAD_DUP);
      const withHeader = t.plRowsFromText('subject,class,topic,question,optionA,optionB,optionC,optionD,answer,explanation\n' + GOOD1);
      return { simple, quoted, esc, tsv, blanks, json, jsonWrap, jsonBad, noHeader, withHeader };
    }, { GOOD1, BAD_DUP });
    ok('parseDelim: simple grid', P.simple.length === 2 && P.simple[1].join('|') === '1|2|3', P.simple);
    ok('parseDelim: quoted cell keeps its commas (2 cells stay 1)', P.quoted[0][3] === 'What is the next term of 2, 4, 8, ...?' && P.quoted[0].length === 10, P.quoted[0]);
    ok('parseDelim: escaped quotes "" → "', P.esc[0][1] === 'say "hi"', P.esc);
    ok('parseDelim: TSV auto-detected when the line has tabs and no commas', P.tsv[0].join('|') === 'a|b', P.tsv);
    ok('parseDelim: blank rows dropped', P.blanks.length === 2, P.blanks);
    ok('rowsFromText: JSON array with aliases maps every field', P.json.length === 1 && P.json[0].q === 'What is 2+2?' && P.json[0].o[2] === '4' && P.json[0].a === 'C' && P.json[0].cls === 'SS1' && P.json[0].e === 'arithmetic' && P.json[0].__src === 'json', P.json[0]);
    ok('rowsFromText: {questions:[…]} wrapper + short aliases', P.jsonWrap.length === 1 && P.jsonWrap[0].q === 'Define osmosis.' && P.jsonWrap[0].a === '1' && P.jsonWrap[0].subject === 'Biology', P.jsonWrap[0]);
    ok('rowsFromText: broken JSON → one __bad row, never a crash', P.jsonBad.length === 1 && /^JSON parse error/.test(P.jsonBad[0].__bad || ''), P.jsonBad[0]);
    ok('rowsFromText: headerless canonical column order', P.noHeader.length === 2 && P.noHeader[0].subject === 'Mathematics' && P.noHeader[0].a === 'C', P.noHeader[0]);
    ok('rowsFromText: header row consumed and mapped', P.withHeader.length === 1 && P.withHeader[0].topic === 'Sequences' && P.withHeader[0].a === 'C', P.withHeader[0]);

    const A = await T.p.evaluate(() => {
      const t = MAMSS_CBT._test;
      return {
        idx: [t.plAnswerIdx('C'), t.plAnswerIdx('c'), t.plAnswerIdx('3'), t.plAnswerIdx('0'), t.plAnswerIdx('E'), t.plAnswerIdx(''), t.plAnswerIdx('x')],
        good: t.plValidate({ subject: 'Mathematics', cls: 'SS1', topic: 'Seq', q: 'What is the next term of 2, 4, 8?', o: ['10', '12', '16', '18'], a: 'C', e: 'doubles' }, {}),
        punct: t.plValidate({ subject: 'Mathematics', cls: 'SS1', topic: '', q: 'What is 6 times 7', o: ['40', '41', '42', '43'], a: '2', e: '' }, {}),
        period: t.plValidate({ subject: 'Mathematics', cls: 'SS1', topic: '', q: 'The square of 9 is 81', o: ['t', 'f', 'x', 'y'], a: '0', e: '' }, {}),
        short: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: '2+2?', o: ['1', '2', '3', '4'], a: 'A', e: '' }, {}),
        missingOpt: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'Pick the odd one out here', o: ['1', '2', ''], a: 'A', e: '' }, {}),
        dupOpts: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'Pick the odd one out here', o: ['same', 'Same!', 'same ', 'other'], a: 'A', e: '' }, {}),
        badClass: t.plValidate({ subject: 'M', cls: 'JSS1', topic: '', q: 'Pick the odd one out here', o: ['1', '2', '3', '4'], a: 'A', e: '' }, {}),
        looseClass: t.plValidate({ subject: 'M', cls: 'ss 2', topic: '', q: 'Pick the odd one out here', o: ['1', '2', '3', '4'], a: 'A', e: '' }, {}),
        badAns: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'Pick the odd one out here', o: ['1', '2', '3', '4'], a: 'E', e: '' }, {}),
        tooLong: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'x'.repeat(1001), o: ['1', '2', '3', '4'], a: 'A', e: 'y'.repeat(601) }, {}),
        mechWarn: t.plValidate({ subject: 'M', cls: 'SS1', topic: 'Seq', q: 'Find the 3th term of this sequence', o: ['1', '2', '3', '4'], a: 'A', e: '' }, {}),
        ctxDup: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'Duplicate stem question here', o: ['1', '2', '3', '4'], a: 'A', e: '' }, (() => { const k = MAMSS_CBT._test.normCode('Duplicate stem question here.').slice(0, 60); const c = { draftKeys: {}, queueKeys: {}, bankKeys: {} }; c.draftKeys[k] = 1; return c; })()),
        ctxQueue: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'Queued stem question here', o: ['1', '2', '3', '4'], a: 'A', e: '' }, (() => { const k = MAMSS_CBT._test.normCode('Queued stem question here.').slice(0, 60); return { queueKeys: { [k]: 1 } }; })()),
        ctxBank: t.plValidate({ subject: 'M', cls: 'SS1', topic: '', q: 'Banked stem question here', o: ['1', '2', '3', '4'], a: 'A', e: '' }, (() => { const k = MAMSS_CBT._test.normCode('Banked stem question here.').slice(0, 60); return { bankKeys: { [k]: 1 } }; })()),
        badRow: t.plValidate({ __bad: 'JSON parse error: nope' }, {})
      };
    });
    ok('answerIdx: letters + digits accepted, junk → -1', A.idx.join(',') === '2,2,3,0,-1,-1,-1', A.idx);
    ok('validate: a good row passes clean', A.good.ok && A.good.errs.length === 0 && A.good.q.a === 2 && A.good.q.cls === 'SS1', A.good);
    ok('validate: bare "What…" stem auto-gains its question mark', A.punct.ok && /\?$/.test(A.punct.q.q), A.punct.q && A.punct.q.q);
    ok('validate: statement stem auto-gains a period', A.period.ok && /\.$/.test(A.period.q.q));
    ok('validate: short stem rejected', !A.short.ok && A.short.errs.some(e => /too short/.test(e)), A.short.errs);
    ok('validate: missing option rejected', !A.missingOpt.ok && A.missingOpt.errs.some(e => /four options/.test(e)));
    ok('validate: duplicate options rejected after normalization', !A.dupOpts.ok && A.dupOpts.errs.some(e => /distinct/.test(e)), A.dupOpts.errs);
    ok('validate: JSS1 rejected — SS1/SS2/SS3 only', !A.badClass.ok && A.badClass.errs.some(e => /SS1, SS2 or SS3/.test(e)));
    ok('validate: "ss 2" normalizes to SS2', A.looseClass.ok && A.looseClass.q.cls === 'SS2');
    ok('validate: answer "E" rejected', !A.badAns.ok && A.badAns.errs.some(e => /A-D or 0-3/.test(e)));
    ok('validate: length caps (stem 1000, explanation 600)', !A.tooLong.ok && A.tooLong.errs.length >= 2, A.tooLong.errs);
    ok('validate: WAEC mechanics checker warns ("3th" ordinal typo)', A.mechWarn.ok && A.mechWarn.warns.some(w => /ordinal/.test(w)), A.mechWarn.warns);
    ok('validate: empty topic is a warning, not an error', A.punct.ok && A.punct.warns.some(w => /topic/.test(w)));
    ok('validate: draft duplicate → error', !A.ctxDup.ok && A.ctxDup.errs.some(e => /draft paper/.test(e)));
    ok('validate: queue duplicate → error', !A.ctxQueue.ok && A.ctxQueue.errs.some(e => /school queue/.test(e)));
    ok('validate: bank duplicate → warning only', A.ctxBank.ok && A.ctxBank.warns.some(w => /bank already/.test(w)));
    ok('validate: __bad rows surface their parse error', !A.badRow.ok && /JSON parse error/.test(A.badRow.errs[0]));

    /* ── 2. the tab + submit panel ── */
    await T.p.evaluate(() => MAMSS_CBT.openTeacher());
    await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    ok('teacher console now has a 5th tab: Pipeline', await T.p.locator('[data-ctab="pipeline"]').count() === 1);
    ok('tab label reads "5 · Pipeline"', /5 · Pipeline/.test(await T.p.locator('[data-ctab="pipeline"]').innerText()));
    await openPipeline(T);
    ok('submit panel: textarea + file input + Check button', await T.p.locator('#plText').count() === 1 && await T.p.locator('#plFile').count() === 1 && await T.p.locator('#plCheck').count() === 1);
    ok('the bank stays hash-locked — the copy says so', /hash-locked/.test(await body(T)));

    /* ── 3. check a mixed paste: 2 good + 2 bad ── */
    await T.p.fill('#plText', [GOOD1, GOOD2, BAD_SHORT, BAD_DUP].join('\n'));
    await T.p.click('#plCheck');
    await T.p.waitForSelector('#plSend', { timeout: 10000 });
    let t2 = await body(T);
    ok('preview counts: 2 of 4 rows ready', /2 of 4 rows ready/.test(t2), t2.slice(0, 200));
    ok('preview shows the ✘ reason for the short stem', /too short/.test(t2));
    ok('preview shows the ✘ reason for duplicate options', /distinct/.test(t2));
    ok('Send button offers exactly the valid rows', /Send 2 questions/.test(t2));

    /* ── 4. send → queue ── */
    await T.p.click('#plSend');
    await T.p.waitForFunction(() => /Sent 2 questions/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    let rows = await qqRows();
    ok('mock queue holds exactly the 2 valid rows (bad rows never leave the browser)', rows.length === 2 && rows.every(r => r.status === 'pending'), rows.map(r => r.q));
    ok('rows carry subject/class/answer + submitter stamp', rows[0].cls === 'SS1' && rows[0].a === 2 && /Mr Okoro/.test(rows[0].submitter || ''), rows[0]);
    ok('UI jumped to Review and counts the pending rows', /Review \(2\)/.test(await body(T)) && /2 pending/.test(await body(T)));

    /* ── 5. approve / reject ── */
    await T.p.click('[data-plapp]');
    await T.p.waitForFunction(() => /Approved/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    rows = await qqRows();
    const appr = rows.filter(r => r.status === 'approved');
    ok('approve persists: 1 row approved with reviewer stamp', appr.length === 1 && appr[0].reviewed_by === 'Mr Okoro', appr[0] && appr[0].reviewed_by);
    ok('Review count drops to 1, Pool counts 1', /Review \(1\)/.test(await body(T)) && /Pool \(1\)/.test(await body(T)));
    await T.p.click('[data-plrej]');
    await T.p.waitForFunction(() => /Rejected/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    rows = await qqRows();
    const rej = rows.filter(r => r.status === 'rejected');
    ok('reject persists with the prompt note as audit trail', rej.length === 1 && rej[0].review_note === 'duplicate of bank question', rej[0] && rej[0].review_note);
    ok('rejected row is listed under "Recently rejected"', /Recently rejected/.test(await body(T)) && /duplicate of bank question/.test(await body(T)));

    /* ── 6. pool → draft paper ── */
    await sub(T, 'pool');
    ok('pool shows the approved question with an Add button', await T.p.locator('[data-pladd]').count() === 1 && /next term of 2, 4, 8/.test(await body(T)));
    await T.p.click('[data-pladd]');
    await T.p.waitForFunction(() => /Added 1 question to your draft paper/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 10000 });
    const draft = await T.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_draft')));
    const sch = (draft.questions || []).filter(q => q.src === 'school');
    ok('draft gained the pool question with src "school"', sch.length === 1 && sch[0].a === 2 && sch[0].o.length === 4, sch[0]);
    ok('adding twice dedupes (skipped, no double row)', await (async () => {
      await T.p.click('[data-pladd]');
      await T.p.waitForFunction(() => /already on the paper/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 10000 });
      const d2 = await T.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_draft')));
      return d2.questions.filter(q => q.src === 'school').length === 1;
    })());
    await T.p.click('[data-ctab="create"]');
    await T.p.waitForFunction(() => /question/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    ok('Build paper tab lists it, tagged "school pool"', /school pool/.test(await body(T)) && /next term of 2, 4, 8/.test(await body(T)));

    /* ── 7. JSON paste + file upload ── */
    await T.p.click('[data-ctab="pipeline"]');
    await T.p.waitForFunction(() => /Question pipeline/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    await sub(T, 'submit');
    await T.p.waitForSelector('#plText', { timeout: 10000 });
    await T.p.fill('#plText', JSON.stringify([{ question: 'Which gas do plants absorb for photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], answer: 'B', class: 'SS1', subject: 'Biology', topic: 'Photosynthesis', explanation: 'CO2 is fixed in the Calvin cycle' }]));
    await T.p.click('#plCheck');
    await T.p.waitForSelector('#plSend', { timeout: 10000 });
    ok('JSON paste: 1 of 1 rows pass the checker', /1 of 1 row pass/.test(await body(T)));
    await T.p.click('#plSend');
    await T.p.waitForFunction(() => /Sent 1 question/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    rows = await qqRows();
    ok('JSON row landed in the queue (source "json")', rows.length === 3 && rows.filter(r => r.source === 'json').length === 1);

    await sub(T, 'submit');
    const csvPath = '/tmp/pipetest-upload.csv';
    require('fs').writeFileSync(csvPath, 'subject,class,topic,question,optionA,optionB,optionC,optionD,answer,explanation\nPhysics,SS3,Waves,"What is the SI unit of frequency?",Hertz,Newton,Joule,Watt,A,Cycles per second\n');
    await T.p.setInputFiles('#plFile', csvPath);
    await T.p.waitForSelector('#plSend', { timeout: 10000 });
    ok('file upload fills the textarea and previews automatically', /Hertz/.test(await T.p.inputValue('#plText')) && /1 of 1 row/.test(await body(T)));

    /* ── 8. queue duplicate guard + refresh ── */
    await T.p.fill('#plText', GOOD1);
    await T.p.click('#plCheck');
    await T.p.waitForFunction(() => /school queue/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 10000 });
    ok('re-submitting a queued stem is caught as a duplicate (0 ready)', /already in the school queue/.test(await body(T)) && /Send 0 questions/.test(await body(T)));
    await fetch(MOCK + '/rest/v1/question_queue', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ subject: 'Chemistry', cls: 'SS2', topic: 'Acids', q: 'What is the pH of pure water?', o: ['5', '6', '7', '8'], a: 2, e: '', source: 'form', submitter: 'Mrs B' })
    });
    await T.p.click('#plRefresh');
    await T.p.waitForFunction(() => /Review \(2\)/.test(document.getElementById('cbtConsBody').textContent), null, { timeout: 15000 });
    ok('↻ Refresh picks up another teacher’s submission (Review 1 → 2)', /Mrs B/.test(await (async () => { await sub(T, 'review'); return body(T); })()));

    /* ── 9. degrade + gating ── */
    const D2 = await mkCtx(browser, 'teacher', { tag: 'dead', deadTables: true });
    ALL.push(D2);
    await openCbt(D2.p);
    await openPipeline(D2);
    ok('missing table → the honest "being set up" note, nothing crashes', /being set up/.test(await body(D2)) && /pipeline_schema\.sql/.test(await body(D2)));

    const S = await mkCtx(browser, 'student', { tag: 'st' });
    ALL.push(S);
    await openCbt(S.p);
    ok('students never see console tabs at all', await S.p.locator('[data-ctab]').count() === 0);

    /* ── 10. hygiene ── */
    const st = await T.p.evaluate(() => MAMSS_CBT._test.pipeline());
    ok('_test.pipeline() mirrors the queue state', st.data.length === 4 && st.sub === 'review', { n: st.data.length, sub: st.sub });
    for (const C of ALL) ok('zero page errors (' + (C === T ? 'teacher main' : C === D2 ? 'dead tables' : 'student') + ')', C.errs.length === 0, C.errs[0]);
  } catch (e) {
    fail++;
    console.log('  FATAL — ' + e.message);
  } finally {
    for (const C of ALL) { try { await C.ctx.close(); } catch (e) {} }
    try { await browser.close(); } catch (e) {}
    try { mock.kill(); } catch (e) {}
  }
  console.log('\npipetest: ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})();
