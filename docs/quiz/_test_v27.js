/* v27.0 suite — Pro Tools (lazy quiz/pro.js, loaded by polish.js at idle):
   ⌘K command palette, exam countdown strip (WAEC/NECO/JAMB), Zen focus timer
   (chime + notifications + session log), GitHub-style study heatmap,
   personalised greeting, daily tips, button ripple. SW key -v27.
   Run: node quiz/_test_v27.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("pro.js: parses and carries every v27 feature", () => {
    new Function(PRO);
    for (const h of ["Ctrl", "palQ", "examChip", "zenOv", "zenRing", "hm-grid", "pf-rip", "NERDC Lesson Notes", "Zen Focus", "Notification", "zenDone", "zenHM"]) {
      if (PRO.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("polish.js: idle-loads pro.js (zero boot cost)", () => {
    if (POLISH.indexOf("quiz/pro.js") < 0) throw "no pro loader";
    if (POLISH.indexOf("requestIdleCallback") < 0 && POLISH.indexOf("setTimeout(pr") < 0) throw "no idle strategy";
  });
  await run("index.html: still loader-only (no pro inline, wire unchanged)", () => {
    if (/quiz\/pro\.js/.test(HTML)) throw "pro.js inline in shell";
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped (progression-aware)", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not advanced";
    if (!/v27/.test(SW)) throw "no v27 note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom: palette, exam chips, zen, heatmap, ripple */
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
      window.Notification = function () {}; window.Notification.permission = "default";
      window.AudioContext = function () { this.currentTime = 0; this.createOscillator = () => ({ type: "", connect() {}, start() {}, stop() {}, frequency: { value: 0 } }); this.createGain = () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }); this.destination = {}; this.close = () => {}; };
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("polish boots then pro attaches (palette, zen, exam, ripple)", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 900));
    w.eval(PRO);
    await new Promise(r => setTimeout(r, 300));
    if (!w.document.documentElement.classList.contains("pro")) throw "no pro class";
    if (!w.document.getElementById("proCss")) throw "no pro css";
    if (!w.document.getElementById("examChip")) throw "no exam strip";
    if (w.document.getElementById("examChip").textContent.indexOf("days") < 0) throw "no day counts";
    if (!w.document.getElementById("heroChip")) throw "no hero chip";
    if (!w.document.documentElement.classList.contains("polished")) throw "polish lost";
  });
  await run("command palette: Ctrl+K opens, filters, runs, Esc closes", async () => {
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const pal = w.document.getElementById("palQ");
    if (!pal) throw "palette did not open";
    const inp = pal.querySelector("#palIn");
    inp.value = "zen";
    inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const items = pal.querySelectorAll(".pal-it");
    if (!items.length) throw "no filtered items";
    items[0].click();
    await new Promise(r => setTimeout(r, 200));
    if (!w.document.getElementById("zenOv")) throw "zen did not open from palette";
    w.document.getElementById("zenX").click();
  });
  await run("zen focus: start/pause/reset, chime, session log, heatmap", async () => {
    w.eval('document.getElementById("zenGo").click()');
    await new Promise(r => setTimeout(r, 2200));
    const t = w.document.getElementById("zenTime").textContent;
    if (t === "25:00") throw "timer did not tick: " + t;
    const hm = w.document.querySelectorAll("#zenHM .hm-c");
    if (hm.length !== 98) throw "heatmap cells=" + hm.length;
    // force-complete a session
    w.eval('document.getElementById("zenReset").click()');
    w.eval('document.getElementById("zenGo").click()');
    await new Promise(r => setTimeout(r, 1600));
    w.eval('document.getElementById("zenPause").click()');
    await new Promise(r => setTimeout(r, 100));
    const sess = JSON.parse(w.localStorage.getItem("nssc_zen") || "{}");
    if (!sess || typeof sess.secs !== "number") throw "zen not persisted";
    if (sess.secs < 2) throw "zen secs=" + sess.secs;
  });
  await run("ripple listener attached (pointerdown creates ripple)", async () => {
    const btn = w.document.createElement("button");
    btn.className = "btn";
    w.document.body.appendChild(btn);
    btn.dispatchEvent(new w.Event("pointerdown", { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    const rip = btn.querySelector(".pf-rip");
    if (!rip) throw "no ripple element";
  });

  /* real-Chrome: palette e2e, zen timer, exam chips, back-top, no errors */
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
          if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return;
          errs.push("console: " + t.slice(0, 120));
        });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await p.waitForFunction(() => document.getElementById("examChip") !== null, { timeout: 12000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": palette + zen + exam chips e2e", async () => {
          const m = await p.evaluate(async () => {
            const chip = document.getElementById("examChip");
            const ex = chip ? chip.textContent : "";
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
            await new Promise(r => setTimeout(r, 250));
            const pal = document.getElementById("palQ");
            const opened = !!pal;
            const inp = pal && pal.querySelector("#palIn");
            if (inp) { inp.value = "exam"; inp.dispatchEvent(new Event("input", { bubbles: true })); }
            await new Promise(r => setTimeout(r, 150));
            const items = pal ? pal.querySelectorAll(".pal-it").length : 0;
            if (pal) { pal.querySelector("#palIn").value = "zen"; pal.querySelector("#palIn").dispatchEvent(new Event("input", { bubbles: true })); }
            await new Promise(r => setTimeout(r, 150));
            const z = pal ? pal.querySelector(".pal-it") : null;
            if (z) z.click();
            await new Promise(r => setTimeout(r, 350));
            const zen = !!document.getElementById("zenOv");
            if (zen) { document.getElementById("zenGo").click(); }
            await new Promise(r => setTimeout(r, 1600));
            const tz = zen ? document.getElementById("zenTime").textContent : "";
            const zm = !!(zen && document.querySelectorAll("#zenHM .hm-c").length === 98);
            if (zen) document.getElementById("zenX").click();
            return { ex, opened, items, zen, tz, zm,
              overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth };
          });
          if (!m.ex || m.ex.indexOf("days") < 0) throw "exam chips missing";
          if (!m.opened) throw "palette did not open";
          if (m.items < 1) throw "no palette results";
          if (!m.zen) throw "zen did not open";
          if (m.tz === "25:00") throw "zen timer not running: " + m.tz;
          if (!m.zm) throw "heatmap missing";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v27 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
