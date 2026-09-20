/* v25.0 — NERDC Lesson Notes (lazy module). Uses window.PRIM (curriculum map),
   window.NOTES (full 8-part lesson notes) and window.NOTES_META provided by
   quiz/notes_data.js. One overlay: Notes browser (level → class → subject →
   term → week, with search), Scheme-of-work generator (printable), and My Space
   (role dashboards for Student / Teacher / Parent + author mode + bookmarks +
   progress). Everything is local-first; a superset of the shipped data can be
   added by a teacher in Author mode (stored on-device) or seeded from the
   repository build (quiz/n_*.py). */
(function () {
  "use strict";
  if (window.NT) return;
  window.NT = { open: open, close: close, key: key };

  var LS_ROLE = "nssc_role", LS_DONE = "nssc_note_done", LS_BM = "nssc_note_bm",
      LS_CUSTOM = "nssc_note_custom", PIN = "NERDC2026";
  var st = { lvl: "P", cls: "B1", subj: null, term: 1, tab: "notes", q: "", view: null };
  var TERMS = ["First Term", "Second Term", "Third Term"];

  var CSS =
    ".nt-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 18px 12px;border-bottom:1px solid rgba(201,162,39,.35)}" +
    ".nt-ico{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#e7c873,#b8912f);font-size:1.4rem;box-shadow:0 10px 22px -10px rgba(184,145,47,.8)}" +
    ".nt-tx{flex:1;min-width:0}.nt-tx h3{font-size:1.05rem;margin:0}.nt-tx small{color:var(--mut);font-size:.75rem}" +
    ".nt-x{background:none;border:1px solid var(--card-border);border-radius:10px;padding:7px 12px;cursor:pointer;color:var(--ink);font-family:inherit;font-size:.85rem}" +
    ".nt-tabs{display:flex;gap:8px;padding:13px 18px 4px;flex-wrap:wrap}" +
    ".nt-tab{border:1px solid var(--card-border);background:var(--panel,#fff);color:var(--ink-2);border-radius:999px;padding:8px 16px;font-weight:800;cursor:pointer;font-family:inherit;font-size:.8rem;transition:.2s}" +
    ".nt-tab.on{background:linear-gradient(135deg,#e7c873,#b8912f);color:#2a1d06;border-color:rgba(201,162,39,.55)}" +
    ".nt-body{padding:13px 18px 24px;max-height:calc(100dvh - 210px);overflow-y:auto}" +
    ".nt-search{width:100%;border:1.5px solid var(--card-border);background:var(--card,#fff);color:var(--ink);border-radius:12px;padding:11px 13px;font-size:.9rem;font-family:inherit;margin-bottom:11px}" +
    ".nt-chips,.nt-terms{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 10px}" +
    ".nt-chip{border:1px solid var(--card-border);background:var(--panel,#fff);color:var(--ink-2);border-radius:999px;padding:7px 14px;font-weight:800;cursor:pointer;font-family:inherit;font-size:.78rem;transition:.2s}" +
    ".nt-chip.on{background:#1b2a4a;color:#f3e9c8;border-color:#1b2a4a}" +
    ".nt-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}" +
    ".nt-sub{border:1px solid var(--card-border);border-radius:13px;padding:11px 12px;background:var(--card-solid,#fff);cursor:pointer;font-family:inherit;text-align:left;color:var(--ink);transition:.2s;display:flex;gap:9px;align-items:center}" +
    ".nt-sub:hover{border-color:var(--gold);box-shadow:var(--shadow-sm)}" +
    ".nt-sub .si{font-size:1.25rem;flex:none}.nt-sub b{display:block;font-size:.85rem}.nt-sub small{color:var(--mut);font-size:.68rem}" +
    ".nt-sub .badge{margin-left:auto;flex:none;background:rgba(201,162,39,.15);border:1px solid rgba(201,162,39,.4);color:#8a5f24;border-radius:99px;padding:2px 9px;font-size:.64rem;font-weight:900}" +
    ".nt-wk{width:100%;border:1px solid var(--card-border);border-radius:12px;background:var(--card,#fff);color:var(--ink);text-align:left;padding:11px 12px;font-family:inherit;cursor:pointer;display:flex;gap:10px;align-items:center;transition:.2s;margin-bottom:7px}" +
    ".nt-wk:hover{border-color:var(--gold);box-shadow:var(--shadow-sm)}" +
    ".nt-wk .wn{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(201,162,39,.14);font-weight:900;font-size:.78rem;color:#8a5f24}" +
    ".nt-wk .wt{flex:1;min-width:0}.nt-wk b{display:block;font-size:.82rem}.nt-wk small{color:var(--mut);font-size:.68rem}" +
    ".nt-wk.done{opacity:.72}.nt-wk.done .wn{background:rgba(15,107,79,.14);color:#0f6b4f}" +
    ".nt-empty{color:var(--mut);padding:22px;text-align:center;font-size:.85rem}" +
    ".nt-note{background:var(--card-solid,#fff);border:1px solid var(--card-border);border-radius:15px;padding:15px 16px}" +
    ".nt-note h4{font-size:1rem;margin:0 0 2px}.nt-note .nm{color:var(--mut);font-size:.74rem;margin-bottom:10px}" +
    ".nt-sec{margin:11px 0 0;padding:11px 12px;background:var(--panel,#f6f1e4);border-left:4px solid #c9a227;border-radius:0 11px 11px 0}" +
    ".nt-sec h5{margin:0 0 5px;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#8a5f24}" +
    ".nt-sec p{margin:0 0 6px;font-size:.85rem;line-height:1.65}.nt-sec li{font-size:.85rem;margin:0 0 4px 17px}" +
    ".nt-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}" +
    ".nt-btn{border:1px solid var(--card-border);background:var(--card,#fff);color:var(--ink);border-radius:999px;padding:9px 15px;font-weight:800;cursor:pointer;font-family:inherit;font-size:.78rem;transition:.2s}" +
    ".nt-btn.gold{background:linear-gradient(135deg,#e7c873,#b8912f);color:#2a1d06;border-color:rgba(201,162,39,.55)}" +
    ".nt-btn.on{background:#1b2a4a;color:#f3e9c8;border-color:#1b2a4a}" +
    ".nt-tbl{width:100%;border-collapse:collapse;font-size:.8rem}" +
    ".nt-tbl th,.nt-tbl td{border:1px solid var(--card-border);padding:8px 9px;text-align:left}" +
    ".nt-tbl th{background:rgba(201,162,39,.14);text-transform:uppercase;font-size:.68rem;letter-spacing:.06em;color:#8a5f24}" +
    ".nt-tbl b{color:var(--green-d,#8a5f24)}" +
    ".nt-space .nt-sec{background:var(--panel,#f6f1e4)}" +
    ".nt-field{display:block;width:100%;border:1.5px solid var(--card-border);background:var(--card,#fff);color:var(--ink);border-radius:10px;padding:9px 11px;font-size:.82rem;font-family:inherit;margin:4px 0 9px}" +
    ".nt-lbl{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2)}" +
    ".nt-pin{display:flex;gap:8px;align-items:center;flex-wrap:wrap}" +
    ".nt-bar{height:10px;background:var(--bar-track,#e6decc);border-radius:99px;overflow:clip;margin:7px 0 3px}" +
    ".nt-bar>i{display:block;height:100%;background:linear-gradient(90deg,#c9a227,#e7c873);border-radius:99px}" +
    "#ntPrint{display:none}" +
    "body.nt-printing{overflow:hidden!important}" +
    "body.nt-printing>*:not(#ntPrint){display:none!important}" +
    "body.nt-printing #ntPrint{display:block;background:#fff;color:#111;padding:18px;min-height:100vh}" +
    ".nt-pp{max-width:800px;margin:0 auto;font-family:Georgia,'Times New Roman',serif}" +
    ".nt-pp-head{border-bottom:3px double #8a5f24;padding-bottom:9px;margin-bottom:13px}" +
    ".nt-pp-head b{display:block;font-size:17px;letter-spacing:.12em;color:#111}" +
    ".nt-pp-head span{display:block;font-size:11.5px;color:#333;margin-top:2px}" +
    ".nt-pp .nt-sec{background:#fff;border-left:3px solid #b8912f;page-break-inside:avoid;padding:10px 12px}" +
    ".nt-pp .nt-sec h5{color:#8a5f24}" +
    ".nt-pp .nt-sec p,.nt-pp .nt-sec li{font-size:12.5px;color:#1e1e1e;line-height:1.7}" +
    ".nt-pp .nt-tbl th,.nt-pp .nt-tbl td{border-color:#999;font-size:12px;color:#111}" +
    ".nt-pp .nt-tbl th{background:#f3ead2}" +
    ".nt-pp-foot{margin-top:15px;color:#777;font-size:10px;text-align:center;border-top:1px solid #ddd;padding-top:7px}" +
    "@media print{body>*:not(#ntPrint){display:none!important}#ntPrint{display:block!important}}" +
    "@media(min-width:720px){.nt-grid{grid-template-columns:repeat(3,1fr)}.nt-body{max-height:calc(100dvh - 190px)}}" +
    "@media(max-width:400px){.nt-grid{grid-template-columns:1fr}}";

  function ensureCss() {
    if (document.getElementById("ntCss")) return;
    var s = document.createElement("style");
    s.id = "ntCss"; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function key(n) { return (n.lvl || "P") + "|" + n.cls + "|" + n.subj + "|" + n.term + "|" + n.week; }
  function allNotes() { return (window.NOTES || []).concat(ls(LS_CUSTOM, [])); }
  function byKey(k) { return allNotes().filter(function (n) { return key(n) === k; })[0] || null; }
  function done() { return ls(LS_DONE, []); }
  function bms() { return ls(LS_BM, []); }
  function role() { return ls(LS_ROLE, ""); }
  function subjIndex() { return (window.PRIM && PRIM.subjects) || []; }

  function noteIfy(n) {
    var has = byKey(key(n));
    return '<div class="nt-note"><h4>' + esc(n.topic) + "</h4><div class=\"nm\">" +
      esc((window.PRIM && PRIM.classNames ? (PRIM.classNames[n.cls] || n.cls) : n.cls)) + " · " + esc(n.subj) +
      " · " + TERMS[(n.term || 1) - 1] + " · Week " + (n.week || 1) +
      (has && window.NT ? "" : "") + "</div>" +
      sec("Learning Objectives", n.obj, 1) + sec("Previous Knowledge / Entry Behaviour", n.prev) +
      sec("Instructional Materials", n.mat) + sec("Lesson Content", n.content) +
      sec("Worked Examples", n.ex, 1) + sec("Class Activities", n.act, 1) +
      sec("Evaluation Questions", n.eval, 1) + sec("Assignment", n.assign) +
      '<div class="nt-btns"><button class="nt-btn" data-b="back">← Back</button>' +
      '<button class="nt-btn gold" data-b="print">📄 Print / PDF</button>' +
      '<button class="nt-btn" data-b="bm">' + (bms().indexOf(key(n)) >= 0 ? "★ Bookmarked" : "☆ Bookmark") + "</button>" +
      '<button class="nt-btn' + (done().indexOf(key(n)) >= 0 ? " on\" data-b=\"done\">✓ Done" : "\" data-b=\"done\">Mark as done") + "</button></div></div>";
  }
  function sec(title, v, list) {
    if (v == null || v === "") return "";
    var body = Array.isArray(v) ? "<li>" + v.map(esc).join("</li><li>") + "</li>" : esc(v);
    return '<div class="nt-sec"><h5>' + esc(title) + "</h5>" + (list ? "<ul>" + body + "</ul>" : "<p>" + body + "</p>") + "</div>";
  }

  function render() {
    var body = document.getElementById("ntBody");
    if (!body) return;
    if (st.tab === "notes") renderNotes(body);
    else if (st.tab === "scheme") renderScheme(body);
    else renderSpace(body);
  }

  function chips(cls, items, cur, cb, prefix) {
    return '<div class="nt-chips">' + items.map(function (it) {
      return '<button class="nt-chip' + (it === cur ? " on" : "") + '" data-' + prefix + '="' + esc(it) + '">' + esc(it) + "</button>";
    }).join("") + "</div>";
  }

  function renderNotes(b) {
    var html = '<input class="nt-search" id="ntQ" placeholder="🔎 Search topics… e.g. money, subtraction, shapes" value="' + esc(st.q) + '">';
    html += '<div class="nt-chips"><button class="nt-chip' + (st.lvl === "P" ? " on" : "") + '" data-lvl="P">🏫 Primary · Basic 1–6</button>' +
      '<button class="nt-chip' + (st.lvl === "S" ? " on" : "") + '" data-lvl="S">🎓 Secondary · JSS 1–3, SSS 1–3</button></div>';
    if (st.lvl === "S") {
      html += '<div class="nt-empty">Secondary lesson notes live in the Teaching Suite (13 subjects, SS1–SS3, term-by-term scheme). ' +
        '<br><button class="nt-btn gold" data-ts="1">Open Teaching Suite →</button></div>';
      b.innerHTML = html; return;
    }
    html += '<div class="nt-terms">' + (window.PRIM ? PRIM.classes.map(function (c) {
      return '<button class="nt-chip' + (c === st.cls ? " on" : "") + '" data-cls="' + c + '">' + esc(PRIM.classNames[c]) + "</button>";
    }).join("") : "") + "</div>";
    var q = st.q.trim().toLowerCase();
    if (!st.subj) {
      html += '<div class="nt-grid">' + subjIndex().map(function (s) {
        var hasNotes = st.cls === "B1" && s.name === "Mathematics";
        return '<button class="nt-sub" data-subj="' + esc(s.name) + '"><span class="si">' + s.icon + "</span>" +
          "<span><b>" + esc(s.name) + "</b><small>" + ((s.cls[st.cls] ? "Scheme ready" : "Coming soon") + "</small></span>") +
          (hasNotes ? '<span class="badge">📖 Notes</span>' : "") + "</button>";
      }).join("") + "</div>";
      if (q) {
        var hits = allNotes().filter(function (n) {
          return (n.topic + " " + n.content.join(" ")).toLowerCase().indexOf(q) >= 0;
        }).slice(0, 12);
        html += '<div style="margin-top:14px">' + (hits.length ? hits.map(function (n) {
          return '<button class="nt-wk" data-open="' + esc(key(n)) + '"><span class="wn">' + (n.week) + "</span><span class=\"wt\"><b>" +
            esc(n.topic) + "</b><small>" + esc(PRIM.classNames[n.cls] || n.cls) + " · " + esc(n.subj) + " · " + TERMS[n.term - 1] + "</small></span></button>";
        }).join("") : '<div class="nt-empty">No matching notes yet — try another word.</div>') + "</div>";
      }
      b.innerHTML = html; return;
    }
    html += '<div class="nt-chips">' + TERMS.map(function (t, i) {
      return '<button class="nt-chip' + (st.term === i + 1 ? " on" : "") + '" data-term="' + (i + 1) + '">' + t + "</button>";
    }).join("") + "</div>";
    var scheme = (window.PRIM && PRIM.subjects.filter(function (s) { return s.name === st.subj; })[0] || {}).cls || {};
    var weeks = scheme[st.cls] || null;
    var notes = allNotes().filter(function (n) { return n.cls === st.cls && n.subj === st.subj && n.term === st.term; });
    if (!weeks || !weeks[(st.term || 1) - 1]) {
      html += '<div class="nt-empty">The scheme for ' + esc(st.subj) + " · " + esc(PRIM.classNames[st.cls]) + " · " + TERMS[st.term - 1] +
        " opens when the editors publish this class. Full notes are ready for <b>Basic 1 Mathematics</b> below.</div>";
      weeks = null;
    }
    if (weeks) {
      html += weeks[(st.term || 1) - 1].map(function (t, i) {
        var w = i + 1, n = notes.filter(function (x) { return x.week === w; })[0] || null;
        var dn = done().indexOf(key({ cls: st.cls, subj: st.subj, term: st.term, week: w })) >= 0;
        return '<button class="nt-wk' + (dn ? " done" : "") + '" data-open="' + (n ? esc(key(n)) : "#" + w) + '">' +
          '<span class="wn">' + w + "</span><span class=\"wt\"><b>" + esc(t) + "</b><small>" +
          (n ? (dn ? "✓ Done · Open full note" : "📖 Full note · tap to read") : "Scheme topic") + "</small></span></button>";
      }).join("");
    }
    b.innerHTML = html;
  }

  function renderScheme(b) {
    var html = '<div class="nt-empty" style="padding:6px 0 10px">The Scheme of Work generator prints a termly plan for any class and subject in the primary library — with links to the notes that exist.</div>';
    html += '<div class="nt-terms">' + (window.PRIM ? PRIM.classes.map(function (c) {
      return '<button class="nt-chip' + (c === st.cls ? " on" : "") + '" data-scls="' + c + '">' + esc(PRIM.classNames[c]) + "</button>";
    }).join("") : "") + "</div>";
    if (!st.subj) {
      html += '<div class="nt-grid">' + subjIndex().map(function (s) {
        return '<button class="nt-sub" data-ssubj="' + esc(s.name) + '"><span class="si">' + s.icon + "</span>" +
          "<span><b>" + esc(s.name) + "</b><small>" + (s.cls[st.cls] ? "Scheme ready" : "Coming soon") + "</small></span></button>";
      }).join("") + "</div>";
      b.innerHTML = html; return;
    }
    html += '<div class="nt-chips">' + TERMS.map(function (t, i) {
      return '<button class="nt-chip' + (st.term === i + 1 ? " on" : "") + '" data-sterm="' + (i + 1) + '">' + t + "</button>";
    }).join("") + "</div>";
    var s = subjIndex().filter(function (x) { return x.name === st.subj; })[0] || null;
    var weeks = (s && s.cls[st.cls]) || null;
    if (!weeks) { html += '<div class="nt-empty">No scheme yet for this class — try Basic 1 or Basic 4 samples.</div>'; b.innerHTML = html; return; }
    var wl = weeks[(st.term || 1) - 1];
    var rows = wl.map(function (t, i) {
      var w = i + 1, n = allNotes().filter(function (x) { return x.cls === st.cls && x.subj === st.subj && x.term === st.term && x.week === w; })[0];
      return "<tr><td><b>" + w + "</b></td><td>" + esc(t) + "</td><td>" + (n ? '<button class="nt-btn" data-open="' + esc(key(n)) + '">📖 Note</button>' : "—") + "</td></tr>";
    }).join("");
    html += '<table class="nt-tbl"><tr><th style="width:44px">Wk</th><th>Topic</th><th style="width:90px">Note</th></tr>' + rows + '</table>' +
      '<div class="nt-btns"><button class="nt-btn gold" data-print-scheme="1">🖨 Print this scheme</button></div>';
    b.innerHTML = html;
  }

  function renderSpace(b) {
    var r = role();
    var html = '<div class="nt-space">';
    if (!r) {
      html += '<div class="nt-sec"><h5>Who is using this device?</h5><p style="margin:0">Your space adapts: <b>Students</b> get notes, progress and bookmarks; <b>Teachers</b> get the scheme generator plus Author mode for editing notes; <b>Parents</b> get a progress overview to share.</p></div>';
      html += '<div class="nt-chips"><button class="nt-btn" data-role="student">👨‍🎓 Student</button><button class="nt-btn" data-role="teacher">👩‍🏫 Teacher</button><button class="nt-btn" data-role="parent">👨‍👩‍👧 Parent</button></div>';
    } else if (r === "student") {
      var dn = done(), bm = bms(), total = (window.NOTES || []).length;
      var pct = total ? Math.round(dn.length / total * 100) : 0;
      html += '<div class="nt-sec"><h5>My progress</h5><div class="nt-bar"><i style="width:' + pct + '%"></i></div>' +
        "<p>" + dn.length + " of " + total + " notes done (" + pct + "%) — pick a term and work through the weeks.</p></div>" +
        '<div class="nt-sec"><h5>Bookmarks (' + bm.length + ")</h5>" + (bm.length ? bm.map(function (k) {
          var n = byKey(k); if (!n) return ""; return '<button class="nt-btn" data-open="' + esc(k) + '">☆ ' + esc(n.topic) + "</button>";
        }).join(" ") : "<p>Tap ☆ Bookmark on any note to keep it here.</p>") + "</div>";
    } else if (r === "teacher") {
      html += '<div class="nt-sec"><h5>Teacher tools</h5><p>1. Open <b>Scheme</b> to print a termly plan. 2. In <b>Author mode</b> you can add or edit notes for any class — they are stored on this device and exported as JSON for review.</p></div>';
      html += '<div class="nt-sec"><h5>Author mode</h5>' + authorBox() + "</div>";
    } else {
      html += '<div class="nt-sec"><h5>Family progress view</h5><p>This device tracks every study attempt and note completed here. Share the weekly report from HQ (📊) — the 📄 button under Reports prints a full overview.</p>' +
        '<p>Tips: short daily sessions beat long ones; retrieval beats re-reading; and reviewing mistakes is where marks are won.</p></div>' +
        '<div class="nt-sec"><h5>Child’s activity on this device</h5><p>' + (typeof attempts === "function" ? attempts().length + " papers sat · " : "") +
        (typeof streakDays === "function" ? streakDays() + "-day streak" : "streak tracked") + " · " + done().length + " notes completed.</p></div>";
    }
    b.innerHTML = html + "</div>";
  }

  function authorBox() {
    if (!ls("nssc_auth", false)) {
      return '<div class="nt-pin"><input class="nt-field" id="ntPin" type="password" placeholder="Author PIN" style="max-width:200px;margin:0">' +
        '<button class="nt-btn gold" data-unlock="1">Unlock</button><small style="color:var(--mut)">Ask the site owner for the PIN (set in the build).</small></div>';
    }
    var c = ls(LS_CUSTOM, []);
    return '<button class="nt-btn gold" data-new="1">＋ New note</button> <button class="nt-btn" data-exp="1">⬇ Export my notes (JSON)</button>' +
      (c.length ? '<div style="margin-top:9px">' + c.map(function (n) {
        return '<div class="nt-wk" style="cursor:default"><span class="wt"><b>' + esc(n.topic) + "</b><small>" + esc(n.cls) + " · " + esc(n.subj) + " · Term " + n.term + " · Wk " + n.week + '</small></span><button class="nt-btn" data-del="' + esc(key(n)) + '">Delete</button></div>';
      }).join("") : "") + "</div>";
  }

  function editor() {
    var b = document.getElementById("ntBody");
    b.innerHTML = '<div class="nt-note"><h4>＋ New lesson note</h4><div class="nm">Fill every field — each note is 8-part structured content for the library.</div>' +
      '<label class="nt-lbl">Class</label><div class="nt-terms">' + (window.PRIM ? PRIM.classes.map(function (c) {
        return '<button class="nt-chip' + (c === st.cls ? " on" : "") + '" data-ecls="' + c + '">' + esc(PRIM.classNames[c]) + "</button>";
      }).join("") : "") + "</div>" +
      '<label class="nt-lbl">Subject</label><input class="nt-field" id="eSubj" value="' + esc(st.subj || "Mathematics") + '">' +
      '<label class="nt-lbl">Term</label><div class="nt-chips">' + [1, 2, 3].map(function (t) {
        return '<button class="nt-chip' + (st.term === t ? " on" : "") + '" data-et="' + t + '">' + TERMS[t - 1] + "</button>";
      }).join("") + "</div>" +
      '<label class="nt-lbl">Week (1–10)</label><input class="nt-field" id="eWeek" type="number" min="1" max="10" value="1">' +
      '<label class="nt-lbl">Topic</label><input class="nt-field" id="eTopic" placeholder="e.g. Addition of numbers 1–10">' +
      '<label class="nt-lbl">Learning objectives (one per line)</label><textarea class="nt-field" id="eObj" rows="3"></textarea>' +
      '<label class="nt-lbl">Previous knowledge</label><input class="nt-field" id="ePrev">' +
      '<label class="nt-lbl">Instructional materials</label><input class="nt-field" id="eMat">' +
      '<label class="nt-lbl">Lesson content (paragraphs)</label><textarea class="nt-field" id="eContent" rows="5"></textarea>' +
      '<label class="nt-lbl">Worked examples (one per line)</label><textarea class="nt-field" id="eEx" rows="3"></textarea>' +
      '<label class="nt-lbl">Class activities</label><textarea class="nt-field" id="eAct" rows="2"></textarea>' +
      '<label class="nt-lbl">Evaluation questions (one per line)</label><textarea class="nt-field" id="eEval" rows="3"></textarea>' +
      '<label class="nt-lbl">Assignment</label><textarea class="nt-field" id="eAssign" rows="2"></textarea>' +
      '<div class="nt-btns"><button class="nt-btn" data-e="back-edit">← Back</button><button class="nt-btn gold" data-save="1">💾 Save note</button></div></div>';
  }

  function click(e) {
    var t = e.target.closest("[data-tab],[data-lvl],[data-cls],[data-subj],[data-term],[data-open],[data-role],[data-unlock],[data-new],[data-exp],[data-del],[data-print-scheme],[data-ts],[data-scls],[data-ssubj],[data-sterm],[data-ecls],[data-et],[data-b],[data-e],[data-save],[data-sback]");
    if (!t) return;
    var d = t.dataset;
    if (d.tab) { st.tab = d.tab; st.view = null; syncTabs(); render(); return; }
    if (d.lvl) { st.lvl = d.lvl; st.subj = null; st.view = null; render(); return; }
    if (d.cls) { st.cls = d.cls; st.subj = null; st.view = null; render(); return; }
    if (d.scls) { st.cls = d.scls; st.subj = null; render(); return; }
    if (d.subj) { st.subj = d.subj; render(); return; }
    if (d.ssubj) { st.subj = d.ssubj; render(); return; }
    if (d.term) { st.term = +d.term; render(); return; }
    if (d.sterm) { st.term = +d.sterm; render(); return; }
    if (d.et) { st.term = +d.et; editor(); return; }
    if (d.ecls) { st.cls = d.ecls; editor(); return; }
    if (d.open) { var k = d.open.charAt(0) === "#" ? null : d.open; var n = k ? byKey(k) : null; if (n) { st.view = n; renderNote(); } return; }
    if (d.ts) { close(); try { var eb = document.getElementById("eduLaunch"); if (eb) eb.click(); } catch (e) {} return; }
    if (d.role) { lss(LS_ROLE, d.role); render(); return; }
    if (d.unlock) {
      var p = document.getElementById("ntPin"); if (p && p.value === PIN) { lss("nssc_auth", true); render(); }
      else try { toast("Wrong PIN — ask the site owner", "🔒"); } catch (e) {}
      return;
    }
    if (d.new) { st.view = "__edit"; editor(); return; }
    if (d.exp) {
      try {
        var blob = new Blob([JSON.stringify(ls(LS_CUSTOM, []), null, 1)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-lesson-notes.json"; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      } catch (e) {}
      return;
    }
    if (d.del) {
      lss(LS_CUSTOM, ls(LS_CUSTOM, []).filter(function (n) { return key(n) !== d.del; }));
      render(); return;
    }
    if (d["print-scheme"]) { printScheme(); return; }
    if (d.b) {
      if (d.b === "back") { st.view = null; render(); return; }
      if (d.b === "print") { printNote(st.view); return; }
      if (d.b === "bm") {
        var k = key(st.view), b = bms(), i = b.indexOf(k);
        if (i >= 0) b.splice(i, 1); else b.push(k);
        lss(LS_BM, b); renderNote(); return;
      }
      if (d.b === "done") {
        var k2 = key(st.view), dn = done(), j = dn.indexOf(k2);
        if (j >= 0) dn.splice(j, 1); else dn.push(k2);
        lss(LS_DONE, dn); renderNote(); return;
      }
      return;
    }
    if (d.save) { saveNote(); return; }
    if (d.e === "back-edit") { st.view = null; render(); return; }
    if (d.sback) { st.view = null; render(); return; }
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function lines(v) { return v.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function saveNote() {
    var topic = val("eTopic");
    if (!topic || !val("eEval")) { try { toast("Add at least the topic and evaluation questions", "⚠️"); } catch (e) {} return; }
    var n = { lvl: "P", cls: st.cls, subj: val("eSubj") || "Mathematics", term: st.term,
      week: Math.min(10, Math.max(1, +val("eWeek") || 1)), topic: topic,
      obj: lines(val("eObj")), prev: val("ePrev"), mat: val("eMat"),
      content: lines(val("eContent")), ex: lines(val("eEx")), act: lines(val("eAct")),
      eval: lines(val("eEval")), assign: val("eAssign") };
    var c = ls(LS_CUSTOM, []), i = -1;
    c.forEach(function (x, j) { if (key(x) === key(n)) i = j; });
    if (i >= 0) c[i] = n; else c.push(n);
    lss(LS_CUSTOM, c);
    try { toast("Note saved to this device", "📖"); } catch (e) {}
    st.view = null; render();
  }

  function renderNote() {
    var b = document.getElementById("ntBody");
    if (st.view === "__edit") { editor(); return; }
    if (!st.view) { render(); return; }
    b.innerHTML = noteIfy(st.view);
  }

  function syncTabs() {
    document.querySelectorAll("#ntOverlay .nt-tabs button").forEach(function (x) {
      x.className = "nt-tab" + (x.getAttribute("data-tab") === st.tab ? " on" : "");
    });
  }

  function printDoc(html) {
    var old = document.getElementById("ntPrint");
    if (old) old.remove();
    var d = document.createElement("div");
    d.id = "ntPrint";
    d.innerHTML = html;
    document.body.appendChild(d);
    document.body.classList.add("nt-printing");
    try { window.print(); } catch (e) {}
    setTimeout(function () {
      document.body.classList.remove("nt-printing");
      var el = document.getElementById("ntPrint"); if (el) el.remove();
    }, 60000);
  }

  function printNote(n) {
    if (!n) return;
    var html = '<div class="nt-pp"><div class="nt-pp-head"><b>MAMSS PREP</b><span>NERDC-aligned lesson note · ' +
      esc(n.topic) + "</span><span>" + esc(PRIM.classNames[n.cls] || n.cls) + " · " + esc(n.subj) + " · " + TERMS[n.term - 1] +
      " · Week " + n.week + "</span></div>" +
      sec("Learning Objectives", n.obj, 1) + sec("Previous Knowledge / Entry Behaviour", n.prev) +
      sec("Instructional Materials", n.mat) + sec("Lesson Content", n.content) +
      sec("Worked Examples", n.ex, 1) + sec("Class Activities", n.act, 1) +
      sec("Evaluation Questions", n.eval, 1) + sec("Assignment", n.assign) +
      '<div class="nt-pp-foot">© merebari web · print or save as PDF · learn · revise · master</div></div>';
    printDoc(html);
  }

  function printScheme() {
    var s = subjIndex().filter(function (x) { return x.name === st.subj; })[0];
    var wl = (s && s.cls[st.cls]) || null;
    if (!wl) return;
    var rows = wl[(st.term || 1) - 1].map(function (t, i) {
      var n = allNotes().filter(function (x) { return x.cls === st.cls && x.subj === st.subj && x.term === st.term && x.week === i + 1; })[0];
      return '<tr><td>' + (i + 1) + "</td><td>" + esc(t) + "</td><td>" + (n ? "Full note ready" : "—") + "</td></tr>";
    }).join("");
    printDoc('<div class="nt-pp"><div class="nt-pp-head"><b>SCHEME OF WORK — ' + esc(PRIM.classNames[st.cls]) + " " + esc(st.subj) +
      "</b><span>" + TERMS[st.term - 1] + " · 10 weeks · NERDC-aligned</span></div>" +
      '<table class="nt-tbl"><tr><th style="width:44px">Wk</th><th>Topic</th><th>Lesson note</th></tr>' + rows + '</table>' +
      '<div class="nt-pp-foot">© merebari web · print or save as PDF</div></div>');
  }

  function open() {
    ensureCss();
    var ov = document.getElementById("ntOverlay");
    if (ov) { ov.style.display = "flex"; syncTabs(); render(); return; }
    ov = document.createElement("div");
    ov.id = "ntOverlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "NERDC Lesson Notes library");
    ov.style.cssText = "position:fixed;inset:0;z-index:122;display:flex;align-items:flex-start;justify-content:center;" +
      "background:rgba(10,14,26,.55);padding:16px 12px 40px;overflow-y:auto;-webkit-overflow-scrolling:touch";
    var bx = document.createElement("div");
    bx.style.cssText = "width:min(980px,100%);max-height:calc(100dvh - 50px);display:flex;flex-direction:column;border-radius:18px;" +
      "background:var(--bg,#f6f1e4);border:1px solid rgba(201,162,39,.4);box-shadow:0 30px 80px -24px rgba(0,0,0,.65)";
    bx.innerHTML =
      '<div class="nt-head"><span class="nt-ico">📖</span>' +
      '<div class="nt-tx"><h3>NERDC Lesson Notes</h3><small>Primary & Secondary curriculum · full 8-part notes · term by term · works offline</small></div>' +
      '<button class="nt-x" type="button">✕ Close</button></div>' +
      '<div class="nt-tabs"><button data-tab="notes" type="button" class="nt-tab on">📖 Notes</button>' +
      '<button data-tab="scheme" type="button" class="nt-tab">🗓 Scheme of Work</button>' +
      '<button data-tab="space" type="button" class="nt-tab">👤 My Space</button></div>' +
      '<div class="nt-body" id="ntBody"></div>';
    ov.appendChild(bx);
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) {
      if (e.target === ov || e.target.closest(".nt-x")) close();
    });
    ov.addEventListener("click", click);
    ov.addEventListener("input", function (e) {
      if (e.target && e.target.id === "ntQ") {
        st.q = e.target.value; st.subj = null; renderNotes(document.getElementById("ntBody"));
        var q = document.getElementById("ntQ"); if (q) { try { q.focus({ preventScroll: true }); } catch (e) { try { q.focus(); } catch (e2) {} } q.setSelectionRange(q.value.length, q.value.length); }
      }
    });
    document.body.style.overflow = "hidden";
    var hk = function (e) { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", hk, true);
    ov._hk = hk;
    render();
  }

  function close() {
    var ov = document.getElementById("ntOverlay");
    if (ov) { ov.style.display = "none"; if (ov._hk) window.removeEventListener("keydown", ov._hk, true); }
    document.body.style.overflow = "";
  }
})();
