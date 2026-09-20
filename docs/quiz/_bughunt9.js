/* Adversarial audit for the v9 build (index.html + bank.js + labs.js).
   Run: node quiz/_bughunt9.js */
const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK_JS = fs.readFileSync("bank.js", "utf8");
const LABS_JS = fs.readFileSync("labs.js", "utf8");
let fails = 0, warns = 0;
const ok = (l, c) => { if (!c) { fails++; console.log("✗", l); } else console.log("✓", l); };
const warn = (l) => { warns++; console.log("⚠", l); };

function makeDom(seed, opts = {}) {
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK_JS + "</script>");
  const vc = new VirtualConsole(); const real = [];
  vc.on("jsdomError", e => { const s = String(e.message || e); if (!/not implemented|canvas|getContext|fetch|Unexpected end|SyntaxError/i.test(s)) real.push(s.slice(0, 160)); });
  const dom = new JSDOM(html, {
    runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      for (const k in (seed || {})) { try { window.localStorage.setItem(k, seed[k]); } catch (e) {} }
      window.DecompressionStream = globalThis.DecompressionStream;
      window.TextDecoder = globalThis.TextDecoder;
      window.TextEncoder = globalThis.TextEncoder;
      const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = () => vp;
      if (!opts.noSpeech) {
        window.speechSynthesis = { cancel() {}, speak() {}, resume() {}, getVoices() { return [{ lang: "en-GB" }]; } };
        window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      }
      window.scrollTo = () => {};
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    }
  });
  const w = dom.window; const errs = [];
  w.addEventListener("error", e => errs.push(String(e.message || "err").slice(0, 140)));
  w.addEventListener("unhandledrejection", e => errs.push(String(e.reason || "rej").slice(0, 140)));
  return { window: w, doc: w.document, real, errs };
}
const wait = (w, ms) => new Promise(r => setTimeout(r, ms));
const badText = /NaN|undefined|Infinity/;
function walkBad(doc, label) {
  const hits = [];
  doc.querySelectorAll("body *").forEach(el => {
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) return;
    if (el.children.length === 0 && el.textContent && badText.test(el.textContent)) {
      const id = el.id ? "#" + el.id : el.className ? "." + String(el.className).split(" ")[0] : el.tagName;
      hits.push(id + ":" + el.textContent.trim().slice(0, 30));
    }
  });
  if (hits.length) warn(label + ": " + hits.slice(0, 4).join(" | "));
  return hits.length;
}

