/* v66 · Examiner's Marginalia — explanation craft as brand voice.
   At render time, every practice explanation is wrapped in a marker's frame:
   a red-pen rule, the strap THE EXAMINER'S NOTE, and three auto-composed
   movements — what the question wants (command word parsed from the stem),
   where marks are lost (a personal line when the question sits in the member's
   own mistake bank, plus the craft trap for that command word), and the full
   answer (the engine's own verdict + explanation, untouched).
   Presentation layer only: the bank stays hash-locked, the engine is never
   edited, and if the stem cannot be read the engine's output stands alone. */
(function () {
  "use strict";
  if (window.MAMSS_MARGINALIA) return;

  /* WAEC command words, in matching order — the first hit inside the opening
     of the stem composes the note. Voice: an examiner who marks with care. */
  var CMDS = [
    { re: /\b(calculate|compute|work\s+out|evaluate\s+the\s+value|find\s+the\s+value)\b/i,
      wants: "a number, with working — method marks live in the steps, not the final line.",
      lost: "the working. A right answer with no steps still bleeds marks, and a slipped sign hides in unshown arithmetic." },
    { re: /\b(solve|find\s+x|determine)\b/i,
      wants: "the unknown, found by a clean method — set up, solve, state.",
      lost: "the setup. Most marks are lost before the solving starts: a wrong equation cannot be rescued by good algebra." },
    { re: /\b(simplify|expand|factorise|factorize)\b/i,
      wants: "the expression in its tidiest named form — and only that.",
      lost: "half-finished form. Stopping one step short of fully simplified scores the method, not the final mark." },
    { re: /\b(define|definition|meaning\s+of)\b/i,
      wants: "the precise meaning — a definition that would survive a mark scheme.",
      lost: "circular definitions: using the word to explain itself earns nothing." },
    { re: /\b(distinguish|differentiate|contrast)\b/i,
      wants: "differences in pairs — one clean point on each side, matched.",
      lost: "one-sided answers. A difference described for only one of the two things is half a mark at best." },
    { re: /\b(compare|comparison)\b/i,
      wants: "similarities and differences, side by side, with the two things named.",
      lost: "describing each thing separately. Comparison marks need the two joined in one sentence." },
    { re: /\b(explain|account\s+for|why)\b/i,
      wants: "the reason, as a chain: because → therefore.",
      lost: "stopping one link short. “Because A” is half a chain; finish at “therefore B”." },
    { re: /\b(describe|state\s+how)\b/i,
      wants: "what happens, in order — a picture in words.",
      lost: "skipping the sequence. Describing the result but not the process loses the process marks." },
    { re: /\b(state|mention|name|give|list)\b/i,
      wants: "the plain fact — short, exact, no decoration.",
      lost: "extra prose. The mark goes to the fact; padding never earns a second one." },
    { re: /\b(identify|select|choose|pick)\b/i,
      wants: "the one that fits — picked out and named.",
      lost: "the near-miss option: the one that is true in general but does not answer this stem." },
    { re: /\b(suggest|propose|recommend)\b/i,
      wants: "a reasonable idea the given information supports.",
      lost: "overreach — suggesting beyond what the data supports, or repeating the question as the answer." },
    { re: /\b(show|prove|verify|derive)\b/i,
      wants: "the journey: every step, until the result is forced.",
      lost: "jumping to the destination. Quoting the result proves nothing — the marks are the steps." },
    { re: /\b(discuss|comment|justify)\b/i,
      wants: "points on both sides, then a judgement — with reasons attached.",
      lost: "listing without weighing. Discussion marks need a position, not just a catalogue." },
    { re: /\b(measure|draw|sketch|plot|construct)\b/i,
      wants: "the figure itself — labelled, to scale where scale is asked.",
      lost: "unlabelled work. A correct drawing with no labels loses the label marks." },
    { re: /\b(which|what)\b/i,
      wants: "the single best option — eliminate the impossible ones first.",
      lost: "the near-miss option: the one that looks right until you test it against the stem." }
  ];
  var FALLBACK = {
    wants: "exactly what the stem asks — and nothing else.",
    lost: "the near-miss option: the answer that looks true but does not fit this question."
  };

  function parseCommand(stem) {
    var head = String(stem || "").slice(0, 120);
    for (var i = 0; i < CMDS.length; i++) if (CMDS[i].re.test(head)) return CMDS[i];
    return FALLBACK;
  }

  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  function stemText() {
    var el = document.getElementById("qText");
    if (!el) return "";
    try {
      var c = el.cloneNode(true);
      var medal = c.querySelector(".qmedal");
      if (medal) medal.remove();
      return norm(c.textContent);
    } catch (e) { return norm(el.textContent); }
  }

  function inMistakeBank(stem) {
    try {
      var s = norm(stem);
      if (!s) return false;
      var list = JSON.parse(localStorage.getItem("nssc_mistakes") || "[]");
      if (!Array.isArray(list)) return false;
      return list.some(function (x) { return x && norm(x.q) === s; });
    } catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function decorate() {
    var el = document.getElementById("qExplain");
    if (!el) return;
    if (!el.classList.contains("show")) return;      /* nothing rendered yet */
    if (el.querySelector(".mx-frame")) return;       /* already margined — idempotent */
    var stem = stemText();
    if (!stem) return;                               /* no stem, no note — engine output stands alone */
    var cmd = parseCommand(stem);
    var personal = inMistakeBank(stem)
      ? '<em class="mx-again">This one is in your mistake bank — it caught you before.</em> '
      : "";
    el.innerHTML =
      '<div class="mx-frame">' +
        '<p class="mx-strap">The Examiner&#39;s Note</p>' +
        '<p class="mx-move"><b>What the question wants</b> — ' + esc(cmd.wants) + "</p>" +
        '<p class="mx-move"><b>Where marks are lost</b> — ' + personal + esc(cmd.lost) + "</p>" +
        '<div class="mx-answer"><b>The full answer</b> — ' + el.innerHTML + "</div>" +
      "</div>";
  }

  function watch() {
    var el = document.getElementById("qExplain");
    if (!el) return false;
    try {
      var mo = new MutationObserver(function () { try { decorate(); } catch (e) {} });
      mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
      return true;
    } catch (e) { return false; }
  }

  function boot(tries) {
    tries = tries || 0;
    if (!watch()) { if (tries < 40) setTimeout(function () { boot(tries + 1); }, 500); return; }
    try { decorate(); } catch (e) {}                 /* restored session mid-answer */
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); });
  else boot();

  window.MAMSS_MARGINALIA = {
    decorate: decorate,
    _test: { parseCommand: parseCommand, inMistakeBank: inMistakeBank, stemText: stemText, CMDS: CMDS }
  };
})();
