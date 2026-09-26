# v61 "The Finishing Pass" mega-patch — run: python3 tools/patch61.py  (from repo root)
import pathlib, re

D = pathlib.Path('docs')
ICO = lambda sym: '<svg class="mp-ico" aria-hidden="true"><use href="#%s"></use></svg>' % sym

def subn(s, pat, repl, cnt, tag):
    s2, n = re.subn(pat, repl, s, count=cnt)
    assert n == cnt, f'{tag}: {pat} matched {n} expected {cnt}'
    return s2

# ── A. index.html ──────────────────────────────────────────────────────────
p = D / 'index.html'; idx = p.read_text(encoding='utf-8')
i = idx.find('id="i-settings"'); assert i > 0
j = idx.find('</symbol>', i) + len('</symbol>')
idx = idx[:j] + (
    '\n<symbol id="i-crest" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 8v8M9 11h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>'
    '\n<symbol id="i-key" viewBox="0 0 24 24"><circle cx="8.5" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 12h9m-3 0v3m-3-3v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>') + idx[j:]
idx = subn(idx, r'<div style="font-size:2\.2rem" aria-hidden="true">.</div>',
           '<svg class="mp-lock-crest" aria-hidden="true"><use href="#i-crest"></use></svg>', 1, 'crest')
idx = subn(idx, r'<p class="mp-lock-sub">PRESTIGE EDITION · SCHOOL ACTIVATION REQUIRED</p>',
           '<p class="mp-lock-sub">PRESTIGE EDITION · SCHOOL ACTIVATION</p>', 1, 'sub')
idx = subn(idx, r'id="mpLockBtn" type="button">. Activate code</button>',
           'id="mpLockBtn" type="button">' + ICO('i-key') + ' Activate code</button>', 1, 'lockbtn')
idx = subn(idx, r'id="mpLockContact">. Need an activation key\?',
           'id="mpLockContact">' + ICO('i-key') + ' Need an activation key?', 1, 'lockwa')
idx = subn(idx, r'id="welcomeSub">Your ideas, your ambitions\. A beautiful space to bring them to life\.</p>',
           'id="welcomeSub">Four thousand WAEC-standard questions, five tools no other prep site has, and a quiet place to get better — one session at a time.</p>', 1, 'subhead')
idx = subn(idx, r'id="practiceCrumb">1\. Choose your class</span>',
           'id="practiceCrumb">The paper path · class → subject → topics</span>', 1, 'crumb')
idx = subn(idx, r'<link href="ui/atelier\.css\?v=47" rel="stylesheet"/>',
           '<link href="ui/atelier.css?v=48" rel="stylesheet"/>', 1, 'cssver')
p.write_text(idx, encoding='utf-8'); print('index.html: sprite + 7 edits OK')

# ── B. cbt.js ──────────────────────────────────────────────────────────────
p = D / 'cbt.js'; cbt = p.read_text(encoding='utf-8')
cbt = subn(cbt, r'<h2>. Live CBT Hall</h2>', '<h2>' + ICO('i-bolt') + ' Live CBT Hall</h2>', 4, 'hall-h2')
cbt = subn(cbt, r'<h2>. Teacher console</h2>', '<h2>' + ICO('i-grid') + ' Teacher console</h2>', 1, 'cons-h2')
cbt = subn(cbt, r'<h3>. Teacher console</h3>', '<h3>' + ICO('i-grid') + ' Teacher console</h3>', 1, 'cons-h3')
cbt = subn(cbt, r'<h3>. Are you a teacher\?</h3>', '<h3>' + ICO('i-shield') + ' Are you a teacher?</h3>', 1, 'teach-h3')
cbt = subn(cbt, r'<h3>. Your recent sessions</h3>', '<h3>' + ICO('i-clock') + ' Your recent sessions</h3>', 1, 'recent-h3')
cbt = subn(cbt, r'<h3>. Sessions you posted</h3>', '<h3>' + ICO('i-calendar') + ' Sessions you posted</h3>', 1, 'posted-h3')
cbt = subn(cbt, r"h \+= '<div id=\"cbtJoinFb\" role=\"status\"></div>';",
           'h += \'<div id="cbtJoinFb" role="status"></div>\';\n      h += \'<div id="cbtBoard" role="status"></div>\';', 1, 'board-div')
