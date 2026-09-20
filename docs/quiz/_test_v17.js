/* v17.0 suite — Lumina II: shell control states + touch-hover suppression,
   AI Coach small-screen hardening, Study Arcade deep refresh, Labs + Teaching
   Suite polish. Run: node quiz/_test_v17.js (repo root; jsdom) */
const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const EDU = fs.readFileSync("edu.js", "utf8");
const ARC = fs.readFileSync("arcade.js", "utf8");
const LABS = fs.readFileSync("labs.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 220)); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ---- build-level ---- */
  await run("shell: v17 design-refresh block ships", () => {
    if (!/id="v17ui"/.test(HTML)) throw "no v17ui style";
    for (const m of [":where(button:disabled", "button[disabled]", "min-width:0", "overflow-wrap:anywhere", "minmax(min(100%,260px)"]) {
      if (!HTML.includes(m)) throw "missing: " + m;
    }
  });
  await run("shell: touch devices drop hover lifts (sticky-hover fix)", () => {
    const m = HTML.match(/@media\(hover:none\)\{[^@]*?\}\}/);
    if (!m || !/transform:none!important/.test(m[0])) throw "hover:none suppression rule";
  });
  await run("shell: coach stacks to 1 column under 400px", () => {
    const m = HTML.match(/@media\(max-width:400px\)\{[^@]*\.ai-grid\{[^}]*1fr/);
    if (!m) throw "no 400px coach rule";
  });
  await run("shell: focus-visible on inputs + disabled buttons styled", () => {
    if (!/:where\(input,select,textarea\):focus-visible/.test(HTML)) throw "input focus";
    if (!/cursor:not-allowed/.test(HTML)) throw "disabled cursor";
  });
  await run("arcade: Lumina II refresh ships (feedback, medallions, HUD, calc, KPIs)", () => {
    for (const m of ["arcMfloat", "arcPop", "arcShake", ".arc-opt.good", ".arc-opt.bad", ".arc-hud{", ".arc-calcd{", ".arc-kpi{", ".arc-tab.on{", ".arc-cell.on{"]) {
      if (!ARC.includes(m)) throw "missing: " + m;
    }
  });
  await run("labs: Lumina II polish ships", () => {
    for (const m of ["lxShake", ".lx-trophy{", ".lx-focus-ring{", ".lx-tick{border-color"]) if (!LABS.includes(m)) throw "missing: " + m;
  });
  await run("teaching suite: v17 polish ships", () => {
    for (const m of [".edu-tag{", ".edu-opt:hover{"]) if (!EDU.includes(m)) throw "missing: " + m;
  });
  await run("service worker cache key bumped to -v17", () => {
    if (!/"-v(1[7-9]|[2-9][0-9])"/.test(SW)) throw "NSS_V not >= -v17";
  });

  /* ---- behavioural smoke: premium coach still renders ---- */
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
  await sleep(450);
  w.eval('document.getElementById("gateName").value="A B";document.getElementById("gateEmail").value="a@b.c";gateSignUp();');
  await run("coach: premium cards render, TOP PICK + medallions intact", () => {
    w.eval('window.aiIdeas=function(){return[{ico:"🎯",txt:"Mock exam is due",sub:"English Language · 100 questions · 45 min",why:"because your last English paper was 12 days ago",btn:"Sit paper",fn:"void 0"},{ico:"📖",txt:"Revise weakest topic",sub:"Physics · Waves — a very long topic title that must wrap safely on small screens",why:"because 60% of misses are on this topic",btn:"Drill",fn:"void 0"}];};AI.rot=0;renderAi();');
    const items = w.document.querySelectorAll("#aiGrid .ai-it");
    if (items.length !== 2) throw "items=" + items.length;
    if (!items[0].classList.contains("ai-top")) throw "no top pick";
    if (!/--ih:\d+/.test(items[0].getAttribute("style") || "")) throw "no hue";
    if (w.document.querySelectorAll("#aiGrid .ai-go").length !== 2) throw "actions";
    if (errs.length) throw errs.join(";").slice(0, 120);
  });
  await run("arcade: home + stats still render after v17 CSS", async () => {
    w.eval(ARC);
    w.eval('ARC.go("home")');
    await sleep(120);
    if (w.document.querySelectorAll(".arc-tile").length !== 10) throw "tiles";
    w.eval('ARC.go("stats")');
    await sleep(120);
    if (!/Study Stats/.test((w.document.getElementById("arcTitle") || { textContent: "" }).textContent)) throw "stats";
    w.eval('ARC.go("utme");ARC.utmeStart({subjects:["English Language","Mathematics","Physics","Chemistry"]});');
    await sleep(120);
    if (!w.document.querySelector(".arc-cell")) throw "utme grid";
    if (errs.length) throw errs.join(";").slice(0, 120);
  });

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v17 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
