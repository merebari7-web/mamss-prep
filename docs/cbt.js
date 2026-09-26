/* MAMSS PREP v54 — "Live CBT Hall" ==========================================
   Real-time teacher-posted examinations on top of the EXISTING architecture:
   • backend  : the school's live Supabase project (same one as the slip
                ledger — config comes from MAMSS_CODES.ledger, no new keys),
                tables created by tools/cbt_schema.sql
   • realtime : Supabase Realtime broadcast channel per session, with a
                2.5 s REST poll as the correctness backbone (and full fallback
                if the socket cannot connect). Broadcasts only say "something
                changed" — Postgres stays the single source of truth.
   • identity : the student's existing activation (MAMSS_ACT.info(): name +
                masked slip + device id). No separate signup, ever.
   • teachers : activation slips from a TEACHER-* batch (MAMSS_ACT.teacher()).
   • timing   : server-authoritative (Postgres trigger stamps ends_at);
                refresh/reopen cannot reset the clock.
   • answers  : persisted the instant each one is given; the answers primary
                key (session, device, q_idx) makes "no going back" a database
                rule, not just a UI rule; the attempts primary key makes
                "one attempt per device per session" a database rule too.
   Anti-cheat: tab-switch/blur logging with a forgiving 1.2 s accidental-bounce
   grace, escalation warnings, auto-submit at 5 logged events, copy/paste and
   context-menu suppressed on the question card (disabled automatically when
   the student uses Readable accessibility mode — a11y wins over anti-cheat).
   Honest caveats live in UPGRADE.md §16 (public-key trust model, clock skew).
   ========================================================================== */
