/* Reusable browser audit for the MAMSS Prep static app. */
const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:8099/';
const LABEL = process.argv[3] || 'run';
const SHOT = process.argv[4] || '';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--font-render-hinting=none']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');

  const errors = [], warnings = [], failed = [], requests = [];
  page.on('console', m => {
    const t = m.type(), x = `${t}: ${m.text()}`;
    if (t === 'error') errors.push(x); else if (t === 'warning') warnings.push(x);
  });
  page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message)));
  page.on('requestfailed', r => failed.push(`${r.failure() && r.failure().errorText} ${r.url().slice(0,110)}`));
  page.on('response', r => { if (r.url().startsWith(BASE)) requests.push({u:r.url().replace(BASE,''), s:r.status(), len:+(r.headers()['content-length']||0)}); });

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  const tLoad = Date.now() - t0;

  // give the bank time to decode
  await page.waitForFunction('window.QUIZ_RAW || window.QUIZ_ERR', { timeout: 45000 }).catch(()=>{});
  const tBank = Date.now() - t0;
  await new Promise(r => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const links = [...document.querySelectorAll('link')].map(l => l.rel + '=' + (l.href||'').split('/').pop());
    let qc = 0, subj = 0, cls = 0;
    try { const G = window.QUIZ_RAW; if (G && G.classes) { cls = G.classes.length;
      G.classes.forEach(c => { (c.subjects||[]).forEach(s => { subj++; qc += (s.questions||s.q||[]).length; }); }); } } catch(e) {}
    return {
      title: document.title,
      manifestLink: !!q('link[rel="manifest"]'),
      manifestHref: q('link[rel="manifest"]') ? q('link[rel="manifest"]').getAttribute('href') : null,
      appleTouchIcon: !!q('link[rel="apple-touch-icon"]'),
      canonicals: document.querySelectorAll('link[rel="canonical"]').length,
      icons: document.querySelectorAll('link[rel="icon"]').length,
      firstIcon: q('link[rel="icon"]') ? q('link[rel="icon"]').getAttribute('href').slice(0,42) : null,
      headChildren: [...document.head.children].map(e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')).slice(0,40),
      theme: document.documentElement.dataset.theme,
      bankErr: window.QUIZ_ERR || null,
      bankOK: !!window.QUIZ_RAW,
      classes: cls, subjects: subj, questions: qc,
      gateVisible: !!q('.gate') ? getComputedStyle(q('.gate')).display : 'no .gate',
      bodyClasses: document.body.className,
      htmlClasses: document.documentElement.className,
      links,
      scripts: [...document.scripts].map(s=>s.src?s.src.split('/').pop():'(inline '+(s.textContent||'').length+')'),
      stylesheets: [...document.styleSheets].map(s=>(s.href||'inline').split('/').pop()),
      swController: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      docHeight: document.documentElement.scrollHeight,
      luxeframeParent: q('.luxe-frame') ? q('.luxe-frame').parentElement.tagName : 'none'
    };
  });

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource');
    const bySize = res.slice().sort((a,b)=>(b.transferSize||0)-(a.transferSize||0)).slice(0,12)
      .map(r=>({n:r.name.split('/').pop().slice(0,28), kb:+((r.transferSize||0)/1024).toFixed(1), dur:Math.round(r.duration)}));
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd||0),
      loadEvent: Math.round(nav.loadEventEnd||0),
      transferTotalKB: +(res.reduce((a,r)=>a+(r.transferSize||0),0)/1024).toFixed(1),
      decodedTotalKB: +(res.reduce((a,r)=>a+(r.decodedBodySize||0),0)/1024).toFixed(1),
      resourceCount: res.length,
      biggest: bySize,
      fcp: (()=>{const e=performance.getEntriesByName('first-contentful-paint')[0];return e?Math.round(e.startTime):null})(),
      tbtApprox: (()=>{const l=performance.getEntriesByType('longtask')||[];return l.reduce((a,x)=>a+Math.max(0,x.duration-50),0)})()
    };
  });

  console.log(JSON.stringify({ LABEL, BASE, tLoad, tBank, info, perf, errors: errors.slice(0,25), errorCount: errors.length, warnings: warnings.slice(0,10), failed: failed.slice(0,15), requests }, null, 2));
  if (SHOT) await page.screenshot({ path: SHOT, fullPage: false });
  await browser.close();
})().catch(e => { console.error('AUDIT FAIL', e); process.exit(1); });
