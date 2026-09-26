#!/usr/bin/env python3
"""v62 'The Open Book' — school-visible progress reports. Part 1: app edits."""
import pathlib, sys

ROOT = pathlib.Path('/home/user/mamss-prep/docs')

def edit(rel, old, new, count=1):
    p = ROOT / rel
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != count:
        print(f'ABORT {rel}: anchor found {n}x (want {count}): {old[:70]!r}')
        sys.exit(1)
    p.write_text(s.replace(old, new), encoding='utf-8')
    print(f'ok {rel}: {old[:50]!r} -> patched')

# ---------------------------------------------------------------- cbt.js
CBT = 'cbt.js'

# 1. privacy note -> progress panel mount + honest v62 note
edit(CBT,
     '''    h += "<p class='cbt-note'>🔒 Practice progress (Cloud Sync) is private to each student and never appears here — the dashboard aggregates live exams and slip activation only.</p>";''',
     '''    h += "<div id=\\"cbtProgPanel\\"></div>";
      h += "<p class='cbt-note'>🔓 Since v62 every activated device publishes a progress report (scores, subjects, streaks) to this dashboard. Answer-level detail and the private Cloud Sync blob never leave the student's device.</p>";''')

# 2. fill the panel after the dashboard renders
edit(CBT,
     '''    host.innerHTML = h;
    var rf = $("cbtDashRefresh"); if (rf) rf.onclick = function () { renderSchool(); };''',
     '''    host.innerHTML = h;
    fillProgPanel();
    var rf = $("cbtDashRefresh"); if (rf) rf.onclick = function () { renderSchool(); };''')

# 3. the progress panel engine, inserted before the pure aggregator comment
edit(CBT,
     '''  /* pure aggregator — exported for tests */
  function schoolStats(sessions, attempts, ledger) {''',
     '''  /* ------------------------------------- class progress panel (v62) */
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
          ? "<h3 style=\\"margin:16px 0 6px\\">Class progress</h3><div class='cbt-note cbt-setup'>📚 <b>Class progress is waiting for its one-time setup.</b> Paste <code>tools/progress_schema.sql</code> into the Supabase SQL editor; the panel starts filling on its own afterwards.</div>"
          : "<h3 style=\\"margin:16px 0 6px\\">Class progress</h3><p class='cbt-muted'>Class progress is not reachable from this copy of the site.</p>";
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
    h = "<h3 style=\\"margin:16px 0 6px\\">Class progress</h3>";
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
    var h = "<h3 style=\\"margin:16px 0 6px\\"><button class='cbt-btn prg-back' id='prgBack'>← All students</button> " +
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
      h += "<p class='cbt-sub' style='margin-top:10px'>Last " + rec.length + " sessions</p>";
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
    var uri = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\\n"));
    var a2 = el("a", { href: uri, download: "mamss-class-progress.csv" });
    document.body.appendChild(a2); a2.click(); a2.remove();
  }

  /* pure aggregator — exported for tests */
  function schoolStats(sessions, attempts, ledger) {''')

# 4. export the new aggregators for tests
edit(CBT,
     '''      schoolStats: schoolStats, schoolFetch: schoolFetch,''',
     '''      schoolStats: schoolStats, schoolFetch: schoolFetch,
      progStats: progStats, progAcc: progAcc, prog: function () { return { rows: dashProg.rows, sel: dashProg.sel }; },''')

# ------------------------------------------------------------ index.html
edit('index.html',
     '''<p>Real progress, from your practice on this device.</p>''',
     '''<p>Real progress, from your practice on this device.</p><p class="prg-school-line"><svg class="ico" aria-hidden="true"><use href="#i-shield"></use></svg>Your school sees a summary of this progress — scores, subjects, streaks — in the teacher dashboard. Full answer detail stays on this device.</p>''')

edit('index.html',
     '''<script defer="" src="ui/school.js"></script>''',
     '''<script defer="" src="ui/school.js"></script><script defer="" src="ui/progress-up.js"></script>''')

