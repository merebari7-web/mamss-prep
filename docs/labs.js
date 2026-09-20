/* v8.0 — THE EXAM-ROOM LABS  (labs.js)
   A deferred feature module for MAMSS Prep. It is fetched once on
   first use (see the tiny loader in index.html) and then cached by the service
   worker, so the boot-critical page + question bank stay exactly as lean as
   before. This module never touches the question bank payload.

   Inside:
     🏆 Records Hall   — personal bests computed from your own papers
     🗓  Exam Planner   — a day-by-day revision schedule to any exam date
     🔁 Recall Blitz   — retrieval sprint: answer before the options appear
     🤝 Quiz Me        — two-player, pass-the-device challenge (roadmap #97)
     📘 Formula drawer — the subject's formula & fact card, open mid-paper

   Every feature reads the app's own global store and question bank; nothing is
   re-implemented, so it cannot drift from the syllabus content.
*/
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(msg, ico) {
    try { if (window.toast) toast(msg, ico || "✨"); } catch (e) {}
  }
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(+sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function dayKey(tms) {
    var d = new Date(+tms || 0);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function dayFromKey(k) {
    var y = Math.floor(k / 10000), m = Math.floor(k / 100) % 100, d = k % 100;
    return new Date(y, m - 1, d);
  }
  function todayMid() {
    var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }
  function isoMid(iso) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return NaN;
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }
  function isoToday() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function prettyDate(tms) {
    try { return new Date(tms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return ""; }
  }
  function medals(i) { return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"; }

  /* ---------- reads from the app (all guarded) ---------- */
  function myUid() { try { return window.uid ? window.uid() : "guest"; } catch (e) { return "guest"; } }
  function attemptsAll() { try { return window.attempts ? attempts() : []; } catch (e) { return []; } }
  function classesReady() {
    try { return Array.isArray(CLASSES) && CLASSES.length === 3 && !!CLASSES[0].questions; } catch (e) { return false; }
  }
  function classList() {
    try {
      if (classesReady()) return CLASSES.map(function (c) { return c.class; });
    } catch (e) {}
    return ["SS1", "SS2", "SS3"];
  }
  function subjList() {
    try {
      var q = window.QUIZ_RAW;
      if (q && Array.isArray(q.subj) && q.subj.length >= 13) return q.subj.slice();
      if (classesReady()) {
        var seen = [], out = [];
        CLASSES[0].questions.forEach(function (x) { if (seen.indexOf(x.s) < 0) { seen.push(x.s); out.push(x.s); } });
        if (out.length) return out;
      }
    } catch (e) {}
    return ["Mathematics", "English Language", "Biology", "Chemistry", "Physics", "Agricultural Science",
      "Economics", "Government", "Literature in English", "Geography", "Commerce", "Computer Studies", "Civic Education"];
  }
  function notesOf(subject) {
    try {
      if (window.notesBank) {
        var nb = notesBank();
        if (nb && nb[subject]) return nb[subject];
      }
    } catch (e) {}
    return null;
  }
  function topicsOf(subject) {
    try {
      if (window.notesTopics) { var t = notesTopics(subject); if (t && t.length) return t; }
      var o = notesOf(subject);
      if (o) return Object.keys(o);
    } catch (e) {}
    return [];
  }
  function noteText(subject, topic) {
    try { var o = notesOf(subject); return o && o[topic] ? o[topic] : ""; } catch (e) { return ""; }
  }
  function isAccount() { try { return myUid() !== "guest"; } catch (e) { return false; } }
  function safeXP(n) { try { if (isAccount() && window.xpAdd) xpAdd(Math.round(n)); } catch (e) {} }
  function safeCoins(n) { try { if (isAccount() && window.coinsAdd) coinsAdd(Math.round(n)); } catch (e) {} }
  function say(t) { try { if (window.speakText) speakText(t); } catch (e) {} }
  function bankMistake(q, clsName) {
    /* Same dedupe + cap rules as the app's own recordMistakes, so the
       Mistake Master counter and spaced-revision deck pick it up at once. */
    try {
      if (!q || !q.q) return;
      var list = store.get("nssc_mistakes", []) || [];
      var idx = {}, i;
      for (i = 0; i < list.length; i++) idx[list[i].q] = i;
      var entry = { s: q.s, q: q.q, o: q.o, a: q.a, e: q.e, cls: clsName || "SS1", at: Date.now() };
      if (idx[entry.q] !== undefined) { list[idx[entry.q]].at = Date.now(); list[idx[entry.q]].r = 0; }
      else { idx[entry.q] = list.length; list.unshift(entry); }
      store.set("nssc_mistakes", list.slice(0, 400));
      try { if (window.renderMistTile) renderMistTile(); } catch (e) {}
      try { if (window.renderReviewBanner) renderReviewBanner(); } catch (e) {}
    } catch (e) {}
  }
  function pickFrom(clsIdx, subject, n) {
    try {
      if (!classesReady()) return [];
      var all = CLASSES[clsIdx] && CLASSES[clsIdx].questions || [];
      var pool = (subject && subject !== "All subjects")
        ? all.filter(function (x) { return x.s === subject; })
        : all.slice();
      var out = [], used = {};
      while (out.length < Math.min(n, pool.length)) {
        var idx = Math.floor(Math.random() * pool.length);
        var q = pool[idx];
        if (!used[q.q]) { used[q.q] = 1; out.push(q); }
      }
      return out;
    } catch (e) { return []; }
  }
  function setClassFor(clsIdx) {
    try { if (classesReady() && typeof state !== "undefined") { state.cls = clsIdx; return true; } } catch (e) {}
    return false;
  }
  function drillTopicPaper(topic, subject) {
    /* Mirror the app's own drillTopic but from an explicit class, opening the
       standard paper screen so answers earn XP, calibration and item data. */
    try {
      if (!classesReady()) return toast("The question bank is still loading — wait a moment", "⏳");
      if (typeof state === "undefined") return;
      var clsIdx = state.cls;
      function poolFor(ci) {
        return CLASSES[ci].questions.filter(function (s) {
          return (s.t || "General") === topic && (!subject || s.s === subject);
        });
      }
      var pool = poolFor(clsIdx);
      if (!pool.length) {
        /* the chosen class may have no questions on this topic yet — fall back
           to whichever class holds the most (the syllabus spine is shared) */
        var best = -1, bestN = 0;
        for (var ci = 0; ci < CLASSES.length; ci++) {
          var n = poolFor(ci).length;
          if (n > bestN) { bestN = n; best = ci; }
        }
        if (best < 0) return toast("No practice questions for " + topic + " anywhere in the bank", "🗂");
        var fallbackFrom = CLASSES[clsIdx].class, fallbackTo = CLASSES[best].class;
        state.cls = best; pool = poolFor(best);
        toast("No " + fallbackFrom + " questions on this topic — using " + fallbackTo + " instead", "🗂");
      }
      var qs = [];
      var src = pool.slice();
      while (qs.length < Math.min(10, pool.length) && src.length) {
        var i = Math.floor(Math.random() * src.length);
        qs.push(src.splice(i, 1)[0]);
      }
      state.subject = subject || null;
      state.count = qs.length;
      state.quiz = qs;
      state.idx = 0; state.answers = []; state.flags = []; state.qTimes = [];
      state.daily = false; state.reviewing = false; state.mock = false;
      state.mode = "study"; submitting = false;
      state.started = Date.now(); state.deadline = 0;
      $("examNote").classList.add("hidden"); $("qTimer").classList.add("hidden");
      setCard("quiz"); renderQ(); stopTimer(); saveSession();
      toast("Drilling " + topic + " — " + qs.length + " questions", "🔁");
    } catch (e) { toast("Could not open the paper", "⚠️"); }
  }

  /* Whole-subject drill (same paper screen as the app's own papers). */
  function drillSubject(subject, n) {
    try {
      if (!classesReady()) return toast("The question bank is still loading — wait a moment", "⏳");
      if (typeof state === "undefined") return;
      var clsIdx = state.cls || 0;
      var qs = pickFrom(clsIdx, subject || "All subjects", Math.max(5, Math.min(20, n || 10)));
      if (!qs.length) return toast("No practice questions for that subject yet", "🗂");
      state.subject = subject || null;
      state.count = qs.length;
      state.quiz = qs;
      state.idx = 0; state.answers = []; state.flags = []; state.qTimes = [];
      state.daily = false; state.reviewing = false; state.mock = false;
      state.mode = "study"; submitting = false;
      state.started = Date.now(); state.deadline = 0;
      $("examNote").classList.add("hidden"); $("qTimer").classList.add("hidden");
      setCard("quiz"); renderQ(); stopTimer(); saveSession();
      toast("Drilling " + (subject || "all subjects") + " — " + qs.length + " questions", "📚");
    } catch (e) { toast("Could not open the paper", "⚠️"); }
  }

  /* ---------- overlay chrome ---------- */
  function overlayEl() {
    var o = $("lxOv");
    if (o) return o;
    o = document.createElement("div");
    o.className = "overlay";
    o.id = "lxOv";
    o.setAttribute("role", "dialog");
    o.setAttribute("aria-modal", "true");
    o.style.position = "fixed";
    o.setAttribute("data-prevov", document.body.style.overflow || "");
    document.body.style.overflow = "hidden";
    o.addEventListener("click", function (e) { if (e.target === o) LX.close(); });
    document.body.appendChild(o);
    return o;
  }
  var _escHooked = false;
  function hookEsc() {
    if (_escHooked) return;
    _escHooked = true;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("lxOv")) LX.close();
    });
  }
  function shell(title, inner, foot) {
    hookEsc();
    var o = overlayEl();
    var html = '<div class="modal modal-wide lx-modal">'
      + '<div class="lx-head"><h3 style="margin:0">' + title + '</h3><span style="flex:1"></span>'
      + '<button type="button" class="btn btn-ghost lx-x" onclick="LX.close()">✕ Close</button></div>'
      + '<div class="lx-body">' + inner + '</div>'
      + (foot ? '<div class="lx-foot">' + foot + '</div>' : '') + '</div>';
    o.innerHTML = html;
    o.style.display = "grid";
    try { o.style.animation = "none"; o.offsetHeight; o.style.animation = ""; } catch (e) {}
  }
  function emptyState(ico, msg, btnHtml) {
    return '<div class="lx-empty"><div class="lx-empty-ico">' + ico + '</div><p>' + msg + '</p>'
      + (btnHtml ? '<div>' + btnHtml + '</div>' : '') + '</div>';
  }
  function chipRow(items, on) {
    return '<div class="lx-chips">' + items.join("") + "</div>" +
      (on ? '<div class="note" style="margin:6px 0 10px">' + on + "</div>" : "");
  }
  function chip(label, extra, active) {
    return '<button type="button" class="lx-chip' + (active ? " on" : "") + '" ' + (extra || "") + ">" + label + "</button>";
  }
  function waitBankThen(fn) {
    if (classesReady()) return fn();
    var tries = 0;
    var t = setInterval(function () {
      if (!$("lxOv")) { clearInterval(t); return; }
      tries++;
      if (classesReady()) { clearInterval(t); fn(); }
      else if (tries > 30) { clearInterval(t); toast("The question bank is still loading — try again in a moment", "⏳"); }
    }, 200);
  }

  /* ============================================================
     🏆 1 · RECORDS HALL — personal bests from your own papers
     ============================================================ */
  function paperRows() {
    return attemptsAll().filter(function (a) { return a && !a.rev && typeof a === "object" && !Array.isArray(a) && isFinite(+a.pct) && isFinite(+a.tms); });
  }
  function bestStreak(papers) {
    var days = {};
    papers.forEach(function (p) { days[dayKey(p.tms)] = 1; });
    var keys = Object.keys(days).map(Number).sort(function (a, b) { return a - b; });
    var best = 0, cur = 0, bestEnd = null, curEnd = null, prev = null;
    keys.forEach(function (k) {
      if (prev !== null && (dayFromKey(k).getTime() - dayFromKey(prev).getTime() === 86400000)) cur++;
      else cur = 1;
      curEnd = k;
      if (cur > best) { best = cur; bestEnd = k; }
      prev = k;
    });
    return { days: best, end: bestEnd };
  }
  function perDayTotals(papers) {
    var days = {};
    papers.forEach(function (p) { var k = dayKey(p.tms); days[k] = days[k] || { n: 0, tot: 0 }; days[k].n++; days[k].tot += (+p.total || 0); });
    return Object.keys(days).map(function (k) { return { k: +k, n: days[k].n, tot: days[k].tot }; })
      .sort(function (a, b) { return b.tot - a.tot || b.n - a.n; });
  }
  function bestWeek(papers) {
    /* sliding 7-calendar-day windows, need >= 3 papers in the window */
    var list = papers.slice().sort(function (a, b) { return (+a.tms) - (+b.tms); });
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var win = [], j;
      for (j = i; j < list.length; j++) {
        if (dayFromKey(dayKey(list[j].tms)).getTime() - dayFromKey(dayKey(list[i].tms)).getTime() > 6 * 86400000) break;
        win.push(list[j]);
      }
      if (win.length >= 3) {
        var avg = win.reduce(function (s, p) { return s + (+p.pct || 0); }, 0) / win.length;
        if (!best || avg > best.avg) {
          best = { avg: avg, from: list[i].tms, to: win[win.length - 1].tms, n: win.length };
        }
      }
    }
    return best;
  }
  function LX_records() {
    var papers = paperRows();
    if (!papers.length) {
      return shell("🏆 Records Hall",
        emptyState("🗂", "No papers on record yet — sit your first paper and your personal bests will be enshrined here.",
          '<button type="button" class="btn btn-gold" onclick="LX.go(\'practice\')">📚 Sit a paper</button>'),
        "Every trophy is computed live from your own papers on this device — nothing leaves it.");
    }
    var best = papers.slice().sort(function (a, b) { return (+b.pct || 0) - (+a.pct || 0) || (+b.tms) - (+a.tms); });
    var perfect = papers.filter(function (p) { return (+p.pct || 0) === 100 && (+p.total || 0) >= 10; })
      .sort(function (a, b) { return (+a.t || 9e9) - (+b.t || 9e9); });
    var streak = bestStreak(papers);
    var dayTot = perDayTotals(papers);
    var week = bestWeek(papers);
    var sumQ = papers.reduce(function (s, p) { return s + (+p.total || 0); }, 0);
    var sumT = papers.reduce(function (s, p) { return s + (+p.t || 0); }, 0);
    var avg = papers.reduce(function (s, p) { return s + (+p.pct || 0); }, 0) / papers.length;
    var top = papers.slice().sort(function (a, b) { return (+b.pct || 0) - (+a.pct || 0); })[0];

    function row3(items, fmt) {
      if (!items.length) return "";
      var rows = "";
      for (var i = 0; i < Math.min(3, items.length); i++) {
        var it = items[i];
        rows += '<div class="lx-row lx-pod"><span class="lx-med">' + medals(i) + "</span><span class='lx-flex1'><b>" + esc(fmt(it)) + "</b><small>" + esc(it.subj || "All subjects") + " · " + esc(it.cls || "") + " · " + prettyDate(it.tms) + "</small></span></div>";
      }
      return rows;
    }
    var hall =
      '<div class="lx-stats">'
      + "<div><b>" + fmtNum(papers.length) + "</b><small>Papers</small></div>"
      + "<div><b>" + (avg ? Math.round(avg) + "%" : "—") + "</b><small>Average</small></div>"
      + "<div><b>" + (top ? Math.round(+top.pct||0) + "%" : "—") + "</b><small>Best score</small></div>"
      + "<div><b>" + fmtNum(sumQ) + "</b><small>Questions</small></div>"
      + "<div><b>" + (sumT ? fmtTime(sumT) : "—") + "</b><small>Time studied</small></div>"
      + '<div><b>' + (streak.days || "—") + "</b><small>Day streak</small></div>"
      + "</div>"
      + '<div class="lx-cats">'
      + '<div class="lx-cat"><h4>🥇 Highest score</h4>' + (best.length ? row3(best.slice(0, 3), function (p) { return Math.round(+p.pct||0) + "% — " + esc(p.subj || "All subjects"); }) : '<p class="note">No papers yet.</p>') + "</div>"
      + '<div class="lx-cat"><h4>⚡ Fastest perfect paper</h4>' + (perfect.length ? row3(perfect, function (p) { return "100% in " + fmtTime(p.t); }) : '<p class="note">Finish a 10+ question paper at 100% to set a time to beat.</p>') + "</div>"
      + '<div class="lx-cat"><h4>🔥 Longest daily streak</h4>' + (streak.days ? row3([{ tms: dayFromKey(streak.end).getTime(), subj: streak.days + " consecutive days with a paper", cls: "" }], function (p) { return streak.days + " days in a row"; }) : '<p class="note">Study on consecutive days to light the flame.</p>') + "</div>"
      + '<div class="lx-cat"><h4>📚 Most questions in a day</h4>' + (dayTot.length ? dayTot.slice(0, 3).map(function (d, i) { return '<div class="lx-row lx-pod"><span class="lx-med">' + medals(i) + "</span><span class='lx-flex1'><b>" + fmtNum(d.tot) + " questions</b><small>" + prettyDate(dayFromKey(d.k).getTime()) + " · " + d.n + " paper" + (d.n > 1 ? "s" : "") + "</small></span></div>"; }).join("") : '<p class="note">No papers yet.</p>') + "</div>"
      + '<div class="lx-cat"><h4>🌟 Best 7-day stretch</h4>' + (week ? '<div class="lx-row lx-pod"><span class="lx-med">🥇</span><span class="lx-flex1"><b>' + Math.round(week.avg) + "% average</b><small>" + week.n + " papers · " + prettyDate(week.from) + " → " + prettyDate(week.to) + "</small></span></div>" : '<p class="note">Sat three or more papers within one week to crown your best stretch.</p>') + "</div>"
      + "</div>"
      + '<button type="button" class="btn btn-ghost" style="margin-top:14px" onclick="LX.recordsCopy()">📋 Copy a progress snapshot</button>';
    shell("🏆 Records Hall", hall,
      "Records are recomputed from your stored papers after every result — the hall updates itself.");
  }
  function LX_recordsCopy() {
    var papers = paperRows();
    if (!papers.length) return toast("Nothing to copy yet — sit a paper first", "🗂");
    var sumQ = papers.reduce(function (s, p) { return s + (+p.total || 0); }, 0);
    var best = papers.slice().sort(function (a, b) { return (+b.pct || 0) - (+a.pct || 0); })[0];
    var avg = Math.round(papers.reduce(function (s, p) { return s + (+p.pct || 0); }, 0) / papers.length);
    var txt = "MAMSS PREP — progress snapshot\n"
      + "Papers: " + papers.length + " · Questions answered: " + fmtNum(sumQ) + "\n"
      + "Average score: " + avg + "% · Best paper: " + Math.round(+best.pct||0) + "% (" + esc(best.subj || "All subjects") + ")\n"
      + "Updated: " + new Date().toLocaleString("en-GB") + " · © merebari web";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast("Progress snapshot copied — paste it anywhere", "📋"); },
          function () { fallbackCopy(txt); });
      } else fallbackCopy(txt);
    } catch (e) { fallbackCopy(txt); }
    function fallbackCopy(t) {
      try {
        var ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
        toast("Progress snapshot copied", "📋");
      } catch (e2) { toast("Copy not available here", "⚠️"); }
    }
  }

  /* ============================================================
     🗓 2 · EXAM PLANNER — day-by-day revision to your exam date
     ============================================================ */
  function LX_planner() {
    var saved = null;
    try { saved = store.get("nssc_lxplan_" + myUid(), null); } catch (e) {}
    if (saved) return LX_planView(saved);
    LX_planSetup();
  }
  function LX_planSetup() {
    var subs = subjList();
    var sel = { cls: 0, subs: {}, date: "", name: "" };
    var html =
      '<div class="lx-row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">'
      + '<label class="lx-field" style="flex:1.4;min-width:220px"><span>Examination</span>'
      + '<input class="input" id="lxPlanName" maxlength="60" placeholder="e.g. WAEC SSCE — Mathematics (June)" value=""></label>'
      + '<label class="lx-field" style="min-width:150px"><span>Exam date</span>'
      + '<input class="input" id="lxPlanDate" type="date" min="' + isoToday() + '"></label>'
      + '<label class="lx-field" style="min-width:120px"><span>Class</span><select class="input" id="lxPlanCls">'
      + classList().map(function (c, i) { return '<option value="' + i + '"' + (i === 0 ? " selected" : "") + ">" + c + " · " + (i === 0 ? "Preliminary" : i === 1 ? "Intermediate" : "Advanced") + "</option>"; }).join("")
      + "</select></label></div>"
      + '<h4 style="margin:16px 0 6px">Subjects to revise</h4>'
      + '<div class="lx-chips">' + subs.map(function (s) {
        return chip(s, 'onclick="LX.planSub(this)" data-s="' + esc(s) + '"');
      }).join("") + "</div>"
      + '<p class="note">Each subject adds its six syllabus topics. Choose only what your exam actually covers — a tight plan beats a heroic one.</p>'
      + '<div class="row" style="margin-top:18px"><button type="button" class="btn btn-gold" onclick="LX.planBuild()">🗓 Build my revision plan</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.close()">Cancel</button></div>';
    shell("🗓 Exam Planner", html,
      "The plan spaces every chosen topic over the days left — a little retrieval practice every day beats one long night.");
  }
  function LX_planSub(el) {
    if (!el) return;
    el.classList.toggle("on");
  }
  function LX_planBuild() {
    var name = $("lxPlanName") ? $("lxPlanName").value.trim() : "";
    var iso = $("lxPlanDate") ? $("lxPlanDate").value : "";
    var clsEl = $("lxPlanCls");
    var cls = clsEl ? +clsEl.value : 0;
    if (!name) return toast("Give the examination a name — e.g. WAEC SSCE Mathematics", "📝");
    var examT = isoMid(iso);
    if (!iso || isNaN(examT) || examT <= todayMid()) return toast("Pick a real exam date in the future", "🗓");
    var subs = [];
    var chips = document.querySelectorAll("#lxOv .lx-chip.on");
    for (var i = 0; i < chips.length; i++) {
      var s = chips[i].getAttribute("data-s");
      if (s) subs.push(s);
    }
    if (!subs.length) return toast("Select at least one subject to revise", "📚");
    var plan = { name: name, iso: iso, cls: cls, subs: subs, created: Date.now() };
    try { store.set("nssc_lxplan_" + myUid(), plan); } catch (e) {}
    LX_planView(plan);
  }
  function LX_planView(plan) {
    var daysLeft = Math.max(1, Math.ceil((isoMid(plan.iso) - todayMid()) / 86400000));
    /* interleaved unit order: round-robin across the chosen subjects */
    var per = {};
    plan.subs.forEach(function (s) { per[s] = topicsOf(s); });
    var units = [], any = false, maxLen = 0;
    plan.subs.forEach(function (s) { maxLen = Math.max(maxLen, per[s].length); });
    for (var t = 0; t < maxLen; t++) {
      plan.subs.forEach(function (s) {
        if (per[s][t]) { any = true; units.push({ s: s, t: per[s][t] }); }
      });
    }
    if (!any) {
      try { store.del("nssc_lxplan_" + myUid()); } catch (e) {}
      return LX_planSetup();
    }
    var U = units.length;
    var cap = Math.min(4, Math.max(1, Math.ceil(U / daysLeft)));
    var scheduled = []; /* scheduled[d] = array of unit indexes — spread evenly */
    for (var u = 0; u < U; u++) {
      var d = Math.min(daysLeft - 1, Math.floor(u * daysLeft / U));
      (scheduled[d] = scheduled[d] || []).push(u);
    }
    var dense = false;
    scheduled.forEach(function (day) { if (day && day.length > cap) dense = true; });

    var doneKey = "nssc_lxdone_" + myUid() + "_" + plan.created;
    var done = {};
    try { done = store.get(doneKey, {}) || {}; } catch (e) {}
    var ticked = 0;
    for (var k in done) if (done[k]) ticked++;

    var totalTasks = U;
    var progress = totalTasks ? Math.round(ticked / totalTasks * 100) : 0;
    var clsName = (classList()[plan.cls]) || "SS1";

    var rows = "";
    for (var d = 0; d < scheduled.length; d++) {
      var dayUnits = scheduled[d] || [];
      if (!dayUnits.length) continue;
      var date = new Date(todayMid() + (d + 1) * 86400000);
      var dateLbl = prettyDate(date.getTime());
      var isToday = d === 0;
      var tasks = "";
      dayUnits.forEach(function (ui) {
        var unit = units[ui];
        var note = noteText(unit.s, unit.t);
        var dd = done["u" + ui] ? " ✓" : "";
        tasks += '<div class="lx-task' + (done["u" + ui] ? " done" : "") + '">'
          + '<div class="lx-trow">'
          + '<label class="lx-tick"><input type="checkbox"' + (done["u" + ui] ? " checked" : "") + ' onclick="LX.planTick(this,' + d + "," + ui + ")\" aria-label=\"Mark done\"><span></span></label>"
          + '<span class="lx-flex1"><b>' + esc(unit.s) + " · " + esc(unit.t) + "</b>"
          + (note ? '<small class="lx-note">' + esc(note.slice(0, 130)) + (note.length > 130 ? "…" : "") + "</small>" : "")
          + "</span>"
          + '<button type="button" class="btn btn-ghost lx-mini" onclick="LX.planDrill(' + plan.cls + ",'" + esc(unit.s).replace(/'/g, "\\'") + "','" + esc(unit.t).replace(/'/g, "\\'") + '\')">▶ Drill 10</button>'
          + "</div></div>";
      });
      rows += '<div class="lx-day' + (isToday ? " today" : "") + '">'
        + '<div class="lx-dayhead"><b>' + (isToday ? "▶ TODAY" : dateLbl) + '</b><span class="lx-flex1"></span><small>' + dayUnits.length + " task" + (dayUnits.length > 1 ? "s" : "") + "</small></div>"
        + tasks + "</div>";
    }

    var countdown = Math.ceil((isoMid(plan.iso) - todayMid()) / 86400000);
    var html =
      '<div class="lx-phead"><span class="lx-pnum">' + Math.max(0, countdown) + "</span>"
      + "<div><b>" + esc(plan.name) + "</b><small>" + clsName + " · exam " + prettyDate(isoMid(plan.iso)) + " · " + plan.subs.length + " subject" + (plan.subs.length > 1 ? "s" : "") + " · " + U + " topic unit" + (U > 1 ? "s" : "") + "</small></div></div>"
      + '<div class="lx-bar"><div style="width:' + progress + '%"></div></div>'
      + '<div class="lx-pmeta"><b>' + progress + "% revised</b><span class='lx-flex1'></span><small>" + ticked + " of " + totalTasks + " ticked" + (dense ? " · ⚠️ the exam is close — the last day is dense; consider trimming subjects" : "") + "</small></div>"
      + (countdown <= 7 ? '<div class="lx-warn">⏳ Under a week to go — the plan front-loads daily drills so everything is still revised before the day.</div>' : "")
      + '<div class="lx-planlist">' + rows + "</div>"
      + '<div class="row" style="margin-top:16px">'
      + '<button type="button" class="btn btn-gold" onclick="LX.planMock(' + plan.cls + ')">🎓 Final mock paper (' + esc(clsName) + ')</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.planPrint()">🖨 Print plan</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.planDelete(' + plan.created + ')">🗑 New plan</button>'
      + "</div>";
    shell("🗓 Exam Planner", html,
      "“Drill 10” opens the paper screen for that topic — answers there feed your normal records, mistakes and mastery map.");
    LX._plan = { plan: plan, units: units, doneKey: doneKey };
  }
  function LX_planTick(cb, d, ui) {
    if (!cb || !LX._plan) return;
    var key = "u" + ui;
    var done = {};
    try { done = store.get(LX._plan.doneKey, {}) || {}; } catch (e) {}
    done[key] = cb.checked ? 1 : 0;
    try { store.set(LX._plan.doneKey, done); } catch (e) {}
    LX_planView(LX._plan.plan);
  }
  function LX_planDrill(cls, subject, topic) {
    LX.close();
    if (setClassFor(+cls)) drillTopicPaper(topic, subject);
    else toast("Could not start the drill", "⚠️");
  }
  function LX_planMock(cls) {
    LX.close();
    try {
      setClassFor(+cls);
      if (window.centuryRun) return centuryRun();
    } catch (e) {}
    toast("Mock paper could not start", "⚠️");
  }
  function LX_planPrint() {
    try {
      var p = LX._plan && LX._plan.plan;
      if (!p) return;
      var rows = document.querySelectorAll("#lxOv .lx-day");
      var txt = "MAMSS PREP — revision plan\n" + esc(p.name) + " · " + classList()[p.cls] + " · exam " + p.iso + "\n\n";
      rows.forEach(function (r) {
        txt += r.querySelector(".lx-dayhead b").textContent + "\n";
        var ts = r.querySelectorAll(".lx-task b");
        ts.forEach(function (b) { txt += "  [ ] " + b.textContent + "\n"; });
      });
      var ta = document.createElement("textarea");
      ta.value = txt.replace(/&amp;/g, "&");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      toast("Plan copied — paste into notes or a message", "📋");
    } catch (e) { toast("Could not copy the plan", "⚠️"); }
  }
  function LX_planDelete(created) {
    try { store.del("nssc_lxplan_" + myUid()); store.del("nssc_lxdone_" + myUid() + "_" + created); } catch (e) {}
    LX_planSetup();
  }

  /* ============================================================
     🔁 3 · RECALL BLITZ — retrieval before the options appear
     ============================================================ */
  var blitz = null;
  function LX_blitz() {
    waitBankThen(function () {
      var subs = subjList();
      var cfg = { cls: 0, sub: "All subjects", n: 15 };
      var html =
        '<div class="lx-row" style="gap:10px;flex-wrap:wrap">'
        + '<label class="lx-field" style="min-width:130px"><span>Class</span><select class="input" id="lxBlitzCls">'
        + classList().map(function (c, i) { return '<option value="' + i + '">' + c + "</option>"; }).join("")
        + "</select></label>"
        + '<label class="lx-field" style="min-width:150px"><span>Questions</span><select class="input" id="lxBlitzN">'
        + [10, 15, 20].map(function (n) { return '<option value="' + n + '"' + (n === 15 ? " selected" : "") + ">" + n + "</option>"; }).join("")
        + "</select></label></div>"
        + '<h4 style="margin:14px 0 6px">Subject</h4>'
        + '<div class="lx-chips">' + [chip("🌐 All subjects", 'onclick="LX.blitzSub(this)" data-s="All subjects"', true)]
        + subs.map(function (s) { return chip(s, 'onclick="LX.blitzSub(this)" data-s="' + esc(s) + '"'); }).join("") + "</div>"
        + '<div class="lx-how"><b>How it works</b> — the question appears <i>before</i> the options. Say your answer out loud (or in your head), then reveal the options and mark yourself honestly: <b>Got it</b>, <b>Close</b> or <b>Missed</b>. Retrieving an answer is the strongest memory workout there is — Roediger &amp; Karpicke (2006).</div>'
        + '<div class="row" style="margin-top:16px"><button type="button" class="btn btn-gold" onclick="LX.blitzStart()">🔁 Start Recall Blitz</button>'
        + '<button type="button" class="btn btn-ghost" onclick="LX.close()">Cancel</button></div>';
      shell("🔁 Recall Blitz", html, "Missed questions are banked into your spaced-revision mistakes automatically — they come back to you in a few days.");
    });
  }
  function LX_blitzSub(el) {
    var chips = document.querySelectorAll("#lxOv .lx-chip[data-s]");
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle("on", chips[i] === el);
  }
  function LX_blitzStart() {
    var cls = +($("lxBlitzCls") ? $("lxBlitzCls").value : 0);
    var n = +($("lxBlitzN") ? $("lxBlitzN").value : 15);
    var sub = "All subjects";
    var chips = document.querySelectorAll("#lxOv .lx-chip.on[data-s]");
    if (chips.length) sub = chips[0].getAttribute("data-s");
    var deck = pickFrom(cls, sub, n);
    if (!deck.length) return toast("No questions found for that selection", "🗂");
    blitz = { cls: cls, sub: sub, deck: deck, i: 0, got: 0, close: 0, miss: 0, xp: 0, stage: "q", missed: {} };
    LX_blitzQ();
  }
  function LX_blitzQ() {
    if (!blitz) return;
    var b = blitz;
    var q = b.deck[b.i];
    var subMeta = null;
    try { if (window.subMeta) subMeta = subMeta(q.s); } catch (e) {}
    var em = subMeta && subMeta.em ? subMeta.em : (subMeta && subMeta.icon ? esc(subMeta.icon) : "");
    var head =
      '<div class="lx-qhead"><span>' + em + (em ? " " : "") + esc(q.s) + "</span>"
      + '<span class="lx-flex1"></span><small>' + esc(q.t || "General") + "</small>"
      + '<span class="lx-qn">' + (b.i + 1) + " / " + b.deck.length + "</span></div>";
    var score = '<div class="lx-score lx-blitz-score"><span class="ok">✓ ' + b.got + '</span><span class="mid">≈ ' + b.close + '</span><span class="no">✗ ' + b.miss + "</span></div>";
    var body =
      head + score
      + '<div class="lx-question" id="lxBlitzQ">' + esc(q.q) + "</div>"
      + '<div class="row"><button type="button" class="btn btn-ghost" onclick="say(LX.blitzText())">🔊 Read aloud</button>'
      + '<button type="button" class="btn btn-primary" id="lxBlitzRev" onclick="LX.blitzReveal()">Reveal options — did I know it?</button></div>'
      + '<div id="lxBlitzOpts" class="hidden"></div>'
      + '<div id="lxBlitzGrade" class="hidden"></div>';
    shell("🔁 Recall Blitz · " + (b.sub === "All subjects" ? "Mixed syllabus" : esc(b.sub)), body, "");
    b.stage = "q";
  }
  function LX_blitzText() {
    return blitz && blitz.deck[blitz.i] ? blitz.deck[blitz.i].q : "";
  }
  function LX_blitzReveal() {
    if (!blitz || !blitz.deck[blitz.i]) return;
    var q = blitz.deck[blitz.i];
    blitz.stage = "o";
    var opts = q.o.map(function (o, i) {
      return '<button type="button" class="lx-opt" data-i="' + i + '"><span class="lx-letter">' + "ABCD"[i] + "</span><span>" + esc(o) + "</span></button>";
    }).join("");
    $("lxBlitzRev").classList.add("hidden");
    $("lxBlitzOpts").innerHTML = '<div class="lx-opts lx-readonly">' + opts + "</div>";
    $("lxBlitzOpts").classList.remove("hidden");
    $("lxBlitzGrade").innerHTML =
      '<div class="lx-grade"><b>Now — which was the answer? Be honest with yourself.</b>'
      + '<button type="button" class="btn btn-primary" onclick="LX.blitzGrade(0)">✓ I got it</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.blitzGrade(1)">≈ Almost</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.blitzGrade(2)">✗ Missed it</button></div>';
    $("lxBlitzGrade").classList.remove("hidden");
  }
  function LX_blitzGrade(g) {
    if (!blitz || !blitz.deck[blitz.i] || blitz.stage !== "o") return;
    var b = blitz, q = b.deck[b.i];
    var clsName = classList()[b.cls];
    b.stage = "g";
    if (g === 0) { b.got++; b.xp += 3; }
    else if (g === 1) { b.close++; b.xp += 1; }
    else { b.miss++; b.missed[q.s + " · " + (q.t || "General")] = (b.missed[q.s + " · " + (q.t || "General")] || 0) + 1; bankMistake(q, clsName); }
    /* mark the answer key on the revealed options (self-graded, so only green) */
    var opts = document.querySelectorAll("#lxBlitzOpts .lx-opt");
    for (var oi = 0; oi < opts.length; oi++) {
      var el = opts[oi];
      if (+el.getAttribute("data-i") === q.a) el.classList.add("correct");
      el.disabled = true;
    }
    $("lxBlitzGrade").innerHTML =
      '<div class="lx-grade lx-fb"><b>' + (g === 0 ? "✓ Got it — lovely retrieval!" : g === 1 ? "≈ Close — you knew part of it" : "✗ Missed — it is banked for spaced revision") + "</b>"
      + "<p class=\"lx-explain\">" + esc(q.e) + "</p>"
      + (b.i + 1 < b.deck.length
        ? '<button type="button" class="btn btn-gold" onclick="LX.blitzNext()">Next question ▸</button>'
        : '<button type="button" class="btn btn-gold" onclick="LX.blitzNext()">See my blitz results 🏁</button>')
      + "</div>";
    safeXP(g === 0 ? 3 : g === 1 ? 1 : 0);
  }
  function LX_blitzNext() {
    if (!blitz) return;
    blitz.i++;
    if (blitz.i < blitz.deck.length) return LX_blitzQ();
    LX_blitzEnd();
  }
  function LX_blitzEnd() {
    var b = blitz; blitz = null;
    var pct = Math.round((b.got + b.close * 0.5) / b.deck.length * 100);
    var missList = Object.keys(b.missed);
    var html =
      '<div class="lx-finish"><div class="lx-trophy">' + (pct >= 85 ? "🏆" : pct >= 60 ? "🥇" : pct >= 40 ? "💪" : "🌱") + "</div>"
      + "<h3>" + (pct >= 85 ? "Sharp recall!" : pct >= 60 ? "Good retrieval — keep going" : pct >= 40 ? "You are warming up" : "Recall builds with practice") + "</h3>"
      + '<div class="lx-stats">'
      + "<div><b>" + b.deck.length + "</b><small>Questions</small></div>"
      + '<div><b style="color:var(--green)">' + b.got + "</b><small>Got it</small></div>"
      + '<div><b style="color:var(--gold)">' + b.close + "</b><small>Close</small></div>"
      + '<div><b style="color:var(--red)">' + b.miss + "</b><small>Missed</small></div>"
      + "<div><b>" + pct + "%</b><small>Recall score</small></div>"
      + '<div><b style="color:var(--green-d)">+' + b.xp + " XP</b><small>Earned</small></div>"
      + "</div>"
      + (missList.length ? '<div class="lx-cat"><h4>🔁 Banked for spaced revision</h4>' + missList.slice(0, 8).map(function (m) { return '<div class="lx-row lx-pod"><span>✗</span><span class="lx-flex1"><b>' + esc(m) + "</b><small>comes back in a day or two — review it then</small></span></div>"; }).join("") + "</div>" : "")
      + '<div class="row" style="margin-top:16px">'
      + '<button type="button" class="btn btn-gold" onclick="LX.blitz()">↻ Blitz again</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.close()">Done</button></div></div>';
    shell("🔁 Recall Blitz — results", html, "Remember: forcing yourself to recall first is exactly what makes the memory stick. Quiz yourself, don't re-read.");
  }

  /* ============================================================
     🤝 4 · QUIZ ME — two players, one device (roadmap #97)
     ============================================================ */
  var qm = null;
  function LX_quizme() {
    waitBankThen(function () {
      var subs = subjList();
      var html =
        '<div class="lx-row" style="gap:10px;flex-wrap:wrap">'
        + '<label class="lx-field" style="flex:1;min-width:170px"><span>Player 1</span><input class="input" id="lxQmA" maxlength="20" placeholder="Player 1 — name"></label>'
        + '<label class="lx-field" style="flex:1;min-width:170px"><span>Player 2</span><input class="input" id="lxQmB" maxlength="20" placeholder="Player 2 — name"></label>'
        + '<label class="lx-field" style="min-width:120px"><span>Class</span><select class="input" id="lxQmCls">'
        + classList().map(function (c, i) { return '<option value="' + i + '">' + c + "</option>"; }).join("")
        + "</select></label>"
        + '<label class="lx-field" style="min-width:120px"><span>Rounds each</span><select class="input" id="lxQmN">'
        + [5, 7, 10].map(function (n) { return '<option value="' + n + '"' + (n === 5 ? " selected" : "") + ">" + n + "</option>"; }).join("")
        + "</select></label></div>"
        + '<h4 style="margin:14px 0 6px">Subject</h4>'
        + '<div class="lx-chips">' + [chip("🌐 All subjects", 'onclick="LX.qmSub(this)" data-s="All subjects"', true)]
        + subs.map(function (s) { return chip(s, 'onclick="LX.qmSub(this)" data-s="' + esc(s) + '"'); }).join("") + "</div>"
        + '<div class="lx-how"><b>The rules of the study room</b> — questions alternate between the two of you. Answer correctly to score, keep a streak going for bragging rights, and whoever has the higher score when the rounds end takes the 🏆. Pass the device after every answer — no peeking at the other player’s question.</div>'
        + '<div class="row" style="margin-top:16px"><button type="button" class="btn btn-gold" onclick="LX.qmStart()">🤝 Start the duel</button>'
        + '<button type="button" class="btn btn-ghost" onclick="LX.close()">Cancel</button></div>';
      shell("🤝 Quiz Me · two-player", html, "This is a friendly game — it awards XP to the winner but never touches your paper records, so your progress statistics stay honest.");
    });
  }
  function LX_qmSub(el) {
    var chips = document.querySelectorAll("#lxOv .lx-chip[data-s]");
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle("on", chips[i] === el);
  }
  function LX_qmStart() {
    var A = $("lxQmA") ? $("lxQmA").value.trim() : "";
    var B = $("lxQmB") ? $("lxQmB").value.trim() : "";
    A = A || "Player 1"; B = B || "Player 2";
    var cls = +($("lxQmCls") ? $("lxQmCls").value : 0);
    var n = +($("lxQmN") ? $("lxQmN").value : 5);
    var sub = "All subjects";
    var chips = document.querySelectorAll("#lxOv .lx-chip.on[data-s]");
    if (chips.length) sub = chips[0].getAttribute("data-s");
    var deck = pickFrom(cls, sub, n * 2);
    if (deck.length < 2) return toast("Not enough questions for that selection", "🗂");
    qm = {
      A: A, B: B, cls: cls, sub: sub, n: n, deck: deck, i: 0,
      scores: { A: 0, B: 0 }, streaks: { A: 0, B: 0 }, best: { A: 0, B: 0 },
      done: 0
    };
    LX_qmQ();
  }
  function currentQmPlayer() {
    return qm.i % 2 === 0 ? "A" : "B";
  }
  function LX_qmQ() {
    if (!qm) return;
    var q = qm.deck[qm.i];
    var p = currentQmPlayer();
    var name = p === "A" ? qm.A : qm.B;
    var em = null;
    try { if (window.subMeta) em = subMeta(q.s); } catch (e) {}
    var sub = em && em.em ? em.em : "";
    var scoreboard =
      '<div class="lx-score qm">'
      + '<span class="qm-a"><b>' + esc(qm.A) + "</b> <i>" + qm.scores.A + "</i></span>"
      + '<span class="qm-vs">VS</span>'
      + '<span class="qm-b"><i>' + qm.scores.B + "</i> <b>" + esc(qm.B) + "</b></span></div>";
    var streak = qm.streaks[p];
    var head =
      '<div class="lx-qhead"><span>' + (p === "A" ? "🔵 " : "🔴 ") + esc(name) + " to answer</span>"
      + '<span class="lx-flex1"></span><small>' + (streak > 1 ? "🔥 streak ×" + streak + " · " : "") + esc(q.s) + "</small>"
      + '<span class="lx-qn">Q ' + (qm.i + 1) + " / " + qm.deck.length + "</span></div>";
    var body =
      scoreboard + head
      + '<div class="lx-question">' + esc(q.q) + "</div>"
      + '<div class="row"><button type="button" class="btn btn-ghost" onclick="LX.qmSay()">🔊 Read aloud</button></div>'
      + '<div class="lx-opts" id="lxQmOpts">' + q.o.map(function (o, i) {
        return '<button type="button" class="lx-opt" data-i="' + i + '" onclick="LX.qmAnswer(' + i + ')"><span class="lx-letter">' + "ABCD"[i] + "</span><span>" + esc(o) + "</span></button>";
      }).join("") + "</div>"
      + '<div id="lxQmFb" class="hidden"></div>';
    shell("🤝 Quiz Me · " + (qm.sub === "All subjects" ? "mixed syllabus" : qm.sub), body, "Pass the device to " + esc(name) + " — no peeking at the screen before it is your turn.");
    qm.locked = false;
  }
  function LX_qmSay() {
    if (qm && qm.deck[qm.i]) say(qm.deck[qm.i].q);
  }
  function LX_qmAnswer(i) {
    if (!qm || qm.locked) return;
    qm.locked = true;
    var q = qm.deck[qm.i];
    var p = currentQmPlayer();
    var correct = i === q.a;
    if (correct) { qm.scores[p]++; qm.streaks[p]++; qm.best[p] = Math.max(qm.best[p], qm.streaks[p]); }
    else qm.streaks[p] = 0;
    var opts = document.querySelectorAll("#lxQmOpts .lx-opt");
    for (var oi = 0; oi < opts.length; oi++) {
      var el = opts[oi];
      if (+el.getAttribute("data-i") === q.a) el.classList.add("correct");
      else if (+el.getAttribute("data-i") === i) el.classList.add("wrong");
      el.disabled = true;
    }
    var last = qm.i + 1 >= qm.deck.length;
    $("lxQmFb").innerHTML =
      '<div class="lx-fb ' + (correct ? "ok" : "no") + '"><b>' + (correct ? "✓ Correct — " : "✗ Not this time — the answer was ") + "ABCD"[q.a] + "</b>"
      + "<p>" + esc(q.e) + "</p>"
      + '<button type="button" class="btn btn-gold" onclick="LX.qmNext()">' + (last ? "See the final score 🏁" : "Next question ▸") + "</button></div>";
    $("lxQmFb").classList.remove("hidden");
  }
  function LX_qmNext() {
    if (!qm) return;
    qm.i++;
    if (qm.i < qm.deck.length) LX_qmQ();
    else LX_qmEnd();
  }
  function LX_qmEnd() {
    var g = qm; qm = null;
    var aW = g.scores.A > g.scores.B, bW = g.scores.B > g.scores.A, draw = !aW && !bW;
    var winnerName = aW ? g.A : bW ? g.B : "";
    if (aW) { safeXP(15); safeCoins(2); }
    else if (bW) { safeXP(15); safeCoins(2); }
    else { safeXP(10); }
    var html =
      '<div class="lx-finish"><div class="lx-trophy">' + (draw ? "🤝" : "🏆") + "</div>"
      + "<h3>" + (draw ? "A dead heat — honours shared!" : esc(winnerName) + " takes the trophy") + "</h3>"
      + '<div class="lx-stats">'
      + '<div class="qm-w' + (aW || draw ? " win" : "") + '"><b>' + g.scores.A + "</b><small>" + esc(g.A) + "</small></div>"
      + "<div><b>—</b><small>Final</small></div>"
      + '<div class="qm-w' + (bW || draw ? " win" : "") + '"><b>' + g.scores.B + "</b><small>" + esc(g.B) + "</small></div>"
      + "</div>"
      + '<div class="lx-qm-detail"><small>Best streaks — ' + esc(g.A) + " ×" + g.best.A + " · " + esc(g.B) + " ×" + g.best.B + " · " + g.n * 2 + " questions of " + esc(g.sub === "All subjects" ? "mixed syllabus" : g.sub) + " (" + classList()[g.cls] + ")</small></div>"
      + (draw ? '<p class="note">Draw — both players earn a share of the XP.</p>'
        : '<p class="note">Winner: +15 XP and 🎖 2 merits on this device’s profile (the game never touches your paper records).</p>')
      + '<div class="row" style="margin-top:16px">'
      + '<button type="button" class="btn btn-gold" onclick="LX.quizme()">↻ Rematch</button>'
      + '<button type="button" class="btn btn-ghost" onclick="LX.close()">Done</button></div></div>';
    shell("🤝 Quiz Me — final score", html, "The fastest hand wins nothing — the sharpest brain does. Pass the device and go again.");
  }

  /* ============================================================
     📘 5 · FORMULA DRAWER — the subject's fact card, mid-paper
     ============================================================ */
  function LX_formulas(arg) {
    var subj = arg || null;
    var clsName = null;
    if (!subj) {
      try {
        if (typeof state !== "undefined" && state.quiz && state.quiz[state.idx]) {
          subj = state.quiz[state.idx].s;
          clsName = classList()[state.cls];
        } else if (typeof state !== "undefined" && state.subject && subjList().indexOf(state.subject) >= 0) {
          subj = state.subject;
        }
      } catch (e) {}
    }
    if (subj) return LX_formulasFor(subj, clsName);
    /* no live context: pick a subject first */
    var subs = subjList();
    shell("📘 Formula & Fact Cards",
      '<h4 style="margin:4px 0 8px">Which subject?</h4>' +
      '<div class="lx-chips lx-pick">' + subs.map(function (s) {
        return chip(s, 'onclick="LX.formulas(\'' + esc(s).replace(/'/g, "\\'") + '\')"');
      }).join("") + "</div>",
      "Open this drawer from any paper to keep the formulas beside you while you answer — it never pauses the timer.");
  }
  function LX_formulasFor(subj, clsName) {
    var topics = topicsOf(subj);
    if (!topics.length) return toast("No revision notes for " + subj + " yet", "🗂");
    var em = "";
    try { if (window.subMeta) { var m = subMeta(subj); em = m && m.em ? m.em : ""; } } catch (e) {}
    var cards = topics.map(function (tp) {
      var txt = noteText(subj, tp);
      return '<div class="lx-fcard"><div class="lx-fhead"><b>' + esc(tp) + "</b>"
        + '<button type="button" class="btn btn-ghost lx-mini" onclick="LX.formulaNotes(\'' + esc(subj).replace(/'/g, "\\'") + "','" + esc(tp).replace(/'/g, "\\'") + '\')">🗒 Full card</button></div>'
        + '<p>' + (txt ? esc(txt) : "") + "</p></div>";
    }).join("");
    var head = clsName ? '<div class="lx-qhead"><span>' + em + " " + esc(subj) + " · " + esc(clsName) + "</span><span class='lx-flex1'></span><small>6 syllabus topics</small></div>" : "";
    var foot = clsName ? "" : "Opened from a paper, this drawer shows the card for that paper’s subject.";
    var actions = '<div class="row" style="margin-top:14px">'
      + '<button type="button" class="btn btn-ghost" onclick="LX.formulaPrint(\'' + esc(subj).replace(/'/g, "\\'") + '\')">🖨 Print whole pack</button></div>';
    shell("📘 " + esc(subj) + " · Formula & facts", head + '<div class="lx-fcards">' + cards + "</div>" + actions,
      "These are the same exam-style formula cards teachers will recognise — SOH-CAH-TOA, OIL RIG, V = IR, the quadratic formula and friends.");
  }
  function LX_formulaNotes(subj, tp) {
    LX.close();
    try { if (window.openNotes) openNotes(subj, tp); } catch (e) {}
  }
  function LX_formulaPrint(subj) {
    LX.close();
    try { if (window.printNotesPack) printNotesPack(subj); else toast("Print is not available here", "⚠️"); } catch (e) {}
  }

  /* ============================================================
     🧘 6 · FOCUS LAB — pomodoro study timer + today's focus
     Starts a focus/break cycle, keeps a small floating timer if you
     close the drawer, and turns a completed session into a drill.
     ============================================================ */
  var FOC = { len: 25, rest: 5, subj: "All subjects", phase: "idle", left: 25 * 60, running: false, timer: null, endAt: 0, done: false };

  function focusList() {
    try { var a = store.get("nssc_focus", []); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function focusSave(rec) {
    try { var a = focusList(); a.push(rec); store.set("nssc_focus", a.slice(-1200)); focusPaintStats(); } catch (e) {}
  }
  function focusToday() { var k = dayKey(Date.now()); return focusList().filter(function (s) { return dayKey(s.t) === k; }); }
  function focusStreak() {
    var days = {}, k = todayMid(), c = 0;
    focusList().forEach(function (s) { days[dayKey(s.t)] = 1; });
    while (days[dayKey(k)]) { c++; k -= 86400000; }
    return c;
  }
  function focusMins() { return focusToday().reduce(function (s, x) { return s + Math.round(+x.len || 0); }, 0); }
  function focusLabel() {
    return FOC.phase === "focus" ? "Focus session" : FOC.phase === "rest" ? "Break time"
      : FOC.phase === "pause" ? "Paused" : "Ready to focus";
  }
  function focusTotal() { return FOC.phase === "rest" ? FOC.rest * 60 : FOC.len * 60; }
  function focusPaintStats() {
    var e = $("lxfocusStats");
    if (!e) return;
    var t = focusToday(), mins = focusMins(), str = focusStreak();
    e.innerHTML = '<div class="lx-stats lx-stats-focus">'
      + "<div><b>" + t.length + "</b><small>Sessions today</small></div>"
      + "<div><b>" + fmtNum(mins) + "</b><small>Focus minutes</small></div>"
      + "<div><b>" + str + "</b><small>Day streak</small></div></div>";
  }
  function focusPill() {
    var p = $("lxfocusPill");
    if (p) return p;
    p = document.createElement("button");
    p.type = "button";
    p.id = "lxfocusPill";
    p.className = "lxfocus-pill";
    p.setAttribute("aria-label", "Focus timer");
    p.innerHTML = '<i id="lxfocusPillPhase">Focus</i><b id="lxfocusPillTime">' + fmtTime(FOC.left) + "</b>";
    p.addEventListener("click", function () { LX.go("focus"); });
    document.body.appendChild(p);
    return p;
  }
  function focusPillPaint() {
    var pill = $("lxfocusPill");
    if (!pill) return;
    var live = FOC.running || FOC.phase === "pause" || FOC.phase === "rest";
    if (live && !$("lxOv")) {
      pill.classList.add("show");
      var t = $("lxfocusPillTime"), st = $("lxfocusPillPhase");
      if (t) t.textContent = fmtTime(FOC.left);
      if (st) st.textContent = FOC.phase === "rest" ? "Break" : "Focus";
    } else {
      pill.classList.remove("show");
    }
  }
  function focusPaintActions() {
    var start = $("lxFocusStart"), pause = $("lxFocusPause"), skip = $("lxFocusSkip"), reset = $("lxFocusReset");
    if (start) {
      start.classList.toggle("hidden", FOC.phase === "focus" || FOC.phase === "rest");
      start.textContent = FOC.phase === "pause" ? "▶ Resume" : "▶ Start focus";
    }
    if (pause) pause.classList.toggle("hidden", !FOC.running);
    if (skip) skip.classList.toggle("hidden", FOC.phase === "idle");
    if (reset) reset.classList.toggle("hidden", FOC.phase === "idle");
  }
  function focusPaint() {
    var t = $("lxfocusTime"), ph = $("lxfocusPhase"), bar = $("lxfocusBar");
    if (t) t.textContent = fmtTime(FOC.left);
    if (ph) ph.textContent = focusLabel();
    if (bar) {
      var total = focusTotal(), pct = total > 0 ? (total - FOC.left) / total : 0;
      var pc = Math.max(0, Math.min(100, pct * 100));
      bar.style.width = pc + "%";
      bar.setAttribute("aria-valuenow", String(Math.round(pc)));
    }
    focusPaintActions();
    focusPillPaint();
  }
  function focusStopTimer() { if (FOC.timer) { clearInterval(FOC.timer); FOC.timer = null; } }
  function focusTick() {
    if (!FOC.running) return;
    var left = Math.max(0, Math.round((FOC.endAt - Date.now()) / 1000));
    FOC.left = left;
    focusPaint();
    if (left <= 0) focusComplete();
  }
  function focusStart() {
    if (FOC.phase === "rest") return;
    if (FOC.phase === "idle" || FOC.phase === "pause") {
      if (FOC.phase === "pause") {
        FOC.endAt = Date.now() + FOC.left * 1000;
      } else {
        FOC.left = FOC.len * 60;
        FOC.endAt = Date.now() + FOC.left * 1000;
      }
      FOC.phase = "focus"; FOC.running = true;
      focusStopTimer();
      FOC.timer = setInterval(focusTick, 250);
      focusPaint();
      toast("Focus session started — " + FOC.len + " min of solid study", "🧘");
    }
  }
  function focusPause() {
    if (!FOC.running) return;
    FOC.left = Math.max(0, Math.round((FOC.endAt - Date.now()) / 1000));
    FOC.running = false; FOC.phase = "pause";
    focusStopTimer();
    focusPaint();
    toast("Focus paused", "⏸");
  }
  function focusReset() {
    focusStopTimer();
    FOC.running = false; FOC.phase = "idle"; FOC.left = FOC.len * 60; FOC.done = false;
    focusPaint();
    toast("Focus timer reset", "↺");
  }
  function focusComplete() {
    focusStopTimer();
    FOC.running = false; FOC.left = 0;
    if (FOC.phase === "focus") {
      focusSave({ t: Date.now(), len: FOC.len, subj: FOC.subj, type: "focus" });
      FOC.phase = "rest"; FOC.left = FOC.rest * 60; FOC.done = true;
      toast("Focus session " + FOC.len + " min complete — take a short break 🎉", "🧘");
      try { if (window.speakText) speakText("Great work. Focus session complete. Time for a short break."); } catch (e) {}
    } else if (FOC.phase === "rest") {
      FOC.phase = "idle"; FOC.left = FOC.len * 60;
      toast("Break over — ready for the next session", "🧘");
    }
    focusPaint();
  }
  function focusSkip() {
    if (FOC.phase === "idle") return;
    focusStopTimer(); FOC.running = false;
    if (FOC.phase === "focus") {
      FOC.phase = "rest"; FOC.left = FOC.rest * 60; FOC.done = true;
      toast("Focus skipped — taking a short break", "⏭");
    } else {
      FOC.phase = "idle"; FOC.left = FOC.len * 60; FOC.done = false;
      toast("Break skipped — back to ready", "⏭");
    }
    focusPaint();
  }
  function focusDrillSubj(n) {
    LX.close();
    try { drillSubject(FOC.subj === "All subjects" ? null : FOC.subj, n || 10); }
    catch (e) { toast("Could not open the drill", "⚠️"); }
  }
  function focusSetup(field, val) {
    if (FOC.phase !== "idle") return toast("Stop or reset the timer before changing settings", "⏸");
    if (field === "subj") FOC.subj = val;
    if (field === "len") { FOC.len = +val || 25; FOC.left = FOC.len * 60; }
    if (field === "rest") FOC.rest = +val || 5;
    LX_focus();
  }
  function LX_focus() {
    hookEsc();
    focusPill();
    var subs = subjList();
    var lens = [15, 25, 45], rests = [5, 10];
    var dis = FOC.phase !== "idle" ? " lx-dis" : "";
    function escOn(s) { return esc(s).replace(/'/g, "\\'"); }
    var setup =
      '<div class="lx-focus-setup' + dis + '">'
      + '<div class="lx-field"><label>Subject to focus on</label><div class="lx-chips lx-chips-scroll">'
      + subs.map(function (s) { return chip(s, "onclick=\"LX.focusSet('subj','" + escOn(s) + "')\"", FOC.subj === s); }).join("")
      + '</div></div>'
      + '<div class="lx-field"><label>Session length</label><div class="lx-chips">'
      + lens.map(function (m) { return chip(m + " min", "onclick=\"LX.focusSet('len'," + m + ")\"", FOC.len === m); }).join("")
      + '</div></div>'
      + '<div class="lx-field"><label>Break length</label><div class="lx-chips">'
      + rests.map(function (m) { return chip(m + " min", "onclick=\"LX.focusSet('rest'," + m + ")\"", FOC.rest === m); }).join("")
      + "</div></div>"
      + "</div>";
    var body =
      '<div class="lx-focus">'
      + setup
      + '<div class="lx-focus-clock">'
      + '<div class="lx-focus-ring"><b id="lxfocusTime">' + fmtTime(FOC.left) + "</b>"
      + '<small id="lxfocusPhase">' + focusLabel() + "</small></div>"
      + '<div class="lx-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div id="lxfocusBar" style="width:0%"></div></div>'
      + "</div>"
      + '<div class="lx-focus-actions">'
      + '<button type="button" class="btn btn-primary" id="lxFocusStart" onclick="LX.focusStart()">▶ Start focus</button>'
      + '<button type="button" class="btn btn-ghost" id="lxFocusPause" onclick="LX.focusPause()">⏸ Pause</button>'
      + '<button type="button" class="btn btn-ghost" id="lxFocusSkip" onclick="LX.focusSkip()">⏭ Skip</button>'
      + '<button type="button" class="btn btn-ghost" id="lxFocusReset" onclick="LX.focusReset()">↺ Reset</button>'
      + "</div>"
      + '<div id="lxfocusStats"></div>'
      + '<div class="lx-focus-how"><b>How it works.</b> Pick a subject and length, start the timer, then study hard for the full focus block. '
      + "When it ends you get a short break, and the day's sessions are counted on this device only. "
      + "Close the drawer during a session — a small floating timer keeps counting; tap it to come back.</div>"
      + "</div>";
    var foot =
      '<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">'
      + '<button type="button" class="btn btn-gold" onclick="LX.focusDrill(10)">▶ Drill 10 in ' + esc(FOC.subj) + "</button>"
      + '<button type="button" class="btn btn-ghost" onclick="LX.close()">Close</button></div>';
    shell("🧘 Focus Lab", body, foot);
    focusPaintStats();
    focusPaint();
  }

  /* ============================================================
     dispatcher
     ============================================================ */
  function go(kind, arg) {
    try {
      switch (kind) {
        case "records": return LX_records();
        case "planner": return LX_planner();
        case "blitz": return LX_blitz();
        case "quizme": return LX_quizme();
        case "focus": return LX_focus();
        case "formulas": return LX_formulas(arg);
        case "close": return LX.close();
        case "practice":
          LX.close();
          try { window.resetToClass ? resetToClass() : toast("Choose your paper from the home screen", "📚"); }
          catch (e) { toast("Choose your paper from the home screen", "📚"); }
          return;
      }
      toast("Unknown lab", "⚠️");
    } catch (e) { toast("Something went wrong in the labs: " + (e && e.message || e), "⚠️"); }
  }
  function close() {
    var o = $("lxOv");
    if (o && o.parentNode) {
      var pv = o.getAttribute("data-prevov");
      document.body.style.overflow = pv == null ? "" : pv;
      o.parentNode.removeChild(o);
    }
  }

  /* ---------- expose (namespaced — never collides with the app) ---------- */
  window.LX = window.LX || {};
  var LX = window.LX;
  LX.ready = true;
  LX.go = go;
  LX.close = close;
  LX.records = function () { go("records"); };
  LX.planner = function () { go("planner"); };
  LX.blitz = function () { go("blitz"); };
  LX.quizme = function () { go("quizme"); };
  LX.focus = function () { go("focus"); };
  LX.focusStart = focusStart;
  LX.focusPause = focusPause;
  LX.focusSkip = focusSkip;
  LX.focusReset = focusReset;
  LX.focusSet = focusSetup;
  LX.focusDrill = focusDrillSubj;
  LX.formulas = function (s) { go("formulas", s); };
  LX.recordsCopy = LX_recordsCopy;
  LX.planSub = LX_planSub; LX.planBuild = LX_planBuild; LX.planView = LX_planView;
  LX.planTick = LX_planTick; LX.planDrill = LX_planDrill; LX.planMock = LX_planMock;
  LX.planPrint = LX_planPrint; LX.planDelete = LX_planDelete;
  LX.blitzSub = LX_blitzSub; LX.blitzStart = LX_blitzStart; LX.blitzReveal = LX_blitzReveal;
  LX.blitzGrade = LX_blitzGrade; LX.blitzNext = LX_blitzNext; LX.blitzText = LX_blitzText;
  LX.qmSub = LX_qmSub; LX.qmStart = LX_qmStart; LX.qmAnswer = LX_qmAnswer;
  LX.qmNext = LX_qmNext; LX.qmSay = LX_qmSay;
  LX.formulaNotes = LX_formulaNotes; LX.formulaPrint = LX_formulaPrint;

  /* inject this module's own stylesheet once (scoped .lx-*) */
  if (!document.getElementById("lxCss")) {
    var css = document.createElement("style");
    css.id = "lxCss";
    css.textContent =
      ".lx-modal{max-width:820px;padding:24px}@media(max-width:560px){.lx-modal{padding:16px}}" +
      ".lx-head{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--card-border);padding-bottom:12px;margin-bottom:16px}" +
      ".lx-body{min-height:120px}.lx-foot{margin-top:16px;padding-top:12px;border-top:1px dashed var(--card-border);font-size:.72rem;color:var(--mut)}" +
      ".lx-flex1{flex:1}.lx-note{display:block;font-size:.72rem;color:var(--mut);margin-top:3px}" +
      ".lx-empty{text-align:center;padding:34px 10px;color:var(--mut)}.lx-empty-ico{font-size:2.6rem;margin-bottom:8px}.lx-empty p{max-width:420px;margin:0 auto 16px}" +
      ".lx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 4px}.lx-chip{border:1.5px solid var(--chip-border);background:var(--chip-bg);color:var(--ink);padding:9px 13px;border-radius:999px;font-size:.82rem;cursor:pointer;min-height:40px;transition:.15s}.lx-chip:hover{border-color:var(--gold)}.lx-chip.on{background:var(--green-d);border-color:var(--green-d);color:#fff}.lx-chip.on:hover{border-color:var(--gold)}" +
      ".lx-field{display:flex;flex-direction:column;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:700}.lx-field .input{margin-top:4px}" +
      ".lx-how{background:var(--panel);border:1px dashed var(--card-border);border-radius:12px;padding:12px 14px;font-size:.84rem;color:var(--ink-2);margin-top:16px;line-height:1.6}.lx-how b{color:var(--ink)}" +
      ".lx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:10px 0 18px}.lx-stats>div{background:var(--panel);border:1px solid var(--card-border);border-radius:12px;padding:12px 6px;text-align:center}.lx-stats b{display:block;font-size:1.35rem;font-weight:900;color:var(--green-d)}.lx-stats small{font-size:.64rem;letter-spacing:.05em;color:var(--mut);text-transform:uppercase}" +
      ".lx-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.lx-cat{background:var(--card);border:1px solid var(--card-border);border-radius:14px;padding:12px 12px 6px}.lx-cat h4{font-size:.78rem;letter-spacing:.05em;color:var(--gold-d,#8a5f24);margin:0 0 8px;text-transform:uppercase}" +
      ".lx-row{display:flex;align-items:center;gap:10px}.lx-pod{border-radius:10px;padding:8px 6px;margin-bottom:6px;background:var(--bg);font-size:.9rem}.lx-pod b{display:block}.lx-pod small{display:block;font-size:.7rem;color:var(--mut)}.lx-med{font-size:1.1rem}" +
      ".lx-bar{height:12px;border-radius:999px;background:var(--bar-track);overflow:hidden;margin:12px 0 6px}.lx-bar>div{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--gold-d,#8a5f24),var(--gold,#c9a25f))}.lx-pmeta{display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--ink-2)}.lx-pmeta b{color:var(--green-d)}" +
      ".lx-phead{display:flex;align-items:center;gap:14px;margin-bottom:4px}.lx-pnum{font-size:2rem;font-weight:900;color:var(--gold-d,#8a5f24);line-height:1}.lx-phead b{display:block}.lx-phead small{display:block;font-size:.74rem;color:var(--mut)}" +
      ".lx-warn{background:var(--red-l);border:1px solid var(--red);color:var(--red);border-radius:10px;padding:9px 12px;font-size:.8rem;margin:10px 0}" +
      ".lx-planlist{margin-top:12px}.lx-day{border:1px solid var(--card-border);border-radius:14px;margin-bottom:10px;overflow:hidden;background:var(--card)}.lx-day.today{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}.lx-dayhead{display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:.8rem;background:var(--panel);letter-spacing:.03em;color:var(--ink-2)}.lx-day.today .lx-dayhead b{color:var(--green-d);font-weight:900}.lx-task{padding:10px 12px;border-top:1px dashed var(--card-border);transition:.2s}.lx-task.done{opacity:.55}.lx-trow{display:flex;align-items:flex-start;gap:10px}.lx-tick{position:relative;flex:none;margin-top:3px}.lx-tick input{position:absolute;inset:0;opacity:0;width:22px;height:22px;cursor:pointer;z-index:2}.lx-tick span{display:inline-block;width:22px;height:22px;border:2px solid var(--chip-border);border-radius:7px;cursor:pointer;background:var(--opt-bg)}.lx-tick input:checked+span{background:var(--green-d);border-color:var(--green-d)}.lx-tick input:checked+span::after{content:'✓';color:#fff;display:grid;place-items:center;line-height:18px;font-size:.8rem;text-align:center}.lx-task b{font-size:.86rem;color:var(--ink)}.lx-mini{padding:6px 10px;font-size:.72rem;min-height:34px;white-space:nowrap}" +
      ".lx-qhead{display:flex;align-items:center;gap:10px;font-size:.8rem;margin-bottom:12px;color:var(--ink-2);flex-wrap:wrap}.lx-qhead b{color:var(--ink)}.lx-qn{background:var(--panel);border:1px solid var(--card-border);border-radius:999px;padding:3px 10px;font-variant-numeric:tabular-nums}" +
      ".lx-score{display:flex;align-items:center;gap:12px;font-size:.85rem;margin-bottom:12px;padding:8px 12px;border-radius:999px;background:var(--panel);justify-content:center}.lx-score .ok{color:var(--green-2,#1f8a68);font-weight:800}.lx-score .mid{color:var(--gold-d,#8a5f24);font-weight:800}.lx-score .no{color:var(--red);font-weight:800}" +
      ".lx-question{font-size:1.16rem;line-height:1.65;color:var(--ink);margin:10px 0 16px;padding:4px 2px}" +
      ".lx-opts{display:grid;gap:9px;margin:6px 0}.lx-readonly .lx-opt{cursor:default}.lx-opt{display:flex;gap:12px;align-items:flex-start;text-align:left;border:1.5px solid var(--opt-border);background:var(--opt-bg);color:var(--ink);border-radius:13px;padding:12px 14px;font-size:.95rem;cursor:pointer;min-height:48px;transition:.15s;font-family:inherit}.lx-opt:hover:not(:disabled){border-color:var(--gold);transform:translateY(-1px)}.lx-opt:disabled{cursor:default}.lx-opt.correct{border-color:var(--green-2,#1f8a68);background:var(--green-l,#e4f2ec)}.lx-opt.wrong{border-color:var(--red);background:var(--red-l,#fbe9e7)}.lx-letter{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--green-d);color:#fff;font-size:.72rem;font-weight:900}" +
      ".lx-grade,.lx-fb{margin-top:14px;background:var(--panel);border-radius:14px;padding:14px;display:flex;flex-wrap:wrap;align-items:center;gap:10px}.lx-grade b{width:100%;font-size:.95rem}.lx-fb{border-left:4px solid var(--gold)}.lx-fb.ok{border-left-color:var(--green-2,#1f8a68)}.lx-fb.no{border-left-color:var(--red)}.lx-fb p{width:100%;margin:0;font-size:.85rem;color:var(--ink-2);line-height:1.6}.lx-explain{width:100%;margin:2px 0 0;font-size:.87rem;color:var(--ink-2);line-height:1.6}" +
      ".lx-finish{text-align:center;padding:14px 4px}.lx-trophy{font-size:3.4rem;margin-bottom:6px}.lx-finish h3{margin:4px 0 16px}.lx-finish .lx-stats{grid-template-columns:repeat(auto-fit,minmax(80px,1fr))}" +
      ".lx-fcards{display:grid;gap:12px;margin-top:8px}.lx-fcard{border:1px solid var(--card-border);background:var(--card);border-radius:14px;padding:12px 14px}.lx-fcard p{margin:8px 0 0;font-size:.9rem;line-height:1.65;color:var(--ink-2)}.lx-fhead{display:flex;align-items:center;gap:8px;justify-content:space-between}.lx-fhead b{font-size:.95rem}" +
      ".lx-score.qm{justify-content:space-between;gap:6px;padding:6px 14px}.lx-score.qm b{font-size:.9rem}.lx-score.qm i{font-style:normal;font-weight:900;font-size:1.15rem;color:var(--green-d);padding:0 4px}.lx-qm-detail{margin-top:8px;color:var(--mut);font-size:.78rem}.lx-qm-detail small{font-size:.76rem}" +
      /* ---- responsive + Focus Lab scoped styles ---- */
      ".lx-cats{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.lx-row{flex-wrap:wrap}.lx-chips-scroll{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:thin}.lx-chips-scroll .lx-chip{white-space:nowrap;flex:none}" +
      ".lxfocus-pill{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translate(-50%,18px);z-index:71;display:flex;align-items:center;gap:8px;background:var(--card-solid);border:1px solid var(--card-border);border-radius:999px;padding:7px 14px;box-shadow:var(--shadow);opacity:0;pointer-events:none;transition:.25s;font-family:inherit;cursor:pointer}.lxfocus-pill.show{transform:translate(-50%,0);opacity:1;pointer-events:auto}.lxfocus-pill i{font-style:normal;font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}.lxfocus-pill b{font-size:.95rem;font-variant-numeric:tabular-nums;color:var(--green-d)}" +
      ".lx-focus-setup{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}.lx-focus-setup .lx-chips{margin:4px 0 0}.lx-focus-setup .lx-chips .lx-chip{min-height:38px}.lx-focus-setup.lx-dis{opacity:.55;pointer-events:none;filter:grayscale(.4)}" +
      ".lx-focus-clock{text-align:center;padding:16px 6px 4px}.lx-focus-ring{width:150px;height:150px;margin:0 auto;border-radius:50%;border:2px solid var(--gold-d,#8a5f24);background:radial-gradient(circle at 50% 40%,rgba(201,162,39,.18),transparent 62%);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 0 10px var(--bar-track),0 18px 34px -18px rgba(0,0,0,.35)}.lx-focus-ring b{font-size:2.1rem;font-weight:900;color:var(--green-d);font-variant-numeric:tabular-nums;line-height:1}.lx-focus-ring small{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);margin-top:6px}" +
      ".lx-focus-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:18px 0 8px}.lx-focus-actions .btn{min-width:104px}.lx-focus .lx-bar{max-width:320px;margin:16px auto 0}.lx-focus-how{font-size:.8rem;color:var(--ink-2);line-height:1.6;background:var(--panel);border:1px dashed var(--card-border);border-radius:12px;padding:11px 13px;margin-top:12px}.lx-focus-how b{color:var(--ink)}.lx-stats-focus{margin:12px 0 0;grid-template-columns:repeat(3,1fr)}" +
      "@media(max-width:560px){.lx-focus-ring{width:126px;height:126px}.lx-focus-ring b{font-size:1.72rem}.lxfocus-pill{bottom:calc(70px + env(safe-area-inset-bottom))}.lx-focus-actions .btn{min-width:88px;padding:11px 12px}}"
    + "/* v17 Lumina II — Exam-Room Labs polish (appended to the labs.js CSS string\n   by patch_v17.py). Scoped .lx-*, gold-on-ivory consistent with the shell. */\n.lx-modal{box-shadow:0 30px 70px -22px rgba(20,35,70,.5),inset 0 2px 0 -1px rgba(201,162,39,.95),inset 0 0 0 1px rgba(201,162,39,.15)}\n.lx-head{background:linear-gradient(180deg,rgba(201,162,39,.12),transparent);border-bottom:1px solid rgba(201,162,39,.28)}\n.lx-x{transition:transform .25s ease,background .2s ease,color .2s ease,border-color .2s ease}\n.lx-x:hover{background:var(--grad-gold);border-color:transparent;color:#31220a;transform:rotate(90deg)}\n.lx-trophy{filter:drop-shadow(0 6px 14px rgba(201,162,39,.55))}\n.lx-med{box-shadow:0 0 0 1px rgba(201,162,39,.4),0 8px 18px -10px rgba(201,162,39,.55)}\n.lx-tick{border-color:rgba(201,162,39,.6);transition:background .18s ease,border-color .18s ease}\n.lx-task:hover .lx-tick{background:rgba(201,162,39,.18)}\n.lx-fcard{transition:transform .18s ease,box-shadow .25s ease,border-color .2s ease}\n.lx-fcard:hover{transform:translateY(-2px);border-color:rgba(201,162,39,.55);box-shadow:0 16px 30px -18px rgba(20,35,70,.45)}\n.lx-cat,.lx-chip{transition:background .16s ease,border-color .16s ease,color .16s ease,transform .14s ease}\n.lx-cat:hover,.lx-chip:hover{transform:translateY(-1px)}\n.lx-focus-ring{box-shadow:0 0 0 3px rgba(201,162,39,.35),0 24px 60px -28px rgba(201,162,39,.55);transition:box-shadow .5s ease}\n.lx-pnum,.lx-score{font-variant-numeric:tabular-nums}\n.lx-qhead,.lx-qn{font-weight:800}\n.lx-opt{transition:transform .14s ease,border-color .18s ease,background .18s ease}\n.lx-opt:hover:not(:disabled){transform:translateY(-1px);border-color:rgba(201,162,39,.6)}\n.lx-opt.good{background:linear-gradient(135deg,rgba(47,158,99,.18),rgba(47,158,99,.08));border-color:#2f9e63;box-shadow:0 10px 22px -12px rgba(47,158,99,.65)}\n.lx-opt.bad{background:linear-gradient(135deg,rgba(217,95,84,.18),rgba(217,95,84,.08));border-color:#d95f54;animation:lxShake .4s ease}\n@keyframes lxShake{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}\n@media(max-width:560px){\n  .lx-modal{border-radius:14px}\n}\n"
    + "/* v18 Aurum — Exam-Room Labs first-class: breathing focus ring, floating\n   trophy, gold subject/qnum chips, score pills. Motion-gated. */\n.lx-focus-ring{background:radial-gradient(circle at 50% 32%,rgba(201,162,39,.2),transparent 68%)}\n.lx-qhead{gap:8px}\n.lx-qhead>span:first-child{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(201,162,39,.5);background:linear-gradient(180deg,rgba(201,162,39,.16),rgba(201,162,39,.05));border-radius:999px;padding:3px 11px;font-weight:800;color:#7a5c1a;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}\n.lx-qn{display:inline-grid;place-items:center;min-width:34px;height:26px;border-radius:999px;background:var(--grad-gold);color:#31220a;font-size:.7rem;font-weight:900;box-shadow:0 6px 14px -6px rgba(201,162,39,.8)}\n.lx-blitz-score .ok,.lx-blitz-score .mid,.lx-blitz-score .no{border-radius:999px;padding:3px 10px;border:1px solid transparent}\n.lx-blitz-score .ok{color:#1b6b42;background:rgba(47,158,99,.12);border-color:rgba(47,158,99,.4)}\n.lx-blitz-score .mid{color:#8a6100;background:rgba(201,162,39,.14);border-color:rgba(201,162,39,.45)}\n.lx-blitz-score .no{color:#a33a30;background:rgba(217,95,84,.12);border-color:rgba(217,95,84,.4)}\n[data-theme=dark] .lx-qhead>span:first-child{color:#e6c47a;background:linear-gradient(180deg,rgba(201,162,39,.22),rgba(201,162,39,.08))}\n@media (prefers-reduced-motion: no-preference){\n  html:not(.rmotion) .lx-focus-ring{animation:lxBreath 3.6s ease-in-out infinite}\n  html:not(.rmotion) .lx-trophy{animation:lxFloat 3.2s ease-in-out infinite}\n  @keyframes lxBreath{0%,100%{box-shadow:0 0 0 3px rgba(201,162,39,.35),0 24px 60px -28px rgba(201,162,39,.55)}50%{box-shadow:0 0 0 7px rgba(201,162,39,.18),0 30px 70px -26px rgba(201,162,39,.7)}}\n  @keyframes lxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}\n}\n"
    + "/* v19 — Responsiveness across all devices (Exam-Room Labs): dvh modal,\n   safe-area, ultra-narrow padding, landscape. */\n.lx-modal{max-height:100dvh;padding-bottom:calc(20px + env(safe-area-inset-bottom))}\n@media(max-width:359px){\n  .lx-modal{padding:12px 10px}\n  .lx-head{flex-wrap:wrap;gap:8px}\n  .lx-opts{gap:6px}\n}\n@media(max-height:520px){\n  .lx-modal{max-height:100dvh;border-radius:0}\n}\n";
    document.head.appendChild(css);
  }
})();
