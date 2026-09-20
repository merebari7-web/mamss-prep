/* v16.0 suite — Lumina UI refresh: design system in the shell, premium AI
   Coach suggestion cards, Study Arcade + Teaching Suite polish.
   Run: node quiz/_test_v16.js  (repo root; jsdom) */
const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const EDU = fs.readFileSync("edu.js", "utf8");
const ARC = fs.readFileSync("arcade.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 220)); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function dom(seed) {
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, {
    runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      for (const k in (seed || {})) { try { window.localStorage.setItem(k, seed[k]); } catch (e) {} }
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
  return { w, doc: w.document, errs };
}

(async () => {
  /* ---- build-level: design system present ---- */
  await run("shell: v16 design system block ships in index.html", () => {
    if (!/id="v16ui"/.test(HTML)) throw "no <style id=v16ui>";
    for (const m of [":where(button:active)", ":where(button:focus-visible)", "--grad-gold", "aiIn", "TOP PICK", "backdrop-filter"]) {
      if (!HTML.includes(m)) throw "missing marker: " + m;
    }
  });
  await run("shell: AI Coach grid is responsive (minmax(min(100%,…),1fr))", () => {
    if (!/\.ai-grid\{[^}]*minmax\(min\(100%,238px\),1fr\)/.test(HTML)) throw "ai-grid responsive rule";
    const m = HTML.match(/\.ai-grid\{[^}]*\}/);
    if (!m || !m[0].includes("repeat(auto-fit")) throw "auto-fit missing";
  });
  await run("shell: hero + coach gradient text is @supports-guarded", () => {
    if (HTML.indexOf("@supports") < 0) throw "no @supports block";
    let inside = "", outside = HTML, guard;
    while ((guard = /@supports\s*\([^{]*\)\s*\{/.exec(outside))) {
      const st = guard.index + guard[0].length; let depth = 1, k = st;
      while (k < outside.length && depth > 0) { if (outside[k] === "{") depth++; else if (outside[k] === "}") depth--; k++; }
      inside += outside.slice(guard.index, k);
      outside = outside.slice(0, guard.index) + outside.slice(k);
    }
    if (!/\.hero h1\{[^}]*background-clip:text/.test(inside)) throw "hero clip text not guarded";
    if (!/\.ai-tx h2\{[^}]*background-clip:text/.test(inside) && !/\.ai-tx h2,[^{]*\.hero h1/.test(inside)) throw "coach clip text not guarded";
    if (!/text-fill-color:\s*transparent/.test(inside)) throw "fill-color guard missing";
    const heroRule = outside.match(/\.hero h1\{[^}]*\}/g);
    if (!heroRule) throw "no unguarded .hero h1 rule";
    if (heroRule.some(r => /color:\s*transparent|text-fill-color/.test(r))) throw "transparent text leaked outside @supports";
  });
  await run("arcade: v16 premium CSS ships in arcade.js", () => {
    for (const m of ["arcIn", ".arc-best{", "nth-child(4n+2)", "var(--grad-gold)", "@keyframes arcIn"]) if (!ARC.includes(m)) throw "missing: " + m;
  });
  await run("teaching suite: v16 polish CSS ships in edu.js", () => {
    for (const m of ["44px 92px", ".edu-chip.on{", ".edu-note{", ".edu-table tbody tr:hover"]) if (!EDU.includes(m)) throw "missing: " + m;
  });
  await run("service worker cache key bumped to -v16", () => {
    const sw = fs.readFileSync("sw.js", "utf8");
    if (!/"-v(1[6-9]|[2-9][0-9])"/.test(sw)) throw "NSS_V not >= -v16";
  });

  /* ---- behavioural: coach premium cards ---- */
  const { w, doc, errs } = dom();
  await sleep(500);
  w.eval('document.getElementById("gateName").value="A B";document.getElementById("gateEmail").value="a@b.c";gateSignUp();');
  await run("coach: 2 suggestions render as premium cards (medallions + top pick)", async () => {
    w.eval('window.aiIdeas=function(){return[{ico:"🎯",txt:"Mock exam is due",sub:"English · 100 questions",why:"because your last English paper was 12 days ago",btn:"Sit paper",fn:"void 0"},{ico:"📚",txt:"Revise weak topic",sub:"Physics · Waves",why:"because 60% of your misses are on Waves",btn:"Drill",fn:"void 0"}];};AI.rot=0;renderAi();');
    await sleep(60);
    const items = doc.querySelectorAll("#aiGrid .ai-it");
    if (items.length !== 2) throw "items=" + items.length;
    if (!items[0].classList.contains("ai-top")) throw "first item not ai-top";
    if (items[1].classList.contains("ai-top")) throw "second item wrongly ai-top";
    const st0 = items[0].getAttribute("style") || "", st1 = items[1].getAttribute("style") || "";
    if (!/--ih:\d+/.test(st0) || !/--i:0/.test(st0)) throw "item0 style: " + st0;
    if (!/--i:1/.test(st1)) throw "item1 style: " + st1;
    if (items[0].style.getPropertyValue("--ih") === items[1].style.getPropertyValue("--ih")) throw "same hue (map broken?)";
    if (!doc.querySelector("#aiGrid .ai-main em")) throw "why-line missing";
    if (doc.querySelectorAll("#aiGrid .ai-go").length !== 2) throw "action buttons missing";
    if (!/content:"★ TOP PICK"/.test(HTML)) throw "ribbon CSS rule missing";
    const top = doc.querySelector("#aiGrid .ai-it.ai-top");
    if (!top) throw "no .ai-top element";
    if (top.querySelector(".ai-go") === null) throw "top pick lost its action button";
  });
  await run("coach: aiRefresh re-renders (rotation) without errors", () => {
    const before = doc.querySelectorAll("#aiGrid .ai-it").length;
    w.eval("aiRefresh()");
    const after = doc.querySelectorAll("#aiGrid .ai-it").length;
    if (before !== after || before !== 2) throw before + "->" + after;
    if (!/--i:0/.test(doc.querySelector("#aiGrid .ai-it").getAttribute("style"))) throw "stagger reset";
  });
  await run("coach: empty state keeps the friendly message", () => {
    w.eval('window.aiIdeas=function(){return[]};aiRefresh();');
    if (!/Ideas appear here once you start answering/.test(doc.getElementById("aiGrid").textContent)) throw "empty text";
    w.eval('window.aiIdeas=undefined;'); // restore real impl for later
  });

  /* ---- behavioural: arcade premium home ---- */
  w.eval(EDU);
  w.eval(ARC);
  await run("arcade: home renders 10 tiles with action buttons, no errors", async () => {
    w.eval('ARC.go("home")');
    await sleep(120);
    const tiles = doc.querySelectorAll(".arc-tile").length;
    if (tiles !== 10) throw "tiles=" + tiles;
    const btns = doc.querySelectorAll("#arcBody button").length;
    if (btns < 10) throw "buttons=" + btns;
    if (!doc.getElementById("arcTitle") || !/Study Arcade/.test(doc.getElementById("arcTitle").textContent)) throw "title";
    if (errs.length) throw errs.join(";").slice(0, 140);
  });
  await run("arcade: no NaN/undefined across the flow", async () => {
    let hits = 0;
    doc.querySelectorAll("body *").forEach(el => {
      if (/^(SCRIPT|STYLE)$/.test(el.tagName)) return;
      if (el.children.length === 0 && el.textContent && /NaN|undefined\b/.test(el.textContent)) hits++;
    });
    if (hits) throw "bad text x" + hits;
  });

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v16 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