# ------------------------------------------------------------ upgrade.js
edit('upgrade.js',
     '''  var V = 61, NAME = "The Finishing Pass";''',
     '''  var V = 62, NAME = "The Open Book";''')

edit('upgrade.js',
     '''    var l = $("mpLock"); if (l) l.hidden = true;
    try { document.documentElement.classList.add("mp-code-ok"); } catch (e) {}
    releaseLock();
  }''',
     '''    var l = $("mpLock"); if (l) l.hidden = true;
    try { document.documentElement.classList.add("mp-code-ok"); } catch (e) {}
    releaseLock();
    try { if (typeof window.MAMSS_PROGRESS_WAKE === "function") window.MAMSS_PROGRESS_WAKE(); } catch (e) {}
  }''')

# ---------------------------------------------------------------- sw.js
edit('sw.js',
     '''"./notices.js", "./ui/school.js", "./codes.js", "./upgrade.js", "./cbt.js", "./sync.js", "./upgrade.css",''',
     '''"./notices.js", "./ui/school.js", "./ui/progress-up.js", "./codes.js", "./upgrade.js", "./cbt.js", "./sync.js", "./upgrade.css",''')

import re
sw = ROOT / 'sw.js'; t = sw.read_text(encoding='utf-8')
t2, n = re.subn(r'-v66', '-v67', t)
assert n >= 1, 'sw cache tag'
sw.write_text(t2, encoding='utf-8'); print('ok sw.js: cache -v67')

# ------------------------------------------------------------ atelier.css
css = ROOT / 'ui/atelier.css'; c = css.read_text(encoding='utf-8')
block = '''
/* ── v62 "The Open Book" — class progress panel + student transparency ── */
.prg-school-line{display:flex;align-items:flex-start;gap:7px;margin-top:6px;font-size:.82rem;color:var(--s-muted,#5c6672)}
.prg-school-line .ico{width:14px;height:14px;flex:none;margin-top:2px;color:rgba(201,162,39,.85)}
.prg-strip{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.prg-chip{display:flex;flex-direction:column;gap:1px;min-width:96px;padding:8px 12px;border:1px solid rgba(201,162,39,.5);border-radius:10px;background:rgba(201,162,39,.07)}
.prg-chip b{font:600 17px/1.2 var(--studio-serif,Georgia,serif);color:var(--s-ink,#002147)}
.prg-chip span{font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;color:var(--s-muted,#5c6672)}
.prg-row{margin:4px 0}
.prg-row .prg-open{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;width:100%;border:1px solid var(--s-line,#e1e0d9);border-radius:10px;background:var(--studio-panel,#fbfaf7);padding:9px 12px;cursor:pointer;font:inherit;color:inherit;text-align:left}
.prg-row .prg-open:hover{border-color:rgba(201,162,39,.6);transform:translateY(-1px)}
.prg-row .prg-nums{margin-left:auto;font-size:.8rem;color:var(--s-body,#39424e)}
.prg-row .prg-seen{font-size:.72rem;width:100%;margin-left:0}
.prg-drill{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}
.prg-subj{border:1px solid var(--s-line,#e1e0d9);border-radius:10px;background:var(--studio-panel,#fbfaf7);padding:8px 10px}
.prg-subj b{display:block;font-size:.82rem}
.prg-subj span{font-size:.72rem;color:var(--s-muted,#5c6672)}
.prg-subj .cbt-hbar{margin-top:6px}
.prg-back{margin-right:6px}
html.ao-night .prg-chip{background:rgba(227,199,107,.08);border-color:rgba(227,199,107,.4)}
html.ao-night .prg-chip b{color:var(--s-ink,#e8e4da)}
html.ao-night .prg-row .prg-open,html.ao-night .prg-subj{background:var(--studio-panel,#171a1f)}
@media(max-width:600px){.prg-chip{min-width:calc(50% - 6px)}.prg-row .prg-nums{margin-left:0;width:100%}}
'''
css.write_text(c + block, encoding='utf-8'); print('ok atelier.css: v62 block appended')
print('PART 1 DONE')
