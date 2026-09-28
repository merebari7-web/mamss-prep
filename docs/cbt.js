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

  var VERSION = "66";
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
      ".cbt-card h2,.cbt-card h3{margin:0 0 4px;font-size:1.06rem;color:var(--ink,#002147)}" +
      ".cbt-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}" +
      ".cbt-sub{color:var(--mut,#5b6b84);font-size:.85rem;margin:0 0 12px}" +
      ".cbt-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}" +
      ".cbt-inp,select.cbt-inp{flex:1;min-width:0;max-width:100%;padding:11px 13px;border:1.5px solid var(--line,rgba(0,33,71,.2));border-radius:10px;font:inherit;background:var(--card,#fff);color:var(--ink,#002147)}" +
      ".cbt-code-inp{text-transform:uppercase;letter-spacing:.22em;font-weight:800;text-align:center;max-width:190px}" +
      ".cbt-btn{border:0;border-radius:10px;padding:11px 18px;font:700 .92rem inherit;cursor:pointer;background:#002147;color:#fff}" +
      ".cbt-btn.gold{background:linear-gradient(135deg,#c9a227,#a67c1e);color:#fff}" +
      ".cbt-btn.ghost{background:transparent;color:#002147;border:1.5px solid rgba(0,33,71,.25)}" +
      ".cbt-btn.danger{background:#8a1f1f;color:#fff}" +
      ".cbt-btn:disabled{opacity:.45;cursor:not-allowed}" +
      ".cbt-chip{display:inline-block;padding:3px 10px;border-radius:99px;font-size:.74rem;font-weight:800;letter-spacing:.04em}" +
      ".cbt-chip.waiting{background:rgba(201,162,39,.16);color:#7a5c10}" +
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
      /* a select's longest option is its min-content width; never let it force
         the grid track wider than the viewport (v67: the voice select) */
      ".cbt-grid2 select.cbt-inp{min-width:0;width:100%}" +
      ".cbt-quiet{border:1px dashed rgba(0,33,71,.28);border-radius:14px;padding:26px 22px;text-align:center;background:rgba(0,33,71,.025);margin-top:14px}" +
      ".cbt-quiet-ico{width:34px;height:34px;color:#002147}" +
      ".cbt-quiet h3{font:400 1.5rem/1.2 Georgia,'Times New Roman',serif;margin:10px 0 6px;color:#002147}" +
      ".cbt-quiet p{color:#5b6b84;font-size:.9rem;max-width:46ch;margin:0 auto}" +
      ".cbt-quiet-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;list-style:none;margin:18px 0 0;padding:0;text-align:left}" +
      ".cbt-quiet-steps li{border-top:2px solid #c9a227;padding:8px 2px 0}" +
      ".cbt-quiet-steps b{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#002147}" +
      ".cbt-quiet-steps span{font-size:.8rem;color:#5b6b84}" +
      ".cbt-quiet-next{margin:14px 0 0;font-size:.85rem;color:#002147;text-align:center}" +
      ".cbt-board-live-wrap{display:grid;gap:8px;margin-top:14px}" +
      ".cbt-board-live{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1.5px solid #14783c;background:#f2f9f4;border-radius:12px;padding:12px 14px;cursor:pointer;font:inherit}" +
      ".cbt-board-live b{color:#0b5c33;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".cbt-board-live small{color:#5b6b84}" +
      ".cbt-board-cta{color:#0b5c33;font-weight:800;white-space:nowrap}" +
      "@media(max-width:600px){.cbt-quiet-steps{grid-template-columns:1fr}.cbt-board-live{flex-wrap:wrap}}" +
      
      ".cbt-row input[type=file]{min-height:32px}" +
      "@media(max-width:720px){.cbt-grid2{grid-template-columns:1fr}" +
      ".cbt-table{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;contain:layout style}" +
      ".cbt-row input[type=file]{flex:1 1 100%;min-width:0;max-width:100%;min-height:38px}" +
      ".cbt-inp,select.cbt-inp{min-width:0;width:100%}}" +
      ".cbt-card code{overflow-wrap:anywhere;word-break:break-word}" +
      ".cbt-row input[type=checkbox]{width:20px;height:20px;flex:none;accent-color:#002147}" +
      ".cbt-tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}" +
      ".cbt-tab{border:1.5px solid rgba(0,33,71,.2);background:transparent;border-radius:99px;padding:8px 16px;font:700 .85rem inherit;cursor:pointer;color:#3c4a63}" +
      ".cbt-tab.on{background:#002147;border-color:#002147;color:#fff}" +
      ".cbt-bar{display:flex;gap:3px;align-items:flex-end;height:44px}.cbt-hbar{height:10px;background:rgba(20,38,59,.08);border-radius:999px;overflow:hidden}.cbt-hbar>i{display:block;height:100%;background:#2f7d4f;border-radius:999px}" +
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
      ".cbt-vox-tile .vox-lvl{height:6px;border-radius:3px;background:rgba(0,33,71,.1);overflow:hidden;margin:6px 0}" +
      ".cbt-vox-tile .vox-lvl i{display:block;height:100%;width:2%;background:#a44f37;transition:width .5s ease}" +
      ".cbt-vox-audio{width:100%;margin-top:6px;height:34px}" +
      ".cbt-cup-strip{margin-top:10px;padding:9px 13px;border-radius:10px;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.35);font-size:.9rem}" +
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
  var ui = { tab: "home", session: null, attempt: null, answers: [], draft: null, busy: false, order: [], pos: 0, marks: {} };

  /* ================================================== v55 live cameras ==
     Ephemeral by design: frames ride the realtime broadcast channel and are
     NEVER written to any table or bucket — what the teacher sees exists only
     while the exam runs. Students always preview themselves first, the
     browser permission prompt can never be bypassed, and the attempt row
     records only a status word (on/denied/unavailable/skipped).            */
  var CAM_INTERVAL = 12000;
  var camState = { stream: null, video: null, timer: 0, on: false, err: "" };
  var camFrames = {}, camTickN = 0;
  var voxState = { on: false, stream: null, rec: null, lvlTimer: 0, ctxA: null, analyser: null, err: "" };
  var voxBuf = {}, voxLvls = {}, voxPlaying = {};
  function camInterval() { return (+window.__CBT_CAM_MS > 0 ? +window.__CBT_CAM_MS : 0) || CAM_INTERVAL; }
  function camMode(s) { return "required"; }   /* v70 school policy: every paper is proctored */
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

  /* ------------------------------------------------- v67 live room audio
     Ephemeral like the cameras: chunks ride the realtime broadcast channel
     and are never written to any table. The teacher's console keeps a short
     rolling buffer in memory only — when the paper ends, the sound is gone. */
  function voiceMode(s) { return "required"; }  /* v70 school policy: every paper is heard */
  function voxChunkMs() { return (+window.__CBT_VOX_MS > 0 ? +window.__CBT_VOX_MS : 0) || 15000; }
  function voxPickMime() {
    var cands = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    for (var i = 0; i < cands.length; i++) {
      try { if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (e) {}
    }
    return "";
  }
  function b64buf(buf) {
    var bytes = new Uint8Array(buf), out = "", CH = 8192;
    for (var i = 0; i < bytes.length; i += CH) out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(out);
  }
  function enableVox(onOk, onErr) {
    if (voxState.on) { if (onOk) onOk(); return; }
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || !window.MediaRecorder) {
      voxState.err = "This browser cannot record audio."; stampVoice("unavailable"); if (onErr) onErr(voxState.err); return;
    }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then(function (stream) {
        voxState.stream = stream; voxState.on = true; voxState.err = "";
        var mime = voxPickMime();
        var rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        voxState.rec = rec;
        rec.ondataavailable = function (ev) {
          try {
            if (!ev.data || !ev.data.size || !room) return;
            ev.data.arrayBuffer().then(function (buf) {
              if (!buf || buf.byteLength > 900000) return;          /* broadcast-sized chunks only */
              room.notify("vox", { aud: b64buf(buf), mime: rec.mimeType || "audio/webm", n: me().name });
            }).catch(function () {});
          } catch (e) {}
        };
        rec.start(voxChunkMs());
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            voxState.ctxA = new AC();
            var src = voxState.ctxA.createMediaStreamSource(stream);
            voxState.analyser = voxState.ctxA.createAnalyser();
            voxState.analyser.fftSize = 512;
            src.connect(voxState.analyser);
          }
        } catch (e) {}
        if (voxState.lvlTimer) clearInterval(voxState.lvlTimer);
        voxState.lvlTimer = setInterval(sendVoxLevel, Math.max(1000, Math.round(voxChunkMs() / 6)));
        stampVoice("on");
        if (onOk) onOk();
      })
      .catch(function (e) {
        var denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
        voxState.err = denied ? "Microphone permission was denied." : "No microphone could be started (" + ((e && e.name) || "error") + ").";
        stampVoice(denied ? "denied" : "unavailable");
        if (onErr) onErr(voxState.err);
      });
  }
  function sendVoxLevel() {
    if (!voxState.on || !voxState.analyser || !room) return;
    try {
      if (typeof voxState.analyser.getByteTimeDomainData !== "function") return;
      var arr = new Uint8Array(voxState.analyser.fftSize);
      voxState.analyser.getByteTimeDomainData(arr);
      var sum = 0;
      for (var i = 0; i < arr.length; i++) { var v = (arr[i] - 128) / 128; sum += v * v; }
      room.notify("voxlvl", { lvl: Math.min(100, Math.round(Math.sqrt(sum / arr.length) * 300)), n: me().name });
    } catch (e) {}
  }
  function stopVox() {
    if (voxState.lvlTimer) { clearInterval(voxState.lvlTimer); voxState.lvlTimer = 0; }
    try { if (voxState.rec && voxState.rec.state !== "inactive") voxState.rec.stop(); } catch (e) {}
    if (voxState.stream) { try { voxState.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
    try { if (voxState.ctxA && voxState.ctxA.close) voxState.ctxA.close(); } catch (e) {}
    voxState.rec = null; voxState.stream = null; voxState.on = false; voxState.analyser = null; voxState.ctxA = null;
  }
  function stampVoice(v) {
    try {
      if (ui.attempt) ui.attempt.voice = v;
      if (ui.session && !st.get("nssc_cbt_nocols", 0))
        patchAttempt(ui.session.code, me().did, { voice: v }).then(function (r) {
          if (r && r.status === 400) st.set("nssc_cbt_nocols", 1);   /* server predates the column */
        }).catch(function () {});
    } catch (e) {}
  }
  function attachCamVideo(elm) {
    if (!elm) return;
    camState.video = elm;
    try { elm.srcObject = camState.stream; if (elm.play) { var pr = elm.play(); if (pr && pr.catch) pr.catch(function () {}); } } catch (e) {}
  }
  function voxCell(v) {
    return v === "on" ? "🎙" : v === "denied" ? '<span style="color:#8a1f1f">denied</span>' : v === "unavailable" ? '<span class="cbt-muted">no mic</span>' : v === "skipped" ? '<span style="color:#8a6d1f">skipped</span>' : "—";
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

  function updateVox() {
    var host = $("cbtVox"); if (!host) return;
    var ids = {};
    Object.keys(voxBuf).forEach(function (k) { ids[k] = 1; });
    Object.keys(voxLvls).forEach(function (k) { ids[k] = 1; });
    ids = Object.keys(ids);
    if (!ids.length) {
      if (!host.querySelector("p")) host.innerHTML = '<p class="cbt-muted">Waiting for microphones — a tile appears the moment a student enables theirs.</p>';
      return;
    }
    var ph = host.querySelector("p"); if (ph) ph.remove();
    ids.forEach(function (did) {
      var b = voxBuf[did] || { chunks: [], name: (voxLvls[did] || {}).name || "Student" };
      var l = voxLvls[did] || { lvl: 0 };
      var tile = document.getElementById("vox-" + cssId(did));
      if (!tile) {
        tile = el("div", { class: "cbt-cam cbt-vox-tile", id: "vox-" + cssId(did) });
        tile.innerHTML = "<b></b>" +
          '<div class="vox-lvl" aria-hidden="true"><i></i></div>' +
          '<small class="cbt-muted"></small>' +
          '<div class="cbt-row"><button class="cbt-btn ghost cbt-vox-play" type="button">▶ Listen live</button></div>' +
          '<audio class="cbt-vox-audio" controls hidden preload="none"></audio>';
        host.appendChild(tile);
      }
      var fresh = Math.max(b.at || 0, l.at || 0) > Date.now() - 30000;
      tile.querySelector("b").textContent = b.name || l.name || "Student";
      tile.querySelector(".vox-lvl i").style.width = Math.max(2, Math.min(100, l.lvl || 0)) + "%";
      tile.querySelector("small").textContent = (b.chunks && b.chunks.length ? b.chunks.length + " live chunk" + (b.chunks.length === 1 ? "" : "s") : "listening…") + (fresh ? " · live" : " · stale");
      tile.querySelector(".cbt-vox-play").onclick = function () { playVox(did, tile); };
    });
  }
  function playVox(did, tile) {
    var aud = tile.querySelector("audio");
    var btn = tile.querySelector(".cbt-vox-play");
    if (voxPlaying[did]) {
      try { aud.pause(); } catch (e) {}
      if (aud.src) { try { URL.revokeObjectURL(aud.src); } catch (e) {} aud.removeAttribute("src"); }
      aud.hidden = true;
      delete voxPlaying[did];
      if (btn) btn.textContent = "▶ Listen live";
      return;
    }
    var b = voxBuf[did];
    if (!b || !b.chunks || !b.chunks.length) { toast("No audio has arrived from this device yet", "🎙"); return; }
    try {
      var total = 0;
      var bins = b.chunks.map(function (c2) { var s2 = atob(c2); total += s2.length; return s2; });
      var bytes = new Uint8Array(total), off = 0;
      bins.forEach(function (s2) { for (var i = 0; i < s2.length; i++) bytes[off++] = s2.charCodeAt(i); });
      if (aud.src) { try { URL.revokeObjectURL(aud.src); } catch (e) {} }
      aud.src = URL.createObjectURL(new Blob([bytes], { type: b.mime || "audio/webm" }));
      aud.hidden = false;
      var pr = aud.play(); if (pr && pr.catch) pr.catch(function () {});
      voxPlaying[did] = 1;
      if (btn) btn.textContent = "⏹ Stop";
    } catch (e) { toast("Could not play that audio in this browser", "⚠️"); }
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
    if (ui.tab === "done" || ui.tab === "waiting") { closeRoom(); stopCam(); stopVox(); ui.tab = "home"; }
    dashStop();
    render();
  }
  function render() {
    if (!root) return;
    try {
      if (ui.tab === "home") return renderHome();
      if (ui.tab === "who") return renderWho();
      if (ui.tab === "join") return renderJoin();
      if (ui.tab === "waiting") return renderWaiting();
      if (ui.tab === "run") return renderRun();
      if (ui.tab === "camgate") return renderCamGate();
      if (ui.tab === "brief") return renderBrief();
      if (ui.tab === "review") return renderReview();
      if (ui.tab === "cert") return renderCert();
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


  /* v61 — the hall board: live now / next on the board / the quiet hall */
  function fmtWhen(s) {
    try { return new Date(s).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return String(s || ""); }
  }
  /* ------------------------------------------- v68 The House Cup
     The persistent class-vs-class board: every ended Waecathon settles
     3·2·1 points into a cup table that outlasts every sitting. Computed
     from rows that already exist (cbt_attempts.cls + the session's
     waecathon flag) — no new columns, no new tables. Degrades quietly:
     no ledger, offline, or a server that predates the cls column all
     mean "no cup line", never an error. */
  function cupStandings(sits) {
    var agg = {}, settled = 0;
    (sits || []).forEach(function (sit) {
      var houses = {};
      (sit.rows || []).forEach(function (r) {
        if (!r.cls || (r.status !== "submitted" && r.status !== "autosubmitted")) return;
        if (!(+r.total > 0) || r.score == null) return;
        var h2 = houses[r.cls] || (houses[r.cls] = { n: 0, sum: 0, best: null });
        var pct = Math.round(r.score / r.total * 100);
        h2.n++; h2.sum += pct;
        if (!h2.best || pct > h2.best.pct) h2.best = { name: r.name || "Anonymous", pct: pct };
      });
      var list = Object.keys(houses).map(function (k) { return { house: k, n: houses[k].n, avg: houses[k].sum / houses[k].n, best: houses[k].best }; });
      if (!list.length) return;
      list.sort(function (a, b) { return b.avg - a.avg || b.n - a.n; });
      settled++;
      list.forEach(function (x, i) {
        var a2 = agg[x.house] || (agg[x.house] = { house: x.house, pts: 0, wins: 0, sittings: 0, sitters: 0, sum: 0, best: null });
        a2.pts += [3, 2, 1][i] || 0;
        if (i === 0) a2.wins++;
        a2.sittings++; a2.sitters += x.n; a2.sum += x.avg * x.n;
        if (x.best && (!a2.best || x.best.pct > a2.best.pct)) a2.best = x.best;
      });
    });
    var standings = Object.keys(agg).map(function (k) { var a2 = agg[k]; a2.avg = a2.sitters ? Math.round(a2.sum / a2.sitters) : 0; return a2; });
    standings.sort(function (a, b) { return b.pts - a.pts || b.wins - a.wins || b.avg - a.avg; });
    return { standings: standings, sittings: settled };
  }
  function cupFetch(limit) {
    var c = cfg(); if (!c) return Promise.resolve(null);
    var cached = st.get("nssc_cbt_cup", null);
    if (cached && Date.now() - cached.at < 600000) return Promise.resolve(cached.cup);
    if (st.get("nssc_cbt_nocols", 0)) return Promise.resolve(null);   /* pre-ALTER server: no houses, no cup */
    return rest("cbt_sessions?select=code,title,status,settings&settings->>waecathon=eq.true&status=eq.ended&order=created_at.desc&limit=" + (limit || 12))
      .then(function (r) {
        if (!r.ok) return cached ? cached.cup : null;
        var sess = r.json || [], bad = false;
        return Promise.all(sess.map(function (s2) {
          return rest("cbt_attempts?session_code=eq." + encodeURIComponent(s2.code) + "&select=cls,name,score,total,status&limit=400")
            .then(function (ra) {
              if (ra.status === 400) { bad = true; return null; }
              return { code: s2.code, title: s2.title, rows: ra.ok ? ra.json || [] : [] };
            });
        })).then(function (sits) {
          if (bad) { st.set("nssc_cbt_nocols", 1); return null; }
          sits = (sits || []).filter(function (x) { return x && x.rows && x.rows.length; });
          var cup = cupStandings(sits);
          st.set("nssc_cbt_cup", { at: Date.now(), cup: cup });
          return cup;
        });
      }).catch(function () { return cached ? cached.cup : null; });
  }
  function cupLine(cup) {
    return cup.standings.map(function (x, i) { return (i === 0 ? "<b>" : "") + esc(x.house) + " " + x.pts + (i === 0 ? "</b>" : ""); }).join(" · ");
  }
  function cupStrip() {
    var box = $("cbtBoard"); if (!box) return;
    cupFetch(6).then(function (cup) {
      var old = $("cbtCupStrip"); if (old) old.remove();
      if (!cup || !cup.standings.length) return;
      var d = el("div", { id: "cbtCupStrip", class: "cbt-cup-strip" });
      d.innerHTML = "🏆 <b>House Cup</b> — " + esc(cup.standings[0].house) + " lead on " + cup.standings[0].pts +
        " pts after " + cup.sittings + " Waecathon" + (cup.sittings === 1 ? "" : "s") + " · " + cupLine(cup);
      box.appendChild(d);
    }).catch(function () {});
  }
  function cupWaText(cup) {
    var txt = "🏆 MAMSS PREP House Cup — after " + cup.sittings + " Waecathon" + (cup.sittings === 1 ? "" : "s") + "\n" +
      cup.standings.map(function (x, i) {
        return (i + 1) + ". " + x.house + " — " + x.pts + " pts (" + x.wins + " win" + (x.wins === 1 ? "" : "s") + ", " + x.avg + "% avg, best " + (x.best ? x.best.pct + "% by " + x.best.name : "—") + ")";
      }).join("\n") +
      "\n\nThe Cup lives on the school server — every Friday Waecathon settles 3·2·1 points into it.";
    try { var cp = navigator.clipboard && navigator.clipboard.writeText(txt); if (cp && cp.catch) cp.catch(function () {}); } catch (e) {}
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
  }
  function drawCupPanel() {
    cupFetch(0).then(function (cup) {
      var hostD = $("cbtCupPanel"); if (!hostD) return;
      if (!cup || !cup.standings.length) {
        hostD.innerHTML = '<h3 style="margin:16px 0 6px">🏆 The House Cup</h3>' +
          '<div class="cbt-note">The Cup begins when the first Friday Waecathon ends. Schedule one in tab 1 — the 🏆 template drafts the whole paper in one tap.</div>';
        return;
      }
      hostD.innerHTML = '<h3 style="margin:16px 0 6px">🏆 The House Cup</h3>' +
        '<p class="cbt-sub">Every ended Waecathon settles 3 points to the leading house, 2 to the second, 1 to the third. The Cup outlasts every sitting.</p>' +
        '<table class="cbt-table"><thead><tr><th>House</th><th>Cup pts</th><th>Wins</th><th>Waecathons</th><th>Sat</th><th>Average</th><th>Best single</th></tr></thead><tbody>' +
        cup.standings.map(function (x, i) {
          return "<tr><td>" + (i === 0 ? "<b>🥇 " : "") + esc(x.house) + (i === 0 ? "</b>" : "") + "</td><td><b>" + x.pts + "</b></td><td>" + x.wins + "</td><td>" + x.sittings + "</td><td>" + x.sitters + "</td><td>" + x.avg + "%</td><td>" + esc(x.best ? x.best.name + " — " + x.best.pct + "%" : "—") + "</td></tr>";
        }).join("") + "</tbody></table>" +
        '<div class="cbt-row"><button class="cbt-btn ghost" id="cbtCupWa">💬 House Cup summary</button></div>';
      var wb = $("cbtCupWa");
      if (wb) wb.onclick = function () { cupWaText(cup); };
    }).catch(function () {});
  }
  function schedAt(x) { return (x.settings && x.settings.scheduledAt) || x.scheduled_at || ""; }
  function fillBoard() {
    var box = $("cbtBoard"); if (!box) return;
    var c = cfg(); if (!c) return;
    try {
      fetch(c.url + "/rest/v1/cbt_sessions?select=code,title,status,settings,cls,subject&order=created_at.desc&limit=20", { headers: { "apikey": c.key } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          rows = rows || [];
          var mine = function (x) { return !x.cls || x.cls === "ALL" || x.cls === clsOf(); };
          var live = rows.filter(function (x) { return x.status === "live" && mine(x); });
          var sched = rows.filter(function (x) { return x.status === "scheduled" && schedAt(x) && mine(x); });
          sched.sort(function (a, b) { return schedAt(a) < schedAt(b) ? -1 : 1; });
          var out = "";
          if (live.length) {
            out += '<div class="cbt-board-live-wrap">' + live.map(function (x) {
              return '<button class="cbt-board-live" data-joincode="' + esc(x.code) + '"><span class="cbt-live-dot"></span><b>' + esc(x.title || x.code) + '</b><small>' + esc((x.cls || "") + (x.subject ? " · " + x.subject : "")) + '</small><span class="cbt-board-cta">Join now →</span></button>';
            }).join("") + '</div>';
          }
          if (sched.length) {
            out += '<p class="cbt-quiet-next">Next on the board: ' + sched.slice(0, 2).map(function (x) {
              return '<b>' + esc(x.title || x.code) + '</b> · ' + esc(fmtWhen(schedAt(x)));
            }).join(" &nbsp;·&nbsp; ") + '</p>';
          }
          if (!live.length && !sched.length) {
            out += '<div class="cbt-quiet"><svg class="mp-ico cbt-quiet-ico" aria-hidden="true"><use href="#i-bolt"></use></svg>' +
              '<h3>The hall is quiet.</h3>' +
              '<p>No paper is live right now. When your teacher presses <b>Go live</b>, the session appears here and on your class board — join with the 6-character code, or tap the session itself.</p>' +
              '<ol class="cbt-quiet-steps"><li><b>Board</b><span>The teacher posts the paper; the code goes on the class board.</span></li>' +
              '<li><b>Seat</b><span>You join with your activation — one device, one sitting.</span></li>' +
              '<li><b>Bell</b><span>The clock starts for everyone at once; answers save as you give them.</span></li></ol></div>';
          }
          box.innerHTML = out;
          Array.prototype.forEach.call(box.querySelectorAll("[data-joincode]"), function (b) {
            b.onclick = function () {
              var i2 = $("cbtJoinCode"); if (i2) { i2.value = b.getAttribute("data-joincode"); var j2 = $("cbtJoinBtn"); if (j2) j2.click(); }
            };
          });
          cupStrip();
        }).catch(function () {});
    } catch (e) {}
  }

  /* ----------------------------------------------------------------- home */
  function renderWho() {
    var id = me();
    var g0 = 0; try { g0 = +JSON.parse(localStorage.getItem("study_grade") || "0") || 0; } catch (e) {}
    var h = '<div class="cbt-card cbt-who" style="text-align:center"><span class="cbt-chip waiting">THE SITTING DOOR</span>' +
      "<h2 style='margin-top:10px'>Who sits today?</h2>" +
      '<p class="cbt-sub">Every paper in the hall is set for a class. Write your name and choose your class once — the hall then shows you only the papers set for you, and your name goes on every answer sheet.</p>' +
      '<div style="max-width:340px;margin:14px auto 4px"><input class="cbt-inp" id="cbtWhoName" maxlength="40" aria-label="Your name" placeholder="Your full name — as it should appear on results" value="' + esc(st.get("nssc_cbt_name") || id.name || "") + '"></div>' +
      '<div class="cbt-tabs" role="group" aria-label="Your class" style="justify-content:center;margin:10px 0">' +
      SCHOOL_CLASSES.map(function (c, i) { return '<button class="cbt-tab' + (i === g0 ? " on" : "") + '" data-who-cls="' + i + '">' + c + "</button>"; }).join("") + "</div>" +
      '<div id="cbtWhoFb" role="status"></div>' +
      '<button class="cbt-btn gold" id="cbtWhoGo" style="margin-top:10px">Enter the hall</button>' +
      '<p class="cbt-muted">You can change this any time from the hall — one tap under the hall&#39;s title.</p></div>';
    root.innerHTML = wrap(h);
    var pickI = g0;
    root.querySelectorAll("[data-who-cls]").forEach(function (b) {
      b.onclick = function () {
        pickI = +b.getAttribute("data-who-cls");
        root.querySelectorAll("[data-who-cls]").forEach(function (x) { x.classList.toggle("on", x === b); });
      };
    });
    $("cbtWhoGo").onclick = function () {
      var nm = ($("cbtWhoName").value || "").trim().replace(/\s+/g, " ");
      if (nm.length < 2) { $("cbtWhoFb").innerHTML = errBox("Write your name as it should appear on your result sheet."); return; }
      st.set("nssc_cbt_name", nm);
      st.set("study_grade", pickI);
      st.set("nssc_cbt_who", 1);
      toast("Welcome, " + nm + " · " + SCHOOL_CLASSES[pickI], "🎓");
      ui.tab = "home";
      render();
    };
  }
  function renderHome() {
    var id = me();
    if (!id.teacher && !st.get("nssc_cbt_who", 0)) { ui.tab = "who"; return renderWho(); }
    var recent = st.get("nssc_cbt_recent", []) || [];
    var mine = st.get("nssc_cbt_mine", []) || [];
    var h = "";
    h += '<div class="cbt-card"><h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2><p class="cbt-sub">Real-time examinations posted by your teachers. Join with the session code from the board — your activation is your identity; no signup.</p>' +
      (id.teacher ? "" : '<p class="cbt-sub"><button class="cbt-btn ghost" id="cbtWhoChange" style="padding:6px 11px">🎓 Sitting as ' + esc(st.get("nssc_cbt_name") || id.name || "—") + " · " + esc(clsOf()) + " — change</button></p>");
    if (!cfg()) {
      h += '<div class="cbt-note">This installation has no school server configured — Live CBT needs the school\'s Supabase ledger config in codes.js.</div>';
    } else {
      h += '<div class="cbt-row"><input id="cbtJoinCode" class="cbt-inp cbt-code-inp" placeholder="ABC-123" maxlength="9" autocapitalize="characters" spellcheck="false" aria-label="Live session code"><button class="cbt-btn gold" id="cbtJoinBtn">Join live session</button></div>';
      h += '<div id="cbtJoinFb" role="status"></div>';
      h += '<div id="cbtBoard" role="status"></div>';
    }
    h += "</div>";
    if (id.teacher) {
      h += '<div class="cbt-card"><h3><svg class="mp-ico" aria-hidden="true"><use href="#i-grid"></use></svg> Teacher console</h3><p class="cbt-sub">Your slip carries the teacher role. Build a paper from the question bank, go live with a session code, monitor every device, release results.</p><button class="cbt-btn" id="cbtConsoleBtn">Open teacher console</button></div>';
    } else {
      h += '<div class="cbt-card"><h3><svg class="mp-ico" aria-hidden="true"><use href="#i-shield"></use></svg> Are you a teacher?</h3><p class="cbt-sub">The console unlocks automatically on devices activated with a <b>TEACHER</b> slip from the school office.</p></div>';
    }
    if (recent.length) {
      h += '<div class="cbt-card"><h3><svg class="mp-ico" aria-hidden="true"><use href="#i-clock"></use></svg> Your recent sessions</h3><table class="cbt-table"><tr><th>Session</th><th>When</th><th>Result</th><th><span class="cbt-vh">Actions</span></th></tr>';
      recent.slice(0, 6).forEach(function (r) {
        h += "<tr><td><b>" + esc(r.title || prettyCode(r.code)) + "</b><br><small class='cbt-muted'>" + esc(prettyCode(r.code)) + "</small></td><td>" + esc(r.at || "") + "</td><td>" + esc(r.score != null ? r.score + "/" + r.total + (r.pct != null ? " · " + r.pct + "%" : "") : r.status || "—") + "</td><td><button class='cbt-btn ghost' data-reopen='" + esc(r.code) + "'>Open</button></td></tr>";
      });
      h += "</table></div>";
    }
    if (id.teacher && mine.length) {
      h += '<div class="cbt-card"><h3><svg class="mp-ico" aria-hidden="true"><use href="#i-calendar"></use></svg> Sessions you posted</h3><table class="cbt-table"><tr><th>Session</th><th>Code</th><th>Created</th><th><span class="cbt-vh">Actions</span></th></tr>';
      mine.slice(0, 8).forEach(function (m) {
        h += "<tr><td><b>" + esc(m.title) + "</b></td><td class='cbt-muted'>" + esc(prettyCode(m.code)) + "</td><td>" + esc(m.at || "") + "</td><td><button class='cbt-btn ghost' data-reopen='" + esc(m.code) + "'>Console</button></td></tr>";
      });
      h += "</table></div>";
    }
    root.innerHTML = wrap(h);
    fillBoard();
    var wc = $("cbtWhoChange"); if (wc) wc.onclick = function () { ui.tab = "who"; render(); };
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
    root.innerHTML = wrap('<div class="cbt-card"><h2>' + esc(msg || "Talking to the school server…") + '</h2><p class="cbt-sub cbt-muted">One moment.</p></div>');
  }
  function renderFailure(e) {
    if (e && e.setup) { root.innerHTML = wrap('<div class="cbt-card"><h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2>' + errBox(null, true) + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>'); var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); }; return; }
    root.innerHTML = wrap('<div class="cbt-card"><h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2>' + errBox("Could not reach the school server (" + esc(e && e.message || e) + "). Live CBT needs a connection — your practice progress is untouched." ) + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>');
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
      if (!s) { go("home"); var f = $("cbtJoinFb"); root.innerHTML = wrap('<div class="cbt-card"><h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2>' + errBox("No live session with code " + esc(prettyCode(code)) + ". Check the board and try again.") + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>'); var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); }; return; }
      if (s.cls && s.cls !== "ALL" && s.cls !== clsOf()) {
        go("home");
        root.innerHTML = wrap('<div class="cbt-card"><h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2>' + errBox("That paper is set for <b>" + esc(s.cls) + "</b>. You are sitting as <b>" + esc(clsOf()) + "</b> — if that is wrong, change your class at the sitting door, or ask your teacher for your class code.") + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>');
        var b3 = $("cbtBackHome"); if (b3) b3.onclick = function () { go("home"); };
        return;
      }
      enterStudent(s);
    }).catch(renderFailure);
  }
  function enterStudent(s) {
    ui.session = s;
    var id = me();
    var attemptRow = { session_code: s.code, device_id: id.did, name: st.get("nssc_cbt_name") || id.name, slip: id.slip, status: "waiting" };
    if (!st.get("nssc_cbt_nocols", 0)) attemptRow.cls = clsOf();
    joinAttempt(attemptRow).then(function (r) {
      if (r.status === 400 && attemptRow.cls !== undefined) {
        /* server predates the class column — remember and join without it */
        st.set("nssc_cbt_nocols", 1);
        delete attemptRow.cls;
        return joinAttempt(attemptRow).then(function (r2) {
          if (r2.ok) return afterJoin(s, null);
          if (r2.status === 409) return getAttempt(s.code, id.did).then(function (a) { return afterJoin(s, a); });
          throw new Error("join failed (" + r2.status + ")");
        });
      }
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
      root.innerHTML = wrap('<div class="cbt-card"><h2>' + esc(s.title) + "</h2>" + errBox("This session has already ended.") + '<button class="cbt-btn ghost" id="cbtBackHome">Back</button></div>');
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
    return '<div class="cbt-card" style="text-align:center"><h2>📹 Webcam monitoring is ' + (mode === "required" ? "required" : "optional") + " for this exam</h2>" +
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
  function voiceCard(s) {
    var mode = voiceMode(s);
    if (mode === "off") return "";
    return '<div class="cbt-card" style="text-align:center"><h2>🎙 Live room audio is ' + (mode === "required" ? "required" : "optional") + " for this exam</h2>" +
      '<p class="cbt-sub">' + (mode === "required" ? "Enable your microphone now so the room is live the moment the paper starts." : "You may enable your microphone — it lets your teacher hear the exam room.") +
      " Audio goes live to your teacher&#39;s console only, in short chunks. Nothing is recorded or stored.</p>" +
      '<button class="cbt-btn' + (mode === "required" ? " gold" : " ghost") + '" id="cbtWaitVoxBtn">🎙 Enable my microphone</button>' +
      '<div id="cbtWaitVoxFb"></div></div>';
  }
  function wireVoxCard() {
    var vb = $("cbtWaitVoxBtn");
    if (!vb) return;
    vb.onclick = function () {
      vb.disabled = true;
      enableVox(function () {
        vb.disabled = false; vb.className = "cbt-btn ghost"; vb.textContent = "✔ Microphone on — your teacher can hear the room";
        vb.onclick = null;
        var f = $("cbtWaitVoxFb"); if (f) f.innerHTML = "";
      }, function (msg) {
        vb.disabled = false;
        var f = $("cbtWaitVoxFb"); if (f) f.innerHTML = errBox(msg + " You can retry here, or enable it later inside the exam.");
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
    var h = '<div class="cbt-card" style="text-align:center"><span class="cbt-chip waiting">WAITING ROOM</span><h2 style="margin-top:10px">' + esc(s.title) + "</h2>" +
      '<p class="cbt-sub">Posted by ' + esc(s.teacher || "your teacher") + " · " + esc(s.cls) + (s.subject ? " · " + esc(s.subject) : " · mixed subjects") + "</p>" + sched +
      '<div class="cbt-big-code">' + esc(prettyCode(s.code)) + "</div>" +
      '<p class="cbt-sub" id="cbtWaitingCount">Counting devices…</p>' +
      '<p class="cbt-sub">' + qs.length + " questions · " + mmss(s.duration_s) + " · one attempt per device · answers save as you go</p>" +
      '<div class="cbt-note">📵 When the paper starts, leaving this tab is logged. Put your phone on silent and stay put.</div>' +
      '<button class="cbt-btn ghost" id="cbtLeave">Leave the hall</button></div>' + camCard(s) + voiceCard(s);
    root.innerHTML = wrap(h);
    var lb = $("cbtLeave"); if (lb) lb.onclick = function () { stopCam(); stopVox(); go("home"); toast("Left the waiting room — your spot is kept", "🚪"); };
    wireCamCard("cbtWaitCamBtn", "cbtWaitCamWrap", "cbtWaitCamVideo", "cbtWaitCamFb");
    wireVoxCard();
    renderWaitingCount(s);
  }

  /* --------------------------------------- seeded shuffle (v69 Gold Standard) */
  function seed32(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function permSeeded(n, seed) {
    var a = [], x = seed >>> 0, i, j, t;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; j = x % (i + 1); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function shuffleOn(s) { return !!(s && s.settings && s.settings.shuffle); }
  function buildOrder(s, id) {
    var qs = s.questions || [], base = [], i;
    for (i = 0; i < qs.length; i++) base.push(i);
    if (!shuffleOn(s) || !qs.length) return base;
    return permSeeded(qs.length, seed32(id.did + "|" + normCode(s.code)));
  }
  function optPermFor(s, id, qi) {
    if (!shuffleOn(s)) return [0, 1, 2, 3];
    return permSeeded(4, seed32(id.did + "|" + normCode(s.code) + "|o" + qi));
  }
  function answeredAt(orig) {
    for (var i = 0; i < ui.answers.length; i++) if (ui.answers[i].q_idx === orig) return ui.answers[i];
    return null;
  }
  function firstOpenPos() {
    for (var p2 = 0; p2 < ui.order.length; p2++) if (!answeredAt(ui.order[p2])) return p2;
    return -1;
  }
  function marksKey(s, id) { return "nssc_cbt_marks_" + normCode(s.code) + "_" + id.did; }
  function briefedKey(s, id) { return "nssc_cbt_brief_" + normCode(s.code) + "_" + id.did; }
  function paletteHtml() {
    var cells = ui.order.map(function (orig, p2) {
      var cls = "cbt-pal";
      if (answeredAt(orig)) cls += " done";
      if (ui.marks[orig]) cls += " mark";
      if (p2 === ui.pos && (ui.tab === "run")) cls += " cur";
      return '<button type="button" class="' + cls + '" data-pal="' + p2 + '" aria-label="Question ' + (orig + 1) + '">' + (orig + 1) + "</button>";
    }).join("");
    return cells;
  }
  function palCounts() {
    var done = ui.answers.length, marked = Object.keys(ui.marks).filter(function (k) { return ui.marks[k]; }).length;
    var open = ui.order.length - done;
    return done + " answered · " + marked + " marked · " + open + " to go";
  }
  function updatePalette() {
    var host = $("cbtPalHost"); if (!host) return;
    host.innerHTML = paletteHtml();
    var c = $("cbtPalCounts"); if (c) c.textContent = palCounts();
    host.querySelectorAll("[data-pal]").forEach(function (b) {
      b.onclick = function () {
        var p2 = +b.getAttribute("data-pal");
        ui.pos = p2; ui.idx = ui.order[p2];
        if (ui.tab === "review") ui.tab = "run";
        render();
      };
    });
  }
  function goReview() { ui.tab = "review"; render(); }
  function openCalc() {
    if (window.__calcApi) { window.__calcApi.open(); return; }
    var sc = document.createElement("script");
    sc.src = "quiz/calc.js";
    sc.onload = function () { if (window.__calcApi) window.__calcApi.open(); else toast("The calculator could not load", "⚠️"); };
    sc.onerror = function () { toast("The calculator could not load", "⚠️"); };
    document.head.appendChild(sc);
  }

  /* ------------------------------------------------------- student runner */
  function startRunner(s, existing) {
    var id = me();
    ui.session = s;
    getMyAnswers(s.code, id.did).then(function (ans) {
      ui.answers = ans || [];
      ui.order = buildOrder(s, id);
      ui.marks = st.get(marksKey(s, id)) || {};
      var fp = firstOpenPos();
      ui.pos = fp < 0 ? 0 : fp;
      ui.idx = ui.order[ui.pos] || 0;
      ui.qStart = Date.now();
      ui.qFlagged = false;
      ui.intCount = (existing && existing.integrity) || 0;
      if (deadlineLeft(s) <= 0) return submitNow(s, "autosubmitted", "time-expired");
      if (!existing || existing.status === "waiting") {
        patchAttempt(s.code, id.did, { status: "running" }).catch(function () {});
      }
      ui.attempt = existing || ui.attempt;
      go((camMode(s) === "required" && !camState.on) || (voiceMode(s) === "required" && !voxState.on) ? "camgate" : (st.get(briefedKey(s, id)) ? "run" : "brief"));
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
      if (ui.tab !== "run" && ui.tab !== "camgate" && ui.tab !== "brief" && ui.tab !== "review") return;
      var left = deadlineLeft(ui.session || s);
      var rt2 = $("cbtRevTimer");
      if (rt2) { rt2.textContent = fmtClock(left); rt2.classList.toggle("red", left < 60000); }
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
    if (qs.length && ui.answers.length >= qs.length) { ui.tab = "review"; return renderReview(); }
    var id = me();
    var mode = camMode(s);
    var h = '<div class="cbt-card">' +
      '<div class="cbt-row" style="justify-content:space-between"><div><b>' + esc(s.title) + '</b><br><span class="cbt-muted" id="cbtRunHead">Question ' + (ui.idx + 1) + " of " + qs.length + " · " + esc(prettyCode(s.code)) + '</span></div><div class="cbt-row"><span id="cbtCamChip"></span><div class="cbt-timer" id="cbtRunTimer">–:––</div></div></div>' +
      (mode !== "off" ? '<div class="cbt-cam-pin" id="cbtCamPin" hidden><video id="cbtRunSelfView" autoplay playsinline muted></video></div>' : "") +
      '<div class="cbt-prog" style="margin:10px 0 14px"><i id="cbtRunProg" style="width:' + Math.round(ui.answers.length / qs.length * 100) + '%"></i></div>' +
      '<div id="cbtIntBox"></div>' +
      '<div id="cbtQHost"></div>' +
      '<div class="cbt-pal-wrap"><div class="cbt-row" style="justify-content:space-between"><span class="cbt-muted" id="cbtPalCounts"></span><span class="cbt-row"><button class="cbt-btn ghost" id="cbtCalcBtn" title="Calculator — allowed in the hall" aria-label="Open calculator" style="padding:6px 10px">🧮</button><button class="cbt-btn ghost" id="cbtReviewBtn" style="padding:6px 11px">Review &amp; submit →</button></span></div>' +
      '<div class="cbt-pal" id="cbtPalHost"></div></div>' +
      "</div>";
    root.innerHTML = wrap(h);
    updateCamChip();
    if (camState.on && mode !== "off") {
      var pin = $("cbtCamPin");
      if (pin) { pin.hidden = false; attachCamVideo($("cbtRunSelfView")); }
    }
    renderQuestion();
    updatePalette();
    var cb3 = $("cbtCalcBtn"); if (cb3) cb3.onclick = openCalc;
    var rb = $("cbtReviewBtn"); if (rb) rb.onclick = goReview;
    startTick(s);
    void id;
  }
  function renderReview() {
    var s = ui.session; if (!s) return go("home");
    var qs = s.questions || [];
    var open = [], marked = [];
    ui.order.forEach(function (orig, p2) {
      if (!answeredAt(orig)) open.push(p2);
      if (ui.marks[orig]) marked.push(p2);
    });
    var letters = ["A", "B", "C", "D"];
    var h = '<div class="cbt-card"><div class="cbt-row" style="justify-content:space-between"><div><b>Review your paper</b><br>' +
      '<span class="cbt-muted">' + esc(s.title) + " · " + esc(prettyCode(s.code)) + "</span></div>" +
      '<div class="cbt-row"><button class="cbt-btn ghost" id="cbtCalcBtn2" title="Calculator" aria-label="Open calculator" style="padding:6px 10px">🧮</button><div class="cbt-timer" id="cbtRevTimer">–:––</div></div></div>' +
      '<div id="cbtIntBox"></div>' +
      '<p class="cbt-sub" style="margin-top:10px">' + ui.answers.length + " of " + qs.length + " answered · " + marked.length + " marked for review · " + open.length + " unanswered</p>" +
      '<div class="cbt-pal" id="cbtPalHost" style="margin:10px 0"></div>';
    if (open.length) {
      h += '<div class="cbt-warn soft">⬜ Still unanswered: ' + open.map(function (p2) { return "<b>" + (ui.order[p2] + 1) + "</b>"; }).join(", ") + " — an unanswered question scores zero.</div>";
    }
    if (marked.length) {
      h += '<div class="cbt-note">★ You marked: ' + marked.map(function (p2) { return "<b>" + (ui.order[p2] + 1) + "</b>"; }).join(", ") + (open.length ? "" : " — all answered now; the star is just a reminder.") + "</div>";
    }
    h += '<div style="text-align:left;margin-top:12px">';
    ui.order.forEach(function (orig) {
      var a = answeredAt(orig);
      h += '<div class="cbt-draft-q"><span>' + (a ? "✅" : "⬜") + "</span><div class='cbt-flex1'><b>" + (orig + 1) + ". " + esc(qs[orig].q) + "</b>" +
        (a ? "<small>Your answer: " + letters[a.choice] + " — saved and final</small>" : "<small>Not answered yet</small>") +
        (ui.marks[orig] ? "<small>★ marked for review</small>" : "") + "</div>" +
        '<button class="cbt-btn ghost" data-revpos="' + ui.order.indexOf(orig) + '" style="padding:6px 11px">' + (a ? "View" : "Answer") + "</button></div>";
    });
    h += "</div>" +
      '<div class="cbt-row" style="justify-content:space-between;margin-top:14px"><button class="cbt-btn ghost" id="cbtRevBack">← Keep working</button>' +
      '<button class="cbt-btn gold" id="cbtRevSubmit">Submit my paper' + (open.length ? " with " + open.length + " unanswered" : "") + "</button></div>" +
      '<p class="cbt-muted">Submitting is final. Your teacher sees the paper the moment you do.</p></div>';
    root.innerHTML = wrap(h);
    updatePalette();
    renderIntegrityBox();
    root.querySelectorAll("[data-revpos]").forEach(function (b) {
      b.onclick = function () {
        var p2 = +b.getAttribute("data-revpos");
        ui.pos = p2; ui.idx = ui.order[p2]; ui.tab = "run";
        render();
      };
    });
    var bk = $("cbtRevBack");
    if (bk) bk.onclick = function () {
      var np = firstOpenPos();
      ui.pos = np < 0 ? 0 : np; ui.idx = ui.order[ui.pos];
      ui.tab = "run"; render();
    };
    var sb = $("cbtRevSubmit");
    if (sb) sb.onclick = function () { submitNow(s, "submitted", "finished"); };
    var cb4 = $("cbtCalcBtn2"); if (cb4) cb4.onclick = openCalc;
    startTick(s);
  }
  function renderCert() {
    var s = ui.session; if (!s) return go("home");
    var a = ui.attempt || {};
    var total = ui.cert && ui.cert.total || 0, score = ui.cert && ui.cert.score || 0;
    var pct = total ? Math.round(score / total * 100) : 0;
    var band = pct >= 75 ? "DISTINCTION" : pct >= 60 ? "MERIT" : "PASS";
    var name = esc(a.name || me().name || "Candidate");
    var cls = esc(a.cls || clsOf() || "");
    var ver = String(seed32(me().did + "|" + normCode(s.code)) % 100000000).padStart(8, "0");
    var h = '<div class="cbt-card"><div id="cbtCertSheet" class="cbt-cert">' +
      '<div class="cbt-cert-in">' +
      '<svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="none" stroke="#b98a2e" stroke-width="2.5"/><circle cx="32" cy="32" r="24" fill="none" stroke="#1d3557" stroke-width="1.2"/><path d="M20 40 V26 q12 -7 24 0 V40 q-12 -6 -24 0 z" fill="none" stroke="#1d3557" stroke-width="2"/><path d="M32 26 V40" stroke="#1d3557" stroke-width="1.4"/></svg>' +
      '<p class="cbt-cert-kicker">MAMSS PREP · LIVE CBT HALL</p>' +
      '<h2 class="cbt-cert-title">Certificate of ' + (band === "PASS" ? "Achievement" : band === "MERIT" ? "Merit" : "Distinction") + "</h2>" +
      '<p class="cbt-cert-who">' + name + (cls ? " · " + cls : "") + "</p>" +
      '<p class="cbt-cert-line">sat <b>' + esc(s.title) + "</b> on " + esc(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })) + "</p>" +
      '<p class="cbt-cert-score">' + score + " / " + total + " · " + pct + "%</p>" +
      '<p class="cbt-cert-band">' + band + "</p>" +
      '<p class="cbt-cert-ver">Verify: ' + esc(prettyCode(s.code)) + " · " + ver + "</p>" +
      '<div class="cbt-cert-sigs"><span>Class teacher</span><span>MAMSS Prep</span></div>' +
      "</div></div>" +
      '<div class="cbt-row" style="justify-content:center;margin-top:12px"><button class="cbt-btn gold" id="cbtCertPrint">🖨 Print certificate</button>' +
      '<button class="cbt-btn ghost" id="cbtCertBack">Back to results</button></div></div>';
    root.innerHTML = wrap(h);
    $("cbtCertPrint").onclick = function () {
      document.body.classList.add("cert-print");
      window.print();
    };
    window.onafterprint = function () { document.body.classList.remove("cert-print"); };
    $("cbtCertBack").onclick = function () { ui.refinish ? ui.refinish() : (ui.tab = "done", render()); };
  }
  function renderRunChrome() { var t = $("cbtRunTimer"); if (t) { var left = deadlineLeft(ui.session); t.textContent = fmtClock(left); t.classList.toggle("red", left < 60000); } }
  function updateCamChip() {
    var chip = $("cbtCamChip"); if (!chip) return;
    var mode = camMode(ui.session), vm = voiceMode(ui.session);
    var html = "";
    if (mode !== "off") {
      if (camState.on) html = '<span class="cbt-chip live">📹 On</span>';
      else {
        var w = ui.attempt && ui.attempt.webcam;
        if (w === "denied") html = '<span class="cbt-chip ended">📹 Denied</span>';
        else if (w === "unavailable") html = '<span class="cbt-chip ended">📹 No camera</span>';
        else if (w === "skipped") html = '<span class="cbt-chip ended">📹 Skipped</span>';
        html += '<button class="cbt-btn ghost" id="cbtCamRunEnable" style="padding:6px 11px;margin-left:6px">📹 Enable camera</button>';
      }
    }
    if (vm !== "off") {
      if (voxState.on) html += (html ? " " : "") + '<span class="cbt-chip live">🎙 Vox live</span>';
      else {
        var v = ui.attempt && ui.attempt.voice;
        if (v === "denied") html += (html ? " " : "") + '<span class="cbt-chip ended">🎙 Denied</span>';
        else if (v === "unavailable") html += (html ? " " : "") + '<span class="cbt-chip ended">🎙 No mic</span>';
        else if (v === "skipped") html += (html ? " " : "") + '<span class="cbt-chip ended">🎙 Skipped</span>';
        html += '<button class="cbt-btn ghost" id="cbtVoxRunEnable" style="padding:6px 11px;margin-left:6px">🎙 Enable microphone</button>';
      }
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
    var b2 = $("cbtVoxRunEnable");
    if (b2) b2.onclick = function () {
      b2.disabled = true;
      enableVox(function () {
        updateCamChip();
        toast("Microphone on — your teacher can hear the room live", "🎙");
      }, function (msg) { b2.disabled = false; toast(msg, "⚠️"); updateCamChip(); });
    };
  }
  function renderCamGate() {
    var s = ui.session; if (!s) return go("home");
    var h = '<div class="cbt-card cbt-gate" style="text-align:center"><span class="cbt-chip waiting">CAMERA &amp; MICROPHONE CHECK</span>' +
      "<h2 style='margin-top:10px'>" + esc(s.title) + "</h2>" +
      '<p class="cbt-sub">This school sits every paper proctored. Your camera sends your teacher a small snapshot about every 12 seconds; your microphone sends the sound of the room, live. <b>Both are required.</b> Nothing is recorded and nothing is stored — when the paper ends, the video and the sound are gone.</p>' +
      '<div class="cbt-cam-self" id="cbtGateCamWrap" hidden><video id="cbtGateCamVideo" autoplay playsinline muted></video></div>' +
      '<div id="cbtGateCamFb"></div>' +
      '<div class="cbt-row" style="justify-content:center;margin-top:10px"><button class="cbt-btn gold" id="cbtGateCamEnable">📹 Enable my camera</button></div>' +
      '<div id="cbtGateVoxFb"></div>' +
      '<div class="cbt-row" style="justify-content:center;margin-top:10px"><button class="cbt-btn gold" id="cbtGateVoxEnable">🎙 Enable my microphone</button></div>' +
      '<div class="cbt-row" style="justify-content:center;margin-top:14px"><button class="cbt-btn gold" id="cbtGateGo" disabled>Start the exam</button></div>' +
      '<div class="cbt-warn" id="cbtGateNoHw" hidden>⚠ This device has no working camera or microphone. By school policy this paper cannot sit without both — please see your teacher before the sitting begins. Your place is kept.</div>' +
      '<p class="cbt-muted" id="cbtCamGateTimer"></p></div>';
    root.innerHTML = wrap(h);
    function refresh() {
      var g = $("cbtGateGo"); if (g) g.disabled = !(camState.on && voxState.on);
      var camB = $("cbtGateCamEnable"), voxB = $("cbtGateVoxEnable");
      if (camB && camState.on) camB.textContent = "✔ Camera looks good";
      if (voxB && voxState.on) voxB.textContent = "✔ Microphone live";
    }
    refresh();
    $("cbtGateCamEnable").onclick = function () {
      var fb = $("cbtGateCamFb"); fb.innerHTML = "";
      var self = this; self.disabled = true;
      enableCam(function () {
        var w = $("cbtGateCamWrap"); if (w) { w.hidden = false; attachCamVideo($("cbtGateCamVideo")); }
        self.disabled = false; refresh();
      }, function (msg) {
        self.disabled = false;
        fb.innerHTML = errBox(msg + " You can retry — this exam cannot start without the camera.");
        if (!hasCamAPI()) $("cbtGateNoHw").hidden = false;
      });
    };
    $("cbtGateVoxEnable").onclick = function () {
      var fb = $("cbtGateVoxFb"); fb.innerHTML = "";
      var self = this; self.disabled = true;
      enableVox(function () {
        self.disabled = false; refresh();
      }, function (msg) {
        self.disabled = false;
        fb.innerHTML = errBox(msg + " You can retry — this exam cannot start without the microphone.");
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) $("cbtGateNoHw").hidden = false;
      });
    };
    $("cbtGateGo").onclick = camProceed;
    startTick(s);
  }
  function camProceed() {
    if (ui.tab !== "camgate") return;
    var id = me();
    ui.tab = st.get(briefedKey(ui.session, id)) ? "run" : "brief";
    if (ui.tab === "run") bindIntegrity(ui.session);
    render();
  }
  function renderBrief() {
    var s = ui.session; if (!s) return go("home");
    var qs = s.questions || [];
    var h = '<div class="cbt-card cbt-brief" style="text-align:center"><span class="cbt-chip waiting">BEFORE YOU BEGIN</span>' +
      "<h2 style='margin-top:10px'>" + esc(s.title) + "</h2>" +
      '<p class="cbt-sub">' + qs.length + " questions · " + mmss(s.duration_s) + " · the clock is already running for the whole hall</p>" +
      '<div class="cbt-note" style="text-align:left">' +
      "<b>The rules of the hall, plainly:</b><ul class='cbt-brief-list'>" +
      "<li><b>Move freely, answer once.</b> The number pad below your paper jumps between questions — but a saved answer is final, like ink on paper. There is no going back to change one.</li>" +
      "<li><b>Mark for review.</b> Star a question and it stays amber on the pad until you return to it.</li>" +
      "<li><b>Review before you submit.</b> When every question is answered (or sooner), the pad becomes a review page: answered, marked, unanswered — then you confirm.</li>" +
      "<li><b>Stay in this window.</b> Leaving the tab is logged against your paper; three logged leaves auto-submit it. Copying and printing are disabled while the paper runs.</li>" +
      (shuffleOn(s) ? "<li><b>Your paper is yours alone.</b> Question and option order are shuffled for your device — reading over a shoulder gains nothing.</li>" : "") +
      "</ul></div>" +
      '<label class="cbt-muted" style="display:block;margin:12px 0"><input type="checkbox" id="cbtBriefOk"> I understand the rules — show me my paper</label>' +
      '<button class="cbt-btn gold" id="cbtBriefGo" disabled>Enter the exam</button>' +
      '<p class="cbt-muted" id="cbtCamGateTimer"></p></div>';
    root.innerHTML = wrap(h);
    var ck = $("cbtBriefOk"), gb = $("cbtBriefGo");
    ck.onchange = function () { gb.disabled = !ck.checked; };
    gb.onclick = function () {
      var id = me();
      st.set(briefedKey(s, id), 1);
      ui.tab = "run";
      bindIntegrity(s);
      render();
    };
    startTick(s);
  }
  function renderQuestion() {
    var s = ui.session, qs = s.questions || [], orig = ui.idx, q = qs[orig];
    var host = $("cbtQHost"); if (!host || !q) return;
    var id = me();
    var noSel = id.readable ? "" : " cbt-noselect";
    var letters = ["A", "B", "C", "D"];
    var done = answeredAt(orig);
    var perm = optPermFor(s, id, orig);
    var h = '<div class="cbt-q-card' + noSel + '" id="cbtQCard">' +
      '<p class="cbt-q-stem">' + (orig + 1) + ". " + esc(q.q) + "</p>";
    if (done) {
      perm.forEach(function (oidx, slot) {
        h += '<button type="button" class="cbt-opt' + (done.choice === oidx ? " sel" : "") + '" disabled><b>' + letters[slot] + ".</b><span>" + esc((q.o || [])[oidx] || "") + "</span></button>";
      });
      h += '<div class="cbt-note" style="margin-top:10px"> Answer saved: <b>' + letters[done.choice] + "</b> — final, like ink on paper.</div>";
    } else {
      perm.forEach(function (oidx, slot) {
        h += '<button type="button" class="cbt-opt" data-opt="' + oidx + '"><b>' + letters[slot] + ".</b><span>" + esc((q.o || [])[oidx] || "") + "</span></button>";
      });
    }
    var lastOpen = firstOpenPos() === ui.pos;
    h += '<div class="cbt-row" style="margin-top:12px;justify-content:space-between"><span class="cbt-muted" id="cbtRunFb"></span>' +
      (done ? "" : '<button class="cbt-btn ghost' + (ui.marks[orig] ? " marked" : "") + '" id="cbtMarkBtn">' + (ui.marks[orig] ? "★ Marked" : "☆ Mark for review") + "</button>") +
      (done
        ? '<button class="cbt-btn gold" id="cbtNextBtn">Next →</button>'
        : '<button class="cbt-btn gold" id="cbtNextBtn" disabled>' + (lastOpen ? "Save &amp; review →" : "Save &amp; next →") + "</button>") +
      "</div></div>";
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
    var mb = $("cbtMarkBtn");
    if (mb) mb.onclick = function () {
      ui.marks[orig] = !ui.marks[orig];
      if (!ui.marks[orig]) delete ui.marks[orig];
      st.set(marksKey(s, id), ui.marks);
      mb.textContent = ui.marks[orig] ? "★ Marked" : "☆ Mark for review";
      mb.classList.toggle("marked", !!ui.marks[orig]);
      updatePalette();
    };
    var nb2 = $("cbtNextBtn");
    if (nb2) nb2.onclick = function () {
      if (done) {
        var np = firstOpenPos();
        if (np < 0) return goReview();
        ui.pos = np; ui.idx = ui.order[np];
        render();
        return;
      }
      saveAnswerNow(q);
    };
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
      ui.qFlagged = false;
      patchAttempt(s.code, id.did, { current_q: ui.answers.length }).catch(function () {});
      if (room) room.notify("answer", { q: row.q_idx });
      busy(false);
      var qs = s.questions || [];
      var p = $("cbtRunProg"); if (p) p.style.width = Math.round(ui.answers.length / qs.length * 100) + "%";
      var np = firstOpenPos();
      if (np < 0) return goReview();
      ui.pos = np; ui.idx = ui.order[np];
      var hd = $("cbtRunHead");
      if (hd) hd.textContent = "Question " + (ui.idx + 1) + " of " + qs.length + " · " + prettyCode(s.code);
      renderQuestion();
      updatePalette();
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
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      var k = (e.key || "").toLowerCase();
      if (k === "c" || k === "x" || k === "p" || k === "u") {
        e.preventDefault();
        toast("Copying and printing are disabled during a live paper", "🔒");
      }
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    integrityBound = function () {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      cancel();
    };
  }
  function unbindIntegrity() { if (integrityBound) { try { integrityBound(); } catch (e) {} integrityBound = null; } }
  function logIntegrity(s) {
    if (ui.tab !== "run" && ui.tab !== "review") return;
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
    stopVox();
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
    ui.refinish = function () { finishView(s, attempt, answers, why); };
    closeRoom();
    stopCam();
    stopVox();
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
      "<h2 style='margin-top:10px'>" + esc(s.title) + "</h2>";
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
    if (instant) {
      var passPct = (s.settings && s.settings.passPct) || 50;
      var pct2 = attempt.total ? Math.round(attempt.score / attempt.total * 100) : 0;
      var misses = [];
      qs.forEach(function (q2, i2) {
        var a2 = null;
        (answers || []).forEach(function (x2) { if (x2.q_idx === i2) a2 = x2; });
        if (!a2 || a2.choice !== q2.a) misses.push(i2 + 1);
      });
      if (pct2 >= 75) h += '<div class="cbt-note">🌟 Distinction work. ' + (misses.length ? "Only " + misses.slice(0, 6).map(function (m) { return "Q" + m; }).join(", ") + " kept it from perfect — review the explanations above." : "A clean sheet.") + "</div>";
      else if (pct2 >= passPct) h += '<div class="cbt-note">✔ A pass at ' + pct2 + "%. Revisit " + misses.slice(0, 6).map(function (m) { return "Q" + m; }).join(", ") + " — the explanations above are the lesson.</div>";
      else h += '<div class="cbt-note">📖 ' + pct2 + "% — below the pass line of " + passPct + "%. The breakdown above is your study list: start at " + misses.slice(0, 6).map(function (m) { return "Q" + m; }).join(", ") + ".</div>";
      if (pct2 >= passPct) {
        ui.cert = { score: attempt.score, total: attempt.total };
        h += '<div class="cbt-row" style="justify-content:center;margin-top:10px"><button class="cbt-btn gold" id="cbtCertBtn">🎓 View certificate</button></div>';
      }
    }
    if (attempt.status === "autosubmitted") h += '<div class="cbt-warn">' + (why === "integrity" ? "This paper was auto-submitted after " + (ui.intCount || INTEGRITY_LIMIT) + " logged window-leaves." : "Time expired — everything you had saved was submitted.") + "</div>";
    h += '<button class="cbt-btn ghost" id="cbtBackHome" style="margin-top:12px">Back to the hall</button></div>';
    root.innerHTML = wrap(h);
    var b = $("cbtBackHome"); if (b) b.onclick = function () { go("home"); };
    var cb2 = $("cbtCertBtn"); if (cb2) cb2.onclick = function () { ui.tab = "cert"; render(); };
  }

  /* ======================================================= TEACHER CONSOLE */
  var cons = { tab: "create", session: null, room: null };
  function openConsole(s) {
    cons.session = s || null;
    cons.tab = s ? "monitor" : "create";
    if (!ui.draft) ui.draft = st.get("nssc_cbt_draft", null) || newDraft();
    if (ui.draft && !ui.draft.webcam) ui.draft.webcam = "optional";
    if (ui.draft && !ui.draft.voice) ui.draft.voice = "off";
    camFrames = {}; voxBuf = {}; voxLvls = {}; voxPlaying = {};
    go("console");
  }
  function newDraft() {
    return { title: "", cls: "SS1", subject: "", topic: "", count: 20, duration: 30, scheduledAt: "", instantResults: true, showRank: true, shuffle: false, webcam: "optional", voice: "off", waecathon: false, questions: [] };
  }
  function renderConsole() {
    if (!me().teacher) { go("home"); return; }
    var h = '<div class="cbt-card"><h2><svg class="mp-ico" aria-hidden="true"><use href="#i-grid"></use></svg> Teacher console</h2><p class="cbt-sub">Live CBT Hall · signed in as <b>' + esc(me().name) + "</b> (" + esc(me().slip || "teacher slip") + ")</p>" +
      '<div class="cbt-tabs">' +
      '<button class="cbt-tab' + (cons.tab === "create" ? " on" : "") + '" data-ctab="create">1 · Build paper</button>' +
      '<button class="cbt-tab' + (cons.tab === "monitor" ? " on" : "") + '" data-ctab="monitor">2 · Monitor</button>' +
      '<button class="cbt-tab' + (cons.tab === "results" ? " on" : "") + '" data-ctab="results">3 · Results</button>' +
      '<button class="cbt-tab' + (cons.tab === "school" ? " on" : "") + '" data-ctab="school">4 · School</button>' +
      '<button class="cbt-tab' + (cons.tab === "pipeline" ? " on" : "") + '" data-ctab="pipeline">5 · Pipeline</button>' +
      "</div><div id='cbtConsBody'></div></div>";
    root.innerHTML = wrap(h);
    root.querySelectorAll("[data-ctab]").forEach(function (b) {
      b.onclick = function () { cons.tab = b.getAttribute("data-ctab"); renderConsole(); };
    });
    if (cons.tab !== "school") dashStop();
    if (cons.tab === "create") renderBuilder();
    else if (cons.tab === "monitor") renderMonitor();
    else if (cons.tab === "school") renderSchool();
    else if (cons.tab === "pipeline") renderPipeline();
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
      if (clsName !== "ALL" && c.class !== clsName) return;
      (c.questions || []).forEach(function (q) { if (!subject || q.s === subject) out.push(q); });
    });
    return out;
  }
  function qTopic(q) { try { return q.t || (typeof topicOf === "function" && topicOf(q)) || "General"; } catch (e) { return "General"; } }
  function topicList(subject) {
    try { if (typeof TOPICS !== "undefined" && TOPICS[subject]) return TOPICS[subject].map(function (t) { return t[0]; }); } catch (e) {}
    return [];
  }
  /* ---------------------------------------------- v67 Friday Waecathon */
  function nextFriday16(from) {
    var d = from ? new Date(from) : new Date();
    var add = (5 - d.getDay() + 7) % 7;              /* 5 = Friday */
    if (add === 0 && d.getHours() >= 16) add = 7;
    d.setDate(d.getDate() + add); d.setHours(16, 0, 0, 0);
    return d;
  }
  function dtLocal(d) {
    function p2(x) { return String(x).padStart(2, "0"); }
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + "T" + p2(d.getHours()) + ":" + p2(d.getMinutes());
  }
  var SCHOOL_CLASSES = ["SS1", "SS2", "SS3", "JSS1", "JSS2", "JSS3"];   /* the bank keeps its own global CLASSES — do not shadow it */
  function clsOf() {
    /* the same source the progress reporter uses: study_grade → SS1-3, then JSS1-3 */
    try { var g = JSON.parse(localStorage.getItem("study_grade") || "0"); g = +g || 0; return g < 3 ? "SS" + (g + 1) : "JSS" + (g - 2); }
    catch (e) { return "SS1"; }
  }
  function waecTemplate() {
    whenBank(function () {
      var d = ui.draft, fri = nextFriday16();
      d.title = "Friday Waecathon · " + fri.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      d.cls = "ALL"; d.subject = ""; d.topic = "";
      d.count = 40; d.duration = 60;
      d.scheduledAt = dtLocal(fri);
      d.waecathon = true; d.instantResults = true; d.showRank = true; d.shuffle = true; d.webcam = "required"; d.voice = "required";
      d.questions = [];
      saveDraft();
      renderBuilder(true);          /* paint the form from the new draft…   */
      drawFromBank();               /* …then draw 40 from the whole bank   */
      toast("Waecathon drafted — 40 questions, all classes, Friday 16:00. Press Go live when the day is set.", "🏆");
    });
  }
  function renderBuilder(bankWaited) {
    var d = ui.draft;
    var host = $("cbtConsBody"); if (!host) return;
    var subs = subjList();
    if (!subs.length && !bankWaited) { whenBank(function () { if (ui.tab === "console" && cons.tab === "create") renderBuilder(true); }); }
    var h = "";
    h += '<div class="cbt-row" style="margin-bottom:10px"><input class="cbt-inp" id="cbtDraftTitle" aria-label="Paper title" placeholder="Paper title — e.g. SS2 Mathematics · Mid-term CBT" maxlength="80" value="' + esc(d.title) + '"></div>';
    h += '<div class="cbt-grid2">';
    h += '<div><label class="cbt-muted">Class</label><div class="cbt-row" id="cbtClsRow">' +
      SCHOOL_CLASSES.concat(["ALL"]).map(function (c) { return '<button class="cbt-tab' + (d.cls === c ? " on" : "") + '" data-cls="' + c + '">' + (c === "ALL" ? "🏆 All" : c) + "</button>"; }).join("") + "</div></div>";
    h += '<div><label class="cbt-muted" for="cbtSubject">Subject (for drawing from the bank)</label><select class="cbt-inp" id="cbtSubject"><option value="">Mixed / all subjects</option>' +
      subs.map(function (s2) { return '<option value="' + esc(s2) + '"' + (d.subject === s2 ? " selected" : "") + ">" + esc(s2) + "</option>"; }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted" for="cbtTopic">Topic filter (optional)</label><select class="cbt-inp" id="cbtTopic"><option value="">All topics</option>' +
      topicList(d.subject).map(function (t) { return '<option value="' + esc(t) + '"' + (d.topic === t ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted" for="cbtDuration">Duration</label><select class="cbt-inp" id="cbtDuration">' +
      [10, 20, 30, 45, 60, 90].map(function (m) { return '<option value="' + m + '"' + (d.duration === m ? " selected" : "") + ">" + m + " minutes</option>"; }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted" for="cbtSched">Scheduled start (shown to students; you press Start)</label><input class="cbt-inp" type="datetime-local" id="cbtSched" value="' + esc(d.scheduledAt || "") + '"></div>';
    h += '<div><label class="cbt-muted" for="cbtCount">Questions to draw</label><input class="cbt-inp" type="number" min="1" max="100" id="cbtCount" value="' + d.count + '"></div>';
    h += '<div class="cbt-note" style="grid-column:1/-1">📹 <b>Proctoring is school policy:</b> every live paper runs with live camera snapshots and live room audio — ephemeral, never recorded, never stored. There is nothing to switch off.</div>' +
    '<div hidden><label class="cbt-muted" for="cbtWebcam">Webcam monitoring</label><select class="cbt-inp" id="cbtWebcam">' +
      [["off", "Off — no cameras"], ["optional", "Optional — student's choice"], ["required", "Required — camera check before the paper"]].map(function (o) {
        return '<option value="' + o[0] + '"' + ((d.webcam || "optional") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>";
    h += '<div><label class="cbt-muted" for="cbtVoice">Live room audio</label><select class="cbt-inp" id="cbtVoice">' +
      [["off", "Off — no microphones"], ["optional", "Optional — student's choice"], ["required", "Required — microphone check before the paper"]].map(function (o) {
        return '<option value="' + o[0] + '"' + ((d.voice || "off") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>";
    h += "</div>";
    h += '<div class="cbt-row" style="margin:12px 0"><label class="cbt-muted"><input type="checkbox" id="cbtInstant"' + (d.instantResults ? " checked" : "") + '> Students see instant results &amp; explanations</label> ' +
      '<label class="cbt-muted"><input type="checkbox" id="cbtShuffle"' + (d.shuffle ? " checked" : "") + '> 🔀 Shuffle question &amp; option order per device</label>' +
      '<label class="cbt-muted"><input type="checkbox" id="cbtRank"' + (d.showRank ? " checked" : "") + "> Show class ranking to students</label></div>";
    h += '<div class="cbt-row" style="margin-bottom:10px"><label class="cbt-muted"><input type="checkbox" id="cbtWaec"' + (d.waecathon ? " checked" : "") + '> 🏆 Friday Waecathon — whole-school event: all classes, house table, countdown on the home board</label></div>';
    h += '<div class="cbt-row" style="margin-bottom:10px"><button class="cbt-btn gold" id="cbtWaecTpl">🏆 Schedule the Friday Waecathon</button><button class="cbt-btn ghost" id="cbtDraw">🎲 Draw from the question bank</button><button class="cbt-btn ghost" id="cbtAddNew">✍️ Add a new question</button><button class="cbt-btn ghost" id="cbtClearQ">🗑 Clear paper</button></div>';
    h += '<div id="cbtDrawFb" role="status"></div>';
    h += '<div id="cbtNewQ" style="display:none">' + newQForm() + "</div>";
    h += '<div id="cbtQList">' + draftListHtml(d) + "</div>";
    h += '<div class="cbt-row" style="margin-top:14px;justify-content:space-between"><span class="cbt-muted" id="cbtQCount"></span><button class="cbt-btn gold" id="cbtGoLive">🔴 Go live — generate session code</button></div>';
    host.innerHTML = h;
    syncDraftFromForm();
    updateQCount();
    host.querySelectorAll("[data-cls]").forEach(function (b) {
      b.onclick = function () { d.cls = b.getAttribute("data-cls"); saveDraft(); renderBuilder(); };
    });
    ["cbtDraftTitle", "cbtSubject", "cbtTopic", "cbtDuration", "cbtSched", "cbtCount", "cbtInstant", "cbtRank", "cbtWebcam", "cbtVoice", "cbtWaec"].forEach(function (idn) {
      var n2 = $(idn); if (n2) n2.addEventListener("change", function () { syncDraftFromForm(); saveDraft(); if (idn === "cbtSubject") renderBuilder(); });
    });
    var wt = $("cbtWaecTpl"); if (wt) wt.onclick = waecTemplate;
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
      '<div id="nqFb" role="status"></div>' +
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
    var shf = $("cbtShuffle"); if (shf) d.shuffle = shf.checked;
    var rk = $("cbtRank"); if (rk) d.showRank = rk.checked;
    var wc = $("cbtWebcam"); if (wc) d.webcam = wc.value;
    var vc = $("cbtVoice"); if (vc) d.voice = vc.value;
    var wz = $("cbtWaec"); if (wz) d.waecathon = wz.checked;
  }
  function saveDraft() { st.set("nssc_cbt_draft", ui.draft); }
  function draftListHtml(d) {
    if (!d.questions.length) return '<p class="cbt-muted">No questions yet — draw from the bank or add your own.</p>';
    var letters = ["A", "B", "C", "D"];
    return d.questions.map(function (q, i) {
      return '<div class="cbt-draft-q"><span>' + (i + 1) + '.</span><div class="cbt-flex1"><b>' + esc(q.q) + '</b><small>' +
        esc((q.o || []).map(function (o, k) { return letters[k] + ". " + o; }).join(" · ")) + "</small><small>✔ " + esc(letters[q.a] || "?") +
        (q.e ? " · 💡 " + esc(q.e) : "") + ' · <i>' + esc(q.src === "new" ? "new question" : q.src === "school" ? "school pool" : "bank") + "</i></small></div>" +
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
      settings: { instantResults: !!d.instantResults, showRank: !!d.showRank, shuffle: !!d.shuffle, scheduledAt: d.scheduledAt || null, webcam: "required", voice: "required", waecathon: !!d.waecathon },
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
      camFrames = {}; voxBuf = {}; voxLvls = {}; voxPlaying = {};
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
      (voiceMode(s) !== "off" ? '<h3 style="margin:16px 0 8px">🎙 Live room audio <span class="cbt-muted">(' + esc(voiceMode(s)) + " for this paper · audio is never stored)</span></h3>" +
        '<div class="cbt-cams" id="cbtVox"></div>' : "") +
      '<table class="cbt-table" id="cbtRoster"><tr><th>Student</th><th>Status</th><th>Progress</th><th>⚠</th><th>📹</th>' + (voiceMode(s) !== "off" ? "<th>🎙</th>" : "") + '<th>Seen</th></tr></table>';
    host.innerHTML = h;
    var invite = "MAMSS PREP — Live CBT: " + s.title + ". Join in the Live CBT tab with code " + prettyCode(s.code) + ". https://merebari7-web.github.io/mamss-prep/";
    var cc = $("cbtCopyCode");
    if (cc) cc.onclick = function () {
      try { var ci = navigator.clipboard && navigator.clipboard.writeText(invite); if (ci && ci.catch) ci.catch(function () {}); } catch (e) {}
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
      if (kind === "vox" && p && p.did && p.did !== me().did && p.aud) {
        var vb = voxBuf[p.did] || (voxBuf[p.did] = { chunks: [], n: 0, name: "Student" });
        vb.chunks.push(p.aud);
        if (vb.chunks.length > 40) vb.chunks.splice(0, vb.chunks.length - 40);   /* a rolling ~10 minutes, in memory only */
        vb.mime = p.mime || vb.mime || "audio/webm";
        vb.name = p.n || vb.name; vb.at = Date.now(); vb.n = (vb.n || 0) + 1;
        updateVox();
        return;
      }
      if (kind === "voxlvl" && p && p.did && p.did !== me().did) {
        var vl = voxLvls[p.did] || (voxLvls[p.did] = { n: 0, name: "Student" });
        vl.lvl = Math.max(0, Math.min(100, +p.lvl || 0));
        vl.name = p.n || vl.name; vl.at = Date.now(); vl.n = (vl.n || 0) + 1;
        updateVox();
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
    updateVox();
    camTickN = 0;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (cons.session && (camMode(cons.session) !== "off" || voiceMode(cons.session) !== "off")) {
        camTickN = (camTickN + 1) % 5;
        if (camTickN === 0) {
          updateCams(); updateVox();
          var dn = $("cbtCamDead");
          if (dn) dn.innerHTML = (room && room.dead) ? '<div class="cbt-note">📡 The realtime socket is not connected right now — camera and audio tiles need it. Everything else keeps working through polling.</div>' : "";
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
      var h = "<tr><th>Student</th><th>Status</th><th>Progress</th><th>⚠</th><th>📹</th>" + (voiceMode(s) !== "off" ? "<th>🎙</th>" : "") + "<th>Seen</th></tr>";
      rows.forEach(function (r) {
        var seen = r.last_seen_at ? now - new Date(r.last_seen_at).getTime() : Infinity;
        var dot = seen < 30000 ? "fresh" : seen < 120000 ? "warm" : "stale";
        var pctDone = Math.min(100, Math.round((r.current_q || 0) / qs * 100));
        h += "<tr><td><b>" + esc(r.name || "Anonymous") + '</b><br><small class="cbt-muted">' + esc(r.slip || r.device_id.slice(0, 10)) + "</small></td>" +
          '<td><span class="cbt-chip ' + (r.status === "running" ? "live" : r.status === "waiting" ? "waiting" : "ended") + '">' + esc(r.status.toUpperCase()) + "</span></td>" +
          '<td><div class="cbt-prog"><i style="width:' + pctDone + '%"></i></div><small class="cbt-muted">' + (r.current_q || 0) + "/" + qs + "</small></td>" +
          "<td>" + (r.integrity ? '<b style="color:#8a1f1f">' + r.integrity + "</b>" : "—") + "</td>" +
          "<td>" + camCell(r.webcam) + "</td>" + (voiceMode(s) !== "off" ? "<td>" + voxCell(r.voice) + "</td>" : "") +
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
      var dist = [0, 0, 0, 0], correct = 0, n = 0, flags = 0, msSum = 0;
      attempts.forEach(function (t) {
        var a = (byDev[t.device_id] || {})[i];
        if (!a) return;
        n++; if (a.choice >= 0 && a.choice <= 3) dist[a.choice]++;
        if (q.a === a.choice) correct++;
        if (a.flagged) flags++;
        msSum += (typeof a.ms === "number" && a.ms >= 0) ? Math.min(a.ms, 3600000) : 0;
      });
      return { q: q, i: i, n: n, correct: correct, pct: n ? Math.round(correct / n * 100) : null, dist: dist, flags: flags, avgms: n ? Math.round(msSum / n / 1000) : null };
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
      if (s.settings && s.settings.waecathon) {
        var houses = {};
        g.rows.forEach(function (r) {
          var hh = (r.attempt && r.attempt.cls) || "—";
          var x2 = houses[hh] || (houses[hh] = { n: 0, sum: 0, best: null });
          x2.n++; x2.sum += r.pct;
          if (!x2.best || r.pct > x2.best.pct) x2.best = { name: r.attempt.name || "Anonymous", pct: r.pct };
        });
        var hrows = Object.keys(houses).map(function (k) {
          return { house: k, n: houses[k].n, avg: Math.round(houses[k].sum / houses[k].n), best: houses[k].best };
        }).sort(function (a, b) { return b.avg - a.avg || b.n - a.n; });
        h += '<h3 style="margin:16px 0 6px">🏆 House table</h3>' +
          '<table class="cbt-table"><thead><tr><th>House</th><th>Sat</th><th>Average</th><th>Top scorer</th></tr></thead><tbody>' +
          hrows.map(function (x2, i) {
            return "<tr><td>" + (i === 0 ? "<b>🥇 " : "") + esc(x2.house) + (i === 0 ? "</b>" : "") + "</td><td>" + x2.n + "</td><td><b>" + x2.avg + "%</b></td><td>" + esc(x2.best ? x2.best.name + " — " + x2.best.pct + "%" : "—") + "</td></tr>";
          }).join("") + "</tbody></table>" +
          (hrows.length > 1 ? '<p class="cbt-muted" style="margin:6px 0 0">Cup points this sitting: ' + hrows.map(function (x4, i4) { return esc(x4.house) + " +" + ([3, 2, 1][i4] || 0); }).join(" · ") + '</p>' : "") +
          '<p class="cbt-muted">Houses are the classes of the school. The table lives with the session on the school server — it outlasts the exam.</p>';
      }
      h += '<h3 style="margin:16px 0 6px">📊 Per-question accuracy</h3>';
      g.perQ.forEach(function (p) {
        var maxD = Math.max.apply(null, p.dist.concat([1]));
        h += '<div class="cbt-draft-q"><span>' + (p.i + 1) + '.</span><div class="cbt-flex1"><b>' + esc(p.q.q) + "</b>" +
          "<small>Correct: <b>" + letters[p.q.a] + "</b> · " + (p.pct == null ? "no attempts" : p.pct + "% got it right (" + p.correct + "/" + p.n + ")") + (p.flags ? " · ⚠ " + p.flags + " flagged" : "") + (p.avgms != null ? " · ⏱ avg " + p.avgms + "s on this question" : "") + "</small>" +
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
        if (s.settings && s.settings.waecathon) {
          var hs = {};
          g.rows.forEach(function (r) {
            var hh = (r.attempt && r.attempt.cls) || "—";
            var x3 = hs[hh] || (hs[hh] = { n: 0, sum: 0 }); x3.n++; x3.sum += r.pct;
          });
          var hl = Object.keys(hs).map(function (k) { return { h: k, avg: Math.round(hs[k].sum / hs[k].n), n: hs[k].n }; })
            .sort(function (a, b) { return b.avg - a.avg; });
          if (hl.length > 1 || (hl[0] && hl[0].h !== "—"))
            txt += "\n\n🏆 House table\n" + hl.map(function (x3, i) { return (i + 1) + ". " + x3.h + " — " + x3.avg + "% avg (" + x3.n + " sat)"; }).join("\n");
        }
        try { var cp = navigator.clipboard && navigator.clipboard.writeText(txt); if (cp && cp.catch) cp.catch(function () {}); } catch (e) {}
        window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
      };
    }).catch(renderFailure);
  }


  /* ------------------------------------------------- school dashboard (v57) */
  /* Whole-school aggregates for teachers: every live exam this project has
     run + the activation roll-out. Practice progress (Cloud Sync) is private
     per student BY DESIGN and is never readable here — the dashboard only
     aggregates exam rows the school already shares with its teachers. */
  var dash = { data: null, timer: null, err: "" };
  function dashStop() { if (dash.timer) { clearInterval(dash.timer); dash.timer = null; } }
  function fmtDay(iso) {
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); } catch (e) { return ""; }
  }
  function schoolFetch() {
    var sessP = rest("cbt_sessions?select=code,title,cls,subject,status,teacher,created_at,live_at,ended_at&order=created_at.desc&limit=200");
    var attP = rest("cbt_attempts?select=session_code,name,slip,status,score,total,integrity,webcam,submitted_at&order=submitted_at.desc&limit=2000");
    var ledP = rest("code_redemptions?select=batch,redeemed_at&order=redeemed_at.desc&limit=1000")
      .catch(function () { return { ok: false, status: 0, json: null, soft: true }; });
    return Promise.all([sessP, attP, ledP]).then(function (rs) {
      if (isMissingTables(rs[0]) || isMissingTables(rs[1])) { var e = setupError(); throw e; }
      var sessions = (rs[0].ok && Array.isArray(rs[0].json)) ? rs[0].json : [];
      var attempts = (rs[1].ok && Array.isArray(rs[1].json)) ? rs[1].json : [];
      var ledger = (rs[2] && rs[2].ok && Array.isArray(rs[2].json)) ? rs[2].json : null;
      return { sessions: sessions, attempts: attempts, ledger: ledger, at: Date.now() };
    });
  }
  /* ------------------------------------- class progress panel (v62) */
  /* One row per activated device in public.class_progress: a summary the
     school asked to see. Answer-level detail and Cloud Sync blobs are not
     in this table and never render here. */
  var dashProg = { rows: null, sel: null };
  function progFetch() {
    return rest("class_progress?select=owner,student,cls,slip,role,blob,updated_at&order=updated_at.desc&limit=400")
      .catch(function () { return { ok: false, status: 0, json: null }; });
  }
  function progAcc(b) {
    var subs = (b && b.subjects) || {}, ask = 0, cor = 0;
    for (var k in subs) { ask += +subs[k].ask || 0; cor += +subs[k].cor || 0; }
    return ask ? Math.round(cor / ask * 100) : null;
  }
  /* pure aggregator — exported for tests */
  function progStats(rows) {
    var i, k, n = rows.length, week = 0, sessions = 0, ask = 0, cor = 0, top = 0, byCls = {};
    var cutoff = Date.now() - 7 * 86400000;
    for (i = 0; i < n; i++) {
      var b = rows[i].blob || {};
      if (Date.parse(rows[i].updated_at) >= cutoff) week++;
      sessions += +b.sessions || 0;
      var subs = b.subjects || {};
      for (k in subs) { ask += +subs[k].ask || 0; cor += +subs[k].cor || 0; }
      if ((+b.streak || 0) > top) top = +b.streak || 0;
      var c = rows[i].cls || "?";
      byCls[c] = (byCls[c] || 0) + 1;
    }
    return { n: n, week: week, sessions: sessions, acc: ask ? Math.round(cor / ask * 100) : null, top: top, byCls: byCls };
  }
  function fillProgPanel() {
    var host = $("cbtProgPanel"); if (!host) return;
    host.innerHTML = "<p class='cbt-muted'>Loading class progress…</p>";
    progFetch().then(function (res) {
      var h2 = $("cbtProgPanel"); if (!h2) return;
      if (!res || !res.ok || !Array.isArray(res.json)) {
        dashProg.rows = null;
        var missing = res && (res.status === 404 || (res.json && res.json.code === "42P01"));
        h2.innerHTML = missing
          ? "<h3 style=\"margin:16px 0 6px\">Class progress</h3><div class='cbt-note cbt-setup'>📚 <b>Class progress is waiting for its one-time setup.</b> Paste <code>tools/progress_schema.sql</code> into the Supabase SQL editor; the panel starts filling on its own afterwards.</div>"
          : "<h3 style=\"margin:16px 0 6px\">Class progress</h3><p class='cbt-muted'>Class progress is not reachable from this copy of the site.</p>";
        return;
      }
      dashProg.rows = res.json; dashProg.sel = null;
      renderProgPanel();
    });
  }
  function prgChip(v, lbl) {
    return "<div class='prg-chip'><b>" + v + "</b><span>" + lbl + "</span></div>";
  }
  function renderProgPanel() {
    var host = $("cbtProgPanel"); if (!host || !dashProg.rows) return;
    var rows = dashProg.rows, h;
    if (dashProg.sel) { renderProgDrill(host); return; }
    var s = progStats(rows);
    h = "<h3 style=\"margin:16px 0 6px\">Class progress</h3>";
    h += "<div class='prg-strip'>" +
      prgChip(s.n, "students reporting") + prgChip(s.week, "active this week") +
      prgChip(s.sessions, "sessions logged") + prgChip(s.acc == null ? "—" : s.acc + "%", "practice accuracy") +
      prgChip(s.top, "longest streak now") + "</div>";
    if (!rows.length) {
      h += "<p class='cbt-sub'>No reports yet — each activated device files its first report the next time it opens the app.</p>";
    }
    rows.forEach(function (r) {
      var b = r.blob || {}, acc = progAcc(b);
      h += "<div class='cbt-row prg-row'><button class='cbt-btn prg-open' data-prog-open='" + esc(r.owner) + "'>" +
        "<b>" + esc(r.student || "Student") + "</b>" +
        "<span class='cbt-muted prg-cls'>" + esc(r.cls || "") + (r.role === "teacher" ? " · teacher" : "") + "</span>" +
        "<span class='prg-nums'>" + (+b.sessions || 0) + " sessions · " + (acc == null ? "—" : acc + "%") + " · streak " + (+b.streak || 0) + "</span>" +
        "<span class='cbt-muted prg-seen'>updated " + fmtDay(r.updated_at) + "</span></button></div>";
    });
    h += "<button class='cbt-btn' id='cbtDashProgCsv' style='margin-top:8px'>Download progress CSV</button>";
    host.innerHTML = h;
    host.querySelectorAll("[data-prog-open]").forEach(function (btn) {
      btn.onclick = function () { dashProg.sel = btn.getAttribute("data-prog-open"); renderProgPanel(); };
    });
    var cv = $("cbtDashProgCsv"); if (cv) cv.onclick = progCsv;
  }
  function renderProgDrill(host) {
    var row = null;
    for (var i = 0; i < dashProg.rows.length; i++) if (dashProg.rows[i].owner === dashProg.sel) row = dashProg.rows[i];
    if (!row) { dashProg.sel = null; renderProgPanel(); return; }
    var b = row.blob || {};
    var h = "<h3 style=\"margin:16px 0 6px\"><button class='cbt-btn prg-back' id='prgBack'>← All students</button> " +
      esc(row.student || "Student") + " <span class='cbt-muted'>" + esc(row.cls || "") + "</span></h3>";
    h += "<div class='prg-strip'>" +
      prgChip(+b.sessions || 0, "sessions") + prgChip(progAcc(b) == null ? "—" : progAcc(b) + "%", "accuracy") +
      prgChip(+b.streak || 0, "day streak") + prgChip(+b.badges || 0, "badges") +
      prgChip(+b.xp || 0, "xp") + "</div>";
    var subs = b.subjects || {}, keys = Object.keys(subs).sort(function (x, y) {
      return (subs[y].last || 0) - (subs[x].last || 0);
    });
    if (keys.length) {
      h += "<div class='prg-drill'>";
      keys.slice(0, 12).forEach(function (k) {
        var s = subs[k], acc = s.ask ? Math.round(s.cor / s.ask * 100) : null;
        h += "<div class='prg-subj'><b>" + esc(k) + "</b><span>" + s.cor + "/" + s.ask + " · " + (acc == null ? "—" : acc + "%") + "</span>" +
          "<div class='cbt-hbar'><i style='width:" + (acc || 0) + "%'></i></div></div>";
      });
      h += "</div>";
    } else {
      h += "<p class='cbt-sub'>No subject totals reported yet.</p>";
    }
    var rec = b.recent || [];
    if (rec.length) {
      h += "<p class='cbt-sub' style='margin-top:10px'>" + (rec.length === 1 ? "Last session" : "Last " + rec.length + " sessions") + "</p>";
      rec.forEach(function (x) {
        h += "<div class='cbt-row'><span class='cbt-muted' style='min-width:86px'>" + fmtDay(new Date(x.t).toISOString()) + "</span>" +
          "<span class='cbt-flex1'>" + esc(x.subj || x.cls || "session") + (x.daily ? " · daily" : x.rev ? " · revision" : x.mock ? " · mock" : "") + "</span>" +
          "<b>" + (x.pct == null ? "—" : x.pct + "%") + "</b></div>";
      });
    }
    h += "<p class='cbt-note'>Report filed by the student's own device; answer-level detail stays on that device.</p>";
    host.innerHTML = h;
    var bk = $("prgBack"); if (bk) bk.onclick = function () { dashProg.sel = null; renderProgPanel(); };
  }
  function progCsv() {
    var lines = ["student,class,slip,role,sessions,accuracy_pct,streak,badges,xp,coins,mistakes_open,updated"];
    (dashProg.rows || []).forEach(function (r) {
      var b = r.blob || {};
      lines.push(['"' + String(r.student || "").replace(/"/g, "'") + '"', r.cls || "", r.slip || "", r.role || "",
        +b.sessions || 0, progAcc(b) == null ? "" : progAcc(b), +b.streak || 0, +b.badges || 0, +b.xp || 0,
        +b.coins || 0, +b.mistakes || 0, r.updated_at || ""].join(","));
    });
    var uri = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
    var a2 = el("a", { href: uri, download: "mamss-class-progress.csv" });
    document.body.appendChild(a2); a2.click(); a2.remove();
  }

  /* pure aggregator — exported for tests */
  function schoolStats(sessions, attempts, ledger) {
    var graded = [], i;
    for (i = 0; i < attempts.length; i++) {
      var a = attempts[i];
      if ((a.status === "submitted" || a.status === "autosubmitted") && a.total > 0 && a.score != null) {
        graded.push({ a: a, pct: Math.round(a.score / a.total * 100) });
      }
    }
    var sum = 0, flags = 0, camOn = 0, uniq = {}, liveNow = 0;
    for (i = 0; i < graded.length; i++) sum += graded[i].pct;
    for (i = 0; i < attempts.length; i++) {
      flags += (+attempts[i].integrity || 0);
      if (attempts[i].webcam === "on") camOn++;
      var idn = attempts[i].slip || attempts[i].name || attempts[i].session_code;
      uniq[idn] = 1;
    }
    for (i = 0; i < sessions.length; i++) if (sessions[i].status === "live") liveNow++;
    var bySess = {};
    for (i = 0; i < sessions.length; i++) bySess[sessions[i].code] = { s: sessions[i], sat: 0, graded: [], top: null };
    for (i = 0; i < attempts.length; i++) {
      var b = bySess[attempts[i].session_code];
      if (!b) continue;
      b.sat++;
    }
    for (i = 0; i < graded.length; i++) {
      var g = bySess[graded[i].a.session_code];
      if (!g) continue;
      g.graded.push(graded[i]);
      if (!g.top || graded[i].pct > g.top.pct) g.top = { name: graded[i].a.name || "Anonymous", pct: graded[i].pct };
    }
    var rows = [];
    for (i = 0; i < sessions.length; i++) {
      var r = bySess[sessions[i].code];
      var rsum = 0, j;
      for (j = 0; j < r.graded.length; j++) rsum += r.graded[j].pct;
      rows.push({
        code: sessions[i].code, title: sessions[i].title, cls: sessions[i].cls, subject: sessions[i].subject || "Mixed",
        status: sessions[i].status, day: fmtDay(sessions[i].live_at || sessions[i].created_at),
        sat: r.sat, avg: r.graded.length ? Math.round(rsum / r.graded.length) : null, top: r.top
      });
    }
    var classes = {}, cs;
    for (i = 0; i < rows.length; i++) {
      cs = classes[rows[i].cls] || (classes[rows[i].cls] = { sat: 0, sum: 0, n: 0, sessions: 0 });
      cs.sat += rows[i].sat; cs.sessions++;
      var sr = bySess[rows[i].code];
      for (j = 0; j < sr.graded.length; j++) { cs.sum += sr.graded[j].pct; cs.n++; }
    }
    var hist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < graded.length; i++) hist[Math.min(9, Math.floor(graded[i].pct / 10))]++;
    var act = null;
    if (ledger) {
      act = { byBatch: {}, week: 0, total: ledger.length };
      var cutoff = Date.now() - 7 * 86400000;
      for (i = 0; i < ledger.length; i++) {
        var bn = ledger[i].batch || "?";
        act.byBatch[bn] = (act.byBatch[bn] || 0) + 1;
        try { if (new Date(ledger[i].redeemed_at).getTime() >= cutoff) act.week++; } catch (e) {}
      }
    }
    return {
      sessions: sessions.length, liveNow: liveNow, sittings: attempts.length, graded: graded.length,
      avg: graded.length ? Math.round(sum / graded.length) : null,
      students: Object.keys(uniq).length, flags: flags, camOn: camOn,
      rows: rows, classes: classes, hist: hist, act: act
    };
  }
  function batchSizes() {
    try {
      var C = window.MAMSS_CODES;
      var out = [], i;
      if (C && C.batches && C.batchRanges) for (i = 0; i < C.batches.length; i++)
        out.push({ name: C.batches[i], size: (C.batchRanges[i][1] - C.batchRanges[i][0]), total: C.count });
      return out;
    } catch (e) { return []; }
  }
  function renderSchool() {
    var host = $("cbtConsBody"); if (!host) return;
    if (!cfg()) { host.innerHTML = "<p class='cbt-muted'>The school dashboard needs the live ledger — this copy of the site has none configured.</p>"; return; }
    dashStop();
    host.innerHTML = "<p class='cbt-muted'>Crunching the whole school…</p>";
    schoolFetch().then(function (data) {
      dash.data = data; dash.err = "";
      if (ui.tab !== "console" || cons.tab !== "school") return;
      drawSchool(host, data);
      dash.timer = setInterval(function () {
        if (ui.tab !== "console" || cons.tab !== "school") { dashStop(); return; }
        schoolFetch().then(function (d2) {
          dash.data = d2;
          var h2 = $("cbtConsBody");
          if (h2 && ui.tab === "console" && cons.tab === "school") drawSchool(h2, d2);
        }).catch(function () {});
      }, 30000);
    }).catch(function (e) {
      if (e && e.setup) {
        host.innerHTML = "<div class='cbt-note'>The school dashboard is <b>being set up</b> — the exam tables are not on the school server yet. Ask the school office to run the setup SQL (it takes a minute); nothing else on the site is affected.</div>";
        return;
      }
      dash.err = (e && e.message) || "network";
      host.innerHTML = "<div class='cbt-note'>Could not reach the school server just now (" + esc(dash.err) + "). <button class='cbt-btn ghost' id='cbtDashRetry'>Try again</button></div>";
      var rb = $("cbtDashRetry");
      if (rb) rb.onclick = function () { renderSchool(); };
    });
  }
  function drawSchool(host, data) {
    var st = schoolStats(data.sessions, data.attempts, data.ledger);
    dash.stats = st;
    var h = "";
    h += '<div class="cbt-row" style="justify-content:space-between;margin-bottom:8px"><b>🏫 Whole school</b>' +
      '<div class="cbt-row"><button class="cbt-btn ghost" id="cbtDashRefresh">⟳ Refresh</button>' +
      '<button class="cbt-btn ghost" id="cbtDashCsv">⬇ CSV</button>' +
      '<button class="cbt-btn ghost" id="cbtDashWa">💬 Summary</button></div></div>';
    h += '<p class="cbt-sub">Updated ' + fmtTime(data.at) + ' · refreshes itself every 30 s while you watch</p>';
    /* stat chips */
    h += '<div class="cbt-row" style="flex-wrap:wrap;gap:8px;margin:10px 0">';
    var chips = [
      ["Papers run", st.sessions + (st.liveNow ? ' <b style="color:#16a34a">(' + st.liveNow + ' live)</b>' : "")],
      ["Sittings", st.sittings],
      ["School average", st.avg == null ? "—" : st.avg + "%"],
      ["Students", st.students],
      ["⚠ Flags", st.flags],
      ["📹 Cameras on", st.camOn]
    ];
    chips.forEach(function (c) {
      h += '<span class="cbt-chip">' + c[0] + ': <b>' + c[1] + "</b></span>";
    });
    h += "</div>";
    h += '<div id="cbtCupPanel"></div>';
    if (!st.sessions) {
      h += "<div class='cbt-note'>No live exams yet — build the first paper in tab 1 and the whole school's story starts here.</div>";
    } else {
      /* per-class bars */
      h += '<h3 style="margin:14px 0 6px">By class</h3>';
      Object.keys(st.classes).sort().forEach(function (cn) {
        var cs = st.classes[cn];
        var cavg = cs.n ? Math.round(cs.sum / cs.n) : null;
        h += '<div class="cbt-row" style="gap:10px;margin:4px 0"><b style="min-width:44px">' + esc(cn) + "</b>" +
          '<div class="cbt-flex1"><div class="cbt-hbar"><i style="width:' + (cavg == null ? 0 : cavg) + '%"></i></div></div>' +
          "<small class='cbt-muted'>" + (cavg == null ? "no graded sittings" : cavg + "% avg") + " · " + cs.sat + " sat · " + cs.sessions + " paper" + (cs.sessions === 1 ? "" : "s") + "</small></div>";
      });
      /* score distribution */
      if (st.graded) {
        var maxH = Math.max.apply(null, st.hist.concat([1]));
        h += '<h3 style="margin:16px 0 6px">Score spread</h3><div class="cbt-bar" title="Graded sittings by score band">';
        for (var bi = 0; bi < 10; bi++)
          h += '<i style="height:' + Math.round(st.hist[bi] / maxH * 100) + '%;opacity:' + (st.hist[bi] ? "1" : ".25") + '" data-l="' + (bi * 10) + '"></i>';
        h += '</div><small class="cbt-muted">share of sittings scoring 0–9 … 90–100%</small>';
      }
      /* session table */
      h += '<h3 style="margin:16px 0 6px">Every paper</h3><table class="cbt-table"><tr><th>Date</th><th>Paper</th><th>Class</th><th>Status</th><th>Sat</th><th>Avg</th><th>Top</th><th><span class="cbt-vh">Open paper</span></th></tr>';
      st.rows.forEach(function (r) {
        h += "<tr><td>" + esc(r.day) + "</td><td><b>" + esc(r.title) + '</b><br><small class="cbt-muted">' + esc(r.subject) + "</small></td>" +
          "<td>" + esc(r.cls) + "</td><td>" + (r.status === "live" ? '<b style="color:#16a34a">LIVE</b>' : esc(r.status)) + "</td>" +
          "<td>" + r.sat + "</td><td>" + (r.avg == null ? "—" : "<b>" + r.avg + "%</b>") + "</td>" +
          "<td>" + (r.top ? esc(r.top.name) + " · " + r.top.pct + "%" : "—") + "</td>" +
          "<td><button class='cbt-btn ghost' data-dash-open='" + esc(r.code) + "'>Open →</button></td></tr>";
      });
      h += "</table>";
    }
    /* activation roll-out */
    h += '<h3 style="margin:16px 0 6px">Activation roll-out</h3>';
    if (!st.act) {
      h += "<p class='cbt-muted'>The slip ledger is not reachable from this copy of the site.</p>";
    } else {
      var bs = batchSizes(), used = 0, total = 0;
      bs.forEach(function (b) {
        var u = st.act.byBatch[b.name] || 0;
        used += u; total += b.size;
        h += '<div class="cbt-row" style="gap:10px;margin:4px 0"><b style="min-width:110px">' + esc(b.name) + "</b>" +
          '<div class="cbt-flex1"><div class="cbt-hbar"><i style="width:' + (b.size ? Math.round(u / b.size * 100) : 0) + '%"></i></div></div>' +
          "<small class='cbt-muted'>" + u + " of " + b.size + " slips used</small></div>";
      });
      h += "<p class='cbt-sub'>" + used + " of " + (total || st.act.total) + " slips activated · <b>" + st.act.week + "</b> in the last 7 days</p>";
    }
    h += "<div id=\"cbtProgPanel\"></div>";
      h += "<p class='cbt-note'>🔓 Since v62 every activated device publishes a progress report (scores, subjects, streaks) to this dashboard. Answer-level detail and the private Cloud Sync blob never leave the student's device.</p>";
    host.innerHTML = h;
    fillProgPanel();
    var rf = $("cbtDashRefresh"); if (rf) rf.onclick = function () { renderSchool(); };
    host.querySelectorAll("[data-dash-open]").forEach(function (b) {
      b.onclick = function () {
        b.disabled = true; b.textContent = "Opening…";
        getSession(b.getAttribute("data-dash-open")).then(function (s) {
          if (!s) { b.disabled = false; b.textContent = "Open →"; return; }
          cons.session = s; cons.tab = "results"; dashStop(); renderConsole();
        }).catch(function () { b.disabled = false; b.textContent = "Open →"; });
      };
    });
    var cv = $("cbtDashCsv");
    if (cv) cv.onclick = function () {
      var lines = ["date,session,class,subject,name,slip,score,total,pct,integrity,webcam,status"];
      st.rows.forEach(function (r) {
        data.attempts.forEach(function (a) {
          if (a.session_code !== r.code) return;
          var pct = (a.status === "submitted" || a.status === "autosubmitted") && a.total > 0 && a.score != null ? Math.round(a.score / a.total * 100) : "";
          lines.push([r.day, '"' + String(r.title).replace(/"/g, "'") + '"', r.cls, '"' + String(r.subject).replace(/"/g, "'") + '"',
            '"' + String(a.name || "").replace(/"/g, "'") + '"', a.slip || "", a.score == null ? "" : a.score, a.total == null ? "" : a.total,
            pct, a.integrity || 0, a.webcam || "", a.status].join(","));
        });
      });
      var uri = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
      var a2 = el("a", { href: uri, download: "mamss-school-dashboard.csv" });
      document.body.appendChild(a2); a2.click(); a2.remove();
    };
    drawCupPanel();
    var wa = $("cbtDashWa");
    if (wa) wa.onclick = function () {
      var best = st.rows.filter(function (r) { return r.avg != null; }).sort(function (x, y) { return y.avg - x.avg; })[0];
      var txt = "🏫 MAMSS PREP — school dashboard\n" +
        st.sessions + " live paper" + (st.sessions === 1 ? "" : "s") + " run · " + st.sittings + " sittings · " + st.students + " students\n" +
        "School average: " + (st.avg == null ? "—" : st.avg + "%") + "\n" +
        (best ? "Strongest paper: " + best.title + " (" + best.avg + "% avg)\n" : "") +
        (st.act ? "Activation: " + st.act.total + " slips used, " + st.act.week + " this week" : "");
      try { var cp = navigator.clipboard && navigator.clipboard.writeText(txt); if (cp && cp.catch) cp.catch(function () {}); } catch (e) {}
      window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
    };
  }
  function fmtTime(ms) {
    try { return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }

  /* ------------------------------------------ v58 teacher question pipeline */
  var pl = { data: [], err: null, sub: "submit", preview: null, fb: "", text: "" };

  function plParseDelim(text) {
    var s2 = String(text == null ? "" : text);
    var firstLine = s2.split(/\r?\n/)[0] || "";
    var delim = (firstLine.indexOf("\t") > -1 && firstLine.indexOf(",") === -1) ? "\t" : ",";
    var rows = [], row = [], cell = "", inQ = false;
    for (var i = 0; i < s2.length; i++) {
      var ch = s2.charAt(i);
      if (inQ) {
        if (ch === '"') { if (s2.charAt(i + 1) === '"') { cell += '"'; i++; } else inQ = false; }
        else cell += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && s2.charAt(i + 1) === "\n") i++;
        row.push(cell); cell = "";
        if (row.some(function (c) { return c.trim() !== ""; })) rows.push(row.map(function (c) { return c.trim(); }));
        row = [];
      } else cell += ch;
    }
    row.push(cell);
    if (row.some(function (c) { return c.trim() !== ""; })) rows.push(row.map(function (c) { return c.trim(); }));
    return rows;
  }
  function plRowsFromText(text) {
    var t = String(text == null ? "" : text).trim();
    if (!t) return [];
    if (t.charAt(0) === "[" || t.charAt(0) === "{") {
      var j = null;
      try { j = JSON.parse(t); } catch (e) { return [{ __bad: "JSON parse error: " + e.message, __src: "json" }]; }
      var arr = Array.isArray(j) ? j : (j && Array.isArray(j.questions) ? j.questions : null);
      if (!arr) return [{ __bad: "JSON must be an array of questions, or an object with a \"questions\" array", __src: "json" }];
      return arr.map(function (o0) {
        o0 = o0 || {};
        var pick = function () {
          for (var k = 0; k < arguments.length; k++) {
            var v = o0[arguments[k]];
            if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
          }
          return "";
        };
        var opts = o0.options || o0.opts || o0.o;
        return {
          __src: "json",
          subject: pick("subject", "subj", "s"),
          cls: pick("class", "cls", "level"),
          topic: pick("topic", "t"),
          q: pick("question", "stem", "q"),
          o: Array.isArray(opts) ? [0, 1, 2, 3].map(function (k) { return String(opts[k] == null ? "" : opts[k]).trim(); })
            : [pick("optionA", "optA", "optiona", "A"), pick("optionB", "optB", "optionb", "B"), pick("optionC", "optC", "optionc", "C"), pick("optionD", "optD", "optiond", "D")],
          a: pick("answer", "ans", "correct"),
          e: pick("explanation", "expl", "e", "note")
        };
      });
    }
    var rows = plParseDelim(t);
    if (!rows.length) return [];
    var head = rows[0].map(function (c) { return c.toLowerCase().replace(/[^a-z0-9]/g, ""); });
    var hasHeader = head.some(function (c) { return c === "question" || c === "stem"; });
    var idx = { subject: 0, cls: 1, topic: 2, q: 3, o0: 4, o1: 5, o2: 6, o3: 7, a: 8, e: 9 };
    if (hasHeader) {
      rows = rows.slice(1);
      var find = function () {
        for (var k = 0; k < arguments.length; k++) { var p = head.indexOf(arguments[k]); if (p > -1) return p; }
        return -1;
      };
      idx = {
        subject: find("subject", "subj", "s"), cls: find("class", "cls", "level"), topic: find("topic", "t"),
        q: find("question", "stem", "q"),
        o0: find("optiona", "opta", "option1"), o1: find("optionb", "optb", "option2"),
        o2: find("optionc", "optc", "option3"), o3: find("optiond", "optd", "option4"),
        a: find("answer", "ans", "correct"), e: find("explanation", "expl", "note")
      };
    }
    return rows.map(function (r) {
      var g = function (p) { return p > -1 && p < r.length ? String(r[p] == null ? "" : r[p]).trim() : ""; };
      return { __src: "csv", subject: g(idx.subject), cls: g(idx.cls), topic: g(idx.topic), q: g(idx.q), o: [g(idx.o0), g(idx.o1), g(idx.o2), g(idx.o3)], a: g(idx.a), e: g(idx.e) };
    });
  }
  function plAnswerIdx(v) {
    var s2 = String(v == null ? "" : v).trim();
    if (/^[A-Da-d]$/.test(s2)) return "ABCD".indexOf(s2.toUpperCase());
    if (/^[0-3]$/.test(s2)) return +s2;
    return -1;
  }
  /* pure validator — same rules as the single-question form (v54) + taxonomy */
  function plValidate(entry, ctx) {
    ctx = ctx || {};
    var errs = [], warns = [];
    if (entry && entry.__bad) return { ok: false, errs: [entry.__bad], warns: warns, q: null };
    var q = String((entry && entry.q) || "").trim();
    var subject = String((entry && entry.subject) || "").trim();
    var cls = String((entry && entry.cls) || "").trim().toUpperCase().replace(/\s+/g, "");
    var topic = String((entry && entry.topic) || "").trim();
    var e = String((entry && entry.e) || "").trim();
    var o = ((entry && entry.o) || []).map(function (x) { return String(x == null ? "" : x).trim(); });
    while (o.length < 4) o.push("");
    o = o.slice(0, 4);
    var a = plAnswerIdx(entry && entry.a);
    if (q.length < 10) errs.push("the stem is too short (10+ characters)");
    if (q.length > 1000) errs.push("the stem is too long (1000 characters max)");
    if (!subject) errs.push("subject is required");
    else if (subject.length > 80) errs.push("subject is too long (80 characters max)");
    if (!/^(SS|JSS)[123]$/.test(cls)) errs.push("class must be SS1-3 or JSS1-3");
    if (o.some(function (x) { return !x; })) errs.push("all four options are required");
    if (o.some(function (x) { return x.length > 300; })) errs.push("an option is too long (300 characters max)");
    if (o.every(function (x) { return x; }) && new Set(o.map(function (x) { return normCode(x); })).size < 4) errs.push("options must be distinct");
    if (a < 0) errs.push("answer must be A-D or 0-3");
    if (e.length > 600) errs.push("explanation is too long (600 characters max)");
    if (!topic) warns.push("no topic — fine, but topics keep the pool tidy");
    if (!errs.length && /[.?]$/.test(q) === false) q = q + (/^(which|what|who|how|when|where|why|find|calculate|determine|state|list|define)/i.test(q) ? "?" : ".");
    var key = normCode(q).slice(0, 60);
    if (!errs.length) {
      if (ctx.draftKeys && ctx.draftKeys[key]) errs.push("this question is already on your draft paper");
      if (ctx.queueKeys && ctx.queueKeys[key]) errs.push("already in the school queue (pending or approved)");
      if (ctx.bankKeys && ctx.bankKeys[key]) warns.push("the WAEC bank already contains this stem");
    }
    MECH_WARN.forEach(function (w) { if (w[0].test(q + " " + e)) warns.push(w[1]); });
    return { ok: !errs.length, errs: errs, warns: warns, q: { q: q, o: o, a: a, e: e, subject: subject, cls: cls, topic: topic } };
  }
  function plCtx() {
    var ctx = { draftKeys: {}, queueKeys: {}, bankKeys: null };
    try {
      ((ui.draft && ui.draft.questions) || []).forEach(function (q2) { ctx.draftKeys[normCode(q2.q).slice(0, 60)] = 1; });
    } catch (e) {}
    (pl.data || []).forEach(function (r) { if (r.status !== "rejected") ctx.queueKeys[normCode(r.q).slice(0, 60)] = 1; });
    try {
      if (typeof CLASSES !== "undefined" && CLASSES && CLASSES.length) {
        ctx.bankKeys = {};
        CLASSES.forEach(function (c) { (c.questions || []).forEach(function (q2) { ctx.bankKeys[normCode(q2.q).slice(0, 60)] = 1; }); });
      }
    } catch (e) {}
    return ctx;
  }
  function fetchQueue() {
    return rest("question_queue?select=*&order=created_at.asc&limit=500").then(function (r) {
      if (isMissingTables(r)) throw setupError();
      if (!r.ok) throw new Error("queue fetch failed (" + r.status + ")");
      pl.data = r.json || []; pl.err = null;
    }).catch(function (e) { pl.err = e; pl.data = []; });
  }
  function plSay(html) { pl.fb = html || ""; drawPipeline($("cbtConsBody")); }
  function plSubTabs() {
    var pend = (pl.data || []).filter(function (r) { return r.status === "pending"; }).length;
    var appr = (pl.data || []).filter(function (r) { return r.status === "approved"; }).length;
    return '<div class="cbt-tabs" style="margin-bottom:10px">' +
      [["submit", "\u2795 Submit questions"], ["review", "\ud83e\uddfe Review (" + pend + ")"], ["pool", "\ud83d\udcda Pool (" + appr + ")"]].map(function (t) {
        return '<button class="cbt-tab' + (pl.sub === t[0] ? " on" : "") + '" data-plsub="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div>";
  }
  function renderPipeline() {
    var host = $("cbtConsBody"); if (!host) return;
    if (!ui.draft) { try { ui.draft = st.get("nssc_cbt_draft", null) || newDraft(); } catch (e) { ui.draft = newDraft(); } }
    if (!cfg()) { host.innerHTML = "<p class='cbt-muted'>The question pipeline needs the school ledger \u2014 this copy of the site has none configured.</p>"; return; }
    host.innerHTML = "<p class='cbt-muted'>Loading the school queue\u2026</p>";
    fetchQueue().then(function () {
      if (ui.tab !== "console" || cons.tab !== "pipeline") return;
      drawPipeline($("cbtConsBody"));
    });
  }
  function drawPipeline(host) {
    if (!host) return;
    if (pl.err) {
      if (pl.err.setup) { host.innerHTML = "<div class='cbt-note'>The question pipeline is <b>being set up</b> \u2014 the queue table is not on the school server yet. Ask the school office to run the one-time setup (tools/pipeline_schema.sql) in the school's Supabase dashboard; everything else works exactly as before.</div>"; return; }
      host.innerHTML = errBox("Could not reach the school queue: " + esc(pl.err.message || String(pl.err)));
      return;
    }
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      "<div><h3 style='margin:0'>\ud83e\uddea Question pipeline</h3><p class='cbt-sub' style='margin:4px 0 0'>Feed the school's own questions in bulk \u2014 paste CSV or JSON, every row is checked with the WAEC mechanics rules, approved questions join the paper builder. The national bank stays hash-locked and untouched.</p></div>" +
      '<button class="cbt-btn ghost" id="plRefresh">\u21bb Refresh</button></div>' +
      plSubTabs() + '<div id="plFb" role="status">' + (pl.fb || "") + "</div>";
    if (pl.sub === "submit") h += plSubmitHtml();
    else if (pl.sub === "review") h += plReviewHtml();
    else h += plPoolHtml();
    host.innerHTML = h;
    plWire(host);
  }
  function plSubmitHtml() {
    var pv = pl.preview;
    var h = '<div class="cbt-card" style="margin-top:4px"><b>Paste CSV or JSON</b>' +
      '<p class="cbt-muted" style="margin:4px 0 8px">CSV columns: <code>subject,class,topic,question,optionA,optionB,optionC,optionD,answer,explanation</code> \u2014 answer is A\u2013D (or 0\u20133), the header row is optional, and a JSON array of objects works too. You can also drop in a .csv or .json file.</p>' +
      '<textarea class="cbt-inp" id="plText" aria-label="Questions as CSV or JSON" rows="7" style="width:100%;font-family:ui-monospace,monospace" placeholder="Mathematics,SS1,Sequences,&quot;What is the next term of 2, 4, 8, ...?&quot;,10,12,16,18,C,Each term doubles">' + esc(pl.text) + "</textarea>" +
      '<div class="cbt-row" style="margin-top:8px"><input type="file" id="plFile" accept=".csv,.json,.txt" aria-label="Upload a CSV or JSON file of questions"><button class="cbt-btn" id="plCheck">Check questions</button></div></div>';
    if (pv && pv.length) {
      var okN = pv.filter(function (r) { return r.v.ok; }).length;
      h += '<div class="cbt-card"><b>Preview \u2014 ' + okN + " of " + pv.length + " row" + (pv.length === 1 ? "" : "s") + ' ready</b>' +
        pv.map(function (r, i) {
          var stem = String((r.entry && r.entry.q) || "");
          return '<div class="cbt-draft-q"><span>' + (i + 1) + '.</span><div class="cbt-flex1"><b>' + esc(stem.slice(0, 90)) + (stem.length > 90 ? "\u2026" : "") + "</b>" +
            "<small>" + esc(String((r.entry && r.entry.cls) || "") + ((r.entry && r.entry.subject) ? " \u00b7 " + r.entry.subject : "")) + "</small>" +
            (r.v.ok ? '<small style="color:#1a7f37">\u2714 passes' + (r.v.warns.length ? " \u2014 \u26a0 " + esc(r.v.warns.join("; ")) : "") + "</small>"
              : '<small style="color:#b42318">\u2718 ' + esc(r.v.errs.join("; ")) + "</small>") + "</div></div>";
        }).join("") +
        '<div class="cbt-row" style="margin-top:8px"><button class="cbt-btn"' + (okN ? "" : " disabled") + ' id="plSend">Send ' + okN + " question" + (okN === 1 ? "" : "s") + ' to the review queue</button></div></div>';
    }
    return h;
  }
  function plReviewHtml() {
    var pend = (pl.data || []).filter(function (r) { return r.status === "pending"; });
    var rej = (pl.data || []).filter(function (r) { return r.status === "rejected"; }).slice(-5).reverse();
    var letters = ["A", "B", "C", "D"];
    var h = '<div class="cbt-card">';
    if (!pend.length) h += "<p class='cbt-muted'>Nothing waiting for review \u2014 the queue is clear.</p>";
    else h += "<b>" + pend.length + " pending</b>" + pend.map(function (r) {
      var o = r.o || [];
      return '<div class="cbt-draft-q"><span>\u2022</span><div class="cbt-flex1"><b>' + esc(r.q) + "</b><small>" +
        esc(o.map(function (x, k) { return letters[k] + ". " + x; }).join(" \u00b7 ")) + "</small><small>\u2714 " + esc(letters[r.a] || "?") +
        " \u00b7 <i>" + esc(String(r.cls || "") + " \u00b7 " + String(r.subject || "") + (r.topic ? " \u00b7 " + r.topic : "")) + "</i>" +
        (r.submitter ? ' \u00b7 <i>from ' + esc(r.submitter) + "</i>" : "") + "</small></div>" +
        '<button class="cbt-btn ghost" data-plrej="' + esc(String(r.id)) + '" title="Reject">\u2718</button>' +
        '<button class="cbt-btn" data-plapp="' + esc(String(r.id)) + '" title="Approve">\u2714</button></div>';
    }).join("");
    if (rej.length) h += '<p class="cbt-muted" style="margin-top:10px">Recently rejected:</p>' + rej.map(function (r) {
      return '<div class="cbt-muted" style="font-size:13px">\u2718 ' + esc(String(r.q || "").slice(0, 70)) + (r.review_note ? " \u2014 " + esc(r.review_note) : "") + "</div>";
    }).join("");
    return h + "</div>";
  }
  function plPoolHtml() {
    var appr = (pl.data || []).filter(function (r) { return r.status === "approved"; });
    var letters = ["A", "B", "C", "D"];
    var h = '<div class="cbt-card">';
    if (!appr.length) h += "<p class='cbt-muted'>No approved questions yet \u2014 approve something under Review and it lands here, ready to drop into any paper.</p>";
    else {
      h += "<b>" + appr.length + " approved \u2014 the school pool</b><p class='cbt-muted'>\u201c\uff0b Add to paper\u201d puts a question on your current draft (Build paper tab). The pool is shared by every teacher.</p>" +
        appr.map(function (r) {
          return '<div class="cbt-draft-q"><span>\u2022</span><div class="cbt-flex1"><b>' + esc(r.q) + "</b><small>" +
            esc((r.o || []).map(function (x, k) { return letters[k] + ". " + x; }).join(" \u00b7 ")) + "</small><small>\u2714 " + esc(letters[r.a] || "?") +
            " \u00b7 <i>" + esc(String(r.cls || "") + " \u00b7 " + String(r.subject || "")) + "</i></small></div>" +
            '<button class="cbt-btn" data-pladd="' + esc(String(r.id)) + '">\uff0b Add to paper</button></div>';
        }).join("") +
        '<div class="cbt-row" style="margin-top:8px"><button class="cbt-btn ghost" id="plAddAll">\uff0b Add all ' + appr.length + " to paper</button></div>";
    }
    return h + "</div>";
  }
  function plWire(host) {
    var rf = $("plRefresh"); if (rf) rf.onclick = function () { pl.fb = ""; renderPipeline(); };
    host.querySelectorAll("[data-plsub]").forEach(function (b) {
      b.onclick = function () { pl.sub = b.getAttribute("data-plsub"); pl.fb = ""; drawPipeline($("cbtConsBody")); };
    });
    var tx = $("plText");
    if (tx) tx.oninput = function () { pl.text = tx.value; };
    var fl = $("plFile");
    if (fl) fl.onchange = function () {
      var f = fl.files && fl.files[0]; if (!f) return;
      try {
        var rd = new FileReader();
        rd.onload = function () { pl.text = String(rd.result || ""); var t2 = $("plText"); if (t2) t2.value = pl.text; plCheckRun(); };
        rd.onerror = function () { plSay(errBox("Could not read that file.")); };
        rd.readAsText(f);
      } catch (e) { plSay(errBox("File reading is not available in this browser \u2014 paste the text instead.")); }
    };
    var ck = $("plCheck"); if (ck) ck.onclick = plCheckRun;
    var sd = $("plSend"); if (sd) sd.onclick = plSendRun;
    host.querySelectorAll("[data-plapp]").forEach(function (b) {
      b.onclick = function () { plReview(b.getAttribute("data-plapp"), "approved", ""); };
    });
    host.querySelectorAll("[data-plrej]").forEach(function (b) {
      b.onclick = function () {
        var note = "";
        try { note = window.prompt("Why is this being rejected? (optional \u2014 shown to the other teachers)", "") || ""; } catch (e) {}
        plReview(b.getAttribute("data-plrej"), "rejected", note);
      };
    });
    host.querySelectorAll("[data-pladd]").forEach(function (b) {
      b.onclick = function () { plAddToDraft([b.getAttribute("data-pladd")]); };
    });
    var aa = $("plAddAll");
    if (aa) aa.onclick = function () {
      plAddToDraft((pl.data || []).filter(function (r) { return r.status === "approved"; }).map(function (r) { return r.id; }));
    };
  }
  function plCheckRun() {
    var tx = $("plText");
    pl.text = tx ? tx.value : pl.text;
    var entries = plRowsFromText(pl.text);
    if (!entries.length) { pl.preview = null; plSay(errBox("Nothing to check \u2014 paste CSV/JSON rows or choose a file first.")); return; }
    var ctx = plCtx();
    pl.preview = entries.map(function (en) { return { entry: en, v: plValidate(en, ctx) }; });
    var okN = pl.preview.filter(function (r) { return r.v.ok; }).length;
    plSay('<div class="cbt-note">' + okN + " of " + entries.length + " row" + (entries.length === 1 ? "" : "s") + " pass the checker" + (okN < entries.length ? " \u2014 fix the \u2718 rows and re-check, or send only the valid ones." : ".") + "</div>");
  }
  function plSendRun() {
    if (!pl.preview) return;
    var ctx = plCtx();
    var valid = [];
    pl.preview.forEach(function (r) {
      var v = plValidate(r.entry, ctx);   /* re-validate at send time */
      if (!v.ok) return;
      valid.push({
        subject: v.q.subject, cls: v.q.cls, topic: v.q.topic, q: v.q.q, o: v.q.o, a: v.q.a, e: v.q.e,
        source: (r.entry && r.entry.__src) || "csv", status: "pending",
        submitter: (me().name || "teacher") + (me().slip ? " \u00b7 " + me().slip : "")
      });
      ctx.queueKeys[normCode(v.q.q).slice(0, 60)] = 1;
    });
    if (!valid.length) { plSay(errBox("No valid rows to send \u2014 fix the \u2718 rows first.")); return; }
    var n = valid.length;
    rest("question_queue", { method: "POST", body: valid, prefer: "return=minimal" }).then(function (r2) {
      if (isMissingTables(r2)) throw setupError();
      if (!r2.ok) throw new Error("send failed (" + r2.status + ")");
      pl.preview = null; pl.text = "";
      return fetchQueue();
    }).then(function () {
      pl.sub = "review";
      plSay('<div class="cbt-note">Sent ' + n + " question" + (n === 1 ? "" : "s") + " to the review queue \u2714 \u2014 any teacher can approve them under Review.</div>");
    }).catch(function (e2) {
      plSay(errBox(e2 && e2.setup ? "The queue table is not on the school server yet \u2014 run the one-time setup (tools/pipeline_schema.sql)." : "Could not send: " + ((e2 && e2.message) || e2)));
    });
  }
  function plReview(id, status, note) {
    var row = (pl.data || []).filter(function (r) { return String(r.id) === String(id); })[0];
    if (!row) return;
    rest("question_queue?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      body: { status: status, review_note: note || null, reviewed_at: new Date().toISOString(), reviewed_by: me().name || "teacher" },
      prefer: "return=minimal"
    }).then(function (r2) {
      if (!r2.ok) throw new Error("review save failed (" + r2.status + ")");
      row.status = status; row.review_note = note || null; row.reviewed_by = me().name || "teacher";
      plSay('<div class="cbt-note">' + (status === "approved" ? "Approved \u2714 \u2014 it is now in the school pool." : "Rejected \u2718" + (note ? " (\u201c" + esc(note) + "\u201d)" : "") + ".") + "</div>");
    }).catch(function (e2) { plSay(errBox("Could not save the review: " + ((e2 && e2.message) || e2))); });
  }
  function plAddToDraft(ids) {
    if (!ui.draft) ui.draft = newDraft();
    var idset = {};
    (ids || []).forEach(function (x) { idset[String(x)] = 1; });
    var have = {};
    (ui.draft.questions || []).forEach(function (q2) { have[normCode(q2.q).slice(0, 60)] = 1; });
    var added = 0, skipped = 0;
    (pl.data || []).forEach(function (r) {
      if (!idset[String(r.id)] || r.status !== "approved") return;
      var key = normCode(r.q).slice(0, 60);
      if (have[key]) { skipped++; return; }
      have[key] = 1;
      ui.draft.questions.push({ q: r.q, o: (r.o || []).slice(0, 4), a: +r.a || 0, e: r.e || "", src: "school" });
      added++;
    });
    saveDraft();
    plSay('<div class="cbt-note">' + (added ? "Added " + added + " question" + (added === 1 ? "" : "s") + " to your draft paper \u2714" : "Nothing added") + (skipped ? " (" + skipped + " already on the paper)" : "") + " \u2014 open \u201c1 \u00b7 Build paper\u201d to see them.</div>");
  }

  /* ---------------------------------------------------------------- api */
  window.MAMSS_CBT = {
    version: VERSION,
    mount: mount,
    openTeacher: openConsole,
    join: doJoin,
    _test: {
      seed32: seed32, permSeeded: permSeeded, buildOrder: buildOrder, optPermFor: optPermFor, answeredAt: answeredAt, classes: SCHOOL_CLASSES,
      makeCode: makeCode, normCode: normCode, gradePaper: gradePaper, me: me, cfg: cfg, rest: rest,
      cam: function () { return { on: camState.on, tracks: camState.stream ? camState.stream.getTracks().map(function (t) { return t.readyState; }) : [] }; },
      cams: function () { return camFrames; },
      vox: function () { return { on: voxState.on, err: voxState.err }; },
      cupStandings: cupStandings, cupFetch: cupFetch,
      voxs: function () { return voxBuf; },
      voxLvls: function () { return voxLvls; },
      voiceMode: voiceMode, clsOf: clsOf, nextFriday16: nextFriday16, dtLocal: dtLocal,
      schoolStats: schoolStats, schoolFetch: schoolFetch,
      progStats: progStats, progAcc: progAcc, prog: function () { return { rows: dashProg.rows, sel: dashProg.sel }; },
      dash: function () { return { data: dash.data, stats: dash.stats || null, err: dash.err }; },
      plParseDelim: plParseDelim, plRowsFromText: plRowsFromText, plValidate: plValidate, plAnswerIdx: plAnswerIdx,
      pipeline: function () { return { data: pl.data, err: pl.err ? String(pl.err.message || pl.err) : null, setup: !!(pl.err && pl.err.setup), preview: pl.preview, sub: pl.sub }; }
    }
  };
  try {
    window.addEventListener("study:view", function (e) {
      if (e.detail === "cbt" && $("cbtRoot")) mount();
    });
  } catch (e) {}
})();
