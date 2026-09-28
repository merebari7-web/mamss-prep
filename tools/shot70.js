/* v70 design shots: the sitting door, the proctoring door, the runner with calculator. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const MOCK = 'http://127.0.0.1:8134';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', '8134'], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const QS = [
    { q: 'Simplify: 7x − 3x + 2x', o: ['6x', '4x', '8x', '2x'], a: 0, e: '7 − 3 + 2 = 6.' },
    { q: 'The smallest prime number is…', o: ['0', '1', '2', '3'], a: 2, e: '2 is the only even prime.' },
    { q: 'Which organ pumps blood round the body?', o: ['Liver', 'Heart', 'Lung', 'Kidney'], a: 1, e: 'The heart, four chambers.' },
    { q: 'Choose the antonym of "scarce".', o: ['Rare', 'Abundant', 'Hidden', 'Costly'], a: 1, e: 'Scarce = rare; opposite = abundant.' },
  ];
  await fetch(MOCK + '/rest/v1/cbt_sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: 'x', Authorization: 'Bearer x' }, body: JSON.stringify({ code: 'SHOT70', title: 'JSS2 Mathematics · Drill 4', cls: 'JSS2', created_by: 'shot70', status: 'waiting', duration_s: 1800, extend_s: 0, questions: QS, settings: { instantResults: true, showRank: true, shuffle: false } }) });
  await fetch(MOCK + '/rest/v1/cbt_sessions?code=eq.SHOT70', { method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: 'x', Authorization: 'Bearer x', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'live' }) });

  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 940 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(`
    window.__CBT_FORCE_POLL = 1;
    localStorage.setItem('nssc_mp_seen', '70');
    localStorage.setItem('nssc_devid', JSON.stringify('shot70-student'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify({ h: 'shot70hash00', mask: 'MAMSS··TEST··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' }))});
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
  await p.goto('http://localhost:8100/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  await p.click('.study-nav a[data-view="cbt"]');
  await p.waitForSelector('#cbtWhoGo', { timeout: 15000 });
  await p.fill('#cbtWhoName', 'Ada Chukwuma');
  await p.click('[data-who-cls="4"]');
  await sleep(300);
  await p.locator('#viewCbt .cbt-card').first().screenshot({ path: '/home/user/designshots/v70-sitting-door.png' });
  console.log('shot 1 done (sitting door)');
  await p.click('#cbtWhoGo');
  await p.waitForSelector('#cbtJoinCode', { timeout: 10000 });
  await p.fill('#cbtJoinCode', 'SHOT70');
  await p.click('#cbtJoinBtn');
  await p.waitForSelector('#cbtGateGo', { timeout: 15000 });
  await p.click('#cbtGateCamEnable');
  await p.waitForTimeout(700);
  await p.click('#cbtGateVoxEnable');
  await p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 15000 });
  await sleep(300);
  await p.locator('#viewCbt .cbt-card').first().screenshot({ path: '/home/user/designshots/v70-proctoring-door.png' });
  console.log('shot 2 done (proctoring door)');
  await p.click('#cbtGateGo');
  await p.waitForSelector('#cbtBriefGo', { timeout: 10000 });
  await p.check('#cbtBriefOk');
  await p.click('#cbtBriefGo');
  await p.waitForSelector('#cbtRunTimer', { timeout: 10000 });
  await p.locator('.cbt-opt').first().click({ timeout: 8000 }).catch(() => {});
  await p.click('#cbtCalcBtn');
  await p.waitForFunction(() => !!window.__calcApi && document.querySelector('#caOv'), null, { timeout: 10000 });
  await p.evaluate(() => { ['7', '-', '3', '+', '2'].forEach(k => window.__calcApi.press(k)); });
  await sleep(400);
  await p.locator('#viewCbt .cbt-card').first().screenshot({ path: '/home/user/designshots/v70-runner-calculator.png' });
  console.log('shot 3 done (runner + calculator)');
  await browser.close(); mock.kill();
  console.log('V70 SHOTS DONE');
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
