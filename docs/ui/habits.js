/* MAMSS PREP v64 "The Habit Loop" — the gamification layer.
   Duolingo-grade habit mechanics in the school's own studio voice:
     • a persistent TODAY board on the overview (streak flame, three daily
       quests, a weekly quest, the class league) — the display does the
       notification work, no nagging popups;
     • streak FREEZES: every 7-day streak banks a freeze; a single missed
       day is bridged by a freeze instead of burning the run (loss
       aversion, designed kind);
     • a weekly LEAGUE computed from the school's own class_progress
       reports — effort-based (questions answered this week), first names
       only, and it degrades to a calm empty state until reports exist;
     • celebration moments (quest complete, streak milestone, league top
       three) with a reduced-motion guard.
   Everything here is additive: the engine's own streak/XP/badge maths is
   untouched and remains authoritative for badges; this module only
   displays, bridges and rewards. */
(() => {
  "use strict";

  var DAY = 86400000;
  var CLAIM = "nssc_hab_claim";     /* {d:'YYYY-MM-DD', q:[b,b,b], w:'WW', wc:bool} */
  var FREEZ = "nssc_hab_freeze";     /* {banked:n, used:[dates], milestone:n}      */
  var MSTART = "nssc_hab_mstart";    /* {d:'YYYY-MM-DD', n:mistakesCount}          */
  var LEAG = "nssc_hab_league";      /* {at:ms, rows:[...]}                        */
  var CEL = "nssc_hab_cel";          /* {'kind:YYYY-MM-DD':1}                      */

  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid() { var u = ls("nssc_user", null); return u && u.id ? u.id : "guest"; }
  function attempts() { var t = ls("nssc_attempts_" + uid(), []); return Array.isArray(t) ? t : []; }
  function dayKey(t) {
    var d = t ? new Date(t) : new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function weekStart() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    var dow = (d.getDay() + 6) % 7;           /* Monday = 0 */
    return new Date(d.getTime() - dow * DAY);
  }
  function weekKey() { return dayKey(weekStart().getTime()); }

  /* ---------------------------------------------------- streak + freezes */
  function studyDays() {
    var set = {}, at = attempts(), i;
    for (i = 0; i < at.length; i++) if (at[i].tms) set[dayKey(at[i].tms)] = 1;
    return set;
  }
  /* raw consecutive run ending today or yesterday */
  function rawStreak(set) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    if (!set[dayKey(d.getTime())]) d = new Date(d.getTime() - DAY);
    var n = 0;
    while (set[dayKey(new Date(d.getTime() - n * DAY).getTime())]) n++;
    return n;
  }
  /* displayed streak: bridge single-day gaps with banked freezes */
  function streak() {
    var set = studyDays();
    var fz = ls(FREEZ, { banked: 0, used: [], milestone: 0 });
    var d = new Date(); d.setHours(0, 0, 0, 0);
    if (!set[dayKey(d.getTime())]) d = new Date(d.getTime() - DAY);
    var n = 0, avail = fz.banked - fz.used.length;
    for (;;) {
      var k = dayKey(new Date(d.getTime() - n * DAY).getTime());
      if (set[k]) { n++; continue; }
      /* a one-day hole that is itself followed by a run? look ahead */
      var next = dayKey(new Date(d.getTime() - (n + 1) * DAY).getTime());
      if (set[next] && avail > 0 && fz.used.indexOf(k) === -1) {
        fz.used.push(k); avail--; sv(FREEZ, fz); n++; continue;
      }
      break;
    }
    /* bank a freeze at every 7-day milestone */
    var ms = Math.floor(n / 7);
    var old = fz.milestone || 0;
    if (ms > old) {
      fz.milestone = ms;
      fz.banked = (fz.banked || 0) + (ms - old);
      sv(FREEZ, fz);
      celebrate("freeze", "Streak shield banked", n + " days in a row earned you a freeze — one missed day can no longer break your run.");
    }
    return { days: n, banked: fz.banked || 0, used: (fz.used || []).length };
  }

  /* ------------------------------------------------------------- quests */
  function mistakesOpen() { return (ls("nssc_mistakes", []) || []).length; }
  function questState() {
    var today = dayKey(), at = attempts(), i;
    var qs = 0, best = 0, days = 0;
    for (i = 0; i < at.length; i++) {
      if (dayKey(at[i].tms) === today) { qs += +at[i].total || 0; if ((+at[i].pct || 0) > best) best = +at[i].pct; }
    }
    var set = studyDays(), ws = weekStart();
    for (var k in set) if (new Date(k + "T00:00:00") >= ws) days++;
    /* mistakes cleared today vs the morning snapshot */
    var ms = ls(MSTART, null);
    if (!ms || ms.d !== today) { ms = { d: today, n: mistakesOpen() }; sv(MSTART, ms); }
    var cleared = Math.max(0, ms.n - mistakesOpen());
    var q = [
      { id: "q1", label: "Answer 20 questions", have: Math.min(qs, 20), need: 20, reward: 10 },
      { id: "q2", label: "Score 70%+ on any paper", have: best >= 70 ? 1 : 0, need: 1, reward: 10, pct: best },
      { id: "q3", label: "Clear 3 from your mistake bank", have: Math.min(cleared, 3), need: 3, reward: 15 },
    ];
    var w = { id: "w1", label: "Study 5 days this week", have: Math.min(days, 5), need: 5, reward: 40 };
    return { d: today, q: q, w: w, wk: weekKey() };
  }
  function claimQuests() {
    var st = questState();
    var cl = ls(CLAIM, null);
    if (!cl || cl.d !== st.d) cl = { d: st.d, q: [false, false, false], w: st.wk, wc: false };
    var got = 0, done = 0;
    st.q.forEach(function (qq, i) {
      if (!cl.q[i] && qq.have >= qq.need) { cl.q[i] = true; got += qq.reward; done++; }
    });
    if (!cl.wc && cl.w === st.wk && st.w.have >= st.w.need) { cl.wc = true; got += st.w.reward; done++; }
    if (got > 0) {
      sv(CLAIM, cl);
      try { if (typeof coinsAdd === "function") coinsAdd(got); } catch (e) {}
      try { if (typeof toast === "function") toast("Quest complete — +" + got + " coins", "🏅"); } catch (e) {}
      celebrate("quest", "Quests cleared", done === 1 ? "A quest is complete — the coins are in your purse." : "All today's quests are complete. The loop feeds on days like this.");
    }
    return { st: st, cl: cl };
  }

  /* ------------------------------------------------------------- league */
  function leagueFetch() {
    /* fail-closed like the reporter: a locked device makes zero requests */
    try { if (!window.MAMSS_ACT || !MAMSS_ACT.activated || !MAMSS_ACT.activated()) return Promise.resolve(null); } catch (e) { return Promise.resolve(null); }
    var cached = ls(LEAG, null);
    if (cached && Date.now() - cached.at < 600000) return Promise.resolve(cached.rows);
    var c = null;
    try { c = (window.MAMSS_ACT && MAMSS_ACT.ledger && MAMSS_ACT.ledger()) || (window.MAMSS_CODES && MAMSS_CODES.ledger) || null; } catch (e) {}
    if (!c) return Promise.resolve(cached ? cached.rows : null);
    return fetch(c.url + "/rest/v1/class_progress?select=owner,student,cls,blob,updated_at&limit=400", {
      headers: { "apikey": c.key, "Authorization": "Bearer " + c.key }
    }).then(function (r) {
      if (!r.ok) return cached ? cached.rows : null;
      return r.json().then(function (rows) { sv(LEAG, { at: Date.now(), rows: rows }); return rows; });
    }).catch(function () { return cached ? cached.rows : null; });
  }
  function leagueRows(rows) {
    var ws = weekStart().getTime(), out = [], i, j;
    for (i = 0; i < (rows || []).length; i++) {
      var b = rows[i].blob || {}, rec = b.recent || [], q = 0;
      for (j = 0; j < rec.length; j++) if ((+rec[j].t || 0) >= ws) q += +rec[j].tot || 0;
      out.push({ owner: rows[i].owner, name: String(rows[i].student || "Student").split(" ")[0], cls: rows[i].cls || "", q: q });
    }
    out.sort(function (a, b) { return b.q - a.q; });
    return out;
  }

  /* -------------------------------------------------------- celebration */
  function celebrate(kind, title, sub) {
    var key = kind + ":" + dayKey();
    var done = ls(CEL, {});
    if (done[key]) return;
    done[key] = 1; sv(CEL, done);
    var old = document.getElementById("habCelebrate");
    if (old) old.remove();
    var ov = document.createElement("div");
    ov.id = "habCelebrate";
    ov.className = "hab-celebrate";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "false");
    ov.setAttribute("aria-label", title);
    ov.innerHTML = '<div class="hab-cel-card">' +
      '<svg class="hab-cel-crest" aria-hidden="true"><use href="#i-crest"></use></svg>' +
      "<div class=\"hab-cel-burst\" aria-hidden=\"true\"></div>" +
      "<b>" + title + "</b><p>" + sub + "</p>" +
      '<button type="button" class="hab-cel-x" aria-label="Close">Continue</button></div>';
    document.body.appendChild(ov);
    var kill = function () { if (ov.isConnected) ov.remove(); };
    ov.querySelector(".hab-cel-x").onclick = kill;
    setTimeout(kill, 5000);
  }

  /* -------------------------------------------------------------- board */
  function flame(n) {
    return '<svg class="hab-flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4-4 6-4 11a4 4 0 0 0 8 0c0-2-1-3-1-3s3 1 3 4a6 6 0 0 1-12 0C6 8 11 6 12 2z" fill="currentColor"/></svg>' +
      '<b class="hab-days">' + n + "</b><span class=\"hab-lbl\">day streak</span>";
  }
  function bar(have, need, label) {
    var pct = need ? Math.min(100, Math.round(have / need * 100)) : 0;
    return '<div class="hab-bar" role="progressbar" aria-label="' + label + '" aria-valuemin="0" aria-valuemax="' + need + '" aria-valuenow="' + have + '"><i style="width:' + pct + '%"></i></div>';
  }
  function render() {
    var mount = document.getElementById("viewOverview");
    if (!mount) return;
    var anchor = mount.querySelector(".bottom-grid");
    var host = document.getElementById("habPanel");
    if (!host) {
      host = document.createElement("section");
      host.id = "habPanel";
      host.className = "hab-panel";
      host.setAttribute("aria-label", "Today at MAMSS");
      if (anchor) mount.insertBefore(host, anchor);
      else mount.appendChild(host);
    }
    var s = streak(), qq = claimQuests();
    var h = '<div class="hab-head"><span class="eyebrow">THE HABIT LOOP</span><h2>Today at MAMSS.</h2></div><div class="hab-grid">';
    /* flame card */
    h += '<article class="hab-card hab-flamecard">' + flame(s.days) +
      '<p class="hab-freeze">' + (s.banked - s.used > 0
        ? " " + (s.banked - s.used) + " streak shield" + (s.banked - s.used === 1 ? "" : "s") + " banked"
        : "Bank a shield at every 7-day run") + "</p></article>";
    /* quests card */
    h += '<article class="hab-card hab-quests"><h3>Today’s quests</h3>';
    qq.st.q.forEach(function (q, i) {
      var done = qq.cl.q[i];
      h += '<div class="hab-q' + (done ? " done" : "") + '"><span class="hab-q-lbl">' + q.label +
        '<em>' + (done ? "✓ +" + q.reward : q.have + "/" + q.need) + "</em></span>" + bar(q.have, q.need, q.label) + "</div>";
    });
    h += '<div class="hab-q hab-week' + (qq.cl.wc ? " done" : "") + '"><span class="hab-q-lbl">' + qq.st.w.label +
      '<em>' + (qq.cl.wc ? "✓ +" + qq.st.w.reward : qq.st.w.have + "/" + qq.st.w.need) + "</em></span>" + bar(qq.st.w.have, qq.st.w.need) + "</div>";
    h += "</article>";
    /* league card */
    h += '<article class="hab-card hab-league"><h3>This week’s league</h3><div class="hab-league-body" id="habLeagueBody"><p class="hab-muted">Reading the class board…</p></div></article>';
    h += "</div>";
    host.innerHTML = h;
    leagueFetch().then(function (rows) {
      var body = document.getElementById("habLeagueBody");
      if (!body) return;
      if (!rows || !rows.length) {
        body.innerHTML = '<p class="hab-muted">The league begins when your class files its first progress report.</p>';
        return;
      }
      var lr = leagueRows(rows), mine = null, i;
      var own = null;
      try { own = window.MAMSS_PROGRESS && MAMSS_PROGRESS.owner(); } catch (e) {}
      for (i = 0; i < lr.length; i++) if (lr[i].owner === own) mine = i;
      var top = lr.slice(0, 5).map(function (r, i) {
        return '<div class="hab-lrow' + (mine === i ? " me" : "") + '"><b>' + (i + 1) + "</b><span>" +
          esc(r.name) + " <em>" + esc(r.cls) + "</em></span><i>" + r.q + " q</i></div>";
      }).join("");
      var meLine = mine == null ? "" : (mine >= 5
        ? '<div class="hab-lrow me"><b>' + (mine + 1) + "</b><span>You</span><i>" + lr[mine].q + " q</i></div>" : "");
      body.innerHTML = top + meLine || '<p class="hab-muted">No questions logged this week yet — set the pace.</p>';
      if (mine != null && mine < 3) celebrate("league", "Podium finish", "You sit in the top three of this week’s league — the board remembers.");
    });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* --------------------------------------------------------------- boot */
  function loop() {
    var v = document.getElementById("viewOverview");
    if (v && !v.hidden) render();
    setTimeout(loop, 15000);
  }
  function init() {
    document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
    document.addEventListener("click", function () { setTimeout(render, 250); }, true);
    setTimeout(loop, 1000);
    render();
  }
  window.MAMSS_HABITS = {
    render: render, streak: streak, quests: questState, league: leagueRows, celebrate: celebrate,
    _test: { dayKey: dayKey, weekStart: weekStart, weekKey: weekKey, rawStreak: rawStreak, studyDays: studyDays, CLAIM: CLAIM, FREEZ: FREEZ, MSTART: MSTART, LEAG: LEAG, CEL: CEL }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else setTimeout(init, 0);
})();