cbt = subn(cbt, r'root\.innerHTML = wrap\(h\);\n    var jb = \$\("cbtJoinBtn"\), ji = \$\("cbtJoinCode"\);',
           'root.innerHTML = wrap(h);\n    fillBoard();\n    var jb = $("cbtJoinBtn"), ji = $("cbtJoinCode");', 1, 'fillboard-call')
cbt = subn(cbt, r'var VERSION = "60";', 'var VERSION = "61";', 1, 'version')
board_fn = '''
  /* v61 — the hall board: live now / next on the board / the quiet hall */
  function fmtWhen(s) {
    try { return new Date(s).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return String(s || ""); }
  }
  function fillBoard() {
    var box = $("cbtBoard"); if (!box) return;
    var c = cfg(); if (!c) return;
    try {
      fetch(c.url + "/rest/v1/cbt_sessions?select=code,title,status,scheduled_at,cls,subject&order=scheduled_at.asc&limit=8", { headers: { "apikey": c.key } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          rows = rows || [];
          var live = rows.filter(function (x) { return x.status === "live"; });
          var sched = rows.filter(function (x) { return x.status === "scheduled" && x.scheduled_at; });
          var out = "";
          if (live.length) {
            out += '<div class="cbt-board-live-wrap">' + live.map(function (x) {
              return '<button class="cbt-board-live" data-joincode="' + esc(x.code) + '"><span class="cbt-live-dot"></span><b>' + esc(x.title || x.code) + '</b><small>' + esc((x.cls || "") + (x.subject ? " · " + x.subject : "")) + '</small><span class="cbt-board-cta">Join now →</span></button>';
            }).join("") + '</div>';
          }
          if (sched.length) {
            out += '<p class="cbt-quiet-next">Next on the board: ' + sched.slice(0, 2).map(function (x) {
              return '<b>' + esc(x.title || x.code) + '</b> · ' + esc(fmtWhen(x.scheduled_at));
            }).join(" &nbsp;·&nbsp; ") + '</p>';
          }
          if (!live.length && !sched.length) {
            out += '<div class="cbt-quiet"><svg class="mp-ico cbt-quiet-ico" aria-hidden="true"><use href="#i-bolt"></use></svg>' +
              '<h3>The hall is quiet.</h3>' +
              '<p>No paper is live right now. When your teacher presses <b>Go live</b>, the session appears here and on your class board — join with the 6-character code, or tap the session itself.</p>' +
              '<ol class="cbt-quiet-steps"><li><b>Board</b><span>The teacher posts the paper; the code goes on the class board.</span></li>' +
              '<li><b>Seat</b><span>You join with your activation — one device, one sitting.</span></li>' +
              '<li><b>Bell</b><span>The clock starts for everyone at once; answers save as you give them.</span></li></ol></div>';
          }
          box.innerHTML = out;
          Array.prototype.forEach.call(box.querySelectorAll("[data-joincode]"), function (b) {
            b.onclick = function () {
              var i2 = $("cbtJoinCode"); if (i2) { i2.value = b.getAttribute("data-joincode"); var j2 = $("cbtJoinBtn"); if (j2) j2.click(); }
            };
          });
        }).catch(function () {});
    } catch (e) {}
  }
'''
anchor = '  /* ----------------------------------------------------------------- home */\n  function renderHome() {'
assert cbt.count(anchor) == 1
cbt = cbt.replace(anchor, board_fn + '\n' + anchor)
board_css = ('".cbt-quiet{border:1px dashed rgba(0,33,71,.28);border-radius:14px;padding:26px 22px;text-align:center;background:rgba(0,33,71,.025);margin-top:14px}" +\n      '
  '".cbt-quiet-ico{width:34px;height:34px;color:#002147}" +\n      '
  '".cbt-quiet h3{font:400 1.5rem/1.2 Georgia,\'Times New Roman\',serif;margin:10px 0 6px;color:#002147}" +\n      '
  '".cbt-quiet p{color:#5b6b84;font-size:.9rem;max-width:46ch;margin:0 auto}" +\n      '
  '".cbt-quiet-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;list-style:none;margin:18px 0 0;padding:0;text-align:left}" +\n      '
  '".cbt-quiet-steps li{border-top:2px solid #c9a227;padding:8px 2px 0}" +\n      '
  '".cbt-quiet-steps b{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#002147}" +\n      '
  '".cbt-quiet-steps span{font-size:.8rem;color:#5b6b84}" +\n      '
  '".cbt-quiet-next{margin:14px 0 0;font-size:.85rem;color:#002147;text-align:center}" +\n      '
  '".cbt-board-live-wrap{display:grid;gap:8px;margin-top:14px}" +\n      '
  '".cbt-board-live{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1.5px solid #14783c;background:#f2f9f4;border-radius:12px;padding:12px 14px;cursor:pointer;font:inherit}" +\n      '
  '".cbt-board-live b{color:#0b5c33;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +\n      '
  '".cbt-board-live small{color:#5b6b84}" +\n      '
  '".cbt-board-cta{color:#0b5c33;font-weight:800;white-space:nowrap}" +\n      '
  '@media(max-width:600px){.cbt-quiet-steps{grid-template-columns:1fr}.cbt-board-live{flex-wrap:wrap}}" +\n      ')
