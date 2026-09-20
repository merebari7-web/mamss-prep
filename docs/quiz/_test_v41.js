/* v41.0 suite — Apple website look (lazy Apple design language in polish.js).
   Run: node quiz/_test_v41.js */
const fs = require("fs");
const zlib = require("zlib");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

(async () => {
  await run("source: Apple theme present (APPLECSS + appleTheme + appleNav)", () => {
    if (POLISH.indexOf("var APPLECSS =") < 0) throw "APPLECSS missing";
    if (POLISH.indexOf("function appleTheme()") < 0) throw "appleTheme missing";
    if (POLISH.indexOf("function appleNav()") < 0) throw "appleNav missing";
    if (POLISH.indexOf('id = "appleCss"') < 0) throw "appleCss injection missing";
    if (POLISH.indexOf('id = "appleNav"') < 0) throw "appleNav builder missing";
  });
  await run("source: Apple tokens (SF stack, blue, pills, black hero)", () => {
    if (POLISH.indexOf("-apple-system") < 0) throw "SF system stack missing";
    if (POLISH.indexOf("#0071e3") < 0) throw "Apple blue missing";
    if (POLISH.indexOf("980px") < 0) throw "pill radius missing";
    if (POLISH.indexOf(".hero{background:#000") < 0) throw "black keynote hero missing";
    if (POLISH.indexOf("#appleNav") < 0) throw "global nav styles missing";
    if (POLISH.indexOf("[data-theme='dark']") < 0) throw "dark-mode set missing";
  });
  await run("source: suite-critical styles preserved (h1 clip, sub visible, icons, shine)", () => {
    if (POLISH.indexOf("-webkit-text-fill-color:transparent") < 0) throw "h1 gradient clip lost";
    if (POLISH.indexOf(".h1-sub") < 0 || POLISH.indexOf("-webkit-text-fill-color:#a1a1a6") < 0) throw "h1-sub visible fill lost";
    const appleOnly = POLISH.slice(POLISH.indexOf("var APPLECSS ="));
    if (appleOnly.indexOf(".stat b::before") >= 0) throw "stat icon content overridden (v26 risk)";
    if (appleOnly.indexOf(".ai-go::after") >= 0) throw "ai-go shine overridden (v24 risk)";
  });
  await run("source: 3D engine untouched (scroll3d + rmotion kill)", () => {
    if (POLISH.indexOf("function scroll3d()") < 0) throw "scroll3d missing";
    if (POLISH.indexOf("window.__s3d") < 0) throw "__s3d missing";
    if (POLISH.indexOf('html.rmotion .s3d-el{transform:none!important}') < 0) throw "rmotion kill missing";
  });
  await run("sw.js: -v41+", () => {
    const m = SW.match(/"-v(\d+)"/);
    if (!m || +m[1] < 41) throw "NSS_V not -v41+";
  });
  await run("boot wire still <= 266240 B (Apple theme ships lazy, wire untouched)", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* -------- real Chrome -------- */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (!puppeteer) throw "puppeteer unavailable";
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    for (const v of [{ w: 375 }, { w: 1280 }]) {
      const p = await b.newPage();
      await p.setViewport({ width: v.w, height: 800 });
      const errs = [];
      p.on("pageerror", (e) => errs.push(String((e && e.message) || e).slice(0, 120)));
      await p.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle2", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500));
      await run("chrome " + v.w + ": Apple shell applied (class, css, nav, hero, fonts)", async () => {
        const m = await p.evaluate(() => {
          const cs = (el, prop) => (el ? getComputedStyle(el)[prop] : "?");
          const h1 = document.querySelector(".hero h1");
          return {
            apple: document.documentElement.classList.contains("apple"),
            css: !!document.getElementById("appleCss"),
            nav: !!document.getElementById("appleNav"),
            navH: document.getElementById("appleNav") ? document.getElementById("appleNav").getBoundingClientRect().height : 0,
            brand: (document.querySelector("#appleNav .an-brand") || {}).textContent || "",
            font: cs(document.body, "fontFamily"),
            heroBg: cs(document.querySelector(".hero"), "backgroundColor"),
            h1Fill: h1 ? getComputedStyle(h1).webkitTextFillColor : "?",
            h1Bg: h1 ? getComputedStyle(h1).backgroundImage.slice(0, 20) : "?",
            ctaBg: cs(document.querySelector(".gate-cta"), "backgroundColor"),
          };
        });
        if (!m.apple || !m.css || !m.nav) throw "shell missing: " + JSON.stringify({ apple: m.apple, css: m.css, nav: m.nav });
        if (Math.abs(m.navH - 44) > 2) throw "nav height " + m.navH;
        if (m.brand.indexOf("Study") < 0) throw "brand missing: " + m.brand;
        if (m.font.indexOf("apple-system") < 0) throw "SF stack not applied: " + m.font.slice(0, 60);
        if (m.heroBg !== "rgb(0, 0, 0)") throw "hero not black: " + m.heroBg;
        if (m.h1Fill !== "rgba(0, 0, 0, 0)" && m.h1Fill !== "transparent") throw "h1 clip lost: " + m.h1Fill;
        if (m.h1Bg.indexOf("gradient") < 0) throw "h1 gradient lost: " + m.h1Bg;
        if (m.ctaBg !== "rgb(0, 113, 227)") throw "CTA not Apple blue: " + m.ctaBg;
        if (errs.length) throw errs.length + " page error(s): " + errs[0];
      });
      await run("chrome " + v.w + ": signup + quiz smoke + answer states + no overflow", async () => {
        await p.evaluate(() => { document.getElementById("gateName").value = "Suite User"; document.querySelector(".gate-cta").scrollIntoView({ block: "center" }); });
        await new Promise((r) => setTimeout(r, 400));
        await p.evaluate(() => document.querySelector(".gate-cta").click());
        await new Promise((r) => setTimeout(r, 2200));
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          const t = document.querySelector("#classTabs .tab"); t && t.click();
          await sleep(350);
          const c = document.querySelector("#subjectChips .chip"); c && c.click();
          await sleep(350);
          const n = document.querySelector("#countBoxes .count"); n && n.click();
          await sleep(350);
          const bs = Array.from(document.querySelectorAll("button")).filter((x) => /commence/i.test(x.textContent));
          if (bs[0]) { bs[0].scrollIntoView({ block: "center" }); bs[0].click(); }
          await sleep(1400);
          const o = document.querySelector(".opt"); o && o.click();
          await sleep(900);
          const good = document.querySelector(".opt.correct");
          return {
            gated: document.body.classList.contains("gated"),
            quiz: !!document.querySelector(".opt"),
            correctBorder: good ? getComputedStyle(good).borderColor : "?",
            explain: !!document.querySelector(".explain") && getComputedStyle(document.querySelector(".explain")).display !== "none",
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth,
          };
        });
        if (m.gated) throw "still gated after signup";
        if (!m.quiz) throw "quiz did not start";
        if (m.correctBorder !== "rgb(26, 127, 55)") throw "correct state not Apple green: " + m.correctBorder;
        if (!m.explain) throw "explanation not shown";
        if (m.overflow) throw "horizontal overflow";
        if (errs.length) throw errs.length + " page error(s): " + errs[0];
      });
      await run("chrome " + v.w + ": dark mode flips Apple tokens", async () => {
        const m = await p.evaluate(async () => {
          document.getElementById("themeBtn").click();
          await new Promise((x) => setTimeout(x, 900));
          const r = {
            theme: document.documentElement.dataset.theme,
            navBg: getComputedStyle(document.getElementById("appleNav")).backgroundColor,
            cardBg: getComputedStyle(document.querySelector(".card")).backgroundColor,
          };
          document.getElementById("themeBtn").click();
          await new Promise((x) => setTimeout(x, 700));
          r.back = document.documentElement.dataset.theme;
          return r;
        });
        if (m.theme !== "dark") throw "theme did not flip: " + m.theme;
        if (m.navBg !== "rgba(22, 22, 23, 0.72)") throw "dark nav wrong: " + m.navBg;
        if (m.cardBg !== "rgb(29, 29, 31)") throw "dark card wrong: " + m.cardBg;
        if (m.back !== "light") throw "theme did not flip back: " + m.back;
        if (errs.length) throw errs.length + " page error(s): " + errs[0];
      });
      await p.close();
    }
  } finally { await b.close(); }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v41 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("suite crashed:", e); process.exit(2); });
