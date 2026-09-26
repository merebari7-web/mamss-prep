/* MAMSS PREP v56 "Cloud Sync" — carry your progress between devices.
 *
 * THE MODEL, in plain words:
 *   • You sign in with the SAME Google button the site already has. The raw
 *     Google ID token is exchanged for a Supabase session (no new SDK, no
 *     popup, no password ever seen by this site).
 *   • Your progress (XP, coins, badges, attempts, mistakes, bookmarks,
 *     journal, adaptive stats, goals, lab stats…) is merged into ONE private
 *     row that only your signed-in account can read or write (Postgres RLS:
 *     uid = auth.uid()). The public site key sees nothing here.
 *   • Merging is LOSSLESS by design: collections union (journal entries,
 *     mistakes, attempts all keep every item), counters take the max (XP can
 *     never double-count or go backwards), bookmarks survive ties, and pushes
 *     use optimistic locking (rev) — if two phones sync at once, the loser
 *     re-merges and retries. Nothing is overwritten blindly.
 *   • Guests are untouched: with no sign-in, everything stays on this device
 *     exactly as before, forever. Sync is an addition, never a requirement.
 *
 * WHAT NEVER LEAVES THIS DEVICE (hard allowlist + a never-list that wins):
 *   • nssc_act / nssc_act_used — the ACTIVATION record. Sync grants no access;
 *     without a slip nobody reaches the app at all, on any device.
 *   • nssc_devid, nssc_user, nssc_gcred — device & identity plumbing.
 *   • theme/font/sound/motion/accessibility settings — this device's feel.
 *   • teacher CBT drafts, ledger config, UI one-shot state (nssc_mp_*).
 *
 * HONEST EDGES:
 *   • Deleting data locally (e.g. "Use without an account") does NOT delete
 *     it in the cloud — the next sync would bring it back, so local deletes
 *     simply never propagate. To truly clear the cloud copy, use the explicit
 *     "Delete cloud copy" button (which pushes an empty blob; the row itself
 *     can never be deleted through the API — history survives).
 *   • Cloud data is applied locally between screens, never mid-practice: if
 *     the Practice view is open, the merge waits so a running paper is not
 *     disturbed (pushes still happen — nothing is lost).
 *   • The merge is last-writer-wins for plain scalars with clear timestamps;
 *     everything structured unions. A key capped by the app (journal 100,
 *     recent CBT 12) keeps its cap after merging.
 */
