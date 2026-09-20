/* v18.0 suite — Aurum first-class upgrade: glass stat plates + gold numerals,
   premium toast/keycap chips, launcher pulse, liquid-gold shimmer, gold
   question chips, breathing focus ring. Run: node quiz/_test_v18.js */
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
  await run("shell: v18 Aurum block ships", () => {
    if (!/id="v18ui"/.test(HTML)) throw "no v18ui style";
    for (const m of ["auPulse", "auNum", "kb-hint{border:1px solid rgba(201,162,39,.45)"]) {
      if (!HTML.includes(m)) throw "missing: " + m;
    }
  });
  await run("shell: hero stat numerals are gold gradient inside @supports", () => {
    const gi = HTML.indexOf(".stat b{");
    if (gi < 0) throw "no .stat b rule";
    const sup = HTML.match(/@supports\s*\([^{]*\)\s*\{[\s\S]*?\.stat b\{[^}]*background-clip:text[^}]*\}/);
    if (!sup) throw "stat numerals not gradient-guarded";
    const open = HTML.slice(0, gi);
    if (/\.stat b\{[^}]*text-fill-color/.test(open)) throw "unguarded transparent numerals";
  });
  await run("shell: toast is gold-edged night glass", () => {
    if (!/#toast\{[^}]*border:1px solid rgba\(201,162,39,.55\)/.test(HTML)) throw "toast border rule";
  });
  await run("shell: launcher pulse is motion-gated (reduced-motion + .rmotion)", () => {
    const m = HTML.match(/prefers-reduced-motion[\s\S]{0,260}html:not\(\.rmotion\)[\s\S]{0,160}auPulse/);
    if (!m) throw "not gated";
  });
  await run("arcade: liquid-gold shimmer on progress fills, motion-gated", () => {
    if (!ARC.includes("auFlow")) throw "no auFlow";
    const m = ARC.match(/prefers-reduced-motion[\s\S]{0,260}html:not\(\.rmotion\)[\s\S]{0,160}auFlow/);
    if (!m) throw "shimmer not gated";
    for (const s of [".arc-bar i::after,.arc-wbar i::after", ".arc-pill{border:1px solid rgba(201,162,39,.5)", ".arc-q::before"]) if (!ARC.includes(s)) throw "missing: " + s;
  });
  await run("arcade: KPI numerals gold gradient guarded", () => {
    if (!/@supports[\s\S]*?\{(?:(?!@supports)[\s\S])*?\.arc-kpi b\{[^}]*background-clip:text/.test(ARC)) throw "kpi not guarded";
  });
  await run("edu: gold question chips + refined selects + modal mist", () => {
    for (const m of [".edu-qhead b{display:inline-grid", "background:var(--grad-gold);color:#31220a;font-size:.78rem", ".edu-sel{border:1.5px solid rgba(201,162,39,.5)", "0 0 90px -34px rgba(201,162,39,.45)"]) if (!EDU.includes(m)) throw "missing: " + m;
  });
  await run("labs: breathing ring + floating trophy (motion-gated) + score pills", () => {
    if (!LABS.includes("lxBreath") || !LABS.includes("lxFloat")) throw "keyframes";
    const m = LABS.match(/prefers-reduced-motion[\s\S]{0,260}html:not\(\.rmotion\)[\s\S]{0,160}lxBreath/);
    if (!m) throw "breath not gated";
    for (const s of [".lx-qhead>span:first-child", ".lx-qn{display:inline-grid", ".lx-blitz-score .ok", ".lx-blitz-score .no"]) if (!LABS.includes(s)) throw "missing: " + s;
  });
  await run("service worker cache key bumped to -v18", () => {
    if (!/-v(1[89]|[2-9][0-9])/.test(SW)) throw "NSS_V not >= -v18";
  });

  /* ---- behavioural smoke ---- */
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, { runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.DecompressionStream = globalThis.DecompressionStream; window.TextDecoder = globalThis.TextDecoder; window.TextEncoder = globalThis.TextEncoder;
      const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = () => vp;
      window.speechSynthesis = { cancel() {}, speak() {}, getVoices() { return [{ lang: "en-GB" }]; } };
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      window.scrollTo = () => {}; window.matchMedia = window.matchMedia || (() => ({ matches: false }));
    } });
  const w = d.window; const errs = [];
  w.addEventListener("error", e => errs.push(String(e.message || "e").slice(0, 120)));
  await sleep(450);
  w.eval('document.getElementById("gateName").value="A B";document.getElementById("gateEmail").value="a@b.c";gateSignUp();');
  await run("coach: premium cards render (TOP PICK + medallions)", () => {
    w.eval('window.aiIdeas=function(){return[{ico:"🏆",txt:"Mock exam due",sub:"English · 100 questions",why:"because your last paper was 12 days ago",btn:"Sit paper",fn:"void 0"},{ico:"📖",txt:"Revision drill",sub:"Physics · Waves",why:"because 60% of misses land here",btn:"Drill",fn:"void 0"}];};AI.rot=0;renderAi();');
    const items = w.document.querySelectorAll("#aiGrid .ai-it");
    if (items.length !== 2 || !items[0].classList.contains("ai-top")) throw "cards=" + items.length;
    if (!/--ih:\d+/.test(items[0].getAttribute("style") || "")) throw "no hue";
  });
  await run("toast shows with show-state after a message", () => {
    w.eval('try{toast("Aurum test message","✨")}catch(e){}');
    const t = w.document.getElementById("toast");
    if (!t) throw "no #toast";
    if (!t.classList.contains("show")) throw "not shown (class)";
    if (!/Aurum test message/.test(t.textContent)) throw "text";
  });
  await run("arcade: home + utme + stats render errorless", async () => {
    w.eval(ARC);
    w.eval('ARC.go("home")');
    await sleep(120);
    if (w.document.querySelectorAll(".arc-tile").length !== 10) throw "tiles";
    w.eval('ARC.go("stats")');
    await sleep(120);
    if (!w.document.querySelector(".arc-kpi")) throw "no kpi";
    w.eval('ARC.go("utme");ARC.utmeStart({subjects:["English Language","Mathematics","Physics","Chemistry"]});');
    await sleep(120);
    if (!w.document.querySelector(".arc-cell")) throw "no grid";
    if (errs.length) throw errs.join(";").slice(0, 140);
  });
  await run("edu notes render with question chips", async () => {
    w.eval(EDU);
    w.eval('EDU.subject("Mathematics");EDU.go("notes");');
    await sleep(120);
    const b = w.document.getElementById("eduWork");
    if (!b || !b.querySelector(".edu-q")) throw "no question blocks";
    if (!/Worked examples/.test(b.textContent)) throw "no examples";
  });
  await run("no NaN/undefined on screen", () => {
    let hits = 0;
    w.document.querySelectorAll("body *").forEach(el => {
      if (/^(SCRIPT|STYLE)$/.test(el.tagName)) return;
      if (el.children.length === 0 && el.textContent && /NaN|undefined\b/.test(el.textContent)) hits++;
    });
    if (hits) throw "bad text x" + hits;
  });

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v18 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
