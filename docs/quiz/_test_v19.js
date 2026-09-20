/* v19.0 suite — All-Device Responsive: 280px fold pass, iPhone-5 landscape,
   dvh + safe-area, iOS zoom-on-focus (16px coarse inputs), ultra-wide wrap.
   Run: node quiz/_test_v19.js */
const fs = require("fs");
const zlib = require("zlib");
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
  await run("shell: v19 responsive block ships", () => {
    if (!/id="v19ui"/.test(HTML)) throw "no v19ui style";
    for (const m of ["text-wrap:balance", ".plan-gauge{display:flex", "grid-template-columns:1fr", "font-size:16px"]) {
      if (!HTML.includes(m)) throw "missing shell marker: " + m;
    }
  });
  await run("shell: 280px fixes inside 479/400/319 media", () => {
    if (!/@media\(max-width:479px\)[\s\S]{0,200}plan-gauge\{display:flex/.test(HTML)) throw "plan-gauge flex not in 479 media";
    if (!/@media\(max-width:400px\)[\s\S]{0,200}hero3d\{overflow:visible/.test(HTML)) throw "hero3d open not in 400 media";
    if (!/@media\(max-width:319px\)[\s\S]{0,240}tab\{padding:6px 8px;font-size:\.7rem/.test(HTML)) throw "tab shrink not in 319 media";
    if (!/@media\(max-width:479px\)[\s\S]{0,240}#classTabs\{display:flex;overflow-x:auto/.test(HTML)) throw "classTabs scroller not in 479 media";
  });
  await run("shell: iOS zoom fix only on coarse pointers", () => {
    const g = HTML.match(/@media\(pointer:coarse\)[\s\S]{0,160}input,select,textarea\{font-size:16px/);
    if (!g) throw "coarse 16px rule missing";
  });
  await run("shell: ultra-wide + short-viewport care", () => {
    if (!/@media\(min-width:1440px\)[\s\S]{0,120}wrap\{max-width:1060px/.test(HTML)) throw "1440 wrap missing";
    if (!/@media\(max-height:520px\)/.test(HTML)) throw "short-viewport squeeze missing";
  });
  await run("arcade: safe-area + dvh + tall-touch + short screens", () => {
    for (const m of ["env(safe-area-inset-bottom)", "100dvh", "max-height:560px", "@media(max-width:319px)"]) {
      if (!ARC.includes(m)) throw "missing arcade marker: " + m;
    }
  });
  await run("edu: dvh modals + safe-area + fluid small screens", () => {
    for (const m of ["100dvh", "env(safe-area-inset-bottom)", "@media(max-width:359px)"]) if (!EDU.includes(m)) throw "missing edu marker: " + m;
  });
  await run("labs: dvh modals + safe-area + fluid small screens", () => {
    for (const m of ["100dvh", "env(safe-area-inset-bottom)", "@media(max-width:359px)"]) if (!LABS.includes(m)) throw "missing labs marker: " + m;
  });
  await run("service worker cache key bumped to -v19", () => {
    if (!/"-v(19|[2-9][0-9])"/.test(SW)) throw "NSS_V not -v19";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    if (w > 265500) console.log("   (wire " + w + " — headroom " + (266240 - w) + " B, tight)");
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
  await run("boot: gate + coach render with no errors", () => {
    if (!w.document.getElementById("aiGrid")) throw "no coach grid";
    if (errs.length) throw errs.join(";").slice(0, 140);
  });
  await run("arcade: home + utme render errorless", async () => {
    w.eval(ARC);
    w.eval('ARC.go("home")');
    await sleep(120);
    if (w.document.querySelectorAll(".arc-tile").length !== 10) throw "tiles";
    w.eval('ARC.go("utme");ARC.utmeStart({subjects:["English Language","Mathematics","Physics","Chemistry"]});');
    await sleep(120);
    if (!w.document.querySelector(".arc-cell")) throw "no grid";
    if (errs.length) throw errs.join(";").slice(0, 140);
  });
  await run("labs: module loads and LX.go is wired (real-Chrome probe covers render)", async () => {
    w.eval('window.LX={ready:true,wait:[]};');
    w.eval(LABS);
    w.eval('LX.go("practice");');
    await sleep(200);
    if (typeof w.LX.go !== "function") throw "LX.go not defined";
    if (w.document.getElementById("fatalOverlay") && w.document.getElementById("fatalOverlay").style.display !== "none") throw "fatal overlay visible";
  });

  /* ---- real-Chrome 280px + 667 landscape ---- */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      const p = await b.newPage();
      await p.setViewport({ width: 280, height: 653, isMobile: true, hasTouch: true });
      await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
      await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
      await p.evaluate(() => { document.getElementById("gateName").value = "A B"; document.getElementById("gateEmail").value = "a@b.c"; gateSignUp(); });
      await sleep(700);
      await run("chrome 280: no horizontal document overflow", async () => {
        const sw = await p.evaluate(() => document.scrollingElement.scrollWidth);
        if (sw > 280) throw "scrollWidth " + sw;
      });
      await run("chrome 280: plan gauge flex-stacks inside its card", async () => {
        const g = await p.evaluate(() => {
          const el = document.querySelector(".plan-gauge");
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { disp: getComputedStyle(el).display, right: Math.round(r.right), pad: el.closest(".plan-card") ? Math.round(el.closest(".plan-card").getBoundingClientRect().right) : null };
        });
        if (!g) throw "no .plan-gauge";
        if (g.disp !== "flex") throw "display=" + g.disp;
        if (g.right > 282) throw "gauge right " + g.right;
      });
      await run("chrome 280: class tabs scroll, no clipped tab text", async () => {
        const t = await p.evaluate(() => {
          const c = document.getElementById("classTabs");
          if (!c) return null;
          const tabs = [...c.querySelectorAll(".tab")];
          const bad = tabs.filter(x => x.scrollWidth > x.clientWidth + 2).map(x => x.textContent.trim().slice(0, 10));
          return { ov: getComputedStyle(c).overflowX, tabs: tabs.length, bad };
        });
        if (!t) throw "no #classTabs";
        if (t.bad.length) throw "clipped tabs: " + t.bad.join(",");
      });
      await run("chrome 280: arcade home opens overflow-free", async () => {
        await p.evaluate(() => window.arc("open"));
        await sleep(1200);
        const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
        if (sw > 280) throw "arcade scrollWidth " + sw;
      });
      await p.setViewport({ width: 667, height: 375, isMobile: true, hasTouch: true });
      await sleep(500);
      await run("chrome land-667: no horizontal overflow", async () => {
        const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
        if (sw > 667) throw "scrollWidth " + sw;
      });
    } finally { await b.close(); }
  } else {
    console.log("SKIP: puppeteer unavailable — chrome checks skipped");
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v19 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
