/* v65 · The Admission Slip — activation as a ceremony.
   When a fresh school code is redeemed, the unlock is not a silent database
   write: a full-screen admission letter rises on cream paper — crest, the
   member's name set in the display serif, the slip serial embossed in gold
   letterspacing, allocation and issue date, one line of law, and two actions
   (Print my slip / Enter the studio).
   Display layer only: it reads the activation record the gate already wrote
   and adds nothing to it. Fail-closed — without an activation record there is
   no slip, and the reprint entry only appears for activated devices. */
(function () {
  "use strict";
  if (window.MAMSS_SLIP) return;

  var SEEN = "nssc_slip_seen";

  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function actInfo() {
    try { if (window.MAMSS_ACT && MAMSS_ACT.info) { var a = MAMSS_ACT.info(); if (a) return a; } } catch (e) {}
    return ls("nssc_act", null);
  }
  function isActivated() {
    try { if (window.MAMSS_ACT && MAMSS_ACT.activated) return !!MAMSS_ACT.activated(); } catch (e) {}
    return !!actInfo();
  }

  function batchLabel(b) {
    if (!b) return "School allocation";
    if (/^teacher/i.test(b)) return "Teaching seat";
    if (/^SS1-3-main$/i.test(b)) return "SS1–SS3 · Main allocation";
    if (/^SS1-3-topup$/i.test(b)) return "SS1–SS3 · Top-up allocation";
    return b;
  }
  function seatLabel(a) {
    try { if (window.MAMSS_ACT && MAMSS_ACT.teacher && MAMSS_ACT.teacher()) return "Teaching seat"; } catch (e) {}
    return a && a.role === "teacher" ? "Teaching seat" : "Student seat";
  }
  function firstWord(n) {
    var s = String(n || "").trim().split(/\s+/)[0];
    return s || "Scholar";
  }
  function issuedDate(t) {
    try { return new Date(t || Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return "—"; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------------ card */
  function build(a) {
    var name = esc(firstWord(a && a.name));
    var wrap = document.createElement("div");
    wrap.id = "slipOverlay";
    wrap.className = "slip-overlay";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "slipHead");
    wrap.innerHTML =
      '<div class="slip-paper">' +
        '<div class="slip-frame" aria-hidden="true"></div>' +
        '<svg class="slip-crest" aria-hidden="true"><use href="#i-crest"></use></svg>' +
        '<p class="slip-school">MAMSS PREP · WAEC &amp; NECO STUDY STUDIO</p>' +
        '<h2 class="slip-head" id="slipHead"><span>' + name + "</span> — you are admitted.</h2>" +
        '<p class="slip-body">Your seat in the studio is open. The practice, the papers and every ' +
          "mark of progress belong to you now.</p>" +
        '<p class="slip-law">This seat is yours alone. Keep the code private.</p>' +
        '<p class="slip-kicker" aria-hidden="true">Slip serial</p>' +
        '<p class="slip-serial"><span class="vh">Slip serial: </span>' + esc(a && a.mask || "school code") + "</p>" +
        '<dl class="slip-meta">' +
          "<div><dt>Allocation</dt><dd>" + esc(batchLabel(a && a.batch)) + "</dd></div>" +
          "<div><dt>Issued</dt><dd>" + esc(issuedDate(a && a.at)) + "</dd></div>" +
          "<div><dt>Seat</dt><dd>" + esc(seatLabel(a)) + "</dd></div>" +
        "</dl>" +
        '<div class="slip-actions">' +
          '<button type="button" class="slip-print">Print my slip</button>' +
          '<button type="button" class="slip-enter">Enter the studio</button>' +
        "</div>" +
      "</div>";
    return wrap;
  }

  var lastFocus = null;

  function close() {
    var el = document.getElementById("slipOverlay");
    if (!el) return;
    el.remove();
    document.removeEventListener("keydown", onKey, true);
    try { document.documentElement.classList.remove("slip-printing"); } catch (e) {}
    try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) {}
    lastFocus = null;
  }

  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
  }

  function show() {
    var a = actInfo();
    if (!a || !a.mask) return;            /* fail-closed: no record, no slip */
    close();
    try { lastFocus = document.activeElement; } catch (e) { lastFocus = null; }
    var el = build(a);
    document.body.appendChild(el);
    document.addEventListener("keydown", onKey, true);
    var enter = el.querySelector(".slip-enter");
    var print = el.querySelector(".slip-print");
    if (enter) {
      enter.addEventListener("click", close);
      try { setTimeout(function () { enter.focus({ preventScroll: true }); }, 60); } catch (e) {}
    }
    if (print) print.addEventListener("click", function () {
      try {
        document.documentElement.classList.add("slip-printing");
        window.print();
      } catch (e) {}
    });
    try {
      window.addEventListener("afterprint", function once() {
        window.removeEventListener("afterprint", once);
        try { document.documentElement.classList.remove("slip-printing"); } catch (e) {}
      });
    } catch (e) {}
    el.addEventListener("click", function (e) { if (e.target === el) close(); });
  }

  /* Called by the gate the moment a fresh activation record is written.
     The lock/overlay is still closing, so the letter waits a beat and only
     rises for a device that is genuinely activated — once per slip. */
  function fresh(a) {
    a = a || actInfo();
    if (!a || !a.h) return;
    if (ls(SEEN, "") === a.h) return;
    ss(SEEN, a.h);
    setTimeout(function () { try { if (isActivated()) show(); } catch (e) {} }, 900);
  }

  /* ------------------------------------------------------- reprint entry */
  function mountEntry(tries) {
    tries = tries || 0;
    var heading = document.querySelector("#viewOverview .welcome-row") || document.querySelector("#viewOverview .page-heading");
    if (!heading) { if (tries < 40) setTimeout(function () { mountEntry(tries + 1); }, 500); return; }
    if (document.getElementById("slipReopen")) return;
    if (!isActivated()) { if (tries < 40) setTimeout(function () { mountEntry(tries + 1); }, 500); return; }
    var b = document.createElement("button");
    b.type = "button";
    b.id = "slipReopen";
    b.className = "text-button slip-reopen";
    b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-crest"></use></svg> My admission slip';
    b.addEventListener("click", show);
    heading.appendChild(b);
  }

  function boot() {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mountEntry(); });
    else mountEntry();
  }
  boot();

  window.MAMSS_SLIP = {
    show: show,
    fresh: fresh,
    close: close,
    _test: { SEEN: SEEN, batchLabel: batchLabel, firstWord: firstWord, build: build }
  };
})();
