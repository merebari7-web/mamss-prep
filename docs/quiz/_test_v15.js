/* v15.0 suite — Complete Curriculum Library: SYLL (684-topic term-by-term
   syllabus index) + CURR (19-subject lesson-note & question library) wired
   into the Teaching Suite via the curo loader.
   Run: node quiz/_test_v15.js  (repo root; jsdom) */
const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const EDU = fs.readFileSync("edu.js", "utf8");
const SYLL = fs.readFileSync("quiz/syllabus_data.js", "utf8");
const CURR = fs.readFileSync("quiz/curr_data.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 200)); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function dom(withData) {
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, {
    runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.DecompressionStream = globalThis.DecompressionStream;
      window.TextDecoder = globalThis.TextDecoder;
      window.TextEncoder = globalThis.TextEncoder;
      const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = () => vp;
      window.speechSynthesis = { cancel() {}, speak() {}, getVoices() { return [{ lang: "en-GB" }]; } };
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      window.scrollTo = () => {};
      window.matchMedia = window.matchMedia || (() => ({ matches: false }));
    }
  });
  const w = d.window; const errs = [];
  w.addEventListener("error", e => errs.push(String(e.message || "e").slice(0, 120)));
  w.addEventListener("unhandledrejection", e => errs.push(String(e.reason || "r").slice(0, 120)));
  if (withData) {
    try { w.eval(SYLL); } catch (e) { errs.push("syll eval " + String(e.message).slice(0, 80)); }
    try { w.eval(CURR); } catch (e) { errs.push("curr eval " + String(e.message).slice(0, 80)); }
  }
  return { w, doc: w.document, errs };
}

