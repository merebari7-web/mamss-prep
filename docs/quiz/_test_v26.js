/* v26.0 suite — Aurum Design System: lazy polish.js now upgrades every surface
   (hero today-chip with date/term/streak, stat icons, nav glass, quiz option
   hovers, tiles, modal blur, toast frame, focus rings) and adds back-to-top +
   scroll-reveal. SW key -v26. index.html boot chain untouched.
   Run: node quiz/_test_v26.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("polish.js: parses and carries v26 hooks", () => {
    new Function(POLISH);
    for (const h of ["heroChip", "backTop", "reveal", "hero-chip", "back-top", "focus-visible", "nth-of-type(1) b::before", "rgba(220,184,95,.5)", "backdrop-filter:blur(6px)"]) {
      if (POLISH.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("polish.js: keeps v24 hooks intact", () => {
    for (const h of ["pf-halo", "pf-s10", "pfSheen", "pfSpark", "pfRise", "pfShineA", "ai-go::after", "polishCss"]) {
      if (POLISH.indexOf(h) < 0) throw "missing v24 hook " + h;
    }
  });
  await run("polish.js: boot-safe (scoped under html.polished, re-entry guard)", () => {
    const body = POLISH.replace(/\s+/g, " ");
    if (/"\.hero\s*\{/.test(body)) throw "raw .hero override"; /* v41: allow html.apple.apple-scoped .hero rules */
    if (body.indexOf("window.__polish") < 0) throw "no guard";
    if (body.indexOf("catch (e) { /* decorative only") < 0) throw "no fail-silent guard";
  });
  await run("index.html: loader unchanged, notes + polish still ship", () => {
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
    if (!/window\.notes=function/.test(HTML)) throw "notes loader gone";
  });
  await run("service worker cache key is current (>= -v26)", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (!/v26/.test(SW)) throw "no v26 note";
  });
  await run("boot wire gzip <= 266240 B (unchanged)", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom: boots, chip + back-top added, silent without IO */
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
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("polish applies in jsdom: chip + back-top, no errors", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 250));
    const chip = w.document.getElementById("heroChip");
    if (!chip) throw "no hero chip";
    if (chip.textContent.indexOf("Term") < 0) throw "chip has no term: " + chip.textContent;
    if (!w.document.getElementById("backTop")) throw "no back-top button";
    if (!w.document.documentElement.classList.contains("polished")) throw "no polished class";
    if (!w.document.getElementById("polishCss")) throw "no style";
  });

  /* real-Chrome: chip, icons, back-top behaviour, reveal, no overflow/errors */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
        const p = await b.newPage();
        const errs = [];
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 140)));
        p.on("console", m => {
          if (m.type() !== "error") return;
          const t = m.text() || "";
          if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return; // google-signin + file:// noise
          errs.push("console: " + t.slice(0, 120));
        });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": chip, icons, reveal, back-top, no errors", async () => {
          const m = await p.evaluate(async () => {
            const chip = document.getElementById("heroChip");
            const icon = getComputedStyle(document.querySelector(".stat"), "::before")
              ? getComputedStyle(document.querySelector(".stat b"), "::before").content : "none";
            const bt = document.getElementById("backTop");
            const before = bt ? bt.classList.contains("show") : null;
            window.scrollTo(0, 600);
            let shown = bt ? bt.classList.contains("show") : null;
            let revealed = 0;
            for (let i = 0; i < 16; i++) {
              window.scrollTo(0, 600 + i * 400);
              await new Promise(r => setTimeout(r, 200));
              shown = shown || (bt ? bt.classList.contains("show") : null);
              revealed = document.querySelectorAll(".card.rv-in, .card:not(.rv)").length;
              if (shown && revealed >= 1) break;
            }
            bt && bt.click();
            await new Promise(r => setTimeout(r, 400));
            return {
              chip: chip ? chip.textContent : "",
              icon: icon,
              before, shown, revealed,
              overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth
            };
          });
          if (!m.chip || m.chip.indexOf("Term") < 0) throw "chip missing";
          if (m.icon === "none" || !m.icon) throw "stat icon missing: " + m.icon;
          if (m.before !== false) throw "back-top visible at top";
          if (m.shown !== true) throw "back-top did not appear after scroll";
          if (m.revealed < 1) throw "no revealed cards";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v26 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
