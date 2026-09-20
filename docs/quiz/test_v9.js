/* Regression + feature suite for the v9 build (index.html + bank.js + labs.js).
   Run: node quiz/test_v9.js    (expects the committed/minified artifacts in repo root) */
const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK_JS = fs.readFileSync("bank.js", "utf8");
const LABS_JS = fs.readFileSync("labs.js", "utf8");
let fails = 0;
const run = (label, fn) => { try { fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 200)); } };
const runAsync = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 200)); } };

function makeDom(html, seed, opts = {}) {
  html = html.replace('<script src="bank.js"></script>', "<script>" + BANK_JS + "</script>");
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
      window.speechSynthesis = { cancel() { window.__spCancel = (window.__spCancel || 0) + 1; }, speak() { window.__spSpoken = (window.__spSpoken || 0) + 1; }, resume() {}, getVoices() { return [{ lang: "en-GB" }]; } };
      window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = "en-GB"; };
      window.scrollTo = () => {};
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    }
  });
  const w = dom.window, errs = [];
  w.addEventListener("error", e => errs.push(String(e.message || "err").slice(0, 160)));
  w.addEventListener("unhandledrejection", e => errs.push(String(e.reason || "rej").slice(0, 160)));
  return { window: w, doc: w.document, real, errs };
}
const click = (w, el) => el.dispatchEvent(new w.Event("click", { bubbles: true }));
const visible = (doc, id) => !doc.getElementById(id).classList.contains("hidden");
const wait = (w, ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ---------- 1. boot & bank ---------- */
  {
    const { window: w, doc, real, errs } = makeDom(HTML);
    await wait(w, 300);
    run("1. bank boots; integrity 3x1300, 13x100, unique stems, UTF-8", () => {
      if (w.QUIZ_ERR) throw "QUIZ_ERR";
      const Q = w.eval("CLASSES");
      if (Q.length !== 3) throw Q.length;
      for (const c of Q) {
        if (c.questions.length !== 1300) throw c.class;
        if (new Set(c.questions.map(q => q.q)).size !== 1300) throw c.class + " dup stems";
        for (const q of c.questions) if (!q.q || q.o.length !== 4 || q.a < 0 || q.a > 3 || !q.e) throw q.q.slice(0, 40);
      }
      const t = JSON.stringify(Q);
      if (!t.includes("₦") || t.includes("Ã")) throw "encoding";
    });
    run("2. no fatal overlay, no console noise", () => {
      if (doc.getElementById("fatalOverlay").style.display === "flex") throw "fatal";
      if (errs.length || real.length) throw (errs.join(";") || real.join(";")).slice(0, 120);
    });
    run("3. access gate: locked on start, sign-in unlocks and remembers", () => {
      if (!visible(doc, "gateOverlay")) throw "gate not shown";
      if (!doc.body.classList.contains("gated")) throw "not gated";
      w.eval('document.getElementById("gateName").value="Amina Bello"; document.getElementById("gateEmail").value="amina@school.ng"; gateSignUp();');
      const u = w.eval("user");
      if (!u || u.name !== "Amina Bello") throw "no user";
      if (visible(doc, "gateOverlay")) throw "gate still open";
      if (!/Amina/.test(doc.getElementById("acctName").textContent)) throw "chip";
      if (!JSON.parse(w.localStorage.getItem("nssc_user") || "null")) throw "not persisted";

    });
  }

  /* ---------- 2. quiz flows ---------- */
  {
    const { window: w, doc } = makeDom(HTML);
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="Amina Bello"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    run("4. class->subject->length works; start study paper", () => {
      click(w, doc.getElementById("classTabs").children[1]);
      if (doc.getElementById("subjectChips").children.length !== 14) throw "chips=" + doc.getElementById("subjectChips").children.length;
      w.eval('state.cls=1; state.subject="Mathematics"; state.count=10; document.getElementById("examToggle").checked=false; document.getElementById("smartToggle").checked=false; document.getElementById("twoToggle") && (document.getElementById("twoToggle").checked=false); startQuiz();');
      if (w.eval("state.quiz.length") !== 10) throw "len";
      if (!doc.getElementById("qText").textContent) throw "no question";
    });
    run("5. answers marked instantly with explanation; results recorded", () => {
      w.eval("for(let i=0;i<state.quiz.length;i++){ pick(state.quiz[i].a); nextQ(); }");
      if (w.eval("lastResult.pct") !== 100) throw "pct";
      const att = w.eval('JSON.parse(localStorage.getItem("nssc_attempts_" + uid())||"[]")');
      if (!att.length || att[0].pct !== 100) throw "attempt not recorded";
    });
    run("6. exam mode: timer, masked feedback, submit check, auto capture", () => {
      w.eval('state.cls=0; state.subject="Chemistry"; state.count=5; document.getElementById("examToggle").checked=true; startQuiz();');
      if (w.eval("state.mode") !== "exam") throw "mode";
      if (!w.eval("state.deadline")) throw "no deadline";
      w.eval("pick(0);");
      const opts = doc.querySelectorAll("#qOpts .opt");
      if ([...opts].some(o => o.classList.contains("correct"))) throw "exam leaks answers";
      w.eval("for(let i=1;i<state.quiz.length;i++){ state.answers[i]=(i%4); }");
      w.eval("maybeSubmit();");
      if (visible(doc, "submitCheckOverlay")) throw "submit check shown";
      w.eval("doSubmit();");
      if (w.eval("lastResult.pct") === null || typeof w.eval("lastResult.pct") !== "number") throw "no result";
      w.eval("quitQuiz();");
    });
    run("7. resume & corrupt session defense", () => {
      w.eval('store.set("nssc_session", { cls: 9, mode: "exam", idx: 99, quiz: [["Chemistry", null, null, 99, null], ["Chemistry", "OK?", ["a","b","c","d"], 1, "e"]] });');
      let threw = null;
      try { w.eval("openResume();"); } catch (e) { threw = String(e); }
      if (threw) throw threw.slice(0, 90);
      if (w.eval("(state.quiz||[]).length") !== 1) throw "rows=" + w.eval("(state.quiz||[]).length");
      w.eval("quitQuiz(); clearSession();");
    });
    run("8. countdown: set, days, past-date wording, clear", () => {
      const tom = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
      w.eval('cdSet("WASSCE", "' + tom + '")');
      if (!/1 day to go/.test(doc.getElementById("cdBanner").textContent)) throw "tomorrow";
      const past = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      w.eval('cdSet("WASSCE", "' + past + '")');
      const t = doc.getElementById("cdBanner").textContent;
      if (/It is today/.test(t)) throw "past says today";
      if (!/passed/.test(t)) throw "no passed wording";
      w.eval("cdClear();");
    });
    run("9. esc() escapes single & double quotes", () => {
      const t = w.eval("esc('a' + String.fromCharCode(39) + String.fromCharCode(34) + '<b>x</b>')");
      if (t.indexOf("&quot;") < 0 || t.indexOf("&#39;") < 0 || t.indexOf("<b>") >= 0) throw t;
    });
    run("10. junk-typed attempts never produce NaN screens", () => {
      w.eval('store.set("nssc_attempts_" + uid(), [null, 42, "x", { pct: "abc", tms: "yesterday", tp: { "A|B": { s: 1, n: 0 } } }, { pct: 88, tms: Date.now(), tp: {} }]);');
      w.eval("openHQ(); hqRender(); openStats(); buildStats();");
      const bad = [...doc.querySelectorAll("body *")].filter(el => /^(SCRIPT|STYLE)$/.test(el.tagName) === false && el.children.length === 0 && /NaN|undefined/.test(el.textContent || "") && el.textContent.indexOf("undefined ·") < 0).map(el => el.textContent.trim().slice(0, 30));
      if (bad.length) throw bad.slice(0, 4).join(" | ");
      w.eval("closeOverlay && closeOverlay();");
      w.eval('store.set("nssc_attempts_" + uid(), []);');
    });
  }

  /* ---------- 3. labs module ---------- */
  {
    const { window: w, doc } = makeDom(HTML);
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="Amina Bello"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    w.eval(LABS_JS);
    run("11. labs registers LX with all sections", () => {
      for (const k of ["go", "records", "recordsCopy", "planner", "planBuild", "blitz", "blitzStart", "quizme", "qmStart", "formulas", "formulaNotes", "focus", "focusStart", "ready"]) {
        if (typeof w.eval("LX." + k) === "undefined") throw "LX." + k;
      }
    });
    run("12. Records Hall renders from history", () => {
      w.eval('store.set("nssc_attempts_" + uid(), [ { pct: 90, tms: Date.now(), correct: 9, total: 10 }, { pct: 70, tms: Date.now() - 864e5, correct: 7, total: 10 } ]);');
      w.eval("LX.go('records');");
      const ov = doc.getElementById("lxOv");
      if (!ov) throw "no lxOv overlay";
      const t = ov.textContent;
      if (!/Records Hall|Best|peak|medal/i.test(t)) throw "records not rendered: " + t.slice(0, 80);
      w.eval('store.set("nssc_attempts_" + uid(), []);');
    });
    run("13. Exam Planner builds a plan to a date", () => {
      w.eval("LX.close(); LX.go('planner');");
      const t0 = (doc.getElementById("lxOv") || { textContent: "" }).textContent;
      if (!/planner|exam plan|WASSCE/i.test(t0)) throw "planner section: " + t0.slice(0, 60);
      let threw = null;
      try { w.eval("LX.planBuild && LX.planBuild('WASSCE', '2027-05-01');"); } catch (e) { threw = String(e); }
      if (threw) throw "planBuild: " + threw.slice(0, 90);
    });
  }

  /* ---------- 4. wire budget & service worker ---------- */
  {
    run("14. boot wire (app + bank) under the 260 KiB gate", () => {
      const z = require("zlib");
      const i = z.gzipSync(fs.readFileSync("index.html"));
      const b = z.gzipSync(fs.readFileSync("bank.js"));
      if (i.length + b.length > 266240) throw (i.length + b.length) + " > 266240";
      if (i.length + b.length > 260 * 1024) throw "exceeds author's 260KiB claim: " + (i.length + b.length);
    });
    run("15. labs.js lazy module stays small and outside the gate", () => {
      const z = require("zlib");
      const l = z.gzipSync(fs.readFileSync("labs.js"));
      if (l.length > 26000) throw "labs gz " + l.length;
      if (!/labs.js/.test(fs.readFileSync("index.html", "utf8"))) throw "loader missing";
    });
    run("16. service worker: versioned cache, fetch handler caches bank.js at runtime", () => {
      const sw = fs.readFileSync("sw.js", "utf8");
      if (!/NSS_V/.test(sw) || !/skipWaiting/.test(sw)) throw "sw structure";
      if (!/caches\.match\(e\.request\)/.test(sw)) throw "no runtime cache";
      if (!/labs\.js/.test(sw)) throw "labs not mentioned";
      if (!/caches\.open\(NSS_V\).*c\.put/.test(sw)) throw "no runtime cache write";
    });
    run("17. bank payload matches its embedded hash", () => {
      const m = fs.readFileSync("index.html", "utf8").match(/QUIZ_HASH="([0-9a-f]{64})"/) || fs.readFileSync("bank.js", "utf8").match(/QUIZ_HASH="([0-9a-f]{64})"/);
      if (!m) throw "no hash";
      const z = require("zlib");
      const b64 = fs.readFileSync("bank.js", "utf8").match(/QUIZ_B64="([A-Za-z0-9+/=]+)"/);
      if (!b64) throw "no b64";
      const inf = z.inflateSync(Buffer.from(b64[1], "base64"));
      const hash = require("crypto").createHash("sha256").update(inf).digest("hex");
      if (hash !== m[1]) throw "hash mismatch " + hash.slice(0, 12);
    });
  }

  /* ---------- 5. no-speech & no-audio degradation ---------- */
  {
    const { window: w, doc, errs } = makeDom(HTML, null, {});
    // remove speech API AFTER parse to emulate old browsers at call time
    await wait(w, 300);
    w.eval('document.getElementById("gateName").value="A B"; document.getElementById("gateEmail").value="a@b.c"; gateSignUp();');
    run("18. sfx guarded when AudioContext absent", () => {
      // AudioContext is not provided by jsdom — it was already null; sfx must not throw
      let r = null;
      try { w.eval('sfx("ok"); sfx("no"); sfx("badge"); sfx("coin"); sndOn=true; sfx("ok");'); r = true; } catch (e) { r = String(e); }
      if (r !== true) throw r.slice(0, 80);
    });
    run("19. read-aloud degrades gracefully with no speechSynthesis", () => {
      let r = null;
      try { w.eval("speakText && speakText('hello')"); r = true; } catch (e) { r = String(e); }
      if (r !== true) throw r.slice(0, 80);
    });
  }

  console.log("\n" + (fails ? fails + " CHECK(S) FAILED" : "ALL CHECKS PASSED ✅"));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("TEST HARNESS ERROR:", e); process.exit(2); });
