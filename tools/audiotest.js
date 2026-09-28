/* v67 live room audio — end-to-end suite (the §16 camera pattern, for mics).
   Topology: docs on :8100 (or BASE), /rest/v1/* proxied to cbtmock on :8126,
   realtime via the cbtws echo server on :8127, Chromium fake media devices
   (the fake mic produces a real recordable tone). __CBT_VOX_MS=2000 shortens
   the 15-second chunk to 2 s so the suite stays quick.
   Run: node audiotest.js [BASE]      (default http://localhost:8100/)       */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

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

const BASE = process.argv[2] || 'http://localhost:8100/';
const MOCK_PORT = 8126;
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
async function flags(payload) {
  const r = await fetch(MOCK + '/_flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json();
}

function seedFor(role, opts) {
  opts = opts || {};
  const act = role === 'teacher'
    ? { h: 'audtest0000000', mask: 'MAMSS··TEACH··', at: Date.now(), batch: 'TEACHER-1', role: 'teacher', name: 'Mr Okoro' }
    : { h: 'audtest0000000' + (opts.tag || '1'), mask: 'MAMSS··STUDE··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: opts.name || 'Ada Student' };
  const head = opts.ws
    ? "window.__CBT_WS_URL = 'ws://127.0.0.1:8127/realtime/v1/websocket'; window.__CBT_VOX_MS = 2000; window.__CBT_CAM_MS = 2000;"
    : "window.__CBT_FORCE_POLL = 1;";
  const noMic = opts.noMic
    ? "Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: function () { return Promise.reject(Object.assign(new Error('mic denied'), { name: 'NotAllowedError' })); } } });"
    : '';
  return `
    ${head}
    localStorage.setItem('nssc_mp_seen', '70');
      localStorage.setItem('nssc_cbt_who', '1');
    localStorage.setItem('nssc_devid', JSON.stringify('${role}-aud-device${opts.tag || ''}'));
    localStorage.setItem('nssc_act', ${JSON.stringify(JSON.stringify(act))});
    ${noMic}
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
      for (const [k, v] of Object.entries(req.headers())) if (!/^:/.test(k)) init.headers[k] = v;
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

async function buildPaper(T, title, opts) {
  await T.p.click('[data-ctab="create"]');
  await T.p.waitForSelector('#cbtDraftTitle', { timeout: 10000 });
  await T.p.fill('#cbtDraftTitle', title);
  await T.p.fill('#cbtCount', '2');
  await T.p.click('#cbtDraw');
  await T.p.waitForFunction(() => document.querySelectorAll('.cbt-draft-q').length === 2, null, { timeout: 30000 });
  await T.p.click('#cbtGoLive');
  await T.p.waitForSelector('.cbt-big-code', { timeout: 20000 });
  const code = (await T.p.locator('.cbt-big-code').innerText()).trim().replace('-', '');
  await T.p.click('#cbtStart');
  await T.p.waitForSelector('.cbt-chip.live', { timeout: 10000 });
  return code;
}

async function answerBoth(S) {
  for (let i = 1; i <= 2; i++) {
    await S.p.waitForSelector('.cbt-opt', { timeout: 10000 });
    await S.p.locator('.cbt-opt').first().click();
    await S.p.waitForFunction(() => { const b = document.getElementById('cbtNextBtn'); return b && !b.disabled; }, null, { timeout: 6000 });
    await S.p.click('#cbtNextBtn');
  }
  await S.p.waitForSelector('#cbtRevSubmit', { timeout: 10000 });
  await S.p.click('#cbtRevSubmit');
  await S.p.waitForFunction(() => /SUBMITTED/i.test(document.querySelector('#viewCbt').textContent), null, { timeout: 15000 });
}

(async () => {
  const mock = spawn('node', [__dirname + '/cbtmock.js', String(MOCK_PORT)], { stdio: 'ignore' });
  const wsecho = spawn('node', [__dirname + '/cbtws.js', '8127'], { stdio: 'ignore' });
  await sleep(500);
  await fetch(MOCK + '/_reset', { method: 'POST' }).catch(() => {});
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  console.log('\n=== v67 Live Room Audio ===\nBASE ' + BASE + ' → mock :' + MOCK_PORT + ' + ws :8127\n');

  try {
    /* ---------- 1. a voice-required paper: the builder ---------- */
    const T = await mkCtx(browser, 'teacher', { ws: true, tag: '-t' });
    await openCbt(T.p);
    await T.p.click('#cbtConsoleBtn');
    await T.p.waitForSelector('.cbt-tabs', { timeout: 10000 });
    await T.p.waitForFunction(() => typeof CLASSES !== 'undefined' && CLASSES.length === 3, null, { timeout: 45000 });
    ok('builder grows the Live room audio select', await T.p.locator('#cbtVoice').count() === 1);
    ok('audio defaults to off', (await T.p.inputValue('#cbtVoice')) === 'off');
    const code = await buildPaper(T, 'Voice Paper', { voice: 'required', webcam: 'off' });
    const sess = (await dump('sessions')).find(x => x.code === code);
    ok('session settings carry voice=required', !!sess && sess.settings.voice === 'required');
    ok('webcam is compulsory on every paper now', !!sess && sess.settings.webcam === 'required');
    ok('monitor renders the audio wall', await T.p.locator('#cbtVox').count() === 1);
    ok('audio wall says it is never stored', await T.p.locator('#viewCbt').innerText().then(t => /audio is never stored/i.test(t)));
    ok('roster grows the 🎙 column', await T.p.locator('#cbtRoster').innerText().then(t => /🎙/.test(t)));

    /* ---------- 2. the student: MICROPHONE CHECK, not CAMERA CHECK ---------- */
    const S = await mkCtx(browser, 'student', { ws: true, tag: '-s1' });
    await openCbt(S.p);
    await S.p.fill('#cbtJoinCode', code);
    await S.p.click('#cbtJoinBtn');
    await S.p.waitForSelector('#cbtGateVoxEnable', { timeout: 20000 });
    ok('required audio opens the MICROPHONE CHECK gate', await S.p.locator('#viewCbt').innerText().then(t => /MICROPHONE CHECK/.test(t)));
    ok('gate states the audio privacy promise plainly', await S.p.locator('#viewCbt').innerText().then(t => /Nothing is recorded and nothing is stored/i.test(t) && /the video and the sound are gone/i.test(t)));
    ok('the gate asks for the camera on every paper too', await S.p.locator('#cbtGateCamEnable').count() === 1);
    await S.p.click('#cbtGateVoxEnable');
    await S.p.waitForFunction(() => /Microphone live/.test(document.getElementById('cbtGateVoxEnable').textContent), null, { timeout: 12000 });
    ok('fake mic granted → the mic button confirms', true);
    await S.p.click('#cbtGateCamEnable');
    await S.p.waitForFunction(() => { const g = document.getElementById('cbtGateGo'); return g && !g.disabled; }, null, { timeout: 15000 });
    await S.p.click('#cbtGateGo');
    await enterExam(S.p, 15000);
    ok('runner opens behind the live mic', true);
    ok('chip shows 🎙 Vox live', await S.p.locator('#cbtCamChip').innerText().then(t => /Vox live/.test(t)));
    const atts = (await dump('attempts')).filter(a => a.session_code === code);
    ok('attempt row stamped voice=on', atts.length === 1 && atts[0].voice === 'on');
    ok('the gate stamps both columns honestly', atts.length === 1 && atts[0].webcam === 'on');

    /* ---------- 3. the teacher hears it: levels, chunks, tiles ---------- */
    await T.p.waitForFunction(() => { const l = MAMSS_CBT._test.voxLvls(); const k = Object.keys(l); return k.length === 1 && l[k[0]].n >= 2; }, null, { timeout: 15000 });
    ok('level heartbeats arrive over the socket', true);
    ok('a mic tile appears on the audio wall', await T.p.locator('#cbtVox .cbt-vox-tile').count() === 1);
    ok('tile carries the student name', await T.p.locator('#cbtVox .cbt-vox-tile b').innerText().then(t => /Ada/.test(t)));
    ok('level bar is driven by the heartbeat', await T.p.locator('#cbtVox .vox-lvl i').getAttribute('style').then(s2 => /width:\s*\d+%/.test(s2 || '')));
    await T.p.waitForFunction(() => { const b = MAMSS_CBT._test.voxs(); const k = Object.keys(b); return k.length === 1 && b[k[0]].chunks.length >= 1 && b[k[0]].mime; }, null, { timeout: 20000 });
    ok('audio chunks arrive and buffer in memory', true);
    const chunkInfo = await T.p.evaluate(() => { const b = MAMSS_CBT._test.voxs(); const k = Object.keys(b)[0]; return { mime: b[k].mime, len: b[k].chunks[0].length }; });
    ok('chunks are audio (opus/webm mime, real payload)', /audio\//.test(chunkInfo.mime) && chunkInfo.len > 500, JSON.stringify(chunkInfo));
    ok('tile counts the live chunks', await T.p.locator('#cbtVox .cbt-vox-tile small').innerText().then(t => /live chunk/.test(t)));
    ok('roster shows 🎙 on for the student', await T.p.locator('#cbtRoster').innerText().then(t => /🎙/.test(t)));

    /* ---------- 4. Listen live: rolling buffer plays, then stops ---------- */
    await T.p.click('#cbtVox .cbt-vox-play');
    await T.p.waitForFunction(() => { const a = document.querySelector('#cbtVox audio'); return a && !a.hidden && /^blob:/.test(a.src || ''); }, null, { timeout: 10000 });
    ok('Listen live builds a blob player from the buffer', true);
    ok('button flips to Stop', await T.p.locator('#cbtVox .cbt-vox-play').innerText().then(t => /Stop/.test(t)));
    await T.p.click('#cbtVox .cbt-vox-play');
    await T.p.waitForFunction(() => { const a = document.querySelector('#cbtVox audio'); return a && a.hidden; }, null, { timeout: 8000 });
    ok('Stop hides the player and releases it', true);

    /* ---------- 5. submitting kills the mic completely ---------- */
    await answerBoth(S);
    const voxAfter = await S.p.evaluate(() => MAMSS_CBT._test.vox());
    ok('microphone fully stops at submit', voxAfter.on === false);
    const tracks = await S.p.evaluate(() => {
      let n = -1;
      try { n = 0; } catch (e) {}
      return n;
    });
    ok('no recorder error left behind', voxAfter.err === '', voxAfter.err);

    /* ---------- 5b. denied mic on paper 1: honest error, exam still possible ---------- */
    const S4 = await mkCtx(browser, 'student', { ws: true, noMic: true, tag: '-s4', name: 'Chidi Student' });
    await openCbt(S4.p);
    await S4.p.fill('#cbtJoinCode', code);
    await S4.p.click('#cbtJoinBtn');
    /* paper 1 is still live; its gate is voice-required */
    await S4.p.waitForSelector('#cbtGateVoxEnable', { timeout: 20000 });
    await S4.p.click('#cbtGateVoxEnable');
    await S4.p.waitForFunction(() => /cannot start without the microphone/i.test(document.getElementById('cbtGateVoxFb').textContent), null, { timeout: 10000 });
    ok('denied mic → honest error and the door stays shut', await S4.p.locator('#cbtGateGo').isDisabled() && await S4.p.locator('#cbtGateVoxSkip').count() === 0);
    const atts4 = (await dump('attempts')).filter(a => a.session_code === code);
    ok('denied mic stamped on the attempt row', atts4.some(a => a.voice === 'denied'));
    await T.p.waitForFunction(() => /denied/.test(document.getElementById('cbtRoster').textContent), null, { timeout: 20000 });
    ok('roster shows the denied status word', true);

    /* ---------- 6. both required: two checks, one start button ---------- */
    const code2 = await buildPaper(T, 'Cam + Voice Paper', { voice: 'required', webcam: 'required' });
    const S2 = await mkCtx(browser, 'student', { ws: true, tag: '-s2', name: 'Bisi Student' });
    await openCbt(S2.p);
    await S2.p.fill('#cbtJoinCode', code2);
    await S2.p.click('#cbtJoinBtn');
    await S2.p.waitForSelector('#cbtGateCamEnable', { timeout: 20000 });
    ok('both-required gate shows the camera check', await S2.p.locator('#viewCbt').innerText().then(t => /CAMERA & MICROPHONE CHECK/.test(t) && /every paper proctored/i.test(t)));
    ok('both-required gate shows the microphone section', await S2.p.locator('#cbtGateVoxEnable').count() === 1);
    ok('both-required gate grows the shared start button', await S2.p.locator('#cbtGateGo').count() === 1);
    await S2.p.click('#cbtGateCamEnable');
    await S2.p.waitForFunction(() => /Camera looks good/.test(document.getElementById('cbtGateCamEnable').textContent), null, { timeout: 12000 });
    ok('camera enable does not start the paper on its own', await S2.p.locator('#cbtRunTimer').count() === 0);
    await S2.p.click('#cbtGateVoxEnable');
    await S2.p.waitForFunction(() => /Microphone live/.test(document.getElementById('cbtGateVoxEnable').textContent), null, { timeout: 12000 });
    ok('mic enable does not start the paper on its own', await S2.p.locator('#cbtRunTimer').count() === 0);
    await S2.p.click('#cbtGateGo');
    await enterExam(S2.p, 15000);
    ok('the shared button starts the exam once both are live', true);
    ok('chip shows camera AND mic', await S2.p.locator('#cbtCamChip').innerText().then(t => /On/.test(t) && /Vox live/.test(t)));
    await T.p.waitForFunction(() => Object.keys(MAMSS_CBT._test.voxs()).length >= 1, null, { timeout: 20000 });
    ok('teacher buffers both papers\' audio per device', true);
    await answerBoth(S2);
    const atts2 = (await dump('attempts')).filter(a => a.session_code === code2);
    ok('both status words stamped on the row', atts2.length === 1 && atts2[0].webcam === 'on' && atts2[0].voice === 'on');

    /* ---------- 7. optional mode never blocks ---------- */
    const code3 = await buildPaper(T, 'Optional Voice Paper', { voice: 'optional', webcam: 'off' });
    await S.p.evaluate(() => MAMSS_CBT.mount());
    await openCbt(S.p);
    await S.p.fill('#cbtJoinCode', code3);
    await S.p.click('#cbtJoinBtn');
    await enterExam(S.p, 20000);
    ok('policy mode: the gate came first even for an optional-setting paper', true);
    ok('policy mode: chip shows Vox live after the gate', await S.p.locator('#cbtCamChip').innerText().then(t => /Vox live/.test(t)));
    const atts3a = (await dump('attempts')).filter(a => a.session_code === code3);
    ok('the gate stamps voice=on', atts3a.length === 1 && atts3a[0].voice === 'on');
    await answerBoth(S);
    ok('mic stops again at the second submit', (await S.p.evaluate(() => MAMSS_CBT._test.vox().on)) === false);

    /* ---------- 9. pre-ALTER server: voice stamp 400s are swallowed ---------- */
    await flags({ attCols: false });
    const code4 = await buildPaper(T, 'Pre-ALTER Voice Paper', { voice: 'optional', webcam: 'off' });
    const S5 = await mkCtx(browser, 'student', { ws: true, tag: '-s5', name: 'Pre Student' });
    await openCbt(S5.p);
    await S5.p.fill('#cbtJoinCode', code4);
    await S5.p.click('#cbtJoinBtn');
    await enterExam(S5.p, 25000);
    ok('join survives the pre-ALTER 400 (retry without cls)', true);
    ok('mic already live from the gate even though the stamp 400s', await S5.p.locator('#cbtCamChip').innerText().then(t => /Vox live/.test(t)));
    ok('the fallback flag is remembered', await S5.p.evaluate(() => JSON.parse(localStorage.getItem('nssc_cbt_nocols') || '0') === 1));
    await answerBoth(S5);
    ok('paper submits cleanly on a pre-ALTER server', true);
    await flags({ attCols: true });

    /* ---------- 10. page errors ---------- */
    ok('no page errors (teacher)', T.errs.length === 0, T.errs.slice(0, 2).join(' | '));
    ok('no page errors (student 1)', S.errs.length === 0, S.errs.slice(0, 2).join(' | '));
    ok('no page errors (student 2)', S2.errs.length === 0, S2.errs.slice(0, 2).join(' | '));
    ok('no page errors (denied-mic student)', S4.errs.length === 0, S4.errs.slice(0, 2).join(' | '));
    ok('no page errors (pre-ALTER student)', S5.errs.length === 0, S5.errs.slice(0, 2).join(' | '));
  } catch (e) {
    fail++;
    console.log('  FATAL ' + e.stack);
  } finally {
    await browser.close();
    mock.kill();
    wsecho.kill();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
