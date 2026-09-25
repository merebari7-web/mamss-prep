// banktest.js — WAEC-standard bank verification in a real browser.
// Loads the live redesigned page (bank.js decode IIFE), asserts QUIZ_RAW health,
// absence of every defect family fixed by tools/waec_fix.py, presence of the
// fixes, and that bank-raw.js matches the new QUIZ_HASH byte-for-byte.
// Playwright lives in the sibling test rig (../testrig/node_modules); fall back
// to a local install if the repo ever gets its own.
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(require('path').join(__dirname, '..', '..', 'testrig', 'node_modules', 'playwright'))); }
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:8100';
const HASH = fs.readFileSync(require('path').join(__dirname, '..', 'docs', 'bank.js'), 'utf8')
  .match(/QUIZ_HASH="([0-9a-f]{64})"/)[1];

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await page.goto(BASE + '/', { timeout: 60000, waitUntil: 'domcontentloaded' });

  // wait for the async decode IIFE to settle
  await page.waitForFunction(
    () => window.QUIZ_RAW !== undefined && (window.QUIZ_RAW !== null || window.QUIZ_ERR),
    null, { timeout: 30000 }
  );

  const err = await page.evaluate(() => window.QUIZ_ERR);
  ok('QUIZ_ERR is null', !err, String(err));

  const stats = await page.evaluate(() => {
    const R = window.QUIZ_RAW;
    if (!R) return null;
    const out = { subj: R.subj.length, classes: R.classes.length, counts: [], structural: 0,
      notAssoc: 0, bestDesc: 0, thirdTerm: 0, anOxygen: 0,
      oldNotTpl: 0, oldExplTpl: 0, oldOrdinal: 0, oldArt: 0, oldPos: 0, aUtility: 0 };
    const badStem = [
      /^Which of the following is NOT (a|an) [a-z]/,
      /^Which of the following is (a|an) (photosynthesis|honesty|metals|money|goods|services|wages|weather|gravity|democracy|commerce|respiration|germination|transpiration|digestion|humus|sovereignty|trade|public opinion|foreign trade)\?$/,
    ];
    for (const [name, qs] of R.classes) {
      out.counts.push([name, qs.length]);
      for (const [stem, opts, idx, expl] of qs) {
        if (!stem || !stem.trim() || opts.length !== 4 || opts.some(o => !o || !o.trim())
          || !(idx >= 0 && idx <= 3) || typeof expl !== 'string') out.structural++;
        if (stem.includes('NOT associated with')) out.notAssoc++;
        if (/^Which of the following best describes /.test(stem)) out.bestDesc++;
        if (stem.includes('3rd term of the sequence')) out.thirdTerm++;
        if (stem.includes('nucleus of an oxygen atom')) out.anOxygen++;
        if (stem.includes('is a utility?')) out.aUtility++;
        if (badStem.some(r => r.test(stem))) out.oldNotTpl++;
        if (/\bis not a [a-z]+; it is a [a-z]+\./.test(expl)) out.oldExplTpl++;
        if (/\b(1th|2th|3th|4rd)\b/.test(stem + ' ' + expl)) out.oldOrdinal++;
        if (/\ba (oxygen|aluminium|iron|acid|angle|atom|element|energy|equation|ion|isotope|integer|umbrella|orange|apple|eye|ear|egg|ice|oil|oxide|honesty|hour)\b/.test(stem + ' ' + expl)) out.oldArt++;
        if (expl.includes('is not associated with')) out.notAssocExpl = (out.notAssocExpl || 0) + 1;
      }
    }
    return out;
  });

  ok('QUIZ_RAW decoded', !!stats);
  if (!stats) { await browser.close(); process.exit(1); }
  ok('13 subjects', stats.subj === 13, stats.subj);
  ok('3 classes', stats.classes === 3);
  ok('1300 questions each', stats.counts.every(([, n]) => n === 1300), JSON.stringify(stats.counts));
  ok('0 structural violations', stats.structural === 0, stats.structural);

  ok('149 "NOT associated with" stems', stats.notAssoc === 149, stats.notAssoc);
  ok('147 rewritten explanations', (stats.notAssocExpl || 0) === 147, stats.notAssocExpl);
  ok('51 "best describes" stems', stats.bestDesc === 51, stats.bestDesc);
  ok('"3rd term" fixed (>=2)', stats.thirdTerm >= 2, stats.thirdTerm);
  ok('"an oxygen atom" present', stats.anOxygen >= 1, stats.anOxygen);
  ok('"a utility" present', stats.aUtility >= 1, stats.aUtility);

  ok('0 old NOT-a/an template stems', stats.oldNotTpl === 0, stats.oldNotTpl);
  ok('0 old "is not a X; it is a Y" explanations', stats.oldExplTpl === 0, stats.oldExplTpl);
  ok('0 ordinal typos', stats.oldOrdinal === 0, stats.oldOrdinal);
  ok('0 article errors', stats.oldArt === 0, stats.oldArt);

  // bank-raw.js rescue file must match the new hash exactly
  const raw = await page.evaluate(async (h) => {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'bank-raw.js'  /* relative: works under a path prefix like /mamss-prep/ */; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    const t = window.__BANK_RAW_TXT;
    return t ? { len: t.length, hash: window.__sha256(t), fixed: t.includes('NOT associated with'), old: /is NOT a [a-z]/.test(t) } : null;
  }, HASH);
  ok('bank-raw.js sets __BANK_RAW_TXT', !!raw);
  if (raw) {
    ok('__BANK_RAW_TXT sha256 === QUIZ_HASH', raw.hash === HASH, raw.hash.slice(0, 16));
    ok('raw text carries the fixes', raw.fixed);
    ok('raw text free of old defects', !raw.old);
  }

  await browser.close();
  console.log(`\nbanktest: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('banktest crashed:', e.message); process.exit(1); });
