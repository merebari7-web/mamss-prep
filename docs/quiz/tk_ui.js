/* v30.0 — Scholar Toolkit (lazy, boot-safe, loaded by polish.js at idle).
   Adds: 🧪 Periodic Table Explorer (all 118 elements, coloured by category,
   search, detail cards, "Element Detective" quiz), 📐 Formula Vault
   (searchable WAEC/NECO/JAMB formula library for Maths, Physics, Chemistry
   with bookmarks + copy), 📈 gold scroll-progress bar, 🎞️ modal entrance
   animation for every overlay, and a quiz-option reveal stagger.
   Uses only embedded data — additive, fails silent. */
(function () {
  "use strict";
  if (window.__tk) return;
  window.__tk = 1;

  var CATS = [["alkali", "Alkali metal"], ["alkaline", "Alkaline earth"], ["trans", "Transition metal"], ["post", "Post-transition"], ["metalloid", "Metalloid"], ["nonmetal", "Non-metal"], ["halogen", "Halogen"], ["noble", "Noble gas"], ["lanth", "Lanthanide"], ["actin", "Actinide"]];
  var VB = "nssc_vault_bm";
  var CHEMQ = 8;

  function $(id) { return document.getElementById(id); }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var CSS =
    "html.tk .tk-ov{position:fixed;inset:0;z-index:127;background:rgba(8,10,20,.5);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.tk .tk-box{width:min(600px,100%);max-height:92dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.5);box-shadow:0 40px 90px -30px rgba(0,0,0,.75);padding:16px;color:var(--ink,#20302a)}" +
    "html.tk .tk-h{display:flex;align-items:center;gap:8px;font-size:1.02rem;font-weight:800;margin-bottom:4px}" +
    "html.tk .tk-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.tk .tk-x:hover{background:rgba(0,0,0,.06)}" +
    "html.tk .tk-sub{font-size:.72rem;color:var(--mut,#8a7a5c);margin-bottom:10px}" +
    "html.tk .tk-in{width:100%;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:9px 12px;font-size:.9rem;color:var(--ink,#20302a);font-family:inherit;margin-bottom:10px;outline:none}" +
    "html.tk .tk-in:focus{border-color:#c9a25f;box-shadow:0 0 0 3px rgba(201,162,39,.25)}" +
    "html.tk .tk-leg{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}" +
    "html.tk .tk-leg span{font-size:.58rem;font-weight:700;padding:3px 7px;border-radius:99px;color:#3a2f18}" +
    "html.tk .tk-el-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:5px;max-height:44dvh;overflow:auto;padding:2px}" +
    "html.tk .tk-el{border:1px solid rgba(60,45,20,.14);border-radius:9px;padding:4px 2px 3px;text-align:center;cursor:pointer;font-family:inherit;transition:transform .14s,box-shadow .14s;background:#fff}" +
    "html.tk .tk-el:hover{transform:translateY(-2px) scale(1.06);box-shadow:0 8px 16px -8px rgba(60,45,20,.5)}" +
    "html.tk .tk-el b{display:block;font-size:.72rem;color:#1b2a4a}" +
    "html.tk .tk-el i{display:block;font-style:normal;font-size:.52rem;color:#7c7f6d}" +
    "html.tk .c0{background:#f6c6c6}.tk .c1{background:#faddb0}.tk .c2{background:#c9e2f6}.tk .c3{background:#d7d3f2}.tk .c4{background:#bfe8da}.tk .c5{background:#d2f0cd}.tk .c6{background:#f7e6a9}.tk .c7{background:#f5cef2}.tk .c8{background:#e6d6f4}.tk .c9{background:#f6d6cc}" +
    "html.tk .tk-det{text-align:center;padding:14px 4px 4px}" +
    "html.tk .tk-sym{font-size:3rem;font-weight:900;line-height:1.05;display:inline-block;border-radius:16px;padding:8px 22px;border:1px solid rgba(60,45,20,.15)}" +
    "html.tk .tk-name{font-size:1.15rem;font-weight:800;margin:8px 0 2px}" +
    "html.tk .tk-facts{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0}" +
    "html.tk .tk-facts span{font-size:.66rem;background:var(--panel,#f5efdf);border-radius:99px;padding:5px 10px;font-weight:600}" +
    "html.tk .tk-q{font-size:1.05rem;font-weight:800;text-align:center;margin:8px 0 12px}" +
    "html.tk .tk-qopt{display:block;width:100%;text-align:left;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:11px 14px;font-size:.9rem;font-weight:700;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;margin-bottom:8px;transition:transform .12s,background .12s}" +
    "html.tk .tk-qopt:hover{background:var(--opt-hover,rgba(201,162,39,.12))}" +
    "html.tk .tk-qopt:active{transform:scale(.98)}" +
    "html.tk .tk-score{text-align:center;font-size:.8rem;color:var(--mut,#8a7a5c);margin-bottom:8px}" +
    "html.tk .tk-btn{border:1px solid var(--card-border,#cbb386);background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;font-weight:800;border-radius:999px;padding:8px 16px;font-size:.78rem;cursor:pointer;font-family:inherit}" +
    "html.tk .tk-btn.alt{background:transparent;color:var(--ink,#20302a)}" +
    "html.tk .tk-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px}" +
    "html.tk .tk-vtab{border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:99px;padding:6px 14px;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.tk .tk-vtab.on{background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;border-color:transparent}" +
    "html.tk .tk-vtabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}" +
    "html.tk .tk-vcat{font-size:.62rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--mut,#8a7a5c);margin:12px 2px 6px}" +
    "html.tk .tk-vrow{border:1px solid var(--card-border,#e2d5b8);background:var(--opt-bg,#fdf8ec);border-radius:13px;padding:10px 12px;margin-bottom:7px}" +
    "html.tk .tk-vrow .n{font-size:.82rem;font-weight:800}" +
    "html.tk .tk-vrow .f{font-family:Georgia,'Times New Roman',serif;font-size:.98rem;color:#8a5f24;margin:3px 0 2px}" +
    "html.tk .tk-vrow .nt{font-size:.64rem;color:var(--mut,#8a7a5c)}" +
    "html.tk .tk-st{float:right;border:0;background:transparent;font-size:1rem;cursor:pointer;color:#c6b98f;padding:2px 4px}" +
    "html.tk .tk-st.on{color:#c9a25f}" +
    "html.tk .tk-cp{float:right;border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:8px;font-size:.66rem;font-weight:700;color:var(--ink-2,#4a5877);cursor:pointer;padding:3px 8px;margin-left:6px;font-family:inherit}" +
    "html.tk .tk-empty{text-align:center;color:var(--mut,#8a7a5c);font-size:.78rem;padding:16px 0}" +
    "html.tk .tk-bar{position:fixed;top:0;left:0;height:3px;width:0;z-index:150;background:linear-gradient(90deg,#eccf8e,#c9a25f 60%,#9c742c);border-radius:0 3px 3px 0;pointer-events:none}" +
    "html.tk .tk-note{font-size:.64rem;color:var(--mut,#8a7a5c);text-align:center;margin-top:8px}" +
    "@media (prefers-reduced-motion:no-preference){html.tk .overlay{animation:tkio .26s ease both}html.tk .opts .opt{animation:tkopt .32s ease both}html.tk .opts .opt:nth-child(2){animation-delay:.05s}html.tk .opts .opt:nth-child(3){animation-delay:.1s}html.tk .opts .opt:nth-child(4){animation-delay:.15s}html.tk .opts .opt:nth-child(5){animation-delay:.2s}html.tk .opts .opt:nth-child(6){animation-delay:.25s}}" +
    "@keyframes tkio{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}" +
    "@keyframes tkopt{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}";

  function css() { if (!document.getElementById("tkCss")) { var s = document.createElement("style"); s.id = "tkCss"; s.textContent = CSS; document.head.appendChild(s); } }
  function catIdx(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return i; return 5; }
  function catName(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return CATS[i][1]; return k; }

  /* ================= 🧪 PERIODIC TABLE ================= */
  var CHEM = { view: "grid", q: "", score: 0, idx: 0, el: null };

  function chemCell(e) {
    return '<button type="button" class="tk-el c' + catIdx(e[4]) + '" data-el="' + esc(e[0]) + '" title="' + esc(e[2]) + '"><b>' + esc(e[1]) + "</b><i>" + e[0] + "</i></button>";
  }

  function chemDetHTML(e) {
    var g = e[5] == null ? "f-block" : ("Group " + e[5]);
    return '<div class="tk-det">' +
      '<span class="tk-sym c' + catIdx(e[4]) + '">' + esc(e[1]) + "</span>" +
      '<div class="tk-name">' + esc(e[2]) + "</div>" +
      '<div class="tk-facts"><span>⚛️ Atomic number ' + e[0] + '</span><span>⚖️ ' + esc(e[3]) + ' u</span><span>' + esc(g) + '</span><span>Period ' + e[6] + '</span></div>' +
      '<div class="tk-facts"><span>' + esc(catName(e[4])) + "</span></div>" +
      '<div class="tk-row"><button class="tk-btn" id="tkQuizBtn">🕵️ Element Detective</button><button class="tk-btn alt" id="tkBack">← All elements</button></div>' +
      "</div>";
  }

  function chemQuizHTML() {
    var q = CHEM.q;
    if (!q) return '<div class="tk-empty">Preparing round…</div>';
    return '<div class="tk-score">Round ' + (CHEM.idx + 1) + " of " + CHEMQ + " · Score <b>" + CHEM.score + "</b></div>" +
      '<div class="tk-q">' + esc(q.t) + "</div>" +
      q.o.map(function (o, i) { return '<button type="button" class="tk-qopt' + (o.c ? " tk-cor" : "") + '" data-cor="' + (o.c ? "1" : "0") + '">' + esc(o.v) + "</button>"; }).join("");
  }

  function chemRender() {
    var body = $("tkChemBody");
    if (!body) return;
    var q = ($("tkChemIn") && $("tkChemIn").value || "").toLowerCase().trim();
    if (CHEM.view === "detail") { body.innerHTML = chemDetHTML(CHEM.el); wireDet(); return; }
    if (CHEM.view === "quiz") {
      body.innerHTML = '<div class="tk-vtabs"><span class="tk-vtab on">🕵️ Element Detective</span></div>' + chemQuizHTML();
      Array.prototype.forEach.call(body.querySelectorAll(".tk-qopt"), function (b) {
        b.addEventListener("click", function () { chemAns(b); });
      });
      return;
    }
    var list = ELEMS.filter(function (e) {
      if (!q) return true;
      return e[2].toLowerCase().indexOf(q) >= 0 || e[1].toLowerCase().indexOf(q) >= 0 || String(e[0]) === q;
    });
    body.innerHTML =
      '<div class="tk-leg">' + CATS.map(function (c, i) { return '<span class="c' + i + '">' + esc(c[1]) + "</span>"; }).join("") + "</div>" +
      (list.length ? '<div class="tk-el-grid">' + list.map(chemCell).join("") + "</div>" : '<div class="tk-empty">No element matches “' + esc(q) + '”.</div>');
    Array.prototype.forEach.call(body.querySelectorAll(".tk-el"), function (b) {
      b.addEventListener("click", function () {
        var z = +b.getAttribute("data-el");
        for (var i = 0; i < ELEMS.length; i++) if (ELEMS[i][0] === z) { CHEM.el = ELEMS[i]; break; }
        CHEM.view = "detail"; chemRender();
      });
    });
  }

  function wireDet() {
    var b = $("tkBack"); if (b) b.onclick = function () { CHEM.view = "grid"; chemRender(); };
    var q = $("tkQuizBtn"); if (q) q.onclick = function () { chemQuiz(); };
  }

  function chemQuiz() {
    CHEM.view = "quiz"; CHEM.score = 0; CHEM.idx = 0;
    mkRound(); chemRender();
  }

  function mkRound() {
    var pick = Math.floor(Math.random() * 3);
    var el = ELEMS[Math.floor(Math.random() * ELEMS.length)];
    var t, corV, pool;
    if (pick === 0) { t = "Which element has the symbol “" + el[1] + "”?"; corV = el[2]; pool = ELEMS.map(function (e) { return e[2]; }); }
    else if (pick === 1) { t = "What is the symbol of “" + el[2] + "”?"; corV = el[1]; pool = ELEMS.map(function (e) { return e[1]; }); }
    else { t = "Which element has atomic number " + el[0] + "?"; corV = el[2]; pool = ELEMS.map(function (e) { return e[2]; }); }
    var opts = [], seen = {}, k = 0;
    while (opts.length < 3 && k < 300) {
      k++;
      var v = pool[Math.floor(Math.random() * pool.length)];
      if (v === corV || seen[v]) continue;
      seen[v] = 1; opts.push({ v: v, c: false });
    }
    opts.push({ v: corV, c: true });
    for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp; }
    CHEM.q = { t: t, o: opts };
  }

  function chemAns(btn) {
    var cor = btn.getAttribute("data-cor") === "1";
    if (cor) CHEM.score++;
    CHEM.idx++;
    if (CHEM.idx >= CHEMQ) { chemDone(); return; }
    mkRound(); chemRender();
  }

  function chemDone() {
    var xp = CHEM.score * 2;
    var coins = CHEM.score >= 6 ? 1 : 0;
    try { if (typeof xpAdd === "function" && xp > 0) xpAdd(xp); } catch (e) {}
    try { if (typeof coinsAdd === "function" && coins > 0) coinsAdd(coins); } catch (e) {}
    var emo = CHEM.score >= 7 ? "🧪🌟" : CHEM.score >= 5 ? "🧪💪" : "🧪";
    var line = CHEM.score >= 7 ? "Chemistry genius!" : CHEM.score >= 5 ? "Strong — the periodic table is yours." : "Keep exploring — every element has a story.";
    var body = $("tkChemBody");
    body.innerHTML = '<div class="tk-det">' +
      '<div class="tk-sym" style="font-size:1.6rem;border:0">' + emo + "</div>" +
      '<div class="tk-name">' + CHEM.score + " / " + CHEMQ + " correct</div>" +
      '<div class="tk-facts"><span>' + esc(line) + '</span><span>' + (xp ? "+" + xp + " XP" : "") + (coins ? " · +" + coins + " coin" : "") + "</span></div>" +
      '<div class="tk-row"><button class="tk-btn" id="tkAgain">🔄 Play again</button><button class="tk-btn alt" id="tkBack2">← Table</button></div></div>';
    $("tkAgain").onclick = function () { chemQuiz(); };
    $("tkBack2").onclick = function () { CHEM.view = "grid"; chemRender(); };
  }

  function chemOpen() {
    var ov = $("tkChemOv");
    if (ov) { ov.style.display = "flex"; return; }
    ov = document.createElement("div");
    ov.id = "tkChemOv";
    ov.className = "tk-ov";
    ov.setAttribute("aria-label", "Periodic Table");
    ov.innerHTML =
      '<div class="tk-box" role="dialog" aria-label="Periodic Table Explorer">' +
        '<div class="tk-h">🧪 Periodic Table <button class="tk-x" id="tkChemX" aria-label="Close">✕</button></div>' +
        '<div class="tk-sub">All 118 elements — tap one to explore, or play Element Detective</div>' +
        '<input class="tk-in" id="tkChemIn" type="search" placeholder="Search name, symbol or atomic number…" aria-label="Search elements">' +
        '<div id="tkChemBody"></div>' +
        '<div class="tk-note">Click a tile for mass, group and period</div>' +
      "</div>";
    document.body.appendChild(ov);
    CHEM.view = "grid";
    $("tkChemX").onclick = function () { ov.remove(); };
    $("tkChemIn").addEventListener("input", function () { CHEM.view = "grid"; chemRender(); });
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    chemRender();
  }

  /* ================= 📐 FORMULA VAULT ================= */
  var VOL = { tab: "Maths", q: "" };

  function bmList() { return ls(VB, []); }
  function bmSave(a) { lss(VB, a); }

  function volRows() {
    var q = VOL.q.toLowerCase().trim();
    var out = [];
    FORMS.forEach(function (f) {
      var hay = (f[0] + " " + f[1] + " " + f[2] + " " + f[3] + " " + f[4]).toLowerCase();
      if (q ? hay.indexOf(q) >= 0 : f[0] === VOL.tab) out.push(f);
    });
    return out;
  }

  function volRender() {
    var body = $("tkVolBody");
    if (!body) return;
    var bm = bmList();
    var rows = volRows();
    if (!rows.length) { body.innerHTML = '<div class="tk-empty">No formulas match “' + esc(VOL.q) + '”.</div>'; return; }
    var cats = {}, order = [];
    rows.forEach(function (f) { if (!cats[f[1]]) { cats[f[1]] = []; order.push(f[1]); } cats[f[1]].push(f); });
    body.innerHTML = order.map(function (c) {
      return '<div class="tk-vcat">' + esc(c) + "</div>" + cats[c].map(function (f) {
        var on = bm.indexOf(f[2]) >= 0;
        return '<div class="tk-vrow">' +
          '<button type="button" class="tk-st' + (on ? " on" : "") + '" data-bm="' + esc(f[2]) + '" aria-label="Bookmark">' + (on ? "★" : "☆") + "</button>" +
          '<button type="button" class="tk-cp" data-cp="' + esc(f[3]) + '">Copy</button>' +
          '<div class="n">' + esc(f[2]) + "</div>" +
          '<div class="f">' + esc(f[3]) + "</div>" +
          '<div class="nt">' + esc(f[4]) + "</div>" +
        "</div>";
      }).join("");
    }).join("");
    Array.prototype.forEach.call(body.querySelectorAll(".tk-st"), function (b) {
      b.addEventListener("click", function () {
        var name = b.getAttribute("data-bm");
        var arr = bmList();
        var i = arr.indexOf(name);
        if (i >= 0) arr.splice(i, 1); else arr.push(name);
        bmSave(arr);
        volRender();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".tk-cp"), function (b) {
      b.addEventListener("click", function () { volCopy(b); });
    });
  }

  function volCopy(btn) {
    var t = btn.getAttribute("data-cp") || "";
    var done = function () {
      btn.textContent = "✓";
      setTimeout(function () { btn.textContent = "Copy"; }, 900);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, done); return; }
    } catch (e) {}
    try {
      var ta = document.createElement("textarea");
      ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand && document.execCommand("copy");
      ta.remove();
    } catch (e) {}
    done();
  }

  function vaultOpen() {
    var ov = $("tkVaultOv");
    if (ov) { ov.style.display = "flex"; return; }
    ov = document.createElement("div");
    ov.id = "tkVaultOv";
    ov.className = "tk-ov";
    ov.setAttribute("aria-label", "Formula Vault");
    ov.innerHTML =
      '<div class="tk-box" role="dialog" aria-label="Formula Vault">' +
        '<div class="tk-h">📐 Formula Vault <button class="tk-x" id="tkVolX" aria-label="Close">✕</button></div>' +
        '<div class="tk-sub">The formulas examiners love — search, bookmark ★ and copy</div>' +
        '<input class="tk-in" id="tkVolIn" type="search" placeholder="Search all subjects… (e.g. quadratic, ohm, mole)" aria-label="Search formulas">' +
        '<div class="tk-vtabs" id="tkVolTabs">' +
          ["Maths", "Physics", "Chemistry"].map(function (s) { return '<button type="button" class="tk-vtab' + (s === VOL.tab ? " on" : "") + '" data-t="' + s + '">' + s + "</button>"; }).join("") +
        "</div>" +
        '<div id="tkVolBody" style="max-height:52dvh;overflow:auto"></div>' +
      "</div>";
    document.body.appendChild(ov);
    $("tkVolX").onclick = function () { ov.remove(); };
    $("tkVolIn").addEventListener("input", function () { VOL.q = $("tkVolIn").value; volRender(); });
    Array.prototype.forEach.call($("tkVolTabs").querySelectorAll(".tk-vtab"), function (b) {
      b.addEventListener("click", function () {
        VOL.tab = b.getAttribute("data-t");
        VOL.q = ""; $("tkVolIn").value = "";
        Array.prototype.forEach.call($("tkVolTabs").querySelectorAll(".tk-vtab"), function (x) { x.classList.toggle("on", x === b); });
        volRender();
      });
    });
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    volRender();
  }

  /* ================= 📈 SCROLL PROGRESS + 🎞️ MOTION ================= */
  function barInit() {
    var b = document.createElement("div");
    b.id = "tkBar";
    b.className = "tk-bar";
    document.body.appendChild(b);
    var up = function () {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      b.style.width = Math.min(100, (h.scrollTop / max) * 100) + "%";
    };
    document.addEventListener("scroll", up, { passive: true });
    window.addEventListener("resize", up, { passive: true });
    up();
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
    grp.appendChild(mk("tkChem", "🧪", "Periodic Table", "118 elements + detective quiz", function () { chemOpen(); }));
    grp.appendChild(mk("tkVault", "📐", "Formula Vault", "Maths · Physics · Chemistry", function () { vaultOpen(); }));
    if (w) w.insertBefore(grp, w.lastChild);
    else {
      var wrap = document.createElement("div");
      wrap.id = "tkChips";
      wrap.appendChild(grp);
      host.insertBefore(wrap, host.querySelector(".stats"));
    }
  }

  function hooks() {
    var h = function (add) {
      add("Tools", "🧪", "Periodic Table", "Explore all 118 elements + detective quiz", function () { chemOpen(); });
      add("Tools", "📐", "Formula Vault", "Maths · Physics · Chemistry formulas", function () { vaultOpen(); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  function boot() {
    css();
    try { document.documentElement.classList.add("tk"); } catch (e) {}
    try { chips(); } catch (e) {}
    try { barInit(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        var c = $("tkChemOv"); if (c) { c.remove(); return; }
        var v = $("tkVaultOv"); if (v) v.remove();
      });
    } catch (e) {}
    window.__tkCl = { chem: CHEM, vol: VOL };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
