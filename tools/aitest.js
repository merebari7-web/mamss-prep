/* aitest — the v37 oracle in the real browser: solver, bank, facts, honest fallback. */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8100/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, got) { if (cond) { pass++; console.log('  ok', pass + fail, '—', name); } else { fail++; console.log('  FAIL', pass + fail, '—', name, JSON.stringify(got === undefined ? null : got).slice(0, 200)); } }
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.addInitScript(`
    localStorage.setItem('nssc_mp_seen', '72');
    localStorage.setItem('nssc_devid', JSON.stringify('aitest-student'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify({ h: 'aitestsuite0000s', mask: 'M', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' }))});
  `);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  // ai.js is lazy — load it the way polish.js would, then boot is automatic
  await p.evaluate(() => new Promise(res => { if (window.__aiApi) return res(); const s = document.createElement('script'); s.src = 'quiz/ai.js'; s.onload = () => setTimeout(res, 200); s.onerror = res; document.head.appendChild(s); }));
  await p.waitForFunction(() => !!window.__aiApi, null, { timeout: 10000 });
  ok('the oracle boots and exposes its API', await p.evaluate(() => typeof window.__aiApi.solve === 'function' && typeof window.__aiApi.bank === 'function'));

  // headless replies (same engine the chat bubbles use)
  const rep = q => p.evaluate(t => window.__aiApi.reply(t), q);
  let r = await rep('Solve 3x + 5 = 20');
  ok('solver answers a linear equation with steps', r.src === 'solver' && /Collect the x-terms/.test(r.text) && /x = 5/.test(r.text), r);
  r = await rep('Solve x² − 5x + 6 = 0');
  ok('solver answers a quadratic with the discriminant', r.src === 'solver' && /Discriminant/.test(r.text) && /x = 3/.test(r.text), r);
  r = await rep('Solve 2x + y = 7 and x - y = 2');
  ok('solver handles simultaneous equations', r.src === 'solver' && /x = 3/.test(r.text) && /y = 1/.test(r.text), r);
  r = await rep('mean of 4, 8, 6, 10');
  ok('solver computes the statistics', r.src === 'solver' && /Mean/.test(r.text) && /Median/.test(r.text) && /Mode/.test(r.text), r);
  r = await rep('What is 15% of 240');
  ok('solver computes percentages', r.src === 'solver' && /= 36/.test(r.text), r);
  r = await rep('What is photosynthesis');
  ok('prose still routes to the fact library', r.src === 'fact' && /glucose/.test(r.text), r);
  r = await rep('zzz qqq nothing matches');
  ok('the fallback is honest — never invents', r.src === 'fallback' && /invent an answer/.test(r.text), r);

  // bank search against the real national bank (lazy — pull it in like practice does)
  const bankReady = await p.evaluate(() => new Promise(res => {
    let n = 0;
    const t = setInterval(() => {
      n++;
      const ready = typeof CLASSES !== 'undefined' && CLASSES && CLASSES.length && CLASSES[0].questions && CLASSES[0].questions.length;
      if (ready || n > 80) { clearInterval(t); res(!!ready); }
    }, 250);
  }));
  ok('the national bank loads for the search', bankReady);
  if (bankReady) {
    const sample = await p.evaluate(() => {
      for (const c of CLASSES) for (const q of (c.questions || [])) if (q.q && q.q.length > 55 && q.q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 4).length >= 5) return { cls: c['class'], q: q.q };
      return null;
    });
    const words = sample.q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4).slice(0, 5).join(' ');
    const bankHit = await p.evaluate(t => window.__aiApi.bank(t), words);
    ok('bank search finds a real past question by its own words', !!bankHit && bankHit.src === 'bank' && /Closest match/.test(bankHit.text) && bankHit.text.includes(sample.q.split(' ').slice(0, 3).join(' ').slice(0, 12)), bankHit && bankHit.text.slice(0, 100));
  }

  // the UI: open the tutor, ask, see the bubble
  await p.evaluate(() => window.__aiApi.open('ask'));
  await p.waitForSelector('#aiOv .ai-box', { timeout: 8000 });
  ok('the tutor overlay opens', await p.locator('#aiOv .ai-box').isVisible());
  await p.fill('#aiOv .ai-in', 'Solve 3x + 5 = 20');
  await p.click('#aiOv .ai-go');
  await p.waitForFunction(() => document.querySelectorAll('#aiOv .ai-msg.ai-b').length >= 1, null, { timeout: 8000 });
  const bubble = await p.locator('#aiOv .ai-msg.ai-b').first().innerText();
  ok('the chat bubble carries the solver working', /🧮|Solver|x = 5/.test(bubble), bubble.slice(0, 120));
  const chips = await p.locator('#aiOv .ai-chip').allInnerTexts();
  ok('the suggestion chips teach the new powers', chips.some(c => /Solve/.test(c)) && chips.some(c => /Mean/.test(c)), chips);
  await p.evaluate(() => window.__aiApi.close());
  await browser.close();
  console.log(`\naitest: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
