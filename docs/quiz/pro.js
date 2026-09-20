/* v27.0 — Pro Tools (lazy, boot-safe, loaded by polish.js at idle).
   Adds: ⌘K Command Palette (search everything, keyboard-driven), 🎓 Exam
   Countdown strip (WAEC/NECO/JAMB), 🧘 Zen Focus timer (Pomodoro + chime +
   notifications + session log), 📊 Study Heatmap (GitHub-style, from attempts
   + zen sessions), 👋 personalised greeting, 💬 daily study tip, 🫧 button
   ripple, and micro-upgrades for tiles/section headers. All additive, fails
   silent. */
(function () {
  "use strict";
  if (window.__pro) return;
  window.__pro = 1;

  var ZS = "nssc_zen";
  var EXAMS = [
    { n: "WAEC SSCE", d: [2027, 4, 10] },
    { n: "NECO SSCE", d: [2027, 5, 17] },
    { n: "JAMB UTME", d: [2027, 3, 22] }
  ];
  var TIPS = [
    "Retrieve don't re-read: close the note and answer the evaluation questions from memory first.",
    "Space your study: 3 x 20-minute sessions across the day beat one 60-minute cram.",
    "Teach it: explaining today's topic to a sibling or friend is the fastest way to master it.",
    "Mistakes are gold: every wrong answer you review is a mark you will not lose in the exam hall.",
    "Interleave subjects: switch between two subjects each session — it strengthens both.",
    "Sleep is study: a good night's sleep is when the brain files what you learned today.",
    "Use the scheme of work: tick topics as you master them and watch the term shrink.",
    "A 5-minute walk between sessions resets focus better than 30 minutes on a phone."
  ];
  var MODES = [[15, "15 min"], [25, "25 min"], [45, "45 min"]];
  var PALS = [];

  var CSS =
    "html.pro .pal-q{position:fixed;inset:0;z-index:132;background:rgba(8,10,20,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;justify-content:center;padding:12vh 14px 20px}" +
    "html.pro .pal-box{width:min(640px,100%);height:fit-content;max-height:70dvh;display:flex;flex-direction:column;border-radius:18px;background:var(--card-solid,#fffdf7);border:1px solid rgba(220,184,95,.45);box-shadow:0 40px 90px -30px rgba(0,0,0,.7);overflow:hidden}" +
    "html.pro .pal-in{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--card-border,#ddd2b8)}" +
    "html.pro .pal-in span.b{font-size:1.05rem;color:#8a5f24}" +
    "html.pro .pal-in input{flex:1;border:0;outline:0;background:transparent;color:var(--ink,#20302a);font-size:1.02rem;font-family:inherit}" +
    "html.pro .pal-kb{font-size:.62rem;font-weight:900;border:1px solid var(--card-border);border-radius:7px;padding:3px 7px;color:var(--mut)}" +
    "html.pro .pal-list{overflow-y:auto;padding:8px}" +
    "html.pro .pal-g{font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);padding:8px 10px 3px}" +
    "html.pro .pal-it{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:0;background:transparent;color:var(--ink);padding:10px 11px;border-radius:11px;cursor:pointer;font-family:inherit;font-size:.86rem}" +
    "html.pro .pal-it .pi{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(201,162,39,.14);font-size:1rem}" +
    "html.pro .pal-it b{display:block;font-size:.85rem}html.pro .pal-it small{color:var(--mut);font-size:.7rem;display:block}" +
    "html.pro .pal-it.sel{background:linear-gradient(135deg,rgba(231,200,115,.35),rgba(184,145,47,.25))}" +
    "html.pro .pal-empty{padding:22px;text-align:center;color:var(--mut);font-size:.84rem}" +
    /* exam strip */
    "html.pro #examChip{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px}" +
    "html.pro .ex-tile{border:1px solid rgba(244,227,178,.28);background:rgba(255,255,255,.07);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:14px;padding:7px 13px;color:#f2e5cd;font-size:.74rem;font-weight:700;display:inline-flex;align-items:center;gap:7px;box-shadow:0 10px 24px -16px rgba(0,0,0,.55)}" +
    "html.pro .ex-tile b{color:#eecf7e;font-size:.95rem}" +
    "html.pro .ex-tile small{display:block;font-size:.6rem;color:rgba(242,229,205,.75);font-weight:600}" +
    /* zen */
    "html.pro #zenOv{position:fixed;inset:0;z-index:140;display:flex;align-items:center;justify-content:center;background:radial-gradient(80% 70% at 50% 38%,rgba(20,16,8,.88),rgba(5,6,10,.96));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:18px}" +
    "html.pro .zen-box{width:min(560px,100%);max-height:92dvh;overflow-y:auto;border-radius:22px;background:linear-gradient(165deg,#241c0e,#171307);border:1px solid rgba(220,184,95,.4);color:#f2e5cd;padding:22px 20px;text-align:center;box-shadow:0 40px 100px -30px rgba(0,0,0,.8)}" +
    "html.pro .zen-t{font-size:1.02rem;font-weight:900;letter-spacing:.02em;color:#eecf7e;margin-bottom:2px}" +
    "html.pro .zen-sub{font-size:.74rem;color:rgba(242,229,205,.7);margin-bottom:14px}" +
    "html.pro .zen-ring{width:210px;height:210px;border-radius:50%;margin:6px auto 14px;display:grid;place-items:center;background:conic-gradient(#e7c873 0deg,#3a2c14 0deg);box-shadow:0 0 44px -10px rgba(231,200,115,.5)}" +
    "html.pro .zen-ring>div{width:180px;height:180px;border-radius:50%;background:#171307;display:grid;place-items:center}" +
    "html.pro .zen-time{font-size:2.5rem;font-weight:900;color:#f4e3b2;font-variant-numeric:tabular-nums;letter-spacing:.01em}" +
    "html.pro .zen-m{font-size:.66rem;text-transform:uppercase;letter-spacing:.16em;color:rgba(242,229,205,.6)}" +
    "html.pro .zen-flow{animation:zenb 6s ease-in-out infinite}" +
    "@keyframes zenb{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}" +
    "html.pro .zen-modes{display:flex;gap:8px;justify-content:center;margin-bottom:12px}" +
    "html.pro .zen-mode{border:1px solid rgba(220,184,95,.35);background:rgba(255,255,255,.04);color:#f2e5cd;border-radius:999px;padding:8px 16px;font-weight:800;font-size:.78rem;cursor:pointer;font-family:inherit;transition:.2s}" +
    "html.pro .zen-mode.on{background:linear-gradient(135deg,#e7c873,#b8912f);color:#2a1d06;border-color:transparent}" +
    "html.pro .zen-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin:4px 0 14px}" +
    "html.pro .zen-btn{border:1px solid rgba(220,184,95,.45);background:rgba(255,255,255,.05);color:#f2e5cd;border-radius:999px;padding:10px 20px;font-weight:800;font-size:.8rem;cursor:pointer;font-family:inherit;transition:.2s}" +
    "html.pro .zen-btn.gold{background:linear-gradient(135deg,#e7c873,#b8912f);color:#2a1d06;border-color:transparent}" +
    "html.pro .zen-btn:disabled{opacity:.45;cursor:default}" +
    "html.pro .zen-stats{display:flex;justify-content:center;gap:9px;margin-bottom:13px;flex-wrap:wrap}" +
    "html.pro .zen-st{border:1px solid rgba(220,184,95,.25);border-radius:13px;padding:8px 14px;background:rgba(255,255,255,.03)}" +
    "html.pro .zen-st b{display:block;font-size:1.05rem;color:#eecf7e}.zen-st small{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(242,229,205,.65)}" +
    "html.pro .zen-hm{padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(220,184,95,.22);text-align:left}" +
    "html.pro .zen-hm h5{margin:0 0 8px;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:#eecf7e}" +
    "html.pro .hm-grid{display:grid;grid-template-columns:repeat(14,1fr);gap:3px}" +
    "html.pro .hm-c{aspect-ratio:1;border-radius:3px;background:rgba(255,255,255,.06);position:relative}" +
    "html.pro .hm-c[data-l='1']{background:rgba(231,200,115,.28)}html.pro .hm-c[data-l='2']{background:rgba(231,200,115,.5)}html.pro .hm-c[data-l='3']{background:#c9a227}html.pro .hm-c[data-l='4']{background:#f0d692}" +
    "html.pro .zen-hm p{font-size:.66rem;color:rgba(242,229,205,.6);margin:8px 0 0}" +
    /* ripple + micro */
    "html.pro .pf-rip{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.5),rgba(255,255,255,0) 70%);transform:scale(0);opacity:.7;animation:pfr .5s ease-out forwards;pointer-events:none}" +
    "@keyframes pfr{to{transform:scale(2.6);opacity:0}}" +
    "html.pro .lab-tile .li,html.pro .g-tile .gi,html.pro .sv-tile .si{transition:transform .25s}" +
    "html.pro .lab-tile:hover .li,html.pro .g-tile:hover .gi,html.pro .sv-tile:hover .si{transform:scale(1.14) rotate(-4deg)}" +
    "html.pro .edu-sec h4::after{content:'';display:block;margin-top:5px;height:2px;width:44px;border-radius:99px;background:linear-gradient(90deg,#c9a227,transparent);animation:pfu 2.6s ease-in-out infinite}" +
    "@keyframes pfu{0%,100%{width:44px;opacity:.8}50%{width:88px;opacity:1}}" +
    "html.pro .opt .letter{background:linear-gradient(135deg,#e7c873,#b8912f);color:#2a1d06;border:0}" +
    "html.pro .hero-chip .gr{color:#f0d692}" +
    "@media(max-width:640px){html.pro .ex-tile{font-size:.68rem;padding:6px 10px}html.pro .zen-ring{width:170px;height:170px}html.pro .zen-ring>div{width:144px;height:144px}html.pro .zen-time{font-size:2rem}}" +
    "@media print{html.pro .pal-q,html.pro #zenOv,html.pro #examChip{display:none!important}}";

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function css() { if (!document.getElementById("proCss")) { var s = document.createElement("style"); s.id = "proCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------- greeting + tips (hero) ---------- */
  function greet() {
    var chip = document.getElementById("heroChip");
    if (!chip || chip.dataset.pro) return;
    chip.dataset.pro = 1;
    var h = new Date().getHours();
    var part = h < 12 ? "Good morning" : (h < 17 ? "Good afternoon" : "Good evening");
    var name = "";
    try { name = (typeof user !== "undefined" && user && user.name) || ""; } catch (e) {}
    var base = chip.dataset.base || chip.textContent;
    chip.dataset.base = base;
    chip.innerHTML = '<span class="hr-dot"></span><span class="gr">' + esc(part + ", " + (name.split(" ")[0] || name)) + "</span> · " + esc(base);
    var tip = TIPS[(new Date().getDate() + new Date().getMonth()) % TIPS.length];
    var t = document.createElement("div");
    t.className = "ex-tile";
    t.style.marginTop = "8px";
    t.style.background = "rgba(255,255,255,.05)";
    t.style.maxWidth = "560px";
    t.innerHTML = "💬 <span style='font-weight:600'>" + esc(tip) + "</span>";
    chip.parentNode.insertBefore(t, chip.nextSibling);
  }

  /* ---------- exam countdown ---------- */
  function exams() {
    if (document.getElementById("examChip") || !document.querySelector(".hero-copy") || !document.querySelector(".hero-badge")) return;
    var host = document.querySelector(".hero-copy");
    var wrap = document.createElement("div");
    wrap.id = "examChip";
    wrap.setAttribute("aria-hidden", "true");
    function tile(ex) {
      var now = new Date(), t = new Date(ex.d[0], ex.d[1] - 1, ex.d[2]);
      var days = Math.max(0, Math.ceil((t - now) / 864e5));
      var dateS = t.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
      return '<span class="ex-tile">🎓 <span>' + esc(ex.n) + ' <b>' + days + ' days</b><small>' + dateS + " " + ex.d[0] + " · typical window</small></span></span>";
    }
    wrap.innerHTML = EXAMS.map(tile).join("");
    var hint = document.createElement("div");
    hint.style.cssText = "margin-top:8px;font-size:.64rem;color:rgba(244,227,178,.6);letter-spacing:.06em";
    hint.innerHTML = "⌨️ Press <b>Ctrl K</b> to search everything — papers, notes, tools";
    wrap.appendChild(hint);
    host.insertBefore(wrap, host.querySelector(".stats"));
  }

  /* ---------- ripple ---------- */
  function ripple() {
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest && e.target.closest(".btn,.hd-btn,.nt-btn,.ai-go,.opt,.zen-btn,.pal-it,.ex-tile");
      if (!el || el.className.indexOf && String(el.className).indexOf("pal-it") >= 0) return;
      var r = el.getBoundingClientRect();
      var s = document.createElement("span");
      s.className = "pf-rip";
      var d = Math.max(r.width, r.height);
      s.style.width = s.style.height = d + "px";
      s.style.left = (e.clientX - r.left - d / 2) + "px";
      s.style.top = (e.clientY - r.top - d / 2) + "px";
      el.style.position = el.style.position || "relative";
      el.appendChild(s);
      setTimeout(function () { s.remove(); }, 560);
    }, { passive: true });
  }

  /* ---------- palette ---------- */
  function idx() {
    var out = [];
    function add(g, icon, label, hint, run) { out.push({ g: g, icon: icon, label: label, hint: hint, run: run }); }
    try {
      var PAX = window.__palActions || [];
      for (var pi = 0; pi < PAX.length; pi++) add(PAX[pi][0], PAX[pi][1], PAX[pi][2], PAX[pi][3], PAX[pi][4]);
    } catch (e) {}
    add("Go", "🏠", "Home", "Hero and stats", function () { var b = document.querySelector('.hd-btn[data-hd="home"]'); if (b) b.click(); });
    add("Go", "✨", "AI Coach", "Suggested for you", function () { var b = document.querySelector('.hd-btn[data-hd="coach"]'); if (b) b.click(); });
    add("Go", "📚", "Practice", "Papers, timer, review", function () { var b = document.querySelector('.hd-btn[data-hd="practice"]'); if (b) b.click(); });
    add("Go", "🔬", "Study Hall", "Games and drills", function () { var b = document.querySelector('.hd-btn[data-hd="lab"]'); if (b) b.click(); });
    add("Go", "📊", "HQ", "Reports and streaks", function () { var b = document.querySelector('.hd-btn[data-hd="hq"]'); if (b) b.click(); });
    add("Go", "🎓", "Teaching Suite", "Lesson notes, syllabus, worksheets", function () { var b = document.getElementById("eduLaunch"); if (b) b.click(); });
    add("Go", "📖", "NERDC Lesson Notes", "Primary schemes + 8-part notes", function () { if (window.notes) window.notes(); });
    add("Go", "🎮", "Study Arcade", "Games, videos and badges", function () { var b = document.getElementById("arcLaunch"); if (b) b.click(); });
    add("Tools", "🧘", "Zen Focus Session", "Timed, distraction-free study", function () { zenOpen(); });
    add("Tools", "🎓", "Exam Countdown", "WAEC · NECO · JAMB", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    add("Tools", "↑", "Back to top", "Jump to the hero", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    try {
      if (typeof CLASSES !== "undefined" && CLASSES && CLASSES.length) {
        for (var i = 0; i < CLASSES.length; i++) {
          (function (c) {
            var subs = {}, order = [];
            (c.questions || []).forEach(function (q) {
              if (q && q.s && !subs[q.s]) { subs[q.s] = 0; order.push(q.s); }
              if (q && q.s) subs[q.s]++;
            });
            if (!order.length && c.class) order = [""];
            order.forEach(function (sn) {
              var label = sn ? (c.class + " · " + sn) : String(c.class || "Paper");
              add("Papers", "📝", label, (subs[sn] || (c.questions ? c.questions.length : 0)) + " questions — start a paper", function () {
                var b = document.querySelector('.hd-btn[data-hd="practice"]'); if (b) b.click();
                try { toast(label + " — pick it in Practice below", "📝"); } catch (e) {}
              });
            });
          })(CLASSES[i]);
        }
      }
    } catch (e) {}
    try {
      if (typeof NOTES !== "undefined" && NOTES && NOTES.length) {
        for (var j = 0; j < Math.min(8, NOTES.length); j++) {
          (function (n) {
            add("Notes", "📖", n.subj + " — " + n.topic, "Basic " + n.cls.replace("B", "") + " · Term " + n.term + " · Week " + n.week, function () {
              if (window.notes) window.notes();
              setTimeout(function () { try { var b2 = document.querySelector('[data-open]'); } catch (e) {} }, 400);
            });
          })(NOTES[j]);
        }
      }
    } catch (e) {}
    try { window.__palAdd = add; } catch (e) {}
    try {
      if (window.__proPalHooks) for (var h = 0; h < window.__proPalHooks.length; h++) window.__proPalHooks[h](add);
    } catch (e) {}
    return out;
  }

  function palOpen() {
    css();
    var ov = document.getElementById("palQ");
    if (ov) { ov.style.display = "flex"; palFocus(); return; }
    ov = document.createElement("div");
    ov.id = "palQ";
    ov.className = "pal-q";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Search everything");
    ov.innerHTML = '<div class="pal-box"><div class="pal-in"><span class="b">🔎</span>' +
      '<input id="palIn" placeholder="Search papers, notes, tools…" autocomplete="off">' +
      '<span class="pal-kb">ESC</span></div><div class="pal-list" id="palList"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("pointerdown", function (e) { if (e.target === ov) palClose(); });
    var inp = ov.querySelector("#palIn");
    inp.addEventListener("input", function () { palFill(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); palNav(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); palNav(-1); }
      else if (e.key === "Enter") { e.preventDefault(); palRun(); }
      else if (e.key === "Escape") { palClose(); }
    });
    PALS = idx();
    palFill();
    palFocus();
  }
  var palSel = 0, palItems = [];
  function palFocus() { var i = document.getElementById("palIn"); if (i) { i.value = i.value || ""; setTimeout(function () { try { i.focus({ preventScroll: true }); } catch (e) { try { i.focus(); } catch (e2) {} } }, 30); } }
  function palFill() {
    var q = (document.getElementById("palIn").value || "").toLowerCase().trim();
    var hits = PALS.filter(function (p) { return !q || (p.label + " " + p.hint + " " + p.g).toLowerCase().indexOf(q) >= 0; }).slice(0, 14);
    palItems = hits;
    palSel = 0;
    var list = document.getElementById("palList");
    if (!hits.length) { list.innerHTML = '<div class="pal-empty">No matches — try “biology”, “notes”, “money”, “zen”.</div>'; return; }
    var html = "", lastG = "";
    hits.forEach(function (p, i) {
      if (p.g !== lastG) { html += '<div class="pal-g">' + esc(p.g) + "</div>"; lastG = p.g; }
      html += '<button class="pal-it' + (i === 0 ? " sel" : "") + '" data-i="' + i + '"><span class="pi">' + p.icon + "</span><span><b>" + esc(p.label) + "</b><small>" + esc(p.hint) + "</small></span></button>";
    });
    list.innerHTML = html;
    list.querySelectorAll(".pal-it").forEach(function (b) {
      b.addEventListener("click", function () { palSel = +b.getAttribute("data-i"); palRun(); });
    });
  }
  function palNav(d) {
    palSel = (palSel + d + palItems.length) % palItems.length;
    document.querySelectorAll("#palList .pal-it").forEach(function (b, i) {
      b.classList.toggle("sel", i === palSel);
      if (i === palSel) b.scrollIntoView({ block: "nearest" });
    });
  }
  function palRun() {
    var p = palItems[palSel];
    palClose();
    if (p) { try { p.run(); } catch (e) { try { toast("Could not open that yet", "⚠️"); } catch (e2) {} } }
  }
  function palClose() {
    var ov = document.getElementById("palQ");
    if (ov) { ov.style.display = "none"; try { ov.remove(); } catch (e) {} }
  }

  /* ---------- zen ---------- */
  var zn = { mode: 1, left: 25 * 60, total: 25 * 60, run: false, iv: 0, secs: 0, n: 0 };
  function zload() { var z = ls(ZS, null); if (z) { zn.secs = +z.secs || 0; zn.n = +z.n || 0; } }
  function zsave() { lss(ZS, { secs: zn.secs, n: zn.n, days: ls(ZS, {}).days || {} }); }
  function zday() { var z = ls(ZS, { days: {} }); var k = new Date().toISOString().slice(0, 10); z.days = z.days || {}; z.days[k] = (z.days[k] || 0) + zn.total - zn.left; lss(ZS, z); }
  function chime() {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      var c = new C(), o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.0001;
      o.connect(g); g.connect(c.destination);
      var t = c.currentTime;
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.start(t); o.stop(t + 0.95);
      setTimeout(function () { try { c.close(); } catch (e) {} }, 1200);
    } catch (e) {}
  }
  function zenOpen() {
    css(); zload();
    if (document.getElementById("zenOv")) { document.getElementById("zenOv").style.display = "flex"; zenStat(); return; }
    var ov = document.createElement("div");
    ov.id = "zenOv";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Zen Focus Session");
    ov.innerHTML = '<div class="zen-box">' +
      '<div class="zen-t">🧘 Zen Focus</div><div class="zen-sub">Timed, distraction-free study · track every session</div>' +
      '<div class="zen-modes">' + MODES.map(function (m, i) { return '<button class="zen-mode' + (i === zn.mode ? " on" : "") + '" data-m="' + i + '">' + m[1] + "</button>"; }).join("") + "</div>" +
      '<div class="zen-ring" id="zenRing"><div class="zen-flow"><div class="zen-time" id="zenTime">25:00</div><div class="zen-m">focus</div></div></div>' +
      '<div class="zen-actions"><button class="zen-btn gold" id="zenGo">▶ Start</button>' +
      '<button class="zen-btn" id="zenPause" disabled>⏸ Pause</button>' +
      '<button class="zen-btn" id="zenReset" disabled>↺ Reset</button>' +
      '<button class="zen-btn" id="zenX">✕ Close</button></div>' +
      '<div class="zen-stats" id="zenStats"></div>' +
      '<div class="zen-hm"><h5>📊 Study rhythm — last 14 weeks</h5><div class="hm-grid" id="zenHM"></div><p>Colour = study minutes that day (papers + focus sessions). It is okay to rest — aim for a steady rhythm, not a spike.</p></div>' +
      "</div>";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) {
      var t = e.target.closest("[data-m],#zenGo,#zenPause,#zenReset,#zenX");
      if (!t) return;
      if (t.hasAttribute("data-m")) { zn.mode = +t.getAttribute("data-m"); setMode(); zenStat(); return; }
      if (t.id === "zenGo") { zenStart(); return; }
      if (t.id === "zenPause") { zenPause(); return; }
      if (t.id === "zenReset") { zenReset(); return; }
      if (t.id === "zenX") { zenPause(); ov.style.display = "none"; }
    });
    setMode(); zenStat(); zenHM();
  }
  function setMode() {
    zn.total = zn.left = MODES[zn.mode][0] * 60;
    document.querySelectorAll("#zenOv .zen-mode").forEach(function (b, i) { b.classList.toggle("on", i === zn.mode); });
    zenPaint(0);
  }
  function zenPaint(frac) {
    var t = document.getElementById("zenTime"), r = document.getElementById("zenRing");
    if (!t) return;
    var m = Math.floor(zn.left / 60), s = zn.left % 60;
    t.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    if (r) r.style.background = "conic-gradient(#e7c873 " + Math.round((1 - frac) * 360) + "deg,#3a2c14 0deg)";
  }
  function zenStart() {
    if (zn.run) return;
    zn.run = true;
    document.getElementById("zenGo").textContent = "▶ Running";
    document.getElementById("zenPause").disabled = false;
    document.getElementById("zenReset").disabled = false;
    try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
    zn.iv = setInterval(function () {
      if (!zn.run) return;
      zn.left--; zn.secs++;
      zenPaint((zn.total - zn.left) / zn.total);
      if (zn.left <= 0) { zenDone(); }
    }, 1000);
  }
  function zenPause() {
    zn.run = false;
    if (zn.iv) { clearInterval(zn.iv); zn.iv = 0; }
    try { lss(ZS, { secs: zn.secs, n: zn.n, days: (ls(ZS, { days: {} }).days || {}) }); } catch (e) {}
    var g = document.getElementById("zenGo");
    if (g) g.textContent = "▶ Resume";
    var p = document.getElementById("zenPause"); if (p) p.disabled = true;
  }
  function zenReset() {
    zenPause();
    zn.left = zn.total;
    zenPaint(0);
    var g = document.getElementById("zenGo"); if (g) g.textContent = "▶ Start";
  }
  function zenDone() {
    zenPause();
    zn.n++;
    zday(); zsave();
    chime();
    try { toast("Focus session complete — " + MODES[zn.mode][0] + " minutes of quality study 🎉", "🧘"); } catch (e) {}
    try { if (window.Notification && Notification.permission === "granted") new Notification("Zen complete", { body: MODES[zn.mode][0] + " minutes of focused study. You are building the habit!" }); } catch (e) {}
    zn.left = zn.total;
    zenPaint(0);
    zenStat(); zenHM();
    var g = document.getElementById("zenGo"); if (g) g.textContent = "▶ Start";
  }
  function zenStat() {
    var el = document.getElementById("zenStats");
    if (!el) return;
    var mins = Math.round(zn.secs / 60);
    var today = mkToday();
    var d = ls(ZS, { days: {} }).days || {};
    el.innerHTML = '<div class="zen-st"><b>' + zn.n + '</b><small>sessions</small></div>' +
      '<div class="zen-st"><b>' + mins + 'm</b><small>focused</small></div>' +
      '<div class="zen-st"><b>' + (d[today] || 0) + 'm</b><small>today</small></div>';
  }
  function mkToday() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function zenHM() {
    var el = document.getElementById("zenHM");
    if (!el) return;
    var days = {};
    try {
      if (typeof attempts === "function") {
        attempts().forEach(function (a) {
          if (!a || !a.tms) return;
          var d = new Date(a.tms), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          days[k] = (days[k] || 0) + 8;
        });
      }
    } catch (e) {}
    var z = ls(ZS, { days: {} }).days || {};
    Object.keys(z).forEach(function (k) { days[k] = (days[k] || 0) + z[k]; });
    var html = "", now = new Date();
    for (var i = 97; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 864e5);
      var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      var v = days[k] || 0;
      var l = v >= 45 ? 4 : v >= 25 ? 3 : v >= 10 ? 2 : v > 0 ? 1 : 0;
      html += '<span class="hm-c" data-l="' + l + '" title="' + k + " · " + Math.round(v) + ' min"></span>';
    }
    el.innerHTML = html;
  }

  /* ---------- boot ---------- */
  function boot() {
    try { window.__palOpen = palOpen; } catch (e) {}
    css();
    try { document.documentElement.classList.add("pro"); } catch (e) {}
    try { greet(); } catch (e) {}
    try { exams(); } catch (e) {}
    try { ripple(); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); palOpen(); }
      });
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  /* v28 — load the Apex HQ module (trophy room + exam sprint plan) at idle so
     it never competes with boot or the first paint. */
  try {
    var ax = function () {
      if (window.__apex || document.getElementById("apexScript")) return;
      var s3 = document.createElement("script");
      s3.id = "apexScript";
      s3.src = "quiz/aura.js";
      s3.async = !0;
      s3.onerror = function () { try { s3.remove(); } catch (e) {} };
      document.head.appendChild(s3);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(ax, { timeout: 4000 }); }
    else { setTimeout(ax, 1400); }
  } catch (e) {}
})();
