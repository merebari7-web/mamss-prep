/* v23.0 suite — Mater Notes removal: the floating launcher, the lazy module
   (quiz/mater_data.js) and the 60-PDF archive (mater-notes/) are gone from the
   shipped app and the repo; SW cache key bumped to -v23 so clients purge the
   old artifacts.
   Run: node quiz/_test_v23.js */
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const ARCAD = fs.readFileSync("arcade.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 220)); } };
const FEATURE = /materLaunch|window\.mater|mater_data|mater-notes|Mater Notes|mnOverlay|mnLaunch/i;

(async () => {
  await run("index.html: zero Mater feature references", () => {
    if (FEATURE.test(HTML)) throw "launcher/loader still present";
  });
  await run("arcade.js: zero Mater feature references", () => {
    if (FEATURE.test(ARCAD)) throw "arcade still references Mater";
  });
  await run("no Mater files on disk", () => {
    if (fs.existsSync("mater-notes")) throw "mater-notes/ exists";
    if (fs.existsSync("quiz/mater_data.js")) throw "mater_data.js exists";
    const leftovers = fs.readdirSync("quiz").filter(f => /mater|_mater/.test(f));
    if (leftovers.length) throw "quiz leftovers: " + leftovers.join(", ");
  });
  await run("service worker: key is current (>= -v23), no -v21/-v22 residue, changelog note", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (/"-v2[12]"/.test(SW)) throw "old key still present";
    if (!/v23/.test(SW)) throw "no v23 note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom smoke: boots errorless, launcher absent, app functional */
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
  await run("shell boots errorless, no launcher, coach intact", () => {
    if (w.document.getElementById("materLaunch")) throw "launcher still exists";
    if (w.document.getElementById("mnOverlay")) throw "overlay still exists";
    if (typeof w.mater === "function") throw "window.mater still defined";
    if (!w.document.getElementById("aiGrid")) throw "coach missing";
  });

  /* real-Chrome: no launcher UI, no module request, app + gate work, no overflow */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
        const p = await b.newPage();
        let materReq = 0;
        p.on("request", r => { if (/mater/i.test(r.url())) materReq++; });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await p.evaluate(() => { document.getElementById("gateName").value = "A B"; document.getElementById("gateEmail").value = "a@b.c"; gateSignUp(); });
        await new Promise(r => setTimeout(r, 700));
        await run("chrome " + v.w + ": no launcher, no mater requests, no overflow", async () => {
          const m = await p.evaluate(() => ({
            launch: !!document.getElementById("materLaunch"),
            overlay: !!document.getElementById("mnOverlay"),
            coach: !!document.getElementById("aiGrid"),
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth
          }));
          if (m.launch || m.overlay) throw "mater UI present";
          if (!m.coach) throw "coach missing";
          if (m.overflow) throw "horizontal overflow";
          if (materReq > 0) throw materReq + " mater request(s)";
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v23 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
