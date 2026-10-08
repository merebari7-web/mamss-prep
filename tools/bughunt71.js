/* bughunt71 — crawl every view, both roles, two widths; collect pageerrors, console errors,
   failed/404 requests, and axe violations. Prints a findings ledger, exits nonzero if dirty. */
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const BASE = process.argv[2] || 'http://localhost:8100/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TEACHER = { h: 'bugsuite00000t', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' };
const STUDENT = { h: 'bugsuite00000s', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };

const VIEWS = ['overview', 'practice', 'progress', 'tools', 'cbt', 'sync'];
const findings = [];
function note(role, view, w, kind, detail) { findings.push({ role, view, w, kind, detail }); }

async function crawl(role, act, width, label) {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(`
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '72');
    localStorage.setItem('nssc_devid', JSON.stringify('bug71-${label}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
  `);
  const p = await ctx.newPage();
  p.on('pageerror', e => note(role, 'boot', width, 'pageerror', String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR_FAILED.*127\.0\.0\.1:9|supabase|accounts\.google/.test(m.text())) note(role, 'boot', width, 'console', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) note(role, 'boot', width, 'http' + r.status(), r.url().replace(BASE, '')); });
  await p.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => note(role, 'boot', width, 'goto', String(e).slice(0, 120)));
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 }).catch(() => note(role, 'boot', width, 'no-ACT', 'MAMSS_ACT never booted'));
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  const overlay = await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); return true; });
  for (const v of VIEWS) {
    const navSel = width < 600 ? `#studioDock a[data-view="${v}"]` : `.study-nav a[data-view="${v}"]`;
    await p.click(navSel).catch(() => note(role, v, width, 'nav', 'click failed'));
    await sleep(900);
    const vis = await p.evaluate((vv) => {
      const sec = document.getElementById('view' + vv[0].toUpperCase() + vv.slice(1));
      if (!sec) return 'missing-section';
      const st = getComputedStyle(sec);
      return st.display === 'none' ? 'hidden' : 'visible';
    }, v).catch(() => 'err');
    if (vis !== 'visible') note(role, v, width, 'view', 'section not visible: ' + vis);
    try {
      const res = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze();
      for (const viol of res.violations) note(role, v, width, 'axe:' + viol.id, viol.nodes.length + ' node(s) — ' + (viol.nodes[0] && viol.nodes[0].html ? viol.nodes[0].html.slice(0, 140) : ''));
    } catch (e) { note(role, v, width, 'axe-run', String(e).slice(0, 120)); }
    // horizontal overflow check
    const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })).catch(() => null);
    if (ov && ov.sw > ov.cw + 4) note(role, v, width, 'overflow', `scrollWidth ${ov.sw} > clientWidth ${ov.cw}`);
  }
  await browser.close();
}

(async () => {
  await crawl('student', STUDENT, 1366, 's-desk');
  await crawl('student', STUDENT, 390, 's-mob');
  await crawl('teacher', TEACHER, 1366, 't-desk');
  await crawl('teacher', TEACHER, 390, 't-mob');
  // guest pass (no activation): the gate itself must be clean
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(`localStorage.setItem('nssc_mp_seen', '72'); localStorage.setItem('nssc_devid', JSON.stringify('bug71-guest'));`);
  const p = await ctx.newPage();
  p.on('pageerror', e => note('guest', 'gate', 1366, 'pageerror', String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|127\.0\.0\.1:9|supabase|accounts\.google/.test(m.text())) note('guest', 'gate', 1366, 'console', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) note('guest', 'gate', 1366, 'http' + r.status(), r.url().replace(BASE, '')); });
  await p.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await sleep(1500);
  const gateUp = await p.evaluate(() => !!document.getElementById('gateName') || /activation/i.test(document.body.innerText.slice(0, 4000)));
  if (!gateUp) note('guest', 'gate', 1366, 'gate', 'no activation gate for a fresh guest — FAIL CLOSED VIOLATION');
  try {
    const res = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze();
    for (const viol of res.violations) note('guest', 'gate', 1366, 'axe:' + viol.id, viol.nodes.length + ' node(s) — ' + (viol.nodes[0] && viol.nodes[0].html ? viol.nodes[0].html.slice(0, 140) : ''));
  } catch (e) {}
  await browser.close();

  console.log('=== bughunt71 findings: ' + findings.length + ' ===');
  const seen = new Set();
  for (const f of findings) {
    const k = [f.role, f.view, f.w, f.kind, f.detail].join('|');
    if (seen.has(k)) continue; seen.add(k);
    console.log(`[${f.role} ${f.w}px ${f.view}] ${f.kind}: ${f.detail}`);
  }
  process.exit(findings.length ? 1 : 0);
})();
