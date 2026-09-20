/* v31.0 — Study Studio (lazy, boot-safe, loaded by polish.js at idle).
   Adds: 🧠 Mind Map Studio (SVG canvas — add/connect/recolor/drag nodes,
   templates, auto-save, PNG export), 📏 Unit & Rate Converter (10 categories
   incl. temperature with special formulas), 🎨 Theme Studio (5 accent
   presets that re-colour the whole app via CSS variables), 🌅 Daily Spark
   (word + quote of the day), ☄️ hero comet streaks, and three new
   command-palette entries. Additive, fails silent. */
(function () {
  "use strict";
  if (window.__st) return;
  window.__st = 1;

  var K = "nssc_mind";
  var AK = "nssc_accent";
  var MN = "nssc_mind";

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- data ---------- */
  var CATS = [
    { k: "temp", n: "🌡 Temperature", u: [["°C", 1, 273.15], ["°F", 5 / 9, 459.67], ["K", 1, 0]] },
    { k: "len", n: "📏 Length", u: [["km", 1000, 0], ["m", 1, 0], ["cm", 0.01, 0], ["mm", 0.001, 0], ["mile", 1609.344, 0], ["ft", 0.3048, 0], ["in", 0.0254, 0]] },
    { k: "mass", n: "⚖️ Mass", u: [["tonne", 1000, 0], ["kg", 1, 0], ["g", 0.001, 0], ["mg", 1e-6, 0], ["lb", 0.45359237, 0]] },
    { k: "vol", n: "🧪 Volume", u: [["m³", 1000, 0], ["L", 1, 0], ["mL", 0.001, 0], ["gal (US)", 3.785411784, 0], ["pint", 0.473176473, 0]] },
    { k: "spd", n: "🚀 Speed", u: [["m/s", 1, 0], ["km/h", 1 / 3.6, 0], ["mph", 0.44704, 0], ["ft/s", 0.3048, 0]] },
    { k: "time", n: "⏱ Time", u: [["day", 86400, 0], ["h", 3600, 0], ["min", 60, 0], ["s", 1, 0]] },
    { k: "pres", n: "💨 Pressure", u: [["atm", 101325, 0], ["bar", 100000, 0], ["kPa", 1000, 0], ["mmHg", 133.322, 0], ["Pa", 1, 0]] },
    { k: "eng", n: "⚡ Energy", u: [["kJ", 1000, 0], ["kWh", 3.6e6, 0], ["kcal", 4184, 0], ["J", 1, 0], ["cal", 4.184, 0]] },
    { k: "data", n: "💾 Data", u: [["TB", 1e12, 0], ["GB", 1e9, 0], ["MB", 1e6, 0], ["KB", 1e3, 0], ["B", 1, 0]] },
    { k: "area", n: "🗺 Area", u: [["km²", 1e6, 0], ["hectare", 1e4, 0], ["m²", 1, 0], ["cm²", 1e-4, 0]] }
  ];
  var ACC = [
    { k: "", n: "Aurum (default)", c: ["#eccf8e", "#c9a25f", "#9c742c"] },
    { k: "sapphire", n: "Sapphire", c: ["#93c5fd", "#3b82f6", "#1e40af"] },
    { k: "emerald", n: "Emerald", c: ["#6ee7b7", "#10b981", "#047857"] },
    { k: "rose", n: "Rose", c: ["#fda4af", "#f43f5e", "#be123c"] },
    { k: "violet", n: "Violet", c: ["#c4b5fd", "#8b5cf6", "#6d28d9"] }
  ];
  var WORDS = [
    { w: "serendipity", p: "noun", d: "finding something good without looking for it", x: "Finding the perfect timetable app was pure serendipity." },
    { w: "meticulous", p: "adjective", d: "showing great attention to detail", x: "Be meticulous when you copy formulae into your notes." },
    { w: "diligent", p: "adjective", d: "hard-working and careful", x: "A diligent revision plan beats a last-minute cram." },
    { w: "resilient", p: "adjective", d: "able to recover quickly from difficulty", x: "Resilient learners treat every failed test as a lesson." },
    { w: "prevalent", p: "adjective", d: "widespread in a particular area", x: "Calculators are prevalent in modern exam halls." },
    { w: "ambiguous", p: "adjective", d: "open to more than one interpretation", x: "Read an ambiguous question twice before answering." },
    { w: "coherent", p: "adjective", d: "logical and consistent", x: "A coherent essay has a clear beginning, middle and end." },
    { w: "hypothesis", p: "noun", d: "a proposed explanation to be tested", x: "Every experiment starts with a hypothesis." },
    { w: "synthesis", p: "noun", d: "combining ideas into a new whole", x: "Synthesis of your notes is the last step of revision." },
    { w: "catalyst", p: "noun", d: "something that speeds up a reaction", x: "Manganese(IV) oxide catalyses the decomposition of hydrogen peroxide." },
    { w: "ubiquitous", p: "adjective", d: "present everywhere", x: "Plastic waste is ubiquitous in modern cities." },
    { w: "scrutinise", p: "verb", d: "examine closely", x: "Scrutinise every option before ticking an answer." },
    { w: "conscientious", p: "adjective", d: "careful and thorough", x: "Conscientious students keep a mistakes notebook." },
    { w: "proficiency", p: "noun", d: "high level of skill", x: "Speed in calculation comes from proficiency built by practice." },
    { w: "corroborate", p: "verb", d: "confirm with evidence", x: "Two sources corroborate the date of the event." },
    { w: "ephemeral", p: "adjective", d: "lasting a very short time", x: "A phone notification's distraction is ephemeral; focus is lasting." },
    { w: "exemplary", p: "adjective", d: "serving as a perfect example", x: "Her exemplary essay earned full marks." },
    { w: "meticulousness", p: "noun", d: "great attention to detail", x: "Accuracy in chemistry demands meticulousness." },
    { w: "tenacity", p: "noun", d: "persistence despite difficulty", x: "Tenacity in revision is what separates success from failure." },
    { w: "articulate", p: "verb", d: "express clearly", x: "Articulate your answer step by step to earn method marks." },
    { w: "inherent", p: "adjective", d: "existing as a permanent quality", x: "Risk is inherent in every investment question." },
    { w: "plausible", p: "adjective", d: "seeming reasonable or probable", x: "The wrong option in a CBT is often plausible — eliminate it." },
    { w: "lucid", p: "adjective", d: "expressed clearly, easy to understand", x: "A lucid explanation of a formula sticks in memory." }
  ];
  WORDS = WORDS.filter(function (w) { return w.w; });
  var QUOTES = [
    { q: "It always seems impossible until it is done.", a: "Nelson Mandela" },
    { q: "Education is the most powerful weapon which you can use to change the world.", a: "Nelson Mandela" },
    { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
    { q: "Genius is one percent inspiration and ninety-nine percent perspiration.", a: "Thomas Edison" },
    { q: "A person who never made a mistake never tried anything new.", a: "Albert Einstein" },
    { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
    { q: "The expert in anything was once a beginner.", a: "Helen Hayes" },
    { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
    { q: "If you want to go fast, go alone. If you want to go far, go together.", a: "African proverb" },
    { q: "The more that you read, the more things you will know.", a: "Dr. Seuss" },
    { q: "Believe you can and you are halfway there.", a: "Theodore Roosevelt" },
    { q: "A different language is a different vision of life.", a: "Federico Fellini" },
    { q: "The beautiful thing about learning is that no one can take it away from you.", a: "B.B. King" },
    { q: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", a: "Albert Einstein" },
    { q: "Dream big and dare to fail.", a: "Norman Vaughan" },
    { q: "Today a reader, tomorrow a leader.", a: "Margaret Fuller" }
  ];
  var TPL = {
    n: [
      { id: "t0", x: 520, y: 60, t: "My Study Plan", c: 4 },
      { id: "t1", x: 220, y: 180, t: "Morning review", c: 0 },
      { id: "t2", x: 820, y: 180, t: "Class notes", c: 3 },
      { id: "t3", x: 220, y: 320, t: "Practice quiz", c: 1 },
      { id: "t4", x: 820, y: 320, t: "Past papers", c: 2 },
      { id: "t5", x: 520, y: 440, t: "Sleep well", c: 5 }
    ],
    e: [["t0", "t1"], ["t0", "t2"], ["t0", "t3"], ["t0", "t4"], ["t0", "t5"]]
  };

  /* ---------- styles ---------- */
  var CSS =
    "html.studio .st-ov{position:fixed;inset:0;z-index:128;background:rgba(8,10,20,.52);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.studio .st-box{width:min(720px,100%);max-height:94dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.5);box-shadow:0 40px 90px -30px rgba(0,0,0,.75);padding:14px;color:var(--ink,#20302a)}" +
    "html.studio .st-h{display:flex;align-items:center;gap:8px;font-size:1.02rem;font-weight:800;margin-bottom:3px}" +
    "html.studio .st-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.studio .st-x:hover{background:rgba(0,0,0,.06)}" +
    "html.studio .st-sub{font-size:.7rem;color:var(--mut,#8a7a5c);margin-bottom:10px}" +
    "html.studio .st-btn{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:11px;padding:7px 12px;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;transition:all .15s}" +
    "html.studio .st-btn:hover{background:var(--opt-hover,rgba(201,162,39,.12))}" +
    "html.studio .st-btn.on{background:linear-gradient(135deg,#f0dca6,#c9a25f);border-color:transparent;color:#241a05}" +
    "html.studio .st-btn.danger:hover{background:#fde8e8;color:#b91c1c}" +
    "html.studio .mm-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}" +
    "html.studio .mm-wrap{border:1.5px dashed var(--card-border,#cbb386);border-radius:14px;overflow:hidden;background:var(--panel,#f5efdf);position:relative}" +
    "html.studio .mm-svg{display:block;width:100%;height:auto;min-height:300px;touch-action:none;user-select:none;-webkit-user-select:none}" +
    "html.studio .mm-n{cursor:grab}" +
    "html.studio .mm-n:active{cursor:grabbing}" +
    "html.studio .mm-n.sel rect{stroke:#c9a25f;stroke-width:3;stroke-dasharray:6 4}" +
    "html.studio .mm-n.src rect{stroke:#ef4444;stroke-width:3}" +
    "html.studio .mm-hint{font-size:.62rem;color:var(--mut,#8a7a5c);margin:6px 2px 0}" +
    "html.studio .mm-panel{border:1px solid var(--card-border,#e2d5b8);border-radius:13px;padding:9px 11px;margin-top:9px;background:var(--opt-bg,#fdf8ec)}" +
    "html.studio .mm-panel.off{display:none}" +
    "html.studio .mm-panel .ph{font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--mut,#8a7a5c)}" +
    "html.studio .mm-tin{width:100%;border:1px solid var(--card-border,#cbb386);background:var(--card-solid,#fff);border-radius:10px;padding:7px 10px;font-size:.82rem;color:var(--ink,#20302a);font-family:inherit;margin:5px 0 7px;outline:none}" +
    "html.studio .mm-tin:focus{border-color:#c9a25f;box-shadow:0 0 0 3px rgba(201,162,39,.22)}" +
    "html.studio .mm-cs{display:flex;gap:6px;flex-wrap:wrap;align-items:center}" +
    "html.studio .mm-c{border:2px solid transparent;width:24px;height:24px;border-radius:50%;cursor:pointer;padding:0}" +
    "html.studio .mm-c.on{border-color:var(--ink,#20302a);transform:scale(1.12)}" +
    "html.studio .cv-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}" +
    "html.studio .cv-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:9px}" +
    "html.studio .cv-sel,.studio .cv-in{width:100%;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:11px;padding:9px 11px;font-size:.82rem;color:var(--ink,#20302a);font-family:inherit;outline:none}" +
    "html.studio .cv-in{font-size:1rem;font-weight:800}" +
    "html.studio .cv-sel:focus,.studio .cv-in:focus{border-color:#c9a25f}" +
    "html.studio .cv-swap{border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:50%;width:38px;height:38px;font-size:1rem;cursor:pointer;color:var(--ink-2,#4a5877)}" +
    "html.studio .cv-out{text-align:center;font-size:1.35rem;font-weight:900;background:linear-gradient(135deg,#eccf8e,#9c742c);-webkit-background-clip:text;background-clip:text;color:transparent;padding:2px 0 0;min-height:1.9em}" +
    "html.studio .cv-sub{display:block;font-size:.68rem;color:var(--mut,#8a7a5c);text-align:center;font-weight:600;margin-top:-4px}" +
    "html.studio .cv-note{font-size:.62rem;color:var(--mut,#8a7a5c);text-align:center}" +
    "html.studio .ts-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}" +
    "html.studio .ts-ac{border:1.5px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:13px;padding:8px 12px;font-size:.7rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;display:flex;align-items:center;gap:7px}" +
    "html.studio .ts-ac.on{border-color:var(--ink-2,#4a5877);box-shadow:0 6px 14px -8px rgba(60,45,20,.5)}" +
    "html.studio .ts-sw{width:20px;height:20px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.15)}" +
    "html.studio .ts-note{font-size:.64rem;color:var(--mut,#8a7a5c);text-align:center}" +
    "html.studio .spk{margin-top:8px;display:flex;flex-direction:column;gap:6px;max-width:560px;width:100%;min-width:0;flex:1 1 100%}" +
    "html.studio .spk .ex-tile{background:rgba(255,255,255,.05);white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%;box-sizing:border-box}" +
    "html.studio .spk b{color:#f3e9c8}" +
    "html.studio #heroFx{position:absolute;overflow:hidden}" +
    "html.studio .comet{position:absolute;height:2px;width:130px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(243,233,200,.95),transparent);opacity:0;pointer-events:none}" +
    "html.studio .comet.c1{top:16%;left:-12%;animation:stcomet 9s linear infinite}" +
    "html.studio .comet.c2{top:38%;left:-18%;animation:stcomet 12s linear infinite;animation-delay:3.2s}" +
    "html.studio .comet.c3{top:62%;left:-10%;animation:stcomet 10.5s linear infinite;animation-delay:6.4s}" +
    "@media (prefers-reduced-motion:no-preference){@keyframes stcomet{0%{transform:translateX(0) rotate(-16deg);opacity:0}5%{opacity:.85}40%{opacity:.85}55%{opacity:0}100%{transform:translateX(160vw) rotate(-16deg);opacity:0}}}" +
    /* theme accents — one block per accent + generic hardcode overrides */
    "html.studio .tk-bar{background:var(--grad-gold)}html.studio .spr-bar span{background:var(--grad-gold)}html.studio .ex-tile{border-color:var(--ring,#ddd3b4)}html.studio .bt-chip{border-color:var(--ring,#ddd3b4)}" +
    "html.studio .hm-c[data-l=" + "'1'" + "]{background:var(--hm1,rgba(231,200,115,.28))}html.studio .hm-c[data-l=" + "'2'" + "]{background:var(--hm2,rgba(231,200,115,.5))}html.studio .hm-c[data-l=" + "'3'" + "]{background:var(--hm3,#c9a227)}html.studio .hm-c[data-l=" + "'4'" + "]{background:var(--hm4,#f0d692)}" +
    "html.st-acc-sapphire{--green:#2563eb;--green-2:#5b8def;--green-d:#1d4ed8;--green-l:#dbeafe;--gold:#3b82f6;--gold-l:#dbeafe;--gold-d:#1e40af;--ring:#bfdbfe;--grad-gold:linear-gradient(135deg,#93c5fd,#3b82f6 48%,#1e40af);--hm1:rgba(59,130,246,.25);--hm2:rgba(59,130,246,.5);--hm3:#3b82f6;--hm4:#93c5fd}" +
    "html.st-acc-emerald{--green:#047857;--green-2:#34d399;--green-d:#065f46;--green-l:#d1fae5;--gold:#10b981;--gold-l:#d1fae5;--gold-d:#047857;--ring:#a7f3d0;--grad-gold:linear-gradient(135deg,#6ee7b7,#10b981 48%,#047857);--hm1:rgba(16,185,129,.25);--hm2:rgba(16,185,129,.5);--hm3:#10b981;--hm4:#6ee7b7}" +
    "html.st-acc-rose{--green:#be123c;--green-2:#fb7185;--green-d:#9f1239;--green-l:#ffe4e6;--gold:#f43f5e;--gold-l:#ffe4e6;--gold-d:#be123c;--ring:#fecdd3;--grad-gold:linear-gradient(135deg,#fda4af,#f43f5e 48%,#be123c);--hm1:rgba(244,63,94,.25);--hm2:rgba(244,63,94,.5);--hm3:#f43f5e;--hm4:#fda4af}" +
    "html.st-acc-violet{--green:#6d28d9;--green-2:#a78bfa;--green-d:#5b21b6;--green-l:#ede9fe;--gold:#8b5cf6;--gold-l:#ede9fe;--gold-d:#6d28d9;--ring:#ddd6fe;--grad-gold:linear-gradient(135deg,#c4b5fd,#8b5cf6 48%,#6d28d9);--hm1:rgba(139,92,246,.25);--hm2:rgba(139,92,246,.5);--hm3:#8b5cf6;--hm4:#c4b5fd}" +
    "html.studio .mm-gold{background:var(--grad-gold)}";

  function css() { if (!document.getElementById("stCss")) { var s = document.createElement("style"); s.id = "stCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ================= 🧠 MIND MAP ================= */
  var MM = { st: null, sel: null, conn: 0, connF: null, drag: null, arm: 0 };
  var CC = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  function mmLoad() { MM.st = ls(MN, null); if (!MM.st) { MM.st = JSON.parse(JSON.stringify(TPL)); mmSave(); } }
  function mmSave() { lss(MN, { n: MM.st ? MM.st.n : [], e: MM.st ? MM.st.e : [] }); }
  function mmFind(id) { for (var i = 0; i < MM.st.n.length; i++) if (MM.st.n[i].id === id) return MM.st.n[i]; return null; }
  function mmW(t) { return Math.max(110, Math.min(250, String(t).length * 9.2 + 66)); }

  function mmRender() {
    var svg = $("mmSvg");
    if (!svg || !MM.st) return;
    var html = '<defs><marker id="mmArr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L8,4.5 L0,9 z" fill="#8a7a5c"/></marker></defs>';
    for (var i = 0; i < MM.st.e.length; i++) {
      var a = mmFind(MM.st.e[i][0]), b = mmFind(MM.st.e[i][1]);
      if (!a || !b) continue;
      html += '<line class="mm-e" x1="' + (a.x + mmW(a.t) / 2) + '" y1="' + (a.y + 22) + '" x2="' + (b.x + mmW(b.t) / 2) + '" y2="' + (b.y + 22) + '" stroke="rgba(120,100,70,.45)" stroke-width="2.5" marker-end="url(#mmArr)"/>';
    }
    for (var j = 0; j < MM.st.n.length; j++) {
      var n = MM.st.n[j];
      var w = mmW(n.t);
      html += '<g class="mm-n' + (MM.sel === n.id ? " sel" : "") + (MM.connF === n.id ? " src" : "") + '" data-id="' + esc(n.id) + '" transform="translate(' + n.x + "," + n.y + ')" style="cursor:grab">' +
        '<rect width="' + w + '" height="44" rx="14" fill="' + n.c + '" stroke="rgba(255,255,255,.85)" stroke-width="1.5"/>' +
        '<text x="' + (w / 2) + '" y="27" text-anchor="middle" fill="#fff" font-family="inherit" font-size="14.5" font-weight="700">' + esc(n.t) + "</text></g>";
    }
    svg.innerHTML = html;
  }

  function mmPt(e) {
    var svg = $("mmSvg"), r = svg.getBoundingClientRect();
    var x = r.width ? (e.clientX - r.left) / r.width * 1280 : 0;
    var y = r.height ? (e.clientY - r.top) / r.height * 800 : 0;
    return { x: clampi(x, 10, 1270), y: clampi(y, 10, 790) };
  }
  function clampi(v, a, b) { return v < a ? a : v > b ? b : v; }

  function mmWire() {
    var svg = $("mmSvg");
    if (!svg || svg._wired) return;
    svg._wired = 1;
    svg.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var t = e.target, g = null;
      while (t && t !== svg) { if (t.classList && t.classList.contains("mm-n")) { g = t; break; } t = t.parentNode; }
      if (!g) return;
      var id = g.getAttribute("data-id");
      var n = mmFind(id);
      var p = mmPt(e);
      MM.drag = { id: id, cx: p.x, cy: p.y, x0: n ? n.x : 0, y0: n ? n.y : 0, moved: false };
    }, { passive: true });
    window.addEventListener("pointermove", function (e) {
      if (!MM.drag) return;
      var p = mmPt(e);
      var n = mmFind(MM.drag.id);
      if (!n) { MM.drag = null; return; }
      var dx = p.x - MM.drag.cx, dy = p.y - MM.drag.cy;
      if (Math.abs(dx) + Math.abs(dy) > 4) MM.drag.moved = true;
      if (MM.drag.moved) { n.x = clampi(MM.drag.x0 + dx, 10, 1180); n.y = clampi(MM.drag.y0 + dy, 10, 750); mmSave(); mmRender(); }
    }, { passive: true });
    window.addEventListener("pointerup", function (e) {
      if (!MM.drag) return;
      var d = MM.drag; MM.drag = null;
      if (!d.moved) mmTap(d.id);
    }, { passive: true });
  }

  function mmTap(id) {
    if (MM.conn === 1) { MM.connF = id; MM.conn = 2; }
    else if (MM.conn === 2) {
      if (id !== MM.connF) {
        var dup = false;
        for (var i = 0; i < MM.st.e.length; i++) if ((MM.st.e[i][0] === MM.connF && MM.st.e[i][1] === id) || (MM.st.e[i][0] === id && MM.st.e[i][1] === MM.connF)) dup = true;
        if (!dup) MM.st.e.push([MM.connF, id]);
        mmSave();
      }
      MM.conn = 0; MM.connF = null;
    } else { MM.sel = id; }
    mmRender(); mmPanel();
  }

  function mmAdd() {
    var n = { id: "n" + Date.now() + Math.floor(Math.random() * 999), x: 500 + Math.floor(Math.random() * 240), y: 120 + Math.floor(Math.random() * 320), t: "New idea", c: MM.st.n.length % CC.length };
    MM.st.n.push(n); mmSave(); mmRender(); mmSel(n.id);
  }
  function mmSel(id) { MM.sel = id; mmRender(); mmPanel(); }
  function mmDel() {
    if (MM.sel == null) return;
    MM.st.n = MM.st.n.filter(function (n) { return n.id !== MM.sel; });
    MM.st.e = MM.st.e.filter(function (e_) { return e_[0] !== MM.sel && e_[1] !== MM.sel; });
    MM.sel = null; mmSave(); mmRender(); mmPanel();
  }
  function mmClear() {
    if (!MM.st.n.length) return;
    if (MM.arm === 0) { MM.arm = 1; var b = $("mmClear"); if (b) b.textContent = "Sure?"; setTimeout(function () { MM.arm = 0; var b2 = $("mmClear"); if (b2) b2.textContent = "🗑 Clear"; }, 2200); return; }
    MM.arm = 0; MM.st = { n: [], e: [] }; MM.sel = null; mmSave(); mmRender(); mmPanel();
    var b3 = $("mmClear"); if (b3) b3.textContent = "🗑 Clear";
  }
  function mmTpl() {
    if (MM.st.n.length && MM.arm === 0) { MM.arm = 2; var b = $("mmTplB"); if (b) b.textContent = "Overwrite?"; setTimeout(function () { MM.arm = 0; var b2 = $("mmTplB"); if (b2) b2.textContent = "🕸 Template"; }, 2200); return; }
    MM.arm = 0; MM.st = JSON.parse(JSON.stringify(TPL)); MM.sel = null; mmSave(); mmRender(); mmPanel();
    var b4 = $("mmTplB"); if (b4) b4.textContent = "🕸 Template";
  }

  function mmPanel() {
    var p = $("mmPanel");
    if (!p) return;
    var n = MM.sel == null ? null : mmFind(MM.sel);
    if (!n) { p.classList.add("off"); return; }
    p.classList.remove("off");
    var tin = $("mmTxt");
    if (tin && document.activeElement !== tin) tin.value = n.t;
    var cs = $("mmCols");
    if (cs) {
      cs.innerHTML = CC.map(function (c, i) { return '<button type="button" class="mm-c' + (i === n.c ? " on" : "") + '" data-c="' + i + '" style="background:' + c + '" aria-label="Colour"> </button>'; }).join("");
      Array.prototype.forEach.call(cs.querySelectorAll(".mm-c"), function (b) {
        b.onclick = function () { var nn = mmFind(MM.sel); if (nn) { nn.c = +b.getAttribute("data-c"); mmSave(); mmRender(); mmPanel(); } };
      });
    }
  }

  function mmExport() {
    var svg = $("mmSvg");
    if (!svg) return;
    var s = svg.outerHTML.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    var dl = function () {
      try {
        var a = document.createElement("a");
        a.download = "mindmap.png";
        a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        a.click();
      } catch (e) {}
    };
    try {
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement("canvas");
          c.width = 2560; c.height = 1600;
          var x = c.getContext("2d");
          x.fillStyle = "#fdf8ec"; x.fillRect(0, 0, 2560, 1600);
          x.drawImage(img, 0, 0, 2560, 1600);
          var a = document.createElement("a");
          a.download = "mindmap.png";
          a.href = c.toDataURL("image/png");
          a.click();
        } catch (e) { dl(); }
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
    } catch (e) { dl(); }
  }

  function mmOpen() {
    var ov = $("mmOv");
    if (ov) { ov.style.display = "flex"; return; }
    mmLoad();
    ov = document.createElement("div");
    ov.id = "mmOv";
    ov.className = "st-ov";
    ov.setAttribute("aria-label", "Mind Map Studio");
    ov.innerHTML =
      '<div class="st-box" role="dialog" aria-label="Mind Map Studio">' +
        '<div class="st-h">🧠 Mind Map Studio <button class="st-x" id="mmX" aria-label="Close">✕</button></div>' +
        '<div class="st-sub">Map any topic — drag nodes, click to edit, connect ideas</div>' +
        '<div class="mm-bar">' +
          '<button type="button" class="st-btn" id="mmAdd">➕ Add</button>' +
          '<button type="button" class="st-btn" id="mmLink">🔗 Connect</button>' +
          '<button type="button" class="st-btn" id="mmTplB">🕸 Template</button>' +
          '<button type="button" class="st-btn" id="mmExp">📤 Export PNG</button>' +
          '<button type="button" class="st-btn danger" id="mmDel">🗑 Delete</button>' +
          '<button type="button" class="st-btn danger" id="mmClear">🗑 Clear</button>' +
        "</div>" +
        '<div class="mm-wrap"><svg class="mm-svg" id="mmSvg" viewBox="0 0 1280 800" role="img" aria-label="Mind map canvas"></svg></div>' +
        '<div class="mm-hint" id="mmHint">Tip: click a node to edit · drag to move · 🔗 Connect then tap two nodes</div>' +
        '<div class="mm-panel off" id="mmPanel">' +
          '<div class="ph">Selected node</div>' +
          '<input class="mm-tin" id="mmTxt" maxlength="60" placeholder="Node label…" aria-label="Node label">' +
          '<div class="mm-cs" id="mmCols"></div>' +
        "</div>" +
      "</div>";
    document.body.appendChild(ov);
    $("mmX").onclick = function () { ov.remove(); };
    $("mmAdd").onclick = mmAdd;
    $("mmDel").onclick = mmDel;
    $("mmClear").onclick = mmClear;
    $("mmTplB").onclick = mmTpl;
    $("mmExp").onclick = mmExport;
    $("mmLink").onclick = function () {
      MM.conn = MM.conn ? 0 : 1; MM.connF = null;
      $("mmLink").classList.toggle("on", !!MM.conn);
      $("mmHint").textContent = MM.conn ? "Connect mode: tap the FIRST node, then the SECOND" : "Tip: click a node to edit · drag to move · 🔗 Connect then tap two nodes";
      mmRender();
    };
    $("mmTxt").addEventListener("input", function () {
      var n = mmFind(MM.sel);
      if (!n) return;
      n.t = $("mmTxt").value || "…";
      mmSave();
      var g = $("mmSvg").querySelector('[data-id="' + MM.sel + '"]');
      if (g) {
        var w = mmW(n.t);
        var rect = g.querySelector("rect"), txt = g.querySelector("text");
        if (rect) rect.setAttribute("width", w);
        if (txt) { txt.setAttribute("x", w / 2); txt.textContent = n.t; }
      }
    });
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    mmRender(); mmWire(); mmPanel();
  }

  /* ================= 📏 UNIT CONVERTER ================= */
  var CV = { cat: "temp" };
  function cvOpts(c) {
    var selF = $("cvFrom"), selT = $("cvTo");
    selF.innerHTML = c.u.map(function (u) { return '<option value="' + u[0] + '">' + u[0] + "</option>"; }).join("");
    selT.innerHTML = c.u.map(function (u, i) { return '<option value="' + u[0] + '"' + (i === Math.min(1, c.u.length - 1) ? " selected" : "") + ">" + u[0] + "</option>"; }).join("");
  }
  function cvFind(arr, key) { for (var i = 0; i < arr.length; i++) if (arr[i][0] === key) return arr[i]; return null; }
  function cvCat() { for (var i = 0; i < CATS.length; i++) if (CATS[i].k === CV.cat) return CATS[i]; return CATS[0]; }
  function cvConv() {
    var out = $("cvOut"), sub = $("cvSub"), note = $("cvNote");
    if (!out || !sub || !$("cvIn")) return;
    var c = cvCat();
    var f = cvFind(c.u, $("cvFrom").value) || c.u[0];
    var t = cvFind(c.u, $("cvTo").value) || c.u[0];
    var v = parseFloat($("cvIn").value);
    if (isNaN(v)) { out.textContent = "—"; sub.textContent = "enter a number"; return; }
    var base = (v + f[2]) * f[1];
    var res = base / t[1] - t[2];
    res = parseFloat(res.toPrecision(9));
    out.textContent = String(res);
    sub.textContent = t[0] + "  (from " + f[0] + ")";
    if (note) note.textContent = CV.cat === "temp" ? "Formula: base = (v + offset) × factor · C→F: ×9/5+32 · C→K: +273.15" : "1 " + f[0] + " = " + String(parseFloat((1 * f[1] / t[1]).toPrecision(7))) + " " + t[0];
  }
  function cvOpen() {
    var ov = $("cvOv");
    if (ov) { ov.style.display = "flex"; return; }
    ov = document.createElement("div");
    ov.id = "cvOv";
    ov.className = "st-ov";
    ov.setAttribute("aria-label", "Unit Converter");
    ov.innerHTML =
      '<div class="st-box" role="dialog" aria-label="Unit Converter">' +
        '<div class="st-h">📏 Unit & Rate Converter <button class="st-x" id="cvX" aria-label="Close">✕</button></div>' +
        '<div class="st-sub">Physics, chemistry and everyday conversions — instant</div>' +
        '<div class="cv-tabs" id="cvTabs">' + CATS.map(function (c) { return '<button type="button" class="st-btn" data-k="' + c.k + '">' + c.n + "</button>"; }).join("") + "</div>" +
        '<div class="cv-grid">' +
          '<select class="cv-sel" id="cvFrom" aria-label="From unit"></select>' +
          '<button type="button" class="cv-swap" id="cvSwap" aria-label="Swap units">⇄</button>' +
          '<select class="cv-sel" id="cvTo" aria-label="To unit"></select>' +
        "</div>" +
        '<input class="cv-in" id="cvIn" inputmode="decimal" placeholder="Enter value…" aria-label="Value">' +
        '<div class="cv-out" id="cvOut">—</div>' +
        '<div class="cv-sub" id="cvSub">choose value</div>' +
        '<div class="cv-note" id="cvNote"></div>' +
      "</div>";
    document.body.appendChild(ov);
    $("cvX").onclick = function () { ov.remove(); };
    Array.prototype.forEach.call($("cvTabs").querySelectorAll(".st-btn"), function (b) {
      b.onclick = function () {
        CV.cat = b.getAttribute("data-k");
        Array.prototype.forEach.call($("cvTabs").querySelectorAll(".st-btn"), function (x) { x.classList.toggle("on", x === b); });
        cvOpenCat();
      };
    });
    $("cvSwap").onclick = function () {
      var f = $("cvFrom").value, t = $("cvTo").value;
      $("cvFrom").value = t; $("cvTo").value = f;
      cvConv();
    };
    $("cvIn").addEventListener("input", cvConv);
    cvOpenCat();
  }
  function cvOpenCat() {
    cvOpts(cvCat());
    cvConv();
  }

  /* ================= 🎨 THEME STUDIO ================= */
  function applyAcc(k) {
    var html = document.documentElement;
    try { ACC.forEach(function (a) { html.classList.remove("st-acc-" + a.k); }); } catch (e) {}
    if (k) { try { html.classList.add("st-acc-" + k); } catch (e) {} }
    lss(AK, k);
    var ov = $("tsOv");
    if (ov) Array.prototype.forEach.call(ov.querySelectorAll(".ts-ac"), function (b) {
      b.classList.toggle("on", (b.getAttribute("data-k") || "") === (k || ""));
    });
  }
  function tsOpen() {
    var ov = $("tsOv");
    if (ov) { ov.style.display = "flex"; return; }
    var cur = ls(AK, "");
    ov = document.createElement("div");
    ov.id = "tsOv";
    ov.className = "st-ov";
    ov.setAttribute("aria-label", "Theme Studio");
    ov.innerHTML =
      '<div class="st-box" role="dialog" aria-label="Theme Studio">' +
        '<div class="st-h">🎨 Theme Studio <button class="st-x" id="tsX" aria-label="Close">✕</button></div>' +
        '<div class="st-sub">Pick an accent — it re-colours buttons, bars, chips, rings and the heatmap</div>' +
        '<div class="ts-chips">' + ACC.map(function (a) {
          return '<button type="button" class="ts-ac' + ((a.k || "") === (cur || "") ? " on" : "") + '" data-k="' + a.k + '"><span class="ts-sw" style="background:linear-gradient(135deg,' + a.c[0] + "," + a.c[1] + " 55%," + a.c[2] + ')"></span>' + esc(a.n) + "</button>";
        }).join("") + "</div>" +
        '<div class="ts-note">Saved automatically · Default restores the Aurum gold look</div>' +
      "</div>";
    document.body.appendChild(ov);
    $("tsX").onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll(".ts-ac"), function (b) {
      b.onclick = function () { applyAcc(b.getAttribute("data-k") || ""); };
    });
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
  }

  /* ================= 🌅 DAILY SPARK ================= */
  function spark() {
    if ($("spkWrap")) return;
    var w = document.getElementById("examChip");
    var host = w ? null : document.querySelector(".hero-copy");
    if (!w && !host) return;
    var d = new Date();
    var i = (d.getDate() + d.getMonth() * 3 + d.getFullYear()) % WORDS.length;
    var wd = WORDS[i], qd = QUOTES[i % QUOTES.length];
    var wrap = document.createElement("div");
    wrap.id = "spkWrap";
    wrap.className = "spk";
    wrap.innerHTML =
      '<div class="ex-tile" id="spkWord">📖 <b>Word of the day — ' + esc(wd.w) + "</b> <i style='opacity:.8'>(" + esc(wd.p) + ")</i><br><span style='font-size:.72rem;opacity:.85'>" + esc(wd.d) + "</span><small>“" + esc(wd.x) + "”</small></div>" +
      '<div class="ex-tile" id="spkQuote">✍️ <b>Quote of the day</b><br><span style="font-size:.8rem;opacity:.9">“' + esc(qd.q) + '”</span><small>— ' + esc(qd.a) + "</small></div>";
    if (w) w.insertBefore(wrap, w.lastChild);
    else {
      var box = document.createElement("div");
      box.id = "spkBox";
      box.appendChild(wrap);
      host.insertBefore(box, host.querySelector(".stats"));
    }
  }

  /* ================= ☄️ COMETS ================= */
  function comets() {
    var fx = document.getElementById("heroFx");
    if (!fx || fx.querySelector(".comet")) return;
    for (var i = 1; i <= 3; i++) {
      var c = document.createElement("i");
      c.className = "comet c" + i;
      c.setAttribute("aria-hidden", "true");
      fx.appendChild(c);
    }
  }

  /* ================= 🧩 CHIPS + ⌨️ PALETTE ================= */
  function chips() {
    var w = document.getElementById("examChip");
    var host = w ? null : document.querySelector(".hero-copy");
    if (!w && !host) return;
    function mk(id, emo, t, sub, fn) {
      var b = document.createElement("button");
      b.type = "button"; b.id = id;
      b.className = "ex-tile bt-chip";
      b.innerHTML = emo + " <span>" + t + "<small>" + sub + "</small></span>";
      b.addEventListener("click", fn);
      return b;
    }
    var grp = document.createElement("div");
    grp.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
    grp.appendChild(mk("stMind", "🧠", "Mind Map", "Visualise any topic", function () { mmOpen(); }));
    grp.appendChild(mk("stConv", "📏", "Converter", "Units & rates, instant", function () { cvOpen(); }));
    grp.appendChild(mk("stTheme", "🎨", "Theme Studio", "Recolour the whole app", function () { tsOpen(); }));
    if (w) w.insertBefore(grp, w.lastChild);
    else {
      var box = document.createElement("div");
      box.id = "stChips";
      box.appendChild(grp);
      host.insertBefore(box, host.querySelector(".stats"));
    }
  }
  function hooks() {
    var h = function (add) {
      add("Tools", "🧠", "Mind Map Studio", "Draw and connect ideas visually", function () { mmOpen(); });
      add("Tools", "📏", "Unit Converter", "Temperature, length, mass, pressure…", function () { cvOpen(); });
      add("Tools", "🎨", "Theme Studio", "Change the app accent colour", function () { tsOpen(); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  /* ---------- boot ---------- */
  function boot() {
    css();
    try { document.documentElement.classList.add("studio"); } catch (e) {}
    try { var a = ls(AK, ""); if (a) document.documentElement.classList.add("st-acc-" + a); } catch (e) {}
    try { chips(); } catch (e) {}
    try { comets(); } catch (e) {}
    try { spark(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        ["mmOv", "cvOv", "tsOv"].forEach(function (id) { var o = $(id); if (o) o.remove(); });
      });
    } catch (e) {}
    window.__stCl = { mm: MM, cv: CV };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