(function () {
  "use strict";
  if (window.MAMSS_CBT) return;

  var VERSION = "55";
  var CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";   // no 0/O, 1/I/L
  var POLL_MS = 2500, POLL_HIDDEN_MS = 6000, HEARTBEAT_MS = 25000;
  var INTEGRITY_LIMIT = 5, INTEGRITY_GRACE_MS = 1200;
  var st = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------------------------------------------------------------- utils */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }
  function normCode(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function prettyCode(c) { c = normCode(c); return c.length === 6 ? c.slice(0, 3) + "-" + c.slice(3) : c; }
  function makeCode() {
    var s = "";
    for (var i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return s;
  }
  function fmtClock(ms) {
    if (!isFinite(ms) || ms <= 0) return "0:00";
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s %= 60;
    if (m >= 60) { var h = Math.floor(m / 60); m %= 60; return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + " min" + (s ? " " + s + " s" : ""); }

  /* ------------------------------------------------------- Supabase REST */
  function cfg() {
    var c = window.MAMSS_CODES && window.MAMSS_CODES.ledger;
    return c && c.url && c.key ? c : null;
  }
  function rest(path, opts) {
    var c = cfg();
    if (!c) return Promise.reject(new Error("no-config"));
    opts = opts || {};
    var h = { "apikey": c.key, "Authorization": "Bearer " + c.key, "Content-Type": "application/json" };
    if (opts.prefer) h["Prefer"] = opts.prefer;
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var to = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000) : null;
    return fetch(c.url + "/rest/v1/" + path, {
      method: opts.method || "GET", headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (to) clearTimeout(to);
      if (r.status === 204) return { ok: true, status: 204, json: null };
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        return { ok: r.ok, status: r.status, json: j };
      });
    });
  }
  function isMissingTables(res) {
    if (!res || res.ok) return false;
    var m = String((res.json && (res.json.message || res.json.hint)) || "");
    return res.status === 404 || /PGRST205|could not find the table|relation .* does not exist/i.test(m);
  }
  /* table helpers */
  function getSession(code) {
    return rest("cbt_sessions?code=eq." + encodeURIComponent(normCode(code)) + "&select=*").then(function (r) {
      if (isMissingTables(r)) throw setupError();
      return r.ok && r.json && r.json[0] ? r.json[0] : null;
    });
  }
  function createSession(row) {
    return rest("cbt_sessions", { method: "POST", body: row, prefer: "return=minimal" });
  }
  function patchSession(code, patch) {
    return rest("cbt_sessions?code=eq." + encodeURIComponent(normCode(code)), { method: "PATCH", body: patch, prefer: "return=minimal" });
  }
  function joinAttempt(row) {
    return rest("cbt_attempts", { method: "POST", body: row, prefer: "return=minimal" });
  }
  function getAttempt(code, did) {
    return rest("cbt_attempts?session_code=eq." + encodeURIComponent(normCode(code)) + "&device_id=eq." + encodeURIComponent(did) + "&select=*")
      .then(function (r) { return r.ok && r.json && r.json[0] ? r.json[0] : null; });
  }
  function patchAttempt(code, did, patch) {
    return rest("cbt_attempts?session_code=eq." + encodeURIComponent(normCode(code)) + "&device_id=eq." + encodeURIComponent(did),
      { method: "PATCH", body: patch, prefer: "return=minimal" });
  }
  function getAttempts(code) {
    return rest("cbt_attempts?session_code=eq." + encodeURIComponent(normCode(code)) + "&select=*&order=joined_at.asc")
      .then(function (r) { return r.ok && Array.isArray(r.json) ? r.json : []; });
  }
  function saveAnswer(row) {
    return rest("cbt_answers", { method: "POST", body: row, prefer: "return=minimal" });
  }
  function getMyAnswers(code, did) {
    return rest("cbt_answers?session_code=eq." + encodeURIComponent(normCode(code)) + "&device_id=eq." + encodeURIComponent(did) + "&select=*&order=q_idx.asc")
      .then(function (r) { return r.ok && Array.isArray(r.json) ? r.json : []; });
  }
  function getAllAnswers(code) {
    return rest("cbt_answers?session_code=eq." + encodeURIComponent(normCode(code)) + "&select=*")
      .then(function (r) { return r.ok && Array.isArray(r.json) ? r.json : []; });
  }
  function setupError() { var e = new Error("setting-up"); e.setup = true; return e; }

  /* --------------------------------------------- realtime room (WS+poll) */
  function LiveRoom(code, onChange) {
    var self = this;
    this.code = normCode(code); this.onChange = onChange; this.ws = null; this.dead = false;
    this.ref = 1; this.timer = 0; this.hb = 0; this.closed = false;
    if (!window.__CBT_FORCE_POLL) {
      try {
        var c = cfg();
        var url = window.__CBT_WS_URL || (c.url.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(c.key) + "&vsn=1.0.0");
        var ws = new WebSocket(url); this.ws = ws;
        ws.onopen = function () {
          ws.send(JSON.stringify({ topic: "realtime:cbt-" + self.code, event: "phx_join", ref: String(self.ref++), join_ref: "1", payload: { config: { broadcast: { self: true } } } }));
          self.hb = setInterval(function () {
            if (ws.readyState === 1) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", ref: String(self.ref++), payload: {} }));
          }, HEARTBEAT_MS);
        };
        ws.onmessage = function (ev) {
          var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (m.event === "broadcast" && m.topic === "realtime:cbt-" + self.code) {
            var p = (m.payload && m.payload.payload) || {};
            self.onChange(p.kind || "ping", p);
          } else if (m.event === "phx_reply" && m.payload && m.payload.status === "error") {
            self.killSocket();
          }
        };
        ws.onerror = function () { self.killSocket(); };
        ws.onclose = function () { self.killSocket(); };
      } catch (e) { this.killSocket(); }
    }
    this.arm();
    document.addEventListener("visibilitychange", function () { if (!self.closed) self.arm(); });
  }
  LiveRoom.prototype.killSocket = function () {
    this.dead = true;
    if (this.hb) { clearInterval(this.hb); this.hb = 0; }
    try { this.ws && this.ws.close(); } catch (e) {}
    this.ws = null;
  };
  LiveRoom.prototype.arm = function () {
    if (this.timer) clearInterval(this.timer);
    var ms = document.hidden ? POLL_HIDDEN_MS : POLL_MS;
    var self = this;
    this.timer = setInterval(function () { self.onChange("poll", {}); }, ms);
  };
  LiveRoom.prototype.notify = function (kind, extra) {
    var p = { kind: kind, sid: this.code, did: me().did };
    if (extra) for (var k in extra) p[k] = extra[k];
    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(JSON.stringify({ topic: "realtime:cbt-" + this.code, event: "broadcast", ref: String(this.ref++), payload: { type: "cbt", event: kind, payload: p } }));
      } catch (e) {}
    }
  };
  LiveRoom.prototype.close = function () {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.killSocket();
  };

  /* ------------------------------------------------------------- identity */
  function me() {
    var a = null, u = null;
    try { a = (window.MAMSS_ACT && MAMSS_ACT.info && MAMSS_ACT.info()) || null; } catch (e) {}
    try { u = st.get("nssc_user", null); } catch (e) {}
    var did = "dev";
    try { did = (window.MAMSS_ACT && MAMSS_ACT.device && MAMSS_ACT.device()) || st.get("nssc_devid", "dev"); } catch (e) {}
    var teacher = false;
    try { teacher = !!(window.MAMSS_ACT && MAMSS_ACT.teacher && MAMSS_ACT.teacher()); } catch (e) {}
    return {
      name: (a && a.name) || (u && u.name) || "Student",
      slip: (a && a.mask) || "",
      did: did, teacher: teacher,
      readable: !!(st.get("nssc_acc", {}) || {}).readable
    };
  }
  function whenBank(cb) {
    if (typeof CLASSES !== "undefined" && CLASSES && CLASSES.length) return cb();
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if ((typeof CLASSES !== "undefined" && CLASSES && CLASSES.length) || tries > 80) { clearInterval(t); cb(); }
    }, 250);
    try { window.addEventListener("quizbank-updated", function () { clearInterval(t); cb(); }, { once: true }); } catch (e) {}
  }

  /* ------------------------------------------------------------------ css */
  function injectCss() {
    if ($("cbtStyles")) return;
    var css = "" +
      ".cbt-wrap{max-width:1060px;margin:0 auto;padding:4px 2px 40px}" +
      ".cbt-card{background:var(--card,#fff);border:1px solid var(--line,rgba(0,33,71,.14));border-radius:14px;padding:18px;margin:0 0 14px;box-shadow:0 1px 2px rgba(0,33,71,.05);position:relative}" +
      ".cbt-card h3{margin:0 0 4px;font-size:1.06rem;color:var(--ink,#002147)}" +
      ".cbt-sub{color:var(--mut,#5b6b84);font-size:.85rem;margin:0 0 12px}" +
      ".cbt-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}" +
      ".cbt-inp,select.cbt-inp{flex:1;min-width:150px;padding:11px 13px;border:1.5px solid var(--line,rgba(0,33,71,.2));border-radius:10px;font:inherit;background:var(--card,#fff);color:var(--ink,#002147)}" +
      ".cbt-code-inp{text-transform:uppercase;letter-spacing:.22em;font-weight:800;text-align:center;max-width:190px}" +
      ".cbt-btn{border:0;border-radius:10px;padding:11px 18px;font:700 .92rem inherit;cursor:pointer;background:#002147;color:#fff}" +
      ".cbt-btn.gold{background:linear-gradient(135deg,#c9a227,#a67c1e);color:#fff}" +
      ".cbt-btn.ghost{background:transparent;color:#002147;border:1.5px solid rgba(0,33,71,.25)}" +
      ".cbt-btn.danger{background:#8a1f1f;color:#fff}" +
      ".cbt-btn:disabled{opacity:.45;cursor:not-allowed}" +
      ".cbt-chip{display:inline-block;padding:3px 10px;border-radius:99px;font-size:.74rem;font-weight:800;letter-spacing:.04em}" +
      ".cbt-chip.waiting{background:rgba(201,162,39,.16);color:#8a6d1f}" +
      ".cbt-chip.live{background:rgba(20,120,60,.14);color:#14783c}" +
      ".cbt-chip.ended{background:rgba(0,33,71,.1);color:#3c4a63}" +
      ".cbt-big-code{font:800 2.2rem/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;color:#002147;text-align:center;margin:8px 0}" +
      ".cbt-err{background:rgba(138,31,31,.08);border:1px solid rgba(138,31,31,.3);color:#8a1f1f;border-radius:10px;padding:10px 12px;font-size:.86rem;font-weight:600;margin:8px 0}" +
      ".cbt-note{background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.35);border-radius:10px;padding:10px 12px;font-size:.85rem;margin:8px 0}" +
      ".cbt-table{width:100%;border-collapse:collapse;font-size:.86rem}" +
      ".cbt-table th{text-align:left;color:var(--mut,#5b6b84);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;padding:6px 8px;border-bottom:1.5px solid var(--line,rgba(0,33,71,.16))}" +
      ".cbt-table td{padding:8px;border-bottom:1px solid var(--line,rgba(0,33,71,.08));vertical-align:middle}" +
      ".cbt-prog{height:7px;border-radius:99px;background:rgba(0,33,71,.1);overflow:hidden;min-width:90px}" +
      ".cbt-prog i{display:block;height:100%;background:linear-gradient(90deg,#c9a227,#002147);border-radius:99px;transition:width .4s}" +
      ".cbt-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}" +
      ".cbt-dot.fresh{background:#14783c}.cbt-dot.warm{background:#c9a227}.cbt-dot.stale{background:#9aa5b8}" +
      ".cbt-q-card{border:1.5px solid var(--line,rgba(0,33,71,.18));border-radius:14px;padding:18px;background:var(--card,#fff)}" +
      ".cbt-q-stem{font-weight:700;font-size:1.02rem;margin:0 0 14px;color:var(--ink,#002147)}" +
      ".cbt-opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:1.5px solid var(--line,rgba(0,33,71,.18));background:var(--card,#fff);border-radius:11px;padding:11px 13px;margin:0 0 8px;font:inherit;cursor:pointer;color:var(--ink,#002147)}" +
      ".cbt-opt.sel{border-color:#c9a227;background:rgba(201,162,39,.1);box-shadow:0 0 0 2px rgba(201,162,39,.25)}" +
      ".cbt-opt b{color:#8a6d1f}" +
      ".cbt-opt.right{border-color:#14783c;background:rgba(20,120,60,.09)}" +
      ".cbt-opt.wrong{border-color:#8a1f1f;background:rgba(138,31,31,.08)}" +
      ".cbt-timer{font:800 1.5rem/1 ui-monospace,Menlo,Consolas,monospace;color:#002147}" +
      ".cbt-timer.red{color:#8a1f1f;animation:cbtPulse 1s infinite}" +
      "@keyframes cbtPulse{50%{opacity:.45}}" +
      ".cbt-warn{background:rgba(138,31,31,.09);border:1.5px solid rgba(138,31,31,.4);color:#8a1f1f;border-radius:11px;padding:10px 13px;font-weight:700;font-size:.87rem;margin:10px 0}" +
      ".cbt-warn.soft{background:rgba(201,162,39,.12);border-color:rgba(201,162,39,.5);color:#8a6d1f}" +
      ".cbt-noselect{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}" +
      ".cbt-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
      "@media(max-width:720px){.cbt-grid2{grid-template-columns:1fr}}" +
      ".cbt-tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}" +
      ".cbt-tab{border:1.5px solid rgba(0,33,71,.2);background:transparent;border-radius:99px;padding:8px 16px;font:700 .85rem inherit;cursor:pointer;color:#3c4a63}" +
      ".cbt-tab.on{background:#002147;border-color:#002147;color:#fff}" +
      ".cbt-bar{display:flex;gap:3px;align-items:flex-end;height:44px}" +
      ".cbt-bar i{flex:1;background:linear-gradient(180deg,#c9a227,#002147);border-radius:3px 3px 0 0;min-height:2px}" +
      ".cbt-draft-q{border:1px solid var(--line,rgba(0,33,71,.14));border-radius:10px;padding:9px 11px;margin:0 0 7px;font-size:.85rem;display:flex;gap:9px;align-items:flex-start}" +
      ".cbt-draft-q small{color:var(--mut,#5b6b84);display:block}" +
      ".cbt-medal{font-size:1.05rem}" +
      ".cbt-muted{color:var(--mut,#5b6b84);font-size:.83rem}" +
      ".cbt-live-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#14783c;margin-right:7px;animation:cbtPulse 1.6s infinite}" +
      ".cbt-setup{font-size:.9rem}" +
      ".cbt-cam-pin{position:absolute;top:12px;right:12px;width:118px;border-radius:9px;overflow:hidden;border:1.5px solid rgba(0,33,71,.25);box-shadow:0 2px 8px rgba(0,33,71,.18);z-index:5;background:#101820}" +
      ".cbt-cam-pin video{display:block;width:100%;transform:scaleX(-1)}" +
      ".cbt-cam-self{width:230px;margin:10px auto}" +
      ".cbt-cam-self video{display:block;width:100%;border-radius:11px;transform:scaleX(-1);background:#101820}" +
      ".cbt-cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}" +
      ".cbt-cam{border:1px solid var(--line,rgba(0,33,71,.14));border-radius:10px;overflow:hidden;background:var(--card,#fff);cursor:pointer;margin:0}" +
      ".cbt-cam img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#101820}" +
      ".cbt-cam .cap{display:flex;gap:6px;align-items:center;padding:6px 8px;font-size:.76rem}" +
      ".cbt-cam .cap b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".cbt-cam.big{grid-column:1/-1}" +
      ".cbt-cam.big img{aspect-ratio:16/9;max-height:60vh;object-fit:contain}" +
      ".cbt-flex1{flex:1}";
    var n = el("style", { id: "cbtStyles" }); n.textContent = css;
    document.head.appendChild(n);
  }

  /* --------------------------------------------------------------- state */
  var root = null, room = null, tickTimer = 0, integrityBound = null;
  var ui = { tab: "home", session: null, attempt: null, answers: [], draft: null, busy: false };

  /* ================================================== v55 live cameras ==
     Ephemeral by design: frames ride the realtime broadcast channel and are
     NEVER written to any table or bucket — what the teacher sees exists only
     while the exam runs. Students always preview themselves first, the
     browser permission prompt can never be bypassed, and the attempt row
     records only a status word (on/denied/unavailable/skipped).            */
  var CAM_INTERVAL = 12000;
  var camState = { stream: null, video: null, timer: 0, on: false, err: "" };
  var camFrames = {}, camTickN = 0;
  function camInterval() { return (+window.__CBT_CAM_MS > 0 ? +window.__CBT_CAM_MS : 0) || CAM_INTERVAL; }
  function camMode(s) { return (s && s.settings && s.settings.webcam) || "off"; }
  function hasCamAPI() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function enableCam(onOk, onErr) {
    if (camState.on) { if (onOk) onOk(); return; }
    if (!hasCamAPI()) { camState.err = "This browser cannot access a camera."; stampWebcam("unavailable"); if (onErr) onErr(camState.err); return; }
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" }, audio: false })
      .then(function (stream) {
        camState.stream = stream; camState.on = true; camState.err = "";
        startCamLoop();
        stampWebcam("on");
        if (onOk) onOk();
      })
      .catch(function (e) {
        var denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
        camState.err = denied ? "Camera permission was denied." : "No camera could be started (" + ((e && e.name) || "error") + ").";
        stampWebcam(denied ? "denied" : "unavailable");
        if (onErr) onErr(camState.err);
      });
  }
  function stampWebcam(v) {
    try {
      if (ui.attempt) ui.attempt.webcam = v;
      if (ui.session) patchAttempt(ui.session.code, me().did, { webcam: v }).catch(function () {});
    } catch (e) {}
  }
  function startCamLoop() {
    if (camState.timer) clearInterval(camState.timer);
    sendCamFrame();
    camState.timer = setInterval(sendCamFrame, camInterval());
  }
  function sendCamFrame() {
    if (!camState.on || !camState.stream || !ui.session) return;
    if (document.hidden) return;   /* a hidden tab broadcasts nothing — the integrity log already covers that window */
    var v = camState.video;
    if (!v || v.readyState < 2 || !v.videoWidth) return;
    var img = grabFrame(v, 320, 240, 0.55);
    if (img.length > 26000) img = grabFrame(v, 240, 180, 0.45);
    if (img.length > 30000) img = grabFrame(v, 192, 144, 0.4);
    if (room) room.notify("cam", { img: img, n: me().name });
  }
  function grabFrame(v, W, H, Q) {
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d");
    x.drawImage(v, 0, 0, W, H);
    return c.toDataURL("image/jpeg", Q);
  }
  function stopCam() {
    if (camState.timer) { clearInterval(camState.timer); camState.timer = 0; }
    if (camState.stream) { try { camState.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
    camState.stream = null; camState.on = false; camState.video = null;
  }
  function attachCamVideo(elm) {
    if (!elm) return;
    camState.video = elm;
    try { elm.srcObject = camState.stream; if (elm.play) { var pr = elm.play(); if (pr && pr.catch) pr.catch(function () {}); } } catch (e) {}
  }
  function camCell(w) {
    return w === "on" ? "📹" : w === "denied" ? '<span style="color:#8a1f1f">denied</span>' : w === "unavailable" ? '<span class="cbt-muted">no cam</span>' : w === "skipped" ? '<span style="color:#8a6d1f">skipped</span>' : "—";
  }
  function cssId(did) { return String(did).replace(/[^a-zA-Z0-9]/g, "_"); }
  function updateCams() {
    var host = $("cbtCams"); if (!host) return;
    var ids = Object.keys(camFrames);
    if (!ids.length) {
      if (!host.querySelector("p")) host.innerHTML = '<p class="cbt-muted">Waiting for cameras — a tile appears the moment a student enables theirs.</p>';
      return;
    }
    var ph = host.querySelector("p"); if (ph) ph.remove();
    ids.forEach(function (did) {
      var f = camFrames[did];
      var fig = document.getElementById("cam-" + cssId(did));
      if (!fig) {
        fig = el("figure", { class: "cbt-cam", id: "cam-" + cssId(did) });
        fig.innerHTML = '<img alt="">' + '<div class="cap"><span class="cbt-dot fresh"></span><b></b><small class="cbt-muted"></small></div>';
        fig.onclick = function () { fig.classList.toggle("big"); };
        host.appendChild(fig);
      }
      var age = Date.now() - f.at;
      fig.querySelector("img").src = f.img;
      fig.querySelector("img").alt = "Live snapshot from " + f.name;
      fig.querySelector("b").textContent = f.name;
      fig.querySelector("small").textContent = age < 25000 ? "live" : Math.round(age / 1000) + "s ago";
      fig.querySelector(".cbt-dot").className = "cbt-dot " + (age < 25000 ? "fresh" : "stale");
    });
  }

  function setRoot(r) { root = r; }
  function toast(msg, ico) {
    try { if (window.toast) return window.toast(msg, ico || "🏫"); } catch (e) {}
    var t = $("cbtToast");
    if (!t) { t = el("div", { id: "cbtToast", class: "cbt-note" }); t.style.cssText += "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;max-width:92vw"; document.body.appendChild(t); }
    t.innerHTML = (ico || "🏫") + " " + esc(msg);
    t.style.display = "";
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = "none"; }, 3200);
  }
  function busy(on) { ui.busy = !!on; }
  function closeRoom() { if (room) { try { room.close(); } catch (e) {} room = null; } if (tickTimer) { clearInterval(tickTimer); tickTimer = 0; } unbindIntegrity(); }

  /* ============================================================== RENDER */
  function mount() {
    injectCss();
    var r = $("cbtRoot");
    if (!r) return;
    setRoot(r);
    if (!ui.tab) ui.tab = "home";
    /* re-entering the tab after finishing (or idling in the waiting room)
       shows a fresh hall — results live server-side and in the recent list;
       an active runner is NEVER reset by a re-mount. */
    if (ui.tab === "done" || ui.tab === "waiting") { closeRoom(); stopCam(); ui.tab = "home"; }
    render();
  }
  function render() {
    if (!root) return;
    try {
      if (ui.tab === "home") return renderHome();
      if (ui.tab === "join") return renderJoin();
      if (ui.tab === "waiting") return renderWaiting();
      if (ui.tab === "run") return renderRun();
      if (ui.tab === "camgate") return renderCamGate();
      if (ui.tab === "done") return renderDone();
      if (ui.tab === "console") return renderConsole();
      renderHome();
    } catch (e) {
      root.innerHTML = '<div class="cbt-wrap"><div class="cbt-card"><div class="cbt-err">The Live CBT Hall hit a snag: ' + esc(e && e.message || e) + '</div><button class="cbt-btn ghost" id="cbtBackHome">Back</button></div></div>';
      var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); };
    }
  }
  function go(tab) { closeRoom(); ui.tab = tab; render(); try { window.scrollTo({ top: 0 }); } catch (e) {} }

  function wrap(inner) { return '<div class="cbt-wrap">' + inner + "</div>"; }
  function errBox(msg, setup) {
    if (setup) return '<div class="cbt-note cbt-setup">🏗️ <b>Live CBT is being set up by the school.</b><br>The live-test tables are not on the school server yet. Ask your teacher to run the one-time CBT setup (tools/cbt_schema.sql) in the school\'s Supabase dashboard — everything else on MAMSS PREP works exactly as before.</div>';
    return '<div class="cbt-err">' + esc(msg) + "</div>";
  }

  /* ----------------------------------------------------------------- home */
  function renderHome() {
    var id = me();
    var recent = st.get("nssc_cbt_recent", []) || [];
    var mine = st.get("nssc_cbt_mine", []) || [];
    var h = "";
    h += '<div class="cbt-card"><h3>🏫 Live CBT Hall</h3><p class="cbt-sub">Real-time examinations posted by your teachers. Join with the session code from the board — your activation is your identity; no signup.</p>';
    if (!cfg()) {
      h += '<div class="cbt-note">This installation has no school server configured — Live CBT needs the school\'s Supabase ledger config in codes.js.</div>';
    } else {
      h += '<div class="cbt-row"><input id="cbtJoinCode" class="cbt-inp cbt-code-inp" placeholder="ABC-123" maxlength="9" autocapitalize="characters" spellcheck="false" aria-label="Live session code"><button class="cbt-btn gold" id="cbtJoinBtn">Join live session</button></div>';
      h += '<div id="cbtJoinFb"></div>';
    }
    h += "</div>";
    if (id.teacher) {
      h += '<div class="cbt-card"><h3>🎓 Teacher console</h3><p class="cbt-sub">Your slip carries the teacher role. Build a paper from the question bank, go live with a session code, monitor every device, release results.</p><button class="cbt-btn" id="cbtConsoleBtn">Open teacher console</button></div>';
    } else {
      h += '<div class="cbt-card"><h3>🎓 Are you a teacher?</h3><p class="cbt-sub">The console unlocks automatically on devices activated with a <b>TEACHER</b> slip from the school office.</p></div>';
    }
    if (recent.length) {
      h += '<div class="cbt-card"><h3>🕘 Your recent sessions</h3><table class="cbt-table"><tr><th>Session</th><th>When</th><th>Result</th><th></th></tr>';
      recent.slice(0, 6).forEach(function (r) {
        h += "<tr><td><b>" + esc(r.title || prettyCode(r.code)) + "</b><br><small class='cbt-muted'>" + esc(prettyCode(r.code)) + "</small></td><td>" + esc(r.at || "") + "</td><td>" + esc(r.score != null ? r.score + "/" + r.total + (r.pct != null ? " · " + r.pct + "%" : "") : r.status || "—") + "</td><td><button class='cbt-btn ghost' data-reopen='" + esc(r.code) + "'>Open</button></td></tr>";
      });
      h += "</table></div>";
    }
    if (id.teacher && mine.length) {
      h += '<div class="cbt-card"><h3>📋 Sessions you posted</h3><table class="cbt-table"><tr><th>Session</th><th>Code</th><th>Created</th><th></th></tr>';
      mine.slice(0, 8).forEach(function (m) {
        h += "<tr><td><b>" + esc(m.title) + "</b></td><td class='cbt-muted'>" + esc(prettyCode(m.code)) + "</td><td>" + esc(m.at || "") + "</td><td><button class='cbt-btn ghost' data-reopen='" + esc(m.code) + "'>Console</button></td></tr>";
      });
      h += "</table></div>";
    }
    root.innerHTML = wrap(h);
    var jb = $("cbtJoinBtn"), ji = $("cbtJoinCode");
    if (jb) jb.onclick = function () { doJoin(ji ? ji.value : ""); };
    if (ji) ji.addEventListener("keydown", function (e) { if (e.key === "Enter") doJoin(ji.value); });
    var cb = $("cbtConsoleBtn"); if (cb) cb.onclick = function () { openConsole(null); };
    root.querySelectorAll("[data-reopen]").forEach(function (b) {
      b.onclick = function () { reopen(b.getAttribute("data-reopen")); };
    });
  }
  function reopen(code) {
    code = normCode(code);
    var mine = st.get("nssc_cbt_mine", []) || [];
    var isMine = mine.some(function (m) { return normCode(m.code) === code; });
    showBusy();
    getSession(code).then(function (s) {
      if (!s) { toast("That session does not exist (any more)", "⚠️"); return go("home"); }
      if (isMine && me().teacher) return openConsole(s);
      return enterStudent(s);
    }).catch(function (e) { renderFailure(e); });
  }
  function showBusy(msg) {
    if (!root) return;
    root.innerHTML = wrap('<div class="cbt-card"><h3>' + esc(msg || "Talking to the school server…") + '</h3><p class="cbt-sub cbt-muted">One moment.</p></div>');
  }
  function renderFailure(e) {
    if (e && e.setup) { root.innerHTML = wrap('<div class="cbt-card"><h3>🏫 Live CBT Hall</h3>' + errBox(null, true) + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>'); var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); }; return; }
    root.innerHTML = wrap('<div class="cbt-card"><h3>🏫 Live CBT Hall</h3>' + errBox("Could not reach the school server (" + esc(e && e.message || e) + "). Live CBT needs a connection — your practice progress is untouched." ) + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>');
    var b2 = $("cbtBackHome"); if (b2) b2.onclick = function () { go("home"); };
  }

  /* ---------------------------------------------------------- student side */
  function doJoin(raw) {
    var code = normCode(raw);
    var fb = $("cbtJoinFb");
    if (code.length !== 6) { if (fb) fb.innerHTML = errBox("Session codes are 6 characters — like ABC-123 from the board."); return; }
    if (!cfg()) return;
    showBusy("Checking session " + prettyCode(code) + "…");
    getSession(code).then(function (s) {
      if (!s) { go("home"); var f = $("cbtJoinFb"); root.innerHTML = wrap('<div class="cbt-card"><h3>🏫 Live CBT Hall</h3>' + errBox("No live session with code " + esc(prettyCode(code)) + ". Check the board and try again.") + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>'); var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); }; return; }
      enterStudent(s);
    }).catch(renderFailure);
  }
  function enterStudent(s) {
    ui.session = s;
    var id = me();
    var attemptRow = { session_code: s.code, device_id: id.did, name: id.name, slip: id.slip, status: "waiting" };
    joinAttempt(attemptRow).then(function (r) {
      if (r.ok) return afterJoin(s, null);
      if (r.status === 409 || r.status === 400) return getAttempt(s.code, id.did).then(function (a) { return afterJoin(s, a); });
      throw new Error("join failed (" + r.status + ")");
    }).catch(renderFailure);
  }
  function afterJoin(s, existing) {
    var id = me();
    rememberRecent(s);
    if (existing && (existing.status === "submitted" || existing.status === "autosubmitted")) {
      ui.attempt = existing;
      return getMyAnswers(s.code, id.did).then(function (ans) { ui.answers = ans; finishView(s, existing, ans); }).catch(renderFailure);
    }
    ui.attempt = existing || { session_code: s.code, device_id: id.did, status: "waiting", current_q: 0, integrity: 0 };
    if (s.status === "live") return startRunner(s, existing);
    if (s.status === "ended") {
      root.innerHTML = wrap('<div class="cbt-card"><h3>' + esc(s.title) + "</h3>" + errBox("This session has already ended.") + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>');
      var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); };
      return;
    }
    go("waiting");
    openRoom(s.code, function (kind) {
      if (ui.tab !== "waiting") return;
      getSession(s.code).then(function (fresh) {
        if (!fresh) return;
        ui.session = fresh;
        if (fresh.status === "live") startRunner(fresh, ui.attempt);
        else if (fresh.status === "ended") go("home");
        else renderWaitingCount(fresh);
      }).catch(function () {});
    });
    render();
  }
  function rememberRecent(s) {
    var recent = st.get("nssc_cbt_recent", []) || [];
    recent = recent.filter(function (r) { return normCode(r.code) !== normCode(s.code); });
    recent.unshift({ code: s.code, title: s.title, at: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) });
    st.set("nssc_cbt_recent", recent.slice(0, 12));
  }
  function camCard(s) {
    var mode = camMode(s);
    if (mode === "off") return "";
    return '<div class="cbt-card" style="text-align:center"><h3>📹 Webcam monitoring is ' + (mode === "required" ? "required" : "optional") + " for this exam</h3>" +
      '<p class="cbt-sub">' + (mode === "required" ? "Enable your camera now so you are ready the moment the paper starts." : "You may enable your camera — it helps your teacher watch the room.") +
      " Small snapshots go live to your teacher only, about every 12 seconds. Nothing is recorded or stored.</p>" +
      '<div class="cbt-cam-self" id="cbtWaitCamWrap" hidden><video id="cbtWaitCamVideo" autoplay playsinline muted></video></div>' +
      '<button class="cbt-btn' + (mode === "required" ? " gold" : " ghost") + '" id="cbtWaitCamBtn">📹 Enable my camera</button>' +
      '<div id="cbtWaitCamFb"></div></div>';
  }
  function wireCamCard(btnId, wrapId, videoId, fbId) {
    var wb = $(btnId);
    if (!wb) return;
    wb.onclick = function () {
      wb.disabled = true;
      enableCam(function () {
        var w = $(wrapId); if (w) { w.hidden = false; attachCamVideo($(videoId)); }
        wb.disabled = false; wb.className = "cbt-btn ghost"; wb.textContent = "✔ Camera on — your teacher can see you";
        wb.onclick = null;
        var f = $(fbId); if (f) f.innerHTML = "";
      }, function (msg) {
        wb.disabled = false;
        var f = $(fbId); if (f) f.innerHTML = errBox(msg + " You can retry here, or enable it later inside the exam.");
      });
    };
  }
  function renderWaitingCount(s) {
    var n = $("cbtWaitingCount");
    if (n) getAttempts(s.code).then(function (a) { n.textContent = a.length + " device" + (a.length === 1 ? "" : "s") + " in the hall"; }).catch(function () {});
  }
  function renderWaiting() {
    var s = ui.session; if (!s) return go("home");
    var qs = s.questions || [];
    var sched = (s.settings && s.settings.scheduledAt) ? '<div class="cbt-note">⏰ Scheduled for <b>' + esc(String(s.settings.scheduledAt).replace("T", " ").slice(0, 16)) + "</b> — the hall opens when your teacher presses Start.</div>" : "";
    var h = '<div class="cbt-card" style="text-align:center"><span class="cbt-chip waiting">WAITING ROOM</span><h3 style="margin-top:10px">' + esc(s.title) + "</h3>" +
      '<p class="cbt-sub">Posted by ' + esc(s.teacher || "your teacher") + " · " + esc(s.cls) + (s.subject ? " · " + esc(s.subject) : " · mixed subjects") + "</p>" + sched +
      '<div class="cbt-big-code">' + esc(prettyCode(s.code)) + "</div>" +
      '<p class="cbt-sub" id="cbtWaitingCount">Counting devices…</p>' +
      '<p class="cbt-sub">' + qs.length + " questions · " + mmss(s.duration_s) + " · one attempt per device · answers save as you go</p>" +
      '<div class="cbt-note">📵 When the paper starts, leaving this tab is logged. Put your phone on silent and stay put.</div>' +
      '<button class="cbt-btn ghost" id="cbtLeave">Leave the hall</button></div>' + camCard(s);
    root.innerHTML = wrap(h);
    var lb = $("cbtLeave"); if (lb) lb.onclick = function () { stopCam(); go("home"); toast("Left the waiting room — your spot is kept", "🚪"); };
    wireCamCard("cbtWaitCamBtn", "cbtWaitCamWrap", "cbtWaitCamVideo", "cbtWaitCamFb");
    renderWaitingCount(s);
  }

  /* ------------------------------------------------------- student runner */
  function startRunner(s, existing) {
    var id = me();
    ui.session = s;
    getMyAnswers(s.code, id.did).then(function (ans) {
      ui.answers = ans || [];
      ui.idx = ui.answers.length;
      ui.qStart = Date.now();
      ui.qFlagged = false;
      ui.intCount = (existing && existing.integrity) || 0;
      if (deadlineLeft(s) <= 0) return submitNow(s, "autosubmitted", "time-expired");
      if (!existing || existing.status === "waiting") {
        patchAttempt(s.code, id.did, { status: "running" }).catch(function () {});
      }
      ui.attempt = existing || ui.attempt;
      go(camMode(s) === "required" && !camState.on ? "camgate" : "run");
      openRoom(s.code, function (kind) {
        if (ui.tab !== "run" && ui.tab !== "camgate") return;
        if (kind === "ended" || kind === "extended" || kind === "started" || kind === "poll") {
          getSession(s.code).then(function (fresh) {
            if (!fresh || ui.tab !== "run") return;
            var hadEnds = ui.session && ui.session.ends_at;
            ui.session = fresh;
            if (fresh.status === "ended") return submitNow(fresh, "submitted", "teacher-ended");
            if (fresh.ends_at && fresh.ends_at !== hadEnds) { toast("Time extended by your teacher — keep going", "⏳"); renderRunChrome(); }
          }).catch(function () {});
        }
      });
      if (ui.tab === "run") bindIntegrity(s);   /* AFTER go() AND openRoom(): both call closeRoom(), which unbinds. camgate binds on proceed. */
      startTick(s);
    }).catch(renderFailure);
  }
  function deadlineLeft(s) {
    if (!s || !s.ends_at) return Infinity;
    return new Date(s.ends_at).getTime() - Date.now();
  }
  function startTick(s) {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (ui.tab !== "run" && ui.tab !== "camgate") return;
      var left = deadlineLeft(ui.session || s);
      var t = $("cbtRunTimer");
      if (t) { t.textContent = fmtClock(left); t.classList.toggle("red", left < 60000); }
      var gt = $("cbtCamGateTimer");
      if (gt) gt.textContent = "⏱ Time left: " + fmtClock(left) + " — the exam clock is already running.";
      if (left <= 0) submitNow(ui.session || s, "autosubmitted", "timeout");
    }, 250);
  }
  function renderRun() {
    var s = ui.session; if (!s) return go("home");
    var qs = s.questions || [];
    if (ui.idx >= qs.length) return submitNow(s, "submitted", "finished");
    var id = me();
    var mode = camMode(s);
    var h = '<div class="cbt-card">' +
      '<div class="cbt-row" style="justify-content:space-between"><div><b>' + esc(s.title) + '</b><br><span class="cbt-muted">Question ' + (ui.idx + 1) + " of " + qs.length + " · " + esc(prettyCode(s.code)) + '</span></div><div class="cbt-row"><span id="cbtCamChip"></span><div class="cbt-timer" id="cbtRunTimer">–:––</div></div></div>' +
      (mode !== "off" ? '<div class="cbt-cam-pin" id="cbtCamPin" hidden><video id="cbtRunSelfView" autoplay playsinline muted></video></div>' : "") +
      '<div class="cbt-prog" style="margin:10px 0 14px"><i id="cbtRunProg" style="width:' + Math.round(ui.idx / qs.length * 100) + '%"></i></div>' +
      '<div id="cbtIntBox"></div>' +
      '<div id="cbtQHost"></div>' +
      "</div>";
    root.innerHTML = wrap(h);
    updateCamChip();
    if (camState.on && mode !== "off") {
      var pin = $("cbtCamPin");
      if (pin) { pin.hidden = false; attachCamVideo($("cbtRunSelfView")); }
    }
    renderQuestion();
    startTick(s);
    void id;
  }
  function renderRunChrome() { var t = $("cbtRunTimer"); if (t) { var left = deadlineLeft(ui.session); t.textContent = fmtClock(left); t.classList.toggle("red", left < 60000); } }
  function updateCamChip() {
    var chip = $("cbtCamChip"); if (!chip) return;
    var mode = camMode(ui.session);
    if (mode === "off") { chip.innerHTML = ""; return; }
    var html = "";
    if (camState.on) html = '<span class="cbt-chip live">📹 On</span>';
    else {
      var w = ui.attempt && ui.attempt.webcam;
      if (w === "denied") html = '<span class="cbt-chip ended">📹 Denied</span>';
      else if (w === "unavailable") html = '<span class="cbt-chip ended">📹 No camera</span>';
      else if (w === "skipped") html = '<span class="cbt-chip ended">📹 Skipped</span>';
      html += '<button class="cbt-btn ghost" id="cbtCamRunEnable" style="padding:6px 11px;margin-left:6px">📹 Enable camera</button>';
    }
    chip.innerHTML = html;
    var b = $("cbtCamRunEnable");
    if (b) b.onclick = function () {
      b.disabled = true;
      enableCam(function () {
        var pin = $("cbtCamPin");
        if (pin) { pin.hidden = false; attachCamVideo($("cbtRunSelfView")); }
        updateCamChip();
        toast("Camera on — your teacher receives small live snapshots", "📹");
      }, function (msg) { b.disabled = false; toast(msg, "⚠️"); updateCamChip(); });
    };
  }
  function renderCamGate() {
    var s = ui.session; if (!s) return go("home");
    var h = '<div class="cbt-card" style="text-align:center"><span class="cbt-chip waiting">CAMERA CHECK</span>' +
      "<h3 style='margin-top:10px'>" + esc(s.title) + "</h3>" +
      '<p class="cbt-sub">Your teacher requires webcam monitoring for this exam.</p>' +
      '<div class="cbt-cam-self" id="cbtGateCamWrap" hidden><video id="cbtGateCamVideo" autoplay playsinline muted></video></div>' +
      '<div class="cbt-note" style="text-align:left">🔒 <b>Privacy, plainly:</b> while the exam runs, your teacher receives a small snapshot from your camera about every 12 seconds. Snapshots are sent live and are <b>never recorded and never stored</b> — when the paper ends, the video is gone. Your browser will ask for camera permission, and you will see yourself here first.</div>' +
      '<div id="cbtGateCamFb"></div>' +
      '<div class="cbt-row" style="justify-content:center;margin-top:10px">' +
      '<button class="cbt-btn gold" id="cbtGateCamEnable">📹 Enable my camera</button>' +
      '<button class="cbt-btn ghost" id="cbtGateCamSkip">Continue without camera — your teacher will see</button></div>' +
      '<p class="cbt-muted" id="cbtCamGateTimer"></p></div>';
    root.innerHTML = wrap(h);
    var btn = $("cbtGateCamEnable");
    btn.onclick = function () {
      var fb = $("cbtGateCamFb"); fb.innerHTML = "";
      btn.disabled = true;
      enableCam(function () {
        var w = $("cbtGateCamWrap"); if (w) { w.hidden = false; attachCamVideo($("cbtGateCamVideo")); }
        btn.disabled = false;
        btn.textContent = "✔ Looks good — start the exam";
        btn.onclick = camProceed;
      }, function (msg) {
        btn.disabled = false;
        fb.innerHTML = errBox(msg + " You can retry — or continue without camera; your teacher will see it was not available.");
      });
    };
    $("cbtGateCamSkip").onclick = function () {
      if (!camState.on && !(ui.attempt && ui.attempt.webcam)) stampWebcam("skipped");
      camProceed();
    };
  }
  function camProceed() {
    if (ui.tab !== "camgate") return;
    ui.tab = "run";
    bindIntegrity(ui.session);
    render();
  }
  function renderQuestion() {
    var s = ui.session, qs = s.questions || [], q = qs[ui.idx];
    var host = $("cbtQHost"); if (!host || !q) return;
    var id = me();
    var noSel = id.readable ? "" : " cbt-noselect";
    var letters = ["A", "B", "C", "D"];
    var h = '<div class="cbt-q-card' + noSel + '" id="cbtQCard">' +
      '<p class="cbt-q-stem">' + (ui.idx + 1) + ". " + esc(q.q) + "</p>";
    (q.o || []).forEach(function (o, i) {
      h += '<button type="button" class="cbt-opt" data-opt="' + i + '"><b>' + letters[i] + ".</b><span>" + esc(o) + "</span></button>";
    });
    h += '<div class="cbt-row" style="margin-top:12px;justify-content:space-between"><span class="cbt-muted" id="cbtRunFb"></span><button class="cbt-btn gold" id="cbtNextBtn" disabled>Save &amp; next →</button></div></div>';
    host.innerHTML = h;
    ui.selected = null;
    ui.qStart = Date.now();
    var card = $("cbtQCard");
    if (card && !id.readable) {
      ["copy", "cut", "contextmenu"].forEach(function (ev) {
        card.addEventListener(ev, function (e) { e.preventDefault(); setFb("Copying is disabled during a live session"); });
      });
    }
    card.querySelectorAll("[data-opt]").forEach(function (b) {
      b.onclick = function () {
        ui.selected = +b.getAttribute("data-opt");
        card.querySelectorAll("[data-opt]").forEach(function (x) { x.classList.toggle("sel", x === b); });
        var nb = $("cbtNextBtn"); if (nb) nb.disabled = false;
        setFb("");
      };
    });
    var nb2 = $("cbtNextBtn");
    if (nb2) nb2.onclick = function () { saveAnswerNow(q); };
    renderIntegrityBox();
  }
  function setFb(msg) { var f = $("cbtRunFb"); if (f) f.textContent = msg || ""; }
  function saveAnswerNow(q) {
    var s = ui.session, id = me();
    if (ui.selected == null || ui.busy) return;
    busy(true);
    var nb = $("cbtNextBtn"); if (nb) { nb.disabled = true; nb.textContent = "Saving…"; }
    var ms = Date.now() - (ui.qStart || Date.now());
    var row = {
      session_code: s.code, device_id: id.did, q_idx: ui.idx, choice: ui.selected,
      correct: q.a === ui.selected, ms: Math.max(0, Math.min(3600000, ms)), flagged: !!ui.qFlagged
    };
    saveAnswer(row).then(function (r) {
      if (!r.ok && r.status !== 409) throw new Error("answer save failed (" + r.status + ")");
      ui.answers.push(row);
      ui.idx++;
      ui.qFlagged = false;
      patchAttempt(s.code, id.did, { current_q: ui.idx }).catch(function () {});
      if (room) room.notify("answer", { q: ui.idx });
      busy(false);
      var qs = s.questions || [];
      var p = $("cbtRunProg"); if (p) p.style.width = Math.round(ui.idx / qs.length * 100) + "%";
      if (ui.idx >= qs.length) return submitNow(s, "submitted", "finished");
      var chrome = root.querySelector(".cbt-muted");
      if (chrome) chrome.textContent = "Question " + (ui.idx + 1) + " of " + qs.length + " · " + prettyCode(s.code);
      renderQuestion();
    }).catch(function (e) {
      busy(false);
      var nb2 = $("cbtNextBtn"); if (nb2) { nb2.disabled = false; nb2.innerHTML = "Save &amp; next →"; }
      setFb("Not saved yet — " + (e && e.message || e) + ". Tap again.");
    });
  }

  /* ------------------------------------------------- integrity (forgiving) */
  function bindIntegrity(s) {
    unbindIntegrity();
    var pending = 0;
    function arm() {
      if (pending) return;
      pending = setTimeout(function () {
        pending = 0;
        if (ui.tab !== "run") return;
        logIntegrity(s);
      }, INTEGRITY_GRACE_MS);
    }
    function cancel() { if (pending) { clearTimeout(pending); pending = 0; } }
    function onBlur() { arm(); }
    function onFocus() { cancel(); }
    function onVis() { if (document.hidden) arm(); else cancel(); }
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    integrityBound = function () {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      cancel();
    };
  }
  function unbindIntegrity() { if (integrityBound) { try { integrityBound(); } catch (e) {} integrityBound = null; } }
  function logIntegrity(s) {
    if (ui.tab !== "run") return;
    ui.intCount = (ui.intCount || 0) + 1;
    ui.qFlagged = true;
    var id = me();
    patchAttempt(s.code, id.did, { integrity: ui.intCount }).catch(function () {});
    if (room) room.notify("integrity", { n: ui.intCount });
    renderIntegrityBox();
    if (ui.intCount >= INTEGRITY_LIMIT) {
      toast("Integrity limit reached — your paper has been submitted", "⚠️");
      return submitNow(s, "autosubmitted", "integrity");
    }
    if (ui.intCount === INTEGRITY_LIMIT - 1) toast("Final warning — one more tab-switch submits your paper", "⚠️");
  }
  function renderIntegrityBox() {
    var box = $("cbtIntBox"); if (!box) return;
    var n = ui.intCount || 0;
    if (!n) { box.innerHTML = ""; return; }
    var soft = n < 3;
    box.innerHTML = '<div class="cbt-warn' + (soft ? " soft" : "") + '">⚠ Exam integrity: you left the exam window ' + n + " time" + (n > 1 ? "s" : "") +
      (n >= INTEGRITY_LIMIT - 1 ? " — one more and this paper auto-submits." : " — this is recorded on your result and your teacher sees it live.") + "</div>";
  }

  /* ------------------------------------------------------ submit & results */
  function submitNow(s, status, why) {
    if (ui.submitting) return; ui.submitting = true;
    closeRoom();
    stopCam();
    var id = me();
    var qs = s.questions || [];
    var score = 0;
    ui.answers.forEach(function (a) { var q = qs[a.q_idx]; if (q && q.a === a.choice) score++; });
    patchAttempt(s.code, id.did, { status: status, score: score, total: qs.length, current_q: ui.answers.length, integrity: ui.intCount || 0 })
      .catch(function () {})
      .then(function () {
        if (room) room.notify("status");
        finishView(s, { status: status, score: score, total: qs.length }, ui.answers, why);
      });
  }
  function finishView(s, attempt, answers, why) {
    ui.submitting = false;
    closeRoom();
    stopCam();
    ui.tab = "done";
    var qs = s.questions || [];
    var instant = !!(s.settings && s.settings.instantResults !== false);
    var recent = st.get("nssc_cbt_recent", []) || [];
    recent = recent.map(function (r) {
      if (normCode(r.code) === normCode(s.code)) {
        r.score = attempt.score; r.total = attempt.total;
        r.pct = attempt.total ? Math.round(attempt.score / attempt.total * 100) : null;
        r.status = attempt.status;
      }
      return r;
    });
    st.set("nssc_cbt_recent", recent);
    var h = '<div class="cbt-card" style="text-align:center"><span class="cbt-chip ' + (attempt.status === "autosubmitted" ? "ended" : "live") + '">' +
      (attempt.status === "autosubmitted" ? (why === "integrity" ? "AUTO-SUBMITTED · INTEGRITY LIMIT" : "AUTO-SUBMITTED · TIME") : "SUBMITTED") + "</span>" +
      "<h3 style='margin-top:10px'>" + esc(s.title) + "</h3>";
    if (instant) {
      var pct = attempt.total ? Math.round(attempt.score / attempt.total * 100) : 0;
      h += '<div class="cbt-big-code">' + attempt.score + " / " + attempt.total + "</div>" +
        '<p class="cbt-sub">' + pct + "% · " + esc(prettyCode(s.code)) + " · " + esc(new Date().toLocaleString("en-GB")) + "</p>";
      h += '<div style="text-align:left;margin-top:14px">';
      qs.forEach(function (q, i) {
        var a = null;
        (answers || []).forEach(function (x) { if (x.q_idx === i) a = x; });
        var letters = ["A", "B", "C", "D"];
        h += '<div class="cbt-draft-q"><span>' + (a ? (a.choice === q.a ? "✅" : "❌") : "⬜") + "</span><div class='cbt-flex1'><b>" + (i + 1) + ". " + esc(q.q) + "</b>";
        if (a && a.choice !== q.a) h += "<small>Your answer: " + esc(letters[a.choice] || "—") + " · Correct: <b>" + esc(letters[q.a]) + "</b></small>";
        if (!a) h += "<small>Not answered · Correct: <b>" + esc(letters[q.a]) + "</b></small>";
        if (q.e) h += "<small>💡 " + esc(q.e) + "</small>";
        if (a && a.flagged) h += "<small>⚠ integrity flag on this question</small>";
        h += "</div></div>";
      });
      h += "</div>";
    } else {
      h += '<p class="cbt-sub">Your teacher will release the results and breakdown.</p>';
    }
    if (attempt.status === "autosubmitted") h += '<div class="cbt-warn">' + (why === "integrity" ? "This paper was auto-submitted after " + (ui.intCount || INTEGRITY_LIMIT) + " logged window-leaves." : "Time expired — everything you had saved was submitted.") + "</div>";
    h += '<button class="cbt-btn ghost" id="cbtBackHome" style="margin-top:12px">Back to the hall</button></div>';
    root.innerHTML = wrap(h);
    var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); };
  }

  /* ======================================================= TEACHER CONSOLE */
  var cons = { tab: "create", session: null, room: null };
  function openConsole(s) {
    cons.session = s || null;
    cons.tab = s ? "monitor" : "create";
    if (!ui.draft) ui.draft = st.get("nssc_cbt_draft", null) || newDraft();
    if (ui.draft && !ui.draft.webcam) ui.draft.webcam = "optional";
    camFrames = {};
    go("console");
  }
  function newDraft() {
    return { title: "", cls: "SS1", subject: "", topic: "", count: 20, duration: 30, scheduledAt: "", instantResults: true, showRank: true, webcam: "optional", questions: [] };
  }
  function renderConsole() {
    if (!me().teacher) { go("home"); return; }
    var h = '<div class="cbt-card"><h3>🎓 Teacher console</h3><p class="cbt-sub">Live CBT Hall · signed in as <b>' + esc(me().name) + "</b> (" + esc(me().slip || "teacher slip") + ")</p>" +
      '<div class="cbt-tabs">' +
      '<button class="cbt-tab' + (cons.tab === "create" ? " on" : "") + '" data-ctab="create">1 · Build paper</button>' +
      '<button class="cbt-tab' + (cons.tab === "monitor" ? " on" : "") + '" data-ctab="monitor">2 · Monitor</button>' +
      '<button class="cbt-tab' + (cons.tab === "results" ? " on" : "") + '" data-ctab="results">3 · Results</button>' +
      "</div><div id='cbtConsBody'></div></div>";
    root.innerHTML = wrap(h);
    root.querySelectorAll("[data-ctab]").forEach(function (b) {
      b.onclick = function () { cons.tab = b.getAttribute("data-ctab"); renderConsole(); };
    });
    if (cons.tab === "create") renderBuilder();
    else if (cons.tab === "monitor") renderMonitor();
    else renderResults();
  }

  /* ------------------------------------------------------------- builder */
  function subjList() {
    try {
      if (typeof SUBJECT_META !== "undefined" && SUBJECT_META) {
        var k = Object.keys(SUBJECT_META);
        if (k.length) return k;
      }
    } catch (e) {}
    var set = {};
    try {
      if (typeof CLASSES !== "undefined" && CLASSES) CLASSES.forEach(function (c) {
        (c.questions || []).forEach(function (q) { if (q.s) set[q.s] = 1; });
      });
    } catch (e) {}
    return Object.keys(set).sort();
  }
  function bankQuestions(clsName, subject) {
    var out = [];
    if (typeof CLASSES === "undefined" || !CLASSES) return out;
    CLASSES.forEach(function (c) {
      if (c.class !== clsName) return;
      (c.questions || []).forEach(function (q) { if (!subject || q.s === subject) out.push(q); });
    });
    return out;
  }
  function qTopic(q) { try { return q.t || (typeof topicOf === "function" && topicOf(q)) || "General"; } catch (e) { return "General"; } }
  function topicList(subject) {
    try { if (typeof TOPICS !== "undefined" && TOPICS[subject]) return TOPICS[subject].map(function (t) { return t[0]; }); } catch (e) {}
    return [];
  }
  function renderBuilder(bankWaited) {
    var d = ui.draft;
    var host = $("cbtConsBody"); if (!host) return;
    var subs = subjList();
    if (!subs.length && !bankWaited) { whenBank(function () { if (ui.tab === "console" && cons.tab === "create") renderBuilder(true); }); }
    var h = "";
    h += '<div class="cbt-row" style="margin-bottom:10px"><input class="cbt-inp" id="cbtDraftTitle" placeholder="Paper title — e.g. SS2 Mathematics · Mid-term CBT" maxlength="80" value="' + esc(d.title) + '"></div>';
    h += '<div class="cbt-grid2">';
    h += '<div><label class="cbt-muted">Class</label><div class="cbt-row" id="cbtClsRow">' +
      ["SS1", "SS2", "SS3"].map(function (c) { return '<button class="cbt-tab' + (d.cls === c ? " on" : "") + '" data-cls="' + c + '">' + c + "</button>"; }).join("") + "</div></div>";
    h += '<div><label class="cbt-muted">Subject (for drawing from the bank)</label><select class="cbt-inp" id="cbtSubject"><option value="">Mixed / all subjects</option>' +
      subs.map(function (s2) { return '<option value="' + esc(s2) + '"' + (d.subject === s2 ? " selected" : "") + ">" + esc(s2) + "</option>"; }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted">Topic filter (optional)</label><select class="cbt-inp" id="cbtTopic"><option value="">All topics</option>' +
      topicList(d.subject).map(function (t) { return '<option value="' + esc(t) + '"' + (d.topic === t ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted">Duration</label><select class="cbt-inp" id="cbtDuration">' +
      [10, 20, 30, 45, 60, 90].map(function (m) { return '<option value="' + m + '"' + (d.duration === m ? " selected" : "") + ">" + m + " minutes</option>"; }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted">Scheduled start (shown to students; you press Start)</label><input class="cbt-inp" type="datetime-local" id="cbtSched" value="' + esc(d.scheduledAt || "") + '"></div>';
    h += '<div><label class="cbt-muted">Questions to draw</label><input class="cbt-inp" type="number" min="1" max="100" id="cbtCount" value="' + d.count + '"></div>';
    h += '<div><label class="cbt-muted">Webcam monitoring</label><select class="cbt-inp" id="cbtWebcam">' +
      [["off", "Off — no cameras"], ["optional", "Optional — student's choice"], ["required", "Required — camera check before the paper"]].map(function (o) {
        return '<option value="' + o[0] + '"' + ((d.webcam || "optional") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>";
    h += "</div>";
    h += '<div class="cbt-row" style="margin:12px 0"><label class="cbt-muted"><input type="checkbox" id="cbtInstant"' + (d.instantResults ? " checked" : "") + '> Students see instant results &amp; explanations</label>' +
      '<label class="cbt-muted"><input type="checkbox" id="cbtRank"' + (d.showRank ? " checked" : "") + "> Show class ranking to students</label></div>";
    h += '<div class="cbt-row" style="margin-bottom:10px"><button class="cbt-btn ghost" id="cbtDraw">🎲 Draw from the question bank</button><button class="cbt-btn ghost" id="cbtAddNew">✍️ Add a new question</button><button class="cbt-btn ghost" id="cbtClearQ">🗑 Clear paper</button></div>';
    h += '<div id="cbtDrawFb"></div>';
    h += '<div id="cbtNewQ" style="display:none">' + newQForm() + "</div>";
    h += '<div id="cbtQList">' + draftListHtml(d) + "</div>";
    h += '<div class="cbt-row" style="margin-top:14px;justify-content:space-between"><span class="cbt-muted" id="cbtQCount"></span><button class="cbt-btn gold" id="cbtGoLive">🔴 Go live — generate session code</button></div>';
    host.innerHTML = h;
    syncDraftFromForm();
    updateQCount();
    host.querySelectorAll("[data-cls]").forEach(function (b) {
      b.onclick = function () { d.cls = b.getAttribute("data-cls"); saveDraft(); renderBuilder(); };
    });
    ["cbtDraftTitle", "cbtSubject", "cbtTopic", "cbtDuration", "cbtSched", "cbtCount", "cbtInstant", "cbtRank", "cbtWebcam"].forEach(function (idn) {
      var n2 = $(idn); if (n2) n2.addEventListener("change", function () { syncDraftFromForm(); saveDraft(); if (idn === "cbtSubject") renderBuilder(); });
    });
    var dr = $("cbtDraw"); if (dr) dr.onclick = drawFromBank;
    var an = $("cbtAddNew"); if (an) an.onclick = function () { var nq = $("cbtNewQ"); nq.style.display = nq.style.display === "none" ? "" : "none"; };
    var cq = $("cbtClearQ"); if (cq) cq.onclick = function () { d.questions = []; saveDraft(); renderBuilder(); };
    var gl = $("cbtGoLive"); if (gl) gl.onclick = goLive;
    var addBtn = $("cbtNewQAdd"); if (addBtn) addBtn.onclick = addNewQuestion;
    host.querySelectorAll("[data-delq]").forEach(function (b) {
      b.onclick = function () { d.questions.splice(+b.getAttribute("data-delq"), 1); saveDraft(); renderBuilder(); };
    });
  }
  function newQForm() {
    return '<div class="cbt-card" style="margin:0 0 12px"><h3>Add a new question</h3><p class="cbt-sub">Checked against the WAEC-standard rules the whole bank now follows.</p>' +
      '<input class="cbt-inp" id="nqStem" placeholder="Question stem — e.g. Which of the following is a chemical change?" style="width:100%;margin-bottom:8px">' +
      '<div class="cbt-grid2">' +
      [0, 1, 2, 3].map(function (i) { return '<input class="cbt-inp" id="nqO' + i + '" placeholder="Option ' + "ABCD"[i] + '">'; }).join("") +
      "</div>" +
      '<div class="cbt-row" style="margin-top:8px"><label class="cbt-muted">Correct option</label>' +
      [0, 1, 2, 3].map(function (i) { return '<label class="cbt-muted"><input type="radio" name="nqA" value="' + i + '"' + (i === 0 ? " checked" : "") + "> " + "ABCD"[i] + "</label>"; }).join("") + "</div>" +
      '<input class="cbt-inp" id="nqExpl" placeholder="Explanation (shown to students when results are released)" style="width:100%;margin-top:8px">' +
      '<div id="nqFb"></div>' +
      '<div class="cbt-row" style="margin-top:8px"><button class="cbt-btn" id="cbtNewQAdd">Add to paper</button></div></div>';
  }
  function syncDraftFromForm() {
    var d = ui.draft;
    var t = $("cbtDraftTitle"); if (t) d.title = t.value;
    var s2 = $("cbtSubject"); if (s2) d.subject = s2.value;
    var tp = $("cbtTopic"); if (tp) d.topic = tp.value;
    var du = $("cbtDuration"); if (du) d.duration = +du.value || 30;
    var sc = $("cbtSched"); if (sc) d.scheduledAt = sc.value;
    var cn = $("cbtCount"); if (cn) d.count = Math.max(1, Math.min(100, +cn.value || 20));
    var ir = $("cbtInstant"); if (ir) d.instantResults = ir.checked;
    var rk = $("cbtRank"); if (rk) d.showRank = rk.checked;
    var wc = $("cbtWebcam"); if (wc) d.webcam = wc.value;
  }
  function saveDraft() { st.set("nssc_cbt_draft", ui.draft); }
  function draftListHtml(d) {
    if (!d.questions.length) return '<p class="cbt-muted">No questions yet — draw from the bank or add your own.</p>';
    var letters = ["A", "B", "C", "D"];
    return d.questions.map(function (q, i) {
      return '<div class="cbt-draft-q"><span>' + (i + 1) + '.</span><div class="cbt-flex1"><b>' + esc(q.q) + '</b><small>' +
        esc((q.o || []).map(function (o, k) { return letters[k] + ". " + o; }).join(" · ")) + "</small><small>✔ " + esc(letters[q.a] || "?") +
        (q.e ? " · 💡 " + esc(q.e) : "") + ' · <i>' + esc(q.src === "new" ? "new question" : "bank") + "</i></small></div>" +
        '<button class="cbt-btn ghost" data-delq="' + i + '" title="Remove">✕</button></div>';
    }).join("");
  }
  function updateQCount() {
    var n = $("cbtQCount");
    if (n) n.textContent = ui.draft.questions.length + " question" + (ui.draft.questions.length === 1 ? "" : "s") + " on the paper";
  }
  function drawFromBank() {
    syncDraftFromForm();
    var d = ui.draft, fb = $("cbtDrawFb");
    whenBank(function () {
      var pool = bankQuestions(d.cls, d.subject);
      if (d.topic) pool = pool.filter(function (q) { return qTopic(q) === d.topic; });
      if (!pool.length) { if (fb) fb.innerHTML = errBox("No bank questions match " + esc(d.cls + (d.subject ? " · " + d.subject : "") + (d.topic ? " · " + d.topic : "")) + ". Widen the filter."); return; }
      var have = {};
      d.questions.forEach(function (q) { have[normCode(q.q).slice(0, 60)] = 1; });
      var shuffled = pool.slice();
      for (var i = shuffled.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp; }
      var added = 0;
      for (var k = 0; k < shuffled.length && added < d.count; k++) {
        var q = shuffled[k], key = normCode(q.q).slice(0, 60);
        if (have[key]) continue;
        have[key] = 1;
        d.questions.push({ q: q.q, o: q.o.slice(0, 4), a: q.a, e: q.e || "", src: "bank" });
        added++;
      }
      saveDraft(); renderBuilder();
      var fb2 = $("cbtDrawFb");
      if (fb2) fb2.innerHTML = added ? '<div class="cbt-note"> Drew ' + added + " question" + (added === 1 ? "" : "s") + (added < d.count ? " (pool exhausted — widen the filter for more)." : ".") + "</div>" : errBox("Every matching question is already on the paper.");
    });
  }
  var MECH_WARN = [
    [/\b(1th|2th|3th|4rd)\b/, "ordinal typo (e.g. 3th → 3rd)"],
    [/^Which of the following is NOT (a|an) [a-z]/, "template phrasing — prefer “NOT associated with …”"],
    [/\bis not a [a-z]+; it is a [a-z]+\./, "template explanation phrasing"],
    [/\ba (oxygen|aluminium|iron|acid|angle|atom|element|energy|equation|ion|isotope|integer|umbrella|orange|apple|eye|ear|egg|ice|oil|oxide|honesty|hour)\b/, "article agreement (a → an)"]
  ];
  function addNewQuestion() {
    var d = ui.draft, fb = $("nqFb");
    var stem = ($("nqStem") || {}).value || "";
    var opts = [0, 1, 2, 3].map(function (i) { return (($("nqO" + i) || {}).value || "").trim(); });
    var aEl = root.querySelector('input[name="nqA"]:checked');
    var a = aEl ? +aEl.value : 0;
    var e = ($("nqExpl") || {}).value || "";
    var errs = [];
    if (stem.trim().length < 10) errs.push("the stem is too short");
    if (opts.some(function (o) { return !o; })) errs.push("all four options are required");
    if (new Set(opts.map(function (o) { return normCode(o); })).size < 4) errs.push("options must be distinct");
    var key = normCode(stem).slice(0, 60);
    if (d.questions.some(function (q) { return normCode(q.q).slice(0, 60) === key; })) errs.push("this question is already on the paper (duplicate)");
    if (!errs.length && /[.?]$/.test(stem.trim()) === false) stem = stem.trim() + (/^(which|what|who|how|when|where|why|find|calculate|determine|state|list|define)/i.test(stem.trim()) ? "?" : ".");
    var warns = [];
    MECH_WARN.forEach(function (w) { if (w[0].test(stem + " " + e)) warns.push(w[1]); });
    if (errs.length) { if (fb) fb.innerHTML = errBox("Cannot add: " + errs.join("; ") + "."); return; }
    d.questions.push({ q: stem.trim(), o: opts, a: a, e: e.trim(), src: "new" });
    saveDraft();
    if (fb) fb.innerHTML = warns.length ? '<div class="cbt-note">Added — but the WAEC checker flags: ' + esc(warns.join("; ")) + ". Consider rewording.</div>" : '<div class="cbt-note">Added ✔ passes the WAEC mechanics check.</div>';
    ["nqStem", "nqO0", "nqO1", "nqO2", "nqO3", "nqExpl"].forEach(function (idn) { var n2 = $(idn); if (n2) n2.value = ""; });
    var list = $("cbtQList"); if (list) list.innerHTML = draftListHtml(d);
    renderBuilderWireDels();
    updateQCount();
  }
  function renderBuilderWireDels() {
    if (!root) return;
    root.querySelectorAll("[data-delq]").forEach(function (b) {
      b.onclick = function () { ui.draft.questions.splice(+b.getAttribute("data-delq"), 1); saveDraft(); renderBuilder(); };
    });
  }
  function goLive() {
    syncDraftFromForm();
    var d = ui.draft, id = me();
    if (!id.teacher) return toast("Only teacher slips can post live sessions", "⚠️");
    if (!cfg()) return toast("No school server configured", "⚠️");
    if (!d.title.trim()) return toast("Give the paper a title first", "✏️");
    if (d.questions.length < 2) return toast("A paper needs at least 2 questions", "📝");
    var row = {
      code: makeCode(), teacher: id.name, device_id: id.did, title: d.title.trim(),
      cls: d.cls, subject: d.subject || "", duration_s: Math.max(30, d.duration * 60),
      status: "waiting", extend_s: 0,
      settings: { instantResults: !!d.instantResults, showRank: !!d.showRank, scheduledAt: d.scheduledAt || null, webcam: d.webcam || "optional" },
      questions: d.questions
    };
    showBusy("Posting the paper to the school server…");
    (function attemptCreate(tries) {
      createSession(row).then(function (r) {
        if (r.ok) {
          var mine = st.get("nssc_cbt_mine", []) || [];
          mine.unshift({ code: row.code, title: row.title, at: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) });
          st.set("nssc_cbt_mine", mine.slice(0, 15));
          ui.draft = newDraft(); saveDraft();
          openConsole({ code: row.code });
          cons.session = null;
          loadSessionIntoConsole(row.code);
          toast("Live! Share code " + prettyCode(row.code) + " with the class", "🔴");
          return;
        }
        if (r.status === 409 && tries > 0) { row.code = makeCode(); return attemptCreate(tries - 1); }
        if (isMissingTables(r)) return renderFailure(setupError());
        throw new Error("could not create the session (" + r.status + ")");
      }).catch(renderFailure);
    })(4);
  }
  function loadSessionIntoConsole(code) {
    getSession(code).then(function (s) {
      if (!s) return;
      cons.session = s;
      camFrames = {};
      renderConsole();
    }).catch(renderFailure);
  }

  /* ------------------------------------------------------------- monitor */
  function renderMonitor() {
    var host = $("cbtConsBody"); if (!host) return;
    var s = cons.session;
    if (!s) {
      host.innerHTML = '<div class="cbt-row"><input class="cbt-inp cbt-code-inp" id="cbtConsCode" placeholder="ABC-123" maxlength="9" aria-label="Session code"><button class="cbt-btn" id="cbtConsOpen">Open session</button></div><p class="cbt-muted" style="margin-top:8px">Enter the code of a paper you posted (or build a new one in tab 1).</p>';
      var ob = $("cbtConsOpen");
      if (ob) ob.onclick = function () {
        var c = normCode(($("cbtConsCode") || {}).value);
        if (c.length !== 6) return toast("That is not a 6-character code", "⚠️");
        showBusy(); loadSessionIntoConsole(c);
      };
      return;
    }
    var qs = s.questions || [];
    var left = s.status === "live" && s.ends_at ? deadlineLeft(s) : null;
    var h = '<div class="cbt-row" style="justify-content:space-between">' +
      "<div><b>" + esc(s.title) + '</b><br><span class="cbt-muted">' + esc(s.cls) + (s.subject ? " · " + esc(s.subject) : "") + " · " + qs.length + " questions · " + mmss(s.duration_s) + (s.extend_s ? " (+" + mmss(s.extend_s) + " added)" : "") + "</span></div>" +
      '<span class="cbt-chip ' + s.status + '">' + s.status.toUpperCase() + '</span></div>' +
      '<div class="cbt-big-code">' + esc(prettyCode(s.code)) + "</div>" +
      '<div class="cbt-row" style="justify-content:center;margin-bottom:6px">' +
      '<button class="cbt-btn ghost" id="cbtCopyCode">📋 Copy invite</button>' +
      '<a class="cbt-btn ghost" id="cbtWaShare" target="_blank" rel="noopener" href="#">💬 WhatsApp the code</a>' +
      "</div>" +
      '<div id="cbtMonCountdown" class="cbt-muted" style="text-align:center;margin-bottom:10px"></div>' +
      '<div class="cbt-row" style="margin-bottom:12px">' +
      (s.status === "waiting" ? '<button class="cbt-btn gold" id="cbtStart">▶ Start the paper now</button>' : "") +
      (s.status === "live" ? '<button class="cbt-btn ghost" id="cbtExt5">+5 min</button><button class="cbt-btn ghost" id="cbtExt15">+15 min</button><button class="cbt-btn danger" id="cbtEnd">■ End session now</button>' : "") +
      (s.status === "ended" ? '<button class="cbt-btn" id="cbtToResults">📊 View results</button>' : "") +
      '<label class="cbt-muted"><input type="checkbox" id="cbtMonInstant"' + (s.settings && s.settings.instantResults !== false ? " checked" : "") + '> instant results</label>' +
      "</div>" +
      '<div id="cbtMonWarn"></div>' +
      (camMode(s) !== "off" ? '<h3 style="margin:16px 0 8px">📹 Live cameras <span class="cbt-muted">(' + esc(camMode(s)) + " for this paper · snapshots are never stored)</span></h3>" +
        '<div id="cbtCamDead"></div><div class="cbt-cams" id="cbtCams"></div>' : "") +
      '<table class="cbt-table" id="cbtRoster"><tr><th>Student</th><th>Status</th><th>Progress</th><th>⚠</th><th>📹</th><th>Seen</th></tr></table>';
    host.innerHTML = h;
    var invite = "MAMSS PREP — Live CBT: " + s.title + ". Join in the Live CBT tab with code " + prettyCode(s.code) + ". https://merebari7-web.github.io/mamss-prep/";
    var cc = $("cbtCopyCode");
    if (cc) cc.onclick = function () {
      try { navigator.clipboard && navigator.clipboard.writeText(invite); } catch (e) {}
      toast("Invite copied — paste it anywhere", "📋");
    };
    var wa = $("cbtWaShare");
    if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent(invite);
    var st1 = $("cbtStart");
    if (st1) st1.onclick = function () {
      patchSession(s.code, { status: "live" }).then(function (r) {
        if (!r.ok) throw new Error("start failed");
        return getSession(s.code);
      }).then(function (fresh) { cons.session = fresh; if (room) room.notify("started"); renderConsole(); toast("Paper is LIVE — students' timers started", "🔴"); }).catch(function (e) { toast(String(e && e.message || e), "⚠️"); });
    };
    var e5 = $("cbtExt5"), e15 = $("cbtExt15");
    function ext(sec) {
      var cur = (cons.session && cons.session.extend_s) || 0;
      patchSession(s.code, { extend_s: cur + sec }).then(function () { return getSession(s.code); })
        .then(function (fresh) { cons.session = fresh; if (room) room.notify("extended"); renderConsole(); toast("+" + (sec / 60) + " minutes added", "⏳"); })
        .catch(function (e2) { toast(String(e2 && e2.message || e2), "⚠️"); });
    }
    if (e5) e5.onclick = function () { ext(300); };
    if (e15) e15.onclick = function () { ext(900); };
    var en = $("cbtEnd");
    if (en) en.onclick = function () {
      if (!window.confirm("End this session now? Every running device submits what it has.")) return;
      patchSession(s.code, { status: "ended" }).then(function () { return getSession(s.code); })
        .then(function (fresh) { cons.session = fresh; if (room) room.notify("ended"); renderConsole(); toast("Session ended — results are ready", "■"); })
        .catch(function (e2) { toast(String(e2 && e2.message || e2), "⚠️"); });
    };
    var tr = $("cbtToResults"); if (tr) tr.onclick = function () { cons.tab = "results"; renderConsole(); };
    var mi = $("cbtMonInstant");
    if (mi) mi.onchange = function () {
      var set2 = Object.assign({}, s.settings || {}, { instantResults: mi.checked });
      patchSession(s.code, { settings: set2 }).then(function () { s.settings = set2; }).catch(function () {});
    };
    openRoom(s.code, function (kind, p) {
      if (ui.tab !== "console" || cons.tab !== "monitor") return;
      if (kind === "cam" && p && p.did && p.did !== me().did && p.img) {
        var prev = camFrames[p.did];
        camFrames[p.did] = { img: p.img, name: p.n || "Student", at: Date.now(), n: (prev ? prev.n : 0) + 1 };
        updateCams();
        return;
      }
      refreshRoster(kind === "integrity");
      if (kind === "poll") {
        getSession(s.code).then(function (fresh) {
          if (!fresh || !cons.session) return;
          var changed = fresh.status !== cons.session.status || fresh.ends_at !== cons.session.ends_at;
          cons.session = fresh;
          if (changed) renderConsole();
        }).catch(function () {});
      }
    });
    refreshRoster(false);
    updateCams();
    camTickN = 0;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (cons.session && camMode(cons.session) !== "off") {
        camTickN = (camTickN + 1) % 5;
        if (camTickN === 0) {
          updateCams();
          var dn = $("cbtCamDead");
          if (dn) dn.innerHTML = (room && room.dead) ? '<div class="cbt-note">📡 The realtime socket is not connected right now — camera tiles need it. Everything else keeps working through polling.</div>' : "";
        }
      }
      var cd = $("cbtMonCountdown");
      if (!cd || !cons.session) return;
      if (cons.session.status === "live" && cons.session.ends_at) {
        var leftMs = deadlineLeft(cons.session);
        cd.innerHTML = '<span class="cbt-live-dot"></span>Time left: <b>' + fmtClock(leftMs) + "</b>";
      } else if (cons.session.status === "waiting") cd.textContent = "Waiting to start — share the code above.";
      else cd.textContent = "Session ended.";
    }, 500);
  }
  function openRoom(code, onChange) {
    closeRoom();
    room = new LiveRoom(code, onChange);
  }
  function refreshRoster(sawIntegrity) {
    var s = cons.session; if (!s) return;
    getAttempts(s.code).then(function (rows) {
      var t = $("cbtRoster"); if (!t || !cons.session) return;
      var qs = (s.questions || []).length || 1;
      var now = Date.now();
      var h = "<tr><th>Student</th><th>Status</th><th>Progress</th><th>⚠</th><th>📹</th><th>Seen</th></tr>";
      rows.forEach(function (r) {
        var seen = r.last_seen_at ? now - new Date(r.last_seen_at).getTime() : Infinity;
        var dot = seen < 30000 ? "fresh" : seen < 120000 ? "warm" : "stale";
        var pctDone = Math.min(100, Math.round((r.current_q || 0) / qs * 100));
        h += "<tr><td><b>" + esc(r.name || "Anonymous") + '</b><br><small class="cbt-muted">' + esc(r.slip || r.device_id.slice(0, 10)) + "</small></td>" +
          '<td><span class="cbt-chip ' + (r.status === "running" ? "live" : r.status === "waiting" ? "waiting" : "ended") + '">' + esc(r.status.toUpperCase()) + "</span></td>" +
          '<td><div class="cbt-prog"><i style="width:' + pctDone + '%"></i></div><small class="cbt-muted">' + (r.current_q || 0) + "/" + qs + "</small></td>" +
          "<td>" + (r.integrity ? '<b style="color:#8a1f1f">' + r.integrity + "</b>" : "—") + "</td>" +
          "<td>" + camCell(r.webcam) + "</td>" +
          '<td><span class="cbt-dot ' + dot + '"></span>' + (isFinite(seen) ? Math.round(seen / 1000) + "s" : "—") + "</td></tr>";
      });
      t.innerHTML = h;
      if (sawIntegrity) {
        var w = $("cbtMonWarn");
        if (w) w.innerHTML = '<div class="cbt-warn soft">⚠ An integrity event was just logged — see the ⚠ column.</div>';
      }
    }).catch(function () {});
  }

  /* ------------------------------------------------------------- results */
  function gradePaper(session, attempts, answers) {
    var qs = session.questions || [];
    var byDev = {};
    answers.forEach(function (a) { (byDev[a.device_id] = byDev[a.device_id] || {})[a.q_idx] = a; });
    var rows = attempts.map(function (t) {
      var mine = byDev[t.device_id] || {};
      var score = 0, answered = 0;
      qs.forEach(function (q, i) { var a = mine[i]; if (a) { answered++; if (q.a === a.choice) score++; } });
      return {
        attempt: t, score: score, total: qs.length, answered: answered,
        pct: qs.length ? Math.round(score / qs.length * 100) : 0,
        mismatch: t.score != null && +t.score !== score
      };
    });
    rows.sort(function (a, b) { return b.score - a.score || (a.attempt.submitted_at || "").localeCompare(b.attempt.submitted_at || ""); });
    var perQ = qs.map(function (q, i) {
      var dist = [0, 0, 0, 0], correct = 0, n = 0, flags = 0;
      attempts.forEach(function (t) {
        var a = (byDev[t.device_id] || {})[i];
        if (!a) return;
        n++; if (a.choice >= 0 && a.choice <= 3) dist[a.choice]++;
        if (q.a === a.choice) correct++;
        if (a.flagged) flags++;
      });
      return { q: q, i: i, n: n, correct: correct, pct: n ? Math.round(correct / n * 100) : null, dist: dist, flags: flags };
    });
    return { rows: rows, perQ: perQ };
  }
  function renderResults() {
    var host = $("cbtConsBody"); if (!host) return;
    var s = cons.session;
    if (!s) { host.innerHTML = "<p class='cbt-muted'>Open a session in the Monitor tab first.</p>"; return; }
    host.innerHTML = "<p class='cbt-muted'>Crunching " + esc(prettyCode(s.code)) + "…</p>";
    Promise.all([getAttempts(s.code), getAllAnswers(s.code)]).then(function (res) {
      var attempts = res[0], answers = res[1];
      var g = gradePaper(s, attempts, answers);
      var letters = ["A", "B", "C", "D"];
      var h = '<div class="cbt-row" style="justify-content:space-between;margin-bottom:10px"><div><b>' + esc(s.title) + '</b><br><span class="cbt-muted">' + attempts.length + " device" + (attempts.length === 1 ? "" : "s") + " · " + answers.length + " answers persisted</span></div>" +
        '<div class="cbt-row"><button class="cbt-btn ghost" id="cbtCsv">⬇ CSV</button><button class="cbt-btn ghost" id="cbtWaResults">💬 Summary</button></div></div>';
      if (s.status !== "ended") h += '<div class="cbt-note">Session is still <b>' + s.status + "</b> — these are live standings. End it in the Monitor tab to freeze the ranking.</div>";
      h += '<h3 style="margin:14px 0 6px">🏆 Class ranking</h3><table class="cbt-table"><tr><th>#</th><th>Student</th><th>Score</th><th>%</th><th>⚠</th><th>📹</th><th>Status</th></tr>';
      g.rows.forEach(function (r, i) {
        var t = r.attempt;
        h += "<tr><td class='cbt-medal'>" + (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1) + "</td><td><b>" + esc(t.name || "Anonymous") + '</b><br><small class="cbt-muted">' + esc(t.slip || "") + "</small></td>" +
          "<td>" + r.score + "/" + r.total + (r.mismatch ? ' <small style="color:#8a1f1f" title="the device reported a different score — the server rows win">⚠ mismatch</small>' : "") + "</td>" +
          "<td><b>" + r.pct + "%</b></td><td>" + (t.integrity || 0) + "</td><td>" + camCell(t.webcam) + "</td><td>" + esc(t.status) + "</td></tr>";
      });
      h += "</table>";
      h += '<h3 style="margin:16px 0 6px">📊 Per-question accuracy</h3>';
      g.perQ.forEach(function (p) {
        var maxD = Math.max.apply(null, p.dist.concat([1]));
        h += '<div class="cbt-draft-q"><span>' + (p.i + 1) + '.</span><div class="cbt-flex1"><b>' + esc(p.q.q) + "</b>" +
          "<small>Correct: <b>" + letters[p.q.a] + "</b> · " + (p.pct == null ? "no attempts" : p.pct + "% got it right (" + p.correct + "/" + p.n + ")") + (p.flags ? " · ⚠ " + p.flags + " flagged" : "") + "</small>" +
          '<div class="cbt-bar" title="Answer distribution">' + p.dist.map(function (dnum, di) {
            return '<i style="height:' + Math.round(dnum / maxD * 100) + "%;opacity:" + (di === p.q.a ? "1" : ".45") + '" data-l="' + letters[di] + '"></i>';
          }).join("") + "</div><small class='cbt-muted'>A · B · C · D (solid = correct option)</small>" +
          "</div></div>";
      });
      host.innerHTML = h;
      var cb = $("cbtCsv");
      if (cb) cb.onclick = function () {
        var lines = ["rank,name,slip,score,total,pct,integrity,status,submitted_at"];
        g.rows.forEach(function (r, i) {
          var t = r.attempt;
          lines.push([i + 1, '"' + String(t.name || "").replace(/"/g, "'") + '"', t.slip || "", r.score, r.total, r.pct, t.integrity || 0, t.status, t.submitted_at || ""].join(","));
        });
        var uri = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
        var a2 = el("a", { href: uri, download: "cbt-" + s.code + "-results.csv" });
        document.body.appendChild(a2); a2.click(); a2.remove();
      };
      var wr = $("cbtWaResults");
      if (wr) wr.onclick = function () {
        var top = g.rows.slice(0, 3).map(function (r, i) { return (i + 1) + ". " + (r.attempt.name || "Anonymous") + " — " + r.pct + "%"; }).join("\n");
        var hardest = g.perQ.filter(function (p) { return p.pct != null; }).sort(function (a, b) { return a.pct - b.pct; })[0];
        var txt = "📊 MAMSS PREP Live CBT — " + s.title + "\n" + g.rows.length + " sat · class average " +
          (g.rows.length ? Math.round(g.rows.reduce(function (x, r) { return x + r.pct; }, 0) / g.rows.length) : 0) + "%\n" + top +
          (hardest ? "\nHardest question: #" + (hardest.i + 1) + " (" + hardest.pct + "% correct)" : "");
        try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch (e) {}
        window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
      };
    }).catch(renderFailure);
  }

  /* ---------------------------------------------------------------- api */
  window.MAMSS_CBT = {
    version: VERSION,
    mount: mount,
    openTeacher: openConsole,
    join: doJoin,
    _test: {
      makeCode: makeCode, normCode: normCode, gradePaper: gradePaper, me: me, cfg: cfg, rest: rest,
      cam: function () { return { on: camState.on, tracks: camState.stream ? camState.stream.getTracks().map(function (t) { return t.readyState; }) : [] }; },
      cams: function () { return camFrames; }
    }
  };
  try {
    window.addEventListener("study:view", function (e) {
      if (e.detail === "cbt" && $("cbtRoot")) mount();
    });
  } catch (e) {}
})();
