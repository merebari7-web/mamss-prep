/* synctest.js — v56 "Cloud Sync" end-to-end suite.
 *
 * Topology: real site from :8100 (docs), MAMSS_SYNC pointed at syncmock :8128
 * via __SYNC_URL. Google Identity Services is stubbed before load, so the
 * site's real sign-in callback fires with a fake credential JWT — the whole
 * chain (app callback → gcred capture → MAMSS_SYNC.onCred → Supabase token
 * exchange → merge → push) runs for real.
 *
 * Usage: node synctest.js [BASE]        (default http://localhost:8100/)
 *        also exercises :8101 (ledger-stripped) for the degraded card.
 */
"use strict";
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require(require("path").join(__dirname, "..", "..", "testrig", "node_modules", "playwright"))); }
const { spawn } = require("child_process");

const BASE = (process.argv[2] || "http://localhost:8100/").replace(/\/$/, "") + "/";
const BASE_NOLED = "http://localhost:8101/";
const MOCK = "http://127.0.0.1:8128";

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name + (extra !== undefined ? "  [" + JSON.stringify(extra).slice(0, 300) + "]" : "")); }
}

function b64u(o) {
  return Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fakeJwt(sub, email) {
  return b64u({ alg: "RS256", typ: "JWT" }) + "." +
    b64u({ sub, email: email || (sub + "@example.com"), name: "Test Student", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".fakesig";
}
async function ctl(path, body) {
  const r = await fetch(MOCK + path, body === undefined
    ? { method: "GET" }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { return t; }
}
const row = async () => ((await ctl("/mock/dbg")).rows || {})["u-TESTSUB"] || null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GIS_STUB = `
window.__GSTUB = { accounts: { id: {
  initialize: function (c) { window.__GIS = c; },
  renderButton: function () {},
  prompt: function (cb) { window.__promptCalled = true; if (window.__PROMPT_FAIL && cb) cb({ isNotDisplayed: function () { return true; } }); },
  disableAutoSelect: function () {}
} } };
window.google = window.__GSTUB;`;

function seedScript(opts) {
  return `
${GIS_STUB}
window.__SYNC_URL = '${MOCK}';
window.__SYNC_TICK = ${opts.tick || 1200};
window.__SYNC_GCRED_MS = ${opts.gcredMs || 3600000};
${opts.promptFail ? "window.__PROMPT_FAIL = 1;" : ""}
localStorage.setItem('nssc_mp_seen', '57');
localStorage.setItem('nssc_devid', JSON.stringify('synctest-device'));
localStorage.setItem('nssc_act', JSON.stringify(JSON.stringify({ h: 'synctesthash00000', mask: 'MAMSS··TEST··', at: Date.now(), batch: 'SS1-3-topup', role: 'student', name: 'Sync Tester' })));
localStorage.setItem('nssc_theme', JSON.stringify('dark'));
${opts.staleGcred ? `localStorage.setItem('nssc_gcred', JSON.stringify({ jwt: '${fakeJwt("TESTSUB", "tester@example.com")}', at: Date.now() - 99 * 3600000 }));` : ""}
`;
}

async function openPage(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 900 }, serviceWorkers: "block" });
  await ctx.route("**/accounts.google.com/**", (r) => r.abort());   // keep the stub in charge
  await ctx.addInitScript(seedScript(opts));
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.__errs = errs;
  await p.goto(opts.base || BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.MAMSS_ACT, null, { timeout: 40000 });
  await p.evaluate(() => MAMSS_ACT.unlock && MAMSS_ACT.unlock());
  await p.waitForFunction(() => !!window.MAMSS_SYNC, null, { timeout: 30000 });
  return p;
}
const lsGet = (p, k) => p.evaluate((key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }, k);
const lsSet = (p, k, v) => p.evaluate(([key, val]) => localStorage.setItem(key, JSON.stringify(val)), [k, v]);
const cloudKeys = async () => { const r = await row(); return (r && r.blob && r.blob.keys) || {}; };

async function signIn(p, sub, email) {
  await p.evaluate(() => {
    window.google = window.__GSTUB;                                  // re-assert the stub
    if (!window.__GIS && typeof renderGoogleBtn === "function") { try { renderGoogleBtn(); } catch (e) {} }
    if (!window.__GIS && typeof openAccount === "function") { try { openAccount(); } catch (e) {} }
  });
  await p.waitForFunction(() => !!window.__GIS && !!window.__GIS.callback, null, { timeout: 8000 });
  const jwt = fakeJwt(sub || "TESTSUB", email || "tester@example.com");
  await p.evaluate((t) => window.__GIS.callback({ credential: t }), jwt);
  await p.waitForFunction(() => {
    try { const s = JSON.parse(localStorage.getItem("nssc_sync_sess") || "null"); return !!(s && s.uid); } catch (e) { return false; }
  }, null, { timeout: 15000 });
}

(async () => {
  // ── spin up the mini-Supabase ─────────────────────────────────────────
  const mock = spawn("node", ["syncmock.js", "8128"], { cwd: __dirname, stdio: ["ignore", "pipe", "inherit"] });
  for (let i = 0; i < 40; i++) { try { await ctl("/mock/dbg"); break; } catch (e) { await sleep(120); } }
  await ctl("/mock/reset", {});
  const browser = await chromium.launch();
  const ALL_ERRS = [];

  try {
    /* ════ Phase A — surface, allowlist, signed-out state ════ */
    console.log("── A: surface & allowlist");
    const p = await openPage(browser);
    ALL_ERRS.push(...p.__errs);
    ok("MAMSS_SYNC boots in background (v56)", await p.evaluate(() => window.MAMSS_SYNC && MAMSS_SYNC.version === "56"));
    ok("allowlist refuses the activation + identity keys", await p.evaluate(() => {
      const t = MAMSS_SYNC._test;
      return !t.allowed("nssc_act") && !t.allowed("nssc_act_used") && !t.allowed("nssc_devid") &&
        !t.allowed("nssc_user") && !t.allowed("nssc_gcred") && !t.allowed("nssc_theme") &&
        !t.allowed("nssc_sync_sess") && !t.allowed("nssc_mp_seen") && !t.allowed("nssc_cbt_draft");
    }));
    ok("allowlist admits the progress families", await p.evaluate(() => {
      const t = MAMSS_SYNC._test;
      return t.allowed("nssc_xp_guest") && t.allowed("nssc_attempts_guest") && t.allowed("nssc_journal") &&
        t.allowed("study_grade") && t.allowed("nssc_goal_g_1") && t.allowed("nssc_marks");
    }));
    ok("localKeys() never picks up the seeded nssc_act/nssc_theme", await p.evaluate(() => {
      const k = MAMSS_SYNC._test.localKeys();
      return !("nssc_act" in k) && !("nssc_theme" in k) && !("nssc_devid" in k);
    }));
    await p.click('.study-sidebar .study-nav a[data-view="sync"]');
    await p.waitForSelector("#viewSync:not([hidden]) #synConnect", { timeout: 15000 });
    ok("Cloud Sync tab opens with the signed-out card", true);
    const outTxt = await p.locator("#viewSync").innerText();
    ok("signed-out copy promises device-local by default", /lives on this device/i.test(outTxt));
    ok("privacy card names the activation as never-synced", /activation/i.test(outTxt) && /never leaves/i.test(outTxt));
    ok("syncNow without a session is a quiet no-op", await p.evaluate(async () => (await MAMSS_SYNC.syncNow()) === false));

    /* ════ Phase B — first sign-in: lossless two-way merge ════ */
    console.log("── B: first sign-in merge");
    await p.evaluate(() => { localStorage.setItem("nssc_sync_meta", JSON.stringify({ auto: false })); });
    const now = Date.now(), old = now - 86400000;
    await lsSet(p, "nssc_xp_guest", 500);
    await lsSet(p, "nssc_journal", [{ d: "5 Sep", tms: 111, pct: 80, l: "local entry", s: "Maths", w: "fractions" }]);
    await lsSet(p, "nssc_mistakes", [{ q: "Local mistake Q1?" }]);
    await lsSet(p, "nssc_marks", { k1: true });
    await lsSet(p, "nssc_badges", { b1: "2026-01-01T00:00:00.000Z" });
    await lsSet(p, "nssc_revtotal", 10);
    await lsSet(p, "nssc_target_exam", { label: "WAEC", d: "2026-12-01" });
    await ctl("/mock/seed", {
      sub: "TESTSUB", email: "tester@example.com", rev: 5,
      blob: { v: 1, keys: {
        nssc_xp_guest: { t: old, d: 300 },
        nssc_coins_guest: { t: old, d: 9 },
        nssc_journal: { t: old, d: [{ d: "1 Sep", tms: 222, pct: 60, l: "cloud entry", s: "English", w: "clauses" }] },
        nssc_badges: { t: old, d: { b2: "2026-02-02T00:00:00.000Z" } },
        nssc_marks: { t: old, d: { k2: true } },
        nssc_target_exam: { t: old, d: { label: "NECO", d: "2026-10-01" } }
      } }
    });
    await signIn(p);
    for (let i = 0; i < 40; i++) { const r0 = await row(); if (r0 && r0.rev > 5) break; await sleep(250); }
    let ck = await cloudKeys();
    ok("session adopted from the app's own Google callback", await p.evaluate(() => {
      const s = MAMSS_SYNC._test.sess();
      return !!s && s.uid === "u-TESTSUB" && s.email === "tester@example.com";
    }));
    ok("counter merge = max (xp 500 beats 300)", ck.nssc_xp_guest && ck.nssc_xp_guest.d === 500, ck.nssc_xp_guest);
    ok("cloud-only counter survives (coins 9)", ck.nssc_coins_guest && ck.nssc_coins_guest.d === 9, ck.nssc_coins_guest);
    ok("journal unions BOTH entries (lossless migration)", ck.nssc_journal && ck.nssc_journal.d.length === 2, ck.nssc_journal && ck.nssc_journal.d);
    ok("badges union (b1 + b2)", ck.nssc_badges && ck.nssc_badges.d.b1 && ck.nssc_badges.d.b2);
    ok("bookmark maps union (k1 + k2)", ck.nssc_marks && ck.nssc_marks.d.k1 && ck.nssc_marks.d.k2);
    ok("newer-wins setting keeps the local exam (WAEC)", ck.nssc_target_exam && ck.nssc_target_exam.d.label === "WAEC", ck.nssc_target_exam);
    ok("local mistakes reached the cloud", ck.nssc_mistakes && ck.nssc_mistakes.d.length === 1);
    let lk = await lsGet(p, "nssc_journal");
    ok("cloud journal entry merged DOWN into this device", Array.isArray(lk) && lk.length === 2 && lk.some((e) => e.l === "cloud entry"), lk);
    ok("cloud badge merged down (b2 present locally)", (await lsGet(p, "nssc_badges")).b2 !== undefined);
    const blobStr = JSON.stringify(await row());
    ok("blob contains NO forbidden key", !/"nssc_(act|act_used|devid|user|gcred|theme|mp_seen|ledger_cfg|cbt_draft)"/.test(blobStr));
    ok("activation gate untouched: nssc_act still local, app still unlocked", await p.evaluate(() => {
      try { return !!JSON.parse(localStorage.getItem("nssc_act")) && !!window.MAMSS_ACT; } catch (e) { return false; }
    }));
    const connTxt = await p.locator("#viewSync").innerText().catch(() => "");
    ok("UI flips to Connected with the account email", /Connected/i.test(connTxt) && /tester@example\.com/.test(connTxt), connTxt.slice(0, 120));

    /* ════ Phase C — idempotency + counter push ════ */
    console.log("── C: idempotency");
    const r1 = await row();
    await p.evaluate(async () => { await MAMSS_SYNC.syncNow(); await MAMSS_SYNC.syncNow(); });
    ck = await cloudKeys();
    ok("re-syncing twice changes nothing (idempotent journal)", ck.nssc_journal.d.length === 2);
    ok("rev advanced on pushes", (await row()).rev > r1.rev, { before: r1.rev, after: (await row()).rev });
    await lsSet(p, "nssc_xp_guest", 700);
    await p.evaluate(async () => { await MAMSS_SYNC.syncNow(); });
    ok("local counter rise pushes (xp → 700)", (await cloudKeys()).nssc_xp_guest.d === 700);

    /* ════ Phase D — lost-update protection (0-row PATCH → re-merge → retry) ════ */
    console.log("── D: conflict retry");
    await lsSet(p, "nssc_marks", { k1: true, k2: true, k3: true });
    await p.evaluate(async (m) => {
      const of = window.fetch;
      window.__patchHit = false;
      window.fetch = async function (u, o) {
        try {
          if (!window.__patchHit && String(u).indexOf("user_sync") >= 0 && o && o.method === "PATCH") {
            window.__patchHit = true;
            await of(m + "/mock/bump", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sub: "TESTSUB", keys: {
                nssc_coins_guest: { t: Date.now(), d: 77 },
                nssc_target_exam: { t: Date.now() + 60000, d: { label: "JAMB", d: "2027-01-01" } } } }) });
          }
        } catch (e) {}
        return of.apply(this, arguments);
      };
    }, MOCK);
    const synced = await p.evaluate(async () => await MAMSS_SYNC.syncNow());
    ck = await cloudKeys();
    ok("conflicting sync still succeeds via re-merge retry", synced === true);
    ok("racing device's data survived (coins 77 in cloud)", ck.nssc_coins_guest.d === 77, ck.nssc_coins_guest);
    ok("our concurrent change survived too (k3 in cloud)", ck.nssc_marks.d.k3 === true, ck.nssc_marks.d);
    ok("newer-wins respected the racer's future stamp (JAMB)", ck.nssc_target_exam.d.label === "JAMB", ck.nssc_target_exam.d);
    await p.evaluate(() => { window.fetch = window.fetch; });  // (wrapper stays but is single-shot)

    /* ════ Phase E — offline queue ════ */
    console.log("── E: offline");
    await ctl("/mock/offline", { on: true });
    await lsSet(p, "nssc_mistakes", [{ q: "Local mistake Q1?" }, { q: "Offline mistake Q2?" }]);
    const offRes = await p.evaluate(async () => await MAMSS_SYNC.syncNow());
    const meta1 = await lsGet(p, "nssc_sync_meta");
    ok("offline sync fails honestly (returns false)", offRes === false);
    ok("offline state marked pending with a reassuring note", meta1 && meta1.pending === true && /Offline/i.test(meta1.off || ""), meta1);
    await ctl("/mock/offline", { on: false });
    const onRes = await p.evaluate(async () => await MAMSS_SYNC.syncNow());
    ck = await cloudKeys();
    ok("recovered: queued change arrives (Q2 in cloud)", onRes === true && ck.nssc_mistakes.d.length === 2, ck.nssc_mistakes);

    /* ════ Phase F — token refresh ════ */
    console.log("── F: refresh");
    await p.evaluate(() => {
      const s = MAMSS_SYNC._test.sess();
      s.exp = Date.now() - 1000;                       // force expiry
      localStorage.setItem("nssc_sync_sess", JSON.stringify(s));
    });
    const rc0 = (await ctl("/mock/dbg")).refreshCalls;
    const refRes = await p.evaluate(async () => await MAMSS_SYNC.syncNow());
    const rc1 = (await ctl("/mock/dbg")).refreshCalls;
    ok("expired access token auto-refreshed and sync continued", refRes === true && rc1 > rc0, { rc0, rc1 });

    /* ════ Phase G — never disturb a running paper (defer queue) ════ */
    console.log("── G: practice-safe deferral");
    await ctl("/mock/bump", { sub: "TESTSUB", keys: { nssc_revtotal: { t: Date.now(), d: 900 } } });
    await p.evaluate(() => { document.body.dataset.view = "practice"; });
    const gRes = await p.evaluate(async () => await MAMSS_SYNC.syncNow());
    ck = await cloudKeys();
    const localRev = await lsGet(p, "nssc_revtotal");
    ok("mid-practice: cloud merged (revtotal 900) …", gRes === true && ck.nssc_revtotal.d === 900, ck.nssc_revtotal);
    ok("… but local storage NOT touched mid-paper", localRev === 10, localRev);
    ok("defer queue holds the merged value", await p.evaluate(() => {
      const q = MAMSS_SYNC._test.deferQueue();
      return !!q && q.nssc_revtotal === 900;
    }));
    await p.evaluate(() => { document.body.dataset.view = "overview"; });
    await p.evaluate(() => MAMSS_SYNC._test.flushDeferred());
    ok("flush applies it on a safe screen (local now 900)", (await lsGet(p, "nssc_revtotal")) === 900);
    await p.evaluate(async () => { await MAMSS_SYNC.syncNow(); });
    ck = await cloudKeys();
    ok("and the next sync does NOT clobber it back to 10", ck.nssc_revtotal.d === 900, ck.nssc_revtotal);

    /* ════ Phase H — automatic background sync ════ */
    console.log("── H: auto tick");
    await p.evaluate(() => { localStorage.setItem("nssc_sync_meta", JSON.stringify({ auto: true, last: Date.now() })); });
    await lsSet(p, "nssc_journal", [
      { d: "5 Sep", tms: 111, pct: 80, l: "local entry", s: "Maths", w: "fractions" },
      { d: "1 Sep", tms: 222, pct: 60, l: "cloud entry", s: "English", w: "clauses" },
      { d: "26 Sep", tms: 333, pct: 91, l: "auto entry", s: "Physics", w: "waves" }
    ]);
    await sleep(3200);                                   // > 2 × __SYNC_TICK (1200 ms)
    ck = await cloudKeys();
    ok("auto-sync pushed without any click", ck.nssc_journal && ck.nssc_journal.d.length === 3 && ck.nssc_journal.d.some((e) => e.l === "auto entry"), ck.nssc_journal && ck.nssc_journal.d.length);

    /* ════ Phase I — explicit cloud wipe ════ */
    console.log("── I: wipe cloud copy");
    await p.evaluate(() => { window.confirm = () => true; });
    await p.click("#synWipe");
    for (let i = 0; i < 40; i++) {
      const r0 = await row();
      if (r0 && Object.keys((r0.blob && r0.blob.keys) || {}).length === 0) break;
      await sleep(250);
    }
    let rr = await row();
    ok("wipe leaves an EMPTY cloud blob", rr && Object.keys(rr.blob.keys).length === 0, rr && rr.blob);
    ok("wipe keeps ALL local data (xp still 700)", (await lsGet(p, "nssc_xp_guest")) === 700);
    await p.evaluate(async () => { await MAMSS_SYNC.syncNow(); });
    ck = await cloudKeys();
    ok("next sync rebuilds the cloud copy from this device", Object.keys(ck).length > 0 && ck.nssc_xp_guest.d === 700);

    /* ════ Phase J — sign-out, app-level detach ════ */
    console.log("── J: sign-out & detach");
    await p.click("#synOut");
    await p.waitForFunction(() => !localStorage.getItem("nssc_sync_sess"), null, { timeout: 8000 });
    ok("sign-out clears the sync session", (await lsGet(p, "nssc_sync_sess")) === null);
    ok("sign-out keeps local progress (xp 700)", (await lsGet(p, "nssc_xp_guest")) === 700);
    ok("mock received the logout call", (await ctl("/mock/dbg")).logoutCalls >= 1);
    await signIn(p);                                     // sign back in
    const lc0 = (await ctl("/mock/dbg")).logoutCalls;
    await p.evaluate(() => { if (typeof signOut === "function") signOut(); });   // the APP's own sign-out
    await sleep(500);
    ok("app sign-out detaches sync too (no ghost session)", (await lsGet(p, "nssc_sync_sess")) === null);
    ok("app sign-out clears the stored Google credential", (await lsGet(p, "nssc_gcred")) === null);
    ALL_ERRS.push(...p.__errs);

    /* ════ Phase K — connect-button paths on a fresh page ════ */
    console.log("── K: connect paths");
    const p2 = await openPage(browser, { promptFail: true, staleGcred: true, tick: 60000 });
    await p2.evaluate(() => { localStorage.setItem("nssc_sync_meta", JSON.stringify({ auto: false })); });
    await p2.click('.study-sidebar .study-nav a[data-view="sync"]');
    await p2.waitForSelector("#synConnect", { timeout: 15000 });
    await p2.evaluate(() => { window.google = window.__GSTUB; });
    await p2.click("#synConnect");
    await sleep(700);
    ok("stale credential → falls back to Google one-tap prompt", await p2.evaluate(() => window.__promptCalled === true));
    ok("stale credential never silently adopts", (await lsGet(p2, "nssc_sync_sess")) === null);
    ok("fallback opened the account overlay (the honest way in)", await p2.evaluate(() => {
      const o = document.getElementById("accountOverlay");
      return !!o && !o.classList.contains("hidden");
    }));
    await p2.evaluate(() => { try { closeOverlay(); } catch (e) {} });
    await p2.evaluate((t) => localStorage.setItem("nssc_gcred", JSON.stringify({ jwt: t, at: Date.now() })), fakeJwt("TESTSUB", "tester@example.com"));
    await p2.click("#synConnect");
    await p2.waitForFunction(() => { try { const s = JSON.parse(localStorage.getItem("nssc_sync_sess") || "null"); return !!(s && s.uid); } catch (e) { return false; } }, null, { timeout: 15000 });
    ok("fresh credential → Connect adopts directly, no prompt needed", true);
    ALL_ERRS.push(...p2.__errs);

    /* ════ Phase L — merge-engine unit checks (in page) ════ */
    console.log("── L: merge unit checks");
    const unit = await p2.evaluate(() => {
      const t = MAMSS_SYNC._test;
      return {
        max: t.mergeVal(3, 5) === 5 && t.mergeVal({ a: 2 }, { a: 9, b: 1 }).a === 9,
        boolOr: t.mergeVal(true, false) === true && t.mergeVal(false, false) === false,
        nullYields: JSON.stringify(t.mergeVal(null, { x: 1 })) === '{"x":1}' && JSON.stringify(t.mergeVal({ x: 1 }, null)) === '{"x":1}',
        scalarTie: t.mergeVal("a", "b") === "a",
        arrUnion: t.unionArr([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]).length === 3,
        newerWinsRemote: (function () {
          const m = t.mergeKeys(
            { nssc_target_exam: { t: 100, d: { label: "OLD" } } },
            { nssc_target_exam: { t: 200, d: { label: "NEW" } } });
          return m.nssc_target_exam.d.label === "NEW";
        })(),
        fpStable: t.fp({ a: [1, 2] }) === t.fp({ a: [1, 2] }) && t.fp({ a: 1 }) !== t.fp({ a: 2 })
      };
    });
    ok("mergeVal: numbers max, objects recurse", unit.max);
    ok("mergeVal: booleans OR (bookmarks survive ties)", unit.boolOr);
    ok("mergeVal: null yields to real data", unit.nullYields);
    ok("mergeVal: scalar ties keep this device's value", unit.scalarTie);
    ok("unionArr: dedupes by identity", unit.arrUnion);
    ok("mergeKeys: newer-wins family obeys timestamps", unit.newerWinsRemote);
    ok("fingerprints are stable and discriminating", unit.fpStable);

    /* ════ Phase M — degraded copy (no ledger config) ════ */
    console.log("── M: degraded (ledger-stripped copy)");
    let noledOk = false, noledNote = "", noledErrs = [];
    try {
      const p3 = await openPage(browser, { base: BASE_NOLED, tick: 60000 });
      noledErrs = p3.__errs;
      await p3.click('.study-sidebar .study-nav a[data-view="sync"]');
      await p3.waitForFunction(() => document.getElementById("syncRoot") && document.getElementById("syncRoot").innerHTML.length > 40, null, { timeout: 15000 });
      noledNote = await p3.locator("#viewSync").innerText();
      noledOk = /not configured/i.test(noledNote) && !(await lsGet(p3, "nssc_sync_sess"));
      ok("degraded copy shows the honest 'not configured' card", /not configured/i.test(noledNote), noledNote.slice(0, 140));
      ok("degraded copy syncs nothing", (await p3.evaluate(async () => await MAMSS_SYNC.syncNow())) === false);
      ALL_ERRS.push(...noledErrs);
    } catch (e) {
      ok("degraded copy reachable at :8101", false, String(e).slice(0, 160));
    }

    ok("zero page errors across every phase", ALL_ERRS.length === 0, ALL_ERRS.slice(0, 3));
  } finally {
    await browser.close();
    try { mock.kill("SIGKILL"); } catch (e) {}
  }

  console.log("\nsynctest: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("FATAL", e); process.exit(1); });
