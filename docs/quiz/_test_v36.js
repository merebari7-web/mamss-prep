/* v36.0 suite — Curriculum Atlas + AI curriculum brain + Atlas Shine.
   Run: node quiz/_test_v36.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const AI = fs.readFileSync("quiz/ai.js", "utf8");
const ATLAS = fs.readFileSync("quiz/atlas.js", "utf8");
const CURIC = fs.readFileSync("quiz/curriculum.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

(async () => {
  await run("atlas.js: parses + carries the Atlas feature set", () => {
    new Function(ATLAS);
    for (const h of ["__atlasApi", "atlasLaunch", "drillTopic", "tagAll", "window.CURR", "window.SYLL", "__proPalHooks", "navigator.share", "prefers-reduced-motion", "atOv", "version: 36", "surprise", "askAI", "Scheme of work", "quizbank-updated"]) {
      if (ATLAS.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("ai.js: curriculum brain present + runs after facts/formulas", () => {
    new Function(AI);
    for (const h of ["currFor", 'src: "curriculum"', "window.CURR", "Self-test", "Curriculum Atlas to drill"]) {
      if (AI.indexOf(h) < 0) throw "missing " + h;
    }
    const fi = AI.indexOf("formulaFor(q)"), ci = AI.indexOf("currFor(q)");
    if (fi < 0 || ci < 0 || ci < fi) throw "pipeline order wrong";
    if (AI.indexOf("curr: currFor") < 0) throw "curr not exposed";
  });
  await run("polish.js: loads atlas at idle + v36 shine (chip glow, nav shadow)", () => {
    new Function(POLISH);
    for (const h of ["quiz/atlas.js", "atlasScript", "pf-scrolled", "navShadow", "__pfNav", "bt-chip:hover", "timeout: 10500"]) {
      if (POLISH.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("sw.js: -v36 + atlas note; live list + sitemap refreshed", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not versioned";
    if (SW.indexOf("quiz/atlas.js") < 0) throw "sw note missing";
    const vl = fs.readFileSync("quiz/_verify_live.js", "utf8");
    if (vl.indexOf("quiz/atlas.js") < 0) throw "_verify_live missing atlas";
    const sm = fs.readFileSync("sitemap.xml", "utf8");
    if (sm.indexOf("2026-09-10") < 0) throw "sitemap lastmod stale";
  });
  await run("boot wire still <= 266240 B (index.html untouched by v36)", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* -------- jsdom full app -------- */
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
  w.eval(CURIC);
  await new Promise(r => setTimeout(r, 900));
  w.eval(AI);
  await run("AI curriculum brain: answers from CURR, v34 behaviour preserved", () => {
    const api = w.__aiApi;
    if (!api || typeof api.curr !== "function") throw "no api.curr";
    const r1 = api.reply("Tell me about Nok terracotta");
    if (r1.src !== "curriculum") throw "nok: " + r1.src;
    if (r1.text.indexOf("terracotta") < 0 || r1.text.indexOf("Self-test") < 0 || r1.text.indexOf("Atlas") < 0) throw "nok body";
    const r2 = api.reply("insurance pool");
    if (r2.src !== "curriculum" || r2.title.indexOf("Insurance") < 0) throw "insurance: " + r2.src;
    const r3 = api.reply("What is photosynthesis?");
    if (r3.src !== "fact") throw "fact regression: " + r3.src;
    const r4 = api.reply("zzzqqq unknown gibberish");
    if (r4.src !== "fallback") throw "fallback regression: " + r4.src;
    if (api.FACTS < 50) throw "facts=" + api.FACTS;
  });
  w.eval(ATLAS);
  await new Promise(r => setTimeout(r, 600));
  await run("atlas data: 27 subjects, counts, one-shot tagging (267, zero untagged)", () => {
    const A = w.__atlasApi;
    if (!A || A.version !== 36) throw "no __atlasApi v36";
    if (A.subjects().length !== 27) throw "subjects=" + A.subjects().length;
    if (A.topics("History").length !== 4) throw "History topics";
    if (!A.syll("History") || A.syll("History").length !== 9) throw "History SYLL";
    if (A.counts().tot !== 4167) throw "total=" + A.counts().tot;
    if (A.tagged() !== 267) throw "tagged=" + A.tagged() + " (want 267)";
    const un = w.eval("CLASSES.reduce((a,c)=>a+c.questions.filter(q=>!q.t).length,0)");
    if (un !== 0) throw "untagged=" + un;
    if (!Array.isArray(w.__proPalHooks) || !w.__proPalHooks.some(f => String(f).indexOf("Atlas") >= 0)) throw "palette hook missing";
  });
  await run("atlas UI (jsdom): grid, search, detail, scheme, share, close", () => {
    const A = w.__atlasApi, doc = w.document;
    A.open();
    if (!doc.getElementById("atOv")) throw "overlay missing";
    if (doc.querySelectorAll(".at-subj").length !== 27) throw "cards=" + doc.querySelectorAll(".at-subj").length;
    if (!doc.getElementById("atShare")) throw "share btn missing";
    const inp = doc.getElementById("atSearch");
    inp.value = "music"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    if (doc.querySelectorAll(".at-subj").length !== 1) throw "search music -> " + doc.querySelectorAll(".at-subj").length;
    inp.value = "zzzqqq"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    if (doc.querySelectorAll(".at-subj").length !== 0) throw "empty search should hide all";
    inp.value = ""; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    const hist = Array.prototype.find.call(doc.querySelectorAll(".at-subj"), b => /History/.test(b.textContent));
    if (!hist) throw "History card missing";
    hist.click();
    if (doc.querySelectorAll(".at-topic").length !== 4) throw "detail topics=" + doc.querySelectorAll(".at-topic").length;
    if (doc.querySelectorAll(".at-term").length !== 3) throw "terms=" + doc.querySelectorAll(".at-term").length;
    if (!doc.getElementById("atPractice")) throw "practice btn missing";
    if (doc.querySelectorAll("[data-dr]").length !== 4 || doc.querySelectorAll("[data-ai]").length !== 4) throw "drill/ai buttons";
    doc.getElementById("atBack").click();
    if (doc.querySelectorAll(".at-subj").length !== 27) throw "back to grid failed";
    const sh = A.share("History");
    if (sh !== "copy" && sh !== "share") throw "share=" + sh;
    A.close();
    if (doc.getElementById("atOv")) throw "close failed";
  });
  await run("atlas drills (jsdom): topic drill + subject paper start real papers", () => {
    const A = w.__atlasApi;
    if (!A.drill("Ancient Nigeria & Early States", "History")) throw "topic drill refused";
    const st = w.eval("({n: state.quiz.length, subj: state.subject, cls: state.cls})");
    if (!(st.n >= 1) || st.subj !== "History") throw "topic paper: " + JSON.stringify(st);
    if (!A.drillSubject("Music")) throw "subject drill refused";
    const st2 = w.eval("({n: state.quiz.length, subj: state.subject})");
    if (!(st2.n >= 1) || st2.subj !== "Music") throw "subject paper: " + JSON.stringify(st2);
    if (!A.surprise()) throw "surprise refused";
    const st3 = w.eval("state.quiz.length");
    if (!(st3 >= 1)) throw "surprise paper empty";
  });

  /* -------- real Chrome -------- */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
        const p = await b.newPage();
        const errs = [];
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 150)));
        p.on("console", m => { if (m.type() !== "error") return; const t = m.text() || ""; if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return; errs.push("console: " + t.slice(0, 120)); });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => window.__atlasApi && window.__curicApi && window.__aiApi, { timeout: 35000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 800));
        await run("chrome " + v.w + ": atlas idle-loads, grid/search/detail/drill/share, AI curriculum, nav shadow", async () => {
          const m = await p.evaluate(async () => {
            const r = {};
            r.api = !!(window.__atlasApi && window.__curicApi && window.__aiApi);
            if (!r.api) return r;
            r.subjects = window.__atlasApi.subjects().length;
            r.tagged = window.__atlasApi.tagged();
            /* open via launcher chip */
            const chip = document.getElementById("atlasLaunch");
            r.chip = !!chip;
            if (chip) chip.click();
            await new Promise(r2 => setTimeout(r2, 400));
            r.open = !!document.getElementById("atOv");
            r.cards = document.querySelectorAll(".at-subj").length;
            /* search */
            const inp = document.getElementById("atSearch");
            inp.value = "marketing";
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 200));
            r.search = document.querySelectorAll(".at-subj").length;
            r.searchHasMkt = Array.prototype.some.call(document.querySelectorAll(".at-subj"), c => /Marketing/.test(c.textContent));
            inp.value = "talking drum";
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 200));
            r.searchDrum = document.querySelectorAll(".at-subj").length;
            inp.value = "";
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 200));
            /* history detail */
            const cards = document.querySelectorAll(".at-subj");
            let h = null;
            Array.prototype.forEach.call(cards, c => { if (/History/.test(c.textContent)) h = c; });
            if (h) h.click();
            await new Promise(r2 => setTimeout(r2, 300));
            r.topics = document.querySelectorAll(".at-topic").length;
            r.terms = document.querySelectorAll(".at-term").length;
            r.shareBtn = !!document.getElementById("atShare");
            /* drill the first topic */
            const dr = document.querySelector("[data-dr]");
            if (dr) dr.click();
            await new Promise(r2 => setTimeout(r2, 700));
            r.quizN = 0;
            try { r.quizN = state.quiz.length; } catch (e) {}
            const qc = document.getElementById("quizCard");
            r.inQuiz = !!qc && !qc.classList.contains("hidden");
            r.atlasClosed = !document.getElementById("atOv");
            /* AI curriculum answer */
            try { r.curr = window.__aiApi.reply("Nok terracotta").src; } catch (e) { r.curr = "ERR"; }
            /* palette hook */
            try { r.pal = window.__proPalHooks.some(f => String(f).indexOf("Atlas") >= 0); } catch (e) { r.pal = false; }
            /* nav shadow on scroll (settle-poll: smooth scroll + loaded CI need slack) */
            window.scrollTo(0, 400);
            for (let i = 0; i < 20; i++) { await new Promise(r2 => setTimeout(r2, 100)); if (window.scrollY > 8) break; }
            await new Promise(r2 => setTimeout(r2, 150));
            r.scrolled = document.documentElement.classList.contains("pf-scrolled");
            window.scrollTo(0, 0);
            await new Promise(r2 => setTimeout(r2, 200));
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.api) throw "idle modules missing: " + JSON.stringify(m);
          if (m.subjects !== 27) throw "subjects " + m.subjects;
          if (m.tagged !== 267) throw "tagged " + m.tagged;
          if (!m.chip) throw "no atlasLaunch chip";
          if (!m.open || m.cards !== 27) throw "grid " + JSON.stringify({ open: m.open, cards: m.cards });
          if (m.search !== 2 || !m.searchHasMkt) throw "search marketing -> " + m.search;
          if (m.searchDrum !== 1) throw "search talking drum -> " + m.searchDrum;
          if (m.topics !== 4 || m.terms !== 3) throw "detail " + JSON.stringify({ topics: m.topics, terms: m.terms });
          if (!m.shareBtn) throw "no share button";
          if (!(m.quizN >= 1) || !m.inQuiz) throw "drill did not start quiz: " + JSON.stringify({ n: m.quizN, inQuiz: m.inQuiz });
          if (!m.atlasClosed) throw "atlas stayed open over the paper";
          if (m.curr !== "curriculum") throw "AI curriculum: " + m.curr;
          if (!m.pal) throw "atlas palette hook missing";
          if (!m.scrolled) throw "pf-scrolled not applied";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v36 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
