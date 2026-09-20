/* v40.0 suite — 3D scrollable website (scroll-driven depth journey).
   Run: node quiz/_test_v40.js */
const fs = require("fs");
const zlib = require("zlib");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

(async () => {
  await run("source: scroll3d engine present + exposed", () => {
    if (POLISH.indexOf("function scroll3d()") < 0) throw "scroll3d missing";
    if (POLISH.indexOf("window.__s3d") < 0) throw "__s3d not exposed";
    if (POLISH.indexOf("#s3dRail") < 0) throw "depth rail missing";
  });
  await run("source: small-layers-only safety (.hero flat, height cap)", () => {
    const i = POLISH.indexOf("function scroll3d()");
    const body = POLISH.slice(i, i + 6000);
    if (body.indexOf('".hero,') >= 0 || body.indexOf(',.hero"') >= 0 || body.indexOf(',.hero,') >= 0) throw ".hero itself is transformed (compositor risk)";
    if (body.indexOf("[data-depth]") < 0) throw "hero stage layers missing";
    if (body.indexOf("r.height > 800") < 0) throw "height cap missing";
  });
  await run("source: reduced-motion disables 3D (toggle + media query)", () => {
    if (POLISH.indexOf('classList.contains("rmotion")') < 0) throw "rmotion check missing";
    if (POLISH.indexOf("prefers-reduced-motion: reduce") < 0) throw "media query missing";
    if (POLISH.indexOf("html.rmotion .s3d-el{transform:none!important}") < 0) throw "rmotion CSS kill missing";
  });
  await run("source: engine never scrolls or focuses (zero-jump intact)", () => {
    const i = POLISH.indexOf("function scroll3d()");
    const body = POLISH.slice(i, i + 6000);
    if (body.indexOf("scrollTo(") >= 0) throw "engine scrolls";
    if (body.indexOf(".focus(") >= 0) throw "engine focuses";
    if (body.indexOf("perspective(1100px)") < 0) throw "no perspective transform";
  });
  await run("sw.js: -v40+", () => {
    const m = SW.match(/"-v(\d+)"/);
    if (!m || +m[1] < 40) throw "NSS_V not -v40+";
  });
  await run("boot wire still <= 266240 B (3D ships lazy, wire untouched)", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* -------- real Chrome -------- */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (!puppeteer) throw "puppeteer unavailable";
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
  try {
    for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
      const p = await b.newPage();
      const errs = [];
      p.on("dialog", (d) => { try { d.dismiss(); } catch (e) {} });
      p.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 150)));
      p.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text() || "";
        if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return;
        errs.push("console: " + t.slice(0, 120));
      });
      await p.setViewport({ width: v.w, height: v.h });
      await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
      await p.waitForFunction(() => typeof CLASSES !== "undefined" && CLASSES.length > 0, { timeout: 20000 }).catch(() => {});
      await p.waitForFunction(() => !!window.__s3d, { timeout: 30000 }).catch(() => {});
      await run("chrome " + v.w + ": scroll drives 3D depth (layers + cards tilt, hero flat, rail tracks)", async () => {
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          const r = {};
          r.api = !!window.__s3d;
          r.n = window.__s3d ? window.__s3d.n : 0;
          try { const g = document.getElementById("guestName"); if (g) g.value = "Ada"; signUpGuest(); } catch (e) {}
          await sleep(500);
          window.scrollTo(0, 0);
          await sleep(700);
          r.t0 = (document.querySelector(".hero [data-depth]")?.style.transform || "") + "|" + (document.querySelector("#labGrid")?.style.transform || "");
          r.heroT0 = document.querySelector(".hero")?.style.transform || "";
          window.scrollTo(0, 900);
          await sleep(900);
          r.y = Math.round(window.scrollY);
          r.t1 = (document.querySelector(".hero [data-depth]")?.style.transform || "") + "|" + (document.querySelector("#labGrid")?.style.transform || "");
          r.heroT1 = document.querySelector(".hero")?.style.transform || "";
          r.any3d = [...document.querySelectorAll(".s3d-el")].some((el) => (el.style.transform || "").indexOf("perspective(") >= 0);
          r.rail = document.getElementById("s3dLab")?.textContent || "";
          r.railVis = (() => { const e = document.getElementById("s3dRail"); return !!e && e.getBoundingClientRect().width > 0; })();
          r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth;
          return r;
        });
        if (!m.api || !(m.n >= 5)) throw "engine not live: " + JSON.stringify({ api: m.api, n: m.n });
        if (!(m.y > 400)) throw "page did not scroll: y=" + m.y;
        if (m.t0 === m.t1) throw "scroll did not change 3D transforms";
        if (!m.any3d) throw "no perspective transform applied anywhere";
        if (m.heroT0 !== "" || m.heroT1 !== "") throw "hero itself transformed (must stay flat)";
        if (v.w >= 900 && !/%/.test(m.rail)) throw "rail not tracking: " + JSON.stringify(m.rail);
        if (m.overflow) throw "horizontal overflow from 3D";
        if (errs.length) throw errs.length + " page errors: " + errs[0];
      });
      await run("chrome " + v.w + ": reduced motion disables 3D, restore re-enables", async () => {
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          const r = {};
          document.documentElement.classList.add("rmotion");
          window.dispatchEvent(new Event("scroll"));
          await sleep(600);
          r.onOff = window.__s3d.on;
          r.left = [...document.querySelectorAll(".s3d-el")].filter((el) => el.style.transform).length;
          r.railHidden = document.getElementById("s3dRail")?.style.display === "none";
          document.documentElement.classList.remove("rmotion");
          window.dispatchEvent(new Event("scroll"));
          await sleep(600);
          r.onOn = window.__s3d.on;
          r.restored = [...document.querySelectorAll(".s3d-el")].some((el) => (el.style.transform || "").indexOf("perspective(") >= 0);
          return r;
        });
        if (m.onOff !== false) throw "engine still on under rmotion";
        if (m.left !== 0) throw m.left + " transforms left under rmotion";
        if (v.w >= 900 && !m.railHidden) throw "rail visible under rmotion";
        if (m.onOn !== true || !m.restored) throw "3D did not restore: " + JSON.stringify(m);
        if (errs.length) throw errs.length + " page errors: " + errs[0];
      });
      await p.close();
    }
  } finally { await b.close(); }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v40 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("suite crashed:", e); process.exit(2); });
