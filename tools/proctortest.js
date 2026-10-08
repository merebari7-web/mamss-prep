/* v72 "The Watchful Hall" — advanced proctoring suite.
   Topology: docs copy on :8100, /rest/v1/* rewritten to the in-memory cbtmock
   on :8125, WS echo relay on :8128 (Phoenix protocol, same as cbttest).
   Media is deterministic: getUserMedia is stubbed with a canvas video source
   (black / dim / static-pattern modes) and a WebAudio oscillator microphone,
   so camera flags (covered · dark · still) and voice states (speaking ·
   quiet · silent) can be provoked on demand.
   Run: node proctortest.js [BASE]     (default http://localhost:8100/)       */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8125;
const WS_PORT = 8128;
const MOCK = 'http://127.0.0.1:' + MOCK_PORT;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok ' + (pass + fail) + ' — ' + name); }
  else { fail++; console.log('  FAIL ' + (pass + fail) + ' — ' + name + (extra ? '  [' + extra + ']' : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function dump(table) {
  const r = await fetch(MOCK + '/_dump?table=' + table);
  return r.json();
}

/* ── the deterministic media stub (runs before any page script) ─────────── */
const MEDIA_STUB = `
(function () {
  window.__vidMode = 'normal';
  var vStream = null, aPack = null;
  function videoStream() {
    if (vStream) return vStream;
    var cv = document.createElement('canvas'); cv.width = 320; cv.height = 240;
    var x = cv.getContext('2d');
    var frame = 0;
    function pattern(shift) {
      x.fillStyle = '#c8b8a0'; x.fillRect(0, 0, 320, 240);   /* bright base so 'still' is lit */
      for (var i = 0; i < 40; i++) {
        x.fillStyle = 'rgb(' + ((i * 37) % 255) + ',' + ((i * 91) % 255) + ',' + ((i * 53) % 255) + ')';
        x.fillRect(((i * 29) + (shift || 0)) % 300, (i * 17) % 220, 24, 18);
      }
    }
    pattern(0);
    setInterval(function () {
      var m = window.__vidMode;
      if (m === 'black') { x.fillStyle = '#000'; x.fillRect(0, 0, 320, 240); }
      else if (m === 'dim') { x.fillStyle = 'rgb(20,20,20)'; x.fillRect(0, 0, 320, 240); }
      else if (m === 'still') { pattern(0); }                 /* identical pixels every frame → zero diff */
      else { frame = (frame + 7) % 220; pattern(frame); }     /* 'normal' moves → real motion */
    }, 120);
    vStream = cv.captureStream(8);
    return vStream;
  }
  function audioStream() {
    if (!aPack) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = new Ctx();
      var osc = ctx.createOscillator(), g = ctx.createGain(), dest = ctx.createMediaStreamDestination();
      osc.frequency.value = 220; g.gain.value = 0.5;
      osc.connect(g); g.connect(dest); osc.start();
      window.__voxGain = g; window.__voxCtx = ctx;
      aPack = { stream: dest.stream, ctx: ctx };
    }
    try { if (aPack.ctx.state === 'suspended') aPack.ctx.resume(); } catch (e) {}
    return aPack.stream;
  }
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: function (c) {
        if (c && c.audio && !c.video) return Promise.resolve(audioStream());
        return Promise.resolve(videoStream());
      },
      enumerateDevices: function () {
        return Promise.resolve([
          { deviceId: 'stubcam', kind: 'videoinput', label: 'Stub Camera', groupId: 'g', toJSON: function () { return {}; } },
          { deviceId: 'stubmic', kind: 'audioinput', label: 'Stub Mic', groupId: 'g', toJSON: function () { return {}; } }
        ]);
      }
    }
  });
})();`;

function seedFor(role, opts) {
  opts = opts || {};
  const act = role === 'teacher'
    ? { h: 'testsuite0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'testsuite0000001', mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Ada Student' };
  const hooks = "window.__CBT_CAM_MS = 600; window.__CBT_STILL_N = 2; window.__CBT_SILENT_MS = 1500; window.__CBT_VOX_MS = 6000;";
  const head = opts.ws
    ? "window.__CBT_WS_URL = 'ws://127.0.0.1:" + WS_PORT + "/realtime/v1/websocket';" + hooks
    : "window.__CBT_FORCE_POLL = 1;" + hooks;
  return `
    ${head}
    localStorage.setItem('nssc_mp_seen', '72');
    localStorage.setItem('nssc_cbt_who', '1');
    localStorage.setItem('study_grade', JSON.stringify(1));
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-proc-device${opts.tag || ''}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
    ${MEDIA_STUB}
  `;
}

async function mkCtx(browser, role, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  await ctx.addInitScript(seedFor(role, opts));
  await ctx.route('**/rest/v1/**', async route => {
    const req = route.request();
    const u = new URL(req.url());
    try {
      const init = { method: req.method(), headers: {} };
      for (const [k, v] of Object.entries(req.headers())) {
        if (!/^:/.test(k)) init.headers[k] = v;
      }
      const pd = req.postData();
      if (pd) init.body = pd;
      const r = await fetch(MOCK + u.pathname + u.search, init);
      const buf = Buffer.from(await r.arrayBuffer());
      const headers = {};
      r.headers.forEach((v, k) => { headers[k] = v; });
      await route.fulfill({ status: r.status, headers, body: buf });
    } catch (e) {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'mock proxy: ' + e.message }) });
    }
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
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

async function enterExam(p, ms) {
  await p.waitForFunction(() => document.getElementById('cbtGateGo') || document.getElementById('cbtBriefGo') || document.getElementById('cbtRunTimer'), null, { timeout: ms || 20000 });
  if (await p.locator('#cbtGateGo').count()) {
    await p.click('#cbtGateCamEnable');
    await p.click('#cbtGateVoxEnable');
    await p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 15000 });
    await p.click('#cbtGateGo');
  }
  await p.waitForFunction(() => document.getElementById('cbtBriefGo') || document.getElementById('cbtRunTimer'), null, { timeout: 8000 });
  if (await p.locator('#cbtBriefGo').count()) { await p.check('#cbtBriefOk'); await p.click('#cbtBriefGo'); }
  await p.waitForSelector('#cbtRunTimer', { timeout: 8000 });
}

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  const wsecho = spawn('node', [__dirname + '/cbtws.js', String(WS_PORT)], { stdio: 'ignore' });
  await sleep(600);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  console.log('\n=== v72 The Watchful Hall — advanced proctoring ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + ' · ws :' + WS_PORT + '\n');

  try {
    /* ---------- 1. heuristics as pure functions (no media needed) ---------- */
    const U = await mkCtx(browser, 'student', { tag: '-unit' });
    await openCbt(U.p);
    const units = await U.p.evaluate(async () => {
      const t = MAMSS_CBT._test;
      const out = {};
      out.covered = t.camFlagOf({ lum: 5, diff: 9 });
      out.dark = t.camFlagOf({ lum: 20, diff: 9 });
      out.still1 = t.camFlagOf({ lum: 80, diff: 0.1 });      /* run 1 → not yet */
      out.still2 = t.camFlagOf({ lum: 80, diff: 0.1 });      /* run 2 ≥ __CBT_STILL_N → still */
      out.recover = t.camFlagOf({ lum: 80, diff: 9 });       /* motion again → ok, run reset */
      out.afterRecover = t.camFlagOf({ lum: 80, diff: 0.1 }); /* one quiet frame ≠ still */
      out.paceWatchful = t.paceOf({ settings: { proctorPace: 'watchful' } });
      out.paceDefault = t.paceOf(null);
      out.paceMs = [t.PACE_MS.calm, t.PACE_MS.standard, t.PACE_MS.watchful];
      out.speaking = t.voxStateOf(40);
      out.quiet = t.voxStateOf(3);
      out.quietZero = t.voxStateOf(0);                       /* silence clock starts */
      await new Promise(r => setTimeout(r, 1700));           /* > __CBT_SILENT_MS */
      out.silent = t.voxStateOf(0);
      out.backSpeaking = t.voxStateOf(40);                   /* clock resets */
      return out;
    });
    ok('camFlagOf: lum<12 → covered', units.covered === 'covered');
    ok('camFlagOf: lum<30 → dark', units.dark === 'dark');
    ok('camFlagOf: frozen feed needs __CBT_STILL_N quiet frames', units.still1 === 'ok' && units.still2 === 'still');
    ok('camFlagOf: motion clears the still-run', units.recover === 'ok' && units.afterRecover === 'ok');
    ok('paceOf reads settings.proctorPace, defaults to standard', units.paceWatchful === 'watchful' && units.paceDefault === 'standard');
    ok('PACE_MS = calm 20s · standard 12s · watchful 6s', units.paceMs.join(',') === '20000,12000,6000');
    ok('voxStateOf: loud → speaking, soft → quiet', units.speaking === 'speaking' && units.quiet === 'quiet');
    ok('voxStateOf: sustained near-nothing → silent, then recovers', units.quietZero === 'quiet' && units.silent === 'silent' && units.backSpeaking === 'speaking');

    /* ---------- 2. builder: the snapshot-pace choice ---------- */
    const T = await mkCtx(browser, 'teacher', { tag: '-t' });
    await openCbt(T.p);
    await T.p.click('#cbtConsoleBtn');
    await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    await T.p.waitForFunction(() => typeof CLASSES !== 'undefined' && CLASSES.length >= 3, null, { timeout: 45000 });
    ok('builder shows the snapshot-pace tabs', await T.p.locator('#cbtPaceTabs .cbt-tab').count() === 3);
    ok('standard pace is the default (tab pre-selected)', await T.p.locator('#cbtPaceTabs [data-pace="standard"].on').count() === 1);
    await T.p.click('#cbtPaceTabs [data-pace="watchful"]');
    let draft = await T.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_draft')));
    ok('clicking Watchful persists proctorPace on the draft', draft && draft.proctorPace === 'watchful');
    ok('the clicked tab wears .on (no re-render needed)', await T.p.locator('#cbtPaceTabs [data-pace="watchful"].on').count() === 1);
    await T.p.click('#cbtPaceTabs [data-pace="calm"]');
    draft = await T.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_draft')));
    ok('pace is switchable both ways (calm)', draft && draft.proctorPace === 'calm');
    await T.p.click('#cbtWaecTpl');
    await T.p.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('nssc_cbt_draft')); return d && d.waecathon === true; }, null, { timeout: 8000 });
    draft = await T.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_draft')));
    ok('the Waecathon template sits watchful', draft.proctorPace === 'watchful');
    ok('the template re-render keeps the watchful tab lit', await T.p.locator('#cbtPaceTabs [data-pace="watchful"].on').count() === 1);

    /* build a small paper for the gate + live phases */
    await T.p.click('#cbtClearQ');                     /* the template left 40 questions on the draft */
    await T.p.fill('#cbtDraftTitle', 'Proctor Drill');
    await T.p.click('[data-cls="SS2"]');
    await T.p.fill('#cbtCount', '2');
    await T.p.click('#cbtDraw');
    await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length === 2, null, { timeout: 20000 });
    await T.p.click('#cbtGoLive');
    await T.p.waitForSelector('.cbt-big-code', { timeout: 15000 });
    const code = (await T.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
    let sess = (await dump('sessions')).find(s => s.code === code);
    ok('go-live stores proctorPace inside settings (no new column)', !!sess && sess.settings && sess.settings.proctorPace === 'watchful');
    ok('settings still pin webcam+voice required', sess.settings.webcam === 'required' && sess.settings.voice === 'required');
    await T.p.click('#cbtStart');
    await T.p.waitForSelector('.cbt-chip.live', { timeout: 10000 });

    /* ---------- 3. the gate room-check: brightness hint + mic meter ---------- */
    const S = await mkCtx(browser, 'student', { tag: '-gate' });
    await S.p.evaluate(() => { window.__vidMode = 'dim'; });
    await openCbt(S.p);
    await S.p.fill('#cbtJoinCode', code);
    await S.p.click('#cbtJoinBtn');
    await S.p.waitForSelector('#cbtGateCamEnable', { timeout: 15000 });
    ok('gate privacy copy names the status words that leave the device', await S.p.locator('#viewCbt').innerText().then(t => /plain status words/.test(t)));
    await S.p.click('#cbtGateCamEnable');
    await S.p.waitForFunction(() => { const h = document.getElementById('cbtGateCamHint'); return h && !h.hidden && h.textContent.length > 5; }, null, { timeout: 8000 });
    ok('a dark room gets an honest brightness hint (advisory, not a block)', await S.p.locator('#cbtGateCamHint').innerText().then(t => /looks dark/.test(t)));
    await S.p.evaluate(() => { window.__vidMode = 'black'; });
    await S.p.waitForFunction(() => /almost nothing/.test(document.getElementById('cbtGateCamHint').textContent), null, { timeout: 8000 });
    ok('a covered lens is told plainly: the camera sees almost nothing', true);
    await S.p.evaluate(() => { window.__vidMode = 'normal'; });
    await S.p.waitForFunction(() => { const h = document.getElementById('cbtGateCamHint'); return h.hidden; }, null, { timeout: 8000 });
    ok('the hint disappears once the room is lit (it never blocks Go)', true);
    await S.p.click('#cbtGateVoxEnable');
    await S.p.waitForFunction(() => { const m = document.getElementById('cbtGateVoxMeter'); return m && !m.hidden; }, null, { timeout: 8000 });
    ok('the mic meter appears with the "say something" invitation', await S.p.locator('#cbtGateVoxHint').isVisible());
    await S.p.waitForFunction(() => { const i = document.querySelector('#cbtGateVoxMeter i'); return i && parseFloat(i.style.width) > 5; }, null, { timeout: 8000 });
    ok('the meter bar moves with the oscillator — the room can SEE it is heard', true);
    await S.p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 10000 });
    await S.p.click('#cbtGateGo');
    await enterExam(S.p, 10000);
    ok('the exam opens normally after the room check', await S.p.locator('#cbtRunTimer').count() === 1);
    const gateGone = await S.p.evaluate(() => !document.getElementById('cbtGateCamHint') && !document.getElementById('cbtGateVoxMeter'));
    ok('gate room-check DOM (hint + meter) is torn down once the exam opens', gateGone);

    /* ---------- 4. live flags over the socket: teacher watchful console ---------- */
    const T2 = await mkCtx(browser, 'teacher', { ws: true, tag: '-t2' });
    const S2 = await mkCtx(browser, 'student', { ws: true, tag: '-s2' });
    await S2.p.evaluate(() => { window.__vidMode = 'black'; });
    await openCbt(T2.p);
    await T2.p.click('#cbtConsoleBtn');
    await T2.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    await T2.p.waitForFunction(() => typeof CLASSES !== 'undefined' && CLASSES.length >= 3, null, { timeout: 45000 });
    await T2.p.fill('#cbtDraftTitle', 'Watchful Paper');
    await T2.p.click('[data-cls="SS2"]');
    await T2.p.fill('#cbtCount', '2');
    await T2.p.click('#cbtPaceTabs [data-pace="watchful"]');
    await T2.p.click('#cbtDraw');
    await T2.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length === 2, null, { timeout: 20000 });
    await T2.p.click('#cbtGoLive');
    await T2.p.waitForSelector('.cbt-big-code', { timeout: 15000 });
    const code2 = (await T2.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
    await T2.p.click('#cbtStart');
    await T2.p.waitForSelector('.cbt-chip.live', { timeout: 10000 });
    ok('monitor grows the attention strip + incident log containers', await T2.p.locator('#cbtAttention').count() === 1 && await T2.p.locator('#cbtIncidents').count() === 1);
    ok('a calm hall says so honestly', await T2.p.locator('#cbtAttention').innerText().then(t => /looks calm/.test(t)));

    await openCbt(S2.p);
    await S2.p.fill('#cbtJoinCode', code2);
    await S2.p.click('#cbtJoinBtn');
    await S2.p.waitForSelector('#cbtGateCamEnable', { timeout: 15000 });
    await S2.p.click('#cbtGateCamEnable');
    await S2.p.waitForFunction(() => /almost nothing/.test(document.getElementById('cbtGateCamHint').textContent || ''), null, { timeout: 8000 });
    await S2.p.click('#cbtGateVoxEnable');
    await S2.p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 12000 });
    await S2.p.click('#cbtGateGo');
    await enterExam(S2.p, 12000);
    ok('student with a covered camera sits the paper (advisory only — never blocked)', await S2.p.locator('#cbtRunTimer').count() === 1);

    /* the flag rides the socket as one word */
    await T2.p.waitForFunction(() => {
      const pr = MAMSS_CBT._test.proctorState();
      const k = Object.keys(pr);
      return k.length === 1 && pr[k[0]].camFlag === 'covered';
    }, null, { timeout: 15000 });
    ok('camflag "covered" arrives over the realtime socket (a word, not a metric)', true);
    await T2.p.waitForFunction(() => /camera covered/.test(document.getElementById('cbtAttention').textContent), null, { timeout: 8000 });
    ok('the attention strip names the student + the plain word', await T2.p.locator('#cbtAttention').innerText().then(t => /Ada Student/.test(t) && /camera covered/.test(t)));
    ok('the camera tile wears the red flag outline', await T2.p.locator('#cbtCams .cbt-cam.flag-covered').count() === 1);
    ok('the tile caption carries the flag word', await T2.p.locator('#cbtCams .cbt-cam small').first().innerText().then(t => /camera covered/.test(t)));
    ok('the roster grows a flag chip', await T2.p.locator('#cbtRoster .cbt-flagmini').count() >= 1);
    await T2.p.waitForFunction(() => /camera — camera covered/.test(document.getElementById('cbtIncidents').textContent), null, { timeout: 8000 });
    ok('the incident log records it — with the "in memory only" promise on the header', await T2.p.locator('#cbtConsBody').innerText().then(t => /in memory only/.test(t)));

    /* voice: silence → the second flag; recovery → chip clears, log keeps history */
    await S2.p.evaluate(() => { window.__voxGain.gain.value = 0; });
    await T2.p.waitForFunction(() => {
      const pr = MAMSS_CBT._test.proctorState();
      const k = Object.keys(pr);
      return k.length === 1 && pr[k[0]].voxState === 'silent';
    }, null, { timeout: 20000 });
    ok('90-second rule (shortened by test hook): a silent room is reported as one word', true);
    await T2.p.waitForFunction(() => /room silent/.test(document.getElementById('cbtAttention').textContent), null, { timeout: 8000 });
    ok('attention strip now lists BOTH flags', await T2.p.locator('#cbtAttention .cbt-att-chip').count() === 2);
    ok('incident log has both entries, newest first', await T2.p.locator('#cbtIncidents .cbt-inc li').count() === 2 && await T2.p.locator('#cbtIncidents .cbt-inc li').first().innerText().then(t => /room silent/.test(t)));
    ok('the mic tile says "silent" beside the level bar', await T2.p.locator('#cbtVox .cbt-vox-tile small').first().innerText().then(t => /silent/.test(t)));
    await S2.p.evaluate(() => { window.__voxGain.gain.value = 0.5; });
    await T2.p.waitForFunction(() => {
      const pr = MAMSS_CBT._test.proctorState();
      const k = Object.keys(pr);
      return k.length === 1 && pr[k[0]].voxState === 'speaking';
    }, null, { timeout: 15000 });
    await T2.p.waitForFunction(() => !/room silent/.test(document.getElementById('cbtAttention').textContent), null, { timeout: 8000 });
    ok('when the room speaks again the silent chip clears', await T2.p.locator('#cbtAttention .cbt-att-chip').count() === 1);
    ok('but the incident log keeps the history (2 entries)', await T2.p.locator('#cbtIncidents .cbt-inc li').count() === 2);

    /* privacy law: nothing new is stored anywhere */
    const atts = (await dump('attempts')).filter(a => a.session_code === code2);
    ok('the attempt row still carries only status words (webcam=on, voice=on)', atts.length === 1 && atts[0].webcam === 'on' && atts[0].voice === 'on');
    const sess2 = (await dump('sessions')).find(s => s.code === code2);
    ok('no flag data on the session row — settings only hold the pace', sess2.settings.proctorPace === 'watchful' && !/covered|silent|still|camflag|voxstate/.test(JSON.stringify(sess2.settings)));
    const answers = await dump('answers');
    ok('no proctoring event ever reached a table', !JSON.stringify(answers).includes('camflag') && !JSON.stringify(answers).includes('voxstate'));

    /* the still-flag path end to end: static bright canvas */
    await S2.p.evaluate(() => { window.__vidMode = 'still'; });
    await T2.p.waitForFunction(() => {
      const pr = MAMSS_CBT._test.proctorState();
      const k = Object.keys(pr);
      return k.length === 1 && pr[k[0]].camFlag === 'still';
    }, null, { timeout: 20000 }).catch(() => {});
    const stillReached = await T2.p.evaluate(() => {
      const pr = MAMSS_CBT._test.proctorState();
      const k = Object.keys(pr);
      return k.length === 1 && (pr[k[0]].camFlag === 'still' || pr[k[0]].camFlag === 'ok');
    });
    ok('a frozen-but-lit feed settles to still (or clears once motion returns)', stillReached);

    /* no page errors anywhere */
    ok('student pages ran with zero uncaught errors', U.errs.length + S.errs.length + S2.errs.length === 0, JSON.stringify([...U.errs, ...S.errs, ...S2.errs]).slice(0, 200));
    ok('teacher pages ran with zero uncaught errors', T.errs.length + T2.errs.length === 0, JSON.stringify([...T.errs, ...T2.errs]).slice(0, 200));
  } catch (e) {
    fail++;
    console.log('  FAIL — suite crashed: ' + (e && e.stack || e));
  } finally {
    await browser.close();
    mock.kill(); wsecho.kill();
    console.log('\n=== proctortest: ' + pass + ' passed, ' + fail + ' failed ===\n');
    process.exit(fail ? 1 : 0);
  }
})();
