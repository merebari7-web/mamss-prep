/* v28.0 suite — Apex HQ (lazy quiz/aura.js, loaded by pro.js at idle):
   🏆 Trophy Room gallery (13 achievements + live progress + unlock dates),
   🗓 Exam Sprint Plan generator (target exam + weakest-subject weighting,
   day checklist, regenerate, print), 🏆 dock pill, command-palette entries,
   and the polish v28 texture layer (section underline draw, count-up,
   cursor spotlight, hour ambience, light remaster). SW key -v28.
   Run: node quiz/_test_v28.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const AURA = fs.readFileSync("quiz/aura.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("aura.js: parses and carries every v28 feature", () => {
    new Function(AURA);
    for (const h of ["apexOv", "apexBtn", "tro-card", "pl-row", "Trophy Room", "Exam Sprint Plan", "apex-print", "plRegen", "nssc_apex", "__palActions"]) {
      if (AURA.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("pro.js: idle-loads aura.js (zero boot cost)", () => {
    if (PRO.indexOf("quiz/aura.js") < 0) throw "no aura loader";
    if (PRO.indexOf("requestIdleCallback") < 0 && PRO.indexOf("setTimeout(ax") < 0) throw "no idle strategy";
    if (PRO.indexOf("window.__palAdd = add") < 0) throw "palette hook missing";
  });
  await run("index.html: shell untouched by v28 (no aura inline)", () => {
    if (/quiz\/aura\.js/.test(HTML)) throw "aura.js inline in shell";
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

  /* jsdom: aura boots, dock pill, trophies, plan, palette entry */
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
      window.print = () => {};
      window.AudioContext = function () { this.currentTime = 0; this.createOscillator = () => ({ type: "", connect() {}, start() {}, stop() {}, frequency: { value: 0 } }); this.createGain = () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }); this.destination = {}; this.close = () => {}; };
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("polish -> pro -> aura chain attaches (pill, palette hook)", async () => {
    w.eval(POLISH);
    await new Promise(r => setTimeout(r, 900));
    w.eval(PRO);
    await new Promise(r => setTimeout(r, 300));
    w.eval(AURA);
    await new Promise(r => setTimeout(r, 300));
    if (!w.document.documentElement.classList.contains("aura")) throw "no aura class";
    const pill = w.document.getElementById("apexBtn");
    if (!pill) throw "no dock pill";
    if (!w.document.querySelector("#homeDock .hd-btn.apex-hd")) throw "pill not in dock";
    if (!Array.isArray(w.__palActions) || w.__palActions.length < 2) throw "palette registry not populated";
  });
  await run("seeded attempts -> trophy room: unlocked live, progress bars", async () => {
    const now = Date.now(), day = 864e5;
    w.localStorage.setItem("nssc_attempts_guest", JSON.stringify([
      { subj: "Mathematics", pct: 60, correct: 6, tms: now },
      { subj: "Physics", pct: 100, correct: 10, tms: now - day },
      { subj: "Chemistry", pct: 0, correct: 0, tms: now - 2 * day }
    ]));
    w.document.getElementById("apexBtn").click();
    await new Promise(r => setTimeout(r, 300));
    const cards = w.document.querySelectorAll(".apex-ov .tro-card");
    if (cards.length !== 13) throw "trophy cards=" + cards.length;
    const on = w.document.querySelectorAll(".apex-ov .tro-card.on");
    if (on.length < 2) throw "unlocked=" + on.length + " (expect ≥2: first + perfect)";
    if (!on[0].textContent.match(/Unlocked/)) throw "no unlock date shown";
    const bars = w.document.querySelectorAll(".apex-ov .tro-pb");
    if (!bars.length) throw "no progress bars for locked badges";
    const hat = cards[2].textContent;
    if (!/today/.test(hat)) throw "hat progress missing: " + hat.slice(0, 60);
  });
  await run("exam sprint plan: generates, checks off, persists", async () => {
    const tabs = w.document.querySelectorAll(".apex-ov .apex-tab");
    tabs[1].click();
    await new Promise(r => setTimeout(r, 250));
    const rows = w.document.querySelectorAll(".apex-ov .pl-row");
    if (rows.length < 10 || rows.length > 21) throw "plan rows=" + rows.length;
    if (!/WAEC|NECO|JAMB/.test(w.document.getElementById("apexBody").textContent)) throw "no exam target";
    rows[0].querySelector(".pl-chk").click();
    await new Promise(r => setTimeout(r, 200));
    const st = JSON.parse(w.localStorage.getItem("nssc_apex") || "{}");
    if (!st.plan || !st.plan.items || st.plan.items[0].done !== true) throw "plan not persisted";
    const done = w.document.querySelectorAll(".apex-ov .pl-row.done").length;
    if (done !== 1) throw "done rows=" + done;
    // regenerate resets progress
    w.document.getElementById("plRegen").click();
    await new Promise(r => setTimeout(r, 200));
    if (w.document.querySelectorAll(".apex-ov .pl-row.done").length) throw "regen kept done";
  });
  await run("palette add hooks: Apex HQ entry opens overlay", async () => {
    w.document.getElementById("apexX").click();
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    const pal = w.document.getElementById("palQ");
    if (!pal) throw "palette did not open";
    const inp = pal.querySelector("#palIn");
    inp.value = "apex";
    inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    const items = pal.querySelectorAll(".pal-it");
    if (!items.length) throw "no apex palette entries";
    items[0].click();
    await new Promise(r => setTimeout(r, 250));
    if (w.document.getElementById("apexOv").classList.contains("hidden")) throw "apex did not open from palette";
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    if (!w.document.getElementById("apexOv").classList.contains("hidden")) throw "Esc did not close";
  });

  /* real-Chrome: dock pill, trophy room, plan toggle, no errors, no overflow */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      let v28i = 1;
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
        await p.evaluate((i) => {
          const n = document.getElementById("gateName"), e = document.getElementById("gateEmail");
          if (n && e) { n.value = "Amina V28" + i; e.value = "amina" + i + "@test.ng"; gateSignUp(); }
        }, v28i);
        await p.waitForFunction(() => document.getElementById("apexBtn") !== null, { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 600));
        await run("chrome " + v.w + ": apex pill, trophies, plan e2e", async () => {
          const m = await p.evaluate(async () => {
            const pill = !!document.getElementById("apexBtn");
            const dockBtns = document.querySelectorAll("#homeDock .hd-btn").length;
            // v28 dock repair: shows on scroll, buttons navigate
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo(0, 900);
            window.dispatchEvent(new Event("scroll"));
            await new Promise(r => setTimeout(r, 150));
            const dockShown = document.getElementById("homeDock").classList.contains("show");
            const dbg = { fix: window.__dockFix || 0, y: window.scrollY };
            const y0 = window.scrollY;
            document.querySelector('.hd-btn[data-hd="coach"]').click();
            let dockNav = false, navDbg = {};
            for (let k = 0; k < 12 && !dockNav; k++) { await new Promise(r => setTimeout(r, 200)); const yv = window.scrollY; navDbg = { y0, yv, d: yv - y0 }; dockNav = Math.abs(yv - y0) > 40; }
            window.scrollTo(0, 0);
            window.dispatchEvent(new Event("scroll"));
            await new Promise(r => setTimeout(r, 200));
            document.getElementById("apexBtn").click();
            await new Promise(r => setTimeout(r, 350));
            const cards = document.querySelectorAll("#apexOv .tro-card").length;
            const ovEl = document.getElementById("apexOv");
            const ovCs = getComputedStyle(ovEl);
            const ovFixed = ovCs.position === "fixed" && ovCs.zIndex !== "auto";
            const vis = !ovEl.classList.contains("hidden") && ovCs.display !== "none";
            document.querySelectorAll("#apexOv .apex-tab")[1].click();
            await new Promise(r => setTimeout(r, 300));
            const rows = document.querySelectorAll("#apexOv .pl-row").length;
            const examTxt = document.getElementById("apexBody").textContent.indexOf("WAEC") >= 0 || document.getElementById("apexBody").textContent.indexOf("NECO") >= 0 || document.getElementById("apexBody").textContent.indexOf("JAMB") >= 0;
            const first = document.querySelector("#apexOv .pl-chk");
            const wasDone = first ? first.closest(".pl-row").classList.contains("done") : false;
            if (first) first.click();
            await new Promise(r => setTimeout(r, 250));
            const done = document.querySelectorAll("#apexOv .pl-row.done").length;
            const st = JSON.parse(localStorage.getItem("nssc_apex") || "{}");
            const persisted = !!(st.plan && st.plan.items && st.plan.items[0] && st.plan.items[0].done === !wasDone);
            document.getElementById("apexX").click();
            await new Promise(r => setTimeout(r, 250));
            const closed = document.getElementById("apexOv").classList.contains("hidden");
            return { pill, dockBtns, dockShown, dockNav, dbg, navDbg, cards, vis, ovFixed, rows, examTxt, done, persisted, closed,
              overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth };
          });
          if (!m.pill) throw "no dock pill";
          if (m.dockBtns !== 6) throw "dock buttons=" + m.dockBtns;
          if (!m.dockShown) throw "dock does not show on scroll " + JSON.stringify(m.dbg);
          if (!m.dockNav) throw "dock button does not navigate " + JSON.stringify(m.navDbg);
          if (!m.vis || m.cards !== 13) throw "trophies cards=" + m.cards;
          if (!m.ovFixed) throw "apex overlay not styled (fixed + z-index)";
          if (m.rows < 10) throw "plan rows=" + m.rows;
          if (!m.examTxt) throw "no exam target in plan";
          if (m.done > 1 || !m.persisted) throw "toggle failed (done=" + m.done + ")";
          if (!m.closed) throw "close failed";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
        v28i++;
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v28 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
