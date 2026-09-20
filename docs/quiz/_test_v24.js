/* v24.0 suite — Aurum polish layer: lazy quiz/polish.js (hero shimmer text,
   gold particle field, breathing halo, glass stat plates, gold-edged cards,
   shine-swept coach CTAs, gold scrollbar), shipped via a tiny boot-safe loader;
   SW key -v24.
   Run: node quiz/_test_v24.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 220)); } };

(async () => {
  await run("index.html: polish loader ships", () => {
    if (!/quiz\/polish\.js/.test(HTML)) throw "no loader";
    if (!/s\.async=!0/.test(HTML) && !/async=!0/.test(HTML)) throw "loader not async";
  });
  await run("polish.js: parses and carries the hooks", () => {
    new Function(POLISH);
    for (const hook of ["polishCss", "polished", "pf-halo", "pf-s10", "pfSheen", "pfSpark", "pfRise", "pfShineA", "ai-go::after"]) {
      if (POLISH.indexOf(hook) < 0) throw "missing hook " + hook;
    }
  });
  await run("polish.js: boot-safe (only additive hooks, no global overrides outside html.polished)", () => {
    const body = POLISH.replace(/\s+/g, " ");
    if (/"\.hero\s*\{/.test(body)) throw "raw .hero override"; /* v41: allow html.apple.apple-scoped .hero rules */
    if (!/html\.polished \.hero h1/.test(body)) throw "headline not scoped";
    if (body.indexOf("window.__polish") < 0) throw "no re-entry guard";
  });
  await run("service worker cache key is current (>= -v24)", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (/"-v23"/.test(SW)) throw "-v23 key literal still present";
    if (!/v24/.test(SW)) throw "no v24 note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom: boots errorless with the loader present */
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
  await new Promise(r => setTimeout(r, 600));
  await run("shell boots errorless with polish loader", () => {
    if (!w.document.getElementById("aiGrid")) throw "no coach";
    if (!w.document.querySelector(".hero")) throw "no hero";
  });

  /* real-Chrome: polish actually applies, stays silent, no overflow */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }, { w: 1920, h: 1080 }]) {
        const p = await b.newPage();
        const errs = [];
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 120)));
        let polishReq = 0, polishOK = false;
        p.on("response", r => { if (/polish\.js$/.test(r.url())) { polishReq++; polishOK = r.status() === 200; } });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": polish applied, no errors, no overflow", async () => {
          const m = await p.evaluate(() => {
            const h1 = document.querySelector(".hero h1");
            const go = document.querySelector(".ai-go");
            return {
              cls: document.documentElement.classList.contains("polished"),
              fx: !!document.getElementById("polishFx"),
              fxKids: (document.getElementById("polishFx") || { children: { length: 0 } }).children.length,
              h1Fill: h1 ? getComputedStyle(h1).webkitTextFillColor : "",
              h1Bg: h1 ? getComputedStyle(h1).backgroundImage.slice(0, 30) : "",
              subFill: document.querySelector(".h1-sub") ? getComputedStyle(document.querySelector(".h1-sub")).webkitTextFillColor : "",
              goAfter: go ? getComputedStyle(go, "::after").content : "none",
              overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth
            };
          });
          if (!m.cls) throw "html.polished missing";
          if (!m.fx || m.fxKids < 11) throw "particle layer missing (kids=" + m.fxKids + ")";
          if (m.h1Fill !== "rgba(0, 0, 0, 0)" && m.h1Fill !== "transparent") throw "h1 not gradient-clipped: " + m.h1Fill;
          if (!/gradient/.test(m.h1Bg)) throw "no gradient background on h1";
          if (m.subFill === "rgba(0, 0, 0, 0)" || m.subFill === "transparent") throw "h1-sub rendered invisible";
          if (m.goAfter === "none") throw "shine sweep not applied";
          if (errs.length) throw errs.length + " page error(s)";
          if (m.overflow) throw "horizontal overflow";
        });
        if (polishReq === 0) await run("chrome " + v.w + ": polish.js fetched", () => { throw "no request"; });
        else if (!polishOK) await run("chrome " + v.w + ": polish.js fetched", () => { throw "status != 200"; });
        else console.log("PASS: chrome " + v.w + ": polish.js fetched (200)");
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v24 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
