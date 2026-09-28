/* Node-side battery for the v37 solver + bank search (no browser needed). */
global.window = {};
global.document = {
  readyState: 'complete',
  documentElement: { classList: { add() {} } },
  addEventListener() {}, removeEventListener() {},
  getElementById() { return null; },
  createElement() { return { style: {}, setAttribute() {}, classList: { add() {} }, appendChild() {} }; },
  head: { appendChild() {} }, body: { appendChild() {} }
};
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.fetch = () => Promise.resolve({ ok: false });
require('/home/user/mamss-prep/docs/quiz/ai.js');
const api = global.window.__aiApi;
let pass = 0, fail = 0;
function ok(name, cond, got) { if (cond) { pass++; console.log('  ok —', name); } else { fail++; console.log('  FAIL —', name, JSON.stringify(String(got)).slice(0, 220)); } }
const S = q => api.solve(q);
let r;
r = S('Solve 3x + 5 = 20'); ok('linear 3x+5=20 → 5', r && /x = 5\b/.test(r.text), r && r.text);
r = S('solve 2x - 7 = x + 5'); ok('linear both sides → 12', r && /x = 12/.test(r.text), r && r.text);
r = S('Solve x² − 5x + 6 = 0'); ok('quadratic → 3 or 2', r && /x = 3/.test(r.text) && /x = 2/.test(r.text), r && r.text);
r = S('solve x^2 + x - 1 = 0'); ok('quadratic irrational roots', r && /0.618034/.test(r.text), r && r.text);
r = S('Solve 2x + y = 7 and x - y = 2'); ok('simultaneous → x=3 y=1', r && /x = 3/.test(r.text) && /y = 1/.test(r.text), r && r.text);
r = S('What is 15% of 240'); ok('15% of 240 → 36', r && /= 36/.test(r.text), r && r.text);
r = S('percentage increase from 80 to 100'); ok('% increase → 25', r && /25/.test(r.text), r && r.text);
r = S('Simple interest on 5000 at 8% for 3 years'); ok('SI → 1200', r && /1200/.test(r.text), r && r.text);
r = S('HCF of 12 and 18'); ok('HCF → 6', r && /= 6/.test(r.text), r && r.text);
r = S('LCM of 4 and 6'); ok('LCM → 12', r && /= 12/.test(r.text), r && r.text);
r = S('Find the hypotenuse of 3 and 4'); ok('pythagoras → 5', r && /= 5/.test(r.text), r && r.text);
r = S('mean of 4, 8, 6, 10'); ok('stats mean 7 median 7', r && /Mean = sum ÷ n = 28 ÷ 4 = 7/.test(r.text) && /Median = middle value = 7/.test(r.text), r && r.text);
r = S('3/4 + 1/6'); ok('fractions → 11/12', r && /11\/12/.test(r.text), r && r.text);
r = S('round 3.14159 to 2 decimal places'); ok('round dp → 3.14', r && /3\.14\b/.test(r.text), r && r.text);
r = S('convert 1011 from base 2 to base 10'); ok('base 2→10 → 11', r && /= 11 \(base 10\)/.test(r.text), r && r.text);
r = S('What is 12 * 7 + 3'); ok('arithmetic → 87', r && /= 87/.test(r.text), r && r.text);
r = S('A car travels 120 km in 2 hours, find the average speed'); ok('speed → 60 km/h', r && /60 km\/h/.test(r.text), r && r.text);
r = S('What is photosynthesis'); ok('prose declines solver', r === null, r);
r = S('Tell me about the French Revolution'); ok('history declines solver', r === null, r);
r = api.reply('What is photosynthesis'); ok('reply routes prose to fact', r && r.src === 'fact', r && r.src);
r = api.reply('Solve 3x + 5 = 20'); ok('reply routes math to solver', r && r.src === 'solver', r && r.src);
global.window.CLAZZES = [{ 'class': 'SS2', questions: [
  { q: 'Simplify: 7x − 3x + 2x', o: ['6x', '4x', '8x', '2x'], a: 0, e: '7 − 3 + 2 = 6.' },
  { q: 'Which organ pumps blood round the body?', o: ['Liver', 'Heart', 'Lung', 'Kidney'], a: 1, e: 'The heart.' }
] }];
r = api.reply('which organ pumps blood round the body'); ok('bank search finds heart', r && r.src === 'bank' && /Heart/.test(r.text), r && r.src);
r = api.reply('simplify 7x 3x 2x'); ok('bank search finds algebra', r && r.src === 'bank' && /6x/.test(r.text), r && r.src);
global.window.CLAZZES = null;
r = api.reply('zzz qqq nothing matches anywhere'); ok('fallback is honest', r && r.src === 'fallback' && /invent/.test(r.text), r && r.text);
console.log(`\noracle battery: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
