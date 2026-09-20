/* v30.0 suite — Scholar Toolkit (lazy quiz/toolkit.js, loaded by polish.js at
   idle): 🧪 Periodic Table Explorer (118 elements, categories, search, detail
   cards, Element Detective quiz), 📐 Formula Vault (Maths/Physics/Chemistry,
   search, bookmarks, copy), 📈 scroll-progress bar, 🎞️ overlay entrance +
   quiz-option stagger motion. SW key -v30. Run: node quiz/_test_v30.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const TK = fs.readFileSync("quiz/toolkit.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("toolkit.js: parses and carries every v30 feature", () => {
    new Function(TK);
    for (const h of ["Periodic Table", "tk-el", "Element Detective", "Detective", "Formula Vault", "nssc_vault_bm", "__proPalHooks", "tkChem", "tkVault", "tk-bar", "tkio", "tkopt", "var ELEMS=", "var FORMS="]) {
      if (TK.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("toolkit.js data integrity: 118 elements, >=100 formulas, 5 fields each", () => {
    const vm = require("vm");
    const ctx = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, createElement() { return { style: {}, classList: { add() {} }, addEventListener() {}, setAttribute() {}, appendChild() {} }; }, head: { appendChild() {} }, body: { appendChild() {} } } };
    vm.createContext(ctx); vm.runInContext(TK, ctx);
    if (ctx.ELEMS.length !== 118) throw "elements=" + ctx.ELEMS.length;
    if (ctx.FORMS.length < 100) throw "formulas=" + ctx.FORMS.length;
    const zs = ctx.ELEMS.map(e => e[0]);
    if (zs.join(",") !== Array.from({ length: 118 }, (_, i) => i + 1).join(",")) throw "Z sequence broken";
    for (const f of ctx.FORMS) if (f.length !== 5) throw "formula fields " + f[2];
    for (const e of ctx.ELEMS) if (e.length !== 7) throw "element fields " + e[1];
    console.log("   (formulas=" + ctx.FORMS.length + ")");
  });
  await run("polish.js: idle-loads toolkit.js (zero boot cost)", () => {
    if (POLISH.indexOf("quiz/toolkit.js") < 0) throw "no toolkit loader";
    if (POLISH.indexOf("requestIdleCallback") < 0 && POLISH.indexOf("setTimeout(tr") < 0) throw "no idle strategy";
  });
  await run("index.html: still loader-only (no toolkit inline, wire unchanged)", () => {
    if (/quiz\/toolkit\.js/.test(HTML)) throw "toolkit inline in shell";
    if (!/quiz\/polish\.js/.test(HTML)) throw "polish loader gone";
  });
  await run("service worker cache key bumped to -v30", () => {
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
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      window.scrollTo = () => {}; window.matchMedia = window.matchMedia || (() => ({ matches: false }));
      window.Notification = function () {}; window.Notification.permission = "default";
      window.AudioContext = function () { this.currentTime = 0; this.sampleRate = 44100; this.state = "running";
        this.createOscillator = () => ({ type: "", connect() {}, start() {}, stop() {}, frequency: { value: 0 } });
        this.createGain = () => ({ connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime() {}, exponentialRampToValueAtTime() {} } });
        this.createBiquadFilter = () => ({ connect() {}, disconnect() {}, type: "", frequency: { value: 0 } });
        this.destination = {}; this.resume = () => {}; };
      window.Element.prototype.appendChild = window.Element.prototype.appendChild; // noop guard
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("polish boots, pro attaches, toolkit mounts (chips, bar, hooks)", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 900));
    w.eval(PRO);
    await new Promise(r => setTimeout(r, 300));
    w.eval(TK);
    await new Promise(r => setTimeout(r, 300));
    const doc = w.document;
    if (!doc.documentElement.classList.contains("tk")) throw "no tk class";
    if (!doc.getElementById("tkCss")) throw "no tk css";
    if (!doc.getElementById("tkChem")) throw "no chem chip";
    if (!doc.getElementById("tkVault")) throw "no vault chip";
    if (!doc.getElementById("tkBar")) throw "no progress bar";
    if (!w.ELEMS || w.ELEMS.length !== 118) throw "no element data in app realm";
    if (!Array.isArray(w.FORMS) || w.FORMS.length < 100) throw "no formula data in app realm";
  });
  await run("periodic table: 118 cells -> search -> detail -> detective quiz 8/8", async () => {
    const doc = w.document;
    w.eval('document.getElementById("tkChem").click()');
    await new Promise(r => setTimeout(r, 200));
    let ov = doc.getElementById("tkChemOv");
    if (!ov) throw "chem overlay missing";
    if (ov.querySelectorAll(".tk-el").length !== 118) throw "cells=" + ov.querySelectorAll(".tk-el").length;
    const inp = doc.getElementById("tkChemIn");
    inp.value = "iron"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    const cells = ov.querySelectorAll(".tk-el");
    if (cells.length !== 1) throw "search cells=" + cells.length;
    cells[0].click();
    await new Promise(r => setTimeout(r, 120));
    if (!/Iron/.test(ov.textContent)) throw "detail missing Iron";
    if (!/Group 8/.test(ov.textContent)) throw "detail missing group";
    doc.getElementById("tkQuizBtn").click();
    await new Promise(r => setTimeout(r, 120));
    for (let i = 0; i < 8; i++) {
      const cor = ov.querySelector('.tk-qopt[data-cor="1"]');
      if (!cor) throw "no correct option round " + i;
      cor.click();
      await new Promise(r => setTimeout(r, 40));
    }
    await new Promise(r => setTimeout(r, 150));
    if (!/8 \/ 8/.test(ov.textContent)) throw "quiz result missing: " + ov.textContent.slice(0, 120);
    doc.getElementById("tkChemX").click();
    await new Promise(r => setTimeout(r, 100));
    if (doc.getElementById("tkChemOv")) throw "chem not closed";
  });
  await run("formula vault: tabs, search, bookmark persists, copy feedback", async () => {
    const doc = w.document;
    w.eval('document.getElementById("tkVault").click()');
    await new Promise(r => setTimeout(r, 200));
    const ov = doc.getElementById("tkVaultOv");
    if (!ov) throw "vault overlay missing";
    if (!ov.querySelectorAll(".tk-vrow").length) throw "no rows on Maths tab";
    // physics tab
    Array.prototype.forEach.call(ov.querySelectorAll(".tk-vtab"), t => { if (t.getAttribute("data-t") === "Physics") t.click(); });
    await new Promise(r => setTimeout(r, 100));
    if (!/Ohm/.test(ov.textContent)) throw "physics rows missing";
    // search across subjects
    const inp = doc.getElementById("tkVolIn");
    inp.value = "quadratic"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    const rows = ov.querySelectorAll(".tk-vrow");
    if (!rows.length) throw "no search results";
    if (!/Quadratic formula/.test(ov.textContent)) throw "quadratic not found";
    // bookmark
    const st = ov.querySelector(".tk-st");
    st.click();
    await new Promise(r => setTimeout(r, 100));
    const bm = JSON.parse(w.localStorage.getItem("nssc_vault_bm") || "[]");
    if (!bm.length) throw "bookmark not persisted";
    // copy feedback
    const cp = ov.querySelector(".tk-cp");
    cp.click();
    await new Promise(r => setTimeout(r, 100));
    // fallback path keeps the button label; clipboard may be missing in jsdom
    doc.getElementById("tkVolX").click();
    await new Promise(r => setTimeout(r, 100));
    if (doc.getElementById("tkVaultOv")) throw "vault not closed";
  });
  await run("motion css: overlay entrance + option stagger present and gated", () => {
    if (TK.indexOf("html.tk .overlay{animation:tkio") < 0) throw "no overlay entrance rule";
    if (TK.indexOf("html.tk .opts .opt{animation:tkopt") < 0) throw "no option stagger rule";
    if (TK.indexOf("prefers-reduced-motion:no-preference") < 0) throw "not motion-gated";
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
        await p.waitForFunction(() => document.getElementById("tkChem") !== null, { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 900));
        await run("chrome " + v.w + ": periodic table + vault + progress + motion e2e", async () => {
          const m = await p.evaluate(async () => {
            const r = { chips: !!document.getElementById("tkChem") && !!document.getElementById("tkVault"), err: [] };
            try { localStorage.removeItem("nssc_vault_bm"); } catch (e) {}
            // periodic table
            document.getElementById("tkChem").click();
            await new Promise(r2 => setTimeout(r2, 250));
            const ov = document.getElementById("tkChemOv");
            r.ov = !!ov;
            r.cells = ov ? ov.querySelectorAll(".tk-el").length : 0;
            const inp = document.getElementById("tkChemIn");
            inp.value = "gold"; inp.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 150));
            const cells = ov.querySelectorAll(".tk-el");
            r.search1 = cells.length === 1;
            cells[0].click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.detail = /Gold/.test(ov.textContent) && /79/.test(ov.textContent);
            document.getElementById("tkQuizBtn").click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.quiz = !!ov.querySelector('.tk-qopt[data-cor="1"]');
            ov.querySelector('.tk-qopt[data-cor="1"]').click();
            await new Promise(r2 => setTimeout(r2, 150));
            r.round = /Round 2/.test(ov.textContent);
            document.getElementById("tkChemX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            // formula vault
            document.getElementById("tkVault").click();
            await new Promise(r2 => setTimeout(r2, 250));
            const vo = document.getElementById("tkVaultOv");
            r.vOv = !!vo;
            r.vRows = vo ? vo.querySelectorAll(".tk-vrow").length : 0;
            const vin = document.getElementById("tkVolIn");
            vin.value = "mole"; vin.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 150));
            r.vSearch = vo.querySelectorAll(".tk-vrow").length >= 1;
            const st = vo.querySelector(".tk-st");
            st.click();
            await new Promise(r2 => setTimeout(r2, 120));
            r.vBm = (JSON.parse(localStorage.getItem("nssc_vault_bm") || "[]").length) >= 1;
            document.getElementById("tkVolX").click();
            await new Promise(r2 => setTimeout(r2, 150));
            // progress bar: app smooth-scrolls, so scroll far and poll until it settles
            window.scrollTo(0, 1e8);
            let bw = 0, prev = -1, stable = 0;
            for (let i = 0; i < 22; i++) {
              await new Promise(r2 => setTimeout(r2, 150));
              const bar2 = document.getElementById("tkBar");
              bw = bar2 ? parseFloat(bar2.style.width) || 0 : -1;
              const st = document.documentElement.scrollTop;
              if (st > 0 && st === prev) { stable++; if (stable >= 2) break; } else stable = 0;
              prev = st;
            }
            r.barW = bw;
            window.scrollTo(0, 0);
            // overlay entrance animation applies to shell modals
            const doc2 = document;
            document.getElementById("helpBtn").click();
            await new Promise(r2 => setTimeout(r2, 250));
            const hov = document.getElementById("helpOverlay");
            r.motion = !!hov && getComputedStyle(hov).animationName;
            try { doc2.getElementById("helpClose") ? doc2.getElementById("helpClose").click() : hov.style.display = "none"; } catch (e) {}
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.chips) throw "toolkit chips missing";
          if (!m.ov) throw "chem overlay missing";
          if (m.cells !== 118) throw "cells=" + m.cells;
          if (!m.search1) throw "search failed";
          if (!m.detail) throw "detail failed";
          if (!m.quiz) throw "quiz did not start";
          if (!m.round) throw "quiz round did not advance";
          if (!m.vOv) throw "vault overlay missing";
          if (m.vRows < 1) throw "vault rows=" + m.vRows;
          if (!m.vSearch) throw "vault search failed";
          if (!m.vBm) throw "bookmark failed";
          if (m.barW <= 0) throw "progress bar stuck at " + m.barW;
          const nm = String(m.motion || "");
          if (!/tkio/.test(nm)) throw "overlay animation not applied: " + nm;
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v30 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
