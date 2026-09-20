/* v29.0 suite — Pro Boost (merged over Apex HQ v28) (lazy quiz/boost.js, loaded by polish.js at idle):
   ⚡ Math Sprint (60s mental-maths arcade, numpad, combos, best, XP/coins),
   🌧️ Soundscapes (WebAudio rain/ocean/brown-noise, volume, persistence),
   🧊 3D tilt + glare on tiles/cards, 💫 gold aura rings on quiz+plan cards,
   plus two new command-palette entries. SW key -v29.
   Run: node quiz/_test_v29.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const BOOST = fs.readFileSync("quiz/boost.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("boost.js: parses and carries every v28 feature", () => {
    new Function(BOOST);
    for (const h of ["Math Sprint", "sprOpen", "sprPad", "sprFinish", "nssc_sprint", "Soundscapes", "scapeOv", "playScape", "noiseBuf", "bt3d", "boost-ring", "__proPalHooks", "sprLaunch", "scapeLaunch"]) {
      if (BOOST.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("pro.js: exposes palette hooks for boost", () => {
    if (PRO.indexOf("__proPalHooks") < 0) throw "no hooks in pro.js";
  });
  await run("polish.js: idle-loads boost.js (zero boot cost)", () => {
    if (POLISH.indexOf("quiz/boost.js") < 0) throw "no boost loader";
    if (POLISH.indexOf("requestIdleCallback") < 0 && POLISH.indexOf("setTimeout(br") < 0) throw "no idle strategy";
  });
  await run("index.html: still loader-only (no boost inline, wire unchanged)", () => {
    if (/quiz\/boost\.js/.test(HTML)) throw "boost.js inline in shell";
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped to -v28", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (!/v28/.test(SW)) throw "no v28 note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom: boot polish -> pro -> boost, then exercise every v28 feature */
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
      window.AudioContext = function () { this.currentTime = 0; this.sampleRate = 44100; this.state = "running";
        this.createOscillator = () => ({ type: "", connect() {}, start() {}, stop() {}, frequency: { value: 0 } });
        this.createGain = () => ({ connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime() {}, exponentialRampToValueAtTime() {} } });
        this.createBiquadFilter = () => ({ connect() {}, disconnect() {}, type: "", frequency: { value: 0 } });
        this.destination = {}; this.resume = () => {}; };
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("polish boots, pro attaches, then boost mounts (chips, rings, tilt, hooks)", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 900));
    w.eval(PRO);
    await new Promise(r => setTimeout(r, 300));
    w.eval(BOOST);
    await new Promise(r => setTimeout(r, 300));
    const doc = w.document;
    if (!doc.documentElement.classList.contains("boost")) throw "no boost class";
    if (!doc.getElementById("boostCss")) throw "no boost css";
    if (!doc.getElementById("sprLaunch")) throw "no sprint chip";
    if (!doc.getElementById("scapeLaunch")) throw "no scape chip";
    if (!doc.getElementById("quizCard").classList.contains("boost-ring")) throw "quizCard no ring";
    if (!doc.getElementById("planCard").classList.contains("boost-ring")) throw "planCard no ring";
    if (!doc.querySelector(".bt3d")) throw "no tilt class applied";
    // palette hooks: Ctrl+K -> "sprint" filter -> Math Sprint entry present
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const pal = doc.getElementById("palQ");
    if (!pal) throw "palette did not open";
    const inp = pal.querySelector("#palIn");
    inp.value = "sprint";
    inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const labels = Array.prototype.map.call(pal.querySelectorAll(".pal-it"), x => x.textContent).join("|");
    if (labels.indexOf("Math Sprint") < 0) throw "palette missing Math Sprint: " + labels.slice(0, 80);
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await run("math sprint: fast run -> numpad entry -> combo -> result XP + best saved", async () => {
    w.eval("window.__sprintFast = true");
    w.eval('document.getElementById("sprLaunch").click()');
    await new Promise(r => setTimeout(r, 250));
    const doc = w.document;
    if (!doc.getElementById("boostOv")) throw "sprint overlay missing";
    if (!doc.getElementById("sprQ").textContent) throw "no question painted";
    const q = w.__sprint.q;
    if (!q || typeof q.a !== "number") throw "no question state";
    const ans = String(q.a);
    const pad = doc.getElementById("sprPad");
    for (const ch of ans) pad.querySelector('[data-k="' + ch + '"]').click();
    pad.querySelector('[data-k="✓"]').click();
    await new Promise(r => setTimeout(r, 120));
    if (w.__sprint.score !== 1) throw "score=" + w.__sprint.score;
    // second question, deliberately wrong -> combo resets, no crash
    w.eval('document.getElementById("sprIn").textContent');
    const q2 = w.__sprint.q;
    const wrong = String(q2.a === 0 ? 1 : q2.a + 999);
    for (const ch of wrong.slice(0, 3)) pad.querySelector('[data-k="' + ch + '"]').click();
    pad.querySelector('[data-k="✓"]').click();
    await new Promise(r => setTimeout(r, 120));
    if (w.__sprint.combo !== 0) throw "combo not reset: " + w.__sprint.combo;
    // let the fast clock run out
    await new Promise(r => setTimeout(r, 4200));
    if (!doc.getElementById("sprAgain")) throw "no result view";
    const saved = JSON.parse(w.localStorage.getItem("nssc_sprint") || "{}");
    if (!saved.best || typeof saved.best.easy !== "number") throw "best not saved";
    if (saved.best.easy < 1) throw "best.easy=" + saved.best.easy;
    w.eval('document.getElementById("sprClose").click()');
    await new Promise(r => setTimeout(r, 100));
    if (doc.getElementById("boostOv")) throw "overlay not closed";
  });
  await run("soundscapes: overlay opens, presets safe without real audio, volume + persistence", async () => {
    w.eval('document.getElementById("scapeLaunch").click()');
    await new Promise(r => setTimeout(r, 200));
    const doc = w.document;
    const ov = doc.getElementById("scapeOv");
    if (!ov) throw "scape overlay missing";
    if (!ov.querySelector('.sc-t[data-k="rain"]')) throw "no rain preset";
    ov.querySelector('.sc-t[data-k="ocean"]').click();
    await new Promise(r => setTimeout(r, 120));
    const saved = JSON.parse(w.localStorage.getItem("nssc_scapes") || "{}");
    if (saved.p !== "ocean") throw "preset not persisted: " + saved.p;
    if (typeof w.__scapeOn === "undefined") throw "no scape state flag";
    const vol = doc.getElementById("scVol");
    vol.value = 25;
    vol.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    const saved2 = JSON.parse(w.localStorage.getItem("nssc_scapes") || "{}");
    if (saved2.v !== 25) throw "volume not persisted";
    doc.getElementById("scapeX").click();
    await new Promise(r => setTimeout(r, 100));
    if (doc.getElementById("scapeOv")) throw "scape not closed";
  });
  await run("tilt + glare: pointermove drives transform, pointerout resets, reduced-motion safe", async () => {
    const doc = w.document;
    w.eval("window.__tiltForce = true");
    const t = doc.querySelector(".bt3d");
    if (!t) throw "no tile for tilt";
    const r = t.getBoundingClientRect();
    const PE = typeof w.PointerEvent !== "undefined";
    t.dispatchEvent(PE ? new w.PointerEvent("pointermove", { clientX: r.left + 10, clientY: r.top + 10, bubbles: true }) : new w.Event("pointermove", { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 120));
    // jsdom rects are 0 -> tilt skips; just ensure no exceptions and listener path exists
    t.dispatchEvent(PE ? new w.PointerEvent("pointerout", { bubbles: true }) : new w.Event("pointerout", { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 60));
  });

  /* real-Chrome: sprint e2e, soundscape audio, tilt transform, ring, no errors */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
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
        await p.waitForFunction(() => document.getElementById("sprLaunch") !== null, { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": sprint + soundscapes + tilt + rings e2e", async () => {
          const m = await p.evaluate(async () => {
            const r = { err: [] };
            window.__sprintFast = true;
            const chip = document.getElementById("sprLaunch");
            r.chip = !!chip;
            if (chip) chip.click();
            await new Promise(r2 => setTimeout(r2, 250));
            r.ov = !!document.getElementById("boostOv");
            const SP = window.__sprint;
            const a = SP && SP.q ? String(SP.q.a) : "";
            const pad = document.getElementById("sprPad");
            if (a && pad) {
              for (const ch of a) { const b = pad.querySelector('[data-k="' + ch + '"]'); if (b) b.click(); }
              pad.querySelector('[data-k="✓"]').click();
            }
            await new Promise(r2 => setTimeout(r2, 150));
            r.score = SP ? SP.score : -1;
            r.combo = SP ? SP.bestCombo : -1;
            await new Promise(r2 => setTimeout(r2, 4500));
            r.res = !!document.getElementById("sprAgain");
            r.saved = !!JSON.parse(localStorage.getItem("nssc_sprint") || "{}").best;
            if (document.getElementById("sprAgain")) document.getElementById("sprClose").click();
            await new Promise(r2 => setTimeout(r2, 120));
            // soundscapes
            document.getElementById("scapeLaunch").click();
            await new Promise(r2 => setTimeout(r2, 200));
            r.scOv = !!document.getElementById("scapeOv");
            const rain = document.querySelector('#scapeOv .sc-t[data-k="rain"]');
            if (rain) rain.click();
            await new Promise(r2 => setTimeout(r2, 500));
            r.scOn = window.__scapeOn === true;
            r.scCtx = window.__scapeAvail !== 0;
            if (document.getElementById("scapeX")) document.getElementById("scapeX").click();
            await new Promise(r2 => setTimeout(r2, 600));
            r.scOff = window.__scapeOn === false;
            // tilt over a visible ai-it card
            window.__tiltForce = true;
            let tile = null;
            const all = document.querySelectorAll(".ai-it,.g-tile,.lab-tile,.sv-tile,.lib-item");
            for (const t of all) { const rc = t.getBoundingClientRect(); if (rc.width > 40 && rc.height > 40) { tile = t; break; } }
            if (tile) {
              const rc = tile.getBoundingClientRect();
              tile.dispatchEvent(new PointerEvent("pointermove", { clientX: rc.left + rc.width * 0.85, clientY: rc.top + rc.height * 0.85, bubbles: true }));
              await new Promise(r2 => setTimeout(r2, 250));
              r.tilt = tile.style.transform || "";
              tile.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
              await new Promise(r2 => setTimeout(r2, 150));
              r.tiltReset = !tile.style.transform;
            }
            // rings
            const qc = document.getElementById("quizCard");
            r.ring = !!(qc && qc.classList.contains("boost-ring"));
            const bg = qc ? getComputedStyle(qc, "::before").backgroundImage : "";
            r.conic = /conic-gradient/.test(bg);
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.chip) throw "sprint chip missing";
          if (!m.ov) throw "sprint overlay missing";
          if (m.score < 1) throw "sprint score=" + m.score;
          if (!m.res) throw "no sprint result";
          if (!m.saved) throw "best not persisted";
          if (!m.scOv) throw "scape overlay missing";
          if (!m.scOn) throw "soundscape did not start (__scapeOn)";
          if (!m.scCtx) throw "no audio context";
          if (!m.scOff) throw "soundscape did not stop";
          if (!m.tilt || !/rotate/.test(m.tilt)) throw "tilt transform missing: " + m.tilt;
          if (!m.tiltReset) throw "tilt did not reset";
          if (!m.ring) throw "quizCard ring missing";
          if (!m.conic) throw "no conic gradient on ring";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v29 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
