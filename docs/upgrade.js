/* =====================================================================
   MAMSS PREP — upgrade.js   v43 "Ascension"
   ---------------------------------------------------------------------
   An ADDITIVE layer. It changes no existing behaviour: it waits for the
   app to boot, then adds the things the app was missing.

     1. Installable PWA        — beforeinstallprompt + iOS instructions
     2. Safe updates           — "new version ready → reload" (no forced
                                 service-worker swap mid-session)
     3. Network awareness      — offline / back-online pill
     4. Data Saver             — pauses decorative heavy modules, offers
                                 to load any of them on demand
     5. Storage guardian       — navigator.storage.persist(), quota meter,
                                 localStorage size, backup nudge
     6. Screen wake lock       — held during timed examination papers
     7. App health             — error capture, diagnostics, one-tap repair
     8. Bank rescue            — decodes the question bank even in browsers
                                 with no DecompressionStream
     9. What's new             — one-time release notes

   Everything is namespaced `mp` / `MAMSS_`. Every entry point is wrapped
   in try/catch so a failure here can never take the study app down.
   ===================================================================== */
(function () {
  "use strict";

  var V = 43, NAME = "Ascension";
  var api = (window.MAMSS_UPGRADE = { v: V, name: NAME, at: Date.now(), features: {} });

  /* ---------------------------------------------------------- helpers */
  function $(id) { return document.getElementById(id); }
  function has(id) { return !!$(id); }
  function T(msg, ico) { try { if (window.toast) window.toast(msg, ico || "✅"); } catch (e) {} }
  function S() { /* the app's own store (global lexical const), with a safe fallback */
    try { if (typeof store !== "undefined" && store && store.get) return store; } catch (e) {}
    var mem = {};
    return {
      get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
      set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
      del: function (k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
    };
  }
  var st = S();
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function on(node, ev, fn, opt) { try { node && node.addEventListener(ev, fn, opt); } catch (e) {} }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(2) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function qCount() {
    try {
      var G = window.QUIZ_RAW, t = 0;
      if (!G || !G.classes) return 0;
      G.classes.forEach(function (c) { var a = (c && c[1]) || []; t += a.length; });
      return t;
    } catch (e) { return 0; }
  }
  function idle(fn, ms) {
    try {
      if (window.requestIdleCallback) return requestIdleCallback(fn, { timeout: ms || 4000 });
    } catch (e) {}
    return setTimeout(fn, ms || 1200);
  }
  function mark(f, ok) { api.features[f] = !!ok; }

  /* --------------------------------------------------- 1. App Centre UI */
  var HUB_ID = "mpHubOverlay";

  function buildHub() {
    if (has(HUB_ID)) return $(HUB_ID);
    var ov = el("div", "overlay hidden");
    ov.id = HUB_ID;
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "App Centre");
    ov.innerHTML =
      '<div class="modal wide">' +
      '<button class="x icon-btn" type="button" aria-label="Close App Centre" onclick="closeMpHub()">✕</button>' +
      '<h3>🚀 App Centre</h3>' +
      '<p class="mp-hero-badge">v' + V + ' · ' + NAME + '</p>' +
      '<div id="mpHubBody"></div>' +
      '</div>';
    on(ov, "click", function (e) { if (e.target === ov) closeHub(); });
    document.body.appendChild(ov);
    window.closeMpHub = closeHub;
    return ov;
  }
  function closeHub() { try { $(HUB_ID) && $(HUB_ID).classList.add("hidden"); } catch (e) {} }

  function openHub(tab) {
    try {
      var ov = buildHub();
      renderHub();
      ov.classList.remove("hidden");
      if (tab) { var t = $("mpRow-" + tab); t && t.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    } catch (e) { T("App Centre could not open", "⚠️"); }
  }
  window.openMpHub = openHub;

  function row(id, icon, title, sub, actionHtml) {
    return '<div class="mp-row" id="mpRow-' + id + '">' +
      '<span class="mp-ic" aria-hidden="true">' + icon + '</span>' +
      '<span class="mp-tx"><b>' + title + '</b><small>' + sub + '</small></span>' +
      '<span class="mp-act">' + (actionHtml || "") + '</span></div>';
  }

  function renderHub() {
    var b = $("mpHubBody"); if (!b) return;
    var html = "";

    /* --- install & updates --- */
    html += '<div class="mp-sec"><h4>Install &amp; updates</h4>';
    html += row("install", "📲", installTitle(), installSub(),
      '<button class="mp-btn pri" id="mpInstallAct" type="button">' + (api.deferredPrompt ? "Install" : "How") + "</button>");
    html += row("update", "🔄", "App version <b>v" + V + "</b> · " + swState(),
      "Updates download in the background and are applied when you confirm — never mid-paper.",
      '<button class="mp-btn" id="mpCheckUpdate" type="button">Check</button>');
    html += row("net", navigator.onLine ? "🟢" : "📴", navigator.onLine ? "Online" : "Offline",
      netSub(), "");
    html += "</div>";

    /* --- data saver --- */
    var sv = saverOn();
    html += '<div class="mp-sec"><h4>Data Saver</h4>';
    html += '<div class="mp-row" id="mpRow-saver">' +
      '<span class="mp-ic" aria-hidden="true">🪶</span>' +
      '<span class="mp-tx"><b>Data Saver ' + (sv ? "is ON" : "is OFF") + "</b><small>" +
      "Turns off aurora, particles, 3D and video modules and pauses their downloads. " +
      "Questions, notes, calculator and progress are untouched." +
      (autoSaver() ? " <b>Auto-enabled:</b> your browser asked for reduced data usage." : "") +
      "</small>" + saverChips() + "</span>" +
      '<span class="mp-act"><button class="mp-sw" id="mpSaverSw" role="switch" aria-checked="' + (sv ? "true" : "false") +
      '" aria-label="Toggle Data Saver" type="button"></button></span></div>';
    html += "</div>";

    /* --- storage --- */
    html += '<div class="mp-sec"><h4>Your progress on this device</h4>';
    html += row("store", "💾", "Local storage: <b>" + kb(lsBytes()) + "</b>",
      "Everything you have done lives on this phone. Export a backup now and then — it takes one tap.",
      '<button class="mp-btn gold" id="mpBackupAct" type="button">Back up</button>');
    html += '<div class="mp-row" id="mpRow-quota"><span class="mp-ic" aria-hidden="true">📦</span>' +
      '<span class="mp-tx"><b id="mpQuotaT">Browser storage…</b><small id="mpQuotaS">Checking how much room this device has given MAMSS PREP.</small>' +
      '<span class="mp-meter" id="mpQuotaM"><i style="width:0%"></i></span></span>' +
      '<span class="mp-act"><button class="mp-btn" id="mpPersistAct" type="button">Protect</button></span></div>';
    html += "</div>";

    /* --- health --- */
    html += '<div class="mp-sec"><h4>App health</h4>';
    html += row("bank", bankOk() ? "✅" : "⏳", "Question bank: <b>" + (bankOk() ? "decoded and ready" : "not decoded yet") + "</b>",
      bankOk() ? "Integrity-checked on this device — every class and subject is available offline."
               : "If this does not clear in a few seconds, use Repair below.",
      "");
    html += row("errs", errs().length ? "⚠️" : "🩺", errs().length ? errs().length + " issue" + (errs().length > 1 ? "s" : "") + " recorded" : "No errors recorded",
      "Nothing is sent anywhere — this log never leaves your device.",
      '<button class="mp-btn" id="mpErrsAct" type="button">View</button>');
    html += row("repair", "🧰", "Repair the app",
      "Clears the offline cache and reloads. Your progress is kept.",
      '<button class="mp-btn" id="mpRepairAct" type="button">Repair</button>');
    html += row("perf", "⚡", "This visit: " + perfLine(), "Measured on your device, in this browser.", "");
    html += "</div>";

    b.innerHTML = html;
    wireHub();
    idle(refreshQuota, 300);
  }

  function wireHub() {
    var i = $("mpInstallAct"); on(i, "click", doInstall);
    var c = $("mpCheckUpdate"); on(c, "click", checkUpdate);
    var s = $("mpSaverSw"); on(s, "click", toggleSaver);
    var k = $("mpBackupAct"); on(k, "click", doBackup);
    var p = $("mpPersistAct"); on(p, "click", doPersist);
    var e = $("mpErrsAct"); on(e, "click", showErrs);
    var r = $("mpRepairAct"); on(r, "click", doRepair);
    Array.prototype.forEach.call(document.querySelectorAll(".mp-chip[data-load]"), function (chip) {
      on(chip, "click", function () { loadAnyway(chip.getAttribute("data-load"), chip); });
    });
  }

  /* ------------------------------------------------------- 2. install */
  function iosStandalone() {
    return window.navigator.standalone === true ||
      (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent || ""); }
  function installTitle() {
    if (iosStandalone()) return "Installed on this device";
    if (api.deferredPrompt) return "Install MAMSS PREP";
    if (isIOS()) return "Add to Home Screen (iPhone/iPad)";
    return "Install MAMSS PREP";
  }
  function installSub() {
    if (iosStandalone()) return "Running as an app — it opens full-screen and works offline.";
    if (api.deferredPrompt) return "Installs like a normal app: own icon, full screen, opens instantly, works with no network.";
    if (isIOS()) return "iPhone/iPad: tap <b>Share</b> in Safari, then <b>Add to Home Screen</b>.";
    return "Android/Chrome: menu ⋮ → <b>Install app</b> or <b>Add to Home screen</b>. Chrome usually offers it automatically once you have used the app twice.";
  }
  function doInstall() {
    try {
      if (api.deferredPrompt) {
        api.deferredPrompt.prompt();
        api.deferredPrompt.userChoice.then(function (ch) {
          T(ch && ch.outcome === "accepted" ? "Installing MAMSS PREP…" : "Install dismissed — the menu option stays available", ch && ch.outcome === "accepted" ? "📲" : "ℹ️");
          api.deferredPrompt = null; renderHub(); paintNav();
        }).catch(function () {});
        return;
      }
      T(isIOS() ? "Safari → Share → Add to Home Screen" : "Browser menu → Install app / Add to Home screen", "📲");
    } catch (e) {}
  }
  on(window, "beforeinstallprompt", function (e) {
    try { e.preventDefault(); } catch (err) {}
    api.deferredPrompt = e; mark("install", true); paintNav();
    idle(function () {
      if (!st.get("nssc_mp_install_toast")) {
        st.set("nssc_mp_install_toast", 1);
        T("You can install MAMSS PREP as an app — 🚀 App Centre", "📲");
      }
    }, 6000);
  });
  on(window, "appinstalled", function () {
    api.deferredPrompt = null; mark("installed", true); paintNav();
    T("MAMSS PREP is installed. Open it from your home screen.", "🎉");
  });

  /* --------------------------------------------- 3. service worker / updates */
  function swState() {
    if (!("serviceWorker" in navigator)) return "service workers unsupported in this browser";
    if (api.updateReady) return "<b>an update is waiting</b>";
    return navigator.serviceWorker.controller ? "offline copy active" : "offline copy is being built on this first visit";
  }
  function netSub() {
    var c = navigator.connection || {};
    var bits = [];
    if (c.effectiveType) bits.push("network class <b>" + c.effectiveType.toUpperCase() + "</b>");
    if (c.downlink) bits.push("~" + c.downlink + " Mbps");
    if (c.saveData) bits.push("browser Data Saver requested");
    bits.push(navigator.serviceWorker && navigator.serviceWorker.controller ? "cached for offline use" : "needs one online visit to cache");
    return bits.join(" · ");
  }
  function showPill(kind, html, btnLabel, fn) {
    var p = $("mpPill");
    if (!p) { p = el("div", "mp-pill"); p.id = "mpPill"; document.body.appendChild(p); }
    p.className = "mp-pill " + kind;
    p.innerHTML = "";
    p.appendChild(el("span", null, html));
    if (btnLabel) {
      var b = el("button", null, btnLabel); b.type = "button";
      on(b, "click", fn); p.appendChild(b);
    }
    requestAnimationFrame(function () { p.classList.add("on"); });
    return p;
  }
  function hidePill() { var p = $("mpPill"); if (p) p.classList.remove("on"); }

  function promptUpdate() {
    if (api.updatePrompted) return;
    api.updatePrompted = true; api.updateReady = true; mark("update", true);
    showPill("", "🔄 <b>A new version of MAMSS PREP is ready.</b>", "Reload", function () { applyUpdate(); });
  }
  function applyUpdate() {
    try {
      sessionStorage.setItem("mp_reloading", "1");
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        else location.reload();
      }).catch(function () { location.reload(); });
      setTimeout(function () { location.reload(); }, 2500);
    } catch (e) { location.reload(); }
  }
  on(navigator.serviceWorker, "controllerchange", function () {
    if (sessionStorage.getItem("mp_reloading")) { sessionStorage.removeItem("mp_reloading"); location.reload(); }
  });
  function checkUpdate(silent) {
    if (!("serviceWorker" in navigator)) { if (!silent) T("This browser cannot cache the app offline", "ℹ️"); return; }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { if (!silent) T("No offline worker registered yet — reload once", "ℹ️"); return; }
      on(reg, "updatefound", watchInstall);
      reg.update().then(function () {
        if (!silent) T(reg.waiting ? "An update is waiting — reload to apply it" : "Checked: you have the latest version", reg.waiting ? "🔄" : "✅");
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate();
        renderHubSafe();
      }).catch(function () { if (!silent) T("Could not check for updates (offline?)", "📴"); });
    }).catch(function () {});
  }
  function watchInstall(e) {
    var w = e && e.target; if (!w) return;
    on(w, "statechange", function () {
      if (w.state === "installed" && navigator.serviceWorker.controller) promptUpdate();
    });
  }
  function initSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      mark("sw", true);
      if (reg.waiting && navigator.serviceWorker.controller) promptUpdate();
      if (reg.installing) watchInstall({ target: reg.installing });
      on(reg, "updatefound", watchInstall);
    }).catch(function () {});
    on(navigator.serviceWorker, "message", function (e) {
      var d = e && e.data; if (!d) return;
      if (d.type === "sw-activated") { api.swVersion = d.version; renderHubSafe(); }
      if (d.type === "PONG") { api.swVersion = d.version; renderHubSafe(); }
    });
    try { navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage("PING"); } catch (e) {}
  }

  /* ---------------------------------------------------- 4. connectivity */
  function initNet() {
    on(window, "offline", function () {
      mark("offline", true);
      showPill("off", "📴 <b>You are offline.</b> MAMSS PREP keeps working from this device.", null, null);
      renderHubSafe();
    });
    on(window, "online", function () {
      hidePill(); T("Back online", "🟢");
      idle(function () { checkUpdate(true); }, 4000);
      renderHubSafe();
    });
    var c = navigator.connection;
    if (c) on(c, "change", function () { renderHubSafe(); maybeAutoSaver(); });
  }

  /* -------------------------------------------------- 5. Data Saver */
  var HEAVY = {
    "quiz/scroll3d.js": "3D scroll hero", "quiz/holo.js": "Holo 3D Lab",
    "quiz/reels.js": "AI Explainer Reels", "quiz/boost.js": "Math Sprint + soundscapes",
    "quiz/aura.js": "Trophy room", "quiz/studio.js": "Mind map studio",
    "quiz/_arc_app.js": "Study Arcade", "quiz/_arc_data.js": "Study Arcade data",
    "arcade.js": "Study Arcade"
  };
  function saverOn() { return document.documentElement.classList.contains("data-saver"); }
  function autoSaver() { return document.documentElement.classList.contains("data-saver-auto"); }
  function blocked() { return window.MAMSS_SAVER_BLOCKED || []; }
  function saverChips() {
    var b = blocked(); if (!b.length) return "";
    var h = '<span class="mp-chips">';
    b.forEach(function (p) {
      h += '<button class="mp-chip" type="button" data-load="' + p + '">⬇ <b>' + (HEAVY[p] || p) + "</b> · load now</button>";
    });
    return h + "</span>";
  }
  function toggleSaver() {
    var turnOn = !saverOn();
    st.set("nssc_saver", turnOn);
    try { document.documentElement.classList.remove("data-saver-auto"); } catch (e) {}
    T(turnOn ? "Data Saver on — reloading to pause the heavy modules" : "Data Saver off — reloading with everything enabled", turnOn ? "🪶" : "✨");
    setTimeout(function () { location.reload(); }, 700);
  }
  function loadAnyway(src, chip) {
    try {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { T((HEAVY[src] || src) + " loaded", "✅"); chip && chip.remove(); };
      s.onerror = function () { T("Could not load " + src, "⚠️"); };
      document.head.appendChild(s);
      window.MAMSS_SAVER_BLOCKED = blocked().filter(function (x) { return x !== src; });
    } catch (e) {}
  }
  function maybeAutoSaver() {
    try {
      var c = navigator.connection || {};
      if (saverOn() || st.get("nssc_saver", false) === true) return;
      if (c.saveData === true || /^(slow-)?2g$/.test(c.effectiveType || "")) {
        if (st.get("nssc_mp_saver_hint")) return;
        st.set("nssc_mp_saver_hint", 1);
        showPill("", "🪶 <b>Slow connection detected.</b> Data Saver cuts animations and pauses the 3D/video modules.",
          "Turn on", function () { st.set("nssc_saver", true); location.reload(); });
      }
    } catch (e) {}
  }

  /* ------------------------------------------------- 6. storage guardian */
  function lsBytes() {
    try {
      var t = 0, ls = window.localStorage;
      for (var i = 0; i < ls.length; i++) { var k = ls.key(i); t += (k.length + (ls.getItem(k) || "").length) * 2; }
      return t;
    } catch (e) { return 0; }
  }
  function refreshQuota() {
    var t = $("mpQuotaT"), s = $("mpQuotaS"), m = $("mpQuotaM"), p = $("mpPersistAct");
    if (!t) return;
    try {
      if (!(navigator.storage && navigator.storage.estimate)) {
        t.innerHTML = "Browser storage: <b>unknown</b>";
        s.textContent = "This browser does not report storage quota. Your progress is still saved locally.";
        if (p) p.disabled = true;
        return;
      }
      navigator.storage.estimate().then(function (e) {
        var used = e.usage || 0, quota = e.quota || 0;
        var pct = quota ? Math.min(100, (used / quota) * 100) : 0;
        t.innerHTML = "Device storage for MAMSS PREP: <b>" + kb(used) + "</b>";
        s.innerHTML = quota ? "of " + kb(quota) + " available (" + pct.toFixed(pct < 1 ? 2 : 1) + "%). Progress, papers and the offline copy of the app all live here."
          : "quota not reported by this browser.";
        if (m) { m.className = "mp-meter" + (pct > 85 ? " bad" : pct > 60 ? " warn" : ""); m.firstElementChild.style.width = Math.max(pct, pct ? 1.5 : 0) + "%"; }
        if (navigator.storage.persisted) {
          navigator.storage.persisted().then(function (yes) {
            if (p) { p.textContent = yes ? "Protected ✓" : "Protect"; p.disabled = !!yes; p.title = yes ? "This browser will not evict your data" : "Ask the browser to keep your data even when storage is low"; }
          }).catch(function () {});
        }
      }).catch(function () {});
    } catch (e) {}
  }
  function doPersist() {
    try {
      if (!(navigator.storage && navigator.storage.persist)) { T("This browser cannot protect storage", "ℹ️"); return; }
      navigator.storage.persist().then(function (ok) {
        T(ok ? "Your progress is now protected from automatic cleanup" : "The browser declined — export a backup regularly instead", ok ? "🛡️" : "ℹ️");
        refreshQuota();
      }).catch(function () { T("Could not change the storage setting", "⚠️"); });
    } catch (e) {}
  }
  function doBackup() {
    try {
      if (typeof window.labBackupExport === "function") { window.labBackupExport(); mark("backup", true); return; }
      if (typeof window.labBackupRender === "function") { window.labBackupRender(); return; }
      T("Open Study Hall → Backup & Restore to export", "ℹ️");
    } catch (e) { T("Backup could not start", "⚠️"); }
  }
  function backupNudge() {
    try {
      var last = st.get("nssc_lastbackup", 0) || 0;
      var days = (Date.now() - last) / 86400000;
      var big = lsBytes() > 3 * 1024 * 1024;
      var attempts = 0;
      try { attempts = (st.get("nssc_attempts_guest", null) || []).length || 0; } catch (e) {}
      if ((days > 21 && attempts > 3) || big) {
        if (st.get("nssc_mp_nudged_" + new Date().toISOString().slice(0, 10))) return;
        st.set("nssc_mp_nudged_" + new Date().toISOString().slice(0, 10), 1);
        showPill("", big ? "💾 <b>Your progress is getting large (" + kb(lsBytes()) + ").</b>" : "💾 <b>No backup in " + Math.round(days) + " days.</b>",
          "Back up", function () { hidePill(); doBackup(); });
      }
    } catch (e) {}
  }

  /* ------------------------------------------------- 7. screen wake lock */
  var wakeSentinel = null;
  function examRunning() {
    try {
      var q = $("quizCard"); if (!q || q.classList.contains("hidden")) return false;
      var t = document.querySelector("#quizCard .timer");
      return !!(t && t.offsetParent !== null);
    } catch (e) { return false; }
  }
  function wantWake(need) {
    try {
      if (!("wakeLock" in navigator)) return;
      if (need && !wakeSentinel) {
        navigator.wakeLock.request("screen").then(function (s) {
          wakeSentinel = s; mark("wakelock", true);
          on(s, "release", function () { wakeSentinel = null; });
        }).catch(function () {});
      } else if (!need && wakeSentinel) {
        wakeSentinel.release().catch(function () {}); wakeSentinel = null;
      }
    } catch (e) {}
  }
  function initWake() {
    var q = $("quizCard");
    if (q && window.MutationObserver) {
      try {
        new MutationObserver(function () { wantWake(examRunning()); })
          .observe(q, { attributes: true, attributeFilter: ["class"] });
      } catch (e) {}
    }
    on(document, "visibilitychange", function () {
      if (document.visibilityState === "visible" && examRunning()) wantWake(true);
    });
    /* the timer only exists once a paper starts, so also poll gently */
    setInterval(function () { if (examRunning()) wantWake(true); }, 15000);
  }

  /* --------------------------------------------------- 8. health + errors */
  function errs() { try { return st.get("nssc_mp_errs", []) || []; } catch (e) { return []; } }
  function pushErr(kind, msg) {
    try {
      var a = errs();
      a.unshift({ t: Date.now(), k: kind, m: String(msg || "").slice(0, 220) });
      st.set("nssc_mp_errs", a.slice(0, 12));
    } catch (e) {}
  }
  function initErrors() {
    on(window, "error", function (e) {
      var f = (e && e.filename || "").split("/").pop();
      pushErr("error", (e && e.message ? e.message : "unknown") + (f ? " @" + f + ":" + (e.lineno || 0) : ""));
    });
    on(window, "unhandledrejection", function (e) {
      pushErr("promise", (e && e.reason && (e.reason.message || e.reason)) || "unhandled rejection");
    });
  }
  function showErrs() {
    var a = errs();
    if (!a.length) { T("No errors recorded on this device", "🩺"); return; }
    var ov = buildHub(); renderHub();
    var r = $("mpRow-errs");
    if (r) {
      var log = el("div", "mp-log");
      a.forEach(function (x) {
        log.appendChild(el("div", null, new Date(x.t).toLocaleString() + " · <span class=\"mp-bad\">" + x.k + "</span> " +
          String(x.m).replace(/[<>]/g, "")));
      });
      var clr = el("button", "mp-btn", "Clear log"); clr.type = "button";
      on(clr, "click", function () { st.del("nssc_mp_errs"); renderHub(); T("Error log cleared", "🧹"); });
      r.parentNode.insertBefore(log, r.nextSibling);
      r.querySelector(".mp-act").appendChild(clr);
    }
    ov.classList.remove("hidden");
  }
  function bankOk() { return !!window.QUIZ_RAW && !window.QUIZ_ERR; }
  function doRepair() {
    try {
      if (!window.confirm("Clear the offline cache and reload? Your progress, papers and certificates are kept.")) return;
      var done = function () { sessionStorage.setItem("mp_reloading", "1"); location.reload(); };
      if ("caches" in window) {
        caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
          .then(done).catch(done);
        setTimeout(done, 3000);
      } else done();
    } catch (e) { location.reload(); }
  }

  /* -------------------------------------------------- 9. bank rescue */
  function bankRescue() {
    try {
      var supported = ("DecompressionStream" in window);
      if (bankOk()) { mark("bank", true); return; }
      var reason = window.QUIZ_ERR ? "decode failed: " + window.QUIZ_ERR : "still decoding";
      if (!window.QUIZ_ERR && supported) return;      /* give the normal path time */
      if (typeof window.bankDecode !== "function") return;
      mark("bankrescue", true);
      var s = document.createElement("script");
      s.src = "bank-raw.js"; s.async = true;
      s.onload = function () {
        try {
          var txt = window.__BANK_RAW_TXT;
          if (!txt) return;
          var G = window.bankDecode(txt);
          if (!G || !G.classes || G.classes.length !== 3) return;
          window.QUIZ_RAW = G; window.QUIZ_ERR = null;
          window.dispatchEvent(new Event("quizbank-updated"));
          T("Question bank recovered — all classes and subjects loaded", "🛟");
          renderHubSafe();
        } catch (e) { pushErr("rescue", e && e.message); }
      };
      s.onerror = function () { pushErr("rescue", "bank-raw.js unavailable"); };
      document.head.appendChild(s);
      console.info("[MAMSS v" + V + "] bank rescue engaged — " + reason);
    } catch (e) {}
  }
  function initBankWatch() {
    on(window, "quizbank-updated", function () { mark("bank", bankOk()); renderHubSafe(); });
    setTimeout(function () { if (!bankOk()) bankRescue(); }, 6000);
    setTimeout(function () { if (!bankOk()) bankRescue(); }, 20000);
  }

  /* ----------------------------------------------------- 10. perf line */
  var PERF = {};
  function initPerf() {
    try {
      var n = performance.getEntriesByType("navigation")[0] || {};
      PERF.dcl = Math.round(n.domContentLoadedEventEnd || 0);
      PERF.fcp = (function () { var e = performance.getEntriesByName("first-contentful-paint")[0]; return e ? Math.round(e.startTime) : null; })();
      var t0 = performance.timeOrigin || Date.now() - performance.now();
      on(window, "quizbank-updated", function () { PERF.bank = Math.round(Date.now() - t0); renderHubSafe(); });
      PERF.res = performance.getEntriesByType("resource").length;
      PERF.bytes = performance.getEntriesByType("resource").reduce(function (a, r) { return a + (r.transferSize || 0); }, 0);
      mark("perf", true);
    } catch (e) {}
  }
  function perfLine() {
    var b = [];
    if (PERF.fcp) b.push("first paint <b>" + PERF.fcp + " ms</b>");
    if (PERF.dcl) b.push("interactive <b>" + PERF.dcl + " ms</b>");
    if (PERF.bank) b.push("bank ready <b>" + (PERF.bank / 1000).toFixed(1) + " s</b>");
    if (PERF.bytes) b.push(kb(PERF.bytes) + " over " + PERF.res + " requests");
    return b.length ? b.join(" · ") : "measuring…";
  }
  function renderHubSafe() { try { var o = $(HUB_ID); if (o && !o.classList.contains("hidden")) renderHub(); } catch (e) {} }

  /* ------------------------------------------------- 11. what's new */
  function whatsNew() {
    if (st.get("nssc_mp_seen") === V) return;
    st.set("nssc_mp_seen", V);
    var items = [
      ["📲", "Installable as a real app", "A broken tag in the page head was silently discarding the app manifest, so MAMSS PREP could not be installed on any phone. Fixed — tap Install in the App Centre."],
      ["⚡", "Much faster repeat visits", "The 139 KB of styling moved out of the page into a cacheable file, and the offline worker now serves the app from the device first instead of waiting on the network."],
      ["🪶", "Data Saver", "One switch turns off aurora, particles, 3D and video, and pauses their downloads. It turns itself on when your browser reports a slow or metered connection."],
      ["🔄", "Safe updates", "A new version is downloaded in the background and applied only when you tap Reload — never in the middle of a timed paper."],
      ["🛡️", "Progress protection", "MAMSS PREP now asks the browser to keep your data when storage runs low, shows how much room it has, and nudges you to back up."],
      ["🔦", "Screen stays awake", "During a timed examination the screen no longer dims or locks mid-paper."],
      ["🛟", "Bank rescue", "On older browsers that cannot decompress the question bank, a plain copy is fetched instead — all 4,167 questions still load."]
    ];
    var ov = el("div", "overlay hidden"); ov.id = "mpNewOverlay";
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    var h = '<div class="modal"><button class="x icon-btn" type="button" aria-label="Close">✕</button>' +
      '<h3>✨ What is new in v' + V + '</h3>' +
      '<p style="color:var(--mut);font-size:.85rem;margin:2px 0 12px">Everything below is stored on your device. Nothing is uploaded.</p>' +
      '<ul class="mp-new">';
    items.forEach(function (it) { h += '<li><span class="mp-ni">' + it[0] + '</span><span><b>' + it[1] + "</b><small>" + it[2] + "</small></span></li>"; });
    h += '</ul><div class="row" style="margin-top:14px;justify-content:center">' +
      '<button class="btn btn-ghost" type="button" id="mpNewHub">🚀 Open App Centre</button>' +
      '<button class="btn btn-primary" type="button" id="mpNewOk">Start studying</button></div></div>';
    ov.innerHTML = h;
    var close = function () { try { ov.remove(); } catch (e) {} };
    on(ov, "click", function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.remove("hidden"); });
    on(ov.querySelector(".x"), "click", close);
    on($("mpNewOk"), "click", close);
    on($("mpNewHub"), "click", function () { close(); openHub(); });
    mark("whatsnew", true);
  }

  /* ------------------------------------------------------- 12. nav + dock */
  function paintNav() {
    try {
      var nav = document.querySelector("nav.nav");
      if (!nav) return;
      var wrap = nav.querySelector(".account-wrap") || null;
      if (!has("mpHubBtn")) {
        var b = el("button", "icon-btn mp-nav-btn");
        b.id = "mpHubBtn"; b.type = "button"; b.textContent = "🚀";
        b.title = "App Centre — install, data saver, storage and app health";
        b.setAttribute("aria-label", "Open the App Centre");
        on(b, "click", function () { openHub(); });
        wrap ? nav.insertBefore(b, wrap) : nav.appendChild(b);
      }
      if (!has("mpInstallBtn") && (api.deferredPrompt || isIOS()) && !iosStandalone()) {
        var i = el("button", "icon-btn mp-nav-btn");
        i.id = "mpInstallBtn"; i.type = "button"; i.textContent = "📲";
        i.title = "Install MAMSS PREP on this device";
        i.setAttribute("aria-label", "Install MAMSS PREP");
        i.innerHTML = '📲<span class="mp-dot"></span>';
        on(i, "click", doInstall);
        var hub = $("mpHubBtn");
        hub ? nav.insertBefore(i, hub) : (wrap ? nav.insertBefore(i, wrap) : nav.appendChild(i));
        mark("installbtn", true);
      }
      if (iosStandalone() && has("mpInstallBtn")) { var x = $("mpInstallBtn"); x && x.remove(); }
    } catch (e) {}
  }
  function paintTile() {
    try {
      var g = $("labGrid"); if (!g || $("mpHubTile")) return;
      var t = el("button", "lab-tile");
      t.type = "button"; t.id = "mpHubTile";
      t.innerHTML = '<b class="li">🚀</b><span class="lt">App Centre</span>' +
        '<small class="lc">Install · data saver · storage · app health</small>';
      on(t, "click", function () { openHub(); });
      g.appendChild(t);
      mark("tile", true);
    } catch (e) {}
  }

  /* ------------------------------------------------------------- boot */
  function boot() {
    try {
      initErrors(); initPerf(); initNet(); initSW(); initWake(); initBankWatch();
      paintNav(); paintTile();
      idle(function () {
        try {
          refreshQuota(); backupNudge(); maybeAutoSaver(); paintNav(); paintTile();
          if (bankOk()) mark("bank", true);
          setTimeout(whatsNew, 2600);
        } catch (e) {}
      }, 2500);
      api.ready = true;
      window.openMpHub = openHub;
      console.info("[MAMSS PREP v" + V + " " + NAME + "] upgrade layer ready");
    } catch (e) { try { pushErr("boot", e && e.message); } catch (e2) {} }
  }

  if (document.readyState === "loading") on(document, "DOMContentLoaded", function () { idle(boot, 800); });
  else idle(boot, 800);
})();
