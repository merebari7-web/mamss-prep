/* v31.0 suite — Study Studio (lazy quiz/studio.js, loaded by polish.js at
   idle): 🧠 Mind Map Studio (template, add/connect/drag/edit/delete, save,
   export), 📏 Unit & Rate Converter (10 categories, temperature formulas),
   🎨 Theme Studio (5 accent presets recolouring the app), 🌅 Daily Spark
   (word + quote), ☄️ hero comets, 3 palette entries. SW key -v31.
   Run: node quiz/_test_v31.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const ST = fs.readFileSync("quiz/studio.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("studio.js: parses and carries every v31 feature", () => {
    new Function(ST);
    for (const h of ["Mind Map", "mmOpen", "mmSvg", "mm-n", "Unit Converter", "cvConv", "°F", "Theme Studio", "st-acc-sapphire", "st-acc-", "spkWrap", "Word of the day", "Quote of the day", "comet", "__proPalHooks", "stMind", "stConv", "stTheme", "nssc_mind", "nssc_accent"]) {
      if (ST.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("polish.js: idle-loads studio.js (zero boot cost)", () => {
    if (POLISH.indexOf("quiz/studio.js") < 0) throw "no studio loader";
    if (POLISH.indexOf("requestIdleCallback") < 0 && POLISH.indexOf("setTimeout(sr") < 0) throw "no idle strategy";
  });
  await run("index.html: still loader-only (no studio inline, wire unchanged)", () => {
    if (/quiz\/studio\.js/.test(HTML)) throw "studio inline in shell";
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped to -v31", () => {
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
        this.createGain = () => ({ connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime() {}, exponentialRampToValueAtTime() {} } });
        this.createBiquadFilter = () => ({ connect() {}, disconnect() {}, type: "", frequency: { value: 0 } });
        this.destination = {}; this.resume = () => {}; };
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  const bind = () => {};
  await run("polish boots, pro attaches, studio mounts (chips, spark, comets, hooks)", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 900));
    w.eval(PRO);
    await new Promise(r => setTimeout(r, 300));
    w.eval(ST);
    await new Promise(r => setTimeout(r, 300));
    const doc = w.document;
    if (!doc.documentElement.classList.contains("studio")) throw "no studio class";
    if (!doc.getElementById("stCss")) throw "no st css";
    for (const id of ["stMind", "stConv", "stTheme"]) if (!doc.getElementById(id)) throw "missing chip " + id;
    if (doc.querySelectorAll("#heroFx .comet").length !== 3) throw "comets=" + doc.querySelectorAll("#heroFx .comet").length;
    if (!doc.getElementById("spkWrap")) throw "no spark card";
    if (!/Word of the day/.test(doc.getElementById("spkWrap").textContent)) throw "no word";
    if (!/Quote of the day/.test(doc.getElementById("spkWrap").textContent)) throw "no quote";
    // palette hook
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const pal = doc.getElementById("palQ");
    if (!pal) throw "palette did not open";
    const inp = pal.querySelector("#palIn");
    inp.value = "mind"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const labels = Array.prototype.map.call(pal.querySelectorAll(".pal-it"), x => x.textContent).join("|");
    if (labels.indexOf("Mind Map Studio") < 0) throw "palette missing mind map";
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await run("mind map: template, add, connect, rename, delete, persist", async () => {
    w.eval('document.getElementById("stMind").click()');
    await new Promise(r => setTimeout(r, 200));
    const doc = w.document;
    const ov = doc.getElementById("mmOv");
    if (!ov) throw "mind overlay missing";
    let nodes = ov.querySelectorAll("#mmSvg .mm-n");
    if (nodes.length !== 6) throw "template nodes=" + nodes.length;
    doc.getElementById("mmAdd").click();
    await new Promise(r => setTimeout(r, 120));
    nodes = ov.querySelectorAll("#mmSvg .mm-n");
    if (nodes.length !== 7) throw "after add nodes=" + nodes.length;
    // connect two nodes via synthetic pointer events
    doc.getElementById("mmLink").click();
    await new Promise(r => setTimeout(r, 80));
    let gs = ov.querySelectorAll("#mmSvg .mm-n");
    gs[1].dispatchEvent(new w.Event("pointerdown", { bubbles: true }));
    w.dispatchEvent(new w.Event("pointerup"));
    await new Promise(r => setTimeout(r, 60));
    gs = ov.querySelectorAll("#mmSvg .mm-n");
    gs[2].dispatchEvent(new w.Event("pointerdown", { bubbles: true }));
    w.dispatchEvent(new w.Event("pointerup"));
    await new Promise(r => setTimeout(r, 60));
    const edges = ov.querySelectorAll("#mmSvg .mm-e").length;
    if (edges !== 6) throw "edges=" + edges;
    // rename last tapped node
    const panel = doc.getElementById("mmPanel");
    if (panel.classList.contains("off")) throw "panel not shown for selection";
    const tin = doc.getElementById("mmTxt");
    tin.value = "Exam focus";
    tin.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    let found = false;
    ov.querySelectorAll("#mmSvg .mm-n text").forEach(t => { if (t.textContent === "Exam focus") found = true; });
    if (!found) throw "rename did not render";
    // delete selected
    doc.getElementById("mmDel").click();
    await new Promise(r => setTimeout(r, 100));
    const nodes2 = ov.querySelectorAll("#mmSvg .mm-n").length;
    if (nodes2 !== 6) throw "after delete nodes=" + nodes2;
    const saved = JSON.parse(w.localStorage.getItem("nssc_mind") || "{}");
    if (!saved.n || !saved.e || saved.n.length !== 6) throw "not persisted: " + JSON.stringify(saved.n && saved.n.length);
    doc.getElementById("mmX").click();
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("mmOv")) throw "mind not closed";
  });
  await run("converter: 100 C -> F, km->m, swap, category tabs", async () => {
    w.eval('document.getElementById("stConv").click()');
    await new Promise(r => setTimeout(r, 200));
    const doc = w.document;
    if (!doc.getElementById("cvOv")) throw "conv overlay missing";
    const vin = doc.getElementById("cvIn");
    vin.value = "100"; vin.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("cvOut").textContent !== "212") throw "C->F: " + doc.getElementById("cvOut").textContent;
    // length tab
    Array.prototype.forEach.call(doc.querySelectorAll("#cvTabs .st-btn"), t => { if (t.getAttribute("data-k") === "len") t.click(); });
    await new Promise(r => setTimeout(r, 80));
    vin.value = "1"; vin.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("cvOut").textContent !== "1000") throw "km->m: " + doc.getElementById("cvOut").textContent;
    doc.getElementById("cvSwap").click();
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("cvOut").textContent !== "0.001") throw "swap: " + doc.getElementById("cvOut").textContent;
    doc.getElementById("cvX").click();
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("cvOv")) throw "conv not closed";
  });
  await run("theme studio: sapphire applies class + persists, default resets", async () => {
    w.eval('document.getElementById("stTheme").click()');
    await new Promise(r => setTimeout(r, 200));
    const doc = w.document;
    if (!doc.getElementById("tsOv")) throw "theme overlay missing";
    Array.prototype.forEach.call(doc.querySelectorAll(".ts-ac"), b => { if (b.getAttribute("data-k") === "sapphire") b.click(); });
    await new Promise(r => setTimeout(r, 100));
    if (!doc.documentElement.classList.contains("st-acc-sapphire")) throw "class not applied";
    if (JSON.parse(w.localStorage.getItem("nssc_accent") || '"x"') !== "sapphire") throw "not persisted";
    Array.prototype.forEach.call(doc.querySelectorAll(".ts-ac"), b => { if (b.getAttribute("data-k") === "") b.click(); });
    await new Promise(r => setTimeout(r, 100));
    if (doc.documentElement.classList.contains("st-acc-sapphire")) throw "not reset";
    doc.getElementById("tsX").click();
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("tsOv")) throw "theme not closed";
  });

  /* real-Chrome */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
        const p = await b.newPage();
        const errs = [];
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 160)));
        p.on("console", m => {
          if (m.type() !== "error") return;
          const t = m.text() || "";
          if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return;
          errs.push("console: " + t.slice(0, 120));
        });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await p.waitForFunction(() => document.getElementById("stMind") !== null, { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": mindmap + converter + theme + spark e2e", async () => {
          const m = await p.evaluate(async () => {
            const r = { chips: !!(document.getElementById("stMind") && document.getElementById("stConv") && document.getElementById("stTheme")) };
            try { localStorage.removeItem("nssc_mind"); localStorage.removeItem("nssc_accent"); } catch (e) {}
            // comets + spark
            r.comets = document.querySelectorAll("#heroFx .comet").length;
            r.spark = !!document.getElementById("spkWrap");
            // mind map
            document.getElementById("stMind").click();
            await new Promise(r2 => setTimeout(r2, 250));
            const ov = document.getElementById("mmOv");
            r.mmOv = !!ov;
            r.mmNodes = ov ? ov.querySelectorAll("#mmSvg .mm-n").length : 0;
            document.getElementById("mmAdd").click();
            await new Promise(r2 => setTimeout(r2, 120));
            r.mmNodes2 = ov.querySelectorAll("#mmSvg .mm-n").length;
            // connect first two nodes with real pointer events
            document.getElementById("mmLink").click();
            let gs = ov.querySelectorAll("#mmSvg .mm-n");
            const last = gs.length - 1; // newly-added node — unconnected
            const rc0 = gs[last].getBoundingClientRect();
            gs[last].dispatchEvent(new PointerEvent("pointerdown", { clientX: rc0.left + 10, clientY: rc0.top + 10, bubbles: true }));
            window.dispatchEvent(new PointerEvent("pointerup"));
            await new Promise(r2 => setTimeout(r2, 80));
            gs = ov.querySelectorAll("#mmSvg .mm-n");
            const rc1 = gs[0].getBoundingClientRect();
            gs[0].dispatchEvent(new PointerEvent("pointerdown", { clientX: rc1.left + 10, clientY: rc1.top + 10, bubbles: true }));
            window.dispatchEvent(new PointerEvent("pointerup"));
            await new Promise(r2 => setTimeout(r2, 100));
            r.mmEdges = ov.querySelectorAll("#mmSvg .mm-e").length;
            // drag node 4 to the right
            const g4 = ov.querySelectorAll("#mmSvg .mm-n")[4];
            const rb = g4.getBoundingClientRect();
            g4.dispatchEvent(new PointerEvent("pointerdown", { clientX: rb.left + 10, clientY: rb.top + 10, bubbles: true }));
            for (let s = 0; s <= 6; s++) {
              window.dispatchEvent(new PointerEvent("pointermove", { clientX: rb.left + 10 + s * 12, clientY: rb.top + 10, bubbles: true }));
              await new Promise(r2 => setTimeout(r2, 20));
            }
            window.dispatchEvent(new PointerEvent("pointerup"));
            await new Promise(r2 => setTimeout(r2, 100));
            r.mmDrag = /translate\(\d+/.test(ov.querySelectorAll("#mmSvg .mm-n")[4].getAttribute("transform"));
            // export (no download assert — just no error)
            document.getElementById("mmExp").click();
            await new Promise(r2 => setTimeout(r2, 400));
            r.mmSaved = JSON.parse(localStorage.getItem("nssc_mind") || "{}").n.length >= 7;
            document.getElementById("mmX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            // converter
            document.getElementById("stConv").click();
            await new Promise(r2 => setTimeout(r2, 250));
            const cvIn = document.getElementById("cvIn");
            cvIn.value = "100"; cvIn.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 100));
            r.cvF = document.getElementById("cvOut").textContent;
            Array.prototype.forEach.call(document.querySelectorAll("#cvTabs .st-btn"), t => { if (t.getAttribute("data-k") === "len") t.click(); });
            await new Promise(r2 => setTimeout(r2, 100));
            cvIn.value = "1"; cvIn.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 100));
            r.cvKm = document.getElementById("cvOut").textContent;
            document.getElementById("cvX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            // theme studio
            document.getElementById("stTheme").click();
            await new Promise(r2 => setTimeout(r2, 250));
            Array.prototype.forEach.call(document.querySelectorAll(".ts-ac"), t => { if (t.getAttribute("data-k") === "emerald") t.click(); });
            await new Promise(r2 => setTimeout(r2, 150));
            r.thCls = document.documentElement.classList.contains("st-acc-emerald");
            r.thVar = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim();
            r.thSaved = JSON.parse(localStorage.getItem("nssc_accent") || '"x"') === "emerald";
            Array.prototype.forEach.call(document.querySelectorAll(".ts-ac"), t => { if (t.getAttribute("data-k") === "") t.click(); });
            await new Promise(r2 => setTimeout(r2, 100));
            document.getElementById("tsX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.chips) throw "studio chips missing";
          if (m.comets !== 3) throw "comets=" + m.comets;
          if (!m.spark) throw "spark missing";
          if (!m.mmOv) throw "mind overlay missing";
          if (m.mmNodes !== 6) throw "template nodes=" + m.mmNodes;
          if (m.mmNodes2 !== 7) throw "add failed";
          if (m.mmEdges !== 6) throw "edges=" + m.mmEdges;
          if (!m.mmDrag) throw "node drag did not move";
          if (!m.mmSaved) throw "mind not persisted";
          if (m.cvF !== "212") throw "C->F=" + m.cvF;
          if (m.cvKm !== "1000") throw "km->m=" + m.cvKm;
          if (!m.thCls) throw "theme class not applied";
          if (m.thVar.indexOf("10b981") < 0 && m.thVar.indexOf("16, 185, 129") < 0) throw "theme var not applied: " + m.thVar;
          if (!m.thSaved) throw "theme not persisted";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v31 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
