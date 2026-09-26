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

  var V = 56, NAME = "Cloud Sync";
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

    /* --- move progress between devices --- */
    html += '<div class="mp-sec"><h4>Move your progress</h4>';
    html += row("sync", "🔁", "Sync code — carry everything to another phone",
      "Compresses your papers, XP, merits, badges and mistake list into one code. " +
      "Copy it, message it to yourself, or save it as a file; paste it on the other device. " +
      "<b>No server is involved — nothing leaves this phone unless you send it.</b>",
      '<button class="mp-btn pri" id="mpSyncAct" type="button">Open</button>');
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

    html = hubActivationRow(html);

    html += '<div class="mp-sec"><h4>World-First Studio</h4>' +
      row("oral", "🎤", "Oral Examiner",
        "No other study site does this: the app asks oral questions aloud, listens through your mic and marks your spoken answer against the mark points (typed answers accepted).",
        '<button class="mp-btn pri" id="mpOralOpen" type="button">Open</button>') +
      row("palace", "🏛️", "Memory Palace",
        "Any topic becomes a guided walk through your own school — one vivid image per room, then a scored recall test. The method of loci, automated.",
        '<button class="mp-btn pri" id="mpPalOpen" type="button">Open</button>') +
      row("arena", "🏟️", "Recall Arena",
        "Blurting, automated: study the mark points for 30 seconds, the app hides everything, you write down all you remember — then it diffs your blurt against every mark point and hands you the misses.",
        '<button class="mp-btn pri" id="mpArenaOpen" type="button">Open</button>') +
      row("auto", "📈", "Forgetting-Curve Autopilot",
        "Every oral, palace walk and blurt feeds an Ebbinghaus schedule (1·3·7·14·30 days) that tells you exactly which topic to review today — computed on your device, offline.",
        '<button class="mp-btn pri" id="mpAutoOpen" type="button">Open</button>') +
      row("cmd", "🧭", "Exam Command Center",
        "Set your WAEC/NECO date and the app turns your own forgetting data into a printable day-by-day plan: mastery heatmap, weak topics first, Ebbinghaus re-reviews at +1, +3 and +7 days built in.",
        '<button class="mp-btn pri" id="mpCmdOpen" type="button">Open</button>') +
      '</div>';

    b.innerHTML = html;
    wireHub();
    wireActRow();
    wireStudio();
    idle(refreshQuota, 300);
  }

  function wireHub() {
    on($("mpSyncAct"), "click", openSync);
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
      ["🛟", "Bank rescue", "On older browsers that cannot decompress the question bank, a plain copy is fetched instead — all 4,167 questions still load."],
      ["🔁", "Carry your progress", "New in the App Centre and Study Hall: compress everything on this device into one sync code, then paste it on another phone. Papers already there are kept and de-duplicated. No server, no account, no upload."],
      ["🔑", "School activation codes", "Your teacher hands out paper slips like MAMSS-000000-2026. One code activates one device; it cannot be reused here. Only salted hashes live on the site — the plaintext list never leaves the school."],
      ["🎤", "Oral Examiner — world-first", "The app speaks oral questions aloud, listens through your microphone and marks your spoken answer against the mark points: coverage, pace, filler words. Typed answers accepted where there is no mic."],
      ["🏛️", "Memory Palace — world-first", "Any topic becomes a guided walk through your own school: one vivid image per room, then a scored recall test. The method of loci, automated, offline, on your device."],
      ["🏟️", "Recall Arena — world-first", "Blurting, automated: study the mark points for 30 seconds, the app hides everything, you write all you remember — it diffs your blurt against every mark point and hands you the misses, pen-colour style."],
      ["📈", "Forgetting-Curve Autopilot — world-first", "Every oral, palace walk and blurt now feeds an Ebbinghaus schedule (1·3·7·14·30 days). The App Centre tells you exactly which topic to review today, with the right tool for its stage. On-device, offline, no account."],
      ["✦", "Prestige Edition membership card", "Your activation is now a gold membership card in the App Centre: your slip, batch, issue date and ledger-verified single-device license. Access to MAMSS PREP is issued by the school, not sold — 500 numbered slips, one device each."],
      ["📱", "WhatsApp activation help", "Stuck at the lock screen? One tap opens a WhatsApp chat with the school office (08056787685) to request an activation key."],
      ["🧭", "Exam Command Center", "Set your exam date: a mastery heatmap shows every subject at a glance, and one tap builds a printable day-by-day study plan — weak and untouched topics first, every studied topic re-reviewed at +1, +3 and +7 days. Computed on your device from your own results."],
      ["✦", "Why MAMSS PREP — shareable page", "A prestige prospectus you can share in any parents' group or WhatsApp status: the five world-first tools, the honest global audit, and one tap to request an activation key from the school office. Find it on the lock screen and in the App Centre."],
      ["📝", "WAEC-standard question bank", "Every question in the bank has been audited to WAEC standard: command-word phrasing, sentence punctuation, ordinal and article grammar — and every machine-worded stem and explanation rewritten into clean examination English. Same questions, same answers; now phrased the way WAEC phrases them."],
      ["🧠", "Adaptive Engine", "The app now remembers how you answer every topic — accuracy, speed and a Leitner-style memory box with spaced due dates. The Daily Challenge weights six of its ten questions toward your three weakest topics, and the AI Coach shows each weak topic's memory box and offers speed drills when you are correct but slow. On-device, offline, no account — as always."],
      ["🏫", "Live CBT Hall", "Teachers can now run a real live examination: build the paper from the question bank (or add fresh questions), go live with a 6-character session code, watch every device join and answer in real time, extend or end the sitting, and get the ranking with per-question breakdown immediately after. Students join from the new Live CBT tab with the activation they already have — one device per session, every answer saved the instant it is given, and the clock lives on the school server so a refresh cannot reset it."],
      ["📹", "Live CBT Cameras", "Webcam monitoring for live exams: the teacher chooses off, optional or required per paper. Students see themselves before going live and give permission explicitly; during the exam the teacher receives small snapshots about every 12 seconds — sent live over the school's realtime channel, never recorded and never stored. When the paper ends the video is gone; only a status word (on · denied · no camera · skipped) remains on the result row."],
      ["☁️", "Cloud Sync — your progress, any device (optional)", "Sign in with Google in the new Cloud Sync tab and your XP, badges, attempt history, mistakes, bookmarks, journal, adaptive stats and goals merge losslessly between your devices — two phones syncing at once keep everything from both, and counters can never double-count. Stay signed out and nothing changes: everything lives on your device, offline, as always. Your activation code is NEVER uploaded and sync grants no access — the school slip remains the only door. Your cloud row is private to your sign-in; even this site's public key cannot read it."]
    ];
    var ov = el("div", "overlay hidden"); ov.id = "mpNewOverlay";
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    var h = '<div class="modal"><button class="x icon-btn" type="button" aria-label="Close">✕</button>' +
      '<h3>✨ What is new in v' + V + '</h3>' +
      '<p style="color:var(--mut);font-size:.85rem;margin:2px 0 12px">Everything below is stored on your device. Nothing is uploaded — unless you connect Cloud Sync yourself.</p>' +
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
      var sy = el("button", "lab-tile");
      sy.type = "button"; sy.id = "mpSyncTile";
      sy.innerHTML = '<b class="li">🔁</b><span class="lt">Sync code</span>' +
        '<small class="lc">Carry progress to another phone · no server</small>';
      on(sy, "click", function () { openSync(); });
      g.appendChild(sy);
      var t = el("button", "lab-tile");
      t.type = "button"; t.id = "mpHubTile";
      t.innerHTML = '<b class="li">🚀</b><span class="lt">App Centre</span>' +
        '<small class="lc">Install · data saver · storage · app health</small>';
      on(t, "click", function () { openHub(); });
      g.appendChild(t);
      mark("tile", true);
    } catch (e) {}
  }

  /* =====================================================================
     v44 "Carry" — cross-device progress transfer, no backend.
     Export: backupPayload() -> JSON -> gzip -> base64url  ("MAMSS1.…")
             (browsers without CompressionStream fall back to plain
              base64url, prefixed "MAMSS0.…")
     Import: accepts a sync code, OR a raw .json backup pasted in, OR a file.
             Applies with the app's own merge mode, so papers already on the
             target device are kept and de-duplicated by timestamp.
     ===================================================================== */
  var SYNC_ID = "mpSyncOverlay";

  function b64urlFromBytes(bytes) {
    var bin = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function bytesFromB64url(str) {
    var b = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    var bin = atob(b), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8Bytes(str) { return new TextEncoder().encode(str); }
  function utf8Text(bytes) { return new TextDecoder("utf-8").decode(bytes); }

  function makeCode() {
    var payload;
    try { payload = window.backupPayload(); } catch (e) { T("Could not read your progress", "⚠️"); return; }
    if (!payload || !payload.data || !Object.keys(payload.data).length) {
      T("Nothing to carry yet — sit a paper first", "🌱"); return;
    }
    var json = JSON.stringify(payload);
    var show = function (code, kind) {
      var ta = $("mpSyncCode"); if (!ta) return;
      ta.value = code;
      var meta = $("mpSyncMeta");
      var papers = 0;
      try { Object.keys(payload.data).forEach(function (k) {
        if (/^nssc_attempts_/.test(k) && Array.isArray(payload.data[k])) papers += payload.data[k].length;
      }); } catch (e) {}
      if (meta) meta.innerHTML = "<b>" + (payload.profile && payload.profile.name ? esc_(payload.profile.name) : "guest") +
        "</b> · " + papers + " paper" + (papers === 1 ? "" : "s") + " · " +
        (json.length / 1024).toFixed(1) + " KB of progress → <b>" + (code.length / 1024).toFixed(1) +
        " KB code</b>" + (kind === "plain" ? " · uncompressed (this browser cannot compress)" : "");
      var dl = $("mpSyncDl"); if (dl) dl.disabled = false;
      var cp = $("mpSyncCopy"); if (cp) cp.disabled = false;
      if (code.length > 24000) {
        var hint = $("mpSyncHint");
        if (hint) hint.innerHTML = "This code is long (" + (code.length / 1024).toFixed(0) +
          " KB). Copying still works, but <b>Save as file</b> is more comfortable for a history this big.";
      }
      try { st.set("nssc_lastbackup", Date.now()); } catch (e) {}
      mark("sync", true);
    };
    if (window.CompressionStream) {
      try {
        var cs = new CompressionStream("gzip");
        var w = cs.writable.getWriter();
        w.write(utf8Bytes(json)); w.close();
        new Response(cs.readable).arrayBuffer().then(function (ab) {
          show("MAMSS1." + b64urlFromBytes(new Uint8Array(ab)), "gzip");
        }).catch(function () { show("MAMSS0." + b64urlFromBytes(utf8Bytes(json)), "plain"); });
        return;
      } catch (e) {}
    }
    show("MAMSS0." + b64urlFromBytes(utf8Bytes(json)), "plain");
  }
  function esc_(t) { return String(t == null ? "" : t).replace(/[<>&"]/g, function (c) {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }); }

  function copyCode() {
    var ta = $("mpSyncCode"); if (!ta || !ta.value) return;
    var done = function () { T("Sync code copied — paste it on your other device", "📋"); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand("copy"); done(); }); return; }
    } catch (e) {}
    try { ta.select(); document.execCommand("copy"); done(); } catch (e) { T("Select the code and copy it manually", "ℹ️"); }
  }
  function downloadCode() {
    var ta = $("mpSyncCode"); if (!ta || !ta.value) return;
    try {
      var d = new Date();
      var name = "MAMSS-Sync-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".mamss";
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ta.value], { type: "text/plain" }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      T("Saved as " + name, "💾");
    } catch (e) { T("Could not save the file", "⚠️"); }
  }

  function decodeCode(text) {
    var t = String(text || "").trim();
    if (!t) throw new Error("empty");
    if (t.charAt(0) === "{") return JSON.parse(t);                 /* raw .json backup pasted in */
    if (t.indexOf("MAMSS1.") === 0) {
      if (!window.DecompressionStream) throw new Error("This browser cannot decompress a compressed code. Use the file from the other device instead.");
      var bytes = bytesFromB64url(t.slice(7));
      var ds = new DecompressionStream("gzip");
      var w = ds.writable.getWriter();
      w.write(bytes); w.close();
      return new Response(ds.readable).arrayBuffer().then(function (ab) {
        return JSON.parse(utf8Text(new Uint8Array(ab)));
      });
    }
    if (t.indexOf("MAMSS0.") === 0) return JSON.parse(utf8Text(bytesFromB64url(t.slice(7))));
    throw new Error("That does not look like a MAMSS sync code");
  }

  function importPreview(text) {
    var out = $("mpSyncImportOut");
    var render = function (obj) {
      if (!obj || !obj.data) throw new Error("the code has no study data in it");
      var papers = 0, keys = Object.keys(obj.data);
      keys.forEach(function (k) { if (/^nssc_attempts_/.test(k) && Array.isArray(obj.data[k])) papers += obj.data[k].length; });
      window.__mpSyncPending = obj;
      if (out) out.innerHTML = '<span class="mp-ok">✔ code read</span> · ' +
        (obj.profile && obj.profile.name ? esc_(obj.profile.name) : "guest") + " · " +
        papers + " paper" + (papers === 1 ? "" : "s") + " · exported " +
        (obj.exported ? new Date(obj.exported).toLocaleDateString() : "?") +
        '<div style="margin-top:8px"><button class="mp-btn gold" id="mpSyncApply" type="button">Merge into this device</button></div>';
      on($("mpSyncApply"), "click", applyImport);
    };
    try {
      var r = decodeCode(text);
      if (r && typeof r.then === "function") r.then(render).catch(function (e) { fail_(e, out); });
      else render(r);
    } catch (e) { fail_(e, out); }
  }
  function fail_(e, out) {
    window.__mpSyncPending = null;
    if (out) out.innerHTML = '<span class="mp-bad">✘ ' + esc_(e && e.message ? e.message : e) + "</span>";
  }
  function applyImport() {
    var obj = window.__mpSyncPending;
    if (!obj) { T("Read a code first", "ℹ️"); return; }
    if (!window.confirm("Merge this progress into this device? Papers already here are kept; duplicates are skipped. This cannot be undone.")) return;
    try {
      window.applyBackup(obj, "merge");
      window.__mpSyncPending = null;
      T("Progress merged — refreshing…", "🎉");
      setTimeout(function () { location.reload(); }, 900);
    } catch (e) { T("Could not apply the code: " + (e && e.message), "⚠️"); }
  }
  function pickSyncFile(input) {
    var f = input && input.files && input.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var ta = $("mpSyncIn"); if (ta) ta.value = String(fr.result || "");
      importPreview(String(fr.result || ""));
    };
    fr.onerror = function () { T("Could not read that file", "⚠️"); };
    fr.readAsText(f);
  }

  function buildSync() {
    if ($(SYNC_ID)) return $(SYNC_ID);
    var ov = el("div", "overlay hidden");
    ov.id = SYNC_ID;
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Carry your progress");
    ov.innerHTML =
      '<div class="modal wide"><button class="x icon-btn" type="button" aria-label="Close">✕</button>' +
      '<h3>🔁 Carry your progress</h3>' +
      '<p style="color:var(--mut);font-size:.82rem;margin:0 0 14px">Everything below happens on this device. ' +
      'The code is your data, compressed — send it to yourself by any means you like.</p>' +
      '<div class="mp-sec"><h4>1 · From this device</h4>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<button class="mp-btn pri" id="mpSyncMake" type="button">Make my code</button>' +
      '<button class="mp-btn" id="mpSyncCopy" type="button" disabled>Copy</button>' +
      '<button class="mp-btn" id="mpSyncDl" type="button" disabled>Save as file</button></div>' +
      '<div id="mpSyncMeta" style="font-size:.78rem;color:var(--mut);margin:9px 0 6px"></div>' +
      '<textarea id="mpSyncCode" class="mp-log" readonly spellcheck="false" rows="5" ' +
      'style="width:100%;resize:vertical;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace" ' +
      'placeholder="Your code appears here…"></textarea>' +
      '<div id="mpSyncHint" style="font-size:.76rem;color:var(--gold,#c9a227);margin-top:6px"></div></div>' +
      '<div class="mp-sec"><h4>2 · Into this device</h4>' +
      '<textarea id="mpSyncIn" class="mp-log" spellcheck="false" rows="4" style="width:100%;resize:vertical;' +
      'font:11px/1.5 ui-monospace,Menlo,Consolas,monospace" ' +
      'placeholder="Paste a sync code here — or a whole .json backup"></textarea>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:9px">' +
      '<button class="mp-btn pri" id="mpSyncRead" type="button">Read code</button>' +
      '<label class="mp-btn" style="cursor:pointer">Choose file…' +
      '<input type="file" id="mpSyncFile" accept=".mamss,.json,.txt,application/json,text/plain" hidden></label></div>' +
      '<div id="mpSyncImportOut" style="font-size:.8rem;margin-top:10px"></div></div>' +
      '</div>';
    on(ov, "click", function (e) { if (e.target === ov) ov.classList.add("hidden"); });
    on(ov.querySelector(".x"), "click", function () { ov.classList.add("hidden"); });
    document.body.appendChild(ov);
    on($("mpSyncMake"), "click", makeCode);
    on($("mpSyncCopy"), "click", copyCode);
    on($("mpSyncDl"), "click", downloadCode);
    on($("mpSyncRead"), "click", function () { var ta = $("mpSyncIn"); importPreview(ta && ta.value); });
    on($("mpSyncFile"), "change", function () { pickSyncFile($("mpSyncFile")); });
    return ov;
  }
  function openSync() {
    try { buildSync().classList.remove("hidden"); } catch (e) { T("Sync could not open", "⚠️"); }
  }
  window.openMpSync = openSync;

  /* =====================================================================
     v45 "Roll Call" — school-issued activation codes.
     The public half (docs/codes.js) holds salted SHA-256 hashes only; the
     plaintext list stays offline with the school. A code activates one
     profile and is single-use PER DEVICE (enforced in localStorage — with no
     backend that is the honest limit, and the App Centre says so).
     Policy "codes": a fresh device must enter a valid code before sign-up or
     Google sign-in is offered. Policy "open": codes are optional.
     Fail-open: no list, no crypto.subtle, or a fetch error => the lock is
     released and the normal free sign-up works. Never strand a student.
     ===================================================================== */
  var CODES = null, CODES_STATE = "loading";

  function normCode(t) { return String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function maskCode(t) {
    var n = normCode(t);
    return n.length > 10 ? n.slice(0, 9) + "···" + n.slice(-4) : n;
  }
  var CODE_QUEUE = [];
  function whenCodes(fn) {
    if (CODES_STATE === "loading") { CODE_QUEUE.push(fn); return false; }
    fn(); return true;
  }
  function hashCode(code) {
    if (!CODES || !CODES.salt || !CODES.list) return Promise.reject(new Error("no code list"));
    var data = new TextEncoder().encode(CODES.salt + "|" + normCode(code));
    return crypto.subtle.digest("SHA-256", data).then(function (b) {
      var a = new Uint8Array(b), h = "";
      for (var i = 0; i < a.length; i++) h += (a[i] < 16 ? "0" : "") + a[i].toString(16);
      return h;
    });
  }
  function isActivated() { return !!st.get("nssc_act", null); }
  function actInfo() { return st.get("nssc_act", null); }

  function loadCodes(done) {
    var sc = document.createElement("script");
    sc.src = "codes.js"; sc.async = true;
    sc.onload = function () {
      CODES = window.MAMSS_CODES || null;
      if (!CODES || !CODES.list || !CODES.list.length) { CODES_STATE = "missing"; listUnreachable(); }
      else if (CODES.policy === "open") { CODES_STATE = "open"; openAccess(); }
      else if (!(window.crypto && crypto.subtle)) {
        CODES_STATE = "nocrypto";
        lockFeedback("This browser cannot verify school codes. Please open MAMSS PREP in an up-to-date browser (Chrome, Edge, Firefox or Safari).", "bad");
      }
      else CODES_STATE = "ok";
      paintCodeUi();
      done && done();
      flushQueue();
    };
    sc.onerror = function () { CODES = null; CODES_STATE = "missing"; listUnreachable(); done && done(); flushQueue(); };
    document.head.appendChild(sc);
    /* No fail-open: if the list neither loads nor errors (flaky network, blocked
       request, aggressive proxy) the lock stays shut and keeps retrying. The
       school's own escape hatch is policy "open", not a network accident. */
    setTimeout(function () {
      if (CODES_STATE === "loading") { CODES_STATE = "missing"; listUnreachable(); done && done(); flushQueue(); }
    }, 4000);
  }
  var RETRY_MS = [5000, 15000, 45000, 120000];
  var retryN = 0;
  function listUnreachable() {
    lockFeedback("Can't reach the school code list. Check your connection — trying again automatically…", "bad");
    scheduleRetry();
  }
  function scheduleRetry() {
    if (CODES_STATE === "ok" || CODES_STATE === "open") return;
    var wait = RETRY_MS[Math.min(retryN, RETRY_MS.length - 1)]; retryN++;
    setTimeout(function () {
      if (CODES_STATE === "ok" || CODES_STATE === "open") return;
      CODES_STATE = "loading";
      loadCodes(function () { retryN = 0; });
    }, wait);
  }
  function openAccess() {
    try { document.documentElement.classList.remove("mp-codes-pending"); } catch (e) {}
    try { document.documentElement.classList.add("mp-code-ok"); } catch (e) {}
    var l = $("mpLock"); if (l) l.hidden = true;
  }
  function flushQueue() {
    var q = CODE_QUEUE.slice(); CODE_QUEUE = [];
    for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
  }
  function releaseLock() {
    try { document.documentElement.classList.remove("mp-codes-pending"); } catch (e) {}
  }
  function hideLock() {
    var l = $("mpLock"); if (l) l.hidden = true;
    try { document.documentElement.classList.add("mp-code-ok"); } catch (e) {}
    releaseLock();
  }
  function lockFeedback(msg, kind) {
    var f = $("mpLockFb"); if (!f) return;
    f.className = kind || ""; f.setAttribute("data-t", "1"); f.textContent = msg;
  }

  /* The redesign ships a guest path, so the lock is a full-screen layer of its
     own: while it is up, nothing underneath can be reached. */
  function runLockFlow() {
    var n = $("mpLockName"), c = $("mpLockCode");
    var name = n ? String(n.value || "").trim() : "";
    var code = c ? c.value : "";
    if (!normCode(code)) { lockFeedback("Type the code from your slip, then activate it.", "bad"); c && c.focus(); return; }
    if (!name) { lockFeedback("Add your full name first — the code is tied to your study account.", "bad"); n && n.focus(); return; }
    if (CODES_STATE === "loading") { CODE_QUEUE.push(runLockFlow); lockFeedback("Checking your school's code list…", ""); return; }
    if (CODES_STATE !== "ok") {
      lockFeedback(CODES_STATE === "loading" ? "Checking your school's code list…" : "The school code list is not reachable from this device yet — check the connection and try again.", "bad");
      return;
    }
    redeem(code).then(function (res) {
      if (res.r === "unknown") { lockFeedback("✘ That code is not on this school's list. Check the slip — O and 0, I and 1 look alike.", "bad"); return; }
      if (res.r === "used") { lockFeedback("✘ That code was already used on this device. Ask your teacher for another slip.", "bad"); return; }
      if (res.r === "elsewhere") { lockFeedback("✘ That slip was already activated on another device" + (res.at ? " on " + new Date(res.at).toLocaleDateString() : "") + ". Ask your teacher for your own slip.", "bad"); return; }
      if (res.r === "provisional") { /* fall through to activation; sync later */ }
      hideLock();
      lockFeedback(res.r === "same" ? "✔ This device is already activated — welcome back." : res.r === "provisional" ? "✔ Code accepted (offline — will confirm with the school ledger)…" : "✔ Code accepted — opening your books…", "ok");
      mark("codes", true);
      try {
        if (res.r !== "same" && typeof window.createStudyAccount === "function" && !st.get("nssc_user", null))
          window.createStudyAccount(name, "");
      } catch (e) {}
      try {                                    /* prestige card: keep the member's name on the activation record */
        var ax = st.get("nssc_act", null);
        if (ax && !ax.name) { ax.name = name; st.set("nssc_act", ax); }
      } catch (e) {}
      paintCodeUi(); renderHubSafe();
      try { if (typeof toast === "function") toast("Welcome to MAMSS PREP, " + name.split(" ")[0] + "!", "🎉"); } catch (e) {}
    }).catch(function () { lockFeedback("✘ Could not check the code on this browser.", "bad"); });
  }

  function showLock() {
    var l = $("mpLock");
    if (l) l.hidden = false;
    try { document.documentElement.classList.add("mp-codes-pending"); } catch (e) {}
    try {
      var f = $("mpLockName"), c = $("mpLockCode");
      var t = (f && !f.value) ? f : c;
      if (t) setTimeout(function () { t.focus({ preventScroll: true }); }, 60);
    } catch (e) {}
  }

  function wireLock() {
    on($("mpLockBtn"), "click", runLockFlow);
    /* the redesign's own entry points must not bypass the roll call */
    ["signUpGuest", "gateSignUp"].forEach(function (fn) {
      if (typeof window[fn] === "function" && !window["__mpWrapped" + fn]) {
        window["__mpWrapped" + fn] = true;
        var orig = window[fn];
        window[fn] = function () {
          if (CODES_STATE === "ok" && !isActivated()) { showLock(); return; }
          return orig.apply(null, arguments);
        };
      }
    });
    if (CODES_STATE === "open") openAccess();
    else if (!isActivated()) showLock();
  }

  /* =====================================================================
     School ledger (Supabase) — makes a slip truly single-use ACROSS devices.
     codes.js may carry ledger:{url,key}; the anon key is public by design and
     row-level security allows insert-once (primary key) + read only.
     Offline classroom: the device activates provisionally (act.pending) and
     reconciles on the next boot / online event; a slip that another phone
     claimed first revokes the provisional activation.
     Diagnostic/test hook: localStorage "nssc_ledger_cfg" = {url,key}.
     ===================================================================== */
  function ledgerCfg() {
    try {
      var o = st.get("nssc_ledger_cfg", null);
      if (o && o.url) return o;
    } catch (e) {}
    return (CODES && CODES.ledger && CODES.ledger.url) ? CODES.ledger : null;
  }
  function deviceId() {
    var d = st.get("nssc_devid", null);
    if (!d) { d = (window.uid ? uid() : String(Math.random()).slice(2)) + "-" + String(Date.now().toString(36)); st.set("nssc_devid", d); }
    return d;
  }
  /* v54: true batch resolution by position in the public list (batchRanges),
     with the legacy last-batch label as fallback. A batch named TEACHER-*
     grants the teacher role used by the Live CBT Hall. */
  function batchOf(h) {
    try {
      var i = CODES && CODES.list ? CODES.list.indexOf(h) : -1;
      var rs = CODES && CODES.batchRanges;
      if (i > -1 && rs && rs.length) {
        for (var k = 0; k < rs.length; k++) {
          if (i >= rs[k][0] && i < rs[k][1]) return (CODES.batches && CODES.batches[k]) || "";
        }
      }
    } catch (e) {}
    return ((CODES && CODES.batches) || []).slice(-1)[0] || "";
  }
  function roleOf(batch) { return /^teacher/i.test(batch || "") ? "teacher" : "student"; }
  function roleOfHash(h) { return roleOf(batchOf(h)); }

  function ledgerHeaders(cfg) {
    return { "apikey": cfg.key, "Authorization": "Bearer " + cfg.key, "Content-Type": "application/json", "Prefer": "return=representation" };
  }
  function ledgerClaim(cfg, h) {
    return fetch(cfg.url + "/rest/v1/code_redemptions", {
      method: "POST", headers: ledgerHeaders(cfg),
      body: JSON.stringify([{ code_hash: h, device_id: deviceId(), device_label: (function () { try { return (st.get("nssc_user", null) || {}).name || ""; } catch (e) { return ""; } })(), batch: batchOf(h) }])
    }).then(function (r) {
      if (r.ok) return { r: "ok" };
      if (r.status === 409 || r.status === 400) return ledgerWho(cfg, h);
      throw new Error("ledger " + r.status);
    });
  }
  function ledgerWho(cfg, h) {
    return fetch(cfg.url + "/rest/v1/code_redemptions?code_hash=eq." + encodeURIComponent(h) + "&select=device_id,redeemed_at", {
      headers: { "apikey": cfg.key, "Authorization": "Bearer " + cfg.key }
    }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      if (rows && rows.length && rows[0].device_id === deviceId()) return { r: "mine", at: rows[0].redeemed_at };
      return { r: "elsewhere", at: (rows && rows[0] && rows[0].redeemed_at) || null };
    });
  }

  function redeemWithLedger(code) {
    var cfg = ledgerCfg();
    return hashCode(code).then(function (h) {
      if (!CODES || !CODES.list || CODES.list.indexOf(h) === -1) return { r: "unknown", h: h };
      var used = st.get("nssc_act_used", []) || [], act = st.get("nssc_act", null);
      if (act && act.h === h.slice(0, 16)) return { r: "same", h: h };
      if (used.indexOf(h) > -1) return { r: "used", h: h };
      if (!cfg) {                                   /* no ledger: per-device rule */
        used.push(h); st.set("nssc_act_used", used);
        st.set("nssc_act", { h: h.slice(0, 16), mask: maskCode(code), at: Date.now(), batch: batchOf(h), role: roleOfHash(h) });
        return { r: "ok", h: h };
      }
      return ledgerClaim(cfg, h).then(function (res) {
        if (res.r === "ok" || res.r === "mine") {
          used.push(h); st.set("nssc_act_used", used);
          st.set("nssc_act", { h: h.slice(0, 16), mask: maskCode(code), at: Date.now(), batch: batchOf(h), role: roleOfHash(h), ledger: true });
          return { r: "ok", h: h };
        }
        if (res.r === "elsewhere") return { r: "elsewhere", h: h, at: res.at };
        return { r: "used", h: h };
      }).catch(function () {                       /* offline classroom */
        used.push(h); st.set("nssc_act_used", used);
        st.set("nssc_act", { h: h.slice(0, 16), mask: maskCode(code), at: Date.now(), batch: batchOf(h), role: roleOfHash(h), pending: true, fh: h });
        return { r: "provisional", h: h };
      });
    });
  }

  function syncPendingLedger() {
    var cfg = ledgerCfg(); var act = st.get("nssc_act", null);
    if (!cfg || !act || !act.pending) return Promise.resolve(null);
    if (typeof navigator !== "undefined" && navigator.onLine === false) return Promise.resolve(null);
    var h = act.fh;
    if (!h) { var a2 = Object.assign({}, act); delete a2.pending; st.set("nssc_act", a2); return Promise.resolve(null); }
    return ledgerClaim(cfg, h).then(function (res) {
      if (res.r === "ok" || res.r === "mine") {
        var a = Object.assign({}, st.get("nssc_act", null) || {}); delete a.pending; delete a.fh; a.ledger = true;
        st.set("nssc_act", a);
        return "confirmed";
      }
      if (res.r === "elsewhere") {
        /* another phone owns this slip: revoke the provisional activation */
        var used = (st.get("nssc_act_used", []) || []).filter(function (x) { return x !== h; });
        st.set("nssc_act_used", used);
        st.del("nssc_act");
        showLock();
        lockFeedback("✘ This slip was activated on another device" + (res.at ? " on " + new Date(res.at).toLocaleDateString() : "") + ". This device has been signed out — ask your teacher for your own slip.", "bad");
        try { if (typeof toast === "function") toast("Activation revoked — slip belongs to another device", "⚠️"); } catch (e) {}
        return "revoked";
      }
      return null;
    }).catch(function () { return null; });
  }

  /* ================= v47 World-First Studio (lazy exclusive.js) ========= */
  var EXQ = [], EX_LOADING = false;
  function loadExclusive(fn) {
    if (window.MP_EXCLUSIVE && window.MP_EXCLUSIVE.ready) { fn && fn(); return; }
    if (fn) EXQ.push(fn);
    if (EX_LOADING) return;
    EX_LOADING = true;
    var sc = document.createElement("script");
    sc.src = "exclusive.js"; sc.async = true;
    sc.onload = function () {
      EX_LOADING = false;
      var q = EXQ.slice(); EXQ = [];
      for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
    };
    sc.onerror = function () { EX_LOADING = false; T("Could not load the World-First Studio", "⚠️"); };
    document.head.appendChild(sc);
  }
  function openStudio(which) {
    loadExclusive(function () {
      var fn = which === "oral" ? window.openMpOral : which === "palace" ? window.openMpPalace
        : which === "arena" ? window.openMpArena : which === "cmd" ? window.openMpCommand : window.openMpAutopilot;
      try { fn && fn(); } catch (e) {}
    });
  }
  function wireStudio() {
    on($("mpOralOpen"), "click", function () { openStudio("oral"); });
    on($("mpPalOpen"), "click", function () { openStudio("palace"); });
    on($("mpArenaOpen"), "click", function () { openStudio("arena"); });
    on($("mpAutoOpen"), "click", function () { openStudio("auto"); });
    on($("mpCmdOpen"), "click", function () { openStudio("cmd"); });
  }

  function hubFab() {


    if ($("mpHubFab")) return;
    var b = document.createElement("button");
    b.id = "mpHubFab"; b.type = "button"; b.textContent = "🎛️";
    b.title = "App Centre"; b.setAttribute("aria-label", "App Centre");
    b.onclick = function () { try { openMpHub(); } catch (e) {} };
    document.body.appendChild(b);
  }

  function paintCodeUi() {
    var wrap = $("gateCodeWrap"), fb = $("gateCodeFb");
    if (!wrap) return;
    if (CODES_STATE === "missing" || CODES_STATE === "nocrypto") {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";
    if (fb && fb.getAttribute("data-t") === "1") return;
    if (isActivated() && fb) {
      var a = actInfo();
      fb.className = "gate-code-fb ok";
      fb.textContent = "✔ this device is activated (" + (a && a.mask ? a.mask : "school code") + ")";
    }
  }

  function redeem(code) { return redeemWithLedger(code); }

  function gateFeedback(msg, kind) {
    var fb = $("gateCodeFb"); if (!fb) return;
    fb.className = "gate-code-fb " + (kind || "");
    fb.setAttribute("data-t", "1");
    fb.textContent = msg;
  }

  function runCodeFlow(after) {
    var input = $("gateCode");
    var code = input ? input.value : "";
    if (!normCode(code)) { gateFeedback("Type the code from your slip, then activate it.", "bad"); input && input.focus(); return; }
    var name = $("gateName");
    if (!name || !String(name.value || "").trim()) {
      gateFeedback("Add your full name first — the code is tied to your study account.", "bad");
      name && name.focus(); return;
    }
    if (CODES_STATE === "loading") {            /* defer, never recurse */
      CODE_QUEUE.push(function () { runCodeFlow(after); });
      gateFeedback("Checking your school's code list…", "");
      return;
    }
    if (CODES_STATE !== "ok") {          /* missing / open / no crypto: fail open */
      releaseLock();
      var g0 = $("gateOverlay"); if (g0) g0.classList.add("mp-code-ok");
      after && after();
      return;
    }
    redeem(code).then(function (res) {
      if (res.r === "unknown") { gateFeedback("✘ That code is not on this school's list. Check the slip — O and 0, I and 1 look alike.", "bad"); return; }
      if (res.r === "used") { gateFeedback("✘ That code was already used on this device. Ask your teacher for another slip.", "bad"); return; }
      var g = $("gateOverlay");
      if (g) g.classList.add("mp-code-ok");
      releaseLock();
      gateFeedback(res.r === "same" ? "✔ This device is already activated — signing you in…" : "✔ Code accepted — opening your books…", "ok");
      mark("codes", true);
      paintCodeUi(); renderHubSafe();
      setTimeout(function () { after && after(); }, 350);
    }).catch(function (e) {
      gateFeedback("✘ Could not check the code on this browser.", "bad");
    });
  }

  function gateCodeRun() { runCodeFlow(function () { try { origSignUp(); } catch (e) {} }); }

  function wireGate() {
    /* the gate button/input carry an inline onclick="mpGateCode()" (added at build
       time) so a tap that lands before this layer boots is queued instead of lost. */
    window.MAMSS_ACT = {
      gate: runLockFlow,
      lock: showLock,
      unlock: hideLock,
      state: function () { return CODES_STATE; },
      activated: isActivated,
      info: actInfo,
      redeem: redeem,
      ledger: ledgerCfg,
      sync: syncPendingLedger,
      studio: openStudio,
      teacher: function () { var a = actInfo(); return !!(a && (a.role === "teacher" || /^teacher/i.test(a.batch || ""))); },
      device: deviceId,
      batchOf: batchOf,
      norm: normCode,
      count: function () { return (CODES && CODES.list && CODES.list.length) || 0; }
    };
    if (window.__mpCodePending) { window.__mpCodePending = 0; gateCodeRun(); }
    /* the CTA and Google paths must respect the policy too */
    if (typeof window.gateSignUp === "function" && !window.__mpSignUpWrapped) {
      window.__mpSignUpWrapped = true;
      origSignUp = window.gateSignUp;
      window.gateSignUp = function () {
        if (CODES_STATE === "ok" && !isActivated()) {
          var g = $("gateOverlay");
          if (g && !g.classList.contains("mp-code-ok")) { runCodeFlow(null); return; }
        }
        return origSignUp.apply(null, arguments);
      };
    }
  }
  var origSignUp = function () {};

  var WA_HREF = "https://wa.me/2348056787685?text=Hello%2C%20I%20need%20an%20activation%20key%20for%20MAMSS%20PREP.";
  function hubActivationRow(html) {
    var a = actInfo();
    html += '<div class="mp-sec"><h4>School activation</h4>';
    if (a) {
      var mName = "";
      try { mName = (a && a.name) || ((st.get("nssc_user", null) || {}).name) || ""; } catch (e) {}
      html += '<div class="mp-prestige" id="mpPrestigeCard">' +
        '<div class="mp-pres-top"><span class="mp-pres-seal" aria-hidden="true">✦</span><span>PRESTIGE EDITION · MEMBERSHIP</span></div>' +
        '<div class="mp-pres-name">' + esc_(mName || "Prestige Member") + '</div>' +
        '<div class="mp-pres-grid">' +
        '<span>Slip</span><b>' + esc_(a.mask || "—") + '</b>' +
        '<span>Issued</span><b>' + (a.at ? esc_(new Date(a.at).toLocaleDateString()) : "—") + '</b>' +
        '<span>Batch</span><b>' + esc_(a.batch || "—") + '</b>' +
        '<span>License</span><b>' + (a.pending ? "Provisional — confirming with the ledger" : a.ledger ? "Ledger-verified · one device" : "One device") + '</b>' +
        '</div>' +
        '<div class="mp-pres-foot">Issued, not sold · limited to 500 numbered slips</div>' +
        '</div>';
      var led = ledgerCfg();
      html += row("act", "🔑", "Activated: <b>" + esc_(a.mask) + "</b>",
        (a.pending ? "⏳ Waiting to confirm with the school ledger · " : led && a.ledger ? "School ledger: live — one slip, one device, enforced across phones · " : led ? "School ledger configured · " : "Single-use on this device · ") +
        (a.at ? new Date(a.at).toLocaleDateString() : "") +
        (a.batch ? " · batch " + esc_(a.batch) : "") +
        (led ? ". The school ledger refuses a slip that any other phone has claimed." : ". Codes are checked on this device only — a code cannot be re-used here, but without the school ledger this app cannot police other devices."), "");
    } else if (CODES_STATE === "ok") {
      html += row("act", "🔑", "Not activated on this device",
        "Enter the code from your paper slip to unlock papers, tools and progress.",
        '<button class="mp-btn pri" id="mpActBtn" type="button">Activate</button>');
      html += '<div class="mp-row" id="mpActInputRow" style="display:none">' +
        '<input class="input" id="mpActInput" placeholder="MAMSS-000000-2026" maxlength="24" ' +
        'autocapitalize="characters" spellcheck="false" style="flex:1">' +
        '<button class="mp-btn gold" id="mpActGo" type="button">Go</button>' +
        '<div id="mpActFb" style="width:100%;font-size:.76rem;font-weight:700;min-height:1em"></div></div>';
    } else {
      html += row("act", "🔓", "Open access", "This installation does not require school codes.", "");
    }
    html += '<p class="mp-pres-contact">📱 Need an activation key? WhatsApp the school office: ' +
      '<a href="' + WA_HREF + '" target="_blank" rel="noopener">08056787685</a></p>' +
      '<p class="mp-pres-contact"><a id="mpWhyLink" href="why.html" target="_blank" rel="noopener">✦ Why MAMSS PREP — share the story with parents &amp; friends</a></p>';
    html += "</div>";
    return html;
  }

  function wireActRow() {
    var b = $("mpActBtn");
    on(b, "click", function () {
      var r = $("mpActInputRow"); if (r) r.style.display = r.style.display === "none" ? "flex" : "none";
      var i = $("mpActInput"); i && i.focus();
    });
    on($("mpActGo"), "click", function () {
      var i = $("mpActInput"), fb = $("mpActFb");
      var code = i ? i.value : "";
      if (!normCode(code)) { if (fb) fb.textContent = "Type a code first"; return; }
      if (CODES_STATE !== "ok") { if (fb) { fb.className = "mp-bad"; fb.textContent = "No code list on this device"; } return; }
      redeem(code).then(function (res) {
        if (!fb) return;
        if (res.r === "unknown") { fb.className = "mp-bad"; fb.textContent = "✘ not on this school's list"; return; }
        if (res.r === "used") { fb.className = "mp-bad"; fb.textContent = "✘ already used on this device"; return; }
        fb.className = "mp-ok"; fb.textContent = "✔ activated";
        releaseLock();
        var g = $("gateOverlay"); if (g) g.classList.add("mp-code-ok");
        paintCodeUi(); T("This device is activated — welcome", "🔑");
        setTimeout(renderHub, 500);
      }).catch(function () { if (fb) { fb.className = "mp-bad"; fb.textContent = "✘ could not check the code"; } });
    });
  }

  /* ------------------------------------------------------------- boot */
  function boot() {
    try {
      wireGate(); wireLock(); hubFab();
      loadCodes(function () { syncPendingLedger(); });
      try { window.addEventListener("online", function () { syncPendingLedger(); retryN = 0; scheduleRetry(); }); } catch (e) {}
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
