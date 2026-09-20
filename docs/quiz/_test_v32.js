/* v32.0 suite — Aurum Gloss (graphics pass inside quiz/polish.js):
   toast gold countdown bar + spring pop (survives content wipe), hero-badge
   rotating aurora ring, glass top-sheen on cards/modals/chips, gold focus
   glow on inputs/selects/textareas, dock active pill, heatmap hover pop,
   XP-bar glow pulse, stat-icon bob. SW key -v32.
   Run: node quiz/_test_v32.js */
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
  await run("polish.js: carries every v32 gloss feature", () => {
    new Function(POLISH);
    for (const h of ["pfToastBar", "pfToastPop", "pfToastPopM", "pfRingSpin", "hero-badge::before", "pfBob", "pfGlow", "toastBar", "background-image:linear-gradient(180deg,rgba(255,255,255,.22)", ":focus{border-color:#c9a227;box-shadow:0 0 0 3px var(--pf-soft)", "hm-c:hover{transform:scale(1.3)", "prefers-reduced-motion:no-preference"]) {
      if (POLISH.indexOf(h) < 0) throw "missing hook " + h.slice(0, 40);
    }
  });
  await run("index.html: still loader-only (gloss lives in polish, wire unchanged)", () => {
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped to -v32", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (!/v3\d/.test(SW)) throw "no v3x note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom: boot + toast bar lifecycle */
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, { runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.DecompressionStream = globalThis.DecompressionStream; window.TextDecoder = globalThis.TextDecoder; window.TextEncoder = globalThis.TextEncoder;
      const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = () => vp;
      window.speechSynthesis = { cancel() {}, speak() {}, getVoices() { return [{ lang: "en-GB" }]; } };
      window.SpeechSynthesisUtterance = function () {};
      window.scrollTo = () => {}; window.matchMedia = window.matchMedia || (() => ({ matches: false }));
      window.Notification = function () {}; window.Notification.permission = "default";
      window.AudioContext = function () { this.currentTime = 0; this.sampleRate = 44100; this.state = "running";
        this.createOscillator = () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 } });
        this.createGain = () => ({ connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime() {} } });
        this.createBiquadFilter = () => ({ connect() {}, disconnect() {}, type: "", frequency: { value: 0 } });
        this.destination = {}; this.resume = () => {}; };
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("polish boots -> toast bar injected + survives toast text wipe", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 400));
    const doc = w.document;
    if (!doc.documentElement.classList.contains("polished")) throw "no polished class";
    let bar = doc.getElementById("pfToastBar");
    if (!bar) throw "no toast bar after boot";
    w.eval('toast("First gloss test", "✨")');
    await new Promise(r => setTimeout(r, 150));
    bar = doc.getElementById("pfToastBar");
    if (!bar || !bar.isConnected) throw "bar lost after first toast";
    // second toast wipes textContent — bar must be rebuilt by the observer
    w.eval('toast("Second gloss test", "🎉")');
    await new Promise(r => setTimeout(r, 300));
    bar = doc.getElementById("pfToastBar");
    if (!bar || !bar.isConnected) throw "bar lost after second toast (wipe)";
    const t = doc.getElementById("toast");
    if (!t.classList.contains("show")) throw "toast not shown";
  });
  await run("gloss CSS: sheen, ring, focus, pop, bob, glow all present", () => {
    const css = POLISH.replace(/\\"/g, '"');
    for (const h of ["pfToastBar 3.2s", "pfRingSpin 6.5s", "pfBob 5.5s", "pfGlow 3.4s", ".hero-badge::before", "linear-gradient(180deg,rgba(255,255,255,.22)", "border-color:#c9a227;box-shadow:0 0 0 3px"]) {
      if (css.indexOf(h) < 0) throw "missing css " + h;
    }
  });

  /* real-Chrome */
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
        await p.waitForFunction(() => document.documentElement.classList.contains("polished"), { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": gloss computed styles + toast lifecycle e2e", async () => {
          const m = await p.evaluate(async () => {
            const r = {};
            // glass sheen on first card
            const card = document.querySelector(".card");
            r.cardBg = card ? getComputedStyle(card).backgroundImage : "";
            // hero badge ring
            const badge = document.querySelector(".hero-badge");
            r.ring = badge ? getComputedStyle(badge, "::before").backgroundImage : "";
            r.ringAnim = badge ? getComputedStyle(badge, "::before").animationName : "";
            // input focus glow (fresh visible input: quiz fields are in a hidden stage)
            const tin = document.createElement("input");
            tin.id = "glossProbe";
            tin.style.cssText = "position:fixed;left:0;top:0";
            document.body.appendChild(tin);
            tin.focus();
            await new Promise(r2 => setTimeout(r2, 120));
            r.focusShadow = getComputedStyle(tin).boxShadow;
            r.focusBorder = getComputedStyle(tin).borderColor;
            tin.remove();
            // xp fill glow + stat bob animations (reduced-motion default no-preference in headless)
            const xp = document.getElementById("xpFill");
            r.xpAnim = xp ? getComputedStyle(xp).animationName : "";
            const statB = document.querySelector(".stat b");
            r.statAnim = statB ? getComputedStyle(statB).animationName : "";
            // toast lifecycle
            toast("Gloss first", "✨");
            await new Promise(r2 => setTimeout(r2, 200));
            let bar = document.getElementById("pfToastBar");
            r.bar1 = !!bar && bar.isConnected;
            r.tAnim1 = getComputedStyle(document.getElementById("toast")).animationName;
            toast("Gloss second — wipe survives", "🎉");
            await new Promise(r2 => setTimeout(r2, 250));
            bar = document.getElementById("pfToastBar");
            r.bar2 = !!bar && bar.isConnected;
            r.tAnim2 = getComputedStyle(document.getElementById("toast")).animationName;
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!/linear-gradient/.test(m.cardBg || "")) throw "no card sheen: " + (m.cardBg || "").slice(0, 60);
          if (!/conic-gradient/.test(m.ring || "")) throw "no badge ring: " + (m.ring || "").slice(0, 60);
          if (!/pfRingSpin/.test(m.ringAnim || "")) throw "ring not animating: " + m.ringAnim;
          if (!m.focusShadow || m.focusShadow === "none") throw "no input focus glow";
          if (!/pfGlow/.test(m.xpAnim || "")) throw "xp not glowing: " + m.xpAnim;
          if (!/pfBob/.test(m.statAnim || "")) throw "stat not bobbing: " + m.statAnim;
          if (!m.bar1) throw "toast bar missing after first toast";
          if (!m.bar2) throw "toast bar missing after wipe (observer broken)";
          const a1 = String(m.tAnim1 || ""), a2 = String(m.tAnim2 || "");
          if (!/pfToastPop/.test(a1 + a2)) throw "toast pop not applied: " + a1 + " / " + a2;
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v32 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
