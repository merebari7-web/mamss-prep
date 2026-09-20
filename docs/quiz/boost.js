/* v28.0 — Pro Boost (lazy, boot-safe, loaded by polish.js at idle).
   Adds: ⚡ Math Sprint (60-second mental-arithmetic arcade with numpad,
   combos, best scores, XP/coins rewards), 🌧️ Soundscapes (generative
   WebAudio ambient — rain, ocean, brown noise — plays offline, volume
   control, session state), 🧊 3D tilt + light glare on interactive tiles
   and cards (desktop pointers only, honours reduced motion), 💫 rotating
   gold aura rings on the quiz + plan cards, and two new command-palette
   entries. All additive, fails silent. */
(function () {
  "use strict";
  if (window.__boost) return;
  window.__boost = 1;

  var SPR = "nssc_sprint";
  var SC = "nssc_scapes";
  var BEST = { easy: 0, normal: 0, hard: 0 };
  var TILT_SEL = ".lab-tile,.sv-tile,.g-tile,.lib-item,.ai-it";

  /* ---------- tiny helpers ---------- */
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var CSS =
    "html.boost .bt-chip{cursor:pointer;background:rgba(255,255,255,.05);border:1px solid rgba(236,207,142,.35);color:var(--hero-ink,#fff);font-family:inherit;text-align:left;transition:transform .25s,box-shadow .25s,border-color .25s}" +
    "html.boost .bt-chip:hover{transform:translateY(-2px);border-color:rgba(236,207,142,.7);box-shadow:0 10px 22px -12px rgba(0,0,0,.5)}" +
    "html.boost .bt-chip small{display:block;font-size:.6rem;opacity:.75;letter-spacing:.05em}" +
    "html.boost .bo-ov{position:fixed;inset:0;z-index:126;background:rgba(8,10,20,.5);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.boost .bo-box{width:min(430px,100%);max-height:92dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.5);box-shadow:0 40px 90px -30px rgba(0,0,0,.75);padding:18px;color:var(--ink,#20302a)}" +
    "html.boost .bo-t{display:flex;align-items:center;gap:8px;font-size:1.05rem;font-weight:800;letter-spacing:.02em}" +
    "html.boost .bo-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.boost .bo-x:hover{background:rgba(0,0,0,.06)}" +
    "html.boost .bo-sub{font-size:.72rem;color:var(--mut,#8a7a5c);margin:2px 0 12px}" +
    "html.boost .bo-btn{border:1px solid var(--card-border,#cbb386);background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;font-weight:800;border-radius:999px;padding:9px 16px;font-size:.8rem;cursor:pointer;font-family:inherit}" +
    "html.boost .bo-btn.alt{background:transparent;color:var(--ink,#20302a);border-color:var(--card-border,#cbb386)}" +
    "html.boost .spr-bar{height:8px;border-radius:99px;background:var(--bar-track,#e6decc);overflow:hidden;margin-bottom:10px}" +
    "html.boost .spr-bar span{display:block;height:100%;width:100%;background:linear-gradient(90deg,#eccf8e,#c9a25f);border-radius:99px;transition:width .9s linear}" +
    "html.boost .spr-hud{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:.75rem;color:var(--mut,#8a7a5c)}" +
    "html.boost .spr-hud b{color:#8a5f24;font-size:1rem}" +
    "html.boost .spr-c{font-weight:800;color:#b45309;min-width:70px}" +
    "html.boost .spr-q{font-size:1.5rem;font-weight:900;text-align:center;padding:18px 8px;letter-spacing:.02em;color:var(--ink,#20302a)}" +
    "html.boost .spr-in{min-height:34px;text-align:center;font-size:1.1rem;font-weight:800;letter-spacing:.2em;color:#8a5f24;border-radius:10px;border:1px dashed var(--card-border,#cbb386);padding:8px 10px;margin-bottom:12px}" +
    "html.boost .spr-in.shake{animation:boostshake .3s}" +
    "@keyframes boostshake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}" +
    "html.boost .spr-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}" +
    "html.boost .spr-pad button{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:12px 0;font-size:1.05rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;transition:transform .12s,background .12s}" +
    "html.boost .spr-pad button:hover{background:var(--opt-hover,rgba(201,162,39,.12))}" +
    "html.boost .spr-pad button:active{transform:scale(.94)}" +
    "html.boost .spr-pad .k-ok{background:linear-gradient(135deg,#eccf8e,#c9a25f);border-color:transparent;color:#241a05}" +
    "html.boost .spr-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}" +
    "html.boost .spr-res{text-align:center;padding:6px 0 2px}" +
    "html.boost .spr-score{font-size:2.6rem;font-weight:900;line-height:1;background:linear-gradient(135deg,#eccf8e,#9c742c);-webkit-background-clip:text;background-clip:text;color:transparent}" +
    "html.boost .spr-sub{font-size:.7rem;color:var(--mut,#8a7a5c);margin-bottom:10px}" +
    "html.boost .spr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0;font-size:.68rem;color:var(--mut,#8a7a5c);text-align:center}" +
    "html.boost .spr-stats span{background:var(--panel,#f5efdf);border-radius:10px;padding:8px 4px}" +
    "html.boost .spr-stats b{display:block;font-size:.9rem;color:#8a5f24}" +
    "html.boost .spr-award{text-align:center;font-size:.78rem;color:var(--ink-2,#4a5877);margin-bottom:12px}" +
    "html.boost .sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}" +
    "html.boost .sc-t{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:14px;padding:12px 4px;font-size:.7rem;font-weight:700;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;transition:all .2s}" +
    "html.boost .sc-t b{display:block;font-size:1.3rem}" +
    "html.boost .sc-t.on{border-color:#c9a25f;background:linear-gradient(135deg,#f6ead2,#ecd9a8);box-shadow:0 8px 18px -10px rgba(154,116,44,.55)}" +
    "html.boost .sc-vol{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:.8rem;color:var(--mut,#8a7a5c)}" +
    "html.boost .sc-vol input{flex:1;accent-color:#c9a25f}" +
    "html.boost .sc-note{font-size:.66rem;color:var(--mut,#8a7a5c);margin-top:10px;text-align:center}" +
    "html.boost .boost-ring{position:relative}" +
    "html.boost .boost-ring::before{content:\"\";position:absolute;inset:-2px;border-radius:inherit;z-index:-1;pointer-events:none;background:conic-gradient(from 0deg,rgba(236,207,142,0) 0deg,rgba(236,207,142,.95) 70deg,rgba(156,116,44,.9) 130deg,rgba(236,207,142,0) 210deg,rgba(236,207,142,0) 360deg);filter:blur(1.5px)" +
    "@media (prefers-reduced-motion:no-preference){html.boost .boost-ring::before{animation:boostspin 7s linear infinite}}@keyframes boostspin{to{transform:rotate(360deg)}}" +
    "html.boost .bt3d{position:relative;transform-style:preserve-3d;will-change:transform}" +
    "html.boost .bt3d::after{content:\"\";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(220px circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.30),transparent 55%);opacity:0;transition:opacity .25s;pointer-events:none}" +
    "html.boost .bt3d:hover::after{opacity:1}";

  function css() { if (!document.getElementById("boostCss")) { var s = document.createElement("style"); s.id = "boostCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ================= ⚡ MATH SPRINT ================= */
  var SP = { on: false, left: 60, total: 60, iv: 0, q: null, ans: "", score: 0, combo: 0, bestCombo: 0, hits: 0, diff: "easy" };

  function mkQ() {
    var d = SP.diff, r = Math.random, k = Math.floor(r() * (d === "easy" ? 3 : d === "normal" ? 4 : 3));
    var a, b, c, op, ans, txt;
    if (d === "easy") {
      if (k === 0) { a = 3 + Math.floor(r() * 18); b = 2 + Math.floor(r() * 9); op = "+"; ans = a + b; txt = a + " + " + b; }
      else if (k === 1) { a = 6 + Math.floor(r() * 24); b = 2 + Math.floor(r() * (a - 3)); op = "−"; ans = a - b; txt = a + " − " + b; }
      else { a = 2 + Math.floor(r() * 8); b = 2 + Math.floor(r() * 9); op = "×"; ans = a * b; txt = a + " × " + b; }
    } else if (d === "normal") {
      if (k === 0) { a = 12 + Math.floor(r() * 90); b = 3 + Math.floor(r() * 40); op = "+"; ans = a + b; txt = a + " + " + b; }
      else if (k === 1) { a = 20 + Math.floor(r() * 120); b = 4 + Math.floor(r() * (a - 10)); op = "−"; ans = a - b; txt = a + " − " + b; }
      else if (k === 2) { a = 3 + Math.floor(r() * 10); b = 3 + Math.floor(r() * 9); op = "×"; ans = a * b; txt = a + " × " + b; }
      else { b = 2 + Math.floor(r() * 9); ans = 2 + Math.floor(r() * 12); a = b * ans; op = "÷"; txt = a + " ÷ " + b; }
    } else {
      if (k === 0) { a = 3 + Math.floor(r() * 14); b = 3 + Math.floor(r() * 9); c = 2 + Math.floor(r() * 40); ans = a * b + c; txt = a + " × " + b + " + " + c; }
      else if (k === 1) { b = 3 + Math.floor(r() * 12); ans = 3 + Math.floor(r() * 15); a = b * ans; txt = a + " ÷ " + b; }
      else { a = 10 + Math.floor(r() * 90); b = 2 + Math.floor(r() * 9); ans = a - b; txt = a + " − " + b; }
    }
    return { t: txt, a: ans };
  }

  function beep(f, ms) {
    try {
      var ac = ctx(); if (!ac) return;
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.value = 0.12;
      o.connect(g); g.connect(ac.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (ms || 0.1) / 1000);
      o.stop(ac.currentTime + (ms || 0.1) / 1000 + 0.05);
    } catch (e) {}
  }

  function sprPaint() {
    var q = $("sprQ"), inEl = $("sprIn"), sc = $("sprScore"), cb = $("sprCombo"), bst = $("sprBest");
    if (q) q.textContent = SP.q ? SP.q.t : "";
    if (inEl) inEl.textContent = SP.ans || "…";
    if (sc) sc.textContent = SP.score;
    if (cb) cb.textContent = SP.combo >= 2 ? "🔥 x" + SP.combo : "";
    if (bst) bst.textContent = "best " + BEST[SP.diff];
    var f = $("sprFill");
    if (f) f.style.width = Math.max(0, (SP.left / SP.total) * 100) + "%";
  }

  function sprKey(e) {
    if (!SP.on) return;
    if (e.key === "Escape") { closeSprint(); return; }
    var t = e.target && e.target.tagName;
    if (t === "INPUT" || t === "TEXTAREA") return;
    if (/^\d$/.test(e.key)) { sprIn(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { sprIn("⌫"); e.preventDefault(); }
    else if (e.key === "Enter") { sprIn("✓"); e.preventDefault(); }
  }

  function sprIn(k) {
    if (!SP.on || !SP.q) return;
    if (k === "✓") { sprCheck(); return; }
    if (k === "⌫") { SP.ans = SP.ans.slice(0, -1); }
    else { if (SP.ans.length >= 5) return; SP.ans += k; }
    sprPaint();
  }

  function sprCheck() {
    if (!SP.q || !SP.ans) return;
    SP.hits++;
    var inEl = $("sprIn");
    if (parseInt(SP.ans, 10) === SP.q.a) {
      SP.score++; SP.combo++;
      if (SP.combo > SP.bestCombo) SP.bestCombo = SP.combo;
      beep(880 + Math.min(SP.combo, 10) * 40, 90);
      if (SP.combo > 0 && SP.combo % 5 === 0 && inEl) {
        inEl.textContent = "🔥 " + SP.combo + " in a row!";
        inEl.style.borderColor = "#c9a25f";
        setTimeout(function () { inEl.style.borderColor = ""; sprPaint(); }, 450);
      }
    } else {
      SP.combo = 0;
      beep(200, 160);
      if (inEl) { inEl.classList.remove("shake"); void inEl.offsetWidth; inEl.classList.add("shake"); }
    }
    SP.q = mkQ(); SP.ans = "";
    sprPaint();
  }

  function sprFinish() {
    clearInterval(SP.iv); SP.iv = 0; SP.on = false;
    var prev = BEST[SP.diff];
    if (SP.score > BEST[SP.diff]) BEST[SP.diff] = SP.score;
    var acc = SP.hits ? Math.round((SP.score / SP.hits) * 100) : 0;
    var plays = (ls(SPR, {}).plays || 0) + 1;
    lss(SPR, { best: BEST, plays: plays, last: new Date().toISOString().slice(0, 10) });
    var xp = SP.score > 0 ? Math.min(50, 5 + SP.score) : 0;
    var coins = SP.score >= 10 ? Math.floor(SP.score / 10) : 0;
    try { if (typeof xpAdd === "function" && xp > 0) xpAdd(xp); } catch (e) {}
    try { if (typeof coinsAdd === "function" && coins > 0) coinsAdd(coins); } catch (e) {}
    var emo = SP.score >= 30 ? "🤯" : SP.score >= 20 ? "🌟" : SP.score >= 10 ? "💪" : "🌱";
    var line = SP.score >= 30 ? "Calculator? Never heard of her." : SP.score >= 20 ? "Brilliant — keep this pace!" : SP.score >= 10 ? "Solid. Warm those fingers and go again." : "Every sprint grows your speed. Again!";
    var ov = $("boostOv");
    if (!ov) return;
    ov.innerHTML =
      '<div class="bo-box" role="dialog" aria-label="Sprint result">' +
        '<div class="bo-t">' + emo + " Sprint complete <button class=\"bo-x\" id=\"boostX\" aria-label=\"Close\">✕</button></div>" +
        '<div class="spr-res"><div class="spr-score">' + SP.score + '</div><div class="spr-sub">correct answers in ' + Math.round(SP.total) + "s</div></div>" +
        '<div class="spr-stats"><span>🎯 accuracy<b>' + acc + "%</b></span><span>🔥 best combo<b>x" + SP.bestCombo + "</b></span><span>🏆 best (" + esc(SP.diff) + ")<b>" + BEST[SP.diff] + "</b></span></div>" +
        '<div class="spr-award">' + (xp ? "+" + xp + " XP" : "") + (xp && coins ? " · " : "") + (coins ? "+" + coins + " coins" : "") + (xp || coins ? " earned" : "") + "</div>" +
        '<div class="spr-award">' + esc(line) + "</div>" +
        '<div class="spr-row"><button class="bo-btn" id="sprAgain">▶ Play again</button><button class="bo-btn alt" id="sprClose">Close</button></div>' +
      "</div>";
    $("boostX").onclick = closeSprint;
    $("sprAgain").onclick = function () { sprOpen(); };
    $("sprClose").onclick = closeSprint;
    if (prev !== BEST[SP.diff]) beep(1046, 240);
  }

  function sprTick() {
    SP.left--;
    if (SP.left <= 0) { sprFinish(); return; }
    sprPaint();
  }

  function sprOpen() {
    var first = !$("boostOv");
    var ov = $("boostOv") || document.createElement("div");
    ov.id = "boostOv";
    ov.className = "bo-ov";
    ov.setAttribute("aria-label", "Math Sprint");
    SP.on = true;
    SP.left = SP.total = window.__sprintFast ? 4 : 60;
    SP.score = 0; SP.combo = 0; SP.bestCombo = 0; SP.hits = 0; SP.ans = "";
    SP.q = mkQ();
    ov.innerHTML =
      '<div class="bo-box" role="dialog" aria-label="Math Sprint">' +
        '<div class="bo-t">⚡ Math Sprint <button class="bo-x" id="boostX" aria-label="Close">✕</button></div>' +
        '<div class="bo-sub">Answer as many as you can before the timer runs out</div>' +
        '<div class="spr-bar"><span id="sprFill" style="width:100%"></span></div>' +
        '<div class="spr-hud"><span>🎯 <b id="sprScore">0</b></span><span class="spr-c" id="sprCombo"></span><span style="margin-left:auto" id="sprBest">best ' + BEST[SP.diff] + "</span></div>" +
        '<div class="spr-q" id="sprQ"></div>' +
        '<div class="spr-in" id="sprIn" aria-live="polite">…</div>' +
        '<div class="spr-pad" id="sprPad"></div>' +
        '<div class="spr-row"><button class="bo-btn alt" id="sprDiff">🎚 Level: ' + esc(SP.diff) + "</button></div>" +
      "</div>";
    if (first) document.body.appendChild(ov);
    var pad = $("sprPad");
    ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "⌫", "✓"].forEach(function (k, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-k", k);
      b.textContent = k;
      if (k === "✓") b.className = "k-ok";
      if (k === "⌫") b.setAttribute("aria-label", "Backspace");
      b.addEventListener("click", function () { sprIn(k); });
      pad.appendChild(b);
    });
    $("boostX").onclick = closeSprint;
    $("sprDiff").onclick = function () {
      SP.diff = SP.diff === "easy" ? "normal" : SP.diff === "normal" ? "hard" : "easy";
      $("sprDiff").textContent = "🎚 Level: " + SP.diff;
      SP.q = mkQ(); SP.ans = ""; SP.score = 0; SP.combo = 0; SP.bestCombo = 0; SP.hits = 0;
      sprPaint();
    };
    ov.onclick = function (e) { if (e.target === ov) closeSprint(); };
    sprPaint();
    clearInterval(SP.iv);
    SP.iv = setInterval(sprTick, 1000);
  }

  function closeSprint() {
    try { clearInterval(SP.iv); } catch (e) {}
    SP.iv = 0; SP.on = false;
    var ov = $("boostOv");
    if (ov) { try { ov.remove(); } catch (e) {} }
  }

  /* ================= 🌧️ SOUNDSCAPES ================= */
  var A = null, SC_NODE = null, SCK = { p: "rain", v: 50 };

  function ctx() {
    try {
      if (!A) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { window.__scapeAvail = 0; return null; }
        A = new AC();
      }
      if (A.state === "suspended" && A.resume) { try { A.resume(); } catch (e) {} }
      return A;
    } catch (e) { return null; }
  }

  function noiseBuf(ac, brown) {
    var len = Math.floor(ac.sampleRate * 2);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }

  function playScape(kind) {
    try {
      var ac = ctx(); if (!ac) return;
      stopScape(0);
      var src = ac.createBufferSource();
      src.buffer = noiseBuf(ac, kind !== "rain");
      src.loop = true;
      var g = ac.createGain(), f = ac.createBiquadFilter();
      var base = 0.5 * (SCK.v / 100);
      f.type = "lowpass";
      g.gain.value = base + 0.001;
      if (kind === "rain") { f.frequency.value = 2400; g.gain.value = base; }
      else if (kind === "ocean") { f.frequency.value = 420; g.gain.value = base * 0.9 + 0.001; }
      else { f.frequency.value = 700; }
      src.connect(f); f.connect(g); g.connect(ac.destination);
      var osc = null, lg = null;
      try {
        osc = ac.createOscillator();
        lg = ac.createGain();
        if (kind === "rain") { osc.frequency.value = 0.15; lg.gain.value = 260; osc.connect(lg); lg.connect(f.frequency); }
        else if (kind === "ocean") { osc.frequency.value = 0.07; lg.gain.value = base * 0.35; osc.connect(lg); lg.connect(g.gain); }
        osc.start();
      } catch (e) {}
      src.start();
      SC_NODE = { src: src, g: g, f: f, osc: osc, base: base, kind: kind };
      window.__scapeOn = true;
    } catch (e) { window.__scapeOn = false; }
  }

  function stopScape(fast) {
    var n = SC_NODE;
    SC_NODE = null;
    window.__scapeOn = false;
    if (!n || !A) return;
    try {
      n.g.gain.setTargetAtTime(0.0001, A.currentTime, 0.12);
      var kill = function () {
        try { n.src.stop(); } catch (e) {}
        try { n.osc && n.osc.stop(); } catch (e) {}
        try { n.src.disconnect(); n.g.disconnect(); n.f.disconnect(); n.osc && n.osc.disconnect(); } catch (e) {}
      };
      setTimeout(kill, fast ? 60 : 480);
    } catch (e) {}
  }

  function scapeOpen() {
    var saved = ls(SC, null);
    if (saved && saved.p) SCK.p = saved.p;
    if (saved && typeof saved.v === "number") SCK.v = saved.v;
    var ov = document.createElement("div");
    ov.id = "scapeOv";
    ov.className = "bo-ov";
    ov.setAttribute("aria-label", "Soundscapes");
    var kinds = [["rain", "🌧️", "Rain"], ["ocean", "🌊", "Ocean"], ["brown", "🎧", "Brown"]];
    ov.innerHTML =
      '<div class="bo-box" role="dialog" aria-label="Soundscapes">' +
        '<div class="bo-t">🌧️ Soundscapes <button class="bo-x" id="scapeX" aria-label="Close">✕</button></div>' +
        '<div class="bo-sub">Generative ambient audio — nothing to download, plays offline</div>' +
        '<div class="sc-grid">' + kinds.map(function (k) {
          return '<button class="sc-t" data-k="' + k[0] + '" type="button"><b>' + k[1] + "</b>" + k[2] + "</button>";
        }).join("") + "</div>" +
        '<div class="sc-vol">🔈 <input type="range" id="scVol" min="0" max="100" value="' + SCK.v + '" aria-label="Volume"></div>' +
        '<div class="spr-row"><button class="bo-btn" id="scStop">⏹ Stop</button><button class="bo-btn alt" id="scDone">Done</button></div>' +
        '<div class="sc-note">Tip: start a sound, open 🧘 Zen Focus, and study in flow</div>' +
      "</div>";
    document.body.appendChild(ov);
    var paint = function () {
      ov.querySelectorAll(".sc-t").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-k") === SCK.p && window.__scapeOn === true);
      });
    };
    ov.querySelectorAll(".sc-t").forEach(function (b) {
      b.addEventListener("click", function () {
        SCK.p = b.getAttribute("data-k");
        lss(SC, SCK);
        playScape(SCK.p);
        paint();
      });
    });
    var vol = $("scVol");
    vol.addEventListener("input", function () {
      SCK.v = +vol.value;
      lss(SC, SCK);
      if (SC_NODE) { try { SC_NODE.g.gain.setTargetAtTime(SC_NODE.base * (SCK.v / 100), A.currentTime, 0.08); } catch (e) {} }
    });
    $("scStop").onclick = function () { stopScape(); paint(); };
    $("scDone").onclick = closeScape;
    $("scapeX").onclick = closeScape;
    ov.onclick = function (e) { if (e.target === ov) closeScape(); };
    paint();
  }

  function closeScape() {
    stopScape();
    var ov = $("scapeOv");
    if (ov) { try { ov.remove(); } catch (e) {} }
  }

  /* ================= 🧊 3D TILT + GLARE ================= */
  function tilt() {
    var el = document.querySelectorAll(TILT_SEL);
    for (var i = 0; i < el.length; i++) el[i].classList.add("bt3d");
    var fine = true, rm = false;
    try {
      if (window.matchMedia) {
        fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }
    } catch (e) {}
    function active() { return window.__tiltForce || (fine && !rm); }
    var cur = null;
    function resetT(t) { if (t) { try { t.style.transform = ""; t.style.removeProperty("--gx"); t.style.removeProperty("--gy"); } catch (e) {} } }
    document.addEventListener("pointermove", function (e) {
      if (!active()) return;
      var t = e.target && e.target.closest ? e.target.closest(TILT_SEL) : null;
      if (t !== cur) { if (cur) resetT(cur); cur = t; }
      if (!t) return;
      var now = Date.now();
      if (now - (t._tLast || 0) < 24) return;
      t._tLast = now;
      var r = t.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      t.style.transform = "perspective(700px) rotateX(" + (-py * 6).toFixed(2) + "deg) rotateY(" + (px * 7).toFixed(2) + "deg) translateY(-2px)";
      t.style.setProperty("--gx", (px * 100 + 50) + "%");
      t.style.setProperty("--gy", (py * 100 + 50) + "%");
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      if (!active()) return;
      var t = e.target && e.target.closest ? e.target.closest(TILT_SEL) : null;
      if (t) resetT(t);
    }, { passive: true });
  }

  /* ================= 💫 GOLD AURA RINGS ================= */
  function rings() {
    ["quizCard", "planCard"].forEach(function (id) {
      var el = $(id);
      if (el) el.classList.add("boost-ring");
    });
  }

  /* ================= 🧩 LAUNCH CHIPS ================= */
  function chips() {
    var w = document.getElementById("examChip");
    var host = w ? null : document.querySelector(".hero-copy");
    if (!w && !host) return;
    function mk(id, emo, t, sub, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.id = id;
      b.className = "ex-tile bt-chip";
      b.innerHTML = emo + " <span>" + t + "<small>" + sub + "</small></span>";
      b.addEventListener("click", fn);
      return b;
    }
    var grp = document.createElement("div");
    grp.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
    grp.appendChild(mk("sprLaunch", "⚡", "Math Sprint", "60-second mental maths", function () { sprOpen(); }));
    grp.appendChild(mk("scapeLaunch", "🌧️", "Soundscapes", "rain · ocean · brown noise", function () { scapeOpen(); }));
    if (w) w.insertBefore(grp, w.lastChild);
    else {
      var wrap = document.createElement("div");
      wrap.id = "boostChips";
      wrap.appendChild(grp);
      var stats = host.querySelector(".stats");
      host.insertBefore(wrap, stats);
    }
  }

  /* ================= ⌨️ PALETTE HOOKS ================= */
  function hooks() {
    var h = function (add) {
      add("Tools", "⚡", "Math Sprint", "60-second mental maths arcade", function () { sprOpen(); });
      add("Tools", "🌧️", "Soundscapes", "Rain, ocean or brown noise while you study", function () { scapeOpen(); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  /* ---------- boot ---------- */
  function boot() {
    css();
    try { document.documentElement.classList.add("boost"); } catch (e) {}
    try { chips(); } catch (e) {}
    try { tilt(); } catch (e) {}
    try { rings(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try { document.addEventListener("keydown", sprKey); } catch (e) {}
    window.__sprint = SP;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
