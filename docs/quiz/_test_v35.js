/* v35.0 suite — Curriculum Expansion + Holo 3D Lab upgrade + no auto-scroll + global-ready head.
   Run: node quiz/_test_v35.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const CURIC = fs.readFileSync("quiz/curriculum.js", "utf8");
const HOLO = fs.readFileSync("quiz/holo.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-9);

(async () => {
  await run("curriculum.js: parses + carries full-curriculum content", () => {
    new Function(CURIC);
    for (const h of ["NIGERIAN CURRICULUM EXPANSION", "History", "Technical Drawing", "Marketing", "Insurance", "Visual Arts", "Music", "Physical Education", "Home Economics", "window.CURR", "window.SYLL", "__curicApi", "quizbank-updated", "SUBJECT_META", "amalgamation", "talking drum", "CURRICULUM EXPANSION"]) {
      if (CURIC.indexOf(h) < 0) throw "missing " + h;
    }
    const nq = (CURIC.match(/q: "/g) || []).length;
    console.log("   (authored questions in data: " + nq + ")");
    if (nq < 250) throw "too few authored questions: " + nq;
  });
  await run("index.html: scroll fix (no auto scroll-to-top anywhere — v38 removed the last one)", () => {
    const s = HTML;
    if (s.indexOf('function jumpTo(t){t<0||t>=state.quiz.length||(state.idx=t,renderQ())}') < 0) throw "jumpTo still scrolls";
    if (s.indexOf('$("reviewCard").classList.remove("hidden")}') < 0) throw "showReview still scrolls";
    if (s.indexOf('function setCard(t){') < 0) throw "setCard gone";
    const n = (s.match(/scrollTo\(\{top:0,behavior:"smooth"\}\)/g) || []).length;
    console.log("   (remaining top-scrolls: " + n + ")");
    if (n !== 0) throw "expected 0 auto scrolls, got " + n;
  });
  await run("index.html: worldwide-ready head (manifest, icons, canonical, JSON-LD, 27 subjects)", () => {
    const s = HTML;
    if (s.indexOf('href="manifest.webmanifest"') < 0) throw "no manifest link";
    if (s.indexOf('href="apple-touch-icon.png"') < 0) throw "no apple-touch-icon";
    if (s.indexOf('rel="canonical"') < 0) throw "no canonical";
    if (s.indexOf('application/ld+json') < 0) throw "no JSON-LD";
    if (s.indexOf('"isAccessibleForFree":true') < 0) throw "no access flag";
    if (s.indexOf("27 subjects") < 0) throw "hero not 27 subjects";
    if (s.indexOf("4,167") < 0) throw "hero not 4,275";
    if (s.indexOf('lang="en"') < 0) throw "no lang";
  });
  await run("sw.js: -v35 + polish loads curriculum at idle", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not versioned";
    if (SW.indexOf("curriculum.js") < 0) throw "sw note missing";
    if (POLISH.indexOf("quiz/curriculum.js") < 0) throw "polish loader missing";
  });
  await run("holo.js: v35 upgrades in source (molecules, surfaces, moon, facts, export)", () => {
    new Function(HOLO);
    for (const h of ["Ethanol", "Sodium chloride", "Wind over Waves", "Twin Peaks", "var MOON", "var INFOS", "hoInfo", "bindTap", 'data-act="snap"', "counts: { mol: MOLS.length"]) {
      if (HOLO.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("boot wire still <= 266240 B", () => {
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
      let fired = 0; window.addEventListener("quizbank-updated", () => fired++);
    } });
  const w = d.window;
  w.eval(CURIC);
  await new Promise(r => setTimeout(r, 900));

  await run("curriculum injected: 27 subjects, full Nigerian curriculum, CURR/SYLL/TOPICS/META", () => {
    const api = w.__curicApi;
    if (!api) throw "no __curicApi";
    if (api.added !== 267) throw "added=" + api.added + " (want 267)";
    console.log("   (added " + api.added + " curated questions)");
    if (w.QUIZ_RAW.subj.length !== 27) throw "subj=" + w.QUIZ_RAW.subj.length;
    const subj = w.QUIZ_RAW.subj;
    for (const s of ["History", "Technical Drawing", "Marketing", "Insurance", "Visual Arts", "Music", "Physical Education", "Home Economics"])
      if (subj.indexOf(s) < 0) throw "missing subject " + s;
    const G = w.eval("({ CLASSES: CLASSES, TOPICS: TOPICS, SUBJECT_META: SUBJECT_META })");
    const tot = G.CLASSES.reduce((a, c) => a + c.questions.length, 0);
    if (tot !== 4167) throw "total questions " + tot + " (want 4167)";
    console.log("   (bank total: " + tot + ")");
    if (!Array.isArray(G.TOPICS.History) || G.TOPICS.History.length < 4) throw "TOPICS.History";
    if (!w.CURR || !w.CURR.History || w.CURR.History.length !== 4) throw "CURR.History";
    if (!w.SYLL || !w.SYLL.History || w.SYLL.History.length !== 9) throw "SYLL.History";
    if (G.SUBJECT_META.History.icon !== "HI") throw "META.History " + JSON.stringify(w.SUBJECT_META.History).slice(0, 60);
    /* validity of every question */
    let bad = 0, seen = {};
    G.CLASSES.forEach((c, ci) => {
      c.questions.forEach(q => {
        if (!q.s || !q.q || !Array.isArray(q.o) || q.o.length !== 4 || typeof q.a !== "number" || q.a < 0 || q.a > 3 || !q.e) bad++;
        if (seen[q.q + "|" + ci]) bad++; seen[q.q + "|" + ci] = 1;
      });
    });
    if (bad) throw bad + " invalid/duplicate questions";
    /* library window sees the new subjects via the same live sources */
    if (!G.CLASSES[0].questions.some(q => q.s === "History")) throw "no History questions in SS1";
  });
  w.eval(HOLO);
  await new Promise(r => setTimeout(r, 400));
  await run("holo: v35 counts (10 molecules, 8 surfaces, 8 planets) + Moon & facts", () => {
    const api = w.__holo;
    if (!api) throw "no api";
    if (api.counts.mol !== 10 || api.counts.surf !== 8 || api.counts.orb !== 8)
      throw "counts " + JSON.stringify(api.counts);
    if (!w.__hoInfo) throw "no exposed info fn";
    for (const h of ["Ethanol", "Sodium chloride", "var MOON", "var INFOS", "data-act=\"snap\""]) {
      if (HOLO.indexOf(h) < 0) throw "source missing " + h;
    }
  });
  await run("manifest & icons exist on disk", () => {
    for (const f of ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
      if (!fs.existsSync(f)) throw "missing " + f;
    }
    const m = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
    if (m.icons.length !== 3) throw "icons " + m.icons.length;
    if (!/4,167/.test(m.description)) throw "manifest desc";
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
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await p.waitForFunction(() => window.__curicApi, { timeout: 25000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 700));
        await run("chrome " + v.w + ": curriculum — History paper, meta, no auto-scroll, holo v35", async () => {
          const m = await p.evaluate(async () => {
            const r = { added: window.__curicApi && window.__curicApi.added };
            const seen = {};
            CLASSES.forEach(c => c.questions.forEach(q => { seen[q.s] = 1; }));
            r.subjects = Object.keys(seen).length;
            r.tot = CLASSES.reduce((a, c) => a + c.questions.length, 0);
            r.hero = document.body.textContent.indexOf("4,167") >= 0;
            r.hasHist = !!seen.History;
            /* no auto scroll: start a paper, scroll down, jump via palette */
            try { document.getElementById("guestName") ? 0 : 0; } catch (e) {}
            if (typeof signUpGuest === "function") { const g = document.getElementById("guestName"); if (g) g.value = "Ada"; signUpGuest(); }
            await new Promise(r2 => setTimeout(r2, 300));
            try {
              document.querySelector('[data-cls="0"], #step-class .tile, #classGrid .tile') && 0;
              const cls = document.querySelectorAll("#classTabs .tab, #classTabs .chip, #classTabs button");
              if (cls.length) cls[0].click();
              await new Promise(r2 => setTimeout(r2, 250));
              const subjT = document.querySelectorAll("#subjectChips .chip, #subjectChips button");
              const h = Array.prototype.find.call(subjT, t => /History/.test(t.textContent));
              if (h) h.click();
              await new Promise(r2 => setTimeout(r2, 250));
              const len = document.querySelectorAll("#countBoxes .box, #countBoxes button");
              if (len.length) len[0].click();
              await new Promise(r2 => setTimeout(r2, 250));
              const sb = document.querySelector("#step-length .btn-gold, #step-length .btn, #startBtn");
              if (sb) sb.click();
            } catch (e) {}
            await new Promise(r2 => setTimeout(r2, 900));
            r.inQuiz = !!document.getElementById("quizCard") && !document.getElementById("quizCard").classList.contains("hidden");
            window.scrollTo(0, 500); await new Promise(r2 => setTimeout(r2, 250));
            const yBefore = window.scrollY;
            try { togglePalette(); } catch (e) {}
            await new Promise(r2 => setTimeout(r2, 250));
            const pal = Array.prototype.find.call(document.querySelectorAll("#palette .pal-n"), b => b.textContent === "3");
            if (pal) pal.click();
            await new Promise(r2 => setTimeout(r2, 400));
            const yAfter = window.scrollY;
            r.noJump = Math.abs(yAfter - yBefore) < 120;  /* must NOT fly to top */
            /* holo */
            if (window.__holo) {
              r.mol = window.__holo.counts.mol; r.surf = window.__holo.counts.surf; r.orb = window.__holo.counts.orb;
              window.__holo.open("orb");
              await new Promise(r2 => setTimeout(r2, 700));
              r.orbLabel = (document.getElementById("hoMola") || {}).textContent || "";
              /* tap the info about the Moon via hoInfo directly + click a planet */
              try { window.__hoInfo && window.__hoInfo("Earth"); } catch (e) {}
              r.info = (document.getElementById("hoInfo") || {}).textContent || "";
              r.snapBtn = !!document.querySelector('.ho-btn[data-act="snap"]');
              window.__holo.close();
            }
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.added || m.added !== 267) throw "curic not loaded: " + m.added + " (want 267)";
          if (m.subjects !== 27) throw "subjects " + m.subjects + " (want 27)";
          if (m.tot !== 4167) throw "total " + m.tot + " (want 4167)";
          if (!m.hero) throw "hero copy not updated";
          if (!m.hasHist) throw "History missing";
          if (m.inQuiz && !m.noJump) throw "auto-scroll STILL jumps: " + JSON.stringify(m);
          if (m.mol !== 10 || m.surf !== 8 || m.orb !== 8) throw "holo counts " + JSON.stringify({ mol: m.mol, surf: m.surf, orb: m.orb });
          if (!/1 moon/.test(m.orbLabel)) throw "orb label: " + m.orbLabel;
          if (!/Earth/.test(m.info)) throw "info bar: " + m.info;
          if (!m.snapBtn) throw "no PNG export button";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
      /* canvas-painted check + export click (desktop only, once) */
      const p = await b.newPage();
      await p.setViewport({ width: 1280, height: 800 });
      await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
      await p.waitForFunction(() => window.__holo && window.__curicApi, { timeout: 25000 });
      await new Promise(r => setTimeout(r, 800));
      await run("chrome 1280: holo paints the new crystals/surfaces + PNG export works", async () => {
        const m = await p.evaluate(async () => {
          const r = {};
          window.__holo.open("mol");
          await new Promise(r2 => setTimeout(r2, 500));
          /* ethanol */
          const chips = document.querySelectorAll("#hoChips .ho-chip");
          let idx = -1;
          Array.prototype.forEach.call(chips, (c, i) => { if (/Ethanol/.test(c.textContent)) idx = i; });
          if (idx >= 0) chips[idx].click();
          await new Promise(r2 => setTimeout(r2, 900));
          const cv = document.getElementById("hoCv");
          const x = cv.getContext("2d");
          const d = x.getImageData(0, 0, cv.width, cv.height).data;
          let painted = 0;
          for (let i = 3; i < d.length; i += 40) if (d[i] > 0) painted++;
          r.ethanolPainted = painted > 200;
          /* twin peaks */
          const chips2 = Array.prototype.slice.call(document.querySelectorAll(".ho-tab"));
          Array.prototype.forEach.call(chips2, t => { if (t.getAttribute("data-t") === "surf") t.click(); });
          await new Promise(r2 => setTimeout(r2, 400));
          let si = -1;
          Array.prototype.forEach.call(document.querySelectorAll("#hoChips .ho-chip"), (c, i) => { if (/Twin Peaks/.test(c.textContent)) si = i; });
          if (si >= 0) document.querySelectorAll("#hoChips .ho-chip")[si].click();
          await new Promise(r2 => setTimeout(r2, 900));
          const d2 = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
          let p2 = 0; for (let i = 3; i < d2.length; i += 40) if (d2[i] > 0) p2++;
          r.surfPainted = p2 > 200;
          /* export does not throw */
          const btn = document.querySelector('.ho-btn[data-act="snap"]');
          let expErr = null;
          try { btn.click(); } catch (e) { expErr = String(e); }
          r.export = !expErr;
          window.__holo.close();
          return r;
        });
        if (!m.ethanolPainted) throw "ethanol canvas blank";
        if (!m.surfPainted) throw "twin peaks canvas blank";
        if (!m.export) throw "export click threw";
      });
      await p.close();
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v35 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
