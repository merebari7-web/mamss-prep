/* v71 design shots: the Oracle mid-solve, the finished overview (desktop), the phone dock. */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:8100/';
const ACT = { h: 'shot710000000s', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
(async () => {
  const browser = await chromium.launch();
  // Shot 1: the Solver working a quadratic, desktop
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 940 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await ctx.addInitScript(`
    localStorage.setItem('nssc_mp_seen', '71');
    localStorage.setItem('nssc_devid', JSON.stringify('shot71-student'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(ACT))});
  `);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  await sleep(2500);
  await p.locator('#viewOverview').screenshot({ path: '/home/user/designshots/v71-overview-desktop.png' });
  console.log('shot 1 done (overview desktop)');
  await p.evaluate(() => new Promise(res => { if (window.__aiApi) return res(); const s = document.createElement('script'); s.src = 'quiz/ai.js'; s.onload = () => setTimeout(res, 300); document.head.appendChild(s); }));
  await p.waitForFunction(() => !!window.__aiApi, null, { timeout: 10000 });
  await p.evaluate(() => window.__aiApi.open('ask'));
  await p.waitForSelector('#aiOv .ai-in', { timeout: 8000 });
  await p.fill('#aiOv .ai-in', 'Solve x² − 5x + 6 = 0');
  await p.click('#aiOv .ai-go');
  await p.waitForFunction(() => document.querySelectorAll('#aiOv .ai-msg.ai-b').length >= 2, null, { timeout: 8000 });
  await sleep(400);
  await p.locator('#aiOv .ai-box').screenshot({ path: '/home/user/designshots/v71-oracle-solver.png' });
  console.log('shot 2 done (oracle solver)');
  await browser.close();
  // Shot 3: the phone — dock + overview
  const b2 = await chromium.launch();
  const c2 = await b2.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  await c2.addInitScript(`
    localStorage.setItem('nssc_mp_seen', '71');
    localStorage.setItem('nssc_devid', JSON.stringify('shot71-phone'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(ACT))});
  `);
  const p2 = await c2.newPage();
  await p2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p2.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p2.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p2.evaluate(() => { const o = document.getElementById('mpNewOverlay'); if (o) o.classList.add('hidden'); });
  await p2.click('#studioDock a[data-view="cbt"]');
  await p2.waitForSelector('#cbtWhoGo', { timeout: 15000 });
  await p2.fill('#cbtWhoName', 'Ada Chukwuma');
  await p2.click('[data-who-cls="4"]');
  await sleep(500);
  await p2.screenshot({ path: '/home/user/designshots/v71-phone-sitting-door.png' });
  console.log('shot 3 done (phone sitting door)');
  await b2.close();
  console.log('V71 SHOTS DONE');
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