(function () {
  "use strict";
  var VERSION = "56";

  /* ---------- tiny utils (same house style as cbt.js) ---------- */
  function $(id) { return document.getElementById(id); }
  var st = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function say(msg, ico) { try { if (typeof toast === "function") toast(msg, ico || "☁️"); } catch (e) {} }
  function cfg() { try { return (window.MAMSS_CODES && MAMSS_CODES.ledger) || null; } catch (e) { return null; } }
  function baseUrl() { return window.__SYNC_URL || (cfg() && cfg().url) || ""; }
  function siteKey() { return (cfg() && cfg().key) || ""; }

  var SESS = "nssc_sync_sess";   /* {access, refresh, exp, uid, email} — device-local, never synced */
  var BASEK = "nssc_sync_base";  /* {rev, email, keys:{k:{t, fp, d}}} — last synced state; device-local */
  var META = "nssc_sync_meta";   /* {last, pending, auto, off} — device-local UI state */
  var GCRED = "nssc_gcred";      /* {jwt, at} — raw Google credential from sign-in; device-local */
  var DEFERK = "nssc_sync_defer"; /* {k:d,…} merged values waiting for a safe screen; device-local */

  /* ---------- the allowlist: the ONLY keys that may leave this device ---------- */
  var SYNC_STATIC = [
    "study_grade", "nssc_marks", "nssc_mistakes", "nssc_profiles", "nssc_badges",
    "nssc_revtotal", "nssc_journal", "nssc_target_exam", "nssc_notes_done",
    "nssc_results", "nssc_cbt_recent", "nssc_cbt_mine", "nssc_attempts_guest",
    "nssc_guest_id"
  ];
  var SYNC_PREFIX = [
    "nssc_attempts_", "nssc_xp_", "nssc_coins_", "nssc_topics_", "nssc_adaptive_",
    "nssc_daily_", "nssc_qday_", "nssc_items_", "nssc_goal_", "nssc_lab_"
  ];
  /* belt & braces: these are refused even if they ever sneak into a list above.
     NEVER_EXACT matches whole keys; NEVER_PREFIX matches key families.
     ("nssc_act" is EXACT so it can never shadow "nssc_attempts_*".) */
  var NEVER_EXACT = [
    "nssc_act", "nssc_act_used", "nssc_devid", "nssc_user", "nssc_gcred",
    "nssc_ledger_cfg", "nssc_session", "nssc_saver", "nssc_lastbackup",
    "nssc_cbt_draft", "nssc_theme", "nssc_font", "nssc_snd", "nssc_rmotion",
    "nssc_type", "nssc_acc"
  ];
  var NEVER_PREFIX = ["nssc_sync_", "nssc_mp_", "nssc_session_"];

  function allowed(k) {
    if (!k) return false;
    var i;
    if (NEVER_EXACT.indexOf(k) >= 0) return false;
    for (i = 0; i < NEVER_PREFIX.length; i++) if (k.indexOf(NEVER_PREFIX[i]) === 0) return false;
    if (SYNC_STATIC.indexOf(k) >= 0) return true;
    for (i = 0; i < SYNC_PREFIX.length; i++) if (k.indexOf(SYNC_PREFIX[i]) === 0) return true;
    return false;
  }

  /* ---------- fingerprints (cheap change detection) ---------- */
  function fp(v) {
    var s;
    try { s = JSON.stringify(v); } catch (e) { return "e"; }
    if (s == null) return "n";
    var h = 5381, i;
    for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return s.length + ":" + h.toString(36);
  }

  /* ---------- local snapshot ---------- */
  function localKeys() {
    var out = {}, i, k, v;
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i);
      if (k && allowed(k)) {
        v = st.get(k, undefined);
        if (v !== undefined) out[k] = v;
      }
    }
    return out;
  }
  /* Build {k:{t,d}} from live storage + last-synced base. Keys unchanged since
     base inherit their old timestamp; changed keys get t=now. Keys that were
     synced before but are gone locally (e.g. after "use without an account")
     are carried along — local deletes never become cloud tombstones. */
  function buildLocal(baseObj) {
    var live = localKeys();
    var bkeys = (baseObj && baseObj.keys) || {};
    var out = {}, k, now = Date.now();
    for (k in live) {
      if (!live.hasOwnProperty(k)) continue;
      var f = fp(live[k]), prev = bkeys[k];
      out[k] = { t: (prev && prev.fp === f) ? (+prev.t || now) : now, d: live[k] };
    }
    for (k in bkeys) {
      if (bkeys.hasOwnProperty(k) && !(k in out) && bkeys[k] && bkeys[k].d !== undefined)
        out[k] = { t: +bkeys[k].t || 0, d: bkeys[k].d };
    }
    return out;
  }

  /* ---------- the merge engine (lossless, idempotent) ---------- */
  function entKey(e) {
    if (e && typeof e === "object") {
      if (e.id != null) return "i:" + e.id;
      if (e.tms != null) return "t:" + e.tms;
      if (e.code != null) return "c:" + e.code + ":" + (e.at || e.created || "");
      if (e.q != null) return "q:" + String(e.q).slice(0, 120);
      return "j:" + fp(e);
    }
    return "p:" + String(e);
  }
  function unionArr(a, b) {
    var seen = {}, out = [], i, k;
    for (i = 0; i < a.length; i++) { k = entKey(a[i]); if (!(k in seen)) { seen[k] = 1; out.push(a[i]); } }
    for (i = 0; i < b.length; i++) { k = entKey(b[i]); if (!(k in seen)) { seen[k] = 1; out.push(b[i]); } }
    return out;
  }
  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  /* a = this device's side, b = the other side. Nothing is ever dropped:
     numbers max, booleans OR (bookmarks survive), arrays union by identity,
     objects union recursively, scalar ties keep what this device shows. */
  function mergeVal(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (a === null) return b;
    if (b === null) return a;
    if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
    if (typeof a === "boolean" || typeof b === "boolean") return !!(a || b);
    if (Array.isArray(a) && Array.isArray(b)) return unionArr(a, b);
    if (isObj(a) && isObj(b)) {
      var o = {}, k;
      for (k in a) if (a.hasOwnProperty(k)) o[k] = a[k];
      for (k in b) if (b.hasOwnProperty(k)) o[k] = (k in a) ? mergeVal(a[k], b[k]) : b[k];
      return o;
    }
    return a;
  }
  /* Key families where the newest write simply wins (single-value settings). */
  var NEWER_PREFIX = ["nssc_goal_", "nssc_target_exam"];
  function newerWins(k) {
    for (var i = 0; i < NEWER_PREFIX.length; i++) if (k.indexOf(NEWER_PREFIX[i]) === 0) return true;
    return false;
  }
  function mergeKeys(L, R) {
    var out = {}, k;
    for (k in R) if (R.hasOwnProperty(k)) out[k] = R[k];
    for (k in L) {
      if (!L.hasOwnProperty(k)) continue;
      if (!(k in out)) { out[k] = L[k]; continue; }
      var l = L[k] || {}, r = out[k] || {};
      var lt = +l.t || 0, rt = +r.t || 0;
      if (newerWins(k)) { out[k] = (rt > lt) ? r : l; continue; }
      var ld = l.d, rd = r.d;
      var bothScalar = (ld === null || typeof ld !== "object") && (rd === null || typeof rd !== "object");
      if (bothScalar && lt !== rt) { out[k] = (rt > lt) ? r : l; continue; }
      out[k] = { t: Math.max(lt, rt), d: mergeVal(ld, rd) };
    }
    return out;
  }

  /* ---------- HTTP (raw REST — no SDK anywhere on this site) ---------- */
  function api(path, opt) {
    opt = opt || {};
    var s = st.get(SESS, null);
    var h = { "apikey": siteKey(), "Content-Type": "application/json" };
    if (s && s.access && !opt.noAuth) h["Authorization"] = "Bearer " + s.access;
    if (opt.prefer) h["Prefer"] = opt.prefer;
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 15000) : null;
    return fetch(baseUrl() + path, {
      method: opt.method || "GET",
      headers: h,
      body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (to) clearTimeout(to);
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) {}
        return { status: r.status, ok: r.ok, body: j, raw: t };
      });
    }).catch(function (e) { if (to) clearTimeout(to); throw e; });
  }

  /* ---------- auth: Google ID token → Supabase session ---------- */
  function saveSess(d) {
    var u = d.user || {};
    var s = {
      access: d.access_token || "",
      refresh: d.refresh_token || "",
      exp: Date.now() + (((+d.expires_in) || 3600) * 1000),
      uid: u.id || "",
      email: u.email || ""
    };
    st.set(SESS, s);
    return s;
  }
  function adopt(jwt) {
    if (!baseUrl() || !siteKey() || !jwt) return Promise.resolve(false);
    st.set(GCRED, { jwt: jwt, at: Date.now() });
    return api("/auth/v1/token?grant_type=id_token", {
      method: "POST", noAuth: true, body: { provider: "google", id_token: jwt }
    }).then(function (r) {
      if (!r.ok || !r.body || !r.body.access_token)
        throw new Error((r.body && (r.body.error_description || r.body.msg || r.body.error)) || ("Google sign-in exchange failed (" + r.status + ")"));
      saveSess(r.body);
      var m = st.get(META, {}) || {}; m.off = ""; m.auto = m.auto !== false; st.set(META, m);
      return syncNow(false).then(function () { render(); return true; });
    }).catch(function (e) {
      var m = st.get(META, {}) || {}; m.off = (e && e.message) || "Sign-in failed"; st.set(META, m);
      render();
      return false;
    });
  }
  function ensure() {
    var s = st.get(SESS, null);
    if (!s || !s.access) return Promise.resolve(false);
    if (Date.now() < (+s.exp || 0) - 120000) return Promise.resolve(true);
    return api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", noAuth: true, body: { refresh_token: s.refresh }
    }).then(function (r) {
      if (!r.ok || !r.body || !r.body.access_token) throw new Error("refresh failed");
      saveSess(r.body);
      return true;
    }).catch(function () { signOut(true); return false; });
  }
  function signOut(silent) {
    var s = st.get(SESS, null);
    if (s && s.access) { try { api("/auth/v1/logout", { method: "POST" }).catch(function () {}); } catch (e) {} }
    st.del(SESS);
    st.del(BASEK);
    var m = st.get(META, {}) || {};
    m.pending = false;
    m.off = silent ? "Session ended — connect again to sync." : "";
    st.set(META, m);
    render();
    if (!silent) say("Signed out of sync — your progress stays on this device.", "👋");
  }

  /* ---------- the sync itself ---------- */
  var busy = false, deferred = false;
  function sizeOk(blob) {
    try { return JSON.stringify(blob).length <= 2800000; } catch (e) { return false; }
  }
  function pull() {
    var s = st.get(SESS, null);
    if (!s) return Promise.resolve(null);
    return api("/rest/v1/user_sync?uid=eq." + encodeURIComponent(s.uid) + "&select=uid,email,blob,rev,updated_at")
      .then(function (r) {
        if (!r.ok) throw new Error("pull failed (" + r.status + ")");
        return (r.body && r.body[0]) || null;
      });
  }
  function push(blob, remote, remoteRev, tries) {
    tries = tries || 0;
    var s = st.get(SESS, null);
    if (!remote) {
      return api("/rest/v1/user_sync", {
        method: "POST", prefer: "return=representation",
        body: { uid: s.uid, email: s.email || "", blob: blob, rev: 1 }
      }).then(function (r) {
        if (r.status === 201 && r.body && r.body[0]) return r.body[0];
        if (r.status === 409 || (r.body && r.body.code === "23505"))
          return pull().then(function (row) { return push(blob, row, row ? (+row.rev || 0) : 0, tries); });
        throw new Error("push failed (" + r.status + ") " + ((r.body && (r.body.message || r.body.code)) || ""));
      });
    }
    return api("/rest/v1/user_sync?uid=eq." + encodeURIComponent(s.uid) + "&rev=eq." + remoteRev, {
      method: "PATCH", prefer: "return=representation",
      body: { email: s.email || "", blob: blob, rev: remoteRev + 1 }
    }).then(function (r) {
      if (!r.ok) throw new Error("push failed (" + r.status + ")");
      if (r.body && r.body[0]) return r.body[0];
      /* 0 rows → someone else pushed first: re-pull, re-merge, retry. */
      if (tries >= 3) throw new Error("sync conflict — try again");
      return pull().then(function (row) {
        var b = st.get(BASEK, null);
        var merged = mergeKeys(buildLocal(b), (row && row.blob && row.blob.keys) || {});
        return push({ v: 1, keys: merged }, row, row ? (+row.rev || 0) : 0, tries + 1);
      });
    });
  }
  function applyKeys(merged) {
    var live = localKeys(), k, d;
    for (k in merged) {
      if (!merged.hasOwnProperty(k) || !allowed(k)) continue;
      d = merged[k] && merged[k].d;
      if (d === undefined) continue;
      if (k in live && fp(d) === fp(live[k])) continue;
      st.set(k, d);
    }
    st.del(DEFERK);
    deferred = false;
    try { window.dispatchEvent(new CustomEvent("mamss:synced")); } catch (e) {}
  }
  /* Merged cloud values waiting for a safe moment (never mid-practice). The
     queue is flushed BEFORE the next snapshot, so untouched local values are
     never mistaken for fresh edits and pushed back over the merge. */
  function flushDeferred() {
    var q = st.get(DEFERK, null);
    if (!q) { deferred = false; return; }
    if (inPractice()) return;
    for (var k in q) {
      if (q.hasOwnProperty(k) && allowed(k) && q[k] !== undefined) st.set(k, q[k]);
    }
    st.del(DEFERK);
    deferred = false;
    try { window.dispatchEvent(new CustomEvent("mamss:synced")); } catch (e) {}
  }
  function inPractice() {
    try { return !!(document.body && document.body.dataset && document.body.dataset.view === "practice"); }
    catch (e) { return false; }
  }
  function syncNow(mode) {
    /* mode: true = auto/quiet · false = manual (toasts) · "force" = apply even in practice (tests) */
    if (busy) return Promise.resolve(false);
    var s = st.get(SESS, null);
    if (!s || !baseUrl() || !siteKey()) return Promise.resolve(false);
    busy = true;
    flushDeferred();
    var m0 = st.get(META, {}) || {}; m0.pending = true; st.set(META, m0); render();
    return ensure().then(function (okAuth) {
      if (!okAuth) throw new Error("reconnect");
      return pull();
    }).then(function (remote) {
      var b = st.get(BASEK, null);
      var L = buildLocal(b);
      var remoteRev = remote ? (+remote.rev || 0) : 0;
      var baseRev = b ? (+b.rev || 0) : 0;
      var R = (remote && remote.blob && remote.blob.keys) || {};
      /* If nothing changed remotely since our last sync, our snapshot IS the
         merged state; otherwise deep-merge both sides (lossless). */
      var merged = (remote && remoteRev === baseRev) ? L : mergeKeys(L, R);
      var blob = { v: 1, keys: merged };
      if (!sizeOk(blob)) {
        var mq = st.get(META, {}) || {};
        mq.pending = false; mq.off = "Progress is too large to sync (over 2.8 MB) — everything stays safe on this device.";
        st.set(META, mq); busy = false; render();
        return false;
      }
      return push(blob, remote, remoteRev).then(function (row) {
        if (mode === "force" || !inPractice()) applyKeys(merged);
        else {
          /* mid-paper: cloud is up to date, local apply waits for a safe screen */
          var liveNow = localKeys(), q = {}, kk;
          for (kk in merged) {
            if (!merged.hasOwnProperty(kk)) continue;
            var dv = merged[kk] && merged[kk].d;
            if (dv === undefined) continue;
            if (!(kk in liveNow) || fp(dv) !== fp(liveNow[kk])) q[kk] = dv;
          }
          if (Object.keys(q).length) { st.set(DEFERK, q); deferred = true; }
        }
        var nb = { rev: row ? (+row.rev || remoteRev + 1) : remoteRev + 1, email: s.email, keys: {} }, k;
        for (k in merged)
          if (merged.hasOwnProperty(k)) nb.keys[k] = { t: merged[k].t, fp: fp(merged[k].d), d: merged[k].d };
        st.set(BASEK, nb);
        var m = st.get(META, {}) || {};
        m.last = Date.now(); m.pending = false; m.off = "";
        st.set(META, m);
        busy = false; render();
        if (mode === false) say("Progress synced ☁️", "✅");
        return true;
      });
    }).catch(function (e) {
      busy = false;
      var m = st.get(META, {}) || {};
      m.pending = true;
      m.off = (e && e.message === "reconnect") ? "Connect again to sync."
            : "Offline — your work is safe here and will sync automatically when you are back.";
      st.set(META, m);
      render();
      return false;
    });
  }
  function wipeCloud() {
    var s = st.get(SESS, null);
    if (!s) return Promise.resolve(false);
    return ensure().then(function (ok) { if (!ok) throw new Error("reconnect"); return pull(); })
      .then(function (remote) {
        var empty = { v: 1, keys: {} };
        if (!remote) return push(empty, null, 0);
        return push(empty, remote, +remote.rev || 0);
      }).then(function () {
        st.del(BASEK);
        var m = st.get(META, {}) || {}; m.last = Date.now(); m.pending = false; m.off = ""; st.set(META, m);
        render();
        say("Cloud copy deleted — this device keeps everything it has.", "🧹");
        return true;
      }).catch(function (e) {
        var m = st.get(META, {}) || {}; m.off = (e && e.message === "reconnect") ? "Connect again to sync." : "Could not reach the cloud right now."; st.set(META, m);
        render();
        return false;
      });
  }

  /* ---------- connecting (reuses the site's existing Google button) ---------- */
  function openAccountFallback() {
    try {
      if (typeof openAccount === "function") { openAccount(); return; }
    } catch (e) {}
    var n = $("synHint");
    if (n) n.textContent = "Open your account card (top-right) and use the Google button there — sync connects automatically.";
  }
  function connect() {
    var g = st.get(GCRED, null);
    var fresh = window.__SYNC_GCRED_MS || 45 * 60000;
    if (g && g.jwt && (Date.now() - (+g.at || 0)) < fresh) return adopt(g.jwt);
    try {
      if (window.google && google.accounts && google.accounts.id && google.accounts.id.prompt) {
        google.accounts.id.prompt(function (n) {
          try {
            if (n && typeof n.isNotDisplayed === "function" && n.isNotDisplayed()) { openAccountFallback(); render(); }
          } catch (e) { openAccountFallback(); render(); }
        });
        /* If one-tap succeeds, the site's normal sign-in fires onCred → adopt. */
        return Promise.resolve(true);
      }
    } catch (e) {}
    openAccountFallback();
    return Promise.resolve(false);
  }
  function onCred(jwt) { return adopt(jwt); }

  /* ---------- timers & lifecycle ---------- */
  var booted = false, timer = null;
  /* Has anything on the allowlist changed since the last synced snapshot?
     (Removed keys do NOT count — local deletes never propagate.) */
  function localChanged() {
    var b = st.get(BASEK, null);
    if (!b || !b.keys) return true;
    var live = localKeys(), k;
    for (k in live) {
      if (!live.hasOwnProperty(k)) continue;
      var e = b.keys[k];
      if (!e || e.fp !== fp(live[k])) return true;
    }
    return false;
  }
  function tick() {
    var m = st.get(META, {}) || {};
    var s = st.get(SESS, null);
    if (!s) return;
    if (deferred) { flushDeferred(); return; }
    if (m.auto === false) return;
    if (m.pending || localChanged()) syncNow(true);
  }
  function boot() {
    if (booted) return;
    booted = true;
    var every = window.__SYNC_TICK || 60000;
    timer = setInterval(tick, every);
    window.addEventListener("online", function () { var m = st.get(META, {}) || {}; if (st.get(SESS, null) && m.auto !== false) syncNow(true); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && st.get(SESS, null)) {
        flushDeferred();
        var m = st.get(META, {}) || {};
        if (m.auto !== false && (m.pending || localChanged())) syncNow(true);
      }
    });
    /* already signed into the site with Google? connect sync silently. */
    var g = st.get(GCRED, null);
    var fresh = window.__SYNC_GCRED_MS || 45 * 60000;
    if (!st.get(SESS, null) && g && g.jwt && (Date.now() - (+g.at || 0)) < fresh) adopt(g.jwt);
    else if (st.get(SESS, null)) { var m = st.get(META, {}) || {}; if (m.auto !== false) syncNow(true); }
  }
  function mount() {
    boot();
    render();
  }

  /* ---------- UI ---------- */
  function ago(ts) {
    if (!ts) return "";
    var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function chipState() {
    var m = st.get(META, {}) || {};
    if (busy) return ["wait", "Syncing…"];
    if (m.off) return ["warn", m.off];
    if (m.pending) return ["warn", "Waiting to sync"];
    if (m.last) return ["ok", "Synced " + ago(m.last)];
    return ["idle", "Not synced yet"];
  }
  function injectCss() {
    if ($("synCss")) return;
    var el = document.createElement("style");
    el.id = "synCss";
    el.textContent =
      ".syn-wrap{display:grid;gap:14px;margin:10px 0 26px}" +
      ".syn-card{background:var(--s-card,#fff);border:1px solid var(--s-line,#e5eaf0);border-radius:14px;padding:16px 18px}" +
      ".syn-card h3{margin:0 0 6px;font-size:17px}" +
      ".syn-card p{margin:6px 0;color:var(--s-muted,#5c6b7a);font-size:14px;line-height:1.55}" +
      ".syn-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}" +
      ".syn-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--s-line,#e5eaf0);border-radius:999px;padding:4px 12px;font-size:13px;color:var(--s-muted,#5c6b7a);background:var(--s-soft,#f6f8fa)}" +
      ".syn-dot{width:9px;height:9px;border-radius:50%;background:#b9c4cf;display:inline-block;flex:none}" +
      ".syn-dot.ok{background:#22c55e}.syn-dot.warn{background:#f59e0b}.syn-dot.wait{background:#3b82f6;animation:synpulse 1s infinite}" +
      "@keyframes synpulse{50%{opacity:.35}}" +
      ".syn-btn{border:1px solid var(--s-line,#d8e0e8);background:var(--s-card,#fff);color:var(--s-ink,#16232f);border-radius:10px;padding:9px 14px;font-size:14px;font-weight:600;cursor:pointer}" +
      ".syn-btn:hover{border-color:var(--s-green,#16a34a);color:var(--s-green,#16a34a)}" +
      ".syn-btn.pri{background:var(--s-green,#16a34a);border-color:var(--s-green,#16a34a);color:#fff}" +
      ".syn-btn.pri:hover{filter:brightness(1.06);color:#fff}" +
      ".syn-btn.dgr:hover{border-color:#dc2626;color:#dc2626}" +
      ".syn-stats{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:13px;color:var(--s-muted,#5c6b7a)}" +
      ".syn-stats b{color:var(--s-ink,#16232f)}" +
      ".syn-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}" +
      "@media(max-width:760px){.syn-cols{grid-template-columns:1fr}}" +
      ".syn-cols ul{margin:8px 0 0;padding-left:18px;font-size:13.5px;color:var(--s-muted,#5c6b7a);line-height:1.7}" +
      ".syn-cols h4{margin:0;font-size:14px}" +
      ".syn-note{font-size:13px;color:var(--s-muted,#5c6b7a);margin-top:8px}" +
      "#synGapiSlot{min-height:44px;display:flex;align-items:center}";
    document.head.appendChild(el);
  }
  function render() {
    var root = $("syncRoot");
    if (!root) return;
    injectCss();
    var s = st.get(SESS, null);
    var m = st.get(META, {}) || {};
    var chip = chipState();
    var html = '<div class="syn-wrap">';

    if (!baseUrl() || !siteKey()) {
      html += '<div class="syn-card"><h3>Cloud sync is not configured on this copy of the site.</h3>' +
        '<p>Everything still works — your progress simply lives on this device, as it always has.</p></div>';
    } else if (!s) {
      html += '<div class="syn-card"><h3>Your progress lives on this device.</h3>' +
        '<p>Connect with Google and your XP, badges, attempt history, mistakes, bookmarks, journal and goals travel with you — phone at home, phone at school, same you. No account? Nothing changes: the whole site works exactly as before, offline and private.</p>' +
        '<div class="syn-row"><button class="syn-btn pri" id="synConnect" type="button">☁️ Connect with Google</button></div>' +
        '<p class="syn-note" id="synHint">Uses the same Google button as your account card. This site never sees your password — Google only shares your name and email, and your sync row is readable by your sign-in alone.</p>' +
        (m.off ? '<p class="syn-note">⚠️ ' + esc(m.off) + '</p>' : '') +
        '</div>';
    } else {
      var b = st.get(BASEK, null);
      var nKeys = b && b.keys ? Object.keys(b.keys).length : 0;
      var kb = 0;
      try { kb = Math.round(JSON.stringify((b && b.keys) || {}).length / 1024); } catch (e) {}
      html += '<div class="syn-card"><h3>Connected <span class="syn-chip"><span class="syn-dot ' + chip[0] + '"></span>' + esc(chip[1]) + '</span></h3>' +
        '<p>' + esc(s.email || "your Google account") + ' — your progress now travels with you.</p>' +
        '<div class="syn-row">' +
        '<button class="syn-btn pri" id="synNow" type="button">Sync now</button>' +
        '<button class="syn-btn" id="synAuto" type="button">Auto-sync: ' + (m.auto === false ? "OFF" : "ON") + '</button>' +
        '<button class="syn-btn dgr" id="synWipe" type="button">Delete cloud copy…</button>' +
        '<button class="syn-btn" id="synOut" type="button">Sign out</button>' +
        '</div>' +
        '<div class="syn-stats"><span><b>' + nKeys + '</b> items tracked</span><span><b>' + kb + ' KB</b> in your cloud row</span>' +
        (b && b.rev ? '<span>rev <b>' + (+b.rev) + '</b></span>' : '') +
        (m.last ? '<span>last sync <b>' + ago(m.last) + '</b></span>' : '') + '</div>' +
        (deferred ? '<p class="syn-note">A merge is waiting until you leave the Practice screen — nothing is lost.</p>' : '') +
        '</div>';
    }

    html += '<div class="syn-card"><h3>What travels — and what never leaves this device</h3><div class="syn-cols">' +
      '<div><h4>☁️ Travels with your Google sign-in</h4><ul>' +
      '<li>XP, coins, levels, badges, streaks</li>' +
      '<li>Attempt history &amp; scores (every profile)</li>' +
      '<li>Mistakes list, bookmarks, reflection journal</li>' +
      '<li>Adaptive engine stats, topic mastery, weak spots</li>' +
      '<li>Daily goals &amp; targets, countdown exam, lab stats</li>' +
      '</ul></div>' +
      '<div><h4>🔒 Never leaves this device</h4><ul>' +
      '<li><b>Your activation code</b> — the gate stays the gate; syncing grants no access</li>' +
      '<li>Device identity &amp; your Google profile data</li>' +
      '<li>Theme, fonts, sound &amp; accessibility settings</li>' +
      '<li>Teacher CBT drafts</li>' +
      '<li>Anything at all while you stay signed out</li>' +
      '</ul></div></div></div>';
    html += '</div>';
    root.innerHTML = html;

    var c = $("synConnect");
    if (c) c.addEventListener("click", function () { c.disabled = true; c.textContent = "Connecting…"; Promise.resolve(connect()).then(function () { render(); }); });
    var n = $("synNow");
    if (n) n.addEventListener("click", function () { n.disabled = true; syncNow(false).then(function () { var x = $("synNow"); if (x) x.disabled = false; }); });
    var a = $("synAuto");
    if (a) a.addEventListener("click", function () {
      var mm = st.get(META, {}) || {};
      mm.auto = mm.auto === false;
      st.set(META, mm);
      render();
      if (mm.auto) syncNow(true);
    });
    var w = $("synWipe");
    if (w) w.addEventListener("click", function () {
      var ok = false;
      try { ok = window.confirm("Delete your cloud copy?\n\nThis clears the synced snapshot for every device. This phone keeps all of its own progress, and a fresh copy syncs from here on the next sync."); } catch (e) { ok = true; }
      if (ok) { w.disabled = true; wipeCloud().then(function () { var x = $("synWipe"); if (x) x.disabled = false; }); }
    });
    var o = $("synOut");
    if (o) o.addEventListener("click", function () { signOut(false); });
  }

  /* ---------- public surface ---------- */
  window.MAMSS_SYNC = {
    version: VERSION,
    boot: boot,
    mount: mount,
    onCred: onCred,
    detach: function () { signOut(true); },
    syncNow: function (manual) { return syncNow(manual === true ? false : true); },
    render: render,
    _test: {
      VERSION: VERSION,
      SESS: SESS, BASEK: BASEK, META: META, GCRED: GCRED,
      KEYLIST: { SYNC_STATIC: SYNC_STATIC, SYNC_PREFIX: SYNC_PREFIX, NEVER_EXACT: NEVER_EXACT, NEVER_PREFIX: NEVER_PREFIX },
      allowed: allowed, fp: fp, entKey: entKey,
      mergeVal: mergeVal, mergeKeys: mergeKeys, unionArr: unionArr,
      localKeys: localKeys, buildLocal: buildLocal, applyKeys: applyKeys,
      adopt: adopt, ensure: ensure, signOut: signOut, connect: connect, wipeCloud: wipeCloud,
      syncNowForce: function () { return syncNow("force"); },
      flushDeferred: flushDeferred, localChanged: localChanged, DEFERK: DEFERK,
      deferQueue: function () { return st.get(DEFERK, null); },
      sess: function () { return st.get(SESS, null); },
      base: function () { return st.get(BASEK, null); },
      meta: function () { return st.get(META, {}); },
      setBusy: function (v) { busy = !!v; },
      pull: pull
    }
  };
})();
