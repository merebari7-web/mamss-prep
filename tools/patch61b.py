# v61 part 2 — atelier layer, version bumps, seeds, verify §26
import pathlib, glob, re

R = pathlib.Path('.')
D = pathlib.Path('docs')

# ── 1. atelier.css v61 finishing layer ──
p = D / 'ui' / 'atelier.css'; s = p.read_text(encoding='utf-8')
assert 'mpRise' not in s
s = s.rstrip('\n') + '''

/* v61 "The Finishing Pass" — the finishing layer (appended; safe cascade winner) */
.mp-ico{width:1.1em;height:1.1em;vertical-align:-.15em}
.mp-lock-crest{width:46px;height:46px;display:block;margin:0 auto 8px;color:#002147}
.mp-lock-card label{text-align:center}
.mp-lock-card .input{width:100%;text-align:center;letter-spacing:.06em}
.mp-lock-sub{text-wrap:balance}
.mp-lock-card .mp-lock-note:first-of-type{border-top:1px solid rgba(0,33,71,.14);margin-top:16px;padding-top:12px}
.study-app .stepbar{height:5px;gap:6px}
.study-app .stepbar .s{border-radius:3px}
.study-app .stepbar .s.on{background:var(--s-ink,#002147)}
.study-app .tab .lvl{display:inline-block;margin-top:10px;border:1px solid rgba(201,162,39,.55);color:#7a5c14;background:rgba(201,162,39,.08);border-radius:999px;padding:3px 12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.study-app .practice-context span{letter-spacing:.14em;text-transform:uppercase;font-weight:700;font-size:11px;color:#8a6a10}
.study-app .progress-links:has([data-action="profile"]){border-top:1px solid var(--s-line);margin-top:16px;padding-top:14px}
.study-app .progress-links:has([data-action="profile"]):before{content:"Device housekeeping";display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--s-muted);margin-bottom:8px}
.study-app .tool-card{min-height:176px;display:flex}
.study-app .tool-card .tool-open{flex:1;align-items:flex-start}
.study-app .tool-copy{flex:1}
.study-app .tool-copy .tool-description{flex:1}
.study-app .tool-open .subject-icon{background:rgba(201,162,39,.12)!important;color:#7a5c14!important}
.tool-legend{font-size:11px;color:var(--s-muted,#5b6b84);margin:6px 0 0}
#viewCbt .page-heading h1{text-wrap:balance}
:root{--e-out:cubic-bezier(.22,.61,.36,1)}
.study-view{animation:mpRise .25s var(--e-out)}
@keyframes mpRise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.study-app .tool-card,.study-app .subject-card,.study-app .chip{transition:transform .15s var(--e-out),box-shadow .15s var(--e-out),border-color .15s}
.study-app .tool-card:hover,.study-app .subject-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(20,38,59,.10)}
html.ao-night .study-app .tab .lvl{color:#e3c76b;border-color:rgba(227,199,107,.4);background:rgba(227,199,107,.08)}
html.ao-night .study-app .tool-open .subject-icon{background:rgba(227,199,107,.14)!important;color:#e3c76b!important}
html.ao-night .mp-lock-crest{color:#e3c76b}
@media (prefers-reduced-motion: reduce){
  .study-view{animation:none}
  .study-app .tool-card,.study-app .subject-card,.study-app .chip{transition:none}
  .study-app .tool-card:hover,.study-app .subject-card:hover{transform:none;box-shadow:none}
}
'''
p.write_text(s, encoding='utf-8'); print('atelier.css: v61 layer OK')

# ── 2. upgrade.js V/NAME + entry ──
p = D / 'upgrade.js'; s = p.read_text(encoding='utf-8')
old = 'var V = 60, NAME = "Any Screen";'
assert s.count(old) == 1
s = s.replace(old, 'var V = 61, NAME = "The Finishing Pass";')
tail = 'practice, the live hall, the console and every page between."]\n    ];'
assert s.count(tail) == 1
entry = ('practice, the live hall, the console and every page between."],\n'
         '      ["\\U0001f58b", "The Finishing Pass", "The last utility leftovers now speak the studio\'s language. '
         'The gate\'s crest and every console heading wear the app\'s own engraved icons instead of platform emoji; '
         'the Live CBT Hall grows a board — who is live right now, what is scheduled next, and a calm three-step '
         'explainer for when the hall is quiet; the prospectus wordmark returns to Caslon and its WhatsApp slab '
         'becomes designed ink-green with the number unbreakable; difficulty levels wear gold chips; the toolkit '
         'shelf sits level with a pin legend; the activation card sets its labels on the centred axis and groups '
         'its footnotes; and every view change eases in with a quarter-second rise. Same app, finally one voice."]\n    ];')
s = s.replace(tail, entry)
p.write_text(s, encoding='utf-8'); print('upgrade.js: V=61 + entry OK')