(async () => {
  const uidOf = (w) => w.eval("uid()");

  /* ---------- H1 gated boot with corrupted storage ---------- */
  {
    const seeds = {};
    ["nssc_acc","nssc_badges","nssc_coins_a","nssc_daily_2026-09-06","nssc_font","nssc_goal_a","nssc_items_a","nssc_journal","nssc_lab_a","nssc_marks","nssc_mistakes","nssc_notes_done","nssc_profiles","nssc_qday_2026-09-06","nssc_revtotal","nssc_rmotion","nssc_session","nssc_snd","nssc_target_exam","nssc_theme","nssc_type","nssc_user","nssc_xp_a","nssc_lxplan_a"].forEach(k => seeds[k] = '{"broken');
    const { window: w, doc, errs, real } = makeDom(seeds);
    await wait(w, 300);
    ok("H1 corrupted storage: boots, gate shows", !w.QUIZ_ERR && doc.getElementById("gateOverlay") && doc.body.classList.contains("gated"));
    ok("H1 no uncaught errors", errs.length === 0 && real.length === 0);
    let run = true;
    try {
      w.eval('document.getElementById("gateName").value="Amina Bello"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
      w.eval('state.cls=1; state.subject="Mathematics"; state.count=5; document.getElementById("examToggle").checked=false; document.getElementById("smartToggle").checked=false; startQuiz();');
      w.eval('for(let i=0;i<state.quiz.length;i++){ state.answers[i]=state.quiz[i].a; } showResults();');
      run = w.eval("state.quiz.length") === 5 && w.eval("lastResult.pct") === 100;
    } catch (e) { run = String(e); }
    ok("H1 corrupted storage: full quiz flow still works", run === true);
  }

  /* ---------- H2 junk attempts + labs with junk ---------- */
  {
    const junk = JSON.stringify([null, 42, "s", { pct: "abc", tms: "yesterday", tp: { "M|G": { s: 1, n: 0 } }, sp: { Math: ["3", "4"] } },
      { pct: NaN, tms: "x", correct: "a", total: "b" }, { pct: 88, tms: Date.now(), correct: 9, total: 10, tp: [] }]);
    const { window: w, doc, errs } = makeDom({ nssc_attempts_a: junk, nssc_lxplan_a: '{"broken' });
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="A B"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    w.eval('store.set("nssc_attempts_" + uid(), ' + junk + ");");
    const renders = [
      ["hq", "openHQ(); hqRender();"], ["stats", "openStats(); buildStats();"],
      ["history", "openHistory && openHistory();"], ["weekly", "weeklyReport && weeklyReport();"],
      ["bestMonth", "bestMonthHtml && bestMonthHtml();"], ["pace", "paceAvgRows && paceAvgRows();"],
      ["games", "renderGameDash && renderGameDash(); renderGameHud && renderGameHud();"],
      ["csv", "buildPaperCSV && buildPaperCSV(); exportPaperCSV && exportPaperCSV();"]
    ];
    for (const [label, expr] of renders) {
      let threw = null;
      try { w.eval(expr); } catch (e) { threw = String(e); }
      ok("H2 " + label + ": no throw", threw === null);
      if (threw) warn("H2 " + label + ": " + threw.slice(0, 90));
      walkBad(doc, "H2/" + label);
    }
    ok("H2 no uncaught errors", errs.length === 0);
    // labs with junk plan storage
    w.eval(LABS_JS);
    let labT = null;
    try { w.eval("LX.go('planner');"); labT = true; } catch (e) { labT = String(e); }
    ok("H2 labs planner with corrupt nssc_lxplan_: no throw", labT === true);
    walkBad(doc, "H2/planner");
    let recT = null;
    try { w.eval("LX.go('records');"); recT = true; } catch (e) { recT = String(e); }
    ok("H2 labs records with junk attempts: no throw", recT === true);
    walkBad(doc, "H2/records");
  }

  /* ---------- H3 injection via identity fields ---------- */
  {
    const { window: w, doc } = makeDom();
    await wait(w, 300);
    try { w.eval('document.getElementById("gateName").value="Bob" + String.fromCharCode(39) + "><img src=x onerror=alert(1)>"; document.getElementById("gateEmail").value="x@y.z"; gateSignUp();'); } catch (e) {}
    await wait(w, 50);
    const bad = doc.querySelectorAll('img[src="x"], [onerror]').length;
    ok("H3 name injection: no img/onerror element", bad === 0);
    const t = w.eval('esc("a" + String.fromCharCode(39) + String.fromCharCode(34) + "<b>")');
    ok("H3 esc quotes & tags", t.indexOf("&quot;") > -1 && t.indexOf("&#39;") > -1 && t.indexOf("<b>") < 0);
  }

  /* ---------- H4 quiz edges ---------- */
  {
    const { window: w, doc } = makeDom();
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="A B"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    let t = null;
    try { w.eval('state.cls=0; state.subject="Mathematics"; state.count=0; startQuiz();'); t = true; } catch (e) { t = String(e); }
    ok("H4 startQuiz count=0: no crash (falls back)", t === true && w.eval("state.quiz.length") >= 1);
    w.eval("quitQuiz();");
    t = null;
    try { w.eval("state.quiz=[]; renderQ();"); t = true; } catch (e) { t = String(e); }
    ok("H4 renderQ empty quiz: no crash", t === true);
    // corrupted session resume
    w.eval('store.set("nssc_session", { cls: 9, mode: "exam", idx: 99, started: "x", deadline: "x", quiz: [["Math", null, null, 99, null]] });');
    t = null;
    try { w.eval("openResume();"); t = true; } catch (e) { t = String(e); }
    ok("H4 corrupted session resume: no crash", t === true);
    w.eval("quitQuiz(); clearSession();");
  }

  /* ---------- H5 countdown edges ---------- */
  {
    const { window: w, doc } = makeDom();
    await wait(w, 300);
    const past = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
    w.eval('cdSet("WASSCE", "' + past + '")');
    const t = doc.getElementById("cdBanner").textContent;
    ok("H5 past countdown no 'today' claim", !/It is today/.test(t));
    ok("H5 past countdown says passed", /passed/.test(t));
    w.eval('cdSet("X" + String.fromCharCode(60) + "img src=x onerror=alert(1)>", "' + past + '")');
    ok("H5 label injection blocked", doc.querySelectorAll('#cdBanner img[src="x"], #cdForm img[src="x"], [onerror]').length === 0);
    w.eval('cdSet("X", "1999-13-45")');
    ok("H5 impossible date renders graceful", !/NaN/.test(doc.getElementById("cdBanner").textContent));
    w.eval("cdClear();");
  }

  /* ---------- H6 labs edge flows ---------- */
  {
    const { window: w, doc } = makeDom();
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="A B"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    w.eval(LABS_JS);
    const steps = [
      ["quizme setup", "LX.go('quizme');"],
      ["quizme start w/ empty names", "LX.qmStart && LX.qmStart();"],
      ["blitz setup", "LX.go('blitz');"],
      ["blitz start", "LX.blitzStart && LX.blitzStart();"],
      ["blitz reveal", "LX.blitzReveal && LX.blitzReveal();"],
      ["formulas (unknown subject)", "LX.formulas && LX.formulas('ZZZ');"],
      ["focus start", "LX.focus && LX.focus(); LX.focusStart && LX.focusStart();"],
      ["focus next", "LX.focusSkip && LX.focusSkip();"],
      ["records copy", "LX.recordsCopy && LX.recordsCopy();"]
    ];
    for (const [label, expr] of steps) {
      let t = null;
      try { w.eval(expr); } catch (e) { t = String(e); }
      ok("H6 " + label + ": no throw", t === null);
      if (t) warn("H6 " + label + ": " + t.slice(0, 90));
      walkBad(doc, "H6/" + label);
    }
    // quest: qm with only one player named
    let q2 = null;
    try { w.eval("LX.go('quizme');"); const n = w.eval("typeof LX.qmStart==='function'"); q2 = n; } catch (e) { q2 = String(e); }
    ok("H6 quizme API present", q2 === true);
  }

  /* ---------- H7 no-speech / no-audio ---------- */
  {
    const { window: w, doc, errs } = makeDom(null, { noSpeech: true });
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="A B"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    let t = null;
    try { w.eval("sfx('ok'); speakText('hi'); LAB.fc && (LAB.fc.deck=[{q:'x',o:['a','b','c','d']}]); fcSpeak && fcSpeak();"); t = true; } catch (e) { t = String(e); }
    ok("H7 no-speech/no-audio calls guarded", t === true);
    ok("H7 no uncaught errors", errs.length === 0);
  }

  /* ---------- H8 sw / gate / budget ---------- */
  {
    const z = require("zlib");
    const i = z.gzipSync(fs.readFileSync("index.html")), b = z.gzipSync(fs.readFileSync("bank.js")), l = z.gzipSync(fs.readFileSync("labs.js"));
    ok("H8 boot wire under 266,240", i.length + b.length < 266240);
    ok("H8 labs under 26,000 gz", l.length < 26000);
    const sw = fs.readFileSync("sw.js", "utf8");
    ok("H8 sw versioned + runtime cache", /NSS_V/.test(sw) && /c\.put\(/.test(sw) && /skipWaiting/.test(sw));
  }

  console.log(`\n== v9 bughunt: ${fails} FAIL(s), ${warns} warning(s) ==`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("bughunt crashed:", e); process.exit(2); });