css_anchor = '".cbt-row input[type=file]{min-height:32px}" +'
assert cbt.count(css_anchor) == 1
cbt = cbt.replace(css_anchor, board_css + '\n      ' + css_anchor)
p.write_text(cbt, encoding='utf-8'); print('cbt.js: icons + board + css + VERSION 61 OK')

# ── C. study.js legend ─────────────────────────────────────────────────────
p = D / 'ui' / 'study.js'; st_ = p.read_text(encoding='utf-8')
anchor = '(group === "all" ? " available" : " for " + group.toLowerCase());'
assert st_.count(anchor) == 1
st_ = st_.replace(anchor, anchor + '''
    if ($("toolCount") && !$("toolLegend")) {
      const lg = document.createElement("p");
      lg.id = "toolLegend"; lg.className = "tool-legend";
      lg.textContent = "☆ Pin your favourites — pinned tools jump to the top of your essentials.";
      $("toolCount").parentNode.insertBefore(lg, $("toolCount").nextSibling);
    }''')
p.write_text(st_, encoding='utf-8'); print('study.js: tool legend OK')

# ── D. why.html ────────────────────────────────────────────────────────────
p = D / 'why.html'; why = p.read_text(encoding='utf-8')
why = subn(why, r'h1\{font-size:1\.7rem;margin:\.3em 0 \.1em;letter-spacing:\.02em;color:#f3e3bd\}',
           'h1{font-size:1.9rem;margin:.3em 0 .1em;letter-spacing:.04em;color:#f3e3bd;font-family:Caslon,"Times New Roman",serif;font-weight:400}', 1, 'h1')
why = subn(why, r'background:linear-gradient\(135deg,#25a244,#128c32\);color:#fff;font-weight:900;font-size:1rem;\n  padding:14px 18px;border-radius:14px;box-shadow:0 8px 26px rgba\(37,162,68,\.35\)\}',
           'background:#0e3b2e;border:1px solid rgba(201,162,39,.45);color:#f3e3bd;font-weight:800;font-size:1rem;\n  padding:14px 18px;border-radius:14px;box-shadow:none}\n.cta .num{white-space:nowrap;font-variant-numeric:tabular-nums}\n.cta svg{vertical-align:-3px;margin-right:8px}', 1, 'cta')
why = subn(why, r'">. WhatsApp the school office — 0805 678 7685<small>',
           '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5z"/></svg>WhatsApp the school office — <span class="num">0805 678 7685</span><small>', 1, 'cta-ico')
why = subn(why, r'\.kicker\{text-transform:uppercase;letter-spacing:\.18em;font-size:\.62rem;font-weight:800;color:var\(--gold\);margin:0 0 4px\}',
           '.kicker{text-transform:uppercase;letter-spacing:.18em;font-size:.62rem;font-weight:800;color:var(--gold);display:block;margin:0 0 6px}', 1, 'kicker')
why = subn(why, r' <span class="rare">world-first</span>', '', 4, 'rare')
hs = [m.start() for m in re.finditer(r'<h2>', why)]
assert len(hs) >= 2
note = '<p class="rare-note">Four of these five tools exist nowhere else — we checked, and we keep checking.</p>\n'
why = why[:hs[1]] + note + why[hs[1]:]
why = why.replace('.rare{display:inline-block;', '.rare-note{color:var(--gold);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;font-weight:800;margin:14px 0 0}\n.rare{display:inline-block;')
p.write_text(why, encoding='utf-8'); print('why.html: 6 edits + rare-note OK')
print('PATCH61 PART 1 DONE')
