/* v34.0 suite — AI Tutor + Scientific Calculator (lazy quiz/ai.js + quiz/calc.js):
   🧮 Scientific Calculator (safe parser: parens, ^, %, !, trig deg/rad, ln,
   log, √, implicit multiplication, Ans/memory, history, keyboard),
   🧠 AI Study Tutor (offline knowledge engine, insights over attempts(),
   BYO Gemini/OpenAI key, palette/chips). SW key -v34.
   Run: node quiz/_test_v34.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const CALC = fs.readFileSync("quiz/calc.js", "utf8");
const AI = fs.readFileSync("quiz/ai.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-9);

(async () => {
  await run("calc.js: parses + carries every calculator feature", () => {
    new Function(CALC);
    for (const h of ["caOv", "ca-pad", "ca-k", "caExp", "caRes", "caHist", "caFlag", "shunting", "toRPN", "evalRPN", "sqrt(", "sin(", "data-k=\"m+\"", "data-k=\"mr\"", "data-k=\"m-\"", "__calcApi"]) {
      if (CALC.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("ai.js: parses + carries every AI feature", () => {
    new Function(AI);
    for (const h of ["AI Study Tutor", "aiChat", "ai-msg", "photosynthesis", "OIL RIG", "Newton", "nssc_ai_key", "generateContent", "api.openai.com", "ai-badge", "analyze", "factFor", "formulaFor", "aiLaunch", "__aiApi"]) {
      if (AI.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("polish.js: idle-loads both v34 modules", () => {
    if (POLISH.indexOf("quiz/calc.js") < 0) throw "no calc loader";
    if (POLISH.indexOf("quiz/ai.js") < 0) throw "no ai loader";
    if (POLISH.indexOf("requestIdleCallback") < 0 && POLISH.indexOf("setTimeout(cr") < 0) throw "no idle";
  });
  await run("index.html: shell untouched (no calc/ai inline, wire unchanged)", () => {
    if (/quiz\/(calc|ai)\.js/.test(HTML)) throw "inline in shell";
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped to -v34", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (!/v34/.test(SW)) throw "no v34 note";
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
      window.fetch = () => Promise.reject(new Error("no net"));
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));

  await run("calculator parser: arithmetic, powers, implicit, functions", () => {
    let api;
    w.eval(CALC);
    api = w.__calcApi;
    const c = (q) => api.compute(q);
    const expect = (q, v) => { const r = c(q); if (r === null || isNaN(r) || !near(r, v)) throw q + " => " + r + " (want " + v + ")"; };
    expect("2+3", 5); expect("2+3*4", 14); expect("(2+3)*4", 20); expect("2^10", 1024);
    expect("2^-2", 0.25); expect("-3^2", -9); expect("5!", 120); expect("50%", 0.5);
    expect("200*10%", 20); expect("sqrt(81)", 9); expect("2pi", 6.283185307179586);
    expect("3(4+1)", 15); expect("(2)(3)", 6); expect("1/3", 0.3333333333333333);
    expect("1+2*3+4", 11); expect("100/4/5", 5); expect("2^2^3", 256);
    api.state.deg = true;
    expect("sin(30)", 0.5); expect("cos(60)", 0.5); expect("tan(45)", 1);
    api.state.deg = false;
    expect("sin(30)", Math.sin(30));
    api.state.deg = true;
    expect("ln(e)", 1); expect("log(100)", 2);
    // errors
    if (!isNaN(c("2+"))) throw "2+ should be error";
    if (!isNaN(c("4/0"))) throw "4/0 should be error (non-finite)";
    if (!isNaN(c("abc"))) throw "abc should be error";
  });
  await run("calculator UI: press flow, history, Ans/memory, keyboard", async () => {
    w.eval('document.getElementById("calcLaunch") ? 0 : 0');
    const api = w.__calcApi;
    api.open();
    await new Promise(r => setTimeout(r, 150));
    const doc = w.document;
    if (!doc.getElementById("caOv")) throw "overlay missing";
    const k = (kk) => Array.prototype.forEach.call(doc.querySelectorAll('.ca-k[data-k="' + kk + '"]'), b => b.click());
    k("AC");
    k("2"); k("+"); k("3"); k("=");
    await new Promise(r => setTimeout(r, 100));
    if (doc.getElementById("caRes").textContent !== "5") throw "2+3 -> " + doc.getElementById("caRes").textContent;
    if (api.state.expr !== "5") throw "expr after = " + api.state.expr;
    // history
    if (!doc.querySelectorAll(".ca-hi").length) throw "no history";
    // Ans reuse
    k("AC"); k("ans"); k("×"); k("2"); k("=");
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("caRes").textContent !== "10") throw "Ans*2 -> " + doc.getElementById("caRes").textContent;
    // memory M+ then MR
    k("AC"); k("7"); k("m+"); k("AC"); k("mr"); k("=");
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("caRes").textContent !== "7") throw "MR -> " + doc.getElementById("caRes").textContent;
    // M- then MR
    k("AC"); k("3"); k("m-"); k("AC"); k("mr"); k("=");
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("caRes").textContent !== "4") throw "M- -> " + doc.getElementById("caRes").textContent;
    // fuñc key inserts paren; pressing ( again is guarded
    k("AC"); k("sin("); k("("); k("3"); k("0"); k(")"); k("=");
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("caRes").textContent !== "0.5") throw "sin(30) -> " + doc.getElementById("caRes").textContent;
    if (api.state.expr !== "0.5") throw "sin expr -> " + api.state.expr;
    // keyboard: Delete clears, then 1 2 Enter
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "1", bubbles: true }));
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "2", bubbles: true }));
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("caRes").textContent !== "12") throw "keyboard -> " + doc.getElementById("caRes").textContent;
    // deg flag toggle
    api.state.deg = true;
    doc.getElementById("caFlag").click();
    await new Promise(r => setTimeout(r, 60));
    if (api.state.deg !== false) throw "deg toggle";
    // Esc closes
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("caOv")) throw "Esc did not close";
  });
  await run("AI tutor: knowledge engine answers (fact, formula, plan, fallback)", () => {
    w.eval(AI);
    const api = w.__aiApi;
    const r1 = api.reply("What is photosynthesis?");
    if (r1.src !== "fact" || r1.text.indexOf("Photosynthesis") < 0 || r1.text.indexOf("chlorophyll") < 0) throw "photosynthesis: " + r1.src;
    const r2 = api.reply("define osmosis");
    if (r2.src !== "fact" || r2.text.indexOf("water") < 0) throw "osmosis";
    const r3 = api.reply("Ohm's law");
    if (r3.src !== "fact" || r3.text.indexOf("V = IR") < 0) throw "ohm";
    const r4 = api.reply("how do i find the quadratic formula");
    if (r4.src !== "fact" || r4.text.indexOf("ax²") < 0 && r4.text.indexOf("b² − 4ac") < 0) throw "quadratic";
    const r5 = api.reply("Plan my revision");
    if (r5.src !== "plan" || r5.text.indexOf("plan") < 0) throw "plan";
    const r6 = api.reply("zzzqqq unknown gibberish");
    if (r6.src !== "fallback") throw "fallback: " + r6.src;
    const r7 = api.reply("Explain the current question");
    if (r7.src !== "explain") throw "explain: " + r7.src;
    if (api.FACTS < 50) throw "facts=" + api.FACTS;
  });
  await run("AI insights: analyze() is deterministic over real shapes", () => {
    const api = w.__aiApi;
    const now = Date.now(), day = 864e5;
    const recs = [
      { subj: "Maths", pct: 40, d: new Date(now - 3 * day).toISOString(), tp: [{ s: "Maths", t: "Algebra", acc: 30, d: new Date(now - 3 * day).toISOString() }] },
      { subj: "Maths", pct: 50, d: new Date(now - 2 * day).toISOString() },
      { subj: "Physics", pct: 80, d: new Date(now - 1 * day).toISOString() },
      { subj: "Biology", pct: 90, d: new Date(now - 1 * day).toISOString() },
      { subj: "Chemistry", pct: 85, d: new Date(now - 1 * day).toISOString(), tp: [{ s: "Chemistry", t: "Mole Concept", acc: 82, d: new Date(now - 30 * day).toISOString() }] }
    ];
    const a = api.analyze(recs);
    if (a.total !== 5) throw "total=" + a.total;
    if (!a.weak || a.weak.s !== "Maths" || a.weak.n !== 2) throw "weak=" + JSON.stringify(a.weak);
    if (!a.strong || a.strong.s !== "Biology") throw "strong=" + JSON.stringify(a.strong);
    if (!a.recs || !a.recs.length) throw "no recs";
    const risk = a.risk.some(r => r.t === "Mole Concept");
    if (!risk) throw "forgetting-risk missing mole";
    const r = api.reply("Plan my revision");
    if (r.text.indexOf("Maths") < 0) throw "plan should use weak subject";
  });
  await run("AI chat UI: ask, library badge, insights tab, key tab, no-net fallback", async () => {
    const api = w.__aiApi;
    api.open("ask");
    await new Promise(r => setTimeout(r, 150));
    const doc = w.document;
    if (!doc.getElementById("aiOv")) throw "overlay missing";
    if (doc.querySelectorAll(".ai-tab").length !== 3) throw "tabs";
    // suggestions
    if (doc.querySelectorAll(".ai-chip").length < 4) throw "chips";
    // ask via input
    doc.getElementById("aiIn").value = "What is photosynthesis?";
    doc.getElementById("aiGo").click();
    await new Promise(r => setTimeout(r, 900));
    const chat = doc.getElementById("aiChat");
    if (chat.textContent.indexOf("Photosynthesis") < 0) throw "no answer: " + chat.textContent.slice(0, 90);
    if (chat.textContent.indexOf("Library") < 0) throw "no library badge";
    // insights tab
    Array.prototype.forEach.call(doc.querySelectorAll(".ai-tab"), t => { if (t.getAttribute("data-t") === "insights") t.click(); });
    await new Promise(r => setTimeout(r, 200));
    if (!/No analysis yet|Overview/.test(doc.getElementById("aiBody").textContent)) throw "insights: " + doc.getElementById("aiBody").textContent.slice(0, 60);
    // key tab renders
    Array.prototype.forEach.call(doc.querySelectorAll(".ai-tab"), t => { if (t.getAttribute("data-t") === "key") t.click(); });
    await new Promise(r => setTimeout(r, 150));
    if (!doc.getElementById("aiKey")) throw "key input missing";
    doc.getElementById("aiX").click();
    await new Promise(r => setTimeout(r, 80));
    if (doc.getElementById("aiOv")) throw "not closed";
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
        await p.waitForFunction(() => document.getElementById("calcLaunch") && document.getElementById("aiLaunch"), { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": calculator + AI tutor e2e", async () => {
          const m = await p.evaluate(async () => {
            const r = { chips: !!(document.getElementById("calcLaunch") && document.getElementById("aiLaunch")) };
            // ---- calculator ----
            document.getElementById("calcLaunch").click();
            await new Promise(r2 => setTimeout(r2, 250));
            r.cOv = !!document.getElementById("caOv");
            const kk = (k) => Array.prototype.forEach.call(document.querySelectorAll('.ca-k[data-k="' + k + '"]'), x => x.click());
            kk("AC"); kk("2"); kk("+"); kk("3"); kk("=");
            await new Promise(r2 => setTimeout(r2, 100));
            r.c5 = document.getElementById("caRes").textContent;
            kk("AC"); kk("sin("); kk("("); kk("3"); kk("0"); kk(")"); kk("=");
            await new Promise(r2 => setTimeout(r2, 100));
            r.sin = document.getElementById("caRes").textContent;
            kk("AC"); kk("sin("); kk("("); kk("6"); kk("0"); kk(")"); kk("=");
            await new Promise(r2 => setTimeout(r2, 100));
            r.sin2 = document.getElementById("caRes").textContent;
            kk("AC"); kk("sqrt("); kk("("); kk("8"); kk("1"); kk(")"); kk("=");
            await new Promise(r2 => setTimeout(r2, 100));
            r.sqrt = document.getElementById("caRes").textContent;
            kk("AC"); kk("5"); kk("!"); kk("=");
            await new Promise(r2 => setTimeout(r2, 100));
            r.fact = document.getElementById("caRes").textContent;
            document.getElementById("caX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.cClosed = !document.getElementById("caOv");
            // ---- AI tutor ----
            document.getElementById("aiLaunch").click();
            await new Promise(r2 => setTimeout(r2, 250));
            r.aOv = !!document.getElementById("aiOv");
            document.getElementById("aiIn").value = "What is photosynthesis?";
            document.getElementById("aiGo").click();
            await new Promise(r2 => setTimeout(r2, 1100));
            const chat = document.getElementById("aiChat");
            r.ans = /Photosynthesis/.test(chat.textContent) && /chlorophyll/.test(chat.textContent);
            r.badge = /Library/.test(chat.textContent);
            // insights tab
            Array.prototype.forEach.call(document.querySelectorAll(".ai-tab"), t => { if (t.getAttribute("data-t") === "insights") t.click(); });
            await new Promise(r2 => setTimeout(r2, 250));
            r.ins = /No analysis yet|Overview/.test(document.getElementById("aiBody").textContent);
            // key tab
            Array.prototype.forEach.call(document.querySelectorAll(".ai-tab"), t => { if (t.getAttribute("data-t") === "key") t.click(); });
            await new Promise(r2 => setTimeout(r2, 200));
            r.key = !!document.getElementById("aiKey");
            document.getElementById("aiX").click();
            await new Promise(r2 => setTimeout(r2, 120));
            r.aClosed = !document.getElementById("aiOv");
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.chips) throw "chips missing";
          if (!m.cOv) throw "calc overlay missing";
          if (m.c5 !== "5") throw "2+3=" + m.c5;
          if (m.sin !== "0.5") throw "sin(30)=" + m.sin;
          if (m.sin2 !== "0.866025403784") throw "sin(60)=" + m.sin2;
          if (m.sqrt !== "9") throw "sqrt(81)=" + m.sqrt;
          if (m.fact !== "120") throw "5!=" + m.fact;
          if (!m.cClosed) throw "calc not closed";
          if (!m.aOv) throw "ai overlay missing";
          if (!m.ans) throw "no photosynthesis answer";
          if (!m.badge) throw "no library badge";
          if (!m.ins) throw "insights failed";
          if (!m.key) throw "key tab failed";
          if (!m.aClosed) throw "ai not closed";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v34 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
