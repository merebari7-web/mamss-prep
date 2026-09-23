#!/usr/bin/env python3
"""v45 Roll Call -> integrate the hard gate into the Sept-22 'My Study' redesign.

The redesign lets anyone study as an anonymous guest, so modals alone cannot
gate access. This script adds a self-contained full-screen lock layer
(#mpLock) plus critical CSS that also neutralises the guest/Google paths
inside the redesign's own modals while the lock is pending.

Idempotent: every edit is guarded by a marker check.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
IDX = ROOT / "docs" / "index.html"
SW = ROOT / "docs" / "sw.js"

src = IDX.read_text(encoding="utf-8")
notes = []

# ---------------------------------------------------------------- head block
HEAD_MARK = 'id="mpCodesPending"'
if HEAD_MARK not in src:
    head = (
        '<script id="mpCodesPending">(function(){try{\n'
        'var ok=0;try{ok=localStorage.getItem("nssc_user")||localStorage.getItem("nssc_act")?1:0}catch(e){}\n'
        'if(!ok){document.documentElement.classList.add("mp-codes-pending");\n'
        'var l=document.getElementById("mpLock");if(l)l.hidden=false;}\n'
        '}catch(e){}})();</script>\n'
        '<style id="mpLockCss">\n'
        '#mpLock{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;\n'
        'padding:18px;background:rgba(10,14,22,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}\n'
        '#mpLock[hidden]{display:none}\n'
        '.mp-lock-card{width:min(430px,100%);max-height:92vh;overflow:auto;background:var(--card,#fdfbf4);\n'
        'color:var(--ink,#232a31);border:1px solid rgba(201,162,95,.5);border-radius:18px;padding:26px 22px;\n'
        'box-shadow:0 24px 60px rgba(0,0,0,.35);text-align:center}\n'
        '.mp-lock-card h1{margin:0;font-size:1.5rem;letter-spacing:.06em}\n'
        '.mp-lock-sub{margin:2px 0 10px;font-size:.72rem;font-weight:800;letter-spacing:.22em;color:var(--gold,#c9a227)}\n'
        '.mp-lock-copy{font-size:.86rem;line-height:1.55;color:var(--mut,#6b6b6b);margin:0 0 14px}\n'
        '.mp-lock-card label{display:block;text-align:left;font-size:.78rem;font-weight:800;margin:10px 0 4px}\n'
        '.mp-lock-card .btn{width:100%;margin-top:14px}\n'
        '#mpLockFb{min-height:1.2em;margin-top:10px;font-size:.8rem;font-weight:700}\n'
        '#mpLockFb.ok{color:#0f6b4f}#mpLockFb.bad{color:#8b2f2f}\n'
        '.mp-lock-note{margin:12px 0 0;font-size:.72rem;color:var(--mut,#6b6b6b)}\n'
        '/* while a fresh device waits for a slip, the redesign\'s own escape hatches sleep */\n'
        'html.mp-codes-pending:not(.mp-code-ok) #acctSignedOut .divider,\n'
        'html.mp-codes-pending:not(.mp-code-ok) #googleBtnSlot,\n'
        'html.mp-codes-pending:not(.mp-code-ok) #gsiNote,\n'
        'html.mp-codes-pending:not(.mp-code-ok) #acctSignedOut button[onclick^="signUpGuest"],\n'
        'html.mp-codes-pending:not(.mp-code-ok) #gateOverlay .gate-cta,\n'
        'html.mp-codes-pending:not(.mp-code-ok) #gateOverlay .gsi-request,\n'
        'html.mp-codes-pending:not(.mp-code-ok) #gateOverlay #gateGoogle,\n'
        'html.mp-codes-pending:not(.mp-code-ok) #gateOverlay #gateGsiNote{display:none!important}\n'
        '</style>\n'
    )
    anchor = '<link href="ui/study.css" rel="stylesheet"/>'
    assert anchor in src, "head anchor missing (ui/study.css link)"
    src = src.replace(anchor, head + anchor, 1)
    notes.append("head: provisional lock script + critical CSS before first paint")

# ------------------------------------------------------------ lock overlay
LOCK_MARK = 'id="mpLock"'
if LOCK_MARK not in src:
    lock = '''
<!-- ============ v45 Roll Call: school activation lock (hard gate) ============ -->
<div id="mpLock" role="dialog" aria-modal="true" aria-label="School activation required" hidden>
<div class="mp-lock-card">
<div style="font-size:2.2rem" aria-hidden="true">🔐</div>
<h1>MAMSS PREP</h1>
<p class="mp-lock-sub">SCHOOL ACTIVATION REQUIRED</p>
<p class="mp-lock-copy">Every student activates this app with the paper code your school
hands out. Type it below — each code opens <b>one device</b> only.</p>
<label for="mpLockName">Your full name</label>
<input class="input" id="mpLockName" maxlength="40" autocomplete="name" placeholder="e.g. Adaeze Okafor">
<label for="mpLockCode">School activation code</label>
<input class="input" id="mpLockCode" maxlength="24" autocomplete="off" autocapitalize="characters"
spellcheck="false" placeholder="MAMSS-000000-2026"
onkeydown="if(event.key==='Enter'){event.preventDefault();var b=document.getElementById('mpLockBtn');b&&b.click()}">
<button class="btn btn-primary" id="mpLockBtn" type="button">🔑 Activate code</button>
<div id="mpLockFb" role="status" aria-live="polite"></div>
<p class="mp-lock-note">Signed in before, or already activated on this device? You sail straight through.</p>
</div>
</div>
'''
    anchor = "</body>"
    assert anchor in src, "body close missing"
    src = src.replace(anchor, lock + anchor, 1)
    notes.append("body: full-screen activation lock overlay (covers the guest path too)")

# ------------------------------------------------------- upgrade layer load
if 'src="upgrade.js"' not in src:
    loader = (
        '<link id="mpUpgradeCss" rel="stylesheet" href="upgrade.css" media="print" onload="this.media=\'all\'">\n'
        '<noscript><link rel="stylesheet" href="upgrade.css"></noscript>\n'
        '<script>(function(){try{var c=document.createElement("script");c.async=!0;\n'
        'c.src="upgrade.js",c.onerror=function(){},document.head.appendChild(c)}catch(c){}})();</script>\n'
    )
    anchor = "</body>"
    src = src.replace(anchor, loader + anchor, 1)
    notes.append("body: lazy upgrade layer (upgrade.css + upgrade.js)")

IDX.write_text(src, encoding="utf-8")

# ------------------------------------------------------------------- sw.js
sw = SW.read_text(encoding="utf-8")
if '"./codes.js"' not in sw:
    sw = sw.replace('"./notices.js", "./ui/school.js"',
                    '"./notices.js", "./ui/school.js", "./codes.js", "./upgrade.js", "./upgrade.css"', 1)
    notes.append("sw: precache codes.js + upgrade layer")
if '"-v47"' in sw:
    sw = sw.replace('"-v47"', '"-v48"', 1)
    notes.append("sw: cache key -v47 -> -v48")
SW.write_text(sw, encoding="utf-8")

for n in notes:
    print("  •", n)
print("integrate_v45: %d edits applied" % len(notes))
