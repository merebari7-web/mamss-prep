/* v37.0 — AI Explainer Reels (lazy, boot-safe, loaded by polish.js at idle).
   Auto-generated explainer videos for EVERY subject × class (27 × SS1–SS3):
   the engine builds a scripted reel on your device from the curriculum
   (topic summaries + key terms + sample questions), then plays it as a
   captioned canvas video with voiceover, transport controls, a clickable
   script, fullscreen and WebM export. Offline-friendly, reduced-motion
   aware. Additive, fails silent. */
(function () {
  "use strict";
  if (window.__reels) return;
  window.__reels = 1;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rm() {
    try {
      if (document.documentElement.classList.contains("rmotion")) return true;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    } catch (e) {}
    return false;
  }

  var RECENT = "nssc_reels_recent", VOICEK = "nssc_reels_voice";

  var CSS =
    "html.reels .re-ov{position:fixed;inset:0;z-index:134;background:rgba(8,10,20,.6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:12px}" +
    "html.reels .re-box{width:min(920px,100%);max-height:96dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.55);box-shadow:0 46px 100px -34px rgba(0,0,0,.85);padding:14px;color:var(--ink,#20302a)}" +
    "html.reels .re-h{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:800}" +
    "html.reels .re-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.reels .re-x:hover{background:rgba(0,0,0,.06)}" +
    "html.reels .re-sub{font-size:.68rem;color:var(--mut,#8a7a5c);margin:2px 0 9px}" +
    "html.reels .re-sub b{color:#8a6a30}" +
    "html.reels .re-pick{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px}" +
    "html.reels .re-sel{width:100%;box-sizing:border-box;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:9px 11px;font-size:.82rem;font-weight:700;color:var(--ink,#20302a);font-family:inherit}" +
    "html.reels .re-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}" +
    "html.reels .re-chip{border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:99px;padding:6px 13px;font-size:.7rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.reels .re-chip.on{background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;border-color:transparent}" +
    "html.reels .re-chip.t{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    "html.reels .re-stage{position:relative;border-radius:14px;overflow:hidden;background:#101527;border:1px solid rgba(220,184,95,.4)}" +
    "html.reels .re-stage canvas{display:block;width:100%;aspect-ratio:16/9}" +
    "html.reels .re-tbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:9px}" +
    "html.reels .re-btn{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:99px;padding:7px 14px;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.reels .re-btn:hover{border-color:#c9a25f}" +
    "html.reels .re-btn.pri{background:linear-gradient(135deg,#eccf8e,#c9a25f);color:#241a05;border-color:transparent}" +
    "html.reels .re-btn.on{background:rgba(201,162,39,.22);border-color:#c9a25f}" +
    "html.reels .re-btn:disabled{opacity:.5;cursor:default}" +
    "html.reels .re-meta{font-size:.66rem;color:var(--mut,#8a7a5c);margin-left:auto;font-variant-numeric:tabular-nums}" +
    "html.reels .re-dots{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}" +
    "html.reels .re-dot{width:22px;height:6px;border-radius:99px;background:rgba(0,0,0,.14);border:0;padding:0;cursor:pointer}" +
    "html.reels .re-dot.on{background:linear-gradient(90deg,#c9a25f,#e6c453)}" +
    "html.reels .re-script{margin-top:9px;border:1px solid var(--card-border,#e0d3b2);border-radius:12px;background:var(--panel,#f7f1e2);max-height:180px;overflow:auto;padding:6px}" +
    "html.reels .re-srow{display:block;width:100%;box-sizing:border-box;text-align:left;border:0;background:transparent;border-radius:9px;padding:7px 9px;font-size:.7rem;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.reels .re-srow:hover{background:rgba(201,162,39,.12)}" +
    "html.reels .re-srow.on{background:rgba(201,162,39,.2);font-weight:800}" +
    "html.reels .re-srow small{display:block;color:var(--mut,#8a7a5c);font-weight:400}" +
    "html.reels .re-recent{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;align-items:center;font-size:.66rem;color:var(--mut,#8a7a5c)}" +
    "html.reels .re-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}" +
    "html.reels .re-dl{font-size:.68rem;font-weight:800;color:#5b3d09}" +
    "@media (min-width:720px){html.reels .re-pick{grid-template-columns:1.2fr 1fr}}" +
    "@media (prefers-reduced-motion:no-preference){html.reels .re-box{animation:rePop .28s cubic-bezier(.2,.8,.3,1.1)}@keyframes rePop{from{transform:translateY(12px) scale(.985);opacity:.4}to{transform:none;opacity:1}}}" +
    "@media print{html.reels .re-ov{display:none!important}}";

  function css() { if (!$("reCss")) { var s = document.createElement("style"); s.id = "reCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ================= DATA ================= */
  function subjects() {
    var out = [];
    try {
      if (typeof QUIZ_RAW !== "undefined" && QUIZ_RAW && QUIZ_RAW.subj && QUIZ_RAW.subj.length) out = QUIZ_RAW.subj.slice();
      else if (typeof SUBJECT_META !== "undefined" && SUBJECT_META) out = Object.keys(SUBJECT_META);
      else if (window.CURR) out = Object.keys(window.CURR);
    } catch (e) {}
    var seen = {}, res = [];
    for (var i = 0; i < out.length; i++) { if (out[i] && !seen[out[i]]) { seen[out[i]] = 1; res.push(out[i]); } }
    return res;
  }
  function clsName(i) {
    try {
      if (typeof CLASSES !== "undefined" && CLASSES && CLASSES[i] && CLASSES[i].class) return CLASSES[i].class;
    } catch (e) {}
    return ["SS1", "SS2", "SS3"][i] || "SS1";
  }
  function topics(s) {
    try { if (window.CURR && window.CURR[s] && window.CURR[s].length) return window.CURR[s]; } catch (e) {}
    try {
      if (typeof TOPICS !== "undefined" && TOPICS && TOPICS[s]) {
        return TOPICS[s].map(function (t) { return [t[0], t[1] || [], "", []]; });
      }
    } catch (e) {}
    return [];
  }
  function classQs(s, ci) {
    var out = [];
    try {
      if (typeof CLASSES !== "undefined" && CLASSES && CLASSES[ci]) {
        var qs = CLASSES[ci].questions || [];
        for (var i = 0; i < qs.length; i++) if (qs[i].s === s) out.push(qs[i]);
      }
    } catch (e) {}
    return out;
  }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function splitLines(text, max) {
    var words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
    var lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if ((cur + " " + w).trim().length > max && cur) { lines.push(cur.trim()); cur = w; }
      else cur += " " + w;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines.slice(0, 4);
  }

  /* ================= SCRIPT BUILDER ================= */
  function build(subj, ci, topicOnly) {
    ci = (ci === 1 || ci === 2) ? ci : 0;
    var S = subjects();
    if (S.indexOf(subj) < 0) subj = S[0] || "Mathematics";
    var tp = topics(subj);
    if (topicOnly) tp = tp.filter(function (t) { return t && t[0] === topicOnly; });
    var qs = classQs(subj, ci);
    var scenes = [];
    var cn = clsName(ci);
    scenes.push({
      k: "title", head: subj,
      lines: [cn + " · AI Explainer", tp.length + " topics · " + qs.length + " practice questions"],
      voice: subj + ", " + cn + ". An auto-generated explainer with " + tp.length + " topics.", dur: 3.5
    });
    for (var i = 0; i < tp.length; i++) {
      var t = tp[i];
      if (!t || !t[0]) continue;
      var sum = t[2] || ("Key ideas in " + t[0] + ".");
      var kw = Array.isArray(t[1]) ? t[1].slice(0, 4).join(" · ") : "";
      var lines = splitLines(sum, 64).slice(0, 3);
      if (kw) lines.push("Keys: " + kw);
      scenes.push({ k: "topic", head: (i + 1) + ". " + t[0], lines: lines, voice: t[0] + ". " + sum, dur: Math.min(12, Math.max(7, 5 + lines.length * 1.6)) });
    }
    /* quiz scene: 2 deterministic class questions with a mid-scene reveal */
    if (qs.length) {
      var h = hash(subj + cn), picks = [];
      for (var p = 0; p < Math.min(2, qs.length); p++) picks.push(qs[(h + p * 7) % qs.length]);
      var ql = [], qv = [];
      for (var q = 0; q < picks.length; q++) {
        var Q = picks[q];
        ql.push("Q" + (q + 1) + ": " + Q.q);
        ql.push("¿ans¿" + "A" + (q + 1) + ": " + (Q.o && Q.o[Q.a] != null ? Q.o[Q.a] : ""));
        qv.push(Q.q + " The answer is " + (Q.o && Q.o[Q.a] != null ? Q.o[Q.a] : "") + ".");
      }
      scenes.push({ k: "quiz", head: "✍️ Quick check", lines: ql, voice: "Quick check. " + qv.join(" "), dur: 9 });
    }
    if (!tp.length && !qs.length) {
      scenes.push({ k: "topic", head: "Coming online", lines: ["Content for " + subj + " is still loading.", "Reconnect once, then replay this reel offline."], voice: "Content is still loading.", dur: 5 });
    }
    scenes.push({
      k: "outro", head: "🔁 Your turn",
      lines: ["Drill " + subj + " now —", "every answer sharpens your mastery map."],
      voice: "Your turn. Drill " + subj + " now.", dur: 4
    });
    var total = 0;
    for (var s2 = 0; s2 < scenes.length; s2++) total += scenes[s2].dur;
    return { subj: subj, ci: ci, cls: cn, topic: topicOnly || null, scenes: scenes, total: Math.round(total) };
  }

  /* ================= PLAYER ================= */
  var R = { reel: null, si: 0, t0: 0, playing: false, speed: 1, voice: true, raf: 0, parts: [], rec: null, chunks: [], dirty: true };
  try { R.voice = ls(VOICEK, true) !== false; } catch (e) {}
  var SPEEDS = [1, 1.5, 2];

  function cv() { return $("reCv"); }
  function ctx2d() { try { var c = cv(); return c ? c.getContext("2d") : null; } catch (e) { return null; } }
  function sceneDur(sc) { return (sc.dur || 6) * 1000 / (R.speed || 1); }

  function speak(text) {
    try {
      if (!R.voice || !text) return;
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(String(text).slice(0, 600));
      u.rate = 1; u.pitch = 1;
      try {
        var vs = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        for (var i = 0; i < vs.length; i++) {
          if (vs[i] && vs[i].lang && /en[-_]NG|en[-_]GB|en/i.test(vs[i].lang)) { u.voice = vs[i]; break; }
        }
      } catch (e) {}
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hush() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }

  function seedParts() {
    R.parts = [];
    var h = R.reel ? hash(R.reel.subj + R.reel.cls) : 7;
    for (var i = 0; i < 26; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      R.parts.push({ x: (h % 960) / 960, y: ((h >> 7) % 540) / 540, r: 1 + (h % 3), s: 6 + (h % 14) });
    }
  }
  function wrap(x, text, maxW) {
    var words = String(text).split(" "), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      try {
        if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
        else cur = t;
      } catch (e) { cur = t; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
  function draw(now) {
    var c = cv(), x = ctx2d();
    if (!c || !x || !R.reel) return;
    var W = c.width || 960, H = c.height || 540;
    var sc = R.reel.scenes[R.si] || { head: "", lines: [] };
    var el = R.playing ? (now - R.t0) : (R.frozen != null ? R.frozen : 0);
    var p = Math.max(0, Math.min(1, el / sceneDur(sc)));
    var still = rm();
    try {
      var g = x.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#141b36"); g.addColorStop(0.55, "#1d2444"); g.addColorStop(1, "#2b2113");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      /* gold aura */
      var ag = x.createRadialGradient(W * 0.82, H * 0.12, 10, W * 0.82, H * 0.12, W * 0.55);
      ag.addColorStop(0, "rgba(220,184,95,.30)"); ag.addColorStop(1, "rgba(220,184,95,0)");
      x.fillStyle = ag; x.fillRect(0, 0, W, H);
      /* particles */
      if (!still) {
        x.fillStyle = "rgba(238,207,126,.5)";
        for (var i = 0; i < R.parts.length; i++) {
          var pt = R.parts[i];
          var yy = ((pt.y * H - (now / 1000) * pt.s) % (H + 20) + H + 20) % (H + 20) - 10;
          x.beginPath(); x.arc(pt.x * W, yy, pt.r, 0, 6.2832); x.fill();
        }
      }
      /* frame */
      x.strokeStyle = "rgba(220,184,95,.55)"; x.lineWidth = 3;
      x.strokeRect(14, 14, W - 28, H - 28);
      /* kicker */
      x.fillStyle = "#eecf7e"; x.font = "700 24px Georgia,serif"; x.textAlign = "left";
      x.fillText((R.reel.subj + " · " + R.reel.cls).slice(0, 44), 44, 66);
      /* head */
      var hx = still ? 44 : 44 - (1 - Math.min(1, p * 3)) * 26;
      x.fillStyle = "#fdf6e3"; x.font = "900 44px Georgia,serif";
      var hl = wrap(x, sc.head || "", W - 180);
      for (var hh = 0; hh < hl.length; hh++) x.fillText(hl[hh], hx, 128 + hh * 52);
      /* caption lines */
      x.font = "400 27px Georgia,serif";
      var y = 128 + hl.length * 52 + 18;
      var reveal = sc.k === "quiz" ? p > 0.45 : true;
      var li = 0;
      for (var L = 0; L < sc.lines.length; L++) {
        var raw = sc.lines[L];
        var isAns = raw.indexOf("¿ans¿") === 0;
        if (isAns && !reveal) continue;
        var txt = isAns ? raw.slice(5) : raw;
        var wl = wrap(x, txt, W - 200);
        for (var wli = 0; wli < wl.length; wli++) {
          var lp = still ? 1 : Math.min(1, Math.max(0, (p * 1.15 - li * 0.09) * 4));
          if (lp <= 0) { li++; continue; }
          x.globalAlpha = lp;
          x.fillStyle = isAns ? "#9fe6b4" : "#f2e8cf";
          var lx = still ? 64 : 64 - (1 - lp) * 18;
          x.fillText(wl[wli], lx, y);
          x.globalAlpha = 1;
          y += 40; li++;
          if (y > H - 90) break;
        }
        if (y > H - 90) break;
      }
      if (sc.k === "quiz" && !reveal) {
        x.fillStyle = "#eecf7e"; x.font = "italic 700 26px Georgia,serif";
        x.fillText("…think — answers appear in a moment…", 64, Math.min(y + 6, H - 96));
      }
      /* progress */
      x.fillStyle = "rgba(255,255,255,.18)";
      x.fillRect(44, H - 52, W - 88, 8);
      x.fillStyle = "#e6c453";
      x.fillRect(44, H - 52, (W - 88) * p, 8);
      x.fillStyle = "#cdb87a"; x.font = "700 20px Georgia,serif";
      x.textAlign = "right";
      x.fillText("Scene " + (R.si + 1) + "/" + R.reel.scenes.length, W - 44, H - 62);
      x.textAlign = "left";
    } catch (e) {}
  }
  function tick() {
    var now = Date.now(); /* wall clock, not the rAF stamp (different epoch) */
    if (!R.playing || !R.reel) return;
    var sc = R.reel.scenes[R.si];
    if (!sc) { pause(); return; }
    if (now - R.t0 >= sceneDur(sc)) {
      if (R.si + 1 < R.reel.scenes.length) { setScene(R.si + 1, true); loop(); }
      else { pause(true); }
      return;
    }
    draw(now);
    try { R.raf = requestAnimationFrame(tick); } catch (e) { R.raf = setTimeout(function () { tick(Date.now()); }, 66); }
  }
  function loop() {
    try {
      if (R.raf) { try { cancelAnimationFrame(R.raf); } catch (e) {} try { clearTimeout(R.raf); } catch (e) {} }
    } catch (e) {}
    try { R.raf = requestAnimationFrame(tick); } catch (e) { R.raf = setTimeout(function () { tick(Date.now()); }, 66); }
  }
  function setScene(i, speakIt) {
    if (!R.reel) return;
    R.si = Math.max(0, Math.min(R.reel.scenes.length - 1, i));
    R.t0 = Date.now(); R.frozen = 0;
    markDots();
    var lv = $("reLive");
    if (lv) { try { lv.textContent = (R.reel.scenes[R.si].head || "") + ". " + (R.reel.scenes[R.si].lines || []).join(" "); } catch (e) {} }
    if (speakIt && R.playing) speak(R.reel.scenes[R.si].voice);
    draw(Date.now());
    paintTransport();
  }
  function play() {
    if (!R.reel) return false;
    if (R.si >= R.reel.scenes.length - 1 && !R.playing && R.ended) { R.si = 0; R.ended = false; }
    R.playing = true;
    R.t0 = Date.now() - (R.frozen || 0);
    R.frozen = 0;
    speak(R.reel.scenes[R.si].voice);
    try { var lv = $("reLive"); if (lv) lv.textContent = R.reel.scenes[R.si].head; } catch (e) {}
    loop();
    paintTransport();
    pushRecent();
    return true;
  }
  function pause(ended) {
    R.playing = false;
    R.ended = !!ended;
    try { if (R.raf) { try { cancelAnimationFrame(R.raf); } catch (e) {} try { clearTimeout(R.raf); } catch (e) {} R.raf = 0; } } catch (e) {}
    try { R.frozen = ended ? 0 : Math.min(Date.now() - R.t0, sceneDur(R.reel.scenes[R.si])); } catch (e) { R.frozen = 0; }
    hush();
    draw(Date.now());
    paintTransport();
  }
  function stopAll() { pause(); try { stopRec(false); } catch (e) {} }
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

  /* ---------- recording (WebM export) ---------- */
  function recSupported() {
    try {
      var c = cv();
      return !!(c && c.captureStream && window.MediaRecorder);
    } catch (e) { return false; }
  }
  function startRec() {
    if (!recSupported()) {
      try { if (typeof toast === "function") toast("Recording is not supported in this browser — enjoy the reel here", "🎥"); } catch (e) {}
      return false;
    }
    try {
      var c = cv(), stream = c.captureStream(30);
      var mime = "";
      var cands = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      for (var i = 0; i < cands.length; i++) {
        try { if (window.MediaRecorder.isTypeSupported(cands[i])) { mime = cands[i]; break; } } catch (e) {}
      }
      var mr = mime ? new window.MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 }) : new window.MediaRecorder(stream);
      R.chunks = [];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) R.chunks.push(e.data); };
      mr.onstop = function () {
        try {
          var blob = new Blob(R.chunks, { type: "video/webm" });
          var url = URL.createObjectURL(blob);
          var dl = $("reDl");
          if (dl) {
            dl.innerHTML = '<a class="re-dl" href="' + url + '" download="' + esc((R.reel ? (R.reel.subj + "-" + R.reel.cls) : "reel").replace(/[^A-Za-z0-9]+/g, "-")) + '.webm">⬇ Download WebM (' + (blob.size / 1024).toFixed(0) + " KB)</a>";
          }
          if (typeof toast === "function") toast("Recording saved — download it below the player", "🎥");
        } catch (e) {}
        R.rec = null;
        paintTransport();
      };
      mr.start(250);
      R.rec = mr;
      if (!R.playing) play();
      else paintTransport();
      return true;
    } catch (e) {
      try { if (typeof toast === "function") toast("Recording could not start here", "🎥"); } catch (e) {}
      return false;
    }
  }
  function stopRec() {
    try { if (R.rec && R.rec.state !== "inactive") R.rec.stop(); } catch (e) {}
    R.rec = null;
    paintTransport();
  }

  /* ================= UI ================= */
  var pick = { subj: null, ci: 0, topic: null };
  function paintTransport() {
    var b = $("rePlay");
    if (b) b.textContent = R.playing ? "⏸ Pause" : (R.ended ? "↻ Replay" : "▶ Play");
    var sp = $("reSpeed");
    if (sp) sp.textContent = "⚡ " + R.speed + "×";
    var vb = $("reVoice");
    if (vb) { vb.textContent = R.voice ? "🔊 Voice on" : "🔇 Voice off"; vb.classList.toggle("on", !!R.voice); }
    var rb = $("reRec");
    if (rb) { rb.textContent = R.rec ? "⏹ Stop" : "⏺ Record"; rb.classList.toggle("on", !!R.rec); }
    var mt = $("reMeta");
    if (mt && R.reel) {
      var el2 = 0;
      for (var i = 0; i < R.si; i++) el2 += R.reel.scenes[i].dur;
      mt.textContent = fmt(el2 / (R.speed || 1)) + " / " + fmt(R.reel.total / (R.speed || 1)) + " · " + R.reel.scenes.length + " scenes";
    }
    markDots();
  }
  function markDots() {
    try {
      Array.prototype.forEach.call(document.querySelectorAll(".re-dot"), function (d, i) {
        d.classList.toggle("on", i === R.si);
      });
      Array.prototype.forEach.call(document.querySelectorAll(".re-srow"), function (r, i) {
        r.classList.toggle("on", i === R.si);
      });
    } catch (e) {}
  }
  function pushRecent() {
    try {
      if (!R.reel) return;
      var r = ls(RECENT, []);
      r = r.filter(function (x) { return !(x && x.s === R.reel.subj && x.c === R.reel.ci); });
      r.unshift({ s: R.reel.subj, c: R.reel.ci });
      lss(RECENT, r.slice(0, 6));
      paintRecent();
    } catch (e) {}
  }
  function paintRecent() {
    var w = $("reRecent");
    if (!w) return;
    var r = ls(RECENT, []);
    if (!r || !r.length) { w.innerHTML = ""; return; }
    w.innerHTML = "<span>🕘 Recent:</span> " + r.map(function (x) {
      return '<button type="button" class="re-chip" data-rs="' + esc(x.s) + '" data-rc="' + (+x.c || 0) + '">' + esc(x.s) + " · " + esc(clsName(+x.c || 0)) + "</button>";
    }).join("");
    Array.prototype.forEach.call(w.querySelectorAll("[data-rs]"), function (b) {
      b.addEventListener("click", function () {
        pick.subj = b.getAttribute("data-rs"); pick.ci = +b.getAttribute("data-rc") || 0; pick.topic = null;
        syncPicker(); rebuild();
      });
    });
  }
  function syncPicker() {
    var S = subjects();
    if (S.indexOf(pick.subj) < 0) pick.subj = S[0] || "Mathematics";
    var sel = $("reSubj");
    if (sel) sel.value = pick.subj;
    Array.prototype.forEach.call(document.querySelectorAll("#reCls .re-chip"), function (b) {
      b.classList.toggle("on", +b.getAttribute("data-c") === pick.ci);
    });
    paintTopics();
    var sub = $("reSub");
    if (sub) sub.innerHTML = "<b>" + S.length + "</b> subjects × <b>SS1–SS3</b> · auto-generated on your device — no internet needed";
  }
  function paintTopics() {
    var w = $("reTopics");
    if (!w) return;
    var tp = topics(pick.subj);
    var h = '<button type="button" class="re-chip t' + (!pick.topic ? " on" : "") + '" data-t="">All topics</button>';
    for (var i = 0; i < tp.length; i++) {
      if (!tp[i] || !tp[i][0]) continue;
      h += '<button type="button" class="re-chip t' + (pick.topic === tp[i][0] ? " on" : "") + '" data-t="' + esc(tp[i][0]) + '">' + esc(tp[i][0]) + "</button>";
    }
    w.innerHTML = h;
    Array.prototype.forEach.call(w.querySelectorAll("[data-t]"), function (b) {
      b.addEventListener("click", function () { pick.topic = b.getAttribute("data-t") || null; paintTopics(); rebuild(); });
    });
  }
  function rebuild() {
    stopAll();
    R.ended = false;
    R.reel = build(pick.subj, pick.ci, pick.topic);
    R.si = 0; R.frozen = 0;
    seedParts();
    var dl = $("reDl"); if (dl) dl.innerHTML = "";
    paintDots(); paintScript(); paintTransport();
    draw(Date.now());
  }
  function paintDots() {
    var w = $("reDots");
    if (!w || !R.reel) return;
    var h = "";
    for (var i = 0; i < R.reel.scenes.length; i++) h += '<button type="button" class="re-dot' + (i === R.si ? " on" : "") + '" data-i="' + i + '" aria-label="Scene ' + (i + 1) + '"></button>';
    w.innerHTML = h;
    Array.prototype.forEach.call(w.querySelectorAll(".re-dot"), function (d) {
      d.addEventListener("click", function () { setScene(+d.getAttribute("data-i"), true); });
    });
  }
  function paintScript() {
    var w = $("reScript");
    if (!w || !R.reel) return;
    w.innerHTML = R.reel.scenes.map(function (sc, i) {
      var first = (sc.lines[0] || "").replace(/^¿ans¿/, "");
      return '<button type="button" class="re-srow' + (i === R.si ? " on" : "") + '" data-i="' + i + '"><b>' + (i + 1) + ". " + esc(sc.head) + "</b><small>" + esc(first.slice(0, 120)) + "</small></button>";
    }).join("");
    Array.prototype.forEach.call(w.querySelectorAll(".re-srow"), function (r) {
      r.addEventListener("click", function () { setScene(+r.getAttribute("data-i"), true); });
    });
  }
  function surprise() {
    var S = subjects();
    if (!S.length) return false;
    pick.subj = S[Math.floor(Math.random() * S.length)];
    pick.ci = Math.floor(Math.random() * 3);
    pick.topic = null;
    if (!$("reOv")) open(pick.subj, pick.ci);
    else { syncPicker(); rebuild(); }
    play();
    return true;
  }

  function open(subj, ci) {
    css();
    try { document.documentElement.classList.add("reels"); } catch (e) {}
    var S = subjects();
    if (subj && S.indexOf(subj) >= 0) pick.subj = subj;
    if (!pick.subj || S.indexOf(pick.subj) < 0) {
      var r = ls(RECENT, []);
      pick.subj = (r && r[0] && S.indexOf(r[0].s) >= 0) ? r[0].s : (S[0] || "Mathematics");
      if (r && r[0] && S.indexOf(r[0].s) >= 0) pick.ci = +r[0].c || 0;
    }
    if (ci === 0 || ci === 1 || ci === 2) pick.ci = ci;
    pick.topic = null;
    var ov = $("reOv");
    if (ov) {
      ov.style.display = "flex";
      syncPicker(); rebuild();
      return;
    }
    ov = document.createElement("div");
    ov.id = "reOv";
    ov.className = "re-ov";
    ov.setAttribute("aria-label", "AI Explainer Reels");
    var opts = S.map(function (s) { return '<option value="' + esc(s) + '"' + (s === pick.subj ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("");
    ov.innerHTML =
      '<div class="re-box" role="dialog" aria-label="AI Explainer Reels">' +
        '<div class="re-h"><span>✨ AI Explainer Reels</span><button class="re-x" id="reX" aria-label="Close">✕</button></div>' +
        '<div class="re-sub" id="reSub"></div>' +
        '<div class="re-pick"><select class="re-sel" id="reSubj" aria-label="Subject">' + opts + "</select>" +
        '<div class="re-chips" id="reCls"><button type="button" class="re-chip" data-c="0">SS1</button><button type="button" class="re-chip" data-c="1">SS2</button><button type="button" class="re-chip" data-c="2">SS3</button><button type="button" class="re-chip" id="reSur">🎲 Surprise me</button></div></div>' +
        '<div class="re-chips" id="reTopics" style="margin-bottom:10px"></div>' +
        '<div class="re-stage" id="reStage"><canvas id="reCv" width="960" height="540"></canvas><span class="re-live" id="reLive" aria-live="polite"></span></div>' +
        '<div class="re-tbar"><button type="button" class="re-btn pri" id="rePlay">▶ Play</button>' +
        '<button type="button" class="re-btn" id="rePrev">⏮ Prev</button><button type="button" class="re-btn" id="reNext">⏭ Next</button>' +
        '<button type="button" class="re-btn" id="reSpeed">⚡ 1×</button>' +
        '<button type="button" class="re-btn" id="reVoice">🔊 Voice on</button>' +
        '<button type="button" class="re-btn" id="reFull">⛶ Full</button>' +
        '<button type="button" class="re-btn" id="reRec">⏺ Record</button>' +
        '<span class="re-meta" id="reMeta"></span></div>' +
        '<div class="re-dots" id="reDots"></div>' +
        '<div id="reDl" style="margin-top:6px"></div>' +
        '<div class="re-script" id="reScript"></div>' +
        '<div class="re-recent" id="reRecent"></div>' +
      "</div>";
    document.body.appendChild(ov);
    $("reX").onclick = close;
    ov.addEventListener("pointerdown", function (e) { if (e.target === ov) close(); });
    $("reSubj").addEventListener("change", function () { pick.subj = this.value; pick.topic = null; paintTopics(); rebuild(); });
    Array.prototype.forEach.call(document.querySelectorAll("#reCls [data-c]"), function (b) {
      b.addEventListener("click", function () { pick.ci = +b.getAttribute("data-c"); syncPicker(); rebuild(); });
    });
    $("reSur").addEventListener("click", function () { surprise(); });
    $("rePlay").addEventListener("click", function () { if (R.playing) pause(); else play(); });
    $("rePrev").addEventListener("click", function () { setScene(R.si - 1, true); });
    $("reNext").addEventListener("click", function () { setScene(R.si + 1, true); });
    $("reSpeed").addEventListener("click", function () {
      var i = SPEEDS.indexOf(R.speed);
      R.speed = SPEEDS[(i + 1) % SPEEDS.length];
      if (R.playing) R.t0 = Date.now(); /* current scene restarts at the new speed */
      paintTransport();
    });
    $("reVoice").addEventListener("click", function () {
      R.voice = !R.voice; lss(VOICEK, R.voice);
      if (!R.voice) hush();
      else if (R.playing && R.reel) speak(R.reel.scenes[R.si].voice);
      paintTransport();
    });
    $("reFull").addEventListener("click", function () {
      try {
        var st = $("reStage");
        if (document.fullscreenElement) document.exitFullscreen();
        else if (st && st.requestFullscreen) st.requestFullscreen();
      } catch (e) {}
    });
    $("reRec").addEventListener("click", function () { if (R.rec) stopRec(); else startRec(); });
    document.addEventListener("keydown", function (e) {
      if (!$("reOv")) return;
      if (e.key === " " && /BODY|BUTTON/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); if (R.playing) pause(); else play(); }
      else if (e.key === "ArrowRight") setScene(R.si + 1, true);
      else if (e.key === "ArrowLeft") setScene(R.si - 1, true);
    });
    syncPicker(); rebuild();
  }
  function close() {
    stopAll();
    var ov = $("reOv");
    if (ov) { try { ov.remove(); } catch (e) { ov.style.display = "none"; } }
  }

  /* ---------------- chips + palette ---------------- */
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
    var b = mk("reelsLaunch", "✨", "AI Reels", "auto explainers · every subject", function () { open(); });
    if (w) w.insertBefore(b, w.lastChild);
    else {
      var grp = document.createElement("div");
      grp.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
      grp.appendChild(b);
      host.insertBefore(grp, host.querySelector(".stats"));
    }
  }
  function hooks() {
    var h = function (add) {
      add("Watch", "✨", "AI Explainer Reels", "Auto-generated video lessons for every subject", function () { open(); });
      add("Watch", "🎲", "Play a surprise reel", "A random subject × class explainer", function () { surprise(); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  function boot() {
    css();
    try { document.documentElement.classList.add("reels"); } catch (e) {}
    try { chips(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.getElementById("reOv")) close();
      });
    } catch (e) {}
    window.__reelsApi = {
      open: open, close: close, build: build, play: play, pause: pause,
      surprise: surprise, subjects: subjects, topics: topics,
      state: function () { return { si: R.si, playing: R.playing, scenes: R.reel ? R.reel.scenes.length : 0 }; },
      prog: function () { try { if (!R.reel) return 0; var sc = R.reel.scenes[R.si]; var el = R.playing ? (Date.now() - R.t0) : (R.frozen || 0); return Math.max(0, Math.min(1, el / sceneDur(sc))); } catch (e) { return 0; } },
      version: 37
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