(async () => {
  /* ---- data integrity (mirrors the generator's own validation) ---- */
  await run("curriculum data: 19 × 9 × 4 = 684 syllabus topics", () => {
    if (Object.keys(SYLLx()).length !== 19) throw "SYLL subjects";
    Object.entries(SYLLx()).forEach(([s, rows]) => {
      if (rows.length !== 9) throw s + " rows=" + rows.length;
      rows.forEach(r => { if (!Array.isArray(r) || r.length !== 4) throw s + " row"; });
    });
    const total = Object.values(SYLLx()).reduce((a, r) => a + r.length * 4, 0);
    if (total !== 684) throw "topics=" + total;
  });
  await run("curriculum data: 19 subjects × 6 topics, every topic has facts + 2+ questions", () => {
    const C = CURRx();
    if (Object.keys(C).length !== 19) throw "CURR subjects";
    let q = 0;
    Object.entries(C).forEach(([s, ts]) => {
      if (ts.length !== 6) throw s + " topics=" + ts.length;
      ts.forEach(t => {
        if (typeof t[2] !== "string" || t[2].length < 60) throw s + ":" + t[0] + " facts";
        if (!Array.isArray(t[3]) || t[3].length < 2) throw s + ":" + t[0] + " qs";
        t[3].forEach(x => { if (typeof x.q !== "string" || !Array.isArray(x.o) || x.o.length < 3 || typeof x.a !== "number") throw s + ":" + t[0] + " q"; });
        q += t[3].length;
      });
    });
    if (q < 220) throw "questions=" + q;
  });
  function SYLLx(){ return eval("(" + SYLL.slice(SYLL.indexOf("{"), SYLL.lastIndexOf("}") + 1) + ")"); }
  function CURRx(){ return eval("(" + CURR.slice(CURR.indexOf("{"), CURR.lastIndexOf("}") + 1) + ")"); }

  /* ---- wired Teaching Suite, data present ---- */
  const { w, doc, errs } = dom(true);
  await sleep(500);
  w.eval('document.getElementById("gateName").value="A B";document.getElementById("gateEmail").value="a@b.c";gateSignUp();');
  w.eval(EDU);

  await run("curo: settles immediately when SYLL+CURR already present", () => {
    const r = w.eval('window.__v15ran=0;var rv=window.curo(function(){window.__v15ran=1});[rv,window.__v15ran].join(",")');
    if (r !== "true,1") throw "got " + r;
  });

  await run("notes: CURR topics lead the chips (Mathematics)", async () => {
    w.eval('EDU.subject("Mathematics"); EDU.go("notes");');
    await sleep(120);
    const chips = [...doc.querySelectorAll(".edu-chip")].map(x => x.textContent);
    if (chips.length < 12) throw "chips=" + chips.length;
    if (new Set(chips).size !== chips.length) throw "duplicate chip";
    const cur = CURRx().Mathematics.map(t => t[0]);
    cur.forEach(t => { if (!chips.includes(t)) throw "missing CURR chip: " + t; });
    // CURR topic selected by default -> real key facts present
    const lesson = doc.getElementById("eduLesson").textContent;
    if (!lesson.includes(cur[0])) throw "lesson topic missing";
    if (!lesson.includes(CURRx().Mathematics[0][2].slice(0, 40))) throw "CURR facts not in lesson";
    const work = doc.getElementById("eduWork").textContent;
    if (!work.includes(CURRx().Mathematics[0][3][0].q.slice(0, 30))) throw "curated question missing";
  });

  await run("notes: curated questions surface for a CURR topic (evaluation)", async () => {
    const tName = CURRx().Mathematics[1][0];
    w.eval('EDU.subject("Mathematics"); EDU.topic(' + JSON.stringify(tName) + ');');
    await sleep(90);
    const work = doc.getElementById("eduWork").textContent;
    if (!work.includes(CURRx().Mathematics[1][3][0].q.slice(0, 30))) throw "curated stem absent";
    const qBlocks = doc.querySelectorAll("#eduWork .edu-qtext").length;
    if (qBlocks < 4) throw "question blocks=" + qBlocks;
  });

  await run("syllabus: 19 cards, 3 term blocks each, 684 pills", async () => {
    w.eval('EDU.go("syllabus")');
    await sleep(140);
    const body = doc.getElementById("sylBody");
    if (!body) throw "no sylBody";
    const cards = body.querySelectorAll(".edu-grid3 > .edu-card");
    if (cards.length !== 19) throw "cards=" + cards.length;
    const pills = body.querySelectorAll(".edu-pill").length;
    if (pills !== 684) throw "pills=" + pills;
    cards.forEach(c => {
      const terms = [...c.querySelectorAll(".edu-sub b")].map(b => b.textContent);
      if (terms.length !== 3 || terms[0] !== "1st Term" || terms[1] !== "2nd Term" || terms[2] !== "3rd Term")
        throw "terms: " + terms.join(",");
    });
  });

  await run("syllabus: SS1/SS2/SS3 selector repaints and keeps 684 pills", async () => {
    const sel = doc.getElementById("sylCls");
    sel.value = "SS1"; sel.dispatchEvent(new w.Event("change"));
    await sleep(60);
    if (doc.querySelectorAll("#sylBody .edu-pill").length !== 684) throw "SS1 pills";
    sel.value = "SS2"; sel.dispatchEvent(new w.Event("change"));
    await sleep(60);
    if (doc.querySelectorAll("#sylBody .edu-pill").length !== 684) throw "SS2 pills";
  });

  await run("scheme: 3 terms × 12 weeks, week topics from the real syllabus", async () => {
    w.eval('EDU.subject("Mathematics"); EDU.go("scheme");');
    await sleep(140);
    const body = doc.getElementById("schBody");
    if (!body) throw "no schBody";
    const cards = body.querySelectorAll(".edu-grid3 > .edu-card");
    if (cards.length !== 3) throw "term cards=" + cards.length;
    const syll = SYLLx().Mathematics;
    [...cards].forEach((card, ti) => {
      const weeks = [...card.querySelectorAll(".edu-week span")].map(x => x.textContent);
      if (weeks.length !== 12) throw "term " + ti + " weeks=" + weeks.length;
      const termTopics = syll.slice(ti * 3, ti * 3 + 3).flat();
      weeks.forEach(t => { if (!termTopics.includes(t)) throw "off-syllabus week: " + t; });
    });
    if (!/Week 12/.test(body.textContent)) throw "week list missing";
  });

  await run("no uncaught errors or NaN across the wired suite flow", () => {
    if (errs.length) throw errs.join(";").slice(0, 140);
    let hits = 0;
    doc.querySelectorAll("body *").forEach(el => {
      if (/^(SCRIPT|STYLE)$/.test(el.tagName)) return;
      if (el.children.length === 0 && el.textContent && /NaN|undefined\b/.test(el.textContent)) hits++;
    });
    if (hits) throw "bad text x" + hits;
  });

  /* ---- fallback: NO curriculum data — everything must still work ---- */
  const f = dom(false);
  await sleep(400);
  f.w.eval('document.getElementById("gateName").value="A B";document.getElementById("gateEmail").value="a@b.c";gateSignUp();');
  f.w.eval(EDU);
  await run("fallback (no data): syllabus map renders without SYLL", async () => {
    f.w.eval('EDU.go("syllabus")');
    await sleep(120);
    const body = f.doc.getElementById("sylBody");
    if (!body) throw "no sylBody";
    if (!body.querySelector(".edu-card")) throw "no cards";
    if (body.querySelectorAll(".edu-pill").length === 0) throw "no pills";
  });
  await run("fallback (no data): notes + scheme still render", async () => {
    f.w.eval('EDU.subject("Physics"); EDU.go("notes");');
    await sleep(100);
    if (!f.doc.getElementById("eduLesson").textContent.includes("Physics")) throw "notes";
    f.w.eval('EDU.go("scheme")');
    await sleep(100);
    if (!/1st Term/.test((f.doc.getElementById("schBody") || { textContent: "" }).textContent)) throw "scheme";
  });
  await run("fallback: curo settled flag prevents reload loops", () => {
    const n0 = f.doc.querySelectorAll("script[src^=\"quiz/\"]").length;
    f.w.eval("window.__curSettled=1");
    const r = f.w.eval('window.curo(function(){})');
    const n1 = f.doc.querySelectorAll("script[src^=\"quiz/\"]").length;
    if (r !== false) throw "returned " + r;
    if (n1 !== n0) throw "script tags created";
    if (f.errs.length) throw f.errs.join(";").slice(0, 120);
  });

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v15 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
