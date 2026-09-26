/* MAMSS PREP v62 "The Open Book" — class progress reporter.
   Every ACTIVATED device (student or teacher) publishes a small progress
   REPORT — totals, per-subject accuracy, streaks, the last 15 sessions — to
   the school's Supabase `class_progress` table so the teacher dashboard can
   show it. This is the school-facing channel the school asked for in v62.

   What this module is NOT:
     • NOT answer-level detail: individual questions, wrong options and the
       private Cloud Sync blob (Google-gated, owner-only) never leave device.
     • NOT a gate path: without a valid activation slip nothing is read,
       nothing is sent — the reporter simply never starts (fail-closed).
     • NOT required for the app to work: if the table is missing (setup not
       pasted yet) or the network is down, practice continues untouched and
       the reporter retries quietly.

   Identity: rows are keyed by an unguessable owner token =
   SHA-256(SALT + slip-hash + device-id). The token is the write key; the
   school dashboard reads the whole (single-school) table by design. */
(() => {
  "use strict";

  var SALT = "mamss-prg-v62";
  var FPKEY = "nssc_prg_fp";      /* device-local fingerprint of last push */
  var EVERY = 30000;              /* re-check cadence while app is open   */
  var st = { state: "wait", last: 0, err: "", owner: "", timer: null, on: false };

  function ls(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function uid() { var u = ls("nssc_user", null); return u && u.id ? u.id : "guest"; }
  /* Test-hygiene: automation browsers (Playwright, Selenium…) never file
     reports unless a suite explicitly opts in — keeps seeded test devices
     out of the school's real table. Real phones report as always. */
  function automated() {
    try {
      return !!navigator.webdriver && !window.__MP_TEST_REPORT_OK__;
    } catch (e) { return false; }
  }
  function act() {
    if (automated()) return null;
    try {
      if (!window.MAMSS_ACT || !MAMSS_ACT.activated || !MAMSS_ACT.activated()) return null;
      return MAMSS_ACT.info() || null;
    } catch (e) { return null; }
  }
  function cfg() {
    try {
      var c = (window.MAMSS_ACT && MAMSS_ACT.ledger && MAMSS_ACT.ledger()) ||
              (window.MAMSS_CODES && window.MAMSS_CODES.ledger) || null;
      return c && c.url && c.key ? c : null;
    } catch (e) { return null; }
  }
  function attempts() {
    var t = ls("nssc_attempts_" + uid(), []);
    return Array.isArray(t) ? t.filter(function (x) { return x && typeof x === "object"; }) : [];
  }
  function dailyRecs() { var r = ls("nssc_daily_" + uid(), {}); return r && typeof r === "object" ? r : {}; }

  /* consecutive-day streak ending today (or yesterday, so an unbroken run
     survives until the student practises again) */
  function streak() {
    var rec = dailyRecs(), day = 86400000;
    var d = new Date(); d.setHours(0, 0, 0, 0);
    function key(t) {
      return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    }
    if (!rec[key(d)]) { d = new Date(d.getTime() - day); }
    var n = 0;
    while (rec[key(new Date(d.getTime() - n * day))]) n++;
    return n;
  }

  function report() {
    var at = attempts(), subs = {}, i, a;
    for (i = 0; i < at.length; i++) {
      a = at[i];
      if (!a.subj || !(a.total > 0)) continue;
      var s = subs[a.subj] || (subs[a.subj] = { ask: 0, cor: 0, last: 0 });
      s.ask += +a.total || 0; s.cor += +a.correct || 0;
      if ((+a.tms || 0) > s.last) s.last = +a.tms || 0;
    }
    var badges = ls("nssc_badges", {});
    var g = ls("study_grade", 0);
    var lab = ls("nssc_lab_" + uid(), {});
    return {
      v: 2, app: 62,
      xp: +ls("nssc_xp_" + uid(), 0) || 0,
      coins: +ls("nssc_coins_" + uid(), 0) || 0,
      badges: badges && typeof badges === "object" ? Object.keys(badges).length : 0,
      streak: streak(),
      sessions: at.length,
      daily_days: Object.keys(dailyRecs()).length,
      mistakes: (ls("nssc_mistakes", []) || []).length,
      journal: (ls("nssc_journal", []) || []).length,
      revtotal: +ls("nssc_revtotal", 0) || 0,
      lab: lab && typeof lab === "object" ? Object.keys(lab).length : 0,
      goal: ls("nssc_goal_" + uid(), null),
      cls: "SS" + ((+g || 0) + 1),
      subjects: subs,
      recent: at.slice(0, 15).map(function (x) {
        return {
          t: +x.tms || 0, cls: x.cls || "", subj: x.subj || "",
          pct: x.pct == null ? null : Math.round(+x.pct),
          tot: +x.total || 0, cor: +x.correct || 0,
          mode: x.mode || "", daily: !!x.daily, rev: !!x.rev, mock: !!x.mock
        };
      }),
      updated: Date.now()
    };
  }

  function fpOf(r) {
    /* cheap stable fingerprint: everything except the push timestamp */
    var c = { v: r.v, xp: r.xp, coins: r.coins, badges: r.badges, streak: r.streak, sessions: r.sessions, mistakes: r.mistakes, journal: r.journal, revtotal: r.revtotal, lab: r.lab, daily_days: r.daily_days };
    var s = JSON.stringify(c) + "|" + (r.recent[0] ? r.recent[0].t + ":" + r.recent[0].pct : "0");
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  function sha256(text) {
    var crypto = window.crypto || null;
    if (!crypto || !crypto.subtle) return Promise.resolve(null);
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      var b = new Uint8Array(buf), out = "";
      for (var i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, "0");
      return out;
    });
  }

  function ownerToken(a) {
    var did = "";
    try { did = (MAMSS_ACT.device && MAMSS_ACT.device()) || ls("nssc_devid", "") || ""; } catch (e) {}
    return sha256(SALT + "|" + (a && a.h ? a.h : "") + "|" + did);
  }

  function push(force) {
    var a = act();
    if (!a) { st.state = "off"; return Promise.resolve(false); }
    var c = cfg();
    if (!c) { st.state = "off"; return Promise.resolve(false); }
    var r = report(), f = fpOf(r);
    if (!force && f === ls(FPKEY, "")) return Promise.resolve(false);
    return ownerToken(a).then(function (own) {
      if (!own) { st.state = "off"; return false; }
      st.owner = own;
      var teacher = false;
      try { teacher = !!(MAMSS_ACT.teacher && MAMSS_ACT.teacher()); } catch (e) {}
      var row = {
        owner: own,
        student: String(a.name || "Student"),
        cls: r.cls,
        slip: String(a.mask || ""),
        role: teacher ? "teacher" : "student",
        blob: r
      };
      return fetch(c.url + "/rest/v1/class_progress", {
        method: "POST",
        headers: {
          "apikey": c.key,
          "Authorization": "Bearer " + c.key,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify([row])
      }).then(function (res) {
        if (res.ok) {
          st.state = "live"; st.last = Date.now(); st.err = "";
          try { localStorage.setItem(FPKEY, JSON.stringify(f)); } catch (e) {}
          return true;
        }
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (res.status === 404 || (j && j.code === "42P01")) { st.state = "setup"; st.err = "table-missing"; }
          else { st.state = "off"; st.err = "http-" + res.status; }
          return false;
        });
      }).catch(function () { st.state = "off"; st.err = "network"; return false; });
    });
  }

  function tick(force) { try { return push(force === true); } catch (e) { return Promise.resolve(false); } }

  function start() {
    if (st.on) return;
    st.on = true;
    tick(true);
    st.timer = setInterval(function () { tick(false); }, EVERY);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") tick(false);
    });
    window.addEventListener("online", function () { tick(false); });
  }

  /* wait for the gate module, then start only for activated devices; a locked
     device never polls the network — it just waits, cheaply, forever. */
  var waits = 0;
  (function waitLoop() {
    if (window.MAMSS_ACT) { if (act()) start(); else st.state = "locked"; return; }
    if (++waits > 120) { st.state = "off"; return; }
    setTimeout(waitLoop, 1000);
  })();
  /* if activation happens after boot (redeem flow), upgrade.js calls this */
  window.MAMSS_PROGRESS_WAKE = function () { if (act() && !st.on) start(); else if (!act()) st.state = "locked"; };

  window.MAMSS_PROGRESS = {
    state: function () { return st.state; },
    last: function () { return st.last; },
    owner: function () { return st.owner; },
    report: report,
    push: function () { return tick(true); },
    _test: { SALT: SALT, FPKEY: FPKEY, fpOf: fpOf, streak: streak, attempts: attempts, sha256: sha256, start: start, st: st }
  };
})();
