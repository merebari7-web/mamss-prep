/* v38.0 suite — No automatic scroll-up anywhere.
   Run: node quiz/_test_v38.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

(async () => {
  await run("index.html: zero automatic scrolls-to-top; setCard/jumpTo/review scroll-free", () => {
    const n = (HTML.match(/scrollTo\(\{top:0/g) || []).length;
    if (n !== 0) throw "top-scrolls: " + n;
    const all = (HTML.match(/window\.scrollTo\(/g) || []).length;
    if (all !== 2) throw "expected only the 2 dock-nav scrollTo calls, found " + all;
    const i = HTML.indexOf("function setCard(t){");
    if (i < 0) throw "setCard gone";
    if (HTML.slice(i, i + 600).indexOf("scrollTo") >= 0) throw "setCard still scrolls";
    if (HTML.indexOf("function jumpTo(t){t<0||t>=state.quiz.length||(state.idx=t,renderQ())}") < 0) throw "jumpTo regressed";
  });
  await run("user-initiated scrolling preserved (dock, back-top, palette)", () => {
    if (HTML.indexOf("scrollTo({top:n") < 0) throw "dock nav scroll gone";
    if (POLISH.indexOf('window.scrollTo({ top: 0, behavior: "smooth" })') < 0) throw "back-top scroll gone";
    if (POLISH.indexOf("top: n2") < 0) throw "polish dock scroll gone";
    if (PRO.indexOf("Back to top") < 0) throw "palette back-to-top gone";
  });
  await run("sw.js: versioned (v38+), auto-scroll note kept", () => {
    if (!/"-v(3[89]|[49][0-9])"/.test(SW)) throw "NSS_V not versioned v38+";
    if (SW.indexOf("auto-scroll") < 0) throw "sw note missing";
  });
  await run("boot wire still <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* -------- jsdom: setCard never calls scrollTo -------- */
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, { runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.DecompressionStream = globalThis.DecompressionStream; window.TextDecoder = globalThis.TextDecoder; window.TextEncoder = globalThis.TextEncoder;
      const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = () => vp;
      window.scrollTo = () => {}; window.matchMedia = window.matchMedia || (() => ({ matches: false }));
      window.fetch = () => Promise.reject(new Error("no net"));
    } });
  const w = d.window;
  await run("jsdom: setCard(class/subject/length/quiz/result/review) makes zero scroll calls", () => {
    w.eval("window.__scrollCalls = 0; window.scrollTo = function () { window.__scrollCalls++; };");
    for (const c of ["class", "subject", "length", "quiz", "result", "review"]) w.eval("setCard('" + c + "')");
    const n = w.eval("window.__scrollCalls");
    if (n !== 0) throw n + " scroll calls";
    const vis = w.eval("['step-class','step-subject','step-length','quizCard','resultCard','reviewCard'].filter(id => !document.getElementById(id).classList.contains('hidden'))");
    if (vis.length !== 1 || vis[0] !== "reviewCard") throw "card switch broken: " + JSON.stringify(vis);
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
        await new Promise(r => setTimeout(r, 700));
        await run("chrome " + v.w + ": setup flow never moves the page; back-top/dock still do", async () => {
          const m = await p.evaluate(async () => {
            const r = { steps: [] };
            const vis = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains("hidden"); };
            const click = async (sel) => {
              const els = document.querySelectorAll(sel);
              if (!els.length) return false;
              els[0].click();
              await new Promise(r2 => setTimeout(r2, 350));
              return true;
            };
            try { if (typeof signUpGuest === "function") { const g = document.getElementById("guestName"); if (g) g.value = "Ada"; signUpGuest(); } } catch (e) {}
            await new Promise(r2 => setTimeout(r2, 400));
            const settleTo = async (y) => {
              window.scrollTo(0, y);
              for (let i = 0; i < 25; i++) {
                await new Promise(r2 => setTimeout(r2, 100));
                if (Math.abs(window.scrollY - y) < 5) break;
              }
              return window.scrollY;
            };
            const y0 = await settleTo(600);
            /* 1. class -> subject */
            r.c1 = await click("#classTabs .tab, #classTabs .chip, #classTabs button");
            r.s1 = vis("step-subject"); r.y1 = window.scrollY;
            /* 2. subject -> length */
            r.c2 = await click("#subjectChips .chip, #subjectChips button");
            r.s2 = vis("step-length"); r.y2 = window.scrollY;
            /* 3. length -> (count) -> start quiz */
            const counts = document.querySelectorAll("#countBoxes .count");
            const c10 = Array.prototype.find.call(counts, x => /\b10\b/.test(x.textContent)) || counts[0];
            if (c10) c10.click();
            await new Promise(r2 => setTimeout(r2, 350));
            r.y3a = window.scrollY;
            const starts = document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn");
            const go = Array.prototype.find.call(starts, x => /Commence|Start paper|Begin|Start quiz/i.test(x.textContent));
            r.c3 = !!go;
            if (go) go.click();
            await new Promise(r2 => setTimeout(r2, 600));
            r.inQuiz = vis("quizCard"); r.y3 = window.scrollY;
            r.y0 = y0;
            /* 4. answer + palette jump: never yanked up */
            const yb = await settleTo(500);
            try {
              const opts = document.querySelectorAll("#qOpts .opt, #qOpts button");
              if (opts.length) opts[0].click();
              await new Promise(r2 => setTimeout(r2, 300));
            } catch (e) {}
            r.y4 = window.scrollY;
            try { togglePalette(); } catch (e) {}
            await new Promise(r2 => setTimeout(r2, 250));
            const pal = Array.prototype.find.call(document.querySelectorAll("#palette .pal-n"), x => x.textContent === "3");
            if (pal) pal.click();
            await new Promise(r2 => setTimeout(r2, 400));
            r.y5 = window.scrollY; r.yb = yb; r.palClicked = !!pal;
            /* 5. user-initiated scrolls still work */
            await settleTo(600);
            const bt = document.getElementById("backTop");
            if (bt) bt.click();
            await new Promise(r2 => setTimeout(r2, 900));
            r.backTopY = window.scrollY; r.hasBackTop = !!bt;
            await settleTo(600);
            const home = document.querySelector('.hd-btn[data-hd="home"]');
            if (home) home.click();
            await new Promise(r2 => setTimeout(r2, 900));
            r.dockY = window.scrollY; r.hasDock = !!home;
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.c1 || !m.s1) throw "class step did not advance: " + JSON.stringify({ c1: m.c1, s1: m.s1 });
          if (!m.c2 || !m.s2) throw "subject step did not advance: " + JSON.stringify({ c2: m.c2, s2: m.s2 });
          if (!m.inQuiz) throw "quiz did not start (c3=" + m.c3 + ")";
          for (const k of ["y1", "y2", "y3a", "y3"]) {
            if (Math.abs(m[k] - m.y0) > 100 || m[k] < 250) throw "page moved at " + k + ": " + JSON.stringify({ y0: m.y0, [k]: m[k] });
          }
          if (Math.abs(m.y4 - m.yb) > 8) throw "page moved on answer (v39 strict zero-jump): " + JSON.stringify({ yb: m.yb, y4: m.y4 });
          if (m.palClicked && Math.abs(m.y5 - m.yb) > 8) throw "page moved on palette jump (v39 strict zero-jump): " + JSON.stringify({ yb: m.yb, y5: m.y5 });
          if (!m.hasBackTop) throw "no back-top button";
          if (m.backTopY > 60) throw "back-top broken (user scroll must work): y=" + m.backTopY;
          if (!m.hasDock) throw "no dock home button";
          if (m.dockY > 60) throw "dock home broken: y=" + m.dockY;
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v38 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
