/* v42.0 suite — Apple look, continued (hero CTAs, promo strip, SF/type sweep,
   surface actives, micro-details). Run: node quiz/_test_v42.js */
const fs = require("fs");
const zlib = require("zlib");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

(async () => {
  await run("source: hero CTAs + promo strip builders present", () => {
    if (POLISH.indexOf("function appleCtas()") < 0) throw "appleCtas missing";
    if (POLISH.indexOf("function applePromo()") < 0) throw "applePromo missing";
    if (POLISH.indexOf('id = "appleCtas"') < 0) throw "appleCtas id missing";
    if (POLISH.indexOf('id = "applePromo"') < 0) throw "applePromo id missing";
    if (POLISH.indexOf("#appleCtas .ac-go") < 0) throw "CTA styles missing";
    if (POLISH.indexOf("#applePromo") < 0) throw "promo styles missing";
  });
  await run("source: CTAs/promo never auto-scroll (dock clicks + preventDefault only)", () => {
    for (const fn of ["function appleCtas()", "function applePromo()"]) {
      const i = POLISH.indexOf(fn);
      const body = POLISH.slice(i, i + 1800);
      if (body.indexOf("scrollTo(") >= 0) throw fn + " scrolls";
      if (body.indexOf("scrollIntoView(") >= 0) throw fn + " scrolls";
      if (body.indexOf(".focus(") >= 0) throw fn + " focuses";
    }
  });
  await run("source: SF/type sweep + surface actives + micro-details", () => {
    const a = POLISH.slice(POLISH.indexOf("var APPLECSS ="));
    for (const s of [".qtext", ".review .rq", ".rep-card", ".arc-head h3", ".nt-pp"]) {
      if (a.indexOf(s) < 0) throw "SF blanket missing " + s;
    }
    for (const s of [".arc-chip.on", ".nt-tab.on", ".edu-chip.on", ".nt-chip.on"]) {
      if (a.indexOf(s) < 0) throw "surface active missing " + s;
    }
    if (a.indexOf("::selection{background:#0071e3") < 0) throw "blue selection missing";
    if (a.indexOf("::-webkit-scrollbar-thumb{background:#c7c7cc") < 0) throw "Apple scrollbar missing";
    if (a.indexOf(":active{transform:scale(.97)}") < 0) throw "press-scale missing";
  });
  await run("sw.js: -v42", () => {
    if (!/"-v42"/.test(SW)) throw "NSS_V not -v42";
  });
  await run("boot wire still <= 266240 B (v42 ships lazy, wire untouched)", () => {
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
      await run("chrome " + v.w + ": promo strip + SF headings + no overflow", async () => {
        const m = await p.evaluate(() => {
          const promo = document.getElementById("applePromo");
          const hero = document.querySelector("header.hero");
          const h3 = document.querySelector(".modal h3") || document.querySelector("h3");
          return {
            promo: !!promo,
            promoY: promo ? promo.getBoundingClientRect().y : -1,
            heroY: hero ? hero.getBoundingClientRect().y : -1,
            promoLink: promo ? promo.querySelectorAll("a").length : 0,
            h3font: h3 ? getComputedStyle(h3).fontFamily : "?",
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth,
          };
        });
        if (!m.promo) throw "promo strip missing";
        if (!(m.promoY >= 0 && m.promoY < m.heroY)) throw "promo not above hero: " + m.promoY + " vs " + m.heroY;
        if (m.promoLink < 1) throw "promo link missing";
        if (m.h3font.indexOf("apple-system") < 0) throw "h3 not SF: " + m.h3font.slice(0, 50);
        if (m.overflow) throw "horizontal overflow";
        if (errs.length) throw errs.length + " page error(s): " + errs[0];
      });
      await run("chrome " + v.w + ": hero CTAs render + Start practicing navigates", async () => {
        await p.evaluate(() => { document.getElementById("gateName").value = "Suite User"; document.querySelector(".gate-cta").scrollIntoView({ block: "center" }); });
        await new Promise((r) => setTimeout(r, 400));
        await p.evaluate(() => document.querySelector(".gate-cta").click());
        await new Promise((r) => setTimeout(r, 2200));
        const m = await p.evaluate(async () => {
          const go = document.querySelector("#appleCtas .ac-go");
          const more = document.querySelector("#appleCtas .ac-more");
          const r = {
            go: !!go, more: !!more,
            goBg: go ? getComputedStyle(go).backgroundColor : "?",
            moreColor: more ? getComputedStyle(more).color : "?",
            before: (document.querySelector('[data-hd="practice"]') || {}).className || "?",
          };
          if (go) { go.scrollIntoView({ block: "center" }); }
          await new Promise((x) => setTimeout(x, 500));
          if (go) go.click();
          await new Promise((x) => setTimeout(x, 1200));
          r.after = (document.querySelector('[data-hd="practice"]') || {}).className || "?";
          r.cls = document.getElementById("step-class") ? document.getElementById("step-class").getBoundingClientRect().top : -9999;
          r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth;
          return r;
        });
        if (!m.go || !m.more) throw "CTAs missing";
        if (m.goBg !== "rgb(0, 113, 227)") throw "CTA button not blue: " + m.goBg;
        if (m.moreColor !== "rgb(41, 151, 255)") throw "CTA link not Apple link-blue: " + m.moreColor;
        if (m.after.indexOf("on") < 0 && !(m.cls > -50 && m.cls < 900)) throw "CTA did not navigate to practice: " + JSON.stringify({ after: m.after, cls: Math.round(m.cls) });
        if (m.overflow) throw "horizontal overflow";
        if (errs.length) throw errs.length + " page error(s): " + errs[0];
      });
      await p.close();
    }
  } finally { await b.close(); }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v42 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("suite crashed:", e); process.exit(2); });