# ── 3. sw.js cache bump ──
p = D / 'sw.js'; s = p.read_text(encoding='utf-8')
assert s.count('"-v65"') == 1
p.write_text(s.replace('"-v65"', '"-v66"'), encoding='utf-8'); print('sw.js: -v66 OK')

# ── 4. seeds 60 -> 61 ──
n = 0
for f in sorted(glob.glob('/home/user/testrig/*.js')):
    t = pathlib.Path(f).read_text(encoding='utf-8')
    c = t.count("'nssc_mp_seen', '60'")
    if c:
        pathlib.Path(f).write_text(t.replace("'nssc_mp_seen', '60'", "'nssc_mp_seen', '61'"), encoding='utf-8')
        print('  seed bumped:', f.split('/')[-1], 'x%d' % c); n += c
print('total seeds bumped:', n)

# ── 5. verify.py: fix §24 emoji pins + add §26 ──
p = pathlib.Path('tools/verify.py'); s = p.read_text(encoding='utf-8')
oldpin = '(ok if "<h2>\\U0001f3eb Live CBT Hall</h2>" in cbtsrc and "<h2>\\U0001f393 Teacher console</h2>" in cbtsrc else fail)("cbt.js: view-root headings promoted to h2 (hall + console)")'
assert s.count(oldpin) == 1, 'emoji h2 pin'
newpin = ('(ok if \'<h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2>\' in cbtsrc '
          'and \'<h2><svg class="mp-ico" aria-hidden="true"><use href="#i-grid"></use></svg> Teacher console</h2>\' in cbtsrc '
          'else fail)("cbt.js: view-root headings promoted to h2 (hall + console), engraved icons not emoji")')
s = s.replace(oldpin, newpin)
anchor = '(ok if os.path.exists(os.path.join(ROOT, "tools", "responsetest.js")) else fail)("tools/responsetest.js: the v60 suite is mirrored")\n'
assert s.count(anchor) == 1
sec26 = anchor + r'''
    # ── §26 · v61 "The Finishing Pass" ───────────────────────────────────────
    (ok if VP >= 61 and "The Finishing Pass" in usrc else fail)("upgrade.js: V=61+ \"The Finishing Pass\" whats-new entry")
    (ok if SWV >= 66 else fail)("sw.js: cache bumped to -v66+")
    (ok if CBTVER >= 61 else fail)("cbt.js: VERSION 61+")
    (ok if 'id="i-crest"' in idxsrc and 'id="i-key"' in idxsrc else fail)("index.html: crest + key glyphs added to the owned sprite")
    (ok if "mp-lock-crest" in idxsrc and idxsrc.count("\U0001f510") == 0 else fail)("index.html: gate crest is the engraved svg, lock emoji gone")
    (ok if "Four thousand WAEC-standard questions" in idxsrc else fail)("index.html: overview subhead is specific copy, not filler")
    (ok if "The paper path" in idxsrc and ">1. Choose your class<" not in idxsrc else fail)("index.html: practice crumb speaks the studio voice")
    (ok if "atelier.css?v=48" in idxsrc else fail)("index.html: atelier.css cache-busted to v48")
    (ok if 'id="cbtBoard"' in cbtsrc and "The hall is quiet." in cbtsrc and "cbt-quiet-steps" in cbtsrc and "fillBoard()" in cbtsrc else fail)("cbt.js: hall board — live now / next scheduled / designed quiet state")
    (ok if "<h2>\U0001f3eb" not in cbtsrc and "<h3>\U0001f393" not in cbtsrc and "<h3>\U0001f558" not in cbtsrc and "<h3>\U0001f4cb" not in cbtsrc else fail)("cbt.js: no emoji left in console/hall headings")
    studysrc = open(os.path.join(DOCS, "ui", "study.js"), encoding="utf-8").read()
    (ok if "toolLegend" in studysrc else fail)("study.js: toolkit pin legend injected under the count")
    (ok if ".mp-lock-card label{text-align:center}" in atsrc and ".stepbar .s.on{background:var(--s-ink,#002147)}" in atsrc and "@keyframes mpRise" in atsrc and "prefers-reduced-motion" in atsrc else fail)("atelier.css: v61 finishing layer (gate axis, stepper, motion tokens + reduced-motion guard)")
    (ok if ".tool-card{min-height:176px" in atsrc and "rgba(201,162,39,.12)!important" in atsrc else fail)("atelier.css: level toolkit shelf with one brand-true tint")
    (ok if "font-family:Caslon" in whysrc and "background:#0e3b2e" in whysrc and 'class="rare"' not in whysrc and "rare-note" in whysrc and "display:block;margin:0 0 6px}" in whysrc else fail)("why.html: Caslon wordmark, ink-green CTA, single world-first footnote, kicker on its own line")
'''
s = s.replace(anchor, sec26)
p.write_text(s, encoding='utf-8'); print('verify.py: §24 pin fixed + §26 (14 checks) OK')
print('PATCH61 PART 2 DONE')
