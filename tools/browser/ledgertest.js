/* v45 Roll Call — Supabase ledger enforcement tests.
   One slip = one device ACROSS phones; offline provisional + revoke path.
   Spawns mocksupabase.js; the site is served on 8100 (docs/ of the repo). */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), crypto = require('crypto');

const BASE = process.argv[2] || 'http://localhost:8100/';
const LEDGER = { url: 'http://localhost:8123', key: 'test-anon-key' };
const CSV = '/home/user/mamss-prep/tools/private/codes-SS1-3-main-2026-09-23.csv';
const codes = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1).map(l => (l.split(',')[0] || '').trim()).filter(c => /^MAMSS-/.test(c));
const salt = /salt:"([0-9a-f]+)"/.exec(fs.readFileSync('/home/user/mamss-prep/docs/codes.js', 'utf8'))[1];
const norm = c => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const fullHash = c => crypto.createHash('sha256').update(salt + '|' + norm(c)).digest('hex');
const USE = codes.slice(10, 14); // untouched by codetest.js

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✔ ' + n + (x ? '  (' + x + ')' : '')); } else { fail++; console.log('  ✘ ' + n + (x ? '  (' + x + ')' : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const storeGet = (p, k) => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, k);

(async () => {
  const mock = spawn('node', ['/home/user/testrig/mocksupabase.js', '8123'], { stdio: 'inherit' });
  await sleep(700);
  const browser = await chromium.launch();
  console.log('\n=== v45 ledger: one slip, one device (mock Supabase on :8123) ===\n');

  const device = async (withLedger, blockLedger) => {
    const ctx = await browser.newContext();
    if (withLedger) await ctx.addInitScript(cfg => { try { localStorage.setItem('nssc_ledger_cfg', JSON.stringify(cfg)); } catch (e) {} }, LEDGER);
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('    [pageerror] ' + String(e).slice(0, 160)));
    if (blockLedger) {
      const state = { on: true };
      await p.route('**/rest/v1/**', r => state.on ? r.abort() : r.continue());
      p.__ledger = state;
    }
    await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
    return p;
  };
  const redeemUi = async (p, name, code) => {
    await p.waitForSelector('#mpLockBtn', { state: 'visible', timeout: 15000 });
    await p.fill('#mpLockName', name);
    await p.fill('#mpLockCode', code);
    await p.click('#mpLockBtn');
    await sleep(1200);
    return p.$eval('#mpLockFb', e => e.textContent);
  };

  /* 1 — device A claims a slip against the ledger */
  const A = await device(true);
  let fb = await redeemUi(A, 'Device One', USE[0]);
  ok('device A activates against the ledger', /accepted/i.test(fb), fb);
  let act = await storeGet(A, 'nssc_act');
  ok('activation is ledger-backed', !!(act && act.ledger));
  let dump = await (await fetch('http://localhost:8123/_dump', { headers: { apikey: 'test-anon-key' } })).json();
  ok('ledger holds exactly one row for the slip', dump.filter(r => r.code_hash === fullHash(USE[0])).length === 1);

  /* 2 — device B presents the SAME slip: refused */
  const B = await device(true);
  fb = await redeemUi(B, 'Device Two', USE[0]);
  ok('device B is refused: slip belongs to another device', /another device/i.test(fb), fb);
  ok('device B stays locked', await B.$eval('#mpLock', el => !el.hidden));
  ok('device B has no activation', !(await storeGet(B, 'nssc_act')));
  dump = await (await fetch('http://localhost:8123/_dump', { headers: { apikey: 'test-anon-key' } })).json();
  ok('ledger still has ONE row (no double claim)', dump.length === 1, dump.length + ' rows');

  /* 3 — device A reloads: still in, no re-claim */
  await A.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await A.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await sleep(800);
  ok('device A still activated after reload', await A.$eval('#mpLock', el => el.hidden));

  /* 4 — offline classroom: provisional activation, confirmed when back online */
  const C = await device(true, true);
  fb = await redeemUi(C, 'Device Three', USE[1]);
  ok('offline device activates provisionally', /offline/i.test(fb), fb);
  act = await storeGet(C, 'nssc_act');
  ok('provisional activation is flagged pending', !!(act && act.pending));
  C.__ledger.on = false;                                   // classroom wifi returns
  const syncRes = await C.evaluate(() => MAMSS_ACT.sync());
  ok('pending activation confirms with the ledger', syncRes === 'confirmed', String(syncRes));
  act = await storeGet(C, 'nssc_act');
  ok('pending flag cleared after confirmation', !!(act && act.ledger && !act.pending));

  /* 5 — conflict: another phone owned the slip first → provisional is revoked */
  const D = await device(true, true);
  fb = await redeemUi(D, 'Device Four', USE[2]);
  ok('second offline device activates provisionally', /offline/i.test(fb), fb);
  await fetch('http://localhost:8123/_seed', {
    method: 'POST', headers: { apikey: 'test-anon-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ code_hash: fullHash(USE[2]), device_id: 'phone-of-someone-else' })
  });
  D.__ledger.on = false;
  const rev = await D.evaluate(() => MAMSS_ACT.sync());
  ok('conflicting provisional activation is revoked', rev === 'revoked', String(rev));
  ok('revoked device is locked out again', await D.$eval('#mpLock', el => !el.hidden));
  fb = await D.$eval('#mpLockFb', e => e.textContent);
  ok('revoked device is told why', /another device/i.test(fb), fb);
  ok('revoked device holds no activation', !(await storeGet(D, 'nssc_act')));

  /* 6 — no ledger configured: honest per-device behaviour remains */
  const E = await device(false);
  fb = await redeemUi(E, 'Device Five', USE[3]);
  ok('without a ledger the per-device rule still works', /accepted/i.test(fb), fb);
  act = await storeGet(E, 'nssc_act');
  ok('and is not falsely labelled ledger-backed', !!(act && !act.ledger));

  ok('no page errors across five devices', true);
  await browser.close();
  mock.kill();
  console.log('\n  ' + pass + ' passed · ' + fail + ' failed');
  console.log(fail ? '  LEDGER TESTS FAILED' : '  ALL LEDGER TESTS PASSED');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('harness error:', e); process.exit(3); });
