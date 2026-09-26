/* v53 Adaptive Engine — Leitner boxes + pace signal + weighted Daily Challenge.
   Seeds a guest profile with planted topic stats (weak/slow Algebra, strong Geometry,
   mid Biology, strong-but-slow Physics), then verifies migration, ranking, the
   weighted daily paper (incl. same-day determinism), box updates and coach entries.
   Usage: node adaptivetest.js [baseURL] */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(require('path').join(__dirname, '..', '..', 'testrig', 'node_modules', 'playwright'))); }

const BASE = process.argv[2] || 'http://localhost:8100/';
const seed = () => {
  try {
    localStorage.setItem('nssc_act', JSON.stringify({ h: 'testsuite0000000', mask: 'MAMSS··TEST··', at: Date.now(), batch: 'test' }));
    localStorage.setItem('nssc_mp_seen', '56');
    localStorage.setItem('nssc_topics_guest', JSON.stringify({
      'Mathematics||Number & Algebra': { s: 'Mathematics', t: 'Number & Algebra', c: 2, n: 10 },
      'Mathematics||Geometry & Trigonometry': { s: 'Mathematics', t: 'Geometry & Trigonometry', c: 9, n: 10 },
      'Biology||Cells & Organisation': { s: 'Biology', t: 'Cells & Organisation', c: 5, n: 10 },
      'Physics||Electricity & Magnetism': { s: 'Physics', t: 'Electricity & Magnetism', c: 9, n: 10 }
    }));
    localStorage.setItem('nssc_attempts_guest', JSON.stringify([
      { tms: Date.now(), pct: 40, tp: [
        { s: 'Mathematics', t: 'Number & Algebra', sec: 85 },
        { s: 'Mathematics', t: 'Number & Algebra', sec: 95 },
        { s: 'Physics', t: 'Electricity & Magnetism', sec: 80 },
        { s: 'Physics', t: 'Electricity & Magnetism', sec: 80 } ] }
    ]));
  } catch (e) {}
};
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✔ ' + n + (x ? '  (' + x + ')' : '')); } else { fail++; console.log('  ✘ ' + n + (x ? '  (' + x + ')' : '')); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 912 } });
  await ctx.addInitScript(seed);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  await p.waitForFunction(() => typeof CLASSES !== 'undefined' && CLASSES.length === 3, null, { timeout: 40000 });
  console.log('\n=== v53 Adaptive Engine ===\n');

  /* ---------- migration from existing topic stats ---------- */
  const mig = await p.evaluate(() => {
    const a = adaptStore();
    const pick = k => a[k] ? { box: a[k].box, sec: a[k].sec, secN: a[k].secN, n: a[k].n, c: a[k].c } : null;
    return { alg: pick('Mathematics||Number & Algebra'), geo: pick('Mathematics||Geometry & Trigonometry'),
             cells: pick('Biology||Cells & Organisation'),
             phy: pick('Physics||Electricity & Magnetism') };
  });
  ok('weak+slow Algebra migrated to box 0', mig.alg && mig.alg.box === 0, JSON.stringify(mig.alg));
  ok('Algebra pace migrated from attempts (90s)', mig.alg && mig.alg.sec === 90 && mig.alg.secN === 1);
  ok('strong Geometry migrated to box 2', mig.geo && mig.geo.box === 2);
  ok('mid Biology (50%) migrated to box 0', mig.cells && mig.cells.box === 0);
  ok('strong Physics migrated to box 2 with 80s pace', mig.phy && mig.phy.box === 2 && mig.phy.sec === 80);

  /* ---------- ranking ---------- */
  const rank = await p.evaluate(() => adaptRank(4).map(r => [r.s + ' · ' + r.t, r.score, r.over]));
  ok('ranker puts weak+slow Algebra first', rank.length && rank[0][0] === 'Mathematics · Number & Algebra', JSON.stringify(rank[0]));
  ok('ranker puts mid Biology second', rank[1] && rank[1][0] === 'Biology · Cells & Organisation', JSON.stringify(rank[1]));

  /* ---------- weighted Daily Challenge ---------- */
  const daily = await p.evaluate(() => {
    startDaily();
    const quiz = state.quiz.slice();
    const weak = quiz.filter(q => {
      const t = q.t || topicOf(q) || 'General';
      return (q.s === 'Mathematics' && t === 'Number & Algebra') || (q.s === 'Biology' && t === 'Cells & Organisation');
    }).length;
    const stems = quiz.map(q => q.q);
    startDaily(); // determinism check
    const stems2 = state.quiz.map(q => q.q);
    return { len: quiz.length, weak, uniq: new Set(stems).size, same: JSON.stringify(stems) === JSON.stringify(stems2),
             dailyFlag: state.daily === true, mode: state.mode };
  });
  ok('daily paper still exactly 10 questions', daily.len === 10, daily.len);
  ok('daily paper is deduplicated', daily.uniq === 10, daily.uniq);
  ok('>= 4 questions come from the weakest topics', daily.weak >= 4, daily.weak + ' weak');
  ok('same-day paper is deterministic (redo works)', daily.same);
  ok('daily flags set (state.daily, study mode)', daily.dailyFlag && daily.mode === 'study');

  /* ---------- adaptUpdate: Leitner moves ---------- */
  const upd = await p.evaluate(() => {
    const key = 'Mathematics||Number & Algebra';
    state.quiz = [{ q: 'Solve the equation 2x = 4', s: 'Mathematics', a: 0, o: ['2', '3', '4', '5'], e: 'x = 2' }];
    state.answers = [1]; state.qTimes = [900];           // wrong, slow (90 s)
    adaptUpdate();
    const a1 = adaptStore()[key];
    state.answers = [0]; state.qTimes = [300];           // correct, fast (30 s)
    adaptUpdate();
    const a2 = adaptStore()[key];
    return { n1: a1.n, box1: a1.box, n2: a2.n, c2: a2.c, box2: a2.box, avg2: Math.round(a2.sec / a2.secN) };
  });
  ok('wrong answer keeps box at 0 and records the attempt', upd.n1 === 11 && upd.box1 === 0, JSON.stringify(upd));
  ok('correct+fast answer promotes box 0 -> 1', upd.box2 === 1, 'box=' + upd.box2);
  ok('pace averaged across attempts (70s)', upd.avg2 === 70, upd.avg2 + 's');

  /* ---------- AI Coach entries ---------- */
  const ai = await p.evaluate(() => {
    const t = aiSuggest().map(x => x);
    const topic = t.find(x => x.id === 'topic');
    const pace = t.find(x => x.id === 'pace');
    return { topicTxt: topic && topic.txt, topicSub: topic && topic.sub,
             paceTxt: pace && pace.txt, paceSub: pace && pace.sub };
  });
  ok('coach topic entry = weakest topic with memory box', ai.topicTxt === 'Mathematics · Number & Algebra' && /memory box 1\/5/.test(ai.topicSub || ''), ai.topicSub);
  ok('coach offers a speed drill for correct-but-slow Physics', ai.paceTxt === 'Speed drill · Electricity & Magnetism' && /correct but slow/.test(ai.paceSub || ''), ai.paceSub);

  ok('no page errors throughout', errs.length === 0, errs[0] || '');
  await browser.close();
  console.log(`\nadaptive: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('adaptivetest crashed:', e.message); process.exit(1); });
