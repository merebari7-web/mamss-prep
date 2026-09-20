/* v28.0 — Apex HQ (lazy, boot-safe, loaded by pro.js at idle).
   Adds: 🏆 Trophy Room (showcase gallery for every achievement in the app —
   unlocked dates + live progress toward each), 🗓️ Exam Sprint Plan (a
   day-by-day revision plan generated from your target exam + weakest
   subjects, with checkable days, print export), a 🏆 Apex pill in the home
   dock, and Command-Palette entries. Uses only existing global data
   (attempts, streakDays, store, cdGet) — additive, fails silent. */
(function () {
  "use strict";
  if (window.__apex) return;
  window.__apex = 1;

  var K = "nssc_apex";
  var EXAMS = [
    { n: "WAEC SSCE", d: [2027, 4, 10] },
    { n: "NECO SSCE", d: [2027, 5, 17] },
    { n: "JAMB UTME", d: [2027, 3, 22] }
  ];
  var ACTS = [
    "🃏 Rapid Fire · 20 questions",
    "📝 Practice paper · 10 questions",
    "🃏 Flashcards · 2 decks",
    "🎯 Term Match · 10 rounds",
    "🧠 Mistake drill · 10 questions",
    "✍️ Theory Hall · 1 essay",
    "🧘 Zen · 25 min then review"
  ];

  var CSS =
    "html.aura .apex-ov{position:fixed;inset:0;z-index:133;background:rgba(8,10,20,.5);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;justify-content:center;padding:8vh 14px 20px;overflow:auto}" +
    "html.aura .apex-box{width:min(780px,100%);height:fit-content;max-height:84dvh;display:flex;flex-direction:column;border-radius:20px;background:var(--card-solid,#fffdf7);border:1px solid rgba(220,184,95,.5);box-shadow:0 44px 110px -34px rgba(0,0,0,.75);overflow:hidden;position:relative}" +
    "html.aura .apex-box .x{position:absolute;top:12px;right:12px;z-index:3}" +
    "html.aura .apex-tabs{display:flex;gap:8px;padding:14px 16px 0;flex-wrap:wrap}" +
    "html.aura .apex-tab{border:1px solid var(--card-border,#ddd2b8);background:transparent;color:var(--ink,#20302a);font-family:inherit;font-weight:800;font-size:.86rem;padding:9px 16px;border-radius:999px;cursor:pointer;transition:all .22s}" +
    "html.aura .apex-tab:hover{border-color:rgba(200,160,70,.6)}" +
    "html.aura .apex-tab.on{background:linear-gradient(135deg,#e9c76d,#c9a227);color:#241a06;border-color:transparent;box-shadow:0 10px 26px -12px rgba(180,140,50,.7)}" +
    "html.aura .apex-body{padding:16px;overflow-y:auto}" +
    "html.aura .apex-head{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}" +
    "html.aura .apex-head h3{margin:0;font-size:1.05rem;color:var(--ink,#20302a)}" +
    "html.aura .apex-head small{color:var(--mut,#8a7a5c)}" +
    "html.aura .apex-bar{flex:1;min-width:120px;height:9px;border-radius:99px;background:var(--bar-track,#eee2c8);overflow:hidden;border:1px solid rgba(200,160,70,.25)}" +
    "html.aura .apex-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#e9c76d,#c9a227);box-shadow:0 0 12px rgba(220,184,95,.55);transition:width .6s cubic-bezier(.2,.7,.3,1)}" +
    "html.aura .tro-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
    "@media (max-width:560px){html.aura .tro-grid{grid-template-columns:1fr}}" +
    "html.aura .tro-card{position:relative;border-radius:14px;padding:13px;border:1px solid var(--card-border,#ddd2b8);background:var(--bar-track,#f8f2e2);overflow:hidden}" +
    "html.aura .tro-card.on{background:linear-gradient(160deg,#fff8e4,#f3e2b6);border-color:rgba(200,160,70,.65);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),0 14px 30px -18px rgba(170,130,40,.55)}" +
    "html.aura .tro-card.on::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.5) 46%,transparent 60%);animation:apexSheen 3.4s ease-in-out infinite;pointer-events:none}" +
    "@keyframes apexSheen{0%,62%{transform:translateX(-120%)}100%{transform:translateX(130%)}}" +
    "html.aura .tro-ic{font-size:1.55rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(120,90,20,.35))}" +
    "html.aura .tro-nm{font-weight:900;font-size:.82rem;color:var(--ink,#20302a);margin:7px 0 2px}" +
    "html.aura .tro-ds{font-size:.7rem;color:var(--mut,#8a7a5c);line-height:1.35;min-height:2.4em}" +
    "html.aura .tro-st{margin-top:8px;font-size:.66rem;font-weight:800;letter-spacing:.03em;color:#8a5f24}" +
    "html.aura .tro-card.off{opacity:.62;filter:saturate(.35)}" +
    "html.aura .tro-card.off .tro-ic{filter:grayscale(.9)}" +
    "html.aura .tro-card.off .tro-st{color:var(--mut,#8a7a5c)}" +
    "html.aura .tro-pb{margin-top:6px;height:5px;border-radius:99px;background:rgba(160,130,60,.22);overflow:hidden}" +
    "html.aura .tro-pb i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#e9c76d,#b8912f)}" +
    "html.aura .apex-note{display:flex;gap:10px;align-items:center;background:rgba(220,184,95,.1);border:1px dashed rgba(200,160,70,.45);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:.78rem;color:var(--ink,#20302a)}" +
    "html.aura .apex-note button{flex:none}" +
    "html.aura .pl-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;border:1px solid var(--card-border,#ddd2b8);background:var(--bar-track,#f8f2e2);margin-bottom:8px;transition:all .2s}" +
    "html.aura .pl-row:hover{border-color:rgba(200,160,70,.55);transform:translateX(2px)}" +
    "html.aura .pl-chk{flex:none;width:26px;height:26px;border-radius:50%;border:2px solid rgba(180,140,50,.55);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:transparent;font-size:.8rem;transition:all .2s}" +
    "html.aura .pl-row.done .pl-chk{background:linear-gradient(135deg,#e9c76d,#c9a227);border-color:transparent;color:#241a06}" +
    "html.aura .pl-day{flex:none;width:74px;font-size:.68rem;font-weight:900;letter-spacing:.02em;color:#8a5f24}" +
    "html.aura .pl-tx{flex:1;min-width:0}" +
    "html.aura .pl-tx b{display:block;font-size:.85rem;color:var(--ink,#20302a)}" +
    "html.aura .pl-tx span{font-size:.72rem;color:var(--mut,#8a7a5c)}" +
    "html.aura .pl-row.done .pl-tx b{text-decoration:line-through;opacity:.65}" +
    "html.aura .pl-go{flex:none;border:1px solid rgba(180,140,50,.55);border-radius:9px;background:rgba(255,255,255,.4);color:#8a5f24;font-family:inherit;font-weight:800;font-size:.72rem;padding:7px 12px;cursor:pointer;transition:all .2s}" +
    "html.aura .pl-go:hover{background:linear-gradient(135deg,#e9c76d,#c9a227);color:#241a06}" +
    "html.aura .pl-tools{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px}" +
    "html.aura .apex-hd{position:relative}" +
    "html.aura .apex-hd.on{box-shadow:inset 0 0 0 1px rgba(220,184,95,.6),0 8px 22px -12px rgba(220,184,95,.7)}" +
    "html.aura .apex-hd .ap-dot{position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:#e9c76d;box-shadow:0 0 8px #e9c76d}" +
    "html.aura .apex-empty{text-align:center;padding:34px 10px;color:var(--mut,#8a7a5c);font-size:.85rem}" +
    "@media print{html.aura.apex-print body>*:not(#apexOv){display:none!important}html.aura.apex-print #apexOv{position:static;padding:0;background:#fff}html.aura.apex-print .apex-box{box-shadow:none;border:0;max-height:none;height:auto;border-radius:0}html.aura.apex-print .apex-box .x,html.aura.apex-print .pl-go,html.aura.apex-print .apex-tabs{display:none!important}html.aura.apex-print .pl-row{break-inside:avoid}}";

  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function atts() { try { if (typeof attempts === "function") return attempts() || []; } catch (e) {} return []; }
  function streak() { try { if (typeof streakDays === "function") return streakDays() || 0; } catch (e) {} return 0; }
  function badges() { try { if (typeof store === "object" && store.get) return store.get("nssc_badges", {}) || {}; } catch (e) {} return ls("nssc_badges", {}); }
  function dstr(t) { return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); }
  function todayStr() { return dstr(new Date()); }

  /* live progress per badge — mirror of the app's own rules */
  function progFor(id) {
    var a = atts(), st = streak(), out = { t: "", p: 0 };
    var i, cor = 0, subj = {}, todayN = 0, maxP = 0;
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    for (i = 0; i < a.length; i++) {
      var x = a[i] || {};
      cor += (+x.correct || 0);
      if (x.subj && x.subj !== "All subjects") subj[x.subj] = 1;
      maxP = Math.max(maxP, +x.pct || 0);
      if (x.tms && new Date(x.tms) >= t0) todayN++;
    }
    var sc = Object.keys(subj).length;
    if (id === "first") { out.t = Math.min(a.length, 1) + "/1"; out.p = Math.min(a.length, 1); }
    else if (id === "perfect") { out.t = maxP + "%"; out.p = maxP / 100; }
    else if (id === "hat") { out.t = todayN + "/3 today"; out.p = Math.min(todayN / 3, 1); }
    else if (id === "streak3") { out.t = Math.min(st, 3) + "/3"; out.p = Math.min(st / 3, 1); }
    else if (id === "flame7") { out.t = Math.min(st, 7) + "/7"; out.p = Math.min(st / 7, 1); }
    else if (id === "cent") { out.t = Math.min(cor, 200) + "/200"; out.p = Math.min(cor / 200, 1); }
    else if (id === "scholar") { out.t = sc + "/10"; out.p = sc / 10; }
    else if (id === "revise") { var rt = 0; try { rt = +store.get("nssc_revtotal", 0) || 0; } catch (e) { rt = +ls("nssc_revtotal", 0) || 0; } out.t = Math.min(rt, 20) + "/20"; out.p = Math.min(rt / 20, 1); }
    return out;
  }

  var TROPHIES = [
    { id: "first", i: "🎓", l: "First paper", d: "Complete any paper" },
    { id: "perfect", i: "💯", l: "Perfect score", d: "Score 100% on a paper" },
    { id: "hat", i: "🎩", l: "Hat-trick", d: "3 papers in one day" },
    { id: "streak3", i: "🔥", l: "Three-day scholar", d: "Practice 3 days in a row" },
    { id: "flame7", i: "🔥", l: "Week of fire", d: "Study 7 days in a row" },
    { id: "cent", i: "🏛", l: "Centurion", d: "200 correct answers in total" },
    { id: "scholar", i: "🌍", l: "All-rounder", d: "Sit papers in 10 subjects" },
    { id: "exam", i: "🎯", l: "Examination graduate", d: "Finish a timed paper" },
    { id: "cert", i: "🏅", l: "Certificate earner", d: "Download your first certificate" },
    { id: "book", i: "📚", l: "Bibliophile", d: "Bookmark 10 questions" },
    { id: "revise", i: "🧠", l: "Memory keeper", d: "Re-learn 20 mistakes" },
    { id: "daily3", i: "📅", l: "Daily devotee", d: "Finish 3 daily challenges" },
    { id: "century", i: "🏃", l: "Century runner", d: "Finish a 100-question Century run" }
  ];

  /* ---------- overlay ---------- */
  var ov = null, tab = "trophies";

  function ensureOv() {
    if (ov && document.body.contains(ov)) return ov;
    ov = document.createElement("div");
    ov.className = "apex-ov";
    ov.id = "apexOv";
    ov.innerHTML =
      '<div class="modal apex-box" role="dialog" aria-modal="true" aria-label="Apex HQ">' +
      '<button class="x icon-btn" id="apexX" type="button" aria-label="Close">✕</button>' +
      '<div class="apex-tabs" role="tablist">' +
      '<button class="apex-tab" data-t="trophies" type="button">🏆 Trophy Room</button>' +
      '<button class="apex-tab" data-t="plan" type="button">🗓 Exam Sprint Plan</button>' +
      "</div>" +
      '<div class="apex-body" id="apexBody"></div>' +
      "</div>";
    ov.addEventListener("click", function (e) { if (e.target === ov) closeApex(); });
    var x = ov.querySelector("#apexX");
    if (x) x.addEventListener("click", closeApex);
    Array.prototype.forEach.call(ov.querySelectorAll(".apex-tab"), function (b) {
      b.addEventListener("click", function () { openApex(b.getAttribute("data-t")); });
    });
    document.body.appendChild(ov);
    return ov;
  }

  function auraCss() {
    if (!document.getElementById("auraCss")) {
      var st = document.createElement("style");
      st.id = "auraCss";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  }

  function openApex(t) {
    try { document.documentElement.classList.add("aura"); } catch (e) {}
    try { auraCss(); } catch (e) {}
    if (t === "trophies" || t === "plan") tab = t;
    ensureOv();
    try { if (tab === "trophies" && typeof checkBadges === "function") checkBadges(); } catch (e) {}
    render();
    ov.classList.remove("hidden");
    var b = document.getElementById("apexBtn");
    if (b) b.classList.add("on");
  }
  function closeApex() {
    if (ov) ov.classList.add("hidden");
    var b = document.getElementById("apexBtn");
    if (b) b.classList.remove("on");
  }

  function render() {
    var body = document.getElementById("apexBody");
    if (!body) return;
    Array.prototype.forEach.call(ov.querySelectorAll(".apex-tab"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-t") === tab);
    });
    body.innerHTML = tab === "trophies" ? trophiesHtml() : planHtml();
    if (tab === "plan") bindPlan(body);
  }

  /* ---------- trophies ---------- */
  function trophiesHtml() {
    var got = badges(), n = 0, i;
    for (i = 0; i < TROPHIES.length; i++) if (got[TROPHIES[i].id]) n++;
    var pct = Math.round(n / TROPHIES.length * 100);
    var h = '<div class="apex-head"><h3>🏆 Trophy Room</h3>' +
      '<div class="apex-bar"><i style="width:' + pct + '%"></i></div>' +
      "<small>" + n + " of " + TROPHIES.length + " unlocked · " + pct + "%</small></div>" +
      '<div class="tro-grid">';
    for (i = 0; i < TROPHIES.length; i++) {
      var t = TROPHIES[i], un = got[t.id], pg = progFor(t.id);
      h += '<div class="tro-card ' + (un ? "on" : "off") + '">' +
        '<div class="tro-ic">' + t.i + "</div>" +
        '<div class="tro-nm">' + t.l + "</div>" +
        '<div class="tro-ds">' + t.d + "</div>" +
        (un
          ? '<div class="tro-st">✓ Unlocked · ' + String(un).slice(0, 10) + "</div>"
          : '<div class="tro-st">' + (pg.t ? (pg.t + " · ") : "") + "Locked</div>") +
        (!un && pg.p > 0 ? '<div class="tro-pb"><i style="width:' + Math.round(Math.min(pg.p, 1) * 100) + '%"></i></div>' : "") +
        "</div>";
    }
    h += "</div>";
    return h;
  }

  /* ---------- sprint plan ---------- */
  function examInfo() {
    var e = null;
    try { if (typeof cdGet === "function") e = cdGet(); } catch (err) {}
    if (e && e.d) { var d = daysTo(e.d); if (d != null) return { label: e.label || "Your exam", days: Math.max(0, d) }; }
    var best = null, now = new Date(); now.setHours(0, 0, 0, 0);
    for (var i = 0; i < EXAMS.length; i++) {
      var x = EXAMS[i];
      var dt = new Date(x.d[0], x.d[1] - 1, x.d[2]); dt.setHours(0, 0, 0, 0);
      var diff = Math.round((dt - now) / 864e5);
      if (diff >= 0 && (best === null || diff < best.days)) best = { label: x.n, days: diff };
    }
    if (best) return best;
    return { label: "Your exam", days: 21 };
  }
  function daysTo(d) {
    try {
      var dt = new Date(d + "T00:00:00");
      if (isNaN(dt.getTime())) return null;
      var now = new Date(); now.setHours(0, 0, 0, 0);
      return Math.round((dt - now) / 864e5);
    } catch (e) { return null; }
  }

  function planData() {
    var st = ls(K, null);
    if (st && st.plan && st.plan.gen === todayStr()) return st.plan;
    var info = examInfo();
    var plan = { gen: todayStr(), exam: info.label, days: Math.min(21, Math.max(3, info.days)), items: [] };
    var a = atts(), per = {}, i;
    for (i = 0; i < a.length; i++) {
      var x = a[i] || {};
      if (!x.subj || x.subj === "All subjects") continue;
      per[x.subj] = per[x.subj] || { n: 0, c: 0 };
      per[x.subj].n++; per[x.subj].c += (+x.correct || 0);
    }
    var pool = [], seen = {};
    Object.keys(per).forEach(function (s) {
      var p = per[s];
      var avg = Math.round(p.c / p.n * 100);
      var w = 10 + (100 - avg) + Math.min(p.n, 5) * 2;   // weak + practised subjects rise
      pool.push({ s: s, w: w }); seen[s] = 1;
    });
    try {
      if (typeof CLASSES !== "undefined" && CLASSES) {
        for (i = 0; i < CLASSES.length && pool.length < 6; i++) {
          var s2 = CLASSES[i] && CLASSES[i].s;
          if (s2 && !seen[s2]) { pool.push({ s: s2, w: 45 }); seen[s2] = 1; }
        }
      }
    } catch (e) {}
    pool.sort(function (x, y) { return y.w - x.w; });
    pool = pool.slice(0, 6);
    var exp = [];
    pool.forEach(function (p) { for (var j = 0; j < Math.max(1, Math.round(p.w / 12)); j++) exp.push(p.s); });
    if (!exp.length) exp = ["Mathematics", "English Studies"];
    var now = new Date();
    for (i = 0; i < plan.days; i++) {
      var d = new Date(now.getTime() + i * 864e5);
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
      plan.items.push({
        d: wd + " " + d.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()],
        focus: exp[i % exp.length],
        act: ACTS[i % ACTS.length],
        done: false
      });
    }
    lss(K, { plan: plan });
    return plan;
  }

  function planHtml() {
    var plan = planData();
    var done = 0, i;
    for (i = 0; i < plan.items.length; i++) if (plan.items[i].done) done++;
    var pct = Math.round(done / plan.items.length * 100);
    var h = '<div class="apex-head"><h3>🗓 Exam Sprint Plan</h3>' +
      '<div class="apex-bar"><i style="width:' + pct + '%"></i></div>' +
      "<small>" + done + "/" + plan.items.length + " sessions · " + pct + "%</small></div>";
    h += '<div class="pl-tools">' +
      '<button class="btn btn-sm" id="plRegen" type="button">🔄 Regenerate</button>' +
      '<button class="btn btn-sm" id="plPrint" type="button">🖨 Print</button>' +
      '<button class="btn btn-sm" id="plExam" type="button">📅 Set exam</button>' +
      "</div>";
    if (plan.days >= 21) {
      h += '<div class="apex-note">⏳ <span>Your exam is more than 3 weeks away — this is the <b>first 3 weeks</b> of the sprint.</span></div>';
    }
    h += '<div class="apex-note">🎯 <span>Target: <b>' + plan.exam + "</b> · the plan leads with your <b>weakest subjects</b> and rotates question types like a real revision timetable.</span>" +
      "<button class='btn btn-sm' id='plToday' type='button'>▶ Start today</button></div>";
    for (i = 0; i < plan.items.length; i++) {
      var it = plan.items[i];
      h += '<div class="pl-row' + (it.done ? " done" : "") + '" data-i="' + i + '">' +
        '<button class="pl-chk" type="button" aria-label="Mark done">✓</button>' +
        '<span class="pl-day">' + it.d + "</span>" +
        '<span class="pl-tx"><b>' + it.focus + "</b><span>" + it.act + "</span></span>" +
        '<button class="pl-go" type="button">Start</button></div>';
    }
    return h;
  }

  function bindPlan(body) {
    var i;
    var reg = document.getElementById("plRegen");
    if (reg) reg.addEventListener("click", function () {
      try { localStorage.removeItem(K); } catch (e) {}
      render();
    });
    var pr = document.getElementById("plPrint");
    if (pr) pr.addEventListener("click", function () {
      try { document.documentElement.classList.add("apex-print"); } catch (e) {}
      var after = function () { try { document.documentElement.classList.remove("apex-print"); } catch (e) {} };
      try { window.addEventListener("afterprint", after, { once: true }); } catch (e) {}
      setTimeout(function () { try { window.print(); } catch (e) {} setTimeout(after, 900); }, 60);
    });
    var px = document.getElementById("plExam");
    if (px) px.addEventListener("click", function () {
      closeApex();
      try { if (typeof cdOpen === "function") cdOpen(); } catch (e) {}
    });
    var pt = document.getElementById("plToday");
    if (pt) pt.addEventListener("click", function () {
      closeApex();
      var b = document.querySelector('.hd-btn[data-hd="practice"]');
      if (b) b.click();
    });
    var rows = body.querySelectorAll(".pl-row");
    for (i = 0; i < rows.length; i++) {
      (function (row) {
        var idx = +(row.getAttribute("data-i") || 0);
        var chk = row.querySelector(".pl-chk");
        var go = row.querySelector(".pl-go");
        if (chk) chk.addEventListener("click", function () {
          var st = ls(K, null);
          if (st && st.plan && st.plan.items && st.plan.items[idx]) {
            st.plan.items[idx].done = !st.plan.items[idx].done;
            lss(K, st);
            render();
          }
        });
        if (go) go.addEventListener("click", function () { startAct(idx); });
      })(rows[i]);
    }
  }

  function startAct(idx) {
    var st = ls(K, null);
    var act = st && st.plan && st.plan.items && st.plan.items[idx] ? st.plan.items[idx].act : "";
    closeApex();
    var m = document.querySelector('.hd-btn[data-hd="practice"]');
    try {
      if (/Rapid/.test(act) && typeof rapStart === "function") { rapStart(); return; }
      if (/Mistake drill/.test(act) && typeof drillMistakes === "function") { drillMistakes(); return; }
      if (/Zen/.test(act) && typeof zenOpen === "function") { zenOpen(); return; }
      if (/Practice paper/.test(act)) { if (m) m.click(); return; }
      if (/Flashcards|Term Match|Essay/.test(act)) {
        var arc = document.getElementById("arcLaunch");
        if (arc) arc.click();
        try { toast(act + " — pick it in the Arcade", "🎮"); } catch (e) {}
        return;
      }
      if (m) m.click();
    } catch (e) {
      var arc2 = document.getElementById("arcLaunch");
      if (arc2) arc2.click();
    }
  }

  /* ---------- dock pill + palette ---------- */
  function dock() {
    var d = document.getElementById("homeDock");
    if (!d || document.getElementById("apexBtn")) return;
    var b = document.createElement("button");
    b.id = "apexBtn";
    b.className = "hd-btn apex-hd";
    b.type = "button";
    b.title = "Apex HQ — trophies and exam sprint plan";
    b.innerHTML = "🏆<span>Apex</span>";
    b.addEventListener("click", function () { openApex(); });
    d.appendChild(b);
  }

  function boot() {
    try { document.documentElement.classList.add("aura"); } catch (e) {}
    try { dock(); } catch (e) {}
    try {
      /* lazy palette registry: pro.js reads __palActions each time the palette builds */
      var PA = window.__palActions = window.__palActions || [];
      PA.push(["Tools", "🏆", "Apex HQ", "Trophies + exam sprint plan", function () { openApex(); }]);
      PA.push(["Tools", "🗓", "Exam Sprint Plan", "Day-by-day revision plan", function () { openApex("plan"); }]);
    } catch (e) {}
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeApex();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
