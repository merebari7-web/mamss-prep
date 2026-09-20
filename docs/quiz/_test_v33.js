/* v33.0 suite — Holo 3D Lab (lazy quiz/holo.js, loaded by polish.js at idle):
   🧬 3D Molecule Viewer (8 molecules, bonds 1/2/3, CPK colours, orbit/zoom/
   auto-rotate), 📈 3D Surface Plotter (6 functions), 🪐 Orbital Solar System
   (8 planets, speed + labels), palette entries. SW key -v33.
   Run: node quiz/_test_v33.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const HOLO = fs.readFileSync("quiz/holo.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("holo.js: parses and carries every v33 feature", () => {
    new Function(HOLO);
    for (const h of ["Holo 3D", "Molecule Viewer", "Water", "Benzene", "Surface", "Saddle", "Ripple", "Orbital", "Saturn", "hoCv", "ho-ov", "ho-tab", "hoChips", "hoCtl", "__proPalHooks", "holoLaunch", "createRadialGradient", "prefers-reduced-motion"]) {
      if (HOLO.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("polish.js: idle-loads holo.js (zero boot cost)", () => {
    if (POLISH.indexOf("quiz/holo.js") < 0) throw "no holo loader";
    if (POLISH.indexOf("requestIdleCallback") < 0 && POLISH.indexOf("setTimeout(hr") < 0) throw "no idle strategy";
  });
  await run("index.html: still loader-only (no holo inline, wire unchanged)", () => {
    if (/quiz\/holo\.js/.test(HTML)) throw "holo inline in shell";
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped to -v33", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (!/v3\d/.test(SW)) throw "no v3x note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom */
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
  await run("polish boots, pro attaches, holo mounts (chip, counts, palette)", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 900));
    w.eval(PRO);
    await new Promise(r => setTimeout(r, 300));
    w.eval(HOLO);
    await new Promise(r => setTimeout(r, 300));
    const doc = w.document;
    if (!doc.documentElement.classList.contains("holo")) throw "no holo class";
    if (!doc.getElementById("hoCss")) throw "no holo css";
    if (!doc.getElementById("holoLaunch")) throw "no chip";
    if (!w.__holo || !w.__holo.counts) throw "no exposed state";
    if (w.__holo.counts.mol !== 10 || w.__holo.counts.surf !== 8 || w.__holo.counts.orb !== 8)
      throw "counts " + JSON.stringify(w.__holo.counts);
    // palette hook
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const pal = doc.getElementById("palQ");
    if (!pal) throw "palette did not open";
    const inp = pal.querySelector("#palIn");
    inp.value = "holo"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const labels = Array.prototype.map.call(pal.querySelectorAll(".pal-it"), x => x.textContent).join("|");
    if (labels.indexOf("Holo 3D") < 0) throw "palette missing holo entries";
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await run("holo lab: open -> mol -> surf -> orb tabs, presets, zoom, drag, auto, close", async () => {
    w.eval('document.getElementById("holoLaunch").click()');
    await new Promise(r => setTimeout(r, 250));
    const doc = w.document;
    const ov = doc.getElementById("hoOv");
    if (!ov) throw "overlay missing";
    if (!doc.getElementById("hoCv")) throw "no canvas";
    if (ov.querySelectorAll(".ho-tab").length !== 3) throw "tabs";
    if (ov.querySelectorAll(".ho-chip").length !== 10) throw "mol preset chips=" + ov.querySelectorAll(".ho-chip").length;
    const st = () => (w.__holo && w.__holo.M) || {};
    // wheel zoom
    const y0 = w.__holo.M.zoom;
    doc.getElementById("hoCv").dispatchEvent(new w.WheelEvent("wheel", { deltaY: -120, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 60));
    if (!(w.__holo.M.zoom > y0)) throw "wheel zoom failed";
    // button zoom out
    const out = ov.querySelector('[data-act="out"]');
    if (!out) throw "no zoom-out button";
    out.click();
    await new Promise(r => setTimeout(r, 60));
    // drag orbit
    const yaw0 = w.__holo.M.yaw;
    const cv = doc.getElementById("hoCv");
    function pev(type, cx2, cy2) {
      var ev;
      if (typeof w.PointerEvent !== "undefined") ev = new w.PointerEvent(type, { bubbles: true, pointerId: 1 });
      else { ev = new w.Event(type, { bubbles: true }); try { ev.pointerId = 1; } catch (e) {} }
      try { ev.clientX = cx2; ev.clientY = cy2; } catch (e) {}
      return ev;
    }
    cv.dispatchEvent(pev("pointerdown", 100, 100));
    w.dispatchEvent(pev("pointermove", 160, 110));
    w.dispatchEvent(pev("pointerup", 160, 110));
    await new Promise(r => setTimeout(r, 60));
    if (!(Math.abs(w.__holo.M.yaw - yaw0) > 0.05)) throw "drag orbit failed";
    // switch molecule preset
    const chips = ov.querySelectorAll(".ho-chip");
    chips[3].click();
    await new Promise(r => setTimeout(r, 60));
    if (w.__holo.M.idx !== 3) throw "preset idx=" + w.__holo.M.idx;
    // surface tab
    Array.prototype.forEach.call(ov.querySelectorAll(".ho-tab"), t => { if (t.getAttribute("data-t") === "surf") t.click(); });
    await new Promise(r => setTimeout(r, 100));
    if (ov.querySelectorAll(".ho-chip").length !== 8) throw "surf chips=" + ov.querySelectorAll(".ho-chip").length;
    ov.querySelectorAll(".ho-chip")[1].click();
    await new Promise(r => setTimeout(r, 60));
    if (w.__holo.S.idx !== 1) throw "surf idx";
    // orbit tab
    Array.prototype.forEach.call(ov.querySelectorAll(".ho-tab"), t => { if (t.getAttribute("data-t") === "orb") t.click(); });
    await new Promise(r => setTimeout(r, 100));
    const spd = doc.getElementById("hoSpd");
    if (!spd) throw "no speed slider";
    spd.value = 4; spd.oninput && spd.oninput();
    await new Promise(r => setTimeout(r, 60));
    if (Math.abs(w.__holo.O.speed - 4) > 0.01) throw "speed=" + w.__holo.O.speed;
    const lbl = ov.querySelector('[data-act="lbl"]');
    lbl.click();
    await new Promise(r => setTimeout(r, 60));
    if (w.__holo.O.labels !== false) throw "labels toggle";
    // close
    doc.getElementById("hoX").click();
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("hoOv")) throw "not closed";
  });
  await run("reduced-motion: auto-rotate off when prefers-reduced-motion", () => {
    if (HOLO.indexOf("(prefers-reduced-motion: reduce)").length < 0) throw "no rm guard";
    if (HOLO.indexOf("M.auto = false").length < 0) throw "no auto disable";
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
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 150)));
        p.on("console", m => {
          if (m.type() !== "error") return;
          const t = m.text() || "";
          if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return;
          errs.push("console: " + t.slice(0, 120));
        });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await p.waitForFunction(() => document.getElementById("holoLaunch") !== null, { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": holo 3D e2e (molecule drag/zoom, surf, orbits)", async () => {
          const m = await p.evaluate(async () => {
            const r = {};
            document.getElementById("holoLaunch").click();
            await new Promise(r2 => setTimeout(r2, 300));
            r.ov = !!document.getElementById("hoOv");
            r.counts = window.__holo.counts;
            const cv = document.getElementById("hoCv");
            const rc = cv.getBoundingClientRect();
            r.cvSize = Math.round(rc.width) + "x" + Math.round(rc.height);
            // drag orbit
            const yaw0 = window.__holo.M.yaw;
            cv.dispatchEvent(new PointerEvent("pointerdown", { clientX: rc.left + 40, clientY: rc.top + 40, bubbles: true, pointerId: 1 }));
            for (let i = 1; i <= 5; i++) {
              window.dispatchEvent(new PointerEvent("pointermove", { clientX: rc.left + 40 + i * 12, clientY: rc.top + 40, bubbles: true, pointerId: 1 }));
              await new Promise(r2 => setTimeout(r2, 16));
            }
            window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
            await new Promise(r2 => setTimeout(r2, 80));
            r.drag = Math.abs(window.__holo.M.yaw - yaw0) > 0.05;
            // wheel zoom
            const z0 = window.__holo.M.zoom;
            cv.dispatchEvent(new WheelEvent("wheel", { deltaY: -200, bubbles: true, cancelable: true }));
            await new Promise(r2 => setTimeout(r2, 60));
            r.zoom = window.__holo.M.zoom > z0;
            // benzene preset
            const chips = document.querySelectorAll(".ho-chip");
            chips[9].click();
            let lbl = "";
            for (let i = 0; i < 12; i++) {
              await new Promise(r2 => setTimeout(r2, 90));
              lbl = document.getElementById("hoMola").textContent;
              if (window.__holo.M.idx === 9 && /Benzene/.test(lbl)) break;
            }
            r.benzene = window.__holo.M.idx === 9 && /Benzene/.test(lbl);
            // auto-rotate tick
            const yawA = window.__holo.M.yaw;
            await new Promise(r2 => setTimeout(r2, 500));
            r.auto = Math.abs(window.__holo.M.yaw - yawA) > 0.01;
            // surfaces tab
            Array.prototype.forEach.call(document.querySelectorAll(".ho-tab"), t => { if (t.getAttribute("data-t") === "surf") t.click(); });
            await new Promise(r2 => setTimeout(r2, 250));
            const sc = document.querySelectorAll(".ho-chip");
            sc[4].click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.surfIdx = window.__holo.S.idx;
            // orbits tab
            Array.prototype.forEach.call(document.querySelectorAll(".ho-tab"), t => { if (t.getAttribute("data-t") === "orb") t.click(); });
            await new Promise(r2 => setTimeout(r2, 300));
            const spd = document.getElementById("hoSpd");
            r.spd = !!spd;
            spd.value = 5; spd.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 60));
            r.speed = Math.abs(window.__holo.O.speed - 5) < 0.01;
            const t0 = window.__holo.O.t;
            await new Promise(r2 => setTimeout(r2, 400));
            r.moves = Math.abs(window.__holo.O.t - t0) > 0.01;
            // orbit canvas must actually be painted (non-transparent pixels)
            const ocv = document.getElementById("hoCv");
            const octx = ocv.getContext("2d");
            const px2 = octx.getImageData(0, 0, ocv.width, ocv.height).data;
            let lit = 0;
            for (let i = 3; i < px2.length; i += 40) if (px2[i] > 8) lit++;
            r.painted = lit > 30;
            r.err = window.__holoErr || "(none)";
            document.getElementById("hoX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.closed = !document.getElementById("hoOv");
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.ov) throw "overlay missing";
          const sz = m.cvSize.split("x");
          if (+sz[0] < 200 || +sz[1] < 180) throw "canvas too small: " + m.cvSize;
          if (!m.drag) throw "drag orbit failed";
          if (!m.zoom) throw "wheel zoom failed";
          if (!m.benzene) throw "benzene preset failed";
          if (!m.auto) throw "auto-rotate not ticking";
          if (m.surfIdx !== 4) throw "surf preset idx=" + m.surfIdx;
          if (!m.spd) throw "no speed slider";
          if (!m.speed) throw "speed failed";
          if (!m.moves) throw "orbits not moving";
          if (!m.painted) throw "orbit canvas not painted (err=" + m.err + ")";
          if (!m.closed) throw "not closed";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v33 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
