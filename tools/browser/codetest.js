/* v45 Roll Call — school activation codes, end to end.
   Uses REAL issued codes read from the git-ignored private CSV (never logged in full).
   Usage: node codetest.js [baseURL] [codes.csv] */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8100/';
const CSV = process.argv[3] || '/home/user/mamss-prep/tools/private/codes-SS1-3-main-2026-09-23.csv';

const codes = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1)
  .map(l => (l.split(',')[0] || '').trim()).filter(c => /^MAMSS-/.test(c));
if (codes.length < 4) { console.error('need at least 4 codes in ' + CSV); process.exit(2); }
const short = c => c.slice(0, 9) + '…';

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✔ ' + name + (extra ? '  (' + extra + ')' : '')); }
  else { fail++; console.log('  ✘ ' + name + (extra ? '  (' + extra + ')' : '')); }
};

const booted = page => page.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
const display = (page, sel) => page.$eval(sel, el => getComputedStyle(el).display).catch(() => 'missing');
const storeGet = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, k);

(async () => {
  const browser = await chromium.launch();
  console.log('\n=== v45 Roll Call: activation codes (' + BASE + ') ===');
  console.log('  test codes: ' + codes.slice(0, 3).map(short).join(', ') + ' …\n');

  /* ---------- 1. fresh device: gate is locked, code field is there ---------- */
  let ctx = await browser.newContext();
  let page = await ctx.newPage();
  const errs1 = []; page.on('pageerror', e => errs1.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('#mpLockBtn', { state: 'visible', timeout: 20000 });
  await booted(page);

  ok('provisional lock still applied on a fresh device',
    await page.evaluate(() => document.documentElement.classList.contains('mp-codes-pending')));
  ok('the lock overlay covers a fresh device', await page.$eval('#mpLock', el => !el.hidden));
  ok('guest sign-up hidden until a code is accepted',
    (await display(page, '#acctSignedOut button[onclick^="signUpGuest"]')) === 'none');
  ok('Google slot hidden until a code is accepted', (await display(page, '#googleBtnSlot')) === 'none');
  ok('the profile modal CTA is hidden too', (await display(page, '#gateOverlay .gate-cta')) === 'none');
  ok('code list loaded (120 hashes)', await page.evaluate(() => (window.MAMSS_CODES || {}).count));

  /* ---------- 2. wrong code ---------- */
  await page.fill('#mpLockName', 'Chidi Okoro');
  await page.fill('#mpLockCode', 'MAMSS-ZZZZZZ-2026');
  await page.click('#mpLockBtn');
  await page.waitForFunction(() => (document.getElementById('mpLockFb') || {}).textContent.length > 5, null, { timeout: 8000 }).catch(() => {});
  let fb = await page.$eval('#mpLockFb', el => el.textContent);
  ok('code not on the list is rejected', /not on this school/i.test(fb), fb);
  ok('lock stays up after a bad code', await page.$eval('#mpLock', el => !el.hidden));
  ok('no account created from a bad code', !(await storeGet(page, 'nssc_user')));

  /* ---------- 3. name required first ---------- */
  await page.evaluate(() => { document.getElementById('mpLockName').value = ''; });
  await page.fill('#mpLockCode', codes[0]);
  await page.click('#mpLockBtn');
  await page.waitForTimeout(300);
  fb = await page.$eval('#mpLockFb', el => el.textContent);
  ok('asks for the name before accepting a code', /name/i.test(fb), fb);

  /* ---------- 4. real code, typed lowercase with spaces (normalisation) ---------- */
  await page.fill('#mpLockName', 'Chidi Okoro');
  await page.fill('#mpLockCode', codes[0].toLowerCase().replace(/-/g, ' '));
  await page.click('#mpLockBtn');
  await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('nssc_act')); } catch (e) { return false; } }, null, { timeout: 10000 });
  fb = await page.$eval('#mpLockFb', el => el.textContent);
  ok('lowercase + spaces normalise to a valid code', /accepted/i.test(fb), fb);
  const act = await storeGet(page, 'nssc_act');
  ok('activation bound to the device (hash + mask only, no plaintext)',
    !!act && /^[0-9a-f]{16}$/.test(act.h) && /···/.test(act.mask) && act.mask.indexOf(codes[0].slice(10, 14)) === -1,
    act && act.mask);
  await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('nssc_user')); } catch (e) { return false; } }, null, { timeout: 10000 }).catch(() => {});
  ok('account created after a valid code', !!(await storeGet(page, 'nssc_user')));
  ok('lock released once activated', !(await page.evaluate(() => document.documentElement.classList.contains('mp-codes-pending'))));
  ok('lock overlay dismissed', await page.$eval('#mpLock', el => el.hidden));

  /* ---------- 5. signed-in visitor is never gated ---------- */
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  ok('returning signed-in student skips the lock entirely',
    !(await page.evaluate(() => document.documentElement.classList.contains('mp-codes-pending'))) &&
    (await page.$eval('#mpLock', el => el.hidden)));

  /* ---------- 6. same device cannot reuse the code ---------- */
  await page.evaluate(() => { localStorage.removeItem('nssc_user'); localStorage.removeItem('nssc_act'); localStorage.removeItem('nssc_profiles'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('#mpLockBtn', { state: 'visible', timeout: 15000 });
  await booted(page);
  ok('device re-locks after sign-out', await page.$eval('#mpLock', el => !el.hidden));
  await page.fill('#mpLockName', 'Chidi Okoro');
  await page.fill('#mpLockCode', codes[0]);
  await page.click('#mpLockBtn');
  await page.waitForFunction(() => /used on this device/i.test((document.getElementById('mpLockFb') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
  fb = await page.$eval('#mpLockFb', el => el.textContent);
  ok('same code cannot be redeemed twice on one device', /used on this device/i.test(fb), fb);
  ok('still locked after a replay attempt', await page.$eval('#mpLock', el => !el.hidden));

  /* ---------- 7. App Centre row on the activated device ---------- */
  /* activated on this device but no profile yet: must NOT be locked out, and
     its own slip must still report as already redeemed */
  await page.evaluate(a => { localStorage.removeItem('nssc_user'); localStorage.setItem('nssc_act', JSON.stringify(a)); }, act);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await booted(page);
  await page.waitForTimeout(800);
  ok('activated device without a profile is not locked out', await page.$eval('#mpLock', el => el.hidden));
  ok("the device's own slip reports as already redeemed",
    (await page.evaluate(c => MAMSS_ACT.redeem(c).then(r => r.r), codes[0])) === 'same');

  await page.evaluate(() => window.openMpHub && window.openMpHub());
  await page.waitForTimeout(1200);
  let hub = await page.evaluate(() => (document.getElementById('mpHubBody') || document.body).innerText);
  ok('App Centre shows School activation', /School activation/i.test(hub));
  ok('App Centre reports the activated slip', /Activated/i.test(hub));
  ok('App Centre is honest about the no-server limit', /cannot police other devices|no server/i.test(hub));

  /* ---------- 8. a second device with its own slip ---------- */
  let ctx2 = await browser.newContext();
  let p2 = await ctx2.newPage();
  const errs2 = []; p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await p2.waitForSelector('#mpLockBtn', { state: 'visible', timeout: 20000 });
  await booted(p2);
  await p2.fill('#mpLockName', 'Amara Bello');
  await p2.fill('#mpLockCode', codes[1]);
  await p2.click('#mpLockBtn');
  await p2.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('nssc_act')); } catch (e) { return false; } }, null, { timeout: 10000 }).catch(() => {});
  ok('second device activates with its own slip', !!(await storeGet(p2, 'nssc_act')), short(codes[1]));

  /* ---------- 9. codes.js unreachable → fail open, never strand a student ---------- */
  let ctx3 = await browser.newContext({ serviceWorkers: 'block' });
  let p3 = await ctx3.newPage();
  const errs3 = []; p3.on('pageerror', e => errs3.push(String(e)));
  await p3.route('**/codes.js', r => r.abort());
  await p3.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await booted(p3);
  await p3.waitForSelector('#mpLock', { timeout: 20000 }).catch(() => {});
  await p3.waitForFunction(() => !document.documentElement.classList.contains('mp-codes-pending'), null, { timeout: 10000 }).catch(() => {});
  ok('missing code list releases the lock (fail-open)',
    !(await p3.evaluate(() => document.documentElement.classList.contains('mp-codes-pending'))));
  ok('guest sign-up works with no code list', (await display(p3, '#acctSignedOut button[onclick^="signUpGuest"]')) !== 'none');
  ok('lock overlay is gone when there is nothing to check', await p3.$eval('#mpLock', el => el.hidden).catch(() => true));
  await p3.evaluate(() => { const o = document.getElementById('accountOverlay'); o && o.classList.remove('hidden'); });
  await p3.waitForSelector('#guestName', { state: 'visible', timeout: 8000 });
  await p3.fill('#guestName', 'Free Access Student');
  await p3.evaluate(() => window.signUpGuest());
  await p3.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('nssc_user')); } catch (e) { return false; } }, null, { timeout: 8000 }).catch(() => {});
  ok('account created without a code when the list is gone', !!(await storeGet(p3, 'nssc_user')));
  await p3.evaluate(() => window.openMpHub && window.openMpHub());
  await p3.waitForTimeout(1000);
  hub = await p3.evaluate(() => (document.getElementById('mpHubBody') || document.body).innerText);
  ok('App Centre says "Open access" in that case', /Open access/i.test(hub));

  /* ---------- 10. console hygiene ---------- */
  const allErrs = errs1.concat(errs2, errs3).filter(e => !/gsi|accounts\.google|ssl\.gstatic/i.test(e));
  ok('no page errors across all four devices', allErrs.length === 0, allErrs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\n  ' + pass + ' passed · ' + fail + ' failed');
  console.log(fail ? '  ROLL CALL TESTS FAILED' : '  ALL ROLL CALL TESTS PASSED');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('harness error:', e); process.exit(3); });
