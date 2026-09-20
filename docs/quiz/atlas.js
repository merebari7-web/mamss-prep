/* v36.0 — Curriculum Atlas (lazy, boot-safe, loaded by polish.js at idle).
   A visual explorer for the full 27-subject Nigerian senior-secondary
   curriculum:
   🗺 subject grid — every subject with its crest glyph + colour, live
   question counts and YOUR accuracy from real attempts
   📖 topic drill-down — curriculum summaries, sample-question counts,
   one-tap 🔁 drills and 🧠 Ask-AI per topic
   🗓 scheme of work — the 3-term topic plan for every subject
   🔎 search across subjects + topics · 📤 share · 🎲 surprise drill
   Also runs the global topic tagger once the lazy curriculum lands, so
   the 267 curriculum questions join topic drills, the mastery map and
   worksheets. Additive, fails silent. */
(function () {
  "use strict";
  if (window.__atlas) return;
  window.__atlas = 1;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var CSS =
    "html.atlas .at-ov{position:fixed;inset:0;z-index:132;background:rgba(8,10,20,.55);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.atlas .at-box{width:min(880px,100%);max-height:94dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.55);box-shadow:0 46px 100px -34px rgba(0,0,0,.85);padding:14px;color:var(--ink,#20302a)}" +
    "html.atlas .at-h{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:800}" +
    "html.atlas .at-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.atlas .at-x:hover{background:rgba(0,0,0,.06)}" +
    "html.atlas .at-share{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:99px;padding:5px 12px;font-size:.68rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.atlas .at-share:hover{border-color:#c9a25f}" +
    "html.atlas .at-sub{font-size:.68rem;color:var(--mut,#8a7a5c);margin:2px 0 9px}" +
    "html.atlas .at-sub b{color:#8a6a30}" +
    "html.atlas .at-search{width:100%;box-sizing:border-box;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:10px 12px;font-size:.85rem;color:var(--ink,#20302a);font-family:inherit;outline:none}" +
    "html.atlas .at-search:focus{border-color:#c9a25f;box-shadow:0 0 0 3px rgba(201,162,39,.22)}" +
    "html.atlas .at-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}" +
    "html.atlas .at-subj{display:flex;gap:9px;align-items:center;text-align:left;border:1px solid var(--card-border,#e0d3b2);background:var(--panel,#f7f1e2);border-radius:14px;padding:10px;cursor:pointer;font-family:inherit;color:var(--ink,#20302a);transition:transform .18s,border-color .18s,box-shadow .18s}" +
    "html.atlas .at-subj:hover{transform:translateY(-2px);border-color:#c9a25f;box-shadow:0 12px 26px -16px rgba(140,100,30,.6)}" +
    "html.atlas .at-g{flex:none;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:.6rem;font-weight:900;letter-spacing:.02em;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 10px -4px rgba(0,0,0,.4)}" +
    "html.atlas .at-nm{display:block;font-size:.74rem;font-weight:800;line-height:1.25}" +
    "html.atlas .at-mt{display:block;font-size:.62rem;color:var(--mut,#8a7a5c);margin-top:2px}" +
    "html.atlas .at-mt b{color:#5b3d09}" +
    "html.atlas .at-mt .good{color:#0e7a3d;font-weight:800}" +
    "html.atlas .at-mt .mid{color:#8a6a30;font-weight:800}" +
    "html.atlas .at-mt .low{color:#a33;font-weight:800}" +
    "html.atlas .at-back{border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:99px;padding:5px 13px;font-size:.7rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;margin-bottom:9px}" +
    "html.atlas .at-back:hover{border-color:#c9a25f}" +
    "html.atlas .at-dh{display:flex;gap:10px;align-items:center;margin-bottom:9px}" +
    "html.atlas .at-dh .at-g{width:40px;height:40px;font-size:.72rem}" +
    "html.atlas .at-dt{font-size:.92rem;font-weight:900}" +
    "html.atlas .at-dm{font-size:.66rem;color:var(--mut,#8a7a5c)}" +
    "html.atlas .at-topics{display:grid;grid-template-columns:1fr;gap:8px}" +
    "html.atlas .at-topic{border:1px solid var(--card-border,#e0d3b2);background:var(--card-solid,#fff);border-radius:14px;padding:10px 11px}" +
    "html.atlas .at-tn{font-size:.78rem;font-weight:800}" +
    "html.atlas .at-ts{font-size:.68rem;color:var(--ink-2,#4a5877);line-height:1.55;margin-top:3px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}" +
    "html.atlas .at-tm{font-size:.6rem;color:var(--mut,#8a7a5c);margin-top:4px}" +
    "html.atlas .at-row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}" +
    "html.atlas .at-btn{border:1px solid transparent;background:linear-gradient(135deg,#eccf8e,#c9a25f);color:#241a05;font-weight:800;border-radius:99px;padding:6px 14px;font-size:.68rem;cursor:pointer;font-family:inherit}" +
    "html.atlas .at-btn:hover{filter:brightness(1.05)}" +
    "html.atlas .at-btn.alt{background:transparent;border-color:var(--card-border,#cbb386);color:var(--ink,#20302a)}" +
    "html.atlas .at-btn.alt:hover{border-color:#c9a25f}" +
    "html.atlas .at-syll{margin-top:12px}" +
    "html.atlas .at-sy{font-size:.74rem;font-weight:900;margin-bottom:6px}" +
    "html.atlas .at-terms{display:grid;grid-template-columns:1fr;gap:8px}" +
    "html.atlas .at-term{border:1px solid var(--card-border,#e0d3b2);background:var(--panel,#f7f1e2);border-radius:12px;padding:8px 10px}" +
    "html.atlas .at-tt{font-size:.66rem;font-weight:900;color:#8a6a30;letter-spacing:.04em;margin-bottom:4px}" +
    "html.atlas .at-term ul{margin:0;padding-left:16px;font-size:.64rem;color:var(--ink-2,#4a5877);line-height:1.6}" +
    "html.atlas .at-empty{font-size:.74rem;color:var(--mut,#8a7a5c);text-align:center;padding:22px 8px}" +
    "@media (min-width:720px){html.atlas .at-topics{grid-template-columns:1fr 1fr}html.atlas .at-terms{grid-template-columns:1fr 1fr 1fr}}" +
    "@media (max-width:480px){html.atlas .at-grid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr))}html.atlas .at-nm{font-size:.66rem}}" +
    "@media (prefers-reduced-motion:no-preference){html.atlas .at-box{animation:atPop .28s cubic-bezier(.2,.8,.3,1.1)}@keyframes atPop{from{transform:translateY(12px) scale(.985);opacity:.4}to{transform:none;opacity:1}}}" +
    "@media print{html.atlas .at-ov{display:none!important}}";

  function css() { if (!$("atCss")) { var s = document.createElement("style"); s.id = "atCss"; s.textContent = CSS; document.head.appendChild(s); } }

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
  function meta(s) {
    try {
      if (typeof SUBJECT_META !== "undefined" && SUBJECT_META && SUBJECT_META[s]) {
        var m = SUBJECT_META[s];
        return { icon: m.icon || String(s).slice(0, 2).toUpperCase(), c: m.c || "#8a6d1f" };
      }
    } catch (e) {}
    return { icon: String(s).slice(0, 2).toUpperCase(), c: "#8a6d1f" };
  }
  var _cc = null, _ccStamp = -1;
  function counts() {
    try {
      if (typeof CLASSES === "undefined" || !CLASSES || !CLASSES.length) return { per: {}, tot: 0 };
      var tot = 0, i, j;
      for (i = 0; i < CLASSES.length; i++) tot += CLASSES[i].questions ? CLASSES[i].questions.length : 0;
      if (_cc && _ccStamp === tot) return _cc;
      var per = {};
      for (i = 0; i < CLASSES.length; i++) {
        var qs = CLASSES[i].questions || [];
        for (j = 0; j < qs.length; j++) { var s = qs[j].s; if (s) per[s] = (per[s] || 0) + 1; }
      }
      _cc = { per: per, tot: tot }; _ccStamp = tot;
      return _cc;
    } catch (e) { return { per: {}, tot: 0 }; }
  }
  function acc() {
    /* per-subject accuracy from real attempts: r.sp {subj:[ok,n]} first,
       then r.subj + r.pct fallback. Defensive over every record shape. */
    var per = {};
    try {
      if (typeof attempts !== "function") return per;
      var recs = attempts() || [];
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (!r || typeof r !== "object") continue;
        if (r.sp && typeof r.sp === "object") {
          for (var s in r.sp) {
            var v = r.sp[s];
            if (v && v.length >= 2 && +v[1] > 0) {
              per[s] = per[s] || [0, 0];
              per[s][0] += +v[0] || 0; per[s][1] += +v[1] || 0;
            }
          }
        } else {
          var sj = r.subj || r.s || r.subject;
          var p = (r.pct != null ? r.pct : (r.score != null ? r.score : r.percent));
          if (sj && sj !== "All subjects" && sj !== "Mixed syllabus" && isFinite(+p)) {
            per[sj] = per[sj] || [0, 0];
            per[sj][0] += (+p) / 100; per[sj][1] += 1;
          }
        }
      }
    } catch (e) {}
    return per;
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
  function syll(s) {
    try { if (window.SYLL && window.SYLL[s]) return window.SYLL[s]; } catch (e) {}
    return [];
  }

  /* ============ TOPIC TAGGING (one-shot) ============ */
  var tagged = 0, tagDone = false;
  function tagOnce() {
    if (tagDone) return tagged;
    try {
      if (typeof tagAll !== "function") return tagged;
      if (typeof CLASSES === "undefined" || !CLASSES || !CLASSES.length) return tagged;
      if (!window.__curicApi) return tagged; /* wait for the lazy curriculum */
      var before = 0, i, j;
      for (i = 0; i < CLASSES.length; i++) {
        var qs = CLASSES[i].questions || [];
        for (j = 0; j < qs.length; j++) if (!qs[j].t) before++;
      }
      tagAll();
      var after = 0;
      for (i = 0; i < CLASSES.length; i++) {
        var qs2 = CLASSES[i].questions || [];
        for (j = 0; j < qs2.length; j++) if (!qs2[j].t) after++;
      }
      tagged = Math.max(0, before - after);
      tagDone = true;
      _cc = null;
    } catch (e) {}
    return tagged;
  }

  /* ================= DRILLS ================= */
  function clsList() {
    try { if (typeof CLASSES !== "undefined" && CLASSES && CLASSES.length) return CLASSES; } catch (e) {}
    return [];
  }
  function curCls() {
    try { if (typeof state !== "undefined" && state && state.cls != null && clsList()[state.cls]) return state.cls; } catch (e) {}
    return -1;
  }
  function ensureCls(pred) {
    /* keep the learner's class; fresh visitors get the richest class */
    var c = curCls();
    if (c >= 0) return c;
    var L = clsList(), best = 0, bn = -1;
    for (var i = 0; i < L.length; i++) {
      var n = 0, qs = L[i].questions || [];
      for (var j = 0; j < qs.length; j++) { try { if (pred(qs[j])) n++; } catch (e) {} }
      if (n > bn) { bn = n; best = i; }
    }
    try {
      if (typeof state !== "undefined" && state) state.cls = best;
      var tabs = document.querySelectorAll("#classTabs .tab, #classTabs .chip, #classTabs button");
      if (tabs && tabs[best] && tabs[best].click) { try { tabs[best].click(); } catch (e) {} }
    } catch (e) {}
    return best;
  }
  function matchCount(t, s, ci) {
    var n = 0;
    try {
      var qs = (clsList()[ci] || {}).questions || [];
      for (var i = 0; i < qs.length; i++) if (qs[i].t === t && (!s || qs[i].s === s)) n++;
    } catch (e) {}
    return n;
  }
  function paperFor(list, s, label) {
    /* study-mode paper builder mirroring drillTopic (shell untouched) */
    try {
      if (typeof state === "undefined" || typeof shuffle !== "function") return false;
      if (!list || !list.length) return false;
      state.subject = s || null;
      state.count = Math.min(20, list.length);
      state.quiz = shuffle(list).slice(0, state.count);
      state.idx = 0; state.answers = []; state.flags = []; state.qTimes = [];
      state.daily = false; state.reviewing = false; state.mock = false; state.mode = "study";
      try { submitting = false; } catch (e) {}
      state.started = Date.now(); state.deadline = 0;
      var a = $("examNote"), b = $("qTimer");
      if (a) a.classList.add("hidden");
      if (b) b.classList.add("hidden");
      if (typeof setCard === "function") setCard("quiz");
      if (typeof renderQ === "function") renderQ();
      if (typeof stopTimer === "function") stopTimer();
      if (typeof saveSession === "function") saveSession();
      if (typeof toast === "function") toast(label + " — " + state.quiz.length + " questions", "🔁");
      return true;
    } catch (e) { return false; }
  }
  function drill(t, s) {
    try { tagOnce(); } catch (e) {}
    var ci = ensureCls(function (q) { return q.t === t && (!s || q.s === s); });
    close();
    if (matchCount(t, s, ci) > 0 && typeof drillTopic === "function") {
      try { drillTopic(t, s); return true; } catch (e) {}
    }
    /* topic has no tagged questions here — run the subject paper instead */
    return drillSubject(s, true);
  }
  function drillSubject(s, fromTopic) {
    try { tagOnce(); } catch (e) {}
    var ci = ensureCls(function (q) { return !s || q.s === s; });
    close();
    var list = [];
    try {
      var qs = (clsList()[ci] || {}).questions || [];
      for (var i = 0; i < qs.length; i++) if (!s || qs[i].s === s) list.push(qs[i]);
    } catch (e) {}
    if (!list.length) {
      try { if (typeof toast === "function") toast("No practice questions for " + (s || "this class"), "🗂"); } catch (e) {}
      return false;
    }
    var label = fromTopic ? ("Drilling " + s) : (s ? ("Drilling " + s) : "Mixed drill");
    return paperFor(list, s, label);
  }
  function surprise() {
    try {
      tagOnce();
      var ss = subjects(), bag = [];
      for (var i = 0; i < ss.length; i++) {
        var tp = topics(ss[i]);
        for (var j = 0; j < tp.length; j++) if (tp[j] && tp[j][0]) bag.push([tp[j][0], ss[i]]);
      }
      if (!bag.length) return drillSubject(null);
      var p = bag[Math.floor(Math.random() * bag.length)];
      return drill(p[0], p[1]);
    } catch (e) { return false; }
  }

  /* ================= UI ================= */
  var view = { name: "grid", subj: null, q: "" };
  function accBadge(s, A) {
    var v = A[s];
    if (!v || !v[1]) return "";
    var p = Math.round((v[0] / v[1]) * 100);
    var c = p >= 70 ? "good" : p >= 50 ? "mid" : "low";
    return ' · <span class="' + c + '">' + p + "%</span>";
  }
  function headCounts() {
    var S = subjects(), C = counts(), nT = 0, i;
    for (i = 0; i < S.length; i++) nT += topics(S[i]).length;
    return "<b>" + S.length + "</b> subjects · <b>" + C.tot.toLocaleString("en") + "</b> questions · <b>" + nT + "</b> topics";
  }
  function matchQ(s) {
    var q = (view.q || "").toLowerCase().trim();
    if (!q) return true;
    if (String(s).toLowerCase().indexOf(q) >= 0) return true;
    var tp = topics(s);
    for (var i = 0; i < tp.length; i++) {
      if (!tp[i]) continue;
      if (String(tp[i][0] || "").toLowerCase().indexOf(q) >= 0) return true;
      var kw = Array.isArray(tp[i][1]) ? tp[i][1].join(" ") : String(tp[i][1] || "");
      if (kw.toLowerCase().indexOf(q) >= 0) return true;
    }
    return false;
  }
  function render() {
    var body = $("atBody");
    if (!body) return;
    var sub = $("atSub");
    if (sub) sub.innerHTML = headCounts();
    if (view.name === "detail") renderDetail(body);
    else renderGrid(body);
  }
  function renderGrid(body) {
    var S = subjects(), C = counts(), A = acc(), h = "", n = 0, i;
    for (i = 0; i < S.length; i++) {
      if (!matchQ(S[i])) continue;
      n++;
      var m = meta(S[i]);
      h += '<button type="button" class="at-subj" data-s="' + esc(S[i]) + '">' +
        '<span class="at-g" style="background:' + esc(m.c) + '">' + esc(m.icon) + "</span>" +
        "<span><span class='at-nm'>" + esc(S[i]) + "</span>" +
        '<span class="at-mt"><b>' + (C.per[S[i]] || 0) + "</b> Qs" + accBadge(S[i], A) + "</span></span></button>";
    }
    body.innerHTML = n ? '<div class="at-grid">' + h + "</div>"
      : '<div class="at-empty">No subjects match “' + esc(view.q) + "”. Try another word.</div>";
    Array.prototype.forEach.call(body.querySelectorAll(".at-subj"), function (b) {
      b.addEventListener("click", function () { view.name = "detail"; view.subj = b.getAttribute("data-s"); render(); });
    });
  }
  function renderDetail(body) {
    var s = view.subj, m = meta(s), C = counts(), A = acc();
    var tp = topics(s), SY = syll(s), q = (view.q || "").toLowerCase().trim();
    var h = '<button type="button" class="at-back" id="atBack">← All subjects</button>' +
      '<div class="at-dh"><span class="at-g" style="background:' + esc(m.c) + '">' + esc(m.icon) + "</span>" +
      "<span><span class='at-dt'>" + esc(s) + "</span><br>" +
      '<span class="at-dm">' + (C.per[s] || 0) + " questions · " + tp.length + " topics" + accBadge(s, A) + "</span></span></div>";
    var shown = 0, th = "";
    for (var i = 0; i < tp.length; i++) {
      var t = tp[i];
      if (!t || !t[0]) continue;
      if (q) {
        var kw = Array.isArray(t[1]) ? t[1].join(" ") : String(t[1] || "");
        var hay = (t[0] + " " + kw + " " + (t[2] || "")).toLowerCase();
        if (hay.indexOf(q) < 0) continue;
      }
      shown++;
      var samples = Array.isArray(t[3]) ? t[3].length : 0;
      th += '<div class="at-topic"><div class="at-tn">' + esc(t[0]) + "</div>" +
        (t[2] ? '<div class="at-ts">' + esc(t[2]) + "</div>" : "") +
        '<div class="at-tm">' + (samples ? samples + " sample question" + (samples > 1 ? "s" : "") : "Bank questions") + "</div>" +
        '<div class="at-row"><button type="button" class="at-btn" data-dr="' + esc(t[0]) + '">🔁 Drill</button>' +
        '<button type="button" class="at-btn alt" data-ai="' + esc(t[0]) + '">🧠 Ask AI</button></div></div>';
    }
    h += shown ? '<div class="at-topics">' + th + "</div>"
      : '<div class="at-empty">No topics match “' + esc(view.q) + "”.</div>";
    if (SY && SY.length && !q) {
      var terms = ["First Term", "Second Term", "Third Term"], r, k;
      h += '<div class="at-syll"><div class="at-sy">🗓 Scheme of work</div><div class="at-terms">';
      for (var T = 0; T < 3; T++) {
        h += '<div class="at-term"><div class="at-tt">' + terms[T].toUpperCase() + "</div><ul>";
        for (r = T * 3; r < Math.min(SY.length, T * 3 + 3); r++) {
          var row = SY[r] || [];
          for (k = 0; k < row.length; k++) if (row[k]) h += "<li>" + esc(row[k]) + "</li>";
        }
        h += "</ul></div>";
      }
      h += "</div></div>";
    }
    h += '<div class="at-row" style="margin-top:12px"><button type="button" class="at-btn" id="atPractice">📝 Practice ' + esc(s) + " (20)</button></div>";
    body.innerHTML = h;
    var bk = $("atBack");
    if (bk) bk.addEventListener("click", function () { view.name = "grid"; render(); });
    Array.prototype.forEach.call(body.querySelectorAll("[data-dr]"), function (b) {
      b.addEventListener("click", function () { drill(b.getAttribute("data-dr"), view.subj); });
    });
    Array.prototype.forEach.call(body.querySelectorAll("[data-ai]"), function (b) {
      b.addEventListener("click", function () { askAI(view.subj, b.getAttribute("data-ai")); });
    });
    var pr = $("atPractice");
    if (pr) pr.addEventListener("click", function () { drillSubject(view.subj); });
  }
  function askAI(s, t) {
    close();
    try {
      if (window.__aiApi && window.__aiApi.open && window.__aiApi.ask) {
        window.__aiApi.open("ask");
        window.__aiApi.ask(s + ": " + t + " — explain this topic simply");
        return true;
      }
      if (typeof toast === "function") toast("The AI Tutor is still loading — try again in a moment", "🧠");
    } catch (e) {}
    return false;
  }
  function share(s) {
    var subj = s || view.subj;
    var text = subj
      ? "I'm revising " + subj + " (SS1–SS3) on MAMSS Prep — 4,167 explained questions across 27 subjects, free and offline."
      : "MAMSS Prep — 4,167 explained SS1–SS3 questions across 27 subjects, free and offline.";
    var url = "https://merebari7-web.github.io/mamss-prep/";
    try { if (location && location.href && location.href.indexOf("http") === 0) url = location.href.split("#")[0]; } catch (e) {}
    if (navigator.share) {
      navigator.share({ title: "MAMSS Prep", text: text, url: url }).catch(function () {});
      return "share";
    }
    try {
      var done = function () { if (typeof toast === "function") toast("Link copied — send it to a friend", "📤"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + " " + url).then(done, done);
      else {
        var ta = document.createElement("textarea");
        ta.value = text + " " + url;
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        ta.remove(); done();
      }
    } catch (e) {}
    return "copy";
  }

  function open(subj) {
    css();
    try { document.documentElement.classList.add("atlas"); } catch (e) {}
    try { tagOnce(); } catch (e) {}
    var ov = $("atOv");
    if (ov) {
      ov.style.display = "flex";
      if (subj) { view.name = "detail"; view.subj = subj; } else view.name = "grid";
      view.q = "";
      var si = $("atSearch"); if (si) si.value = "";
      render();
      return;
    }
    ov = document.createElement("div");
    ov.id = "atOv";
    ov.className = "at-ov";
    ov.setAttribute("aria-label", "Curriculum Atlas");
    ov.innerHTML =
      '<div class="at-box" role="dialog" aria-label="Curriculum Atlas">' +
        '<div class="at-h"><span>🗺 Curriculum Atlas</span>' +
        '<button class="at-share" id="atShare" type="button">📤 Share</button>' +
        '<button class="at-x" id="atX" aria-label="Close">✕</button></div>' +
        '<div class="at-sub" id="atSub"></div>' +
        '<input class="at-search" id="atSearch" placeholder="🔎 Search 27 subjects & topics… e.g. photosynthesis, marketing" autocomplete="off" aria-label="Search subjects and topics">' +
        '<div id="atBody"></div>' +
      "</div>";
    document.body.appendChild(ov);
    $("atX").onclick = close;
    $("atShare").onclick = function () { share(); };
    ov.addEventListener("pointerdown", function (e) { if (e.target === ov) close(); });
    var inp = $("atSearch");
    inp.addEventListener("input", function () { view.q = inp.value; render(); });
    if (subj) { view.name = "detail"; view.subj = subj; } else view.name = "grid";
    view.q = ""; inp.value = "";
    render();
  }
  function close() {
    var ov = $("atOv");
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
    var b = mk("atlasLaunch", "🗺", "Curriculum Atlas", "27 subjects · topics · drills", function () { open(); });
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
      add("Explore", "🗺", "Curriculum Atlas", "Browse 27 subjects, topics & schemes of work", function () { open(); });
      add("Explore", "🎲", "Atlas surprise drill", "Drill a random curriculum topic", function () { surprise(); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  function boot() {
    css();
    try { document.documentElement.classList.add("atlas"); } catch (e) {}
    try { chips(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try { tagOnce(); } catch (e) {}
    try {
      var n = 0;
      var iv = setInterval(function () {
        n++;
        try { tagOnce(); } catch (e) {}
        if (tagDone || n > 90) clearInterval(iv);
      }, 500);
    } catch (e) {}
    try { window.addEventListener("quizbank-updated", function () { try { tagOnce(); _cc = null; if ($("atOv")) render(); } catch (e) {} }); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.getElementById("atOv")) close();
      });
    } catch (e) {}
    window.__atlasApi = {
      open: open, close: close, drill: drill, drillSubject: drillSubject,
      surprise: surprise, share: share, subjects: subjects, topics: topics,
      syll: syll, counts: counts, acc: acc, askAI: askAI,
      tagged: function () { return tagged; }, version: 36
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
